"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateApiKeyDialog } from "./dialogs/CreateApiKeyDialog";

export function CreateApiKeyButton() {
  const [open, setIsOpen] = useState(false);

  const handleCreateApiKey = (apiKey: {
    name: string;
    servers: string[];
    tools: string[];
  }) => {
    console.log("Created API Key:", apiKey);
    // ここでAPI Keyの作成処理を実装
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新規API Key作成
      </Button>

      <CreateApiKeyDialog
        open={open}
        onOpenChange={setIsOpen}
        onCreateApiKey={handleCreateApiKey}
      />
    </>
  );
}
