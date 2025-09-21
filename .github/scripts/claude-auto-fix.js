#!/usr/bin/env node

const { execSync } = require('child_process');
const https = require('https');

// Configuration
const MAX_LOOPS = 5;
const SEVERITY_THRESHOLD = 7;
const PR_NUMBER = process.env.PR_NUMBER;
const REPO = process.env.REPO;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Simple GitHub API helper
async function githubRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Claude-Auto-Fix',
        'Accept': 'application/vnd.github.v3+json',
      }
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Get latest Claude review comment
async function getLatestReview() {
  const comments = await githubRequest(`/repos/${REPO}/issues/${PR_NUMBER}/comments`);
  return comments.reverse().find(c => c.body?.includes('Claude Code Review'));
}

// Parse issues from review comment
function parseIssues(comment) {
  if (!comment) return [];

  const issues = [];
  const lines = comment.body.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for severity markers like [重要度: 8/10]
    const severityMatch = line.match(/\[重要度:\s*(\d+)\/10\]/);
    if (severityMatch) {
      const severity = parseInt(severityMatch[1]);

      if (severity >= SEVERITY_THRESHOLD) {
        // Extract the issue description
        const description = line.replace(/\[重要度:\s*\d+\/10\]/, '').trim();

        // Look for file references in next few lines
        let file = null;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const fileMatch = lines[j].match(/`([^`]+\.(js|ts|tsx|jsx))`/);
          if (fileMatch) {
            file = fileMatch[1];
            break;
          }
        }

        if (file && description) {
          issues.push({ severity, description, file });
        }
      }
    }
  }

  return issues;
}

// Apply single fix using Claude API (only fix the highest priority issue)
async function applySingleFix(issues) {
  if (issues.length === 0) return 0;

  // Sort by severity and pick the highest priority issue
  const sortedIssues = issues.sort((a, b) => b.severity - a.severity);
  const issue = sortedIssues[0];
  console.log(`\n🔧 Fixing highest priority issue [重要度: ${issue.severity}/10]`);
  console.log(`  File: ${issue.file}`);
  console.log(`  Issue: ${issue.description}`);

  try {
    // Read the current file
    const fileContent = require('fs').readFileSync(issue.file, 'utf-8');

    // Create a focused fix prompt
    const prompt = {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `Fix this specific issue in the code. Make minimal changes to address only this issue.

Issue: ${issue.description}
Severity: ${issue.severity}/10
File: ${issue.file}

Current code:
\`\`\`
${fileContent}
\`\`\`

Return ONLY the fixed code in a code block. Make the smallest possible change to fix this specific issue. Do not refactor unrelated code.`
      }]
    };

    // Call Claude API
    const response = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(JSON.parse(data)));
      });

      req.on('error', reject);
      req.write(JSON.stringify(prompt));
      req.end();
    });

    // Extract fixed code
    if (response.content && response.content[0]) {
      const text = response.content[0].text;
      const codeMatch = text.match(/```[\w]*\n([\s\S]+?)\n```/);

      if (codeMatch) {
        // Write fixed code
        require('fs').writeFileSync(issue.file, codeMatch[1]);
        console.log('  ✅ Fix applied successfully');
        return { fixed: 1, issue };
      }
    }

    console.log('  ❌ Could not apply fix');
    return { fixed: 0, issue: null };
  } catch (error) {
    console.error(`  ❌ Failed to fix:`, error.message);
    return { fixed: 0, issue: null };
  }
}

// Main loop
async function main() {
  console.log('🤖 Claude Auto-Fix Starting...');
  console.log(`📋 Configuration:`);
  console.log(`  - Max loops: ${MAX_LOOPS}`);
  console.log(`  - Severity threshold: ${SEVERITY_THRESHOLD}`);
  console.log(`  - PR #${PR_NUMBER}\n`);

  let totalFixed = 0;
  let loopCount = 0;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    loopCount = loop;
    console.log(`\n============ Loop ${loop}/${MAX_LOOPS} ============`);

    // Get latest review
    console.log('📖 Fetching Claude Code Review...');
    const review = await getLatestReview();

    if (!review) {
      console.log('❌ No Claude Code Review found.');
      console.log('   This should not happen as Auto-Fix runs after Code Review.');
      break;
    }

    const issues = parseIssues(review);

    if (issues.length === 0) {
      console.log('✅ No issues found with severity >= 7');
      break;
    }

    console.log(`📊 Found ${issues.length} issues with severity >= ${SEVERITY_THRESHOLD}`);

    // Apply single fix (highest priority)
    const result = await applySingleFix(issues);

    if (result.fixed > 0) {
      totalFixed += result.fixed;

      // Commit changes with descriptive message
      try {
        execSync('git add -A', { encoding: 'utf-8' });
        const commitMsg = `fix: [重要度${result.issue.severity}] ${result.issue.description.substring(0, 50)}${result.issue.description.length > 50 ? '...' : ''}`;
        execSync(`git commit -m "${commitMsg}"`, { encoding: 'utf-8' });
        execSync('git push', { encoding: 'utf-8' });
        console.log('\n📤 Changes committed and pushed');
      } catch (e) {
        console.error('❌ Git operation failed:', e.message);
        break;
      }

      // Wait for CI to re-run
      if (loop < MAX_LOOPS) {
        console.log('\n⏳ Waiting 60s for CI checks to complete...');
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    } else {
      console.log('\n⚠️ Could not apply fix, stopping...');
      break;
    }
  }

  // Post final comment
  const summary = `## 🤖 Claude Auto-Fix 完了

### 📊 実行結果
- **修正された問題数**: ${totalFixed}件
- **実行ループ数**: ${loopCount}/${MAX_LOOPS}
- **対象重要度**: ${SEVERITY_THRESHOLD}以上

${totalFixed > 0 ?
`### ✅ 修正内容
自動修正が適用されました。各コミットは1つの問題を修正しています。
変更内容を確認し、問題がないことをご確認ください。

修正後、Claude Code Reviewが自動的に再実行されます。` :
'### ℹ️ 修正不要
重要度7以上の問題は検出されませんでした。'}

---
*このコメントはClaude Auto-Fixによって自動生成されました*`;

  await githubRequest(
    `/repos/${REPO}/issues/${PR_NUMBER}/comments`,
    'POST',
    { body: summary }
  );

  console.log(`\n============ Summary ============`);
  console.log(`✨ Auto-Fix Complete!`);
  console.log(`📊 Total issues fixed: ${totalFixed}`);
  console.log(`🔄 Loops executed: ${loopCount}/${MAX_LOOPS}`);
  console.log(`================================\n`);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});