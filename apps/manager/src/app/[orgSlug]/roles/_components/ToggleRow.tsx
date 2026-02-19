"use client";

import { Switch } from "@tumiki/ui/switch";
import { cn } from "@/lib/utils";

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  colorClass: string;
};

export const ToggleRow = ({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
  colorClass,
}: ToggleRowProps) => (
  <div className="flex items-center justify-between gap-2 py-2">
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          checked ? colorClass : "bg-muted-foreground/30",
        )}
      />
      <div className="min-w-0">
        <span className="text-sm font-medium">{label}</span>
        <p className="text-muted-foreground truncate text-xs">{description}</p>
      </div>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    />
  </div>
);
