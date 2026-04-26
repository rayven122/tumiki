import { describe, test, expect, vi, beforeEach } from "vitest";
import path from "node:path";

// `electron` モジュールはテスト環境では読み込めないためモック化する。
// `app-protocol.ts` は import 時に副作用がないため、関数を呼ばなければモックの戻り値は影響しない。
vi.mock("electron", () => ({
  protocol: {
    registerSchemesAsPrivileged: vi.fn(),
    handle: vi.fn(),
  },
  net: {
    fetch: vi.fn(),
  },
}));

vi.mock("../utils/logger", () => ({
  warn: vi.fn(),
}));

const { protocol, net } = await import("electron");
const logger = await import("../utils/logger");
const {
  APP_SCHEME,
  APP_BUNDLE_HOST,
  APP_INDEX_URL,
  getRendererRoot,
  resolveSafePath,
  registerAppProtocolSchemes,
  handleAppProtocol,
} = await import("../app-protocol");

// `protocol.handle` の第2引数（リクエストハンドラ）の型
type ProtocolRequestHandler = (req: { url: string }) => Promise<Response>;

describe("定数", () => {
  test("APP_SCHEME は tumiki-bundle（deep link 用 tumiki:// と区別するため）", () => {
    expect(APP_SCHEME).toStrictEqual("tumiki-bundle");
  });

  test("APP_INDEX_URL は スキーム + ホスト + /index.html を組み立てる", () => {
    expect(APP_INDEX_URL).toStrictEqual(
      `${APP_SCHEME}://${APP_BUNDLE_HOST}/index.html`,
    );
  });
});

describe("getRendererRoot", () => {
  test("mainDir 配下の ../renderer に解決される", () => {
    // 実装の再計算（path.join(...)）ではなく、正規化済みの文字列リテラルで検証
    // することで、`../renderer` を `../../renderer` に変える等の誤りを検出可能にする
    const result = getRendererRoot("/foo/bar/dist-electron/main");
    expect(result).toStrictEqual("/foo/bar/dist-electron/renderer");
  });
});

describe("resolveSafePath", () => {
  const rendererRoot = "/app/dist-electron/renderer";

  test("正常な絶対パス（/logos/foo.svg）は rendererRoot 配下にマップされる", () => {
    const result = resolveSafePath(rendererRoot, "/logos/foo.svg");
    expect(result).toStrictEqual(path.join(rendererRoot, "logos/foo.svg"));
  });

  test("ルート（/index.html）も rendererRoot 配下にマップされる", () => {
    const result = resolveSafePath(rendererRoot, "/index.html");
    expect(result).toStrictEqual(path.join(rendererRoot, "index.html"));
  });

  test("ルート単体（/）は rendererRoot 自体に解決される", () => {
    const result = resolveSafePath(rendererRoot, "/");
    expect(result).toStrictEqual(rendererRoot);
  });

  test("../ によるパストラバーサルは null を返す", () => {
    const result = resolveSafePath(rendererRoot, "/../../../etc/passwd");
    expect(result).toBeNull();
  });

  test("中間に ../ を含むパストラバーサルも null を返す", () => {
    const result = resolveSafePath(rendererRoot, "/logos/../../../etc/passwd");
    expect(result).toBeNull();
  });

  test("パーセントエンコードされた ../ も null を返す", () => {
    // %2e%2e%2f = ../
    const result = resolveSafePath(
      rendererRoot,
      "/%2e%2e%2f%2e%2e%2fetc/passwd",
    );
    expect(result).toBeNull();
  });

  test("パーセントエンコードされた正常パスはデコードして解決される", () => {
    // %20 = space
    const result = resolveSafePath(rendererRoot, "/logos/foo%20bar.svg");
    expect(result).toStrictEqual(path.join(rendererRoot, "logos/foo bar.svg"));
  });

  test("ネストしたパスも安全に解決される", () => {
    const result = resolveSafePath(
      rendererRoot,
      "/logos/ai-clients/cursor.svg",
    );
    expect(result).toStrictEqual(
      path.join(rendererRoot, "logos/ai-clients/cursor.svg"),
    );
  });

  test("ヌルバイト（%00）を含むパスは null を返す（path.resolve の TypeError 回避）", () => {
    const result = resolveSafePath(rendererRoot, "/logos/foo%00.svg");
    expect(result).toBeNull();
  });

  test("不正なパーセントエンコード（%XX が hex でない）は null を返す", () => {
    // %ZZ は hex として無効 → decodeURIComponent が URIError をスロー
    const result = resolveSafePath(rendererRoot, "/logos/%ZZ.svg");
    expect(result).toBeNull();
  });
});

describe("registerAppProtocolSchemes", () => {
  beforeEach(() => {
    vi.mocked(protocol.registerSchemesAsPrivileged).mockClear();
  });

  test("APP_SCHEME を standard/secure 付きで privileged 登録する", () => {
    registerAppProtocolSchemes();
    expect(protocol.registerSchemesAsPrivileged).toHaveBeenCalledTimes(1);
    expect(protocol.registerSchemesAsPrivileged).toHaveBeenCalledWith([
      {
        scheme: APP_SCHEME,
        privileges: {
          standard: true,
          secure: true,
          supportFetchAPI: false,
        },
      },
    ]);
  });
});

describe("handleAppProtocol", () => {
  const rendererRoot = "/app/dist-electron/renderer";

  // protocol.handle に登録されたハンドラを取り出して直接呼び出すヘルパー
  const captureHandler = (): ProtocolRequestHandler => {
    let captured: ProtocolRequestHandler | undefined;
    vi.mocked(protocol.handle).mockImplementation((_scheme, handler) => {
      captured = handler as ProtocolRequestHandler;
    });
    handleAppProtocol(rendererRoot);
    if (!captured) {
      throw new Error("protocol.handle が呼ばれなかった");
    }
    return captured;
  };

  beforeEach(() => {
    vi.mocked(protocol.handle).mockReset();
    vi.mocked(net.fetch).mockReset();
    vi.mocked(logger.warn).mockClear();
  });

  test("APP_SCHEME に対してハンドラを登録する", () => {
    handleAppProtocol(rendererRoot);
    expect(protocol.handle).toHaveBeenCalledTimes(1);
    expect(protocol.handle).toHaveBeenCalledWith(
      APP_SCHEME,
      expect.any(Function),
    );
  });

  test("ホスト名が APP_BUNDLE_HOST 以外の場合は 404 を返す", async () => {
    const handler = captureHandler();
    const response = await handler({
      url: `${APP_SCHEME}://other-host/index.html`,
    });
    expect(response.status).toStrictEqual(404);
  });

  test("resolveSafePath が null を返す場合（ヌルバイト混入等）は 403 を返す", async () => {
    // URL 構文上の `..` は URL パーサが正規化してしまうため、
    // パーセントエンコードされたヌルバイト `%00` で resolveSafePath を null にする
    const handler = captureHandler();
    const response = await handler({
      url: `${APP_SCHEME}://${APP_BUNDLE_HOST}/logos/foo%00.svg`,
    });
    expect(response.status).toStrictEqual(403);
    // 不正アクセス時は net.fetch を呼ばない
    expect(net.fetch).not.toHaveBeenCalled();
  });

  test("正常パスは net.fetch の結果をそのまま返す", async () => {
    const okResponse = new Response("ok", { status: 200 });
    vi.mocked(net.fetch).mockResolvedValue(okResponse);

    const handler = captureHandler();
    const response = await handler({
      url: `${APP_SCHEME}://${APP_BUNDLE_HOST}/index.html`,
    });
    expect(response).toBe(okResponse);
    expect(net.fetch).toHaveBeenCalledTimes(1);
  });

  test("net.fetch が失敗した場合は 404 を返し logger.warn を呼ぶ", async () => {
    vi.mocked(net.fetch).mockRejectedValue(new Error("ENOENT"));

    const handler = captureHandler();
    const response = await handler({
      url: `${APP_SCHEME}://${APP_BUNDLE_HOST}/missing.svg`,
    });
    expect(response.status).toStrictEqual(404);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ error: "ENOENT" }),
    );
  });

  test("net.fetch が非 Error 値で reject した場合も 404 を返し String() でログ出力", async () => {
    // `error instanceof Error ? error.message : String(error)` の else ブランチをカバー
    vi.mocked(net.fetch).mockRejectedValue("string error");

    const handler = captureHandler();
    const response = await handler({
      url: `${APP_SCHEME}://${APP_BUNDLE_HOST}/missing.svg`,
    });
    expect(response.status).toStrictEqual(404);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ error: "string error" }),
    );
  });
});
