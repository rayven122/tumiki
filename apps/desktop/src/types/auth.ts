export type { AuthToken } from "../../prisma/generated/client";

/**
 * auth:getToken の返却型
 */
export type AuthTokenResult = {
  accessToken: string;
};
