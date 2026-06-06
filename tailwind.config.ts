import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        terracota: '#C0392B',
        dorado: '#F39C12',
        'dorado-light': '#F7DC6F',
        verde: '#27AE60',
        azul: '#2980B9',
        crema: '#FEF9F0',
        marron: '#784212',
      },
      fontFamily: { sans: ['var(--font-nunito)', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
