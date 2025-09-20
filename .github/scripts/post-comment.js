#!/usr/bin/env node

const { Octokit } = require('@octokit/rest');

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const PR_NUMBER = process.env.PR_NUMBER;
const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
const commentType = process.argv[2] || 'info';

async function postComment(body) {
  try {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: PR_NUMBER,
      body
    });
    console.log('✅ コメントを投稿しました');
  } catch (error) {
    console.error('❌ コメント投稿エラー:', error.message);
    process.exit(1);
  }
}

function generateStartComment() {
  return `## 🤖 Claude Auto-Fix Loop 開始

自動修正ループを開始します。Claude Code Reviewの指摘事項を自動的に修正していきます。

### ⚙️ 設定
- **最大ループ回数**: ${process.env.MAX_LOOP_COUNT || 5}
- **自動修正対象の重要度閾値**: ${process.env.AUTO_FIX_THRESHOLD || 7}
- **モード**: ${process.env.DRY_RUN === 'true' ? '🏃 ドライラン' : '✏️ 実行'}

### 📋 プロセス
1. Claude Code Reviewを実行
2. 重要度7以上の問題を抽出
3. 自動修正を適用
4. 変更をコミット
5. 再度レビューを実行（最大5回まで）

進捗状況は随時更新されます...`;
}

function generateErrorComment() {
  return `## ❌ Claude Auto-Fix Loop エラー

自動修正ループの実行中にエラーが発生しました。

### 🔍 トラブルシューティング
1. ワークフローログを確認してください
2. 手動でコードレビューを実施してください
3. 必要に応じて手動で修正を適用してください

### 📞 サポート
問題が解決しない場合は、リポジトリ管理者にお問い合わせください。`;
}

function generateCompletionComment(results) {
  const totalFixed = results.reduce((sum, r) => sum + (r.fixed || 0), 0);
  const totalLoops = results.length;

  return `## ✅ Claude Auto-Fix Loop 完了

自動修正ループが正常に完了しました！

### 📊 実行結果サマリー
- **実行ループ数**: ${totalLoops}回
- **修正された問題の総数**: ${totalFixed}件

### 📝 各ループの詳細
${results.map(r => {
  if (r.error) {
    return `- **ループ ${r.loop}**: ❌ エラー: ${r.error}`;
  }
  return `- **ループ ${r.loop}**: ${r.fixed}件修正 ${r.commit ? `(${r.commit.substring(0, 7)})` : ''}`;
}).join('\n')}

### 🎯 次のステップ
1. 修正内容をレビューしてください
2. テストが全て成功していることを確認してください
3. 問題がなければPRをマージしてください`;
}

async function main() {
  let comment;

  switch (commentType) {
    case 'start':
      comment = generateStartComment();
      break;
    case 'error':
      comment = generateErrorComment();
      break;
    case 'completion':
      const results = process.env.LOOP_RESULTS ? JSON.parse(process.env.LOOP_RESULTS) : [];
      comment = generateCompletionComment(results);
      break;
    default:
      comment = process.env.COMMENT_BODY || 'Auto-fix loop update';
  }

  await postComment(comment);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});