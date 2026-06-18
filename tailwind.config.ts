import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f7faf9",
        ink: "#14201d",
        cedar: "#9a3412",
        moss: "#256d5a"
      },
      boxShadow: {
        soft: "0 18px 54px rgba(15, 23, 42, 0.10)"
      }
    }
  },
  plugins: []
} satisfies Config;
