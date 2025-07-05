import type React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { ServerList } from "./ServerList";

export default function AddServerPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6 flex items-center">
        <Link href="/mcp/servers" className="mr-4">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">MCPサーバーの追加</h1>
      </header>

      <ServerList />
    </div>
  );
}
