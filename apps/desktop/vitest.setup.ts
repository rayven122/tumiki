import { vi } from "vitest";

// CIではElectronバイナリがインストールされないため、グローバルにモックする
vi.mock("electron", () => ({
  app: {
    getPath: (name: string) => {
      if (name === "userData") {
        return "/test/user/data";
      }
      return "/test";
    },
  },
}));
