const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./modules/**/*.{html,js}",
    "./design/**/*.{html,js}",
    "./src/**/*.{html,js,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['\"Nunito Sans\"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
