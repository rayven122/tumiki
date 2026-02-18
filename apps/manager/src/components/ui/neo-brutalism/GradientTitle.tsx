import { type ReactNode } from "react";
import { clsx } from "clsx";

type GradientTitleProps = {
  children: ReactNode;
  as?: "h1" | "h2" | "h3";
  from?: string;
  to?: string;
  className?: string;
};

/**
 * グラデーション効果付きタイトルコンポーネント
 * テキストにグラデーションを適用
 */
export const GradientTitle = ({
  children,
  as: Component = "h1",
  from = "from-indigo-600",
  to = "to-purple-600",
  className,
}: GradientTitleProps) => {
  return (
    <Component
      className={clsx(
        "bg-linear-to-r bg-clip-text font-extrabold tracking-tight text-transparent",
        from,
        to,
        className,
      )}
    >
      {children}
    </Component>
  );
};
