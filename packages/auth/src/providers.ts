import type { Provider } from "next-auth/providers";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

export const providers: Provider[] = [
  GoogleProvider({
    allowDangerousEmailAccountLinking: true,
  }),
  GitHubProvider({
    allowDangerousEmailAccountLinking: true,
  }),
];
