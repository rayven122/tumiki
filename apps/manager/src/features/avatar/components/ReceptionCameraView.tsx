"use client";

/**
 * 受付モード カメラビューコンポーネント
 * ユーザーのカメラ映像を表示
 */

import { useEffect } from "react";
import { Camera, CameraOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCameraStream } from "@/features/avatar/hooks/useCameraStream";

type ReceptionCameraViewProps = {
  className?: string;
};

export const ReceptionCameraView = ({
  className,
}: ReceptionCameraViewProps) => {
  const { isActive, videoRef, error, startCamera, stopCamera } =
    useCameraStream({
      facingMode: "user",
      width: 320,
      height: 240,
    });

  // マウント時にカメラを起動
  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "border border-white/30 shadow-lg backdrop-blur-md",
        "h-[180px] w-[240px]",
        className,
      )}
    >
      {isActive ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {/* カメラOFF ボタン */}
          <button
            type="button"
            onClick={stopCamera}
            className={cn(
              "absolute top-2 right-2",
              "flex h-8 w-8 items-center justify-center rounded-full",
              "bg-black/40 text-white/80 transition-colors hover:bg-black/60",
            )}
            aria-label="カメラを停止"
          >
            <CameraOff className="h-4 w-4" />
          </button>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-gray-900/80">
          {error ? (
            <p className="px-4 text-center text-xs text-red-300">{error}</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void startCamera()}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full",
                  "bg-white/20 text-white transition-colors hover:bg-white/30",
                )}
                aria-label="カメラを起動"
              >
                <Camera className="h-6 w-6" />
              </button>
              <p className="mt-2 text-xs text-white/60">カメラOFF</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};
