/**
 * Web Speech API 型拡張
 * webkit プレフィックス付きの SpeechRecognition をサポート
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */
declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export {};
