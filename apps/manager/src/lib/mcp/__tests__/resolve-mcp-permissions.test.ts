import { describe, test, expect } from "vitest";
import { resolveMcpPermissions } from "../resolve-mcp-permissions";

const makeRole = (
  defaults: { read: boolean; write: boolean; execute: boolean },
  overrides: Array<{
    mcpServerId: string;
    read: boolean;
    write: boolean;
    execute: boolean;
  }> = [],
) => ({
  defaultRead: defaults.read,
  defaultWrite: defaults.write,
  defaultExecute: defaults.execute,
  mcpPermissions: overrides,
});

describe("resolveMcpPermissions", () => {
  describe("サーバー別オーバーライドなし（デフォルト権限を使用）", () => {
    test("デフォルト権限がすべてtrueの場合はtrueを返す", () => {
      const role = makeRole({ read: true, write: true, execute: true });

      const result = resolveMcpPermissions("server-1", role);

      expect(result).toStrictEqual({ read: true, write: true, execute: true });
    });

    test("デフォルト権限がすべてfalseの場合はfalseを返す", () => {
      const role = makeRole({ read: false, write: false, execute: false });

      const result = resolveMcpPermissions("server-1", role);

      expect(result).toStrictEqual({
        read: false,
        write: false,
        execute: false,
      });
    });

    test("対象外のサーバーIDのオーバーライドはデフォルトにフォールバック", () => {
      const role = makeRole({ read: true, write: false, execute: true }, [
        {
          mcpServerId: "other-server",
          read: false,
          write: true,
          execute: false,
        },
      ]);

      const result = resolveMcpPermissions("server-1", role);

      expect(result).toStrictEqual({ read: true, write: false, execute: true });
    });
  });

  describe("サーバー別オーバーライドあり", () => {
    test("オーバーライドがある場合はデフォルトより優先される", () => {
      const role = makeRole({ read: false, write: false, execute: false }, [
        { mcpServerId: "server-1", read: true, write: true, execute: true },
      ]);

      const result = resolveMcpPermissions("server-1", role);

      expect(result).toStrictEqual({ read: true, write: true, execute: true });
    });

    test("オーバーライドのfalseはデフォルトのtrueより優先される", () => {
      const role = makeRole({ read: true, write: true, execute: true }, [
        { mcpServerId: "server-1", read: false, write: false, execute: false },
      ]);

      const result = resolveMcpPermissions("server-1", role);

      expect(result).toStrictEqual({
        read: false,
        write: false,
        execute: false,
      });
    });
  });

  describe("ロールがnull/undefinedの場合", () => {
    test("ロールがnullの場合はすべてfalse", () => {
      const result = resolveMcpPermissions("server-1", null);

      expect(result).toStrictEqual({
        read: false,
        write: false,
        execute: false,
      });
    });

    test("ロールがundefinedの場合はすべてfalse", () => {
      const result = resolveMcpPermissions("server-1", undefined);

      expect(result).toStrictEqual({
        read: false,
        write: false,
        execute: false,
      });
    });
  });
});
