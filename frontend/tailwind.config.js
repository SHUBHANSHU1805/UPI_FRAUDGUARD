/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: {
            dark: "#0d1117",
            light: "#f6f8fa",
          },
          surf: {
            dark: "#161b22",
            light: "#ffffff",
          },
          surf2: {
            dark: "#21262d",
            light: "#f6f8fa",
          },
          border: {
            dark: "#30363d",
            light: "#d0d7de",
          },
          text: {
            dark: "#e6edf3",
            light: "#24292f",
          },
          muted: {
            dark: "#8b949e",
            light: "#57606a",
          },
          blue: "#58a6ff",
          green: "#3fb950",
          red: "#f85149",
          amber: "#d29922",
          purple: "#bc8cff",
          redBg: "#2d1b1a",
          greenBg: "#1a2d1e",
          amberBg: "#2d2514",
        }
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "gradient-mesh": "gradient-mesh 15s ease infinite",
        "shake": "shake 0.5s ease-in-out infinite",
      },
      keyframes: {
        "gradient-mesh": {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        }
      }
    },
  },
  plugins: [],
}
