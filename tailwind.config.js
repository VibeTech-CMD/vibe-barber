/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0B0D10',
        deep: '#08090B',
        surface: '#171B23',
        surface2: '#202631',
        gold: {
          DEFAULT: '#E8B04B',
          dark: '#C9973D',
          light: '#F5CB76',
        },
        ink: {
          DEFAULT: '#F5F5F5',
          muted: '#A1A8B3',
          dim: '#6E7785',
        },
        confirm: '#22C55E',
        info: '#38BDF8',
        alert: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        xl: '14px',
        '2xl': '18px',
      },
    },
  },
  plugins: [],
};
