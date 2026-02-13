"use client";

/**
 * Coharu トグルボタンコンポーネント
 * VRM アバター表示のオン/オフ切り替え
 */

import { useCoharuContext } from "@/features/avatar/hooks/useCoharuContext";
import { Button } from "@/components/ui/chat/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/chat/tooltip";

type CoharuToggleProps = {
  className?: string;
};

export const CoharuToggle = ({ className }: CoharuToggleProps) => {
  const { isEnabled, setIsEnabled } = useCoharuContext();

  const handleToggle = () => {
    setIsEnabled(!isEnabled);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          className={className}
          aria-label={isEnabled ? "coharu を非表示" : "coharu を表示"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            {isEnabled ? (
              // VRM アイコン（有効時）
              <>
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
              </>
            ) : (
              // VRM アイコン（無効時 - 斜線付き）
              <>
                <circle cx="12" cy="8" r="5" />
                <path d="M20 21a8 8 0 0 0-16 0" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </>
            )}
          </svg>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isEnabled ? "coharu を非表示にする" : "coharu を表示する"}
      </TooltipContent>
    </Tooltip>
  );
};
