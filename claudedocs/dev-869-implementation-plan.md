# DEV-869: tumiki Electronアプリケーション実装計画書

## 📋 プロジェクト概要

**Issue ID**: DEV-869
**タイトル**: tumiki: Electronアプリケーションの開発
**ステータス**: In Progress
**担当者**: 鈴山英寿
**関連GitHub Issue**: #327

### 目的

MCPサーバーとの統合を強化し、ローカル環境でのシームレスな開発体験を提供するElectronベースのデスクトップアプリケーションを開発する。

### 関連Issue

- DEV-860: マイクロサービス対応
- DEV-866: stdio → http 変換
- DEV-867: Cloud Run デプロイ

---

## 🏗️ アーキテクチャ設計

### プロジェクト構成

```text
apps/desktop/
├── src/
│   ├── main/              # Electronメインプロセス
│   │   ├── index.ts       # エントリーポイント
│   │   ├── window.ts      # ウィンドウ管理
│   │   ├── menu.ts        # アプリケーションメニュー
│   │   ├── tray.ts        # システムトレイ
│   │   └── ipc/           # IPCハンドラー
│   │       ├── mcp.ts     # MCP関連IPC
│   │       └── config.ts  # 設定関連IPC
│   ├── preload/           # Preloadスクリプト
│   │   └── index.ts       # ContextBridge設定
│   ├── renderer/          # Reactレンダラープロセス
│   │   ├── App.tsx        # ルートコンポーネント
│   │   ├── _components/   # UIコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   ├── utils/         # ユーティリティ
│   │   └── styles/        # Tailwind CSS
│   └── shared/            # 共通型定義
│       └── types.ts
├── resources/             # アプリケーションリソース
│   ├── icon.png
│   └── tray-icon.png
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

### 技術スタック（tumikiプロジェクト標準）

**コア技術**:

- **Electron**: v28.x (最新安定版)
- **TypeScript**: catalog参照（v5.x）
- **パッケージマネージャ**: pnpm（プロジェクト標準）
- **ビルドツール**: electron-vite（Viteベース）
- **React**: catalog:react19 参照
- **Tailwind CSS**: catalog参照
- **Jotai**: 状態管理

**開発ツール**:

- **electron-vite**: Viteベース高速開発環境
- **electron-updater**: 自動アップデート
- **electron-store**: ローカルストレージ
- **Vitest**: catalog参照
- **ESLint**: catalog参照
- **Prettier**: catalog参照
- **dotenv-cli**: 環境変数管理

---

## 📝 実装フェーズ

### Phase 1: プロジェクトセットアップ（Week 1）

#### 1.1 プロジェクト初期化

**タスク**:

- [ ] `apps/desktop` ディレクトリ作成
- [ ] `package.json` 設定（tumiki標準に準拠）
- [ ] `electron.vite.config.ts` 設定
- [ ] TypeScript設定（`tsconfig.json` - `@tumiki/tsconfig`継承）
- [ ] ESLint/Prettier設定（catalog参照）
- [ ] turborepo設定更新

**技術要件（tumikiプロジェクト標準）**:

```json
{
  "name": "@tumiki/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist-electron/main/index.js",
  "scripts": {
    "dev": "pnpm with-env electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "start": "electron-vite preview",
    "clean": "git clean -xdf .cache .turbo node_modules dist-electron out",
    "typecheck": "tsc --noEmit",
    "typecheck:dev": "tsgo --noEmit",
    "with-env": "dotenv -e ../../.env --",
    "lint": "eslint",
    "lint:fix": "eslint --fix",
    "format": "prettier --check . --ignore-path ../../.gitignore",
    "format:fix": "prettier --write . --ignore-path ../../.gitignore",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**注**: パッケージング関連スクリプト（`package`, `package:mac/win/linux`）はPhase 7で追加します。

#### 1.2 基本ウィンドウ実装

**ファイル**: `src/main/index.ts`, `src/main/window.ts`

**機能**:
- アプリケーション起動処理
- メインウィンドウ作成
- セキュアな設定（`nodeIntegration: false`, `contextIsolation: true`）
- 開発者ツール（開発時のみ）

**実装例**:
```typescript
// src/main/window.ts
import { BrowserWindow } from 'electron';

export const createMainWindow = (): BrowserWindow => {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    window.loadURL('http://localhost:5173');
    window.webContents.openDevTools();
  } else {
    window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  return window;
};
```

#### 1.3 Preload実装

**ファイル**: `src/preload/index.ts`

**機能**:
- ContextBridge設定
- 型安全なIPC API公開

**実装例**:
```typescript
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // MCP関連API
  mcp: {
    listServers: () => ipcRenderer.invoke('mcp:list-servers'),
    startServer: (serverId: string) => ipcRenderer.invoke('mcp:start-server', serverId),
    stopServer: (serverId: string) => ipcRenderer.invoke('mcp:stop-server', serverId),
  },
  // 設定関連API
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('config:set', key, value),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;
```

---

### Phase 2: UIフレームワーク実装（Week 2）

#### 2.1 Reactセットアップ

**タスク**:
- [ ] React + TypeScript設定
- [ ] Tailwind CSS設定
- [ ] ルーティング設定（React Router）
- [ ] 基本レイアウトコンポーネント

**ディレクトリ構成**:
```
src/renderer/
├── App.tsx
├── main.tsx
├── _components/
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── StatusBar.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── McpServers.tsx
│   └── Settings.tsx
└── styles/
    └── globals.css
```

#### 2.2 状態管理（Jotai）

**ファイル**: `src/renderer/store/atoms.ts`

**実装**:
```typescript
import { atom } from 'jotai';
import type { McpServer, AppConfig } from '../shared/types';

// MCPサーバー一覧
export const mcpServersAtom = atom<McpServer[]>([]);

// アプリケーション設定
export const appConfigAtom = atom<AppConfig>({
  theme: 'light',
  autoStart: false,
  minimizeToTray: true,
});

// 現在選択中のサーバー
export const selectedServerAtom = atom<string | null>(null);
```

#### 2.3 基本UIコンポーネント

**コンポーネント一覧**:
- [ ] `Layout.tsx` - アプリケーション全体レイアウト
- [ ] `Sidebar.tsx` - ナビゲーションサイドバー
- [ ] `ServerCard.tsx` - MCPサーバー表示カード
- [ ] `ServerList.tsx` - サーバー一覧表示
- [ ] `SettingsForm.tsx` - 設定フォーム

**コーディング規約**:
- 関数コンポーネント + アロー関数
- Props型定義必須
- `_components/` ディレクトリに配置

---

### Phase 3: MCPサーバー統合（Week 3）

#### 3.1 MCPサーバー通信実装

**ファイル**: `src/main/ipc/mcp.ts`

**機能**:
- MCPサーバー一覧取得
- サーバー起動/停止
- サーバーステータス監視
- エラーハンドリング

**実装例**:
```typescript
import { ipcMain } from 'electron';
import { McpServerManager } from '../services/mcpServerManager';

const mcpManager = new McpServerManager();

export const setupMcpIpc = (): void => {
  ipcMain.handle('mcp:list-servers', async () => {
    return await mcpManager.listServers();
  });

  ipcMain.handle('mcp:start-server', async (_, serverId: string) => {
    return await mcpManager.startServer(serverId);
  });

  ipcMain.handle('mcp:stop-server', async (_, serverId: string) => {
    return await mcpManager.stopServer(serverId);
  });

  ipcMain.handle('mcp:get-status', async (_, serverId: string) => {
    return await mcpManager.getStatus(serverId);
  });
};
```

#### 3.2 MCPサーバーマネージャー

**ファイル**: `src/main/services/mcpServerManager.ts`

**機能**:
- サーバープロセス管理
- 既存 `@tumiki/db` との統合
- ステータス監視
- ログ管理

**実装例**:
```typescript
import { spawn, ChildProcess } from 'child_process';
import type { McpServer } from '../../shared/types';

export class McpServerManager {
  private runningServers: Map<string, ChildProcess> = new Map();

  listServers = async (): Promise<McpServer[]> => {
    // @tumiki/db から取得
    return [];
  };

  startServer = async (serverId: string): Promise<void> => {
    // サーバー起動ロジック
  };

  stopServer = async (serverId: string): Promise<void> => {
    // サーバー停止ロジック
  };

  getStatus = async (serverId: string): Promise<string> => {
    return this.runningServers.has(serverId) ? 'running' : 'stopped';
  };
}
```

#### 3.3 ProxyServerとの統合

**ファイル**: `src/main/services/proxyClient.ts`

**機能**:
- ProxyServer（`apps/proxyServer`）への接続
- HTTP/SSE通信
- リクエスト/レスポンス処理

---

### Phase 4: 設定管理（Week 4）

#### 4.1 electron-store統合

**ファイル**: `src/main/services/configStore.ts`

**機能**:
- アプリケーション設定永続化
- スキーマ検証
- デフォルト値管理

**実装例**:
```typescript
import Store from 'electron-store';
import type { AppConfig } from '../../shared/types';

const schema = {
  theme: { type: 'string', default: 'light' },
  autoStart: { type: 'boolean', default: false },
  minimizeToTray: { type: 'boolean', default: true },
} as const;

export const configStore = new Store<AppConfig>({
  schema,
  name: 'tumiki-config',
});
```

#### 4.2 設定UI実装

**ファイル**: `src/renderer/pages/Settings.tsx`

**機能**:
- テーマ設定（Light/Dark）
- 自動起動設定
- システムトレイ設定
- MCPサーバーデフォルト設定

---

### Phase 5: システムトレイとメニュー（Week 5）

#### 5.1 アプリケーションメニュー

**ファイル**: `src/main/menu.ts`

**機能**:
- ファイルメニュー（Quit）
- 編集メニュー（Cut, Copy, Paste）
- 表示メニュー（Reload, DevTools）
- ヘルプメニュー（About）

#### 5.2 システムトレイ

**ファイル**: `src/main/tray.ts`

**機能**:
- トレイアイコン表示
- コンテキストメニュー
- ウィンドウ最小化/復元
- クイックアクション

**実装例**:
```typescript
import { Tray, Menu, nativeImage } from 'electron';

export const createTray = (window: BrowserWindow): Tray => {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../../resources/tray-icon.png'));
  const tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => window.show() },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip('tumiki');

  return tray;
};
```

---

### Phase 6: 自動アップデート（Week 6）

#### 6.1 electron-updater設定

**ファイル**: `src/main/updater.ts`

**機能**:
- GitHub Releases連携
- 自動ダウンロード
- ユーザー通知
- バージョン管理

**実装例**:
```typescript
import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';

export const setupAutoUpdater = (): void => {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version is available. Downloading...',
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to apply.',
      buttons: ['Restart', 'Later'],
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
};
```

---

### Phase 7: ビルドとパッケージング（Week 7）

#### 7.1 パッケージングスクリプト追加

**ファイル**: `package.json`

Phase 1では開発に必要な最小限のスクリプトのみ定義しました。Phase 7でパッケージング用スクリプトを追加します：

```json
{
  "scripts": {
    "package": "electron-builder",
    "package:mac": "electron-builder --mac",
    "package:win": "electron-builder --win",
    "package:linux": "electron-builder --linux"
  }
}
```

#### 7.2 electron-vite設定

**ファイル**: `electron.vite.config.ts`

**設定内容（Viteベース）**:

```typescript
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
      },
    },
    plugins: [react()],
  },
});
```

**ファイル**: `electron-builder.yml`

**パッケージング設定**:

```yaml
appId: com.tumiki.desktop
productName: tumiki
directories:
  output: out
  buildResources: resources
files:
  - dist-electron
  - dist
  - resources
mac:
  target:
    - dmg
    - zip
  icon: resources/icon.icns
  category: public.app-category.developer-tools
win:
  target:
    - nsis
    - portable
  icon: resources/icon.ico
linux:
  target:
    - AppImage
    - deb
  icon: resources/icon.png
  category: Development
```

#### 7.3 CI/CD統合

**GitHub Actions**: `.github/workflows/desktop-build.yml`

**機能**:
- macOS/Windows/Linux向けビルド
- GitHub Releasesへアップロード
- コード署名（macOS/Windows）

---

## 🧪 テスト戦略

### ユニットテスト

**フレームワーク**: Vitest
**カバレッジ目標**: 100%

**テスト対象**:
- [ ] MCPサーバーマネージャー
- [ ] 設定管理
- [ ] IPC通信
- [ ] Reactコンポーネント

**テストファイル配置**:
```
src/
├── main/
│   └── services/
│       └── mcpServerManager.test.ts
├── renderer/
│   └── _components/
│       └── ServerCard.test.tsx
```

### E2Eテスト

**ツール**: Playwright (Electron統合)

**テストシナリオ**:
- [ ] アプリケーション起動
- [ ] MCPサーバー起動/停止
- [ ] 設定変更
- [ ] システムトレイ操作

---

## 📦 依存パッケージ（tumikiプロジェクト標準）

### メイン依存

```json
{
  "dependencies": {
    "electron-updater": "^6.3.9",
    "electron-store": "^10.0.0",
    "@tumiki/db": "workspace:*",
    "@tumiki/auth": "workspace:*",
    "@tumiki/utils": "workspace:*",
    "react": "catalog:react19",
    "react-dom": "catalog:react19",
    "jotai": "^2.10.6",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.1.0",
    "zod": "catalog:",
    "lucide-react": "^0.486.0"
  }
}
```

### 開発依存

```json
{
  "devDependencies": {
    "electron": "^34.0.0",
    "electron-vite": "^2.4.0",
    "electron-builder": "^25.3.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@tumiki/tsconfig": "workspace:*",
    "@tumiki/tailwind-config": "workspace:*",
    "@tumiki/vitest-config": "workspace:*",
    "@types/node": "^22.15.3",
    "@types/react": "catalog:react19",
    "@types/react-dom": "catalog:react19",
    "@typescript/native-preview": "7.0.0-dev.20250814.1",
    "@vitest/coverage-v8": "catalog:",
    "concurrently": "^9.0.1",
    "dotenv-cli": "^8.0.0",
    "eslint": "catalog:",
    "prettier": "catalog:",
    "prettier-plugin-tailwindcss": "^0.6.11",
    "tailwindcss": "catalog:",
    "typescript": "catalog:",
    "typescript-eslint": "^8.33.0",
    "vitest": "catalog:"
  },
  "peerDependencies": {
    "typescript": "^5.0.0"
  }
}
```

---

## 🎯 マイルストーン

### Sprint 1（Week 1-2）
- ✅ プロジェクトセットアップ
- ✅ 基本ウィンドウ実装
- ✅ React + Tailwind CSS統合

### Sprint 2（Week 3-4）
- ✅ MCPサーバー統合
- ✅ 設定管理実装

### Sprint 3（Week 5-6）
- ✅ システムトレイ実装
- ✅ 自動アップデート実装

### Sprint 4（Week 7-8）
- ✅ ビルド設定
- ✅ テスト整備
- ✅ ドキュメント作成

---

## ⚠️ リスクと対策

### リスク1: Electron + Viteの統合

**対策**:

- electron-viteを使用（公式推奨、安定版）
- tumikiプロジェクト既存のVite設定を参考
- 既存のビルドパイプライン（pnpm + Vite）との整合性確保

### リスク2: MCPサーバープロセス管理

**対策**:

- 既存ProxyServerのノウハウ活用
- `@tumiki/db` との統合パターン参照
- プロセス監視とエラーハンドリング強化
- セッション管理の実装（ProxyServerパターン）

### リスク3: クロスプラットフォーム対応

**対策**:

- 各プラットフォームでのCI/CDテスト
- 早期のベータテスト実施
- electron-builderの推奨設定を使用

### リスク4: 既存パッケージとの依存関係

**対策**:

- workspace参照（`workspace:*`）で最新版を自動参照
- catalog参照でバージョン統一
- `@tumiki/tsconfig`, `@tumiki/vitest-config` 等の共通設定を活用

---

## 📚 ドキュメント

### 作成ドキュメント

- [ ] README.md（開発ガイド）
- [ ] ARCHITECTURE.md（アーキテクチャ設計）
- [ ] CONTRIBUTING.md（コントリビューションガイド）
- [ ] ユーザーマニュアル

---

## ✅ 完了条件

### 1. 機能要件

- ✅ Electronアプリが起動（`pnpm dev`で開発、`pnpm start`でプレビュー）
- ✅ MCPサーバー起動/停止可能
- ✅ 設定保存/読み込み可能（electron-store）
- ✅ システムトレイ動作
- ✅ 自動アップデート動作（electron-updater）
- ✅ 既存 `@tumiki/db`, `@tumiki/auth` との統合

### 2. 品質要件（tumiki標準）

- ✅ `pnpm format:fix` 成功
- ✅ `pnpm lint:fix` 成功
- ✅ `pnpm typecheck` 成功
- ✅ `pnpm build` 成功
- ✅ `pnpm test` 成功（カバレッジ100%）
- ✅ 既存のCI/CDパイプラインに統合

### 3. クロスプラットフォーム

- ✅ macOS動作確認（dmg/zip）
- ✅ Windows動作確認（nsis/portable）
- ✅ Linux動作確認（AppImage/deb）

### 4. ドキュメント

- ✅ `apps/desktop/CLAUDE.md` 作成（開発ガイド）
- ✅ `apps/desktop/README.md` 作成
- ✅ ユーザーマニュアル作成

---

## 🔗 参考資料

### 公式ドキュメント

- [Electron公式ドキュメント](https://www.electronjs.org/docs)
- [electron-vite公式](https://electron-vite.org/)
- [electron-builder公式](https://www.electron.build/)
- [Vite公式](https://vitejs.dev/)

### tumiki既存プロジェクト

- [tumikiプロジェクト README](../README.md)
- [apps/manager](../apps/manager/) - Next.js + React参考実装
- [apps/proxyServer](../apps/proxyServer/) - tsup + Vite参考実装
- [packages/db](../packages/db/) - Prismaスキーマ参照
- [packages/auth](../packages/auth/) - Auth0認証パターン

### 共通設定参照

- `@tumiki/tsconfig` - TypeScript共通設定
- `@tumiki/vitest-config` - Vitest共通設定
- `@tumiki/tailwind-config` - Tailwind CSS共通設定

---

**作成日**: 2025-10-25
**最終更新**: 2025-10-25
**作成者**: Claude Code
**バージョン**: 2.0.0（tumikiプロジェクト標準対応版）
