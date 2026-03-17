import type { Metadata } from "next";
import "./globals.css";

import { ClientProvider } from "./_components/ClientProvider";

export const metadata: Metadata = {
  title: "Tumiki Registry",
  description: "Tumiki Registry App",
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <html lang="ja">
      <body>
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
