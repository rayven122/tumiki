#!/usr/bin/env node

const fs = require('fs');
const yaml = require('js-yaml');

/**
 * Claude Code Reviewのコメントから問題を抽出
 */
function parseReviewComment(commentBody) {
  const issues = [];

  // 重要度パターン
  const severityPattern = /\*\*[🔴🟡🟢]?\s*\[重要度:\s*(\d+)\/10\]\s*(.+?)\*\*/g;
  const filePattern = /- \*\*ファイル\*\*:\s*`(.+?):(\d+)`/;
  const currentCodePattern = /- \*\*現在のコード\*\*:\s*```[\w]*\n([\s\S]*?)\n```/;
  const fixedCodePattern = /- \*\*改善案\*\*:\s*```[\w]*\n([\s\S]*?)\n```/;
  const reasonPattern = /- \*\*理由\*\*:\s*(.+)/;

  // コメントを段落に分割
  const sections = commentBody.split(/(?=\*\*[🔴🟡🟢]?\s*\[重要度:)/);

  for (const section of sections) {
    const severityMatch = section.match(/\[重要度:\s*(\d+)\/10\]\s*(.+?)\*\*/);
    if (!severityMatch) continue;

    const severity = parseInt(severityMatch[1]);
    const title = severityMatch[2].trim();

    const fileMatch = section.match(filePattern);
    const currentCodeMatch = section.match(currentCodePattern);
    const fixedCodeMatch = section.match(fixedCodePattern);
    const reasonMatch = section.match(reasonPattern);

    if (fileMatch && currentCodeMatch && fixedCodeMatch) {
      issues.push({
        severity,
        title,
        file: fileMatch[1],
        line: parseInt(fileMatch[2]),
        currentCode: currentCodeMatch[1].trim(),
        fixedCode: fixedCodeMatch[1].trim(),
        reason: reasonMatch ? reasonMatch[1].trim() : ''
      });
    }
  }

  return issues;
}

/**
 * GitHub APIからPRコメントを取得
 */
async function fetchPRComments(owner, repo, prNumber, token) {
  const { Octokit } = require('@octokit/rest');

  const octokit = new Octokit({ auth: token });

  try {
    const { data: comments } = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    // Claude Code Reviewのコメントをフィルタ
    const claudeComments = comments.filter(comment =>
      comment.body.includes('Claude Code Review') ||
      comment.body.includes('🤖 Claude Code Review')
    );

    // 最新のコメントを取得
    if (claudeComments.length > 0) {
      return claudeComments[claudeComments.length - 1].body;
    }

    return null;
  } catch (error) {
    console.error('コメント取得エラー:', error.message);
    return null;
  }
}

/**
 * ワークフロー実行結果から解析
 */
async function parseWorkflowArtifacts(runId) {
  try {
    const artifactPath = `.github/artifacts/run-${runId}/review-results.json`;

    if (fs.existsSync(artifactPath)) {
      const data = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
      return data.issues || [];
    }
  } catch (error) {
    console.error('アーティファクト読み込みエラー:', error.message);
  }

  return [];
}

/**
 * 問題を重要度でフィルタリング
 */
function filterIssuesBySeverity(issues, threshold = 7) {
  return issues.filter(issue => issue.severity >= threshold);
}

/**
 * 問題をファイルごとにグループ化
 */
function groupIssuesByFile(issues) {
  const grouped = {};

  for (const issue of issues) {
    if (!grouped[issue.file]) {
      grouped[issue.file] = [];
    }
    grouped[issue.file].push(issue);
  }

  // 各ファイルの問題を行番号順にソート
  for (const file in grouped) {
    grouped[file].sort((a, b) => a.line - b.line);
  }

  return grouped;
}

/**
 * 統計情報を生成
 */
function generateStatistics(issues) {
  const stats = {
    total: issues.length,
    bySeverity: {},
    byFile: {},
    averageSeverity: 0
  };

  // 重要度別カウント
  for (let i = 1; i <= 10; i++) {
    stats.bySeverity[i] = 0;
  }

  for (const issue of issues) {
    stats.bySeverity[issue.severity]++;

    if (!stats.byFile[issue.file]) {
      stats.byFile[issue.file] = 0;
    }
    stats.byFile[issue.file]++;
  }

  // 平均重要度
  if (issues.length > 0) {
    const totalSeverity = issues.reduce((sum, issue) => sum + issue.severity, 0);
    stats.averageSeverity = (totalSeverity / issues.length).toFixed(1);
  }

  return stats;
}

/**
 * YAMLファイルに結果を保存
 */
function saveResultsToYaml(issues, outputPath) {
  const results = {
    timestamp: new Date().toISOString(),
    issues,
    statistics: generateStatistics(issues),
    grouped: groupIssuesByFile(issues)
  };

  const yamlStr = yaml.dump(results, {
    indent: 2,
    lineWidth: 120,
    noRefs: true
  });

  fs.writeFileSync(outputPath, yamlStr);
  console.log(`📄 結果を保存しました: ${outputPath}`);
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'comment'; // 'comment' or 'file'

  let reviewText = '';
  let issues = [];

  if (mode === 'comment') {
    // GitHub APIからコメントを取得
    const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
    const prNumber = process.env.PR_NUMBER;
    const token = process.env.GITHUB_TOKEN;

    reviewText = await fetchPRComments(owner, repo, prNumber, token);

    if (!reviewText) {
      console.error('❌ レビューコメントが見つかりません');
      process.exit(1);
    }
  } else if (mode === 'file') {
    // ファイルから読み込み
    const filePath = args[1];
    if (!filePath || !fs.existsSync(filePath)) {
      console.error('❌ ファイルが見つかりません:', filePath);
      process.exit(1);
    }
    reviewText = fs.readFileSync(filePath, 'utf-8');
  } else if (mode === 'artifact') {
    // ワークフローアーティファクトから読み込み
    const runId = args[1] || process.env.GITHUB_RUN_ID;
    issues = await parseWorkflowArtifacts(runId);
  } else {
    // 標準入力から読み込み
    reviewText = fs.readFileSync(0, 'utf-8');
  }

  // レビューテキストがある場合はパース
  if (reviewText) {
    issues = parseReviewComment(reviewText);
  }

  // 閾値でフィルタリング
  const threshold = parseInt(process.env.AUTO_FIX_THRESHOLD || '7');
  const filteredIssues = filterIssuesBySeverity(issues, threshold);

  // 結果を出力
  console.log(`\n📊 解析結果:`);
  console.log(`  - 総問題数: ${issues.length}`);
  console.log(`  - 重要度${threshold}以上: ${filteredIssues.length}`);

  const stats = generateStatistics(filteredIssues);
  console.log(`  - 平均重要度: ${stats.averageSeverity}`);

  // ファイル別集計
  console.log(`\n📁 ファイル別:`);
  for (const [file, count] of Object.entries(stats.byFile)) {
    console.log(`  - ${file}: ${count}件`);
  }

  // JSONとして出力（他のスクリプトで使用）
  if (process.env.OUTPUT_JSON === 'true') {
    console.log(JSON.stringify(filteredIssues));
  }

  // YAMLファイルとして保存
  if (process.env.OUTPUT_YAML) {
    saveResultsToYaml(filteredIssues, process.env.OUTPUT_YAML);
  }

  // 結果をファイルに保存
  if (process.env.OUTPUT_FILE) {
    fs.writeFileSync(process.env.OUTPUT_FILE, JSON.stringify({
      issues: filteredIssues,
      statistics: stats,
      grouped: groupIssuesByFile(filteredIssues)
    }, null, 2));
  }

  return filteredIssues;
}

// エクスポート
module.exports = {
  parseReviewComment,
  filterIssuesBySeverity,
  groupIssuesByFile,
  generateStatistics
};

// 直接実行された場合
if (require.main === module) {
  main().then(issues => {
    process.exit(issues.length > 0 ? 0 : 1);
  }).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}