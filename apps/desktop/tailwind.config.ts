import type { Config } from "tailwindcss";
import baseConfig from "@tumiki/tailwind-config";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./src/renderer/**/*.{ts,tsx}"],
  presets: [baseConfig],
  theme: {
    extend: {
      colors: {
        gray: colors.gray,
        blue: colors.blue,
        green: colors.green,
        red: colors.red,
        white: colors.white,
        black: colors.black,
      },
    },
  },
};

export default config;
