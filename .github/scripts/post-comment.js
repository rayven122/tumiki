#!/usr/bin/env node

import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

async function main() {
  try {
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const prNumber = process.env.PR_NUMBER;
    const status = process.argv[2] || 'success';

    if (!prNumber) {
      console.log('No PR number provided');
      return;
    }

    // Determine comment based on status
    let comment;
    if (status === 'error') {
      comment = `## ❌ Claude Auto-Fix Error

An error occurred during the auto-fix process. Please check the workflow logs for more details.`;
    } else {
      comment = `## ✅ Claude Auto-Fix Complete

The auto-fix process has completed successfully. All automated fixes have been applied.`;
    }

    // Post comment to PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: parseInt(prNumber),
      body: comment,
    });

    console.log('Comment posted successfully');

  } catch (error) {
    console.error('Error posting comment:', error);
    process.exit(1);
  }
}

main();