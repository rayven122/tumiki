/**
 * Slack APIエラーの定義とユーザーフレンドリーなメッセージマッピング
 */

/**
 * Slack APIエラーコードとユーザー向けメッセージのマッピング
 */
export const SLACK_ERROR_MESSAGES: Record<
  string,
  { message: string; action: string }
> = {
  // チャンネル関連エラー
  not_in_channel: {
    message: "ボットがチャンネルに参加していません",
    action:
      "Slackで通知先チャンネルを開き、/invite @Tumiki を実行してボットを招待してください",
  },
  channel_not_found: {
    message: "指定されたチャンネルが見つかりません",
    action:
      "チャンネルが削除されていないか確認し、エージェント設定で正しいチャンネルを選択してください",
  },
  is_archived: {
    message: "チャンネルがアーカイブされています",
    action: "アーカイブされていない別のチャンネルを選択してください",
  },

  // 認証・権限エラー
  invalid_auth: {
    message: "Slack認証が無効です",
    action: "設定画面でSlack連携を一度解除し、再連携してください",
  },
  token_revoked: {
    message: "Slackトークンが無効化されています",
    action: "設定画面でSlack連携を一度解除し、再連携してください",
  },
  missing_scope: {
    message: "必要な権限が不足しています",
    action: "設定画面でSlack連携を一度解除し、再連携してください",
  },
  account_inactive: {
    message: "Slackアカウントが無効化されています",
    action: "Slackワークスペースの管理者に連絡してください",
  },
  no_permission: {
    message: "このチャンネルへの投稿権限がありません",
    action:
      "チャンネルの設定でボットの投稿を許可するか、別のチャンネルを選択してください",
  },

  // レート制限
  rate_limited: {
    message: "Slack APIのレート制限に達しました",
    action: "しばらく待ってから再試行してください",
  },
  ratelimited: {
    message: "Slack APIのレート制限に達しました",
    action: "しばらく待ってから再試行してください",
  },

  // メッセージ関連エラー
  msg_too_long: {
    message: "メッセージが長すぎます",
    action: "通知内容を短くしてください",
  },

  // ネットワーク・サーバーエラー
  request_timeout: {
    message: "Slack APIへのリクエストがタイムアウトしました",
    action: "しばらく待ってから再試行してください",
  },
  service_unavailable: {
    message: "Slackサービスが一時的に利用できません",
    action: "しばらく待ってから再試行してください",
  },
};

/**
 * Slack APIエラーコードからユーザー向けメッセージを取得
 */
export const getSlackErrorInfo = (
  errorCode: string,
): { message: string; action: string } => {
  return (
    SLACK_ERROR_MESSAGES[errorCode] ?? {
      message: `Slackエラー: ${errorCode}`,
      action: "エラーが続く場合は、設定画面でSlack連携を確認してください",
    }
  );
};

/**
 * Slack API エラークラス
 */
export class SlackApiError extends Error {
  /** Slack APIエラーコード */
  readonly code: string;
  /** ユーザー向けメッセージ */
  readonly userMessage: string;
  /** ユーザーが取るべきアクション */
  readonly userAction: string;

  constructor(code: string, originalMessage?: string) {
    const errorInfo = getSlackErrorInfo(code);
    super(originalMessage ?? errorInfo.message);
    this.name = "SlackApiError";
    this.code = code;
    this.userMessage = errorInfo.message;
    this.userAction = errorInfo.action;
  }
}

/**
 * エラーがSlack APIエラーかどうかを判定
 */
export const isSlackApiError = (error: unknown): error is SlackApiError => {
  return error instanceof SlackApiError;
};

/**
 * エラーメッセージからSlackエラーコードを抽出
 */
export const extractSlackErrorCode = (
  error: Error,
): { code: string; isSlackError: boolean } => {
  const match = /Slack API error: (\S+)/.exec(error.message);
  if (match?.[1]) {
    return { code: match[1], isSlackError: true };
  }
  return { code: "unknown", isSlackError: false };
};
