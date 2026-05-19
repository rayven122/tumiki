export type { AuthToken } from "@prisma/desktop-client";

/**
 * auth:getToken の返却型
 */
export type AuthTokenResult = {
  accessToken: string;
};

export type AuthProfileResult = {
  name: string | null;
  email: string | null;
  preferredUsername: string | null;
  subject: string | null;
};
