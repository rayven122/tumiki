/**
 * Keycloak Admin API クライアント
 * ユーザー登録など管理機能を提供
 */

/**
 * Keycloak Admin トークン取得
 */
const getAdminToken = async (): Promise<string> => {
  const keycloakBaseUrl =
    process.env.KEYCLOAK_ISSUER?.replace(/\/realms\/.*$/, "") ??
    "http://localhost:8443";

  const adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME;
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    throw new Error(
      "KEYCLOAK_ADMIN_USERNAME and KEYCLOAK_ADMIN_PASSWORD must be set",
    );
  }

  const tokenUrl = `${keycloakBaseUrl}/realms/master/protocol/openid-connect/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: "admin-cli",
      username: adminUsername,
      password: adminPassword,
      grant_type: "password",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get admin token: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
};

/**
 * Keycloakユーザー作成レスポンス型
 */
type CreateKeycloakUserResponse = {
  success: boolean;
  userId?: string;
  error?: string;
};

/**
 * Keycloakにユーザーを作成
 */
export const createKeycloakUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<CreateKeycloakUserResponse> => {
  try {
    const token = await getAdminToken();
    const keycloakBaseUrl =
      process.env.KEYCLOAK_ISSUER?.replace(/\/realms\/.*$/, "") ??
      "http://localhost:8443";

    // 1. ユーザー作成
    const createUserResponse = await fetch(
      `${keycloakBaseUrl}/admin/realms/tumiki/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: email,
          email,
          firstName,
          lastName,
          enabled: true,
          emailVerified: true,
        }),
      },
    );

    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      return {
        success: false,
        error: `Failed to create user in Keycloak: ${createUserResponse.status} ${errorText}`,
      };
    }

    // 2. Location ヘッダーからユーザーIDを取得
    const locationHeader = createUserResponse.headers.get("Location");
    if (!locationHeader) {
      return {
        success: false,
        error: "No Location header in create user response",
      };
    }

    const userId = locationHeader.split("/").pop();
    if (!userId) {
      return {
        success: false,
        error: "Could not extract user ID from Location header",
      };
    }

    // 3. パスワード設定
    const setPasswordResponse = await fetch(
      `${keycloakBaseUrl}/admin/realms/tumiki/users/${userId}/reset-password`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "password",
          value: password,
          temporary: false,
        }),
      },
    );

    if (!setPasswordResponse.ok) {
      const errorText = await setPasswordResponse.text();
      return {
        success: false,
        error: `Failed to set password: ${setPasswordResponse.status} ${errorText}`,
      };
    }

    return {
      success: true,
      userId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
