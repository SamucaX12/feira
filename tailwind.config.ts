import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: "#00ff88",
        surface: "#0a0f0d",
        panel: "#111916",
        border: "#1a2e24",
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 255, 136, 0.35)",
        "neon-sm": "0 0 10px rgba(0, 255, 136, 0.25)",
      },
      animation: {
        scan: "scan 2.5s ease-in-out infinite",
        pulseNeon: "pulseNeon 2s ease-in-out infinite",
      },
      keyframes: {
        scan: {
          "0%, 100%": { top: "8%" },
          "50%": { top: "88%" },
        },
        pulseNeon: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
