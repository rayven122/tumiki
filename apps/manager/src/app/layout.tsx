import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import "../styles/globals.css";

import { ClientProvider } from "./_components/ClientProvider";

export const metadata: Metadata = {
  title: "Tumiki MCP Manager",
  description: "MCPサーバーの統一管理でAIエージェントチーム環境を構築",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  openGraph: {
    title: "Tumiki MCP Manager",
    description: "MCPサーバーの統一管理でAIエージェントチーム環境を構築",
    images: [
      {
        url: "/ogp.png",
        width: 1200,
        height: 630,
        alt: "Tumiki MCP Manager - 全てのSaaSを、ひとつのAIと繋ぐ",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tumiki MCP Manager",
    description: "MCPサーバーの統一管理でAIエージェントチーム環境を構築",
    images: ["/ogp.png"],
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const gtmId = process.env.NODE_ENV === "production" ? "GTM-WPZPSVXM" : "";
  return (
    <html lang="ja" className={`${geist.variable}`}>
      <body>
        <ClientProvider>
          {/* <Header /> */}
          {children}
        </ClientProvider>
      </body>
      <GoogleTagManager gtmId={gtmId} />
    </html>
  );
}
