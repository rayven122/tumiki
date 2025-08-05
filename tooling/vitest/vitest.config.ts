import { defineProject } from "vitest/config";

export default defineProject({
  test: {
    name: "vitest-config",
    globals: true,
    environment: "node",
  },
});
