import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-newsreader)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        parchment: {
          50: "#FDFCFA",
          100: "#FAF7F2",
          200: "#F2ECE1",
          300: "#E6DCCB",
        },
        amberink: {
          50: "#FDF8EE",
          100: "#F7EAD0",
          200: "#ECD19B",
          500: "#B88435",
          600: "#9A6B24",
          700: "#7B531A",
        },
        espresso: {
          800: "#24201C",
          900: "#191613",
          950: "#12100E",
        },
      },
    },
  },
  plugins: [],
};

export default config;
