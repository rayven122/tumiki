import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tumiki Registry",
  description: "Tumiki Registry App",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
