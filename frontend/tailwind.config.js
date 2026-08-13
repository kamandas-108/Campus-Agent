/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    { pattern: /bg-(cyan|teal|violet|emerald|amber|rose|slate|purple)-(400|500|600)/ },
    { pattern: /text-(cyan|teal|violet|emerald|amber|rose|slate|purple)-(300|400|500)/ },
    { pattern: /border-(cyan|teal|violet|emerald|amber|rose|slate|purple)-(400|500|600)/ },
    { pattern: /bg-(cyan|teal|violet|emerald|amber|rose|slate|purple)-(500)\/(10|15|20|25)/ },
    { pattern: /border-(cyan|teal|violet|emerald|amber|rose|slate|purple)-(500)\/(20|30|40|50)/ },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "in": "animate-in 0.3s ease forwards",
      },
    },
  },
  plugins: [],
};
