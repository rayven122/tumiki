import type { Config } from "tailwindcss";
import baseConfig from "@tumiki/tailwind-config";

const config: Config = {
  content: ["./src/renderer/**/*.{ts,tsx}"],
  presets: [baseConfig],
};

export default config;
