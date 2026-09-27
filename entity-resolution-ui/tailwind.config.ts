import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#07080A",
        surface: {
          DEFAULT: "#0D0F13",
          raised: "#12151A",
          hover: "#171B21",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.07)",
          strong: "rgba(255,255,255,0.14)",
        },
        ink: {
          DEFAULT: "#EDEEF1",
          muted: "#8A8F99",
          faint: "#5A5F6A",
        },
        signal: {
          DEFAULT: "#2FE0C8", // resolution teal — the single electric accent
          dim: "#17352F",
        },
        match: "#3DDC84", // matched
        review: "#F5B94E", // needs review
        reject: "#F16A6A", // rejected
        vector: "#9B87F5", // embedding / vector operations
      },
      fontFamily: {
        sans: ["var(--font-ui)", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at 50% 0%, rgba(47,224,200,0.06), transparent 60%)",
      },
      boxShadow: {
        glow: "0 0 40px rgba(47,224,200,0.15)",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        flow: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.8s ease-in-out infinite",
        flow: "flow 1s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
