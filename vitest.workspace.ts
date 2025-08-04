import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  // Apps
  "apps/manager/vitest.config.ts",
  "apps/proxyServer/vitest.config.ts",
  
  // Packages
  "packages/auth/vitest.config.ts",
  "packages/db/vitest.config.ts",
  "packages/mailer/vitest.config.ts",
  "packages/scripts/vitest.config.ts",
  "packages/utils/vitest.config.ts",
  
  // Tooling
  "tooling/vitest/vitest.config.ts",
]);