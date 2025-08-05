import { defineConfig } from "tsup";
import { resolve } from "path";
import { nodeTsupConfig } from "@tumiki/tsup-config/node";

export default defineConfig({
  ...nodeTsupConfig,
  entry: ["src/index.ts"],
  dts: false, // tscで別途生成
  treeshake: false,
  outDir: "build",
  external: [
    "@tumiki/db",
    "@line/line-bot-mcp-server",
    "@modelcontextprotocol/server-github",
    "@playwright/mcp",
    "@suekou/mcp-notion-server",
    "@upstash/context7-mcp",
    "agents",
    "discord-mcp-server",
    "fastmcp",
    "node:crypto",
    "node:os",
    "crypto",
  ],
  esbuildOptions(options) {
    options.alias = {
      "@": resolve(__dirname, "./src"),
      "~": resolve(__dirname, "./"),
    };
  },
});
