import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        studio: {
          950: "#07080A",
          900: "#0D0F14",
          850: "#12151D",
          800: "#171B26",
          750: "#1E2330",
          700: "#262D3D",
          600: "#384259",
          500: "#505E7D",
        },
        titanium: {
          50: "#F8F9FB",
          100: "#E8EAF0",
          200: "#D2D6E0",
          300: "#B2B9C8",
          400: "#8B94A7",
          500: "#6B758A",
        },
        signal: {
          green: "#10B981",
          amber: "#F59E0B",
          crimson: "#EF4444",
          indigo: "#6366F1",
          cyan: "#06B6D4",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "Inter",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        "studio-inner": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.08), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.6)",
        "rack-panel": "0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)",
        "glow-signal": "0 0 12px rgba(16, 185, 129, 0.35)",
        "glow-amber": "0 0 12px rgba(245, 158, 11, 0.35)",
        "glow-crimson": "0 0 12px rgba(239, 68, 68, 0.35)",
      },
      animation: {
        "pulse-subtle": "pulseSubtle 2.5s ease-in-out infinite",
        "ambient-breathe": "ambientBreathe 8s ease-in-out infinite",
      },
      keyframes: {
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        ambientBreathe: {
          "0%, 100%": { transform: "scale(1) translate(0, 0)", opacity: "0.12" },
          "50%": { transform: "scale(1.08) translate(-10px, 10px)", opacity: "0.22" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
