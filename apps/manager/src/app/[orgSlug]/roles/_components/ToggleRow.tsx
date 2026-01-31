"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ToggleRowProps = {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  colorClass: string;
};

/**
 * 権限トグルスイッチ行
 * アクセス/管理権限の表示と切り替えに使用
 */
export const ToggleRow = ({
  label,
  description,
  checked,
  disabled,
  onCheckedChange,
  colorClass,
}: ToggleRowProps) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          checked ? colorClass : "bg-muted-foreground/30",
        )}
      />
      <div>
        <span className="text-sm font-medium">{label}</span>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
    </div>
    <Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    />
  </div>
);
