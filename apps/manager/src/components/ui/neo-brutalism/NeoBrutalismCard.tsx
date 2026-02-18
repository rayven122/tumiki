import { type ReactNode } from "react";
import { clsx } from "clsx";

type NeoBrutalismCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
};

/**
 * NeoBrutalismスタイルのカードコンポーネント
 * 太い枠線、ハードシャドウ、角なしのデザイン
 */
export const NeoBrutalismCard = ({
  children,
  className,
  hover = true,
}: NeoBrutalismCardProps) => {
  return (
    <div
      className={clsx(
        "relative border-2 border-black bg-white shadow-(--shadow-hard) transition-all duration-300",
        hover && "hover:shadow-[6px_6px_0px_0px_#000000]",
        className,
      )}
    >
      {children}
    </div>
  );
};
