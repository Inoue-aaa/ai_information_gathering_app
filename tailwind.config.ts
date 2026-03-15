import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#11212d",
        fog: "#f5f3ed",
        card: "#fffdf8",
        accent: "#b85c38",
        accentSoft: "#f7e0d4",
        line: "#dfd7cb",
        success: "#276749"
      },
      boxShadow: {
        panel: "0 12px 40px rgba(17, 33, 45, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
