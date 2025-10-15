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
        // 夜间模式配色方案（保持兼容）
        dark: {
          primary: '#1e1e1e',    // 主背景
          panel: '#1e1e1e',      // 面板背景
          text: '#F5F5F5',       // 主文本
          secondary: '#A0A0A0',   // 次要文本
          accent: '#9B59B6',      // 强调色/进行中
          success: '#2ECC71',     // 成功/完成
          warning: '#F1C40F',     // 等待/警告
          border: '#4A4A4A',      // 边框与分隔线
        },
        // 全新现代配色（亮色主题）
        light: {
          surface: '#ffffff',
          text: '#0f172a',
          secondary: '#64748b',
          muted: '#f1f5f9',
          border: '#e2e8f0'
        },
        // 品牌与功能色
        brand: {
          primary: '#6366f1', // Indigo-500
          accent: '#a78bfa',  // Violet-400
        },
        status: {
          success: '#10b981', // Emerald-500
          warning: '#f59e0b', // Amber-500
          danger: '#ef4444',  // Red-500
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}