import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../src/main/db/schema';
import { SecurityService } from '../../../src/main/security/SecurityService';
import * as queries from '../../../src/main/db/queries';

describe('Database Queries', () => {
  let db: Database.Database;
  const security = SecurityService.getInstance();

  beforeEach(() => {
    db = createTestDb();

    // Seed test data
    const insertChat = db.prepare(
      'INSERT INTO chats (id, title, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?)'
    );
    const insertMessage = db.prepare(
      'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)'
    );

    // Create 5 chats
    for (let i = 0; i < 5; i++) {
      insertChat.run(`chat-${i}`, `Chat ${i}`, 1000 + i * 100, i);
    }

    // Create 10 messages per chat
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 10; j++) {
        const body = security.encrypt(`Message ${j} in chat ${i}`);
        insertMessage.run(
          `msg-${i}-${j}`,
          `chat-${i}`,
          1000 + i * 100 + j * 10,
          `Sender${j % 3}`,
          body
        );
      }
    }
  });

  afterEach(() => {
    db.close();
  });

  describe('getChats', () => {
    it('should return chats sorted by lastMessageAt DESC', () => {
      const chats = queries.getChats(db, 0, 10);
      expect(chats).toHaveLength(5);
      expect(chats[0].title).toBe('Chat 4'); // highest lastMessageAt
      expect(chats[4].title).toBe('Chat 0'); // lowest lastMessageAt
    });

    it('should support pagination with offset and limit', () => {
      const page1 = queries.getChats(db, 0, 2);
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Chat 4');
      expect(page1[1].title).toBe('Chat 3');

      const page2 = queries.getChats(db, 2, 2);
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Chat 2');
      expect(page2[1].title).toBe('Chat 1');
    });

    it('should return empty array when offset exceeds data', () => {
      const chats = queries.getChats(db, 100, 10);
      expect(chats).toHaveLength(0);
    });

    it('should include unread counts', () => {
      const chats = queries.getChats(db, 0, 10);
      const chat4 = chats.find((c) => c.id === 'chat-4');
      expect(chat4?.unreadCount).toBe(4);
    });
  });

  describe('getMessages', () => {
    it('should return decrypted messages for a chat', () => {
      const messages = queries.getMessages(db, 'chat-0', Date.now(), 50);
      expect(messages).toHaveLength(10);
      expect(messages[0].body).toContain('Message');
      expect(messages[0].body).not.toContain('base64'); // Should be decrypted
    });

    it('should return messages before a given timestamp', () => {
      const messages = queries.getMessages(db, 'chat-0', 1050, 50);
      const allBefore = messages.every((m) => m.ts < 1050);
      expect(allBefore).toBe(true);
    });

    it('should limit results', () => {
      const messages = queries.getMessages(db, 'chat-0', Date.now(), 3);
      expect(messages).toHaveLength(3);
    });

    it('should return messages in DESC order (newest first)', () => {
      const messages = queries.getMessages(db, 'chat-0', Date.now(), 50);
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i - 1].ts).toBeGreaterThanOrEqual(messages[i].ts);
      }
    });

    it('should return empty array for non-existent chat', () => {
      const messages = queries.getMessages(db, 'non-existent', Date.now(), 50);
      expect(messages).toHaveLength(0);
    });
  });

  describe('searchMessages', () => {
    it('should find messages containing search term in a specific chat', () => {
      const results = queries.searchMessages(db, 'chat-0', 'Message 5', 50);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.chatId).toBe('chat-0');
        expect(r.body).toContain('Message 5');
      });
    });

    it('should search across all chats when chatId is null', () => {
      const results = queries.searchMessages(db, null, 'Message 3', 50);
      expect(results.length).toBeGreaterThan(0);
      const chatIds = new Set(results.map((r) => r.chatId));
      expect(chatIds.size).toBeGreaterThan(1);
    });

    it('should return empty results for non-matching query', () => {
      const results = queries.searchMessages(db, 'chat-0', 'zzz_no_match', 50);
      expect(results).toHaveLength(0);
    });

    it('should respect limit parameter', () => {
      const results = queries.searchMessages(db, null, 'Message', 3);
      expect(results).toHaveLength(3);
    });
  });

  describe('markChatRead', () => {
    it('should set unread count to 0', () => {
      queries.markChatRead(db, 'chat-4');
      const chats = queries.getChats(db, 0, 10);
      const chat4 = chats.find((c) => c.id === 'chat-4');
      expect(chat4?.unreadCount).toBe(0);
    });
  });

  describe('insertMessage', () => {
    it('should insert a new message and update chat', () => {
      const newMsg = {
        id: 'new-msg-1',
        chatId: 'chat-0',
        ts: Date.now(),
        sender: 'TestSender',
        body: 'New test message',
      };

      queries.insertMessage(db, newMsg);

      const messages = queries.getMessages(db, 'chat-0', Date.now() + 1, 50);
      const found = messages.find((m) => m.id === 'new-msg-1');
      expect(found).toBeDefined();
      expect(found?.body).toBe('New test message');
    });

    it('should increment unread count on chat', () => {
      const chatsBefore = queries.getChats(db, 0, 10);
      const chat0Before = chatsBefore.find((c) => c.id === 'chat-0');
      const unreadBefore = chat0Before?.unreadCount ?? 0;

      queries.insertMessage(db, {
        id: 'unread-msg',
        chatId: 'chat-0',
        ts: Date.now(),
        sender: 'Test',
        body: 'Unread message',
      });

      const chatsAfter = queries.getChats(db, 0, 10);
      const chat0After = chatsAfter.find((c) => c.id === 'chat-0');
      expect(chat0After?.unreadCount).toBe(unreadBefore + 1);
    });
  });

  describe('getRandomChat', () => {
    it('should return a valid chat', () => {
      const chat = queries.getRandomChat(db);
      expect(chat).toBeDefined();
      expect(chat?.id).toMatch(/^chat-\d$/);
    });
  });

  describe('getChatById', () => {
    it('should return the correct chat', () => {
      const chat = queries.getChatById(db, 'chat-2');
      expect(chat?.title).toBe('Chat 2');
    });

    it('should return undefined for non-existent chat', () => {
      const chat = queries.getChatById(db, 'non-existent');
      expect(chat).toBeUndefined();
    });
  });
});
