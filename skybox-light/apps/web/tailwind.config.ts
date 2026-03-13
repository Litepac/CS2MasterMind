import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#061018",
        panel: "#0d1722",
        line: "#22354a",
        accent: "#18f7c9",
        ct: "#57b9ff",
        t: "#f39b55"
      },
      fontFamily: {
        display: ["Rajdhani", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
