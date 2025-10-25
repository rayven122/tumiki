import { contextBridge } from "electron";

// Electron APIを安全に公開
const api = {
  // 将来的にMCP関連APIなどを追加
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
  },
};

contextBridge.exposeInMainWorld("electronAPI", api);

// 型定義をエクスポート
export type ElectronAPI = typeof api;
