import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./_cardapio_kal_novo/**/*.{js,ts,jsx,tsx,mdx}",
        "./_cardapio_kal_novo/*.{js,ts,jsx,tsx,mdx}",
        "**/_cardapio_kal_novo/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Montserrat", "sans-serif"],
                display: ["Oswald", "sans-serif"],
            },
            colors: {
                primary: {
                    DEFAULT: "#e65100",
                    foreground: "#ffffff",
                },
                neon: {
                    400: "#fb923c",
                    500: "#f97316",
                    600: "#ea580c",
                },
            },
            boxShadow: {
                'neon': '0 0 10px rgba(249, 115, 22, 0.5), 0 0 20px rgba(249, 115, 22, 0.3)',
                'neon-strong': '0 0 15px rgba(249, 115, 22, 0.7), 0 0 30px rgba(249, 115, 22, 0.5)',
            },
        },
    },
    plugins: [],
};
export default config;
