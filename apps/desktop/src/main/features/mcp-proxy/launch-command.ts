import path from "node:path";
import { app } from "electron";

export type McpProxyLaunchCommand = {
  command: string;
  args: string[];
};

// AIクライアント（Claude Desktop等）が `--mcp-proxy --server <slug>` で本アプリを起動するための実コマンドを返す。
// macOS / Windows / Linux （AppImage 含む）の packaged ビルドおよび開発時 (electron + entry script) の両方に対応する。
export const getMcpProxyLaunchCommand = (): McpProxyLaunchCommand => {
  if (app.isPackaged) {
    // Linux AppImage では process.execPath は FUSE マウント先（実行ごとに変わる）を指すため、
    // 外側の AppImage バイナリパスを示す環境変数 APPIMAGE を優先する
    const command = process.env.APPIMAGE ?? process.execPath;
    return { command, args: ["--mcp-proxy"] };
  }
  // dev時 process.argv[1] は electron-vite の起動方式によって "." 等の相対パスのことがある。
  // AIクライアントは別cwdから本コマンドを spawn するため、絶対パスへ解決して保存する。
  const rawAppEntry = process.argv[1];
  const appEntry = rawAppEntry ? path.resolve(rawAppEntry) : null;
  return {
    command: process.execPath,
    args: appEntry ? [appEntry, "--mcp-proxy"] : ["--mcp-proxy"],
  };
};
