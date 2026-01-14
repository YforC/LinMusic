/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#1DB954",
        "primary-dark": "#1aa34a",
        "background-base": "#121212",
        "sidebar-base": "#000000",
        "card-base": "#181818",
        "card-hover": "#282828",
        "surface-dark": "#181818",
        "surface-highlight": "#282828",
        "text-base": "#FFFFFF",
        "text-subdued": "#A7A7A7",
        "player-bar": "#000000",
      },
      fontFamily: {
        "display": ["-apple-system", "BlinkMacSystemFont", "PingFang SC", "Microsoft YaHei", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"]
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "md": "0.375rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
    },
  },
  plugins: [],
}
