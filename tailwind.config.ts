import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // CORES DO SEU LOGO
        cartola: {
          gold: '#FFC107',   // Dourado
          green: '#009B3A',  // Verde
          blue: '#002776',   // Azul
          dark: '#111827',   // Fundo Escuro (Preto azulado)
          card: '#1F2937',   // Cinza dos cartões
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;