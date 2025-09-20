#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { Octokit } from '@octokit/rest';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const PR_NUMBER = parseInt(process.env.PR_NUMBER!);
const [owner, repo] = process.env.GITHUB_REPOSITORY!.split('/');
const MAX_LOOPS = 5;
const SEVERITY_THRESHOLD = 7;

interface Issue {
  severity: number;
  title: string;
  file: string;
  line: number;
  currentCode: string;
  fixedCode: string;
}

async function getReviewIssues(): Promise<Issue[]> {
  // Get latest Claude review comment from PR
  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: PR_NUMBER
  });

  const claudeComment = comments
    .reverse()
    .find(c => c.body.includes('Claude Code Review'));

  if (!claudeComment) return [];

  // Parse issues from comment
  const issues: Issue[] = [];
  const pattern = /\[重要度:\s*(\d+)\/10\]\s*(.+?)\*\*[\s\S]*?`(.+?):(\d+)`[\s\S]*?```[\w]*\n([\s\S]*?)\n```[\s\S]*?```[\w]*\n([\s\S]*?)\n```/gm;

  let match;
  while ((match = pattern.exec(claudeComment.body)) !== null) {
    const severity = parseInt(match[1]);
    if (severity >= SEVERITY_THRESHOLD) {
      issues.push({
        severity,
        title: match[2].trim(),
        file: match[3],
        line: parseInt(match[4]),
        currentCode: match[5].trim(),
        fixedCode: match[6].trim()
      });
    }
  }

  return issues;
}

async function fixWithClaude(issue: Issue): Promise<string | null> {
  const filePath = path.join(process.cwd(), issue.file);
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const prompt = `Fix the following issue in the code:

Issue: ${issue.title} (Severity: ${issue.severity}/10)
File: ${issue.file}

Current problematic code:
\`\`\`
${issue.currentCode}
\`\`\`

Suggested fix:
\`\`\`
${issue.fixedCode}
\`\`\`

Full file context:
\`\`\`
${fileContent}
\`\`\`

Return ONLY the complete fixed file content in a code block. No explanations.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const codeMatch = text.match(/```(?:\w+)?\n([\s\S]+?)\n```/);

    return codeMatch ? codeMatch[1] : null;
  } catch (error) {
    console.error(`Failed to fix ${issue.file}:`, error);
    return null;
  }
}

async function applyFixes(issues: Issue[]): Promise<number> {
  let fixedCount = 0;

  for (const issue of issues) {
    console.log(`Fixing: ${issue.file} - ${issue.title}`);

    const fixedContent = await fixWithClaude(issue);
    if (fixedContent) {
      const filePath = path.join(process.cwd(), issue.file);
      fs.writeFileSync(filePath, fixedContent);
      fixedCount++;
    }
  }

  return fixedCount;
}

async function commitChanges(fixedCount: number, loopNum: number): Promise<void> {
  if (fixedCount === 0) return;

  execSync('git add -A', { encoding: 'utf-8' });
  const message = `🤖 Auto-fix: Loop ${loopNum} - Fixed ${fixedCount} issues`;
  execSync(`git commit -m "${message}"`, { encoding: 'utf-8' });
  execSync('git push', { encoding: 'utf-8' });
}

async function postFinalComment(totalFixed: number, loops: number): Promise<void> {
  const body = `## ✅ Claude Auto-Fix Complete

**Total issues fixed**: ${totalFixed}
**Loops executed**: ${loops}/${MAX_LOOPS}

The automatic fix process has completed. Please review the changes.`;

  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: PR_NUMBER,
    body
  });
}

async function main() {
  console.log('Starting Claude Auto-Fix loop...');
  let totalFixed = 0;

  for (let loop = 1; loop <= MAX_LOOPS; loop++) {
    console.log(`\n=== Loop ${loop}/${MAX_LOOPS} ===`);

    // Get issues from latest review
    const issues = await getReviewIssues();

    if (issues.length === 0) {
      console.log('No issues found with severity >= 7');
      break;
    }

    console.log(`Found ${issues.length} issues to fix`);

    // Apply fixes
    const fixedCount = await applyFixes(issues);
    totalFixed += fixedCount;

    // Commit changes
    await commitChanges(fixedCount, loop);

    if (fixedCount === 0) {
      console.log('No more fixes could be applied');
      break;
    }

    // Wait for new review (give CI time to run)
    if (loop < MAX_LOOPS) {
      console.log('Waiting for new review...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
    }
  }

  // Post final summary
  await postFinalComment(totalFixed, Math.min(loop, MAX_LOOPS));
  console.log(`\nComplete! Fixed ${totalFixed} issues in total.`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});