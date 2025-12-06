import { useEffect, useState } from "react";

/**
 * ネットワーク接続状態を監視するカスタムフック
 *
 * @returns オンライン状態（true: オンライン, false: オフライン）
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
};
