/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // 夜间模式配色方案
        dark: {
          primary: '#1E1E1E',    // 主背景
          panel: '#2D2D2D',      // 面板背景
          text: '#F5F5F5',       // 主文本
          secondary: '#A0A0A0',   // 次要文本
          accent: '#9B59B6',      // 强调色/进行中
          success: '#2ECC71',     // 成功/完成
          warning: '#F1C40F',     // 等待/警告
          border: '#4A4A4A',      // 边框与分隔线
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}