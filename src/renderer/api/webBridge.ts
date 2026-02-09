import { WS_PORT } from '@shared/constants';
import type { ElectronAPI } from '../types/ipc';
import type { ConnectionState } from '@shared/constants';
import type { NewMessageEvent } from '../types/models';

/**
 * Browser-based implementation of ElectronAPI.
 * Uses fetch() for data queries and browser WebSocket for real-time events.
 */
export function createWebBridge(): ElectronAPI {
  const connectionListeners = new Set<(state: ConnectionState) => void>();
  const messageListeners = new Set<(msg: NewMessageEvent) => void>();

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = 1000;

  function connectWs() {
    const wsHost = window.location.hostname || 'localhost';
    const wsUrl = `ws://${wsHost}:${WS_PORT}`;

    try {
      ws = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectDelay = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as {
          type: string;
          data: ConnectionState | NewMessageEvent;
        };
        if (parsed.type === 'connection_state') {
          connectionListeners.forEach((cb) => cb(parsed.data as ConnectionState));
        } else if (parsed.type === 'new_message') {
          messageListeners.forEach((cb) => cb(parsed.data as NewMessageEvent));
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      connectionListeners.forEach((cb) => cb('reconnecting'));
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
      connectWs();
    }, reconnectDelay);
  }

  // Start WebSocket connection
  connectWs();

  const api: ElectronAPI = {
    async getChats(offset: number, limit: number) {
      const res = await fetch(`/api/chats?offset=${offset}&limit=${limit}`);
      return res.json();
    },

    async markChatRead(chatId: string) {
      await fetch(`/api/chats/${encodeURIComponent(chatId)}/read`, { method: 'PUT' });
    },

    async getMessages(chatId: string, beforeTs: number, limit: number) {
      const res = await fetch(
        `/api/messages?chatId=${encodeURIComponent(chatId)}&beforeTs=${beforeTs}&limit=${limit}`,
      );
      return res.json();
    },

    async searchMessages(chatId: string | null, query: string, limit: number) {
      const params = new URLSearchParams({ query, limit: String(limit) });
      if (chatId) params.set('chatId', chatId);
      const res = await fetch(`/api/messages/search?${params.toString()}`);
      return res.json();
    },

    async seedDatabase() {
      await fetch('/api/database/seed', { method: 'POST' });
    },

    simulateDisconnect() {
      void fetch('/api/connection/disconnect', { method: 'POST' });
    },

    onConnectionState(cb: (state: ConnectionState) => void) {
      connectionListeners.add(cb);
      return () => {
        connectionListeners.delete(cb);
      };
    },

    onNewMessage(cb: (msg: NewMessageEvent) => void) {
      messageListeners.add(cb);
      return () => {
        messageListeners.delete(cb);
      };
    },
  };

  return api;
}
