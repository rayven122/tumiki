import { useEffect, useRef, type MutableRefObject } from "react";

/**
 * 値を常に最新の状態で ref に保持するフック
 *
 * useChat のコールバック内など、クロージャが古い値をキャプチャする問題を解決する。
 */
export const useLatestRef = <T>(value: T): MutableRefObject<T> => {
  const ref = useRef(value);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref;
};
