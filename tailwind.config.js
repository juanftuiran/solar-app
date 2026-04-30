// Configuración de Tailwind CSS

module.exports = {
  content: ['./public/**/*.{html,js}', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        jf: {
          bg: '#0B1120',
          card: '#1E293B',
          accent: '#0EA5E9',
          solar: '#10B981',
          grid: '#F43F5E',
          ai: '#8B5CF6',
        },
      },
    },
  },
  plugins: [],
};
