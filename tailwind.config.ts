import type { Config } from "tailwindcss";

const config = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        extend: {
            fontFamily: {
                serif: ['var(--font-playfair)', 'serif'],
                sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
            },
            colors: {
                apple: {
                    blue: '#0071E3',
                    bg: '#F5F5F7',
                    text: '#1D1D1F',
                    'text-mid': '#424245',
                    'text-light': '#86868B',
                    border: '#D1D1D6',
                    divider: '#E8E8ED',
                },
            },
        },
    },
    plugins: [],
} satisfies Config;

export default config;
