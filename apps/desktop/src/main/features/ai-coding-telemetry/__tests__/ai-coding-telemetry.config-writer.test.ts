import { describe, test, expect, vi, beforeEach } from "vitest";

// node:fs/promises のモック
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockRename = vi.fn().mockResolvedValue(undefined);
const mockRm = vi.fn().mockResolvedValue(undefined);
const mockExistsSync = vi.fn().mockReturnValue(true);

vi.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  promises: {
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    rename: (...args: unknown[]) => mockRename(...args),
    rm: (...args: unknown[]) => mockRm(...args),
  },
}));

vi.mock("electron", () => ({
  app: {
    isPackaged: false,
    getAppPath: () => "/app",
    getPath: (name: string) => `/user-data/${name}`,
  },
}));

const mockEnsureNodeShim = vi.fn();

vi.mock("../../../runtime/path-resolver", () => ({
  ensureNodeShim: () => mockEnsureNodeShim(),
  resolveValue: (value: string) =>
    value === "${runtime:node}"
      ? "/user-data/userData/runtime/bin/node"
      : value,
}));

vi.mock("../../../shared/utils/logger", () => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}));

// smol-toml のモック
const mockParseToml = vi.fn();
const mockStringifyToml = vi
  .fn()
  .mockReturnValue("[telemetry]\notel_exporter_otlp_endpoint = ...");

vi.mock("smol-toml", () => ({
  parse: (...args: unknown[]) => mockParseToml(...args),
  stringify: (...args: unknown[]) => mockStringifyToml(...args),
}));

import { applyOtlpToTool } from "../ai-coding-telemetry.config-writer";

beforeEach(() => {
  vi.clearAllMocks();
  mockMkdir.mockResolvedValue(undefined);
  mockWriteFile.mockResolvedValue(undefined);
  mockRename.mockResolvedValue(undefined);
  mockRm.mockResolvedValue(undefined);
  mockExistsSync.mockReturnValue(true);
  mockEnsureNodeShim.mockClear();
  mockReadFile.mockRejectedValue(new Error("ENOENT"));
  mockStringifyToml.mockReturnValue(
    "[telemetry]\notel_exporter_otlp_endpoint = ...",
  );
});

describe("applyOtlpToTool - claude-code", () => {
  test("設定ファイルが存在しない場合は新規作成する", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    const result = await applyOtlpToTool("claude-code", 4318);

    expect(result.success).toStrictEqual(true);
    expect(result.configPath).toContain("settings.json");
    expect(mockWriteFile).toHaveBeenCalledTimes(2);
    const [[, content], [, mcpContent]] = mockWriteFile.mock.calls as [
      [string, string],
      [string, string],
    ];
    const written = JSON.parse(content) as Record<string, unknown>;
    expect(written).toStrictEqual(
      expect.objectContaining({
        env: {
          CLAUDE_CODE_ENABLE_TELEMETRY: "1",
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://127.0.0.1:4318",
        },
      }),
    );
    const mcpWritten = JSON.parse(mcpContent) as Record<string, unknown>;
    expect(
      (mcpWritten.mcpServers as Record<string, unknown>)["tumiki-analytics"],
    ).toStrictEqual(
      expect.objectContaining({
        command: "/user-data/userData/runtime/bin/node",
        args: expect.arrayContaining(["--analytics"]),
      }),
    );
    expect(
      (
        (mcpWritten.mcpServers as Record<string, unknown>)[
          "tumiki-analytics"
        ] as { args: string[] }
      ).args[0],
    ).toStrictEqual("/app/dist-electron/main/analytics-node.cjs");
    expect(
      (
        (mcpWritten.mcpServers as Record<string, unknown>)[
          "tumiki-analytics"
        ] as { env?: Record<string, string> }
      ).env,
    ).toBeUndefined();
    expect(mockEnsureNodeShim).toHaveBeenCalled();
  });

  test("既存設定ファイルとマージする", async () => {
    mockReadFile.mockResolvedValue(
      JSON.stringify({ theme: "dark", env: { EXISTING_KEY: "value" } }),
    );

    const result = await applyOtlpToTool("claude-code", 4319);

    expect(result.success).toStrictEqual(true);
    const [[, content], [, mcpContent]] = mockWriteFile.mock.calls as [
      [string, string],
      [string, string],
    ];
    const written = JSON.parse(content) as Record<string, unknown>;
    // 既存キーが保持されている
    expect((written as { theme?: string }).theme).toStrictEqual("dark");
    // 既存 env もマージされている
    expect((written.env as Record<string, string>).EXISTING_KEY).toStrictEqual(
      "value",
    );
    // OTLP 設定が追加されている
    expect(
      (written.env as Record<string, string>).CLAUDE_CODE_ENABLE_TELEMETRY,
    ).toStrictEqual("1");
    expect(
      (written.env as Record<string, string>).OTEL_EXPORTER_OTLP_ENDPOINT,
    ).toStrictEqual("http://127.0.0.1:4319");
    const mcpWritten = JSON.parse(mcpContent) as Record<string, unknown>;
    expect(mcpWritten.mcpServers).toHaveProperty("tumiki-analytics");
  });

  test("既存の env が配列の場合は上書きされる", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ env: ["invalid"] }));

    const result = await applyOtlpToTool("claude-code", 4318);

    expect(result.success).toStrictEqual(true);
    const [[, content]] = mockWriteFile.mock.calls as [[string, string]];
    const written = JSON.parse(content) as Record<string, unknown>;
    // 配列は無視されて env オブジェクトが作成される
    expect(written.env).toStrictEqual(
      expect.objectContaining({ CLAUDE_CODE_ENABLE_TELEMETRY: "1" }),
    );
  });

  test("アトミック書き込みを使用する（tmp ファイル → rename）", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));

    await applyOtlpToTool("claude-code", 4318);

    // writeFile は .tmp. を含むパスに書き込む
    const [[tmpPath]] = mockWriteFile.mock.calls as [[string, string]];
    expect(tmpPath).toContain(".tmp.");
    // rename でファイルを確定させる
    expect(mockRename).toHaveBeenCalledTimes(2);
    const [[src, dest]] = mockRename.mock.calls as [[string, string]];
    expect(src).toStrictEqual(tmpPath);
    expect(dest).toContain("settings.json");
    expect(dest).not.toContain(".tmp.");
  });

  test("rename 失敗時は tmp ファイルを削除して error を返す", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockRename.mockRejectedValue(new Error("EPERM"));

    const result = await applyOtlpToTool("claude-code", 4318);

    expect(result.success).toStrictEqual(false);
    expect(result.errorCode).toStrictEqual("WRITE_FAILED");
    // tmp ファイルが削除される
    expect(mockRm).toHaveBeenCalledOnce();
  });

  test("JSON パース失敗の場合は既存ファイルを上書きしない", async () => {
    mockReadFile.mockResolvedValue("invalid json {{{");

    const result = await applyOtlpToTool("claude-code", 4318);

    expect(result.success).toStrictEqual(false);
    expect(result.errorCode).toStrictEqual("PARSE_FAILED");
    expect(mockWriteFile).not.toHaveBeenCalled();
  });
});

describe("applyOtlpToTool - codex", () => {
  test("設定ファイルが存在しない場合は新規作成する", async () => {
    mockReadFile.mockRejectedValue(new Error("ENOENT"));
    mockParseToml.mockReturnValue({});
    mockStringifyToml.mockReturnValue("[otel]\ntrace_exporter = ...\n");

    const result = await applyOtlpToTool("codex", 4318);

    expect(result.success).toStrictEqual(true);
    expect(result.configPath).toContain("config.toml");
    expect(mockStringifyToml).toHaveBeenCalledOnce();
    const [[tomlArg]] = mockStringifyToml.mock.calls as [
      [Record<string, unknown>],
    ];
    const otel = tomlArg.otel as Record<string, unknown>;
    expect(otel.log_user_prompt).toStrictEqual(false);
    expect(
      (otel.exporter as Record<string, Record<string, string>>)["otlp-http"],
    ).toStrictEqual({
      endpoint: "http://127.0.0.1:4318/v1/logs",
      protocol: "json",
    });
    expect(
      (otel.trace_exporter as Record<string, Record<string, string>>)[
        "otlp-http"
      ],
    ).toStrictEqual({
      endpoint: "http://127.0.0.1:4318/v1/traces",
      protocol: "json",
    });
    expect(
      (otel.metrics_exporter as Record<string, Record<string, string>>)[
        "otlp-http"
      ],
    ).toStrictEqual({
      endpoint: "http://127.0.0.1:4318/v1/metrics",
      protocol: "json",
    });
    expect(
      (tomlArg.mcp_servers as Record<string, unknown>)["tumiki-analytics"],
    ).toStrictEqual(
      expect.objectContaining({
        command: "/user-data/userData/runtime/bin/node",
        args: expect.arrayContaining(["--analytics"]),
      }),
    );
  });

  test("既存設定とマージする", async () => {
    mockReadFile.mockResolvedValue("[otel]\nenvironment = 'prod'\n");
    mockParseToml.mockReturnValue({
      otel: {
        environment: "prod",
        trace_exporter: {
          "otlp-http": {
            headers: { "x-existing": "1" },
          },
        },
      },
    });
    mockStringifyToml.mockReturnValue("[otel]\ntrace_exporter = ...\n");

    const result = await applyOtlpToTool("codex", 4320);

    expect(result.success).toStrictEqual(true);
    const [[tomlArg]] = mockStringifyToml.mock.calls as [
      [Record<string, unknown>],
    ];
    const otel = tomlArg.otel as Record<string, unknown>;
    expect(otel.environment).toStrictEqual("prod");
    expect(
      (otel.trace_exporter as Record<string, Record<string, unknown>>)[
        "otlp-http"
      ],
    ).toStrictEqual({
      headers: { "x-existing": "1" },
      endpoint: "http://127.0.0.1:4320/v1/traces",
      protocol: "json",
    });
    expect(tomlArg.mcp_servers).toHaveProperty("tumiki-analytics");
  });

  test("既存 otel が配列の場合はマージ対象にしない", async () => {
    mockReadFile.mockResolvedValue("otel = ['invalid']");
    mockParseToml.mockReturnValue({ otel: ["invalid"] });
    mockStringifyToml.mockReturnValue("[otel]\ntrace_exporter = ...\n");

    const result = await applyOtlpToTool("codex", 4321);

    expect(result.success).toStrictEqual(true);
    const [[tomlArg]] = mockStringifyToml.mock.calls as [
      [Record<string, unknown>],
    ];
    const otel = tomlArg.otel as Record<string, unknown>;
    expect(otel.log_user_prompt).toStrictEqual(false);
    const traceOtlpHttp = (
      otel.trace_exporter as Record<string, Record<string, string>>
    )["otlp-http"];
    expect(traceOtlpHttp?.endpoint).toStrictEqual(
      "http://127.0.0.1:4321/v1/traces",
    );
  });

  test("TOML パース失敗時は既存ファイルを上書きしない", async () => {
    mockReadFile.mockResolvedValue("invalid toml ===");
    mockParseToml.mockImplementation(() => {
      throw new Error("parse error");
    });

    const result = await applyOtlpToTool("codex", 4318);

    expect(result.success).toStrictEqual(false);
    expect(result.errorCode).toStrictEqual("PARSE_FAILED");
    expect(mockStringifyToml).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test("TOML パース結果がオブジェクトでない場合は既存ファイルを上書きしない", async () => {
    mockReadFile.mockResolvedValue("invalid = true");
    mockParseToml.mockReturnValue(null);

    const result = await applyOtlpToTool("codex", 4318);

    expect(result.success).toStrictEqual(false);
    expect(result.errorCode).toStrictEqual("PARSE_FAILED");
    expect(mockStringifyToml).not.toHaveBeenCalled();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test("mkdir 失敗時は success: false を返す", async () => {
    mockMkdir.mockRejectedValue(new Error("EACCES"));

    const result = await applyOtlpToTool("codex", 4318);

    expect(result.success).toStrictEqual(false);
    expect(result.errorCode).toStrictEqual("WRITE_FAILED");
  });
});

describe("applyOtlpToTool - 未対応ツール", () => {
  test("不正なポート番号は INVALID_PORT を返す", async () => {
    const result = await applyOtlpToTool("claude-code", 0);

    expect(result.success).toStrictEqual(false);
    expect(result.errorCode).toStrictEqual("INVALID_PORT");
    expect(result.configPath).toBeNull();
    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test("未対応のツール名は UNSUPPORTED_PLATFORM を返す", async () => {
    // @ts-expect-error テスト用に不正な値を渡す
    const result = await applyOtlpToTool("unknown-tool", 4318);

    expect(result.success).toStrictEqual(false);
    expect(result.errorCode).toStrictEqual("UNSUPPORTED_PLATFORM");
    expect(result.configPath).toBeNull();
  });
});
