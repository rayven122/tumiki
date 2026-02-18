import { type ReactNode } from "react";
import { clsx } from "clsx";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * グラデーション背景を持つページコンテナ
 * 全画面高さで中央配置
 */
export const PageContainer = ({ children, className }: PageContainerProps) => {
  return (
    <div
      className={clsx(
        "flex min-h-screen items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 p-4",
        className,
      )}
    >
      {children}
    </div>
  );
};
