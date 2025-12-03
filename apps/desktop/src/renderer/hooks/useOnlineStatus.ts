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
      console.log("Network status: Online");
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log("Network status: Offline");
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
