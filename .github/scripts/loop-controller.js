#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 環境変数から設定を取得
const MAX_LOOP_COUNT = parseInt(process.env.MAX_LOOP_COUNT || '5');
const AUTO_FIX_THRESHOLD = parseInt(process.env.AUTO_FIX_THRESHOLD || '7');
const DRY_RUN = process.env.DRY_RUN === 'true';
const PR_NUMBER = process.env.PR_NUMBER;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// 結果を格納する配列
const loopResults = [];
let allIssuesFixed = false;

async function runClaudeReview() {
  console.log('🔍 Claude Code Reviewを実行中...');

  try {
    // Claude Code Reviewワークフローを実行
    const result = execSync(
      `gh workflow run claude-code-review.yml --ref $(git branch --show-current) -f pr_number=${PR_NUMBER}`,
      { encoding: 'utf-8' }
    );

    // 実行が完了するまで待機（最大5分）
    await waitForWorkflowCompletion('claude-code-review.yml', 300);

    // レビュー結果を取得
    const reviewData = await getLatestReviewData();
    return reviewData;
  } catch (error) {
    console.error('❌ レビュー実行エラー:', error.message);
    throw error;
  }
}

async function waitForWorkflowCompletion(workflowName, maxWaitSeconds) {
  const startTime = Date.now();
  const maxWaitTime = maxWaitSeconds * 1000;

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = execSync(
        `gh run list --workflow=${workflowName} --limit=1 --json status -q '.[0].status'`,
        { encoding: 'utf-8' }
      ).trim();

      if (status === 'completed') {
        console.log('✅ ワークフローが完了しました');
        return;
      }

      console.log(`⏳ ワークフローの完了を待機中... (ステータス: ${status})`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10秒待機
    } catch (error) {
      console.error('ワークフロー状態チェックエラー:', error.message);
    }
  }

  throw new Error('ワークフローがタイムアウトしました');
}

async function getLatestReviewData() {
  try {
    // PRコメントから最新のレビュー結果を取得
    const comments = execSync(
      `gh api /repos/${process.env.GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments --jq '.[] | select(.body | contains("Claude Code Review")) | .body'`,
      { encoding: 'utf-8' }
    );

    // コメントから重要度スコアを抽出
    const issues = parseReviewIssues(comments);
    return issues;
  } catch (error) {
    console.error('レビューデータ取得エラー:', error.message);
    return [];
  }
}

function parseReviewIssues(reviewText) {
  const issues = [];
  const issuePattern = /\*\*🔴?\s*\[重要度:\s*(\d+)\/10\]\s*(.+?)\*\*[\s\S]*?- \*\*ファイル\*\*:\s*`(.+?):(\d+)`[\s\S]*?```[\w]*\n([\s\S]*?)\n```[\s\S]*?```[\w]*\n([\s\S]*?)\n```/gm;

  let match;
  while ((match = issuePattern.exec(reviewText)) !== null) {
    const severity = parseInt(match[1]);
    if (severity >= AUTO_FIX_THRESHOLD) {
      issues.push({
        severity,
        title: match[2],
        file: match[3],
        line: parseInt(match[4]),
        currentCode: match[5],
        fixedCode: match[6]
      });
    }
  }

  return issues;
}

async function applyFixes(issues) {
  console.log(`🔧 ${issues.length}個の修正を適用中...`);

  const fixResults = [];

  for (const issue of issues) {
    try {
      console.log(`  📝 ${issue.file}:${issue.line} - ${issue.title}`);

      if (DRY_RUN) {
        console.log('  🏃 ドライランモード: 修正をスキップ');
        fixResults.push({ ...issue, status: 'dry-run' });
        continue;
      }

      // ファイルを読み込み
      const filePath = path.join(process.cwd(), issue.file);
      let fileContent = fs.readFileSync(filePath, 'utf-8');

      // コードを置換
      if (fileContent.includes(issue.currentCode)) {
        fileContent = fileContent.replace(issue.currentCode, issue.fixedCode);
        fs.writeFileSync(filePath, fileContent);
        fixResults.push({ ...issue, status: 'fixed' });
        console.log('  ✅ 修正を適用しました');
      } else {
        console.log('  ⚠️ 該当コードが見つかりません');
        fixResults.push({ ...issue, status: 'not-found' });
      }
    } catch (error) {
      console.error(`  ❌ 修正適用エラー: ${error.message}`);
      fixResults.push({ ...issue, status: 'error', error: error.message });
    }
  }

  return fixResults;
}

async function commitChanges(loopCount, fixResults) {
  if (DRY_RUN) {
    console.log('🏃 ドライランモード: コミットをスキップ');
    return null;
  }

  const fixedCount = fixResults.filter(r => r.status === 'fixed').length;
  if (fixedCount === 0) {
    console.log('ℹ️ 修正対象がないため、コミットをスキップ');
    return null;
  }

  try {
    // 変更をステージング
    execSync('git add -A', { encoding: 'utf-8' });

    // コミットメッセージを作成
    const commitMessage = `🤖 [AUTO-FIX] Loop ${loopCount}: ${fixedCount}個の問題を自動修正\n\n` +
      fixResults.filter(r => r.status === 'fixed')
        .map(r => `- ${r.file}: ${r.title} (重要度: ${r.severity}/10)`)
        .join('\n');

    // コミット
    execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf-8' });

    // プッシュ
    execSync('git push', { encoding: 'utf-8' });

    console.log('✅ 変更をコミット・プッシュしました');
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch (error) {
    console.error('❌ コミットエラー:', error.message);
    throw error;
  }
}

async function postProgressComment(loopCount, issues, fixResults) {
  const comment = generateProgressComment(loopCount, issues, fixResults);

  try {
    execSync(
      `gh pr comment ${PR_NUMBER} --body '${comment}'`,
      { encoding: 'utf-8' }
    );
    console.log('💬 進捗コメントを投稿しました');
  } catch (error) {
    console.error('コメント投稿エラー:', error.message);
  }
}

function generateProgressComment(loopCount, issues, fixResults) {
  const timestamp = new Date().toISOString();
  const fixedCount = fixResults.filter(r => r.status === 'fixed').length;
  const totalIssues = issues.length;

  let comment = `## 🔄 自動修正ループ - 反復 ${loopCount}/${MAX_LOOP_COUNT}\n\n`;
  comment += `**実行時刻**: ${timestamp}\n`;
  comment += `**モード**: ${DRY_RUN ? 'ドライラン' : '実行'}\n\n`;

  comment += `### 📊 修正結果\n`;
  comment += `- 検出された問題: ${totalIssues}件 (重要度 ${AUTO_FIX_THRESHOLD}以上)\n`;
  comment += `- 修正成功: ${fixedCount}件\n`;
  comment += `- スキップ: ${fixResults.filter(r => r.status === 'not-found').length}件\n`;
  comment += `- エラー: ${fixResults.filter(r => r.status === 'error').length}件\n\n`;

  if (fixResults.length > 0) {
    comment += `### 📝 詳細\n`;
    comment += '<details>\n<summary>クリックして詳細を表示</summary>\n\n';

    for (const result of fixResults) {
      const icon = result.status === 'fixed' ? '✅' :
                  result.status === 'not-found' ? '⚠️' :
                  result.status === 'error' ? '❌' : '🏃';

      comment += `${icon} **${result.file}:${result.line}**\n`;
      comment += `  - ${result.title} (重要度: ${result.severity}/10)\n`;
      comment += `  - ステータス: ${result.status}\n`;

      if (result.error) {
        comment += `  - エラー: ${result.error}\n`;
      }

      comment += '\n';
    }

    comment += '</details>\n\n';
  }

  return comment;
}

// メインループ
async function main() {
  console.log('🚀 自動修正ループを開始します');
  console.log(`設定: MAX_LOOP=${MAX_LOOP_COUNT}, THRESHOLD=${AUTO_FIX_THRESHOLD}, DRY_RUN=${DRY_RUN}`);

  for (let loopCount = 1; loopCount <= MAX_LOOP_COUNT; loopCount++) {
    console.log(`\n=== ループ ${loopCount}/${MAX_LOOP_COUNT} ===`);

    try {
      // 1. Claude Code Reviewを実行
      const issues = await runClaudeReview();

      if (issues.length === 0) {
        console.log('✨ 修正対象の問題が見つかりませんでした！');
        allIssuesFixed = true;

        // 完了コメントを投稿
        await postProgressComment(loopCount, [], []);
        break;
      }

      console.log(`📋 ${issues.length}個の問題を検出しました`);

      // 2. 修正を適用
      const fixResults = await applyFixes(issues);

      // 3. 進捗をレポート
      await postProgressComment(loopCount, issues, fixResults);

      // 4. 変更をコミット
      const commitHash = await commitChanges(loopCount, fixResults);

      // 5. 結果を記録
      loopResults.push({
        loop: loopCount,
        issues: issues.length,
        fixed: fixResults.filter(r => r.status === 'fixed').length,
        commit: commitHash
      });

      // すべて修正済みかチェック
      if (fixResults.every(r => r.status !== 'fixed')) {
        console.log('ℹ️ これ以上の自動修正は不可能です');
        break;
      }

    } catch (error) {
      console.error(`❌ ループ ${loopCount} でエラーが発生しました:`, error.message);
      loopResults.push({
        loop: loopCount,
        error: error.message
      });
      break;
    }
  }

  // 最終結果を出力
  console.log('\n=== 最終結果 ===');
  console.log(`実行ループ数: ${loopResults.length}`);
  console.log(`すべての問題を修正: ${allIssuesFixed ? 'はい' : 'いいえ'}`);

  // GitHub Actionsの出力として結果を設定
  console.log(`::set-output name=results::${JSON.stringify(loopResults)}`);
  console.log(`::set-output name=all_fixed::${allIssuesFixed}`);
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('未処理のエラー:', error);
  process.exit(1);
});

// 実行
main().catch(error => {
  console.error('致命的エラー:', error);
  process.exit(1);
});