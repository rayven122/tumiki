# Auth0 で Notion OAuth2 カスタム接続を設定する方法

このドキュメントでは、Auth0 のカスタムソーシャル接続として Notion を追加する手順を説明します。

## 前提条件

- Auth0 アカウントとテナント
- Notion アカウント
- Notion API へのアクセス権限

## 手順

### 1. Notion インテグレーションの作成

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセス
2. 「New integration」をクリック
3. 以下の情報を入力：

   - **Name**: アプリケーション名
   - **Type**: Public integration を選択
   - **Associated workspace**: 開発用ワークスペースを選択

4. OAuth 設定：

   - **Redirect URIs**: `https://rayven.jp.auth0.com/login/callback` を追加
   - 設定を保存

5. 以下の情報をメモ：
   - **OAuth Client ID**
   - **OAuth Client Secret**

### 2. Auth0 でカスタム接続の作成

1. Auth0 Dashboard にログイン
2. 左メニューから **Authentication** > **Social** を選択
3. **Create Connection** をクリック
4. リストの下部までスクロールし、**Create Custom** を選択

### 3. カスタム接続の設定

以下の情報を入力：

#### 基本設定

| フィールド        | 値                                          |
| ----------------- | ------------------------------------------- |
| Connection Name   | `notion-oauth2`（変更不可）                 |
| Authorization URL | `https://api.notion.com/v1/oauth/authorize` |
| Token URL         | `https://api.notion.com/v1/oauth/token`     |
| Scope             | （空欄のままでOK）                          |
| Client ID         | Notion で取得した OAuth Client ID           |
| Client Secret     | Notion で取得した OAuth Client Secret       |

#### Fetch User Profile Script

以下のスクリプトを設定：

```javascript
function fetchUserProfile(accessToken, context, callback) {
  request.get(
    {
      url: "https://api.notion.com/v1/users/me",
      headers: {
        Authorization: "Bearer " + accessToken,
        "Notion-Version": "2022-06-28",
      },
    },
    (err, resp, body) => {
      if (err) {
        return callback(err);
      }
      if (resp.statusCode !== 200) {
        return callback(new Error(body));
      }
      let bodyParsed;
      try {
        bodyParsed = JSON.parse(body);
      } catch (jsonError) {
        return callback(new Error(body));
      }

      // Notion のレスポンスから Auth0 用のプロファイルを構築
      const profile = {
        user_id: bodyParsed.id,
        name: bodyParsed.name || bodyParsed.bot?.owner?.user?.name,
        email: bodyParsed.bot?.owner?.user?.person?.email,
      };

      callback(null, profile);
    },
  );
}
```

### 4. 追加パラメータの設定（オプション）

Notion の OAuth フローでは `owner` パラメータが必要な場合があります。Management API を使用して設定：

```bash
curl --request PATCH \
  --url 'https://rayven.jp.auth0.com/api/v2/connections/CONNECTION-ID' \
  --header 'authorization: Bearer YOUR_MANAGEMENT_API_TOKEN' \
  --header 'content-type: application/json' \
  --data '{
    "options": {
      "authParams": {
        "owner": "user"
      }
    }
  }'
```

### 5. アプリケーションで接続を有効化

1. 作成した接続の設定画面で **Applications** タブを選択
2. この接続を使用したいアプリケーションのトグルをONにする

### 6. ログインURLの構成

ユーザーが Notion でログインする際のURLは以下の形式：

```
https://rayven.jp.auth0.com/authorize
  ?response_type=code
  &client_id=YOUR_AUTH0_CLIENT_ID
  &redirect_uri=YOUR_APP_CALLBACK_URL
  &scope=openid%20profile%20email
  &connection=notion-oauth2
```

## 技術的な詳細

### Notion OAuth2 フローの特徴

1. **認証エンドポイント**

   - Authorization: `https://api.notion.com/v1/oauth/authorize`
   - Token: `https://api.notion.com/v1/oauth/token`

2. **スコープ**

   - Notion は明示的なスコープを使用しない
   - ユーザーが認証時に共有するページを選択

3. **ユーザー情報の取得**

   - エンドポイント: `/v1/users/me`
   - 必須ヘッダー: `Notion-Version`
   - レスポンスには bot 情報と owner 情報が含まれる

4. **アクセス制御**
   - 各ユーザーが個別に認証する必要がある
   - ユーザーごとに共有されたページのみアクセス可能

### トラブルシューティング

#### 認証エラーが発生する場合

1. **Client ID/Secret の確認**

   - Notion と Auth0 で同じ値を使用しているか確認

2. **リダイレクト URI の一致**

   - Notion に登録した URI が `https://rayven.jp.auth0.com/login/callback` と完全一致するか確認

3. **Notion-Version ヘッダー**
   - Fetch User Profile Script で適切なバージョンを指定しているか確認

#### ユーザー情報が取得できない場合

- Notion API のレスポンス構造を確認
- `bodyParsed` の内容をログ出力して構造を確認
- email フィールドが存在しない場合があるため、適切なフォールバック処理を実装

## 参考リンク

- [Notion API Documentation - Authorization](https://developers.notion.com/docs/authorization)
- [Auth0 Documentation - Custom Social Connections](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/custom-oauth2-connections)
- [Notion API Changelog](https://developers.notion.com/changelog)
