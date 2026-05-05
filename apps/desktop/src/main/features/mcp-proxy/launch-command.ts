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
  // 開発時は process.execPath が Electron バイナリを指すため、エントリースクリプトを引数先頭で渡す
  const appEntry = process.argv[1];
  return {
    command: process.execPath,
    args: appEntry ? [appEntry, "--mcp-proxy"] : ["--mcp-proxy"],
  };
};
