import Image from "next/image";
import { clsx } from "clsx";

type LogoWithGlowProps = {
  size?: number;
  glowFrom?: string;
  glowTo?: string;
  className?: string;
};

/**
 * グロー効果付きロゴコンポーネント
 * パルスアニメーション付きのグラデーショングロー
 */
export const LogoWithGlow = ({
  size = 80,
  glowFrom = "from-indigo-500",
  glowTo = "to-purple-500",
  className,
}: LogoWithGlowProps) => {
  return (
    <div className={clsx("flex justify-center", className)}>
      <div className="relative">
        <div
          className={clsx(
            "absolute -inset-2 animate-pulse bg-linear-to-r opacity-20 blur-xl",
            glowFrom,
            glowTo,
          )}
        ></div>
        <Image
          src="/favicon/logo.svg"
          alt="Tumiki"
          width={size}
          height={size}
          className="relative"
          style={{ width: size, height: size }}
        />
      </div>
    </div>
  );
};
