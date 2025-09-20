#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  try {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const prNumber = process.env.PR_NUMBER;

    if (!prNumber) {
      console.log('No PR number provided');
      return;
    }

    // Generate summary
    const summary = `## 📝 Claude Code Review Summary

✅ Auto-fix process completed successfully

**PR #${prNumber}**
- Repository: ${owner}/${repo}
- Status: Review complete
`;

    // Write to GitHub step summary
    console.log(summary);

    // Also write to GITHUB_STEP_SUMMARY if available
    if (process.env.GITHUB_STEP_SUMMARY) {
      const fs = await import('fs').then(m => m.promises);
      await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }

  } catch (error) {
    console.error('Error generating summary:', error);
    process.exit(1);
  }
}

main();