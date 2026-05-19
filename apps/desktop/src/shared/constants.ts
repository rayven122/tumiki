export const PERSONAL_PROFILE_MANAGER_URL = "https://www.tumiki.cloud";
export const AUTH_REQUIRED_MESSAGE =
  "認証セッションがありません。再ログインしてください。";

export class AuthRequiredError extends Error {
  constructor() {
    super(AUTH_REQUIRED_MESSAGE);
    this.name = "AuthRequiredError";
  }
}
