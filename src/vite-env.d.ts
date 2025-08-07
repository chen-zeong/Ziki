/// <reference types="vite/client" />

interface Window {
  __TAURI__?: object;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
