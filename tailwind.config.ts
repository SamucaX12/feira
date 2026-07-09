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
        "fade-in": "fadeIn 0.35s ease-out",
      },
      keyframes: {
        scan: {
          "0%, 100%": { top: "12%" },
          "50%": { top: "82%" },
        },
        pulseNeon: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
