export interface Chat {
  id: string;
  title: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface Message {
  id: string;
  chatId: string;
  ts: number;
  sender: string;
  body: string;
}

export interface NewMessageEvent {
  message: Message;
  chatId: string;
  chatTitle: string;
}
