#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');
const fs = require('fs');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const PR_NUMBER = process.env.PR_NUMBER;
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const loopResults = process.env.LOOP_RESULTS ? JSON.parse(process.env.LOOP_RESULTS) : [];

async function generateSummary() {
  const timestamp = new Date().toISOString();
  const totalLoops = loopResults.length;
  const totalFixed = loopResults.reduce((sum, r) => sum + (r.fixed || 0), 0);
  const hasErrors = loopResults.some(r => r.error);

  let summary = `# 📊 Claude Auto-Fix Loop 実行レポート\n\n`;
  summary += `**実行日時**: ${timestamp}\n`;
  summary += `**PR番号**: #${PR_NUMBER}\n`;
  summary += `**ステータス**: ${hasErrors ? '⚠️ 部分的成功' : '✅ 成功'}\n\n`;

  summary += `## 📈 実行統計\n\n`;
  summary += `| メトリクス | 値 |\n`;
  summary += `|----------|----|\n`;
  summary += `| 実行ループ数 | ${totalLoops} |\n`;
  summary += `| 修正された問題数 | ${totalFixed} |\n`;
  summary += `| 成功率 | ${((totalLoops - loopResults.filter(r => r.error).length) / totalLoops * 100).toFixed(1)}% |\n\n`;

  summary += `## 🔄 ループ実行履歴\n\n`;

  for (const result of loopResults) {
    summary += `### ループ ${result.loop}\n`;

    if (result.error) {
      summary += `- **ステータス**: ❌ エラー\n`;
      summary += `- **エラー内容**: ${result.error}\n`;
    } else {
      summary += `- **ステータス**: ✅ 成功\n`;
      summary += `- **検出された問題**: ${result.issues}件\n`;
      summary += `- **修正された問題**: ${result.fixed}件\n`;

      if (result.commit) {
        summary += `- **コミットハッシュ**: ${result.commit}\n`;
      }
    }

    summary += '\n';
  }

  // パフォーマンス分析
  if (totalLoops > 1) {
    summary += `## 📊 パフォーマンス分析\n\n`;

    const fixRates = loopResults.filter(r => !r.error).map(r => ({
      loop: r.loop,
      rate: r.issues > 0 ? (r.fixed / r.issues * 100) : 0
    }));

    if (fixRates.length > 0) {
      summary += `### 修正成功率の推移\n\n`;
      summary += `| ループ | 修正成功率 |\n`;
      summary += `|-------|----------|\n`;

      for (const rate of fixRates) {
        summary += `| ${rate.loop} | ${rate.rate.toFixed(1)}% |\n`;
      }

      summary += '\n';
    }
  }

  // 改善提案
  summary += `## 💡 改善提案\n\n`;

  if (hasErrors) {
    summary += `- ⚠️ エラーが発生しました。ワークフローログを確認してください\n`;
  }

  if (totalFixed === 0) {
    summary += `- ℹ️ 自動修正可能な問題が見つかりませんでした\n`;
    summary += `- 💡 重要度閾値を下げることで、より多くの問題を自動修正できる可能性があります\n`;
  } else if (totalLoops >= parseInt(process.env.MAX_LOOP_COUNT || '5')) {
    summary += `- ⚠️ 最大ループ回数に到達しました\n`;
    summary += `- 💡 まだ未修正の問題が残っている可能性があります\n`;
    summary += `- 💡 手動でのレビューと修正を推奨します\n`;
  }

  const avgFixRate = loopResults.filter(r => !r.error && r.issues > 0)
    .reduce((sum, r) => sum + (r.fixed / r.issues), 0) / totalLoops;

  if (avgFixRate < 0.5 && totalLoops > 0) {
    summary += `- ⚠️ 平均修正成功率が低い（${(avgFixRate * 100).toFixed(1)}%）\n`;
    summary += `- 💡 修正ロジックの改善が必要かもしれません\n`;
  }

  summary += `\n## 🔗 関連リンク\n\n`;
  summary += `- [PR #${PR_NUMBER}](https://github.com/${owner}/${repo}/pull/${PR_NUMBER})\n`;
  summary += `- [ワークフロー実行履歴](https://github.com/${owner}/${repo}/actions/workflows/claude-auto-fix.yml)\n`;
  summary += `- [Claude Code Review設定](.github/workflows/claude-code-review.yml)\n`;

  return summary;
}

async function saveAndPostSummary() {
  try {
    const summary = await generateSummary();

    // ファイルとして保存
    const summaryPath = `.github/auto-fix-reports/pr-${PR_NUMBER}-${Date.now()}.md`;
    const dir = '.github/auto-fix-reports';

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(summaryPath, summary);
    console.log(`📄 レポートを保存しました: ${summaryPath}`);

    // PRにコメントとして投稿
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: PR_NUMBER,
      body: summary
    });

    console.log('✅ サマリーレポートを投稿しました');
  } catch (error) {
    console.error('❌ サマリー生成エラー:', error.message);
    process.exit(1);
  }
}

// GitHub Actions サマリーとしても出力
function outputActionsSummary(summary) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) {
    fs.appendFileSync(summaryFile, summary);
    console.log('📝 GitHub Actions サマリーに出力しました');
  }
}

async function main() {
  const summary = await generateSummary();

  // GitHub Actions サマリーに出力
  outputActionsSummary(summary);

  // PRコメントとして投稿
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: PR_NUMBER,
    body: summary
  });

  console.log('✅ 完了レポートを生成しました');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});