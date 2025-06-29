/**
 * Tumiki ユーザー同期用 Auth0 Post-Login Action
 *
 * このアクションはログイン成功後に実行され、
 * ユーザー情報を Tumiki アプリケーションのデータベースと同期します。
 *
 * セットアップ手順:
 * 1. Auth0 Dashboard > Actions > Library にアクセス
 * 2. トリガータイプ "Login / Post Login" で新しいアクションを作成
 * 3. このコードをアクションエディターにコピー
 * 4. アクション設定で以下のシークレットを追加:
 *    - API_SECRET: .env ファイルの AUTH0_WEBHOOK_SECRET の値を設定
 *    - API_ENDPOINT: アプリケーションの sync-user エンドポイントを設定 (例: https://your-domain.com/api/auth/sync-user)
 * 5. アクションをデプロイし、Login フローに追加
 */

/**
 * PostLogin フローの実行中に呼び出されるハンドラー
 *
 * @param {Event} event - ログインするユーザーとそのコンテキストの詳細
 * @param {PostLoginAPI} api - ログインの動作を変更するために使用できるメソッドのインターフェース
 */
exports.onExecutePostLogin = async (event, api) => {
  const { user } = event;

  // ユーザー情報をTumikiアプリケーションに同期
  try {
    console.log(`Starting user sync for: ${user.user_id}`);

    const syncData = {
      sub: user.user_id,
      name: user.name || user.nickname,
      email: user.email,
      picture: user.picture,
    };

    console.log("Sync data:", JSON.stringify(syncData, null, 2));

    const response = await fetch(event.secrets.API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${event.secrets.API_SECRET}`,
      },
      body: JSON.stringify(syncData),
      timeout: 10000, // 10秒でタイムアウト
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `User sync failed with status ${response.status}:`,
        errorText,
      );

      // エラーでもログインは継続（オプション：必要に応じて api.access.deny() を使用）
      // api.access.deny('User synchronization failed');
      return;
    }

    const result = await response.json();
    console.log("User sync successful:", result);

    // オプション: ユーザーメタデータに同期ステータスを記録
    api.user.setUserMetadata("tumiki_sync_status", "success");
    api.user.setUserMetadata("tumiki_sync_timestamp", new Date().toISOString());
  } catch (error) {
    console.error("User sync error:", error);

    // オプション: メタデータにエラー情報を記録
    api.user.setUserMetadata("tumiki_sync_status", "error");
    api.user.setUserMetadata("tumiki_sync_error", error.message);

    // エラーでもログインは継続
    // 必要に応じて api.access.deny() でログインを拒否することも可能
  }
};

/**
 * 外部リダイレクト後にこのアクションが再開される際に呼び出されるハンドラー
 * onExecutePostLogin 関数がリダイレクトを実行しない場合、この関数は無視して構いません。
 *
 * @param {Event} event - ログインするユーザーとそのコンテキストの詳細
 * @param {PostLoginAPI} api - ログインの動作を変更するために使用できるメソッドのインターフェース
 */
exports.onContinuePostLogin = async (event, api) => {
  // この実装では外部リダイレクトを使用しないため、この関数は空のままです
};
