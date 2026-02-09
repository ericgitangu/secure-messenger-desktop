import type { ElectronAPI } from '../types/ipc';

let bridgeInstance: ElectronAPI | null = null;

/**
 * Detect whether we're running inside Electron (preload exposed electronAPI)
 * or in a standalone browser (web mode).
 */
function isElectron(): boolean {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
}

/**
 * Initialize the bridge. Must be called once before React renders.
 * In Electron, uses the preload-exposed API directly.
 * In browser, dynamically imports the web bridge (fetch + WebSocket).
 */
export async function initBridge(): Promise<void> {
  if (isElectron()) {
    bridgeInstance = window.electronAPI;
  } else {
    const { createWebBridge } = await import('./webBridge');
    bridgeInstance = createWebBridge();
  }
}

/**
 * Get the bridge instance. Throws if called before initBridge().
 */
export function bridge(): ElectronAPI {
  if (!bridgeInstance) {
    throw new Error('Bridge not initialized. Call initBridge() before using bridge().');
  }
  return bridgeInstance;
}
