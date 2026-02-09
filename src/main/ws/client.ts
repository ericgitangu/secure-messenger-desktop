import WebSocket from 'ws';
import { BrowserWindow } from 'electron';
import {
  WS_URL,
  HEARTBEAT_TIMEOUT,
  RECONNECT_BASE_DELAY,
  RECONNECT_MAX_DELAY,
  RECONNECT_MAX_RETRIES,
  IPC_CHANNELS,
} from '@shared/constants';
import type { ConnectionState } from '@shared/constants';

let ws: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
let currentState: ConnectionState = 'offline';

function getMainWindow(): BrowserWindow | null {
  const windows = BrowserWindow.getAllWindows();
  return windows.length > 0 ? windows[0] : null;
}

function sendToRenderer(channel: string, data: unknown): void {
  const win = getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

function updateConnectionState(state: ConnectionState): void {
  if (currentState !== state) {
    currentState = state;
    sendToRenderer(IPC_CHANNELS.CONNECTION_STATE, state);
  }
}

function startHeartbeatCheck(): void {
  if (heartbeatTimer) clearTimeout(heartbeatTimer);

  heartbeatTimer = setTimeout(() => {
    // No pong received within timeout → consider connection lost
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.terminate();
    }
  }, HEARTBEAT_TIMEOUT);
}

function clearHeartbeatCheck(): void {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function getReconnectDelay(): number {
  const delay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts);
  return Math.min(delay, RECONNECT_MAX_DELAY);
}

function scheduleReconnect(): void {
  if (reconnectAttempts >= RECONNECT_MAX_RETRIES) {
    updateConnectionState('offline');
    return;
  }

  updateConnectionState('reconnecting');
  const delay = getReconnectDelay();

  reconnectTimer = setTimeout(() => {
    reconnectAttempts++;
    connect();
  }, delay);
}

export function connect(): void {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  try {
    ws = new WebSocket(WS_URL);

    ws.on('open', () => {
      reconnectAttempts = 0;
      updateConnectionState('connected');
    });

    ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString()) as { type: string; data: unknown };

        if (parsed.type === 'new_message') {
          sendToRenderer(IPC_CHANNELS.NEW_MESSAGE, parsed.data);
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('pong', () => {
      clearHeartbeatCheck();
      startHeartbeatCheck();
    });

    ws.on('close', () => {
      clearHeartbeatCheck();
      ws = null;
      scheduleReconnect();
    });

    ws.on('error', () => {
      // Error will be followed by close event
    });

    // Start heartbeat monitoring once connected
    ws.on('open', () => {
      startHeartbeatCheck();
    });
  } catch {
    scheduleReconnect();
  }
}

export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  clearHeartbeatCheck();

  if (ws) {
    ws.close();
    ws = null;
  }

  reconnectAttempts = 0;
}

export function simulateDisconnect(): void {
  if (ws) {
    ws.terminate();
  }
}

export function getConnectionState(): ConnectionState {
  return currentState;
}
