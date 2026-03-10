/**
 * 有効期限計算の共通ヘルパー関数
 * サーバーサイドとクライアントサイドの両方で使用可能
 */

/**
 * 有効期限の状態
 */
export type ExpirationStatus = {
  isExpired: boolean;
  daysRemaining: number | null;
};

/**
 * 有効期限から残り日数を計算する
 *
 * @param expiresAt - 有効期限
 * @param now - 現在時刻（デフォルト: new Date()）
 * @returns 有効期限の状態
 */
export const calculateExpirationStatus = (
  expiresAt: Date | null,
  now: Date = new Date(),
): ExpirationStatus => {
  if (!expiresAt) {
    return {
      isExpired: true,
      daysRemaining: null,
    };
  }

  const isExpired = expiresAt < now;
  const daysRemaining = !isExpired
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return {
    isExpired,
    daysRemaining,
  };
};

/**
 * 残り日数に応じた色のクラス名を返す（テキスト色用）
 * クライアントサイド専用
 *
 * @param isExpired - 期限切れかどうか
 * @param daysRemaining - 残り日数
 * @returns Tailwind CSSの色クラス名
 */
export const getExpirationColorClass = (
  isExpired: boolean,
  daysRemaining: number | null,
): string => {
  if (isExpired) {
    return "text-red-600";
  }

  if (daysRemaining === null) {
    return "text-gray-600";
  }

  if (daysRemaining <= 3) {
    return "text-red-600";
  }

  if (daysRemaining <= 7) {
    return "text-orange-600";
  }

  if (daysRemaining <= 29) {
    return "text-yellow-600";
  }

  return "text-green-600";
};

/**
 * OAuthトークンの残り日数に応じたバッジスタイルのクラス名を返す
 * クライアントサイド専用
 *
 * OAuthトークンの有効期限は通常7日間なので、それを基準に色分け:
 * - 赤: 2日以下または期限切れ（緊急）
 * - オレンジ: 3-4日（警告）
 * - 緑: 5日以上（安全）
 *
 * @param isExpired - 期限切れかどうか
 * @param daysRemaining - 残り日数
 * @returns Tailwind CSSのバッジスタイルクラス名
 */
export const getOAuthExpirationBadgeClass = (
  isExpired: boolean,
  daysRemaining: number | null,
): string => {
  if (isExpired || (daysRemaining !== null && daysRemaining <= 2)) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }

  if (daysRemaining !== null && daysRemaining <= 4) {
    return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  }

  return "bg-green-50 text-green-700 ring-1 ring-green-200";
};

/**
 * APIキーの残り日数に応じたバッジスタイルのクラス名を返す
 * クライアントサイド専用
 *
 * APIキーは長期間有効なので、より厳しい基準で色分け:
 * - 赤: 3日以下または期限切れ（緊急）
 * - オレンジ: 4-14日（警告）
 * - 緑: 15日以上（安全）
 *
 * @param isExpired - 期限切れかどうか
 * @param daysRemaining - 残り日数
 * @returns Tailwind CSSのバッジスタイルクラス名
 */
export const getApiKeyExpirationBadgeClass = (
  isExpired: boolean,
  daysRemaining: number | null,
): string => {
  if (isExpired || (daysRemaining !== null && daysRemaining <= 3)) {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }

  if (daysRemaining !== null && daysRemaining <= 14) {
    return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
  }

  return "bg-green-50 text-green-700 ring-1 ring-green-200";
};

/**
 * 有効期限の表示テキストを返す（日数のみ）
 *
 * @param isExpired - 期限切れかどうか
 * @param daysRemaining - 残り日数
 * @returns 表示テキスト
 */
export const getExpirationText = (
  isExpired: boolean,
  daysRemaining: number | null,
): string => {
  if (isExpired) {
    return "期限切れ";
  }

  if (daysRemaining !== null) {
    return `残り${daysRemaining}日`;
  }

  return "期限なし";
};

/**
 * 有効期限の詳細な表示テキストを返す（短縮形: d/h/m）
 *
 * @param expiresAt - 有効期限
 * @param now - 現在時刻（デフォルト: new Date()）
 * @returns 詳細な表示テキスト（短縮形）
 */
export const getDetailedExpirationText = (
  expiresAt: Date | null,
  now: Date = new Date(),
): string => {
  if (!expiresAt) {
    return "期限なし";
  }

  const isExpired = expiresAt < now;
  if (isExpired) {
    return "期限切れ";
  }

  const diff = expiresAt.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  // 1日以上の場合
  if (days > 0) {
    if (hours > 0) {
      return `残り${days}d ${hours}h`;
    }
    return `残り${days}d`;
  }

  // 1日未満の場合
  if (hours > 0) {
    if (minutes > 0) {
      return `残り${hours}h ${minutes}m`;
    }
    return `残り${hours}h`;
  }

  // 1時間未満の場合
  return `残り${minutes}m`;
};
