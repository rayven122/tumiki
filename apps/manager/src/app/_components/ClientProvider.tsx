"use client";

import { Toaster } from "sonner";
import { ToastContainer } from "react-toastify";
import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";

export const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <TRPCReactProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ToastContainer />
        <Toaster position="top-center" /> {/* For chat */}
        <SessionProvider>{children}</SessionProvider>
      </ThemeProvider>
    </TRPCReactProvider>
  );
};
