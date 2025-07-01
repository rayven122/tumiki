import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { GoogleTagManager } from "@next/third-parties/google";
import "../styles/globals.css";

import { ClientProvider } from "./_components/ClientProvider";

export const metadata: Metadata = {
  title: "Tumiki",
  description: "Tumiki MCP Server Manager",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
