import type { Chat, Message, NewMessageEvent } from './models';
import type { ConnectionState } from '../../shared/constants';

export interface ElectronAPI {
  getChats(offset: number, limit: number): Promise<Chat[]>;
  markChatRead(chatId: string): Promise<void>;
  getMessages(chatId: string, beforeTs: number, limit: number): Promise<Message[]>;
  searchMessages(chatId: string | null, query: string, limit: number): Promise<Message[]>;
  seedDatabase(): Promise<void>;
  simulateDisconnect(): void;
  onConnectionState(cb: (state: ConnectionState) => void): () => void;
  onNewMessage(cb: (msg: NewMessageEvent) => void): () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
