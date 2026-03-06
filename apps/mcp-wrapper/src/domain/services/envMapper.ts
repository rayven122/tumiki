/**
 * HTTPヘッダーを環境変数に変換（純粋関数）
 *
 * envVarKeys に指定されたヘッダー名から値を取得し、
 * 同名の環境変数として返す
 *
 * @example
 * envVarKeys = ["X-DeepL-API-Key"]
 * headers = { "x-deepl-api-key": "xxx" }
 * => { "X-DeepL-API-Key": "xxx" }
 */
export const mapHeadersToEnv = (
  headers: Record<string, string | undefined>,
  envVarKeys: readonly string[],
): Record<string, string> => {
  const env: Record<string, string> = {};

  for (const key of envVarKeys) {
    // HTTPヘッダー名は小文字で正規化されている
    const value = headers[key.toLowerCase()];
    if (value) {
      // 環境変数名はenvVarKeysそのまま使用
      env[key] = value;
    }
  }

  return env;
};
