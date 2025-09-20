#!/usr/bin/env node

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Claude APIクライアントを初期化
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const DRY_RUN = process.env.DRY_RUN === 'true';

/**
 * Claudeを使用してコードを自動修正
 */
async function fixCodeWithClaude(issue) {
  const { file, currentCode, fixedCode, title, severity } = issue;

  try {
    // ファイル全体を読み込み
    const filePath = path.join(process.cwd(), file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // ファイルの拡張子を取得
    const ext = path.extname(file);
    const language = getLanguageFromExtension(ext);

    // Claudeにコード修正を依頼
    const prompt = `あなたはTypeScript/JavaScriptの専門家です。以下のコードレビューの指摘に基づいて、コードを修正してください。

## レビュー指摘
- **問題**: ${title}
- **重要度**: ${severity}/10
- **ファイル**: ${file}

## 現在のコード（問題のある部分）
\`\`\`${language}
${currentCode}
\`\`\`

## 提案された修正
\`\`\`${language}
${fixedCode}
\`\`\`

## ファイル全体のコンテキスト
\`\`\`${language}
${fileContent}
\`\`\`

以下の要件に従って修正してください：

1. 提案された修正を適用する
2. 修正がファイル全体のコンテキストで正しく動作することを確認
3. 必要に応じて、関連する部分も一緒に修正（型定義、import文など）
4. TypeScriptの型安全性を保つ
5. 既存のコードスタイルに従う

修正後のファイル全体のコードを出力してください。コードブロックで囲み、説明は不要です。`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // レスポンスからコードを抽出
    const responseText = response.content[0].text;
    const codeMatch = responseText.match(/```(?:\w+)?\n([\s\S]+?)\n```/);

    if (!codeMatch) {
      throw new Error('修正されたコードが見つかりません');
    }

    const fixedFileContent = codeMatch[1];

    // バリデーション：修正が適用されているか確認
    if (!fixedFileContent.includes(fixedCode) && fixedFileContent.includes(currentCode)) {
      throw new Error('修正が適用されていません');
    }

    return {
      success: true,
      content: fixedFileContent,
      message: '修正を適用しました'
    };

  } catch (error) {
    console.error(`修正エラー (${file}):`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * ファイル拡張子から言語を判定
 */
function getLanguageFromExtension(ext) {
  const langMap = {
    '.ts': 'typescript',
    '.tsx': 'tsx',
    '.js': 'javascript',
    '.jsx': 'jsx',
    '.json': 'json',
    '.yml': 'yaml',
    '.yaml': 'yaml',
    '.md': 'markdown'
  };
  return langMap[ext] || 'text';
}

/**
 * 修正を検証（構文チェック、型チェック）
 */
async function validateFix(filePath) {
  try {
    // TypeScriptファイルの場合、型チェックを実行
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      execSync(`npx tsc --noEmit ${filePath}`, { encoding: 'utf-8', stdio: 'pipe' });
    }

    // ESLintチェック（可能な場合）
    try {
      execSync(`npx eslint ${filePath} --max-warnings 0`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (e) {
      // ESLintエラーは警告として扱う
      console.warn(`⚠️ ESLint警告: ${filePath}`);
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message
    };
  }
}

/**
 * バックアップを作成
 */
function createBackup(filePath) {
  const backupPath = `${filePath}.backup-${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

/**
 * ロールバック
 */
function rollback(filePath, backupPath) {
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, filePath);
    fs.unlinkSync(backupPath);
    console.log(`↩️ ロールバック完了: ${filePath}`);
  }
}

/**
 * メイン処理
 */
async function applyClaudeFixes(issues) {
  const results = [];
  const backups = [];

  for (const issue of issues) {
    const filePath = path.join(process.cwd(), issue.file);

    console.log(`\n🔧 修正中: ${issue.file}`);
    console.log(`  📝 問題: ${issue.title}`);
    console.log(`  🎯 重要度: ${issue.severity}/10`);

    if (DRY_RUN) {
      console.log('  🏃 ドライランモード - スキップ');
      results.push({ ...issue, status: 'dry-run' });
      continue;
    }

    // バックアップを作成
    const backupPath = createBackup(filePath);
    backups.push({ filePath, backupPath });

    try {
      // Claudeで修正
      const fixResult = await fixCodeWithClaude(issue);

      if (!fixResult.success) {
        throw new Error(fixResult.error);
      }

      // ファイルに書き込み
      fs.writeFileSync(filePath, fixResult.content);

      // 検証
      const validation = await validateFix(filePath);

      if (!validation.valid) {
        throw new Error(`検証失敗: ${validation.error}`);
      }

      // バックアップを削除
      fs.unlinkSync(backupPath);

      console.log('  ✅ 修正成功');
      results.push({ ...issue, status: 'fixed' });

    } catch (error) {
      console.error(`  ❌ 修正失敗: ${error.message}`);

      // ロールバック
      rollback(filePath, backupPath);

      results.push({
        ...issue,
        status: 'failed',
        error: error.message
      });
    }
  }

  // エラーが発生した場合、すべてロールバック（トランザクション的な処理）
  const hasFailure = results.some(r => r.status === 'failed');
  if (hasFailure && !DRY_RUN) {
    console.log('\n⚠️ エラーが発生したため、すべての変更をロールバックします');
    for (const { filePath, backupPath } of backups) {
      if (fs.existsSync(backupPath)) {
        rollback(filePath, backupPath);
      }
    }
  }

  return results;
}

// エクスポート
module.exports = {
  applyClaudeFixes,
  fixCodeWithClaude,
  validateFix
};

// 直接実行された場合
if (require.main === module) {
  // テスト用のサンプルissue
  const testIssue = {
    severity: 8,
    title: 'DRY原則違反: 重複コード',
    file: process.argv[2] || 'test.ts',
    line: 10,
    currentCode: process.argv[3] || 'console.log("test")',
    fixedCode: process.argv[4] || 'logger.info("test")'
  };

  applyClaudeFixes([testIssue])
    .then(results => {
      console.log('\n📊 結果:', results);
    })
    .catch(error => {
      console.error('エラー:', error);
      process.exit(1);
    });
}