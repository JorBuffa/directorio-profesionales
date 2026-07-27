/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        blueprint: {
          DEFAULT: "#0F1B2D",
          light: "#182B45",
          line: "#2C4569"
        },
        paper: "#F7F5EF",
        copper: {
          DEFAULT: "#C46A2E",
          dark: "#9C5321",
          light: "#E28E52"
        },
        taller: "#2B6E5E",
        ink: "#1A2130",
        stone: "#D8D2C4"
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"]
      },
      backgroundImage: {
        blueprintGrid:
          "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)"
      },
      backgroundSize: {
        grid: "28px 28px"
      }
    }
  },
  plugins: []
};
