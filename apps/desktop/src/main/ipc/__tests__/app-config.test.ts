import { describe, test, expect, beforeEach, vi } from "vitest";
import type { IpcMainInvokeEvent } from "electron";

const mockIpcHandlers = new Map<
  string,
  (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
>();

const storeData = vi.hoisted(() => new Map<string, unknown>());

vi.mock("electron", () => ({
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      mockIpcHandlers.set(
        channel,
        handler as (
          event: IpcMainInvokeEvent,
          ...args: unknown[]
        ) => Promise<unknown>,
      );
    },
  },
}));

vi.mock("../../shared/app-store", () => ({
  getAppStore: () =>
    Promise.resolve({
      get: (key: string) => storeData.get(key),
      set: (key: string, value: unknown) => storeData.set(key, value),
      delete: (key: string) => storeData.delete(key),
    }),
}));

import { setupAppConfigIpc } from "../app-config";

describe("setupAppConfigIpc", () => {
  beforeEach(() => {
    mockIpcHandlers.clear();
    storeData.clear();
    setupAppConfigIpc();
  });

  test("未保存時は appConfig:getTheme が null を返す", async () => {
    const handler = mockIpcHandlers.get("appConfig:getTheme");

    const result = await handler!({} as IpcMainInvokeEvent);

    expect(result).toBeNull();
  });

  test("保存済みテーマを appConfig:getTheme が返す", async () => {
    storeData.set("theme", "light");
    const handler = mockIpcHandlers.get("appConfig:getTheme");

    const result = await handler!({} as IpcMainInvokeEvent);

    expect(result).toStrictEqual("light");
  });

  test("不正な保存値は null として扱う", async () => {
    storeData.set("theme", "neon");
    const handler = mockIpcHandlers.get("appConfig:getTheme");

    const result = await handler!({} as IpcMainInvokeEvent);

    expect(result).toBeNull();
  });

  test("appConfig:setTheme が dark テーマを永続化する", async () => {
    const handler = mockIpcHandlers.get("appConfig:setTheme");

    await handler!({} as IpcMainInvokeEvent, "dark");

    expect(storeData.get("theme")).toStrictEqual("dark");
  });

  test("appConfig:setTheme が light テーマを永続化する", async () => {
    const handler = mockIpcHandlers.get("appConfig:setTheme");

    await handler!({} as IpcMainInvokeEvent, "light");

    expect(storeData.get("theme")).toStrictEqual("light");
  });

  test("dark テーマを appConfig:getTheme が返す", async () => {
    storeData.set("theme", "dark");
    const handler = mockIpcHandlers.get("appConfig:getTheme");

    const result = await handler!({} as IpcMainInvokeEvent);

    expect(result).toStrictEqual("dark");
  });

  test("light/dark 以外の値は拒否する", async () => {
    const handler = mockIpcHandlers.get("appConfig:setTheme");

    await expect(handler!({} as IpcMainInvokeEvent, "system")).rejects.toThrow(
      "テーマは 'light' または 'dark' で指定してください",
    );
    expect(storeData.has("theme")).toBe(false);
  });
});
