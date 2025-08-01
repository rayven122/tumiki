# Auth0 で Figma OAuth2 カスタム接続を設定する方法

このドキュメントでは、Auth0 のカスタムソーシャル接続として Figma を追加する手順を説明します。

## 前提条件

- Auth0 アカウントとテナント
- Figma アカウント
- Figma API へのアクセス権限

## 手順

### 1. Figma アプリケーションの作成

1. [Figma Developers](https://www.figma.com/developers) にアクセス
2. 右上の「View apps」をクリック
3. 「Create new app」をクリック
4. 以下の情報を入力：

   - **App name**: アプリケーション名
   - **Website URL**: アプリケーションのURL
   - **Callback URL**: `https://rayven.jp.auth0.com/login/callback` を追加

5. アプリを作成後、以下の情報をメモ：
   - **Client ID**
   - **Client Secret**

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
| Connection Name   | `figma`（変更不可）                         |
| Authorization URL | `https://www.figma.com/oauth`               |
| Token URL         | `https://www.figma.com/api/oauth/token`     |
| Scope             | `file_read`                                 |
| Client ID         | Figma で取得した Client ID                  |
| Client Secret     | Figma で取得した Client Secret              |

#### Fetch User Profile Script

以下のスクリプトを設定：

```javascript
function fetchUserProfile(accessToken, context, callback) {
  request.get(
    {
      url: "https://api.figma.com/v1/me",
      headers: {
        Authorization: "Bearer " + accessToken,
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

      // Figma のレスポンスから Auth0 用のプロファイルを構築
      const profile = {
        user_id: bodyParsed.id,
        name: bodyParsed.handle,
        email: bodyParsed.email,
        picture: bodyParsed.img_url,
      };

      callback(null, profile);
    },
  );
}
```

### 4. アプリケーションで接続を有効化

1. 作成した接続の設定画面で **Applications** タブを選択
2. この接続を使用したいアプリケーションのトグルをONにする

### 5. ログインURLの構成

ユーザーが Figma でログインする際のURLは以下の形式：

```
https://rayven.jp.auth0.com/authorize
  ?response_type=code
  &client_id=YOUR_AUTH0_CLIENT_ID
  &redirect_uri=YOUR_APP_CALLBACK_URL
  &scope=openid%20profile%20email
  &connection=figma
```

## 技術的な詳細

### Figma OAuth2 フローの特徴

1. **認証エンドポイント**

   - Authorization: `https://www.figma.com/oauth`
   - Token: `https://www.figma.com/api/oauth/token`

2. **利用可能なスコープ**

   - `file_read` - ファイルの読み取り権限
   - `file_write` - ファイルの書き込み権限（オプション）
   - `webhooks` - Webhook の管理権限（オプション）
   - `dev_resources` - Dev リソースへのアクセス権限（オプション）

3. **ユーザー情報の取得**

   - エンドポイント: `/v1/me`
   - レスポンスには以下が含まれる：
     - `id`: ユーザーID
     - `handle`: ユーザー名
     - `email`: メールアドレス
     - `img_url`: プロフィール画像URL

4. **アクセス制御**
   - アクセストークンは永続的（有効期限なし）
   - ユーザーはいつでもアプリの権限を取り消し可能

### トラブルシューティング

#### 認証エラーが発生する場合

1. **Client ID/Secret の確認**

   - Figma と Auth0 で同じ値を使用しているか確認

2. **リダイレクト URI の一致**

   - Figma に登録した URI が `https://rayven.jp.auth0.com/login/callback` と完全一致するか確認

3. **スコープの確認**
   - 最低限 `file_read` スコープが必要

#### ユーザー情報が取得できない場合

- Figma API のレスポンス構造を確認
- `bodyParsed` の内容をログ出力して構造を確認
- アクセストークンが正しく渡されているか確認

## 参考リンク

- [Figma API Documentation - OAuth2](https://www.figma.com/developers/api#oauth2)
- [Figma API Documentation - Authentication](https://www.figma.com/developers/api#authentication)
- [Auth0 Documentation - Custom Social Connections](https://auth0.com/docs/authenticate/identity-providers/social-identity-providers/custom-oauth2-connections)