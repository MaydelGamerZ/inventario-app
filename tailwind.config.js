/**
 * Tailwind CSS configuration
 *
 * This file tells Tailwind to scan your index.html and all of your JSX files
 * in src/ for utility class names. It also defines a basic theme.
 */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};