// PostCSS runs Tailwind (generates utility CSS) then Autoprefixer (adds
// vendor prefixes for browser compatibility). Vite picks this up automatically.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
