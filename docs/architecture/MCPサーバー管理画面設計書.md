# MCPサーバー管理画面設計書

## 1. サーバー一覧画面

### 1.1 画面レイアウト
- ヘッダー部分
  - 新規サーバー追加ボタン
- メインコンテンツ
  - サーバー一覧（グリッド表示）
  - 各サーバーカードには以下の情報を表示
    - サービスアイコン
    - サーバー名
    - ステータス（起動中/停止中）
    - 最終更新日時
    - アクション（起動/停止/再起動/編集/削除）

### 1.2 サーバーカードの表示項目
- サービスアイコン（32x32px）
- サーバー名（最大50文字）
- ステータス表示
  - 起動中：緑色のインジケーター
  - 停止中：赤色のインジケーター
- 最終更新日時（YYYY-MM-DD HH:mm:ss形式）
- クイックアクションボタン
  - 起動/停止トグル
  - 再起動
  - 編集
  - 削除

## 2. サーバー追加画面

### 2.1 サービス選択画面
- ヘッダー部分
  - 画面タイトル：「MCPサーバーの追加」
  - 戻るボタン
- メインコンテンツ
  - 利用可能なMCPサービスの一覧表示
    - サービスアイコン
    - サービス名
    - サービス説明
    - 選択ボタン

### 2.2 APIトークン設定画面
- ヘッダー部分
  - 画面タイトル：「APIトークンの設定」
  - 戻るボタン
- メインコンテンツ
  - サービス情報表示
    - サービスアイコン
    - サービス名
  - APIトークン取得手順
    - 手順1：APIトークン発行ページへのリンク
    - 手順2：トークンの取得方法の説明
    - 手順3：トークンの保存方法の説明
  - トークン入力フォーム
    - トークン入力フィールド
    - トークンの有効期限（オプション）
    - 保存ボタン

### 2.3 サーバー設定画面
- ヘッダー部分
  - 画面タイトル：「サーバー設定」
  - 戻るボタン
- メインコンテンツ
  - 基本情報入力フォーム
    - サーバー名（必須）
    - サーバー説明（オプション）
    - サーバーURL（必須）
    - 利用可能なツールの選択（マルチセレクト）
  - アクセス制御設定
    - アクセス制限の有効/無効
    - IPアドレス制限（オプション）
    - レート制限設定（オプション）
  - 保存ボタン

## 3. データモデル

### 3.1 サーバー情報
```typescript
type Server {
  id: string;
  name: string;
  description?: string;
  serviceType: string;
  status: 'running' | 'stopped';
  apiToken: string;
  tokenExpiry?: Date;
  serverUrl: string;
  availableTools: string[];
  createdAt: Date;
  updatedAt: Date;
  accessControl?: {
    enabled: boolean;
    allowedIPs?: string[];
    rateLimit?: {
      requests: number;
      period: number;
    };
  };
}
```

### 3.2 サービス情報
```typescript
type Service {
  id: string;
  name: string;
  description: string;
  icon: string;
  apiTokenUrl: string;
  tokenInstructions: string[];
  availableTools: {
    id: string;
    name: string;
    description: string;
  }[];
}
```

## 4. 画面遷移フロー
1. サーバー一覧画面
2. 新規サーバー追加ボタンクリック
3. サービス選択画面
4. APIトークン設定画面
5. サーバー設定画面
6. 保存完了後、サーバー一覧画面に戻る

## 5. エラーハンドリング
- APIトークンの形式チェック
- 必須項目のバリデーション
- サーバー接続テスト
- 重複サーバー名のチェック
- トークンの有効期限チェック

## 6. セキュリティ考慮事項
- APIトークンの暗号化保存
- セッション管理
- CSRF対策
- XSS対策
- 入力値のサニタイズ 