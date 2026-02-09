export const WS_PORT = 9876;
export const WS_URL = `ws://localhost:${WS_PORT}`;

export const CHATS_PAGE_SIZE = 50;
export const MESSAGES_PAGE_SIZE = 50;
export const SEARCH_RESULTS_LIMIT = 100;

export const TOTAL_CHATS = 200;
export const MESSAGES_PER_CHAT_MIN = 50;
export const MESSAGES_PER_CHAT_MAX = 200;

export const WS_EMIT_INTERVAL_MIN = 1000;
export const WS_EMIT_INTERVAL_MAX = 3000;

export const HEARTBEAT_INTERVAL = 5000;
export const HEARTBEAT_TIMEOUT = 10000;

export const RECONNECT_BASE_DELAY = 1000;
export const RECONNECT_MAX_DELAY = 30000;
export const RECONNECT_MAX_RETRIES = 10;

export const IPC_CHANNELS = {
  GET_CHATS: 'db:get-chats',
  MARK_CHAT_READ: 'db:mark-chat-read',
  GET_MESSAGES: 'db:get-messages',
  SEARCH_MESSAGES: 'db:search-messages',
  SEED_DATABASE: 'db:seed',
  SIMULATE_DISCONNECT: 'ws:simulate-disconnect',
  CONNECTION_STATE: 'ws:connection-state',
  NEW_MESSAGE: 'ws:new-message',
} as const;

export type ConnectionState = 'connected' | 'reconnecting' | 'offline';
