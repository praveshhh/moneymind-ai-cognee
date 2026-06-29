/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#030712", // slate-950 dark background
        card: "#111827",       // slate-900 card background
        primary: "#10b981",    // emerald-500 financial green
        secondary: "#6366f1",  // indigo-500 secondary theme
        accent: "#f59e0b",     // amber-500 warnings/goals
        danger: "#ef4444",     // red-500 regrets/risks
      }
    },
  },
  plugins: [],
}
