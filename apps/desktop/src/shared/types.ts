import type { ElectronAPI } from "../preload";

// グローバルなWindow型を拡張
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
