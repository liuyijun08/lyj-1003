/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        lab: {
          bg: "#0a0e1a",
          panel: "#1a1f2e",
          "panel-light": "#242b3d",
          border: "#2d3748",
          cyan: "#00e5ff",
          "cyan-dim": "#00a3b8",
          amber: "#ffb300",
          "amber-dim": "#cc8f00",
          green: "#00ff88",
          "green-dim": "#00cc6d",
          red: "#ff4d6d",
          text: "#e2e8f0",
          "text-dim": "#94a3b8",
          "text-muted": "#64748b",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        display: [
          "Space Grotesk",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 20px rgba(0, 229, 255, 0.15)",
        "glow-lg": "0 0 40px rgba(0, 229, 255, 0.25)",
        "glow-green": "0 0 20px rgba(0, 255, 136, 0.2)",
        "glow-amber": "0 0 20px rgba(255, 179, 0, 0.2)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
