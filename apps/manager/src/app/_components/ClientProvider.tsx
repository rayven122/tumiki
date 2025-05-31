"use client";

import { ToastContainer } from "react-toastify";
import { TRPCReactProvider } from "@/trpc/react";
import { SessionProvider } from "next-auth/react";

export const ClientProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <TRPCReactProvider>
      <ToastContainer />
      <SessionProvider>{children}</SessionProvider>
    </TRPCReactProvider>
  );
};
