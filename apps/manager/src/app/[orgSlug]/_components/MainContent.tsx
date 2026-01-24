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
        "h-[calc(100dvh-56px)] overflow-auto transition-all duration-300",
        "mt-14", // SimpleHeaderの高さ分のマージン
        isOpen ? "md:ml-64" : "md:ml-16",
      )}
    >
      {children}
    </main>
  );
};
