/**
 * ツール名パーサーのテスト
 */

import { describe, test, expect } from "vitest";
import {
  parseUnifiedToolName,
  formatUnifiedToolName,
} from "../toolNameParser.js";

describe("parseUnifiedToolName", () => {
  test("正しい3階層フォーマットをパースできる", () => {
    const result = parseUnifiedToolName("server123__instanceA__myTool");

    expect(result).toStrictEqual({
      mcpServerId: "server123",
      instanceName: "instanceA",
      toolName: "myTool",
    });
  });

  test("アンダースコアを含むmcpServerIdをパースできる", () => {
    const result = parseUnifiedToolName(
      "server_with_underscores__instance_name__tool_name",
    );

    expect(result).toStrictEqual({
      mcpServerId: "server_with_underscores",
      instanceName: "instance_name",
      toolName: "tool_name",
    });
  });

  test("数字で始まるIDをパースできる", () => {
    const result = parseUnifiedToolName("123abc__456def__789ghi");

    expect(result).toStrictEqual({
      mcpServerId: "123abc",
      instanceName: "456def",
      toolName: "789ghi",
    });
  });

  test("ハイフンを含む名前をパースできる", () => {
    const result = parseUnifiedToolName("server-id__instance-name__tool-name");

    expect(result).toStrictEqual({
      mcpServerId: "server-id",
      instanceName: "instance-name",
      toolName: "tool-name",
    });
  });

  test("長いツール名をパースできる", () => {
    const result = parseUnifiedToolName(
      "clwq1234567890abcdef__my_custom_instance__get_user_data_from_database",
    );

    expect(result).toStrictEqual({
      mcpServerId: "clwq1234567890abcdef",
      instanceName: "my_custom_instance",
      toolName: "get_user_data_from_database",
    });
  });

  test("区切り文字が1つだけの場合はエラーをスローする", () => {
    expect(() => parseUnifiedToolName("server__tool")).toThrow(
      'Invalid unified tool name format: "server__tool". Expected format: "{mcpServerId}__{instanceName}__{toolName}"',
    );
  });

  test("区切り文字がない場合はエラーをスローする", () => {
    expect(() => parseUnifiedToolName("simpleToolName")).toThrow(
      'Invalid unified tool name format: "simpleToolName". Expected format: "{mcpServerId}__{instanceName}__{toolName}"',
    );
  });

  test("空文字列の場合はエラーをスローする", () => {
    expect(() => parseUnifiedToolName("")).toThrow(
      'Invalid unified tool name format: "". Expected format: "{mcpServerId}__{instanceName}__{toolName}"',
    );
  });

  test("mcpServerIdが空の場合はエラーをスローする", () => {
    expect(() => parseUnifiedToolName("__instanceA__toolName")).toThrow(
      'Invalid unified tool name format: "__instanceA__toolName". All parts (mcpServerId, instanceName, toolName) must be non-empty.',
    );
  });

  test("instanceNameが空の場合はエラーをスローする", () => {
    expect(() => parseUnifiedToolName("server____toolName")).toThrow(
      'Invalid unified tool name format: "server____toolName". All parts (mcpServerId, instanceName, toolName) must be non-empty.',
    );
  });

  test("toolNameが空の場合はエラーをスローする", () => {
    expect(() => parseUnifiedToolName("server__instance__")).toThrow(
      'Invalid unified tool name format: "server__instance__". All parts (mcpServerId, instanceName, toolName) must be non-empty.',
    );
  });

  test("4つ以上の部分がある場合はエラーをスローする（厳密に3パーツ必須）", () => {
    expect(() => parseUnifiedToolName("server__instance__tool__extra")).toThrow(
      'Invalid unified tool name format: "server__instance__tool__extra". Expected format: "{mcpServerId}__{instanceName}__{toolName}"',
    );
  });
});

describe("formatUnifiedToolName", () => {
  test("3階層フォーマットの文字列を生成できる", () => {
    const result = formatUnifiedToolName("server123", "instanceA", "myTool");

    expect(result).toBe("server123__instanceA__myTool");
  });

  test("アンダースコアを含む名前でフォーマットできる", () => {
    const result = formatUnifiedToolName(
      "server_id",
      "instance_name",
      "tool_name",
    );

    expect(result).toBe("server_id__instance_name__tool_name");
  });

  test("ハイフンを含む名前でフォーマットできる", () => {
    const result = formatUnifiedToolName(
      "server-id",
      "instance-name",
      "tool-name",
    );

    expect(result).toBe("server-id__instance-name__tool-name");
  });

  test("数字で始まる名前でフォーマットできる", () => {
    const result = formatUnifiedToolName("123abc", "456def", "789ghi");

    expect(result).toBe("123abc__456def__789ghi");
  });

  test("フォーマットとパースの往復変換が正しく機能する", () => {
    const mcpServerId = "my_server_id";
    const instanceName = "my_instance";
    const toolName = "my_tool_name";

    const formatted = formatUnifiedToolName(
      mcpServerId,
      instanceName,
      toolName,
    );
    const parsed = parseUnifiedToolName(formatted);

    expect(parsed).toStrictEqual({
      mcpServerId,
      instanceName,
      toolName,
    });
  });
});
