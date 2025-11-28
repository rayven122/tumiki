import { RefreshCw } from "lucide-react";

type LoadingOverlayProps = {
  isProcessing: boolean;
  isAdding: boolean;
  isValidating: boolean;
  isOAuthConnecting: boolean;
};

export const LoadingOverlay = ({
  isProcessing,
  isAdding,
  isValidating,
  isOAuthConnecting,
}: LoadingOverlayProps) => {
  if (!isProcessing) return null;

  const getLoadingText = () => {
    if (isAdding) return "サーバーを追加中...";
    if (isValidating) return "接続を検証中...";
    if (isOAuthConnecting) return "OAuth接続中...";
    return "更新中...";
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-2">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-gray-700">
          {getLoadingText()}
        </span>
      </div>
    </div>
  );
};
