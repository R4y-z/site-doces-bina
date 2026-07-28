/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        4.5: "1.125rem",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "serif"],
      },
      colors: {
        brand: {
          50: "#fff5f7",
          100: "#ffe4ea",
          200: "#ffc7d3",
          300: "#ff9fb3",
          400: "#fb6f8f",
          500: "#f0416b",
          600: "#d92457",
          700: "#b6194a",
          800: "#921544",
          900: "#7a153e",
        },
        cream: {
          50: "#fffdf9",
          100: "#fdf6ec",
          200: "#faecd6",
        },
        ink: {
          900: "#1f1720",
          700: "#453a47",
          500: "#7a6c7c",
        },
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(31, 23, 32, 0.18)",
        card: "0 2px 10px -2px rgba(31, 23, 32, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop": {
          "0%": { transform: "scale(0.9)" },
          "60%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "slide-up": "slide-up .28s ease-out",
        "fade-in": "fade-in .2s ease-out",
        pop: "pop .22s ease-out",
      },
    },
  },
  plugins: [],
};
