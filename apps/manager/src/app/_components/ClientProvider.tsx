"use client";

import { Toaster } from "sonner";
import { ToastContainer } from "react-toastify";
import { TRPCReactProvider } from "@/trpc/react";

import { ThemeProvider } from "@/components/theme-provider";
import { Auth0Provider } from "@tumiki/auth/client";

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
        <Auth0Provider>{children}</Auth0Provider>
      </ThemeProvider>
    </TRPCReactProvider>
  );
};
