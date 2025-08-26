import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import i18n from "./i18n";

// 导入Inter字体
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

createApp(App).use(i18n).mount("#app");
