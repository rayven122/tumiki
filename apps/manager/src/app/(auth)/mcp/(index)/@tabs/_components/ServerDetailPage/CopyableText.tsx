"use client";

import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "@/utils/client/toast";

type CopyableTextProps = {
  text: string;
  displayText?: string;
  label?: string;
  variant?: "code" | "input";
  className?: string;
};

export const CopyableText = ({
  text,
  displayText,
  label,
  variant = "code",
  className,
}: CopyableTextProps) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("クリップボードにコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  if (variant === "input") {
    return (
      <div className={className}>
        {label && (
          <label className="mb-2 block text-xs text-gray-600">{label}</label>
        )}
        <div className="flex items-center gap-2">
          <div className="border-input bg-background min-w-0 flex-1 rounded-md border px-3 py-2">
            <div className="overflow-x-auto">
              <code className="font-mono text-sm whitespace-nowrap">
                {displayText ?? text}
              </code>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="mb-2 block text-xs text-gray-600">{label}</label>
      )}
      <div className="rounded-lg bg-gray-50 p-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 overflow-x-auto">
            <code className="block font-mono text-sm whitespace-nowrap text-gray-800">
              {displayText ?? text}
            </code>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
