"use client";

import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";

export const ClientProvider = ({ children }: { children: React.ReactNode }) => {
	return (
		<TRPCReactProvider>
			<SessionProvider>{children}</SessionProvider>
		</TRPCReactProvider>
	);
};
