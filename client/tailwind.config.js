export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
