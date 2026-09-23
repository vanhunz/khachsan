/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(circle at top left, rgba(34,197,94,0.25), transparent 34%), radial-gradient(circle at top right, rgba(59,130,246,0.22), transparent 30%), linear-gradient(180deg, rgba(8,17,31,1) 0%, rgba(5,10,19,1) 100%)',
      },
    },
  },
  plugins: [],
};
