"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { ToastContainer } from "react-toastify";
import { TRPCReactProvider } from "@/trpc/react";

import { ThemeProvider } from "@/components/theme-provider";
import { OrganizationProvider } from "@/hooks/useOrganizationContext";

export const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <TRPCReactProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          forcedTheme="light"
        >
          <ToastContainer />
          <Toaster position="top-center" /> {/* For chat */}
          <OrganizationProvider>{children}</OrganizationProvider>
        </ThemeProvider>
      </TRPCReactProvider>
    </SessionProvider>
  );
};
