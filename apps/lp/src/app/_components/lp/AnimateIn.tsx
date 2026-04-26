import type { ReactNode } from "react";

type AnimateInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

/**
 * フェードインアニメーション（CSSベース）
 * SSR/fullPageスクリーンショットでも確実にコンテンツが見える
 */
const AnimateIn = ({ children, delay = 0, className }: AnimateInProps) => (
  <div
    className={className}
    style={{
      animation: `fade-in 0.6s ease-out ${delay}s both`,
    }}
  >
    {children}
  </div>
);

export default AnimateIn;
