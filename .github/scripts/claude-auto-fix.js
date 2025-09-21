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

// Apply fixes using Claude API
async function applyFixes(issues) {
  if (issues.length === 0) return 0;

  let fixedCount = 0;

  for (const issue of issues) {
    console.log(`Fixing: ${issue.file} - ${issue.description}`);

    try {
      // Read the current file
      const fileContent = require('fs').readFileSync(issue.file, 'utf-8');

      // Create a simple fix prompt
      const prompt = {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0,
        messages: [{
          role: 'user',
          content: `Fix this issue in the code:
Issue: ${issue.description}
File: ${issue.file}

Current code:
\`\`\`
${fileContent}
\`\`\`

Return ONLY the fixed code in a code block. No explanations.`
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
          fixedCount++;
        }
      }
    } catch (error) {
      console.error(`Failed to fix ${issue.file}:`, error.message);
    }
  }

  return fixedCount;
}

// Main loop
async function main() {
  console.log('🤖 Starting Claude Auto-Fix Loop...');
  let totalFixed = 0;
  let loopCount = 0;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    loopCount = loop;
    console.log(`\n📍 Loop ${loop}/${MAX_LOOPS}`);

    // Get latest review
    const review = await getLatestReview();
    const issues = parseIssues(review);

    if (issues.length === 0) {
      console.log('✅ No issues found with severity >= 7');
      break;
    }

    console.log(`Found ${issues.length} issues to fix`);

    // Apply fixes
    const fixed = await applyFixes(issues);
    totalFixed += fixed;

    if (fixed > 0) {
      // Commit changes
      try {
        execSync('git add -A', { encoding: 'utf-8' });
        execSync(`git commit -m "🤖 Auto-fix: Loop ${loop} - Fixed ${fixed} issues"`, { encoding: 'utf-8' });
        execSync('git push', { encoding: 'utf-8' });
        console.log(`Committed ${fixed} fixes`);
      } catch (e) {
        console.error('Git commit failed:', e.message);
      }

      // Wait for CI to re-run
      if (loop < MAX_LOOPS) {
        console.log('Waiting 30s for CI to re-run...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    } else {
      console.log('No fixes could be applied');
      break;
    }
  }

  // Post final comment
  const summary = `## ✅ Claude Auto-Fix Complete

**Total issues fixed**: ${totalFixed}
**Loops executed**: ${loopCount}/${MAX_LOOPS}

${totalFixed > 0 ? 'The automatic fixes have been applied. Please review the changes.' : 'No automatic fixes were needed.'}`;

  await githubRequest(
    `/repos/${REPO}/issues/${PR_NUMBER}/comments`,
    'POST',
    { body: summary }
  );

  console.log(`\n✨ Complete! Fixed ${totalFixed} issues total.`);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});