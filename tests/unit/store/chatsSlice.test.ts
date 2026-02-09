import { describe, it, expect } from 'vitest';
import chatsReducer, {
  selectChat,
  updateChatLastMessage,
  resetChats,
} from '@renderer/store/chatsSlice';

describe('chatsSlice', () => {
  const initialState = {
    items: [],
    selectedChatId: null,
    loading: false,
    hasMore: true,
    offset: 0,
  };

  const stateWithChats = {
    ...initialState,
    items: [
      { id: 'chat-1', title: 'Alice', lastMessageAt: 3000, unreadCount: 2 },
      { id: 'chat-2', title: 'Bob', lastMessageAt: 2000, unreadCount: 0 },
      { id: 'chat-3', title: 'Charlie', lastMessageAt: 1000, unreadCount: 5 },
    ],
  };

  it('should return the initial state', () => {
    expect(chatsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('selectChat', () => {
    it('should set the selected chat ID', () => {
      const next = chatsReducer(stateWithChats, selectChat('chat-2'));
      expect(next.selectedChatId).toBe('chat-2');
    });
  });

  describe('updateChatLastMessage', () => {
    it('should update lastMessageAt and re-sort', () => {
      const next = chatsReducer(
        stateWithChats,
        updateChatLastMessage({ chatId: 'chat-3', ts: 5000, incrementUnread: false }),
      );
      expect(next.items[0].id).toBe('chat-3'); // Now first (highest ts)
      expect(next.items[0].lastMessageAt).toBe(5000);
    });

    it('should increment unread count when chat is not selected', () => {
      const next = chatsReducer(
        stateWithChats,
        updateChatLastMessage({ chatId: 'chat-2', ts: 4000, incrementUnread: true }),
      );
      const chat2 = next.items.find((c) => c.id === 'chat-2');
      expect(chat2?.unreadCount).toBe(1);
    });

    it('should NOT increment unread count when chat is selected', () => {
      const withSelected = { ...stateWithChats, selectedChatId: 'chat-2' };
      const next = chatsReducer(
        withSelected,
        updateChatLastMessage({ chatId: 'chat-2', ts: 4000, incrementUnread: true }),
      );
      const chat2 = next.items.find((c) => c.id === 'chat-2');
      expect(chat2?.unreadCount).toBe(0); // unchanged
    });
  });

  describe('resetChats', () => {
    it('should clear all chat state', () => {
      const next = chatsReducer(stateWithChats, resetChats());
      expect(next.items).toHaveLength(0);
      expect(next.offset).toBe(0);
      expect(next.hasMore).toBe(true);
      expect(next.selectedChatId).toBeNull();
    });
  });
});
