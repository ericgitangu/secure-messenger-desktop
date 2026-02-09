import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { createTestDb } from '../../../src/main/db/schema';
import { seedDatabase } from '../../../src/main/db/seed';
import { TOTAL_CHATS, MESSAGES_PER_CHAT_MIN } from '../../../src/shared/constants';

describe('Database Seeding', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('should seed the correct number of chats', () => {
    const result = seedDatabase(db);
    expect(result.chats).toBe(TOTAL_CHATS);

    const count = db.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number };
    expect(count.count).toBe(TOTAL_CHATS);
  });

  it('should seed messages for every chat', () => {
    seedDatabase(db);

    const chats = db.prepare('SELECT id FROM chats').all() as { id: string }[];
    for (const chat of chats) {
      const msgCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE chatId = ?').get(chat.id) as { count: number };
      expect(msgCount.count).toBeGreaterThanOrEqual(MESSAGES_PER_CHAT_MIN);
    }
  });

  it('should generate a large number of total messages', () => {
    const result = seedDatabase(db);
    expect(result.messages).toBeGreaterThan(TOTAL_CHATS * MESSAGES_PER_CHAT_MIN);
  });

  it('should store encrypted message bodies (not plaintext)', () => {
    seedDatabase(db);

    const msg = db.prepare('SELECT body FROM messages LIMIT 1').get() as { body: string };
    // Body should be AES-256-GCM encrypted — not readable plaintext
    expect(msg.body).toBeTruthy();
    // Encrypted body should not contain common English words in plaintext
    expect(msg.body).not.toMatch(/\b(the|and|message|hello|review)\b/i);
  });

  it('should not re-seed if data already exists', () => {
    const result1 = seedDatabase(db);
    expect(result1.messages).toBeGreaterThan(0);

    const result2 = seedDatabase(db);
    expect(result2.messages).toBe(0); // should skip seeding
    expect(result2.chats).toBe(TOTAL_CHATS);
  });

  it('should set valid timestamps for all messages', () => {
    seedDatabase(db);

    const messages = db.prepare('SELECT ts FROM messages').all() as { ts: number }[];
    for (const msg of messages) {
      expect(msg.ts).toBeGreaterThan(0);
      expect(msg.ts).toBeLessThanOrEqual(Date.now() + 60000);
    }
  });

  it('should set lastMessageAt for each chat', () => {
    seedDatabase(db);

    const chats = db.prepare('SELECT lastMessageAt FROM chats').all() as { lastMessageAt: number }[];
    for (const chat of chats) {
      expect(chat.lastMessageAt).toBeGreaterThan(0);
    }
  });
});
