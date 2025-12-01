import { RefreshCw } from "lucide-react";

type LoadingOverlayProps = {
  isProcessing: boolean;
};

export const LoadingOverlay = ({ isProcessing }: LoadingOverlayProps) => {
  if (!isProcessing) return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-2">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-gray-700">処理中...</span>
      </div>
    </div>
  );
};
