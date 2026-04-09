export type { AuthToken } from "@prisma/desktop-client";

/**
 * auth:getToken の返却型
 */
export type AuthTokenResult = {
  accessToken: string;
};
