import "@/styles/globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { ClientProvider } from "./ClientProvider";
import { Header } from "./_components/Header";

export const metadata: Metadata = {
	title: "MCP Server Manager",
	description: "MCP Server Manager",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans",
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="ja" className={`${geist.variable}`}>
			<body>
				<ClientProvider>
					<Header />
					{children}
				</ClientProvider>
			</body>
		</html>
	);
}
