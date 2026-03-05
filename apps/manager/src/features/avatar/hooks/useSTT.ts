"use client";

/**
 * Speech-to-Text (STT) フック
 * Web Speech API を使用したリアルタイム音声認識
 * 受付・サポートセンター用に低レイテンシーを重視
 */

import { useState, useCallback, useRef, useEffect } from "react";

type UseSTTOptions = {
  /** 認識言語（デフォルト: ja-JP） */
  lang?: string;
  /** 連続認識モード（デフォルト: true） */
  continuous?: boolean;
  /** 中間結果を返すか（デフォルト: true） */
  interimResults?: boolean;
  /** 無音検出後に自動送信するまでの時間(ms)（デフォルト: 1500） */
  silenceTimeout?: number;
  /** 認識結果の確定時コールバック */
  onResult?: (transcript: string) => void;
  /** 無音タイムアウト時のコールバック */
  onSilenceTimeout?: (transcript: string) => void;
};

type UseSTTReturn = {
  /** 認識中かどうか */
  isListening: boolean;
  /** 現在の認識テキスト（中間結果含む） */
  transcript: string;
  /** 確定済みテキスト */
  finalTranscript: string;
  /** ブラウザがSTTをサポートしているか */
  isSupported: boolean;
  /** エラーメッセージ */
  error: string | null;
  /** 認識開始 */
  startListening: () => void;
  /** 認識停止 */
  stopListening: () => void;
  /** トランスクリプトをリセット */
  resetTranscript: () => void;
};

/**
 * Web Speech API を使用した音声認識フック
 */
export const useSTT = (options: UseSTTOptions = {}): UseSTTReturn => {
  const {
    lang = "ja-JP",
    continuous = true,
    interimResults = true,
    silenceTimeout = 1500,
    onResult,
    onSilenceTimeout,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  const onSilenceTimeoutRef = useRef(onSilenceTimeout);
  const accumulatedTranscriptRef = useRef("");

  // コールバックを ref で保持（stale closure 防止）
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onSilenceTimeoutRef.current = onSilenceTimeout;
  }, [onSilenceTimeout]);

  // ブラウザサポートチェック
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // 無音タイマーをリセット
  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }

    silenceTimerRef.current = setTimeout(() => {
      const accumulated = accumulatedTranscriptRef.current.trim();
      if (accumulated) {
        onSilenceTimeoutRef.current?.(accumulated);
        accumulatedTranscriptRef.current = "";
        setFinalTranscript("");
        setTranscript("");
      }
    }, silenceTimeout);
  }, [silenceTimeout]);

  // 認識開始
  const startListening = useCallback(() => {
    if (!isSupported) {
      setError("このブラウザは音声認識をサポートしていません");
      return;
    }

    setError(null);

    // 既存のインスタンスがあれば停止
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();

    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result?.[0]) continue;

        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        accumulatedTranscriptRef.current += final;
        setFinalTranscript(accumulatedTranscriptRef.current);
        onResultRef.current?.(final);
      }

      // 中間結果 + 確定済みテキストを表示
      setTranscript(accumulatedTranscriptRef.current + interim);

      // 無音タイマーをリセット
      resetSilenceTimer();
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // no-speech は通常動作なのでエラー表示しない
      if (event.error === "no-speech") return;

      // aborted は意図的な停止
      if (event.error === "aborted") return;

      setError(`音声認識エラー: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      // continuous モードで意図的に停止していない場合は再起動
      if (recognitionRef.current === recognition && isListening) {
        try {
          recognition.start();
        } catch {
          // 再起動に失敗した場合は停止
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setError("音声認識の開始に失敗しました");
    }
  }, [isSupported, lang, continuous, interimResults, isListening, resetSilenceTimer]);

  // 認識停止
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      recognition.abort();
    }

    setIsListening(false);
  }, []);

  // トランスクリプトをリセット
  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = "";
    setTranscript("");
    setFinalTranscript("");
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    finalTranscript,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
