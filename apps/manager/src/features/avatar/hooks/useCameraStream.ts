"use client";

/**
 * カメラストリーム管理フック
 * MediaStream API を使用したカメラ映像の取得と管理
 */

import { useState, useCallback, useRef, useEffect } from "react";

type UseCameraStreamOptions = {
  /** カメラの向き（デフォルト: user = フロントカメラ） */
  facingMode?: "user" | "environment";
  /** 映像の幅（デフォルト: 640） */
  width?: number;
  /** 映像の高さ（デフォルト: 480） */
  height?: number;
};

type UseCameraStreamReturn = {
  /** カメラが起動中かどうか */
  isActive: boolean;
  /** メディアストリーム */
  stream: MediaStream | null;
  /** カメラのvideo要素にアタッチするref */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** エラーメッセージ */
  error: string | null;
  /** カメラを起動 */
  startCamera: () => Promise<void>;
  /** カメラを停止 */
  stopCamera: () => void;
  /** 現在のフレームをキャプチャ（Base64画像として返す） */
  captureFrame: () => string | null;
};

/**
 * カメラストリーム管理フック
 */
export const useCameraStream = (
  options: UseCameraStreamOptions = {},
): UseCameraStreamReturn => {
  const { facingMode = "user", width = 640, height = 480 } = options;

  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // カメラを起動
  const startCamera = useCallback(async () => {
    try {
      setError(null);

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false, // 音声はSTTフックで別途管理
      });

      setStream(mediaStream);
      setIsActive(true);

      // video要素にストリームをアタッチ
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      const message =
        err instanceof DOMException
          ? err.name === "NotAllowedError"
            ? "カメラへのアクセスが拒否されました"
            : err.name === "NotFoundError"
              ? "カメラが見つかりません"
              : `カメラエラー: ${err.message}`
          : "カメラの起動に失敗しました";

      setError(message);
      setIsActive(false);
    }
  }, [facingMode, width, height]);

  // カメラを停止
  const stopCamera = useCallback(() => {
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setIsActive(false);
  }, [stream]);

  // 現在のフレームをキャプチャ
  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !isActive) return null;

    // Canvas を遅延初期化
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, [isActive]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isActive,
    stream,
    videoRef,
    error,
    startCamera,
    stopCamera,
    captureFrame,
  };
};
