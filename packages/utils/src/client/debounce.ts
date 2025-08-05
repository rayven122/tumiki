type DebounceFunc<T extends (...args: unknown[]) => unknown> = (
  ...args: Parameters<T>
) => void;

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): DebounceFunc<T> => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};
