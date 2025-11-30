"use client";

import { useAtomValue } from "jotai";
import { sidebarOpenAtom } from "@/store/sidebar";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type MainContentProps = {
  children: ReactNode;
};

export const MainContent = ({ children }: MainContentProps) => {
  const isOpen = useAtomValue(sidebarOpenAtom);

  return (
    <main
      className={cn(
        "flex-1 overflow-auto pt-14 transition-all duration-300",
        isOpen ? "md:ml-64" : "md:ml-16",
      )}
    >
      {children}
    </main>
  );
};
