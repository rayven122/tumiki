import type { UIMessage } from "ai";
import { useCopyToClipboard } from "usehooks-ts";

import { CopyIcon } from "./icons";
import { Button } from "@tumiki/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@tumiki/ui/tooltip";
import { memo } from "react";
import { toast } from "sonner";

export function PureMessageActions({
  message,
  isLoading,
}: {
  chatId: string;
  message: UIMessage;
  isLoading: boolean;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();

  if (isLoading) return null;
  if (message.role === "user") return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="text-muted-foreground h-fit px-2 py-1"
              variant="outline"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter(
                    (part): part is { type: "text"; text: string } =>
                      part.type === "text",
                  )
                  .map((part) => part.text)
                  .join("\n")
                  .trim();

                if (!textFromParts) {
                  toast.error("コピーするテキストがありません");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success("クリップボードにコピーしました");
              }}
            >
              <CopyIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>コピー</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);
