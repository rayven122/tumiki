import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./base.config.js";

const reactConfig = defineConfig({
  // @ts-expect-error - Temporary fix for Vite plugin version conflicts
  plugins: [react()],
  test: {
    environment: "jsdom",
    coverage: {
      exclude: [
        ...(baseConfig.test?.coverage?.exclude || []),
        "src/**/types.ts",
        "src/**/_components/**",
      ],
    },
  },
});

// @ts-expect-error - Temporary fix for Vite version conflicts
export default mergeConfig(baseConfig, reactConfig);
