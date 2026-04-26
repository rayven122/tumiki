"use client";

import { useEffect, useRef, useState } from "react";

/** マウス位置を-1〜1の範囲で返すフック */
export const useMouse = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setPos({
        x: ((e.clientX - r.left) / r.width - 0.5) * 2,
        y: ((e.clientY - r.top) / r.height - 0.5) * 2,
      });
    };
    const leave = () => setPos({ x: 0, y: 0 });
    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  return { ref, pos };
};

/** マウス追従のtranslate（animationと分離） */
export const mouseStyle = (mx: number, my: number, depth: number) => ({
  transform: `translate(${mx * depth * 14}px, ${my * depth * 10}px)`,
  transition: "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
});

/** 浮遊アニメーション（別のgに適用） */
export const floatStyle = (baseDelay: number) => ({
  animation: `pillar-float 4s ease-in-out ${baseDelay}s infinite`,
});
