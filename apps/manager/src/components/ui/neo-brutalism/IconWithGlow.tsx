import { type ReactNode } from "react";
import { clsx } from "clsx";

type IconWithGlowProps = {
  icon: ReactNode;
  bgColor?: string;
  iconColor?: string;
  glowFrom?: string;
  glowTo?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-12 w-12",
  md: "h-16 w-16",
  lg: "h-20 w-20",
};

const iconSizeMap = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/**
 * グロー効果付きアイコンコンテナ
 * ホバー時にパルスアニメーション付きグローを表示
 */
export const IconWithGlow = ({
  icon,
  bgColor = "bg-indigo-100",
  iconColor,
  glowFrom = "from-indigo-400",
  glowTo = "to-blue-400",
  size = "md",
  className,
}: IconWithGlowProps) => {
  return (
    <div className={clsx("flex items-center justify-center", className)}>
      <div className="relative">
        <div
          className={clsx(
            "absolute -inset-1 animate-pulse bg-linear-to-r opacity-0 blur-lg transition-opacity duration-200 group-hover:opacity-30",
            glowFrom,
            glowTo,
          )}
        ></div>
        <div
          className={clsx(
            "relative flex items-center justify-center border-2 border-black",
            bgColor,
            sizeMap[size],
          )}
        >
          <div className={clsx(iconColor, iconSizeMap[size])}>{icon}</div>
        </div>
      </div>
    </div>
  );
};
