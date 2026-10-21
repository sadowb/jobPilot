/// <reference types="vite/client" />
import type { JobPilotBridge } from '../../shared/ipc';

declare global {
  interface Window {
    /** Present in Electron only (exposed by the preload through contextBridge). */
    jobpilot?: JobPilotBridge;
  }
}
