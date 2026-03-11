import type { ElectronAPI } from "../../preload";

// グローバル型拡張にはinterfaceが必要（declaration mergingのため、typeでは不可）
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
