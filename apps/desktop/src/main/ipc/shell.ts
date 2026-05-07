import { ipcMain, shell } from "electron";

/** 外部URLを安全に開くIPC（renderer から window.open 直接呼び出しを避ける） */
export const setupShellIpc = (): void => {
  ipcMain.handle("shell:openExternal", async (_event, url: unknown) => {
    if (typeof url !== "string") {
      throw new Error("URLは文字列で指定してください");
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("無効なURLです");
    }
    // http/https のみ許可（file://やjavascript: 等の悪意あるスキーム遮断）
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("http または https のURLのみ開けます");
    }
    await shell.openExternal(url);
  });
};
