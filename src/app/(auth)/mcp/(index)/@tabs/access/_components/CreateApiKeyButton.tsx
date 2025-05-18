"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateApiKeyDialog } from "./dialogs/CreateApiKeyDialog";
import { useRouter } from "next/navigation";

export function CreateApiKeyButton() {
  const [open, setIsOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        新規API Key作成
      </Button>
      {open && (
        <CreateApiKeyDialog
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
