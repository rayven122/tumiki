"use client";

import { cn } from "@/lib/utils";
import { ICON_COLOR_PALETTE, type IconColorName } from "@/lib/iconColor";

type IconColorPickerProps = {
  selectedColor: IconColorName;
  onColorSelect: (color: IconColorName) => void;
};

/**
 * アイコンカラー選択コンポーネント
 * 6色のカラーサークルをグリッド表示し、選択中をハイライト
 */
export const IconColorPicker = ({
  selectedColor,
  onColorSelect,
}: IconColorPickerProps) => {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">カラー</div>
      <div className="flex gap-2">
        {ICON_COLOR_PALETTE.map(({ name, label, bgClassName }) => {
          const isSelected = selectedColor === name;

          return (
            <button
              key={name}
              type="button"
              onClick={() => onColorSelect(name)}
              title={label}
              className={cn(
                "h-8 w-8 rounded-full transition-all",
                bgClassName,
                isSelected
                  ? "ring-2 ring-gray-400 ring-offset-2"
                  : "hover:scale-110",
              )}
              aria-label={label}
              aria-pressed={isSelected}
            />
          );
        })}
      </div>
    </div>
  );
};
