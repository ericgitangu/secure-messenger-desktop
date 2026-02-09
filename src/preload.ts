import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './shared/constants';
import type { ConnectionState } from './shared/constants';

export interface ElectronAPI {
  getChats(offset: number, limit: number): Promise<unknown[]>;
  markChatRead(chatId: string): Promise<void>;
  getMessages(chatId: string, beforeTs: number, limit: number): Promise<unknown[]>;
  searchMessages(chatId: string | null, query: string, limit: number): Promise<unknown[]>;
  seedDatabase(): Promise<void>;
  simulateDisconnect(): void;
  onConnectionState(cb: (state: ConnectionState) => void): () => void;
  onNewMessage(cb: (msg: unknown) => void): () => void;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getChats: (offset: number, limit: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_CHATS, offset, limit),

  markChatRead: (chatId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MARK_CHAT_READ, chatId),

  getMessages: (chatId: string, beforeTs: number, limit: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MESSAGES, chatId, beforeTs, limit),

  searchMessages: (chatId: string | null, query: string, limit: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEARCH_MESSAGES, chatId, query, limit),

  seedDatabase: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SEED_DATABASE),

  simulateDisconnect: () =>
    ipcRenderer.send(IPC_CHANNELS.SIMULATE_DISCONNECT),

  onConnectionState: (cb: (state: ConnectionState) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: ConnectionState) => cb(state);
    ipcRenderer.on(IPC_CHANNELS.CONNECTION_STATE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.CONNECTION_STATE, handler);
    };
  },

  onNewMessage: (cb: (msg: unknown) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, msg: unknown) => cb(msg);
    ipcRenderer.on(IPC_CHANNELS.NEW_MESSAGE, handler);
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.NEW_MESSAGE, handler);
    };
  },
} satisfies ElectronAPI);
