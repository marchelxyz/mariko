/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8E1A1A',
          dark: '#6B1414',
        },
        secondary: {
          DEFAULT: '#F3E5D2',
          light: '#F7F7F7',
        },
        accent: {
          DEFAULT: '#B05E5E',
        },
        text: {
          primary: '#000000',
          secondary: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
}
