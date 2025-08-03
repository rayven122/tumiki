import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false, // tscで別途生成
  sourcemap: true,
  clean: true,
  target: "node22",
  treeshake: false,
  shims: true,
  outDir: "build",
  bundle: true,
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
});
