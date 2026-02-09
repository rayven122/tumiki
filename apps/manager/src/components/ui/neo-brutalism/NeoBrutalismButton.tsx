import { type ReactNode } from "react";
import { clsx } from "clsx";

type NeoBrutalismButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  color?: "indigo" | "purple" | "gray";
  disabled?: boolean;
  className?: string;
};

const colorMap = {
  indigo: {
    bg: "bg-indigo-600",
    hoverBg: "hover:bg-indigo-700",
    text: "text-white",
  },
  purple: {
    bg: "bg-purple-600",
    hoverBg: "hover:bg-purple-700",
    text: "text-white",
  },
  gray: {
    bg: "bg-gray-100",
    hoverBg: "hover:bg-gray-200",
    text: "text-gray-800",
  },
};

/**
 * NeoBrutalismスタイルのボタンコンポーネント
 * 太い枠線、ハードシャドウ、ホバー時のシャドウ縮小アニメーション
 */
export const NeoBrutalismButton = ({
  children,
  onClick,
  variant: _variant = "primary",
  color = "indigo",
  disabled = false,
  className,
}: NeoBrutalismButtonProps) => {
  const colors = colorMap[color];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "relative flex w-full items-center justify-center border-2 border-black px-6 py-3 font-bold shadow-(--shadow-hard-sm) transition-all duration-200",
        !disabled && [
          colors.bg,
          colors.hoverBg,
          colors.text,
          "hover:translate-x-px hover:translate-y-px hover:shadow-none",
        ],
        disabled && "pointer-events-none bg-gray-100 text-gray-400 opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
};
