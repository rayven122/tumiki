"use client";

import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ServerList } from "./ServerList";

type AddServerPageClientProps = {
  orgSlug: string;
};

const ServerListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-64 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
};

export const AddServerPageClient = ({ orgSlug }: AddServerPageClientProps) => {
  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6 flex items-center">
        <Link href={`/${orgSlug}/mcps`} className="mr-4">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">MCPサーバーの追加</h1>
      </header>

      <Suspense fallback={<ServerListSkeleton />}>
        <ServerList orgSlug={orgSlug} />
      </Suspense>
    </div>
  );
};
