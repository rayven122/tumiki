import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

vi.mock("electron", () => ({
  app: { isPackaged: false },
}));
vi.mock("../../../shared/utils/logger");
// resolve-config-path をモックして任意の一時ファイルへ書き込み先を切り替える
vi.mock("../resolve-config-path", () => ({
  resolveConfigPath: vi.fn(),
}));

import { resolveConfigPath } from "../resolve-config-path";
import {
  getPreview,
  writeConfig,
  AiClientWriteError,
} from "../ai-client.service";

describe("ai-client.service", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "ai-client-service-test-"),
    );
    configPath = path.join(tmpDir, "claude_desktop_config.json");
    vi.mocked(resolveConfigPath).mockReturnValue(configPath);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("getPreview", () => {
    test("既存ファイルが無ければ exists: false で空配列を返す", async () => {
      const result = await getPreview("claude-desktop");
      expect(result).toStrictEqual({
        configPath,
        exists: false,
        existingServerSlugs: [],
      });
    });

    test("既存ファイルから mcpServers のキーを返す", async () => {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          mcpServers: { foo: { command: "x", args: [] }, bar: {} },
          otherKey: "kept",
        }),
        "utf-8",
      );
      const result = await getPreview("claude-desktop");
      expect(result.exists).toStrictEqual(true);
      expect(result.existingServerSlugs.sort()).toStrictEqual(["bar", "foo"]);
    });

    test("不正JSONの場合 INVALID_JSON エラーをスロー", async () => {
      await fs.writeFile(configPath, "{ not json", "utf-8");
      await expect(getPreview("claude-desktop")).rejects.toMatchObject({
        code: "INVALID_JSON",
      });
    });

    test("サポート外クライアントは UNSUPPORTED_PLATFORM エラー", async () => {
      await expect(getPreview("vscode")).rejects.toBeInstanceOf(
        AiClientWriteError,
      );
    });

    test("resolveConfigPath が null を返す場合 UNSUPPORTED_PLATFORM エラー", async () => {
      vi.mocked(resolveConfigPath).mockReturnValueOnce(null);
      await expect(getPreview("claude-desktop")).rejects.toMatchObject({
        code: "UNSUPPORTED_PLATFORM",
      });
    });
  });

  describe("writeConfig", () => {
    test("既存ファイルなし → 新規作成して書き込み（バックアップなし）", async () => {
      const result = await writeConfig({
        clientId: "claude-desktop",
        entries: { foo: { command: "/bin/foo", args: ["--x"] } },
      });

      expect(result).toStrictEqual({
        configPath,
        backupPath: null,
        addedCount: 1,
        replacedCount: 0,
        removedCount: 0,
      });

      const written: unknown = JSON.parse(
        await fs.readFile(configPath, "utf-8"),
      );
      expect(written).toStrictEqual({
        mcpServers: { foo: { command: "/bin/foo", args: ["--x"] } },
      });
    });

    test("既存サーバー保持 + 新規追加（バックアップ作成）", async () => {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          mcpServers: {
            existing: { command: "/usr/bin/existing", args: [] },
          },
          otherKey: "kept",
        }),
        "utf-8",
      );

      const result = await writeConfig({
        clientId: "claude-desktop",
        entries: { newone: { command: "/bin/newone", args: [] } },
      });

      expect(result.addedCount).toStrictEqual(1);
      expect(result.replacedCount).toStrictEqual(0);
      expect(result.backupPath).not.toBeNull();
      expect(result.backupPath).toMatch(/\.bak\.\d{8}-\d{6}$/);

      // バックアップ実体存在
      await expect(fs.stat(result.backupPath as string)).resolves.toBeDefined();

      // 既存サーバー + 新規 + その他キー保持
      const written = JSON.parse(await fs.readFile(configPath, "utf-8")) as {
        mcpServers: Record<string, unknown>;
        otherKey: string;
      };
      expect(Object.keys(written.mcpServers).sort()).toStrictEqual([
        "existing",
        "newone",
      ]);
      expect(written.otherKey).toStrictEqual("kept");
    });

    test("同名 slug は上書きで replacedCount にカウントされる", async () => {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          mcpServers: { foo: { command: "/old", args: [] } },
        }),
        "utf-8",
      );

      const result = await writeConfig({
        clientId: "claude-desktop",
        entries: {
          foo: { command: "/new", args: ["--updated"] },
          bar: { command: "/bar", args: [] },
        },
      });

      expect(result.addedCount).toStrictEqual(1);
      expect(result.replacedCount).toStrictEqual(1);

      const written = JSON.parse(await fs.readFile(configPath, "utf-8")) as {
        mcpServers: Record<string, { command: string } | undefined>;
      };
      expect(written.mcpServers.foo?.command).toStrictEqual("/new");
    });

    test("ディレクトリが無い場合は作成して書き込み", async () => {
      const nestedPath = path.join(tmpDir, "nested/deep/config.json");
      vi.mocked(resolveConfigPath).mockReturnValueOnce(nestedPath);

      await writeConfig({
        clientId: "claude-desktop",
        entries: { foo: { command: "/x", args: [] } },
      });

      await expect(fs.stat(nestedPath)).resolves.toBeDefined();
    });

    test("既存ファイルが不正JSONの場合は書き込まずエラー", async () => {
      await fs.writeFile(configPath, "not json", "utf-8");
      await expect(
        writeConfig({
          clientId: "claude-desktop",
          entries: { foo: { command: "/x", args: [] } },
        }),
      ).rejects.toMatchObject({ code: "INVALID_JSON" });
      // 元ファイルが破壊されていないこと
      const after = await fs.readFile(configPath, "utf-8");
      expect(after).toStrictEqual("not json");
    });

    test("removeSlugs で既存エントリを削除できる", async () => {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          mcpServers: {
            keep: { command: "/keep", args: [] },
            removeMe: { command: "/old", args: [] },
            alsoKeep: { command: "/keep2", args: [] },
          },
        }),
        "utf-8",
      );

      const result = await writeConfig({
        clientId: "claude-desktop",
        entries: {},
        removeSlugs: ["removeMe"],
      });

      expect(result.addedCount).toStrictEqual(0);
      expect(result.replacedCount).toStrictEqual(0);
      expect(result.removedCount).toStrictEqual(1);

      const written = JSON.parse(await fs.readFile(configPath, "utf-8")) as {
        mcpServers: Record<string, unknown>;
      };
      expect(Object.keys(written.mcpServers).sort()).toStrictEqual([
        "alsoKeep",
        "keep",
      ]);
    });

    test("追加 + 削除を1リクエストで処理できる", async () => {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          mcpServers: {
            orphan1: { command: "/orphan1", args: [] },
            orphan2: { command: "/orphan2", args: [] },
            existing: { command: "/existing", args: [] },
          },
          otherKey: "kept",
        }),
        "utf-8",
      );

      const result = await writeConfig({
        clientId: "claude-desktop",
        entries: {
          newone: { command: "/new", args: [] },
          existing: { command: "/existing-updated", args: ["--v2"] },
        },
        removeSlugs: ["orphan1", "orphan2"],
      });

      expect(result.addedCount).toStrictEqual(1);
      expect(result.replacedCount).toStrictEqual(1);
      expect(result.removedCount).toStrictEqual(2);

      const written = JSON.parse(await fs.readFile(configPath, "utf-8")) as {
        mcpServers: Record<string, { command: string } | undefined>;
        otherKey: string;
      };
      expect(Object.keys(written.mcpServers).sort()).toStrictEqual([
        "existing",
        "newone",
      ]);
      expect(written.mcpServers.existing?.command).toStrictEqual(
        "/existing-updated",
      );
      expect(written.otherKey).toStrictEqual("kept");
    });

    test("removeSlugs に存在しない slug が含まれていても無視される（エラーなし）", async () => {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          mcpServers: { keep: { command: "/k", args: [] } },
        }),
        "utf-8",
      );

      const result = await writeConfig({
        clientId: "claude-desktop",
        entries: {},
        removeSlugs: ["nonexistent"],
      });

      expect(result.removedCount).toStrictEqual(0);
      const written = JSON.parse(await fs.readFile(configPath, "utf-8")) as {
        mcpServers: Record<string, unknown>;
      };
      expect(Object.keys(written.mcpServers)).toStrictEqual(["keep"]);
    });

    test("entries と removeSlugs に同じslugがある場合は entries が勝つ（追加扱い）", async () => {
      await fs.writeFile(
        configPath,
        JSON.stringify({
          mcpServers: { foo: { command: "/old", args: [] } },
        }),
        "utf-8",
      );

      const result = await writeConfig({
        clientId: "claude-desktop",
        entries: { foo: { command: "/new", args: [] } },
        removeSlugs: ["foo"],
      });

      // foo は削除→再追加なので addedCount にカウントされる
      expect(result.addedCount).toStrictEqual(1);
      expect(result.replacedCount).toStrictEqual(0);
      expect(result.removedCount).toStrictEqual(1);

      const written = JSON.parse(await fs.readFile(configPath, "utf-8")) as {
        mcpServers: Record<string, { command: string } | undefined>;
      };
      expect(written.mcpServers.foo?.command).toStrictEqual("/new");
    });
  });
});
