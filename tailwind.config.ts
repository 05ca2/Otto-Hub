import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f8',
          100: '#eeeef1',
          200: '#d8d9df',
          400: '#8a8d99',
          500: '#6a6d79',
          600: '#4b4e58',
          700: '#353840',
          800: '#1f2129',
          900: '#0f1115',
          950: '#080910',
        },
        accent: {
          400: '#7c8cff',
          500: '#5b6cff',
          600: '#4356e6',
        },
        hi: {
          yellow: '#fff3a3',
          green: '#c6f6d5',
          pink: '#ffd1dc',
          blue: '#bee3f8',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
export default config;
