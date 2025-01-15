// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        fire: 'fire 5s ease-in-out infinite',
      },
      keyframes: {
        fire: {
          '0%': { opacity: 0, transform: 'translateY(0) scale(1) rotate(0deg)' },
          '50%': { opacity: 0.5, transform: 'translateY(-20px) scale(1.2) rotate(10deg)' },
          '100%': { opacity: 0, transform: 'translateY(-40px) scale(1) rotate(0deg)' },
        },
      },
    },
  },
  plugins: [],
};
