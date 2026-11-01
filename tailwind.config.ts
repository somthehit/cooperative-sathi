import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coop: {
          navy: "#1F497D",
          slate: "#2E5B88",
          darkNavy: "#122E53",
          lightNavy: "#2D68A8",
          accent: "#0D9488", // emerald/teal accent
          gold: "#D97706",
          bgLight: "#F8FAFC",
          cardBg: "#FFFFFF",
          border: "#E2E8F0"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "sans-serif"
        ]
      }
    },
  },
  plugins: [],
};
export default config;
