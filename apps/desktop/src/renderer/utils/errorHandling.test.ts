import { describe, expect, test } from "vitest";
import { formatElectronIpcErrorMessage } from "./errorHandling";

describe("formatElectronIpcErrorMessage", () => {
  test("Electron IPCのエラープレフィックスを除去する", () => {
    const error = new Error(
      "Error invoking remote method 'desktopSession:get': Error: 管理サーバーへの再ログインが必要です",
    );

    expect(
      formatElectronIpcErrorMessage(
        error,
        "Desktopセッションの取得に失敗しました",
      ),
    ).toStrictEqual("管理サーバーへの再ログインが必要です");
  });

  test("プレフィックスがないErrorはメッセージをそのまま返す", () => {
    expect(
      formatElectronIpcErrorMessage(
        new Error("管理サーバーからの応答フォーマットが不正です"),
        "Desktopセッションの取得に失敗しました",
      ),
    ).toStrictEqual("管理サーバーからの応答フォーマットが不正です");
  });

  test("Error以外のIPCエラー種別でもプレフィックスを除去する", () => {
    expect(
      formatElectronIpcErrorMessage(
        new Error(
          "Error invoking remote method 'auth:login': TypeError: 認証開始に失敗しました",
        ),
        "Desktopセッションの取得に失敗しました",
      ),
    ).toStrictEqual("認証開始に失敗しました");
  });

  test("文字列のElectron IPCエラープレフィックスを除去する", () => {
    expect(
      formatElectronIpcErrorMessage(
        "Error invoking remote method 'auth:login': Error: 認証開始に失敗しました",
        "Desktopセッションの取得に失敗しました",
      ),
    ).toStrictEqual("認証開始に失敗しました");
  });

  test("Errorでも文字列でもない値はフォールバックメッセージを返す", () => {
    expect(
      formatElectronIpcErrorMessage(
        { message: "unexpected" },
        "Desktopセッションの取得に失敗しました",
      ),
    ).toStrictEqual("Desktopセッションの取得に失敗しました");
  });
});
