/** @type {import('tailwindcss').Config} */
export default {
  // `content` tells Tailwind which files to scan for class names so it can
  // tree-shake unused styles out of the production build.
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
