/// <reference types="vite/client" />

// declaration mergingが必要なためinterfaceを使用（typeでは拡張不可）
interface ImportMetaEnv {
  readonly VITE_MANAGER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
