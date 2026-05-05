import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { ClientProvider } from "./_components/ClientProvider";
import { THEME_STORAGE_KEY, type Theme } from "~/lib/admin-theme";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tumiki — AIエージェントの通信を制御する、ゼロトラストゲートウェイ",
  description: "社内AI環境管理プラットフォーム",
};

const RootLayout = async ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  const cookieStore = await cookies();
  const initialTheme: Theme =
    cookieStore.get(THEME_STORAGE_KEY)?.value === "light" ? "light" : "dark";

  return (
    <html
      lang="ja"
      data-theme={initialTheme}
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
