#!/usr/bin/env node

/**
 * Python MCP サーバーの自動インストールスクリプト
 * 
 * このスクリプトは pnpm install の postinstall フックで実行され、
 * 必要な Python MCP サーバーを自動的にインストールします。
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Python MCPサーバーのリスト（requirements.txtから読み込み）
const requirementsFile = join(rootDir, 'python-mcp-requirements.txt');

/**
 * コマンドが利用可能かチェック
 */
function commandExists(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * uvxがインストールされているかチェック
 */
function checkUvx() {
  if (!commandExists('uvx')) {
    console.warn(`
⚠️  uvx がインストールされていません。Python MCP サーバーを使用するには uvx が必要です。

インストール方法:
  Windows:  winget install astral.uv
  macOS:    brew install uv
  Linux:    curl -LsSf https://astral.sh/uv/install.sh | sh

詳細は docs/python-mcp-setup.md を参照してください。
`);
    return false;
  }
  return true;
}

/**
 * Pythonがインストールされているかチェック
 */
function checkPython() {
  const pythonCommands = ['python3', 'python'];
  
  for (const cmd of pythonCommands) {
    if (commandExists(cmd)) {
      try {
        const version = execSync(`${cmd} --version`, { encoding: 'utf8' });
        const match = version.match(/Python (\d+)\.(\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1]);
          const minor = parseInt(match[2]);
          if (major === 3 && minor >= 10) {
            return true;
          }
          console.warn(`⚠️  Python ${major}.${minor} が検出されましたが、Python 3.10 以上が必要です。`);
        }
      } catch {
        // エラーは無視して次のコマンドを試す
      }
    }
  }
  
  console.warn(`
⚠️  Python 3.10 以上がインストールされていません。Python MCP サーバーを使用するには Python が必要です。

インストール方法:
  Windows:  winget install Python.Python.3.12
  macOS:    brew install python@3.12
  Linux:    sudo apt install python3.12

詳細は docs/python-mcp-setup.md を参照してください。
`);
  return false;
}

/**
 * パッケージがインストールされているかチェック
 */
function isPackageInstalled(packageName) {
  try {
    const output = execSync('uv tool list', { encoding: 'utf8' });
    return output.includes(packageName);
  } catch {
    return false;
  }
}

/**
 * Python MCP サーバーをインストール
 */
function installPythonMcpServers() {
  if (!existsSync(requirementsFile)) {
    console.log('📋 Python MCP サーバーの requirements ファイルが見つかりません。スキップします。');
    return;
  }
  
  if (!checkPython()) {
    return;
  }
  
  if (!checkUvx()) {
    return;
  }
  
  console.log('🐍 Python MCP サーバーのインストールを確認中...\n');
  
  const requirements = readFileSync(requirementsFile, 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
  
  let installedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  for (const requirement of requirements) {
    // パッケージ名を抽出（バージョン指定を除く）
    const packageName = requirement.split(/[>=<~!]/)[0].trim();
    
    if (isPackageInstalled(packageName)) {
      console.log(`✓ ${packageName} は既にインストールされています`);
      skippedCount++;
      continue;
    }
    
    try {
      console.log(`📦 ${requirement} をインストール中...`);
      execSync(`uv tool install ${requirement}`, { 
        stdio: 'inherit',
        cwd: rootDir 
      });
      installedCount++;
      console.log(`✅ ${packageName} のインストールが完了しました\n`);
    } catch (error) {
      console.error(`❌ ${packageName} のインストールに失敗しました`);
      console.error(`   エラー: ${error.message}\n`);
      failedCount++;
    }
  }
  
  console.log('\n📊 Python MCP サーバーのインストール結果:');
  if (installedCount > 0) {
    console.log(`  ✅ 新規インストール: ${installedCount} 個`);
  }
  if (skippedCount > 0) {
    console.log(`  ⏭️  スキップ（インストール済み）: ${skippedCount} 個`);
  }
  if (failedCount > 0) {
    console.log(`  ❌ 失敗: ${failedCount} 個`);
    console.log('\n失敗したパッケージは手動でインストールしてください。');
    console.log('詳細は docs/python-mcp-setup.md を参照してください。');
  }
  
  if (installedCount === 0 && skippedCount > 0 && failedCount === 0) {
    console.log('\n✨ すべての Python MCP サーバーが既にインストールされています！');
  }
}

// CI環境では Python パッケージのインストールをスキップ
if (process.env.CI) {
  console.log('📋 CI 環境のため Python MCP サーバーのインストールをスキップします');
  process.exit(0);
}

// SKIP_PYTHON_MCP 環境変数が設定されている場合はスキップ
if (process.env.SKIP_PYTHON_MCP) {
  console.log('📋 SKIP_PYTHON_MCP が設定されているため Python MCP サーバーのインストールをスキップします');
  process.exit(0);
}

// メイン処理を実行
try {
  installPythonMcpServers();
} catch (error) {
  console.error('❌ Python MCP サーバーのインストール中にエラーが発生しました:');
  console.error(error);
  // postinstall でエラーになると pnpm install が失敗するため、エラーでも正常終了
  process.exit(0);
}