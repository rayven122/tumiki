"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CreateCustomServerDialog } from "./dialogs/CreateCustomServerDialog";
import { useRouter } from "next/navigation";

export function CreateCustomServerButton() {
  const [open, setIsOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        カスタムMCPサーバーを追加
      </Button>
      {open && (
        <CreateCustomServerDialog
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </>
  );
}
