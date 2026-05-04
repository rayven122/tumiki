import { getProfileState } from "./profile-store";

/**
 * プロファイルモードに応じてデータソースを切り替える汎用ディスパッチャー。
 * 組織利用モードでは organization ハンドラー、それ以外では personal ハンドラーを実行する。
 */
export const resolveByProfile = async <T>(handlers: {
  personal: () => Promise<T>;
  organization: () => Promise<T>;
}): Promise<T> => {
  const { activeProfile } = await getProfileState();
  if (activeProfile === "organization") {
    return handlers.organization();
  }
  return handlers.personal();
};
