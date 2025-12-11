import { atomWithStorage, createJSONStorage } from "jotai/utils";

/**
 * セッションストレージを使った atom を作成する
 */
export const atomWithSessionStorage = <T>(key: string, initialValue: T) => {
  const sessionStorage =
    typeof window !== "undefined"
      ? createJSONStorage<T>(() => window.sessionStorage)
      : undefined;

  return atomWithStorage<T>(key, initialValue, sessionStorage);
};
