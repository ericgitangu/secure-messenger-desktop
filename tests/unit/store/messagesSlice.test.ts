import { describe, it, expect } from 'vitest';
import messagesReducer, {
  addMessage,
  clearMessages,
  clearSearch,
} from '../../../src/renderer/store/messagesSlice';

describe('messagesSlice', () => {
  const initialState = {
    items: [],
    loading: false,
    hasOlder: true,
    searchResults: [],
    searchQuery: '',
    searching: false,
  };

  it('should return the initial state', () => {
    expect(messagesReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  describe('addMessage', () => {
    it('should add a message to the items array', () => {
      const message = {
        id: 'msg-1',
        chatId: 'chat-1',
        ts: Date.now(),
        sender: 'Alice',
        body: 'Hello!',
      };
      const next = messagesReducer(initialState, addMessage(message));
      expect(next.items).toHaveLength(1);
      expect(next.items[0]).toEqual(message);
    });

    it('should append to existing messages', () => {
      const existing = {
        ...initialState,
        items: [
          { id: 'msg-0', chatId: 'chat-1', ts: 1000, sender: 'Bob', body: 'Hi' },
        ],
      };
      const newMsg = {
        id: 'msg-1',
        chatId: 'chat-1',
        ts: 2000,
        sender: 'Alice',
        body: 'Hello!',
      };
      const next = messagesReducer(existing, addMessage(newMsg));
      expect(next.items).toHaveLength(2);
      expect(next.items[1].id).toBe('msg-1');
    });
  });

  describe('clearMessages', () => {
    it('should clear all messages and reset hasOlder', () => {
      const state = {
        ...initialState,
        items: [
          { id: 'msg-0', chatId: 'chat-1', ts: 1000, sender: 'Bob', body: 'Hi' },
        ],
        hasOlder: false,
      };
      const next = messagesReducer(state, clearMessages());
      expect(next.items).toHaveLength(0);
      expect(next.hasOlder).toBe(true);
    });
  });

  describe('clearSearch', () => {
    it('should clear search results and query', () => {
      const state = {
        ...initialState,
        searchResults: [
          { id: 'msg-0', chatId: 'chat-1', ts: 1000, sender: 'Bob', body: 'matched' },
        ],
        searchQuery: 'matched',
      };
      const next = messagesReducer(state, clearSearch());
      expect(next.searchResults).toHaveLength(0);
      expect(next.searchQuery).toBe('');
    });
  });
});
