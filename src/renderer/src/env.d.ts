import type { ElectronAPI } from "../../preload";

declare module "*.css";

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
