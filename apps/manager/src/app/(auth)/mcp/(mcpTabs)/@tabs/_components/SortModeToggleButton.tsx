"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpDown, X } from "lucide-react";

type SortModeToggleButtonProps = {
  isSortMode: boolean;
  onToggle: () => void;
};

export const SortModeToggleButton = ({
  isSortMode,
  onToggle,
}: SortModeToggleButtonProps) => (
  <Button
    variant={isSortMode ? "destructive" : "outline"}
    size="sm"
    onClick={onToggle}
    className="mr-2"
  >
    {isSortMode ? (
      <>
        <X className="mr-2 h-4 w-4" />
        並び替え終了
      </>
    ) : (
      <>
        <ArrowUpDown className="mr-2 h-4 w-4" />
        並び替え
      </>
    )}
  </Button>
);
