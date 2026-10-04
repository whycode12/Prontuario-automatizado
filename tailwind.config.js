/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Aesthetic Slate-Blue palette
        navy: {
          950: '#191919', // Notion Dark main background
          900: '#202020', // Notion Dark sidebar / header
          850: '#252525', // Notion Dark card
          800: '#2f2f2f', // Notion Dark elevated card
          700: '#373737', // Notion Dark borders
          600: '#525252',
        },
        notion: {
          bg: '#ffffff',
          sidebar: '#fbfbfa',
          hover: '#efefee',
          border: '#e9e9e7',
          darkBg: '#191919',
          darkSidebar: '#202020',
          darkHover: '#2c2c2c',
          darkBorder: '#2e2e2e',
        },
        // Neutralize default slate-700 and slate-800 borders in dark mode
        slate: {
          700: '#333333',
          800: '#2b2b2b',
        },
        ice: {
          50: '#f0f9ff',  // Lightest text/accent
          100: '#e0f2fe', // Soft pastel blue accent
          200: '#bae6fd', // Text primary for dark mode
          300: '#7dd3fc', // Highlights
          400: '#38bdf8', // Vibrant aesthetic cyan/sky
          500: '#0ea5e9', // Primary buttons
          600: '#0284c7',
        }
      }
    },
  },
  plugins: [],
}
