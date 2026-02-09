import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import Database from 'better-sqlite3';
import { createTestDb } from '@main/db/schema';
import { seedDatabase } from '@main/db/seed';
import { startWsServer, stopWsServer } from '@main/ws/server';
import { WS_PORT } from '@shared/constants';

describe('WebSocket Sync Integration', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    seedDatabase(db);
  });

  afterEach(() => {
    stopWsServer();
    db.close();
  });

  it('should accept WebSocket connections', async () => {
    startWsServer(db);

    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => {
        resolve();
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    ws.close();
  });

  it('should send connection_state on connect', async () => {
    startWsServer(db);

    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    const message = await new Promise<string>((resolve, reject) => {
      ws.on('message', (data) => {
        resolve(data.toString());
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Message timeout')), 5000);
    });

    const parsed = JSON.parse(message);
    expect(parsed.type).toBe('connection_state');
    expect(parsed.data).toBe('connected');

    ws.close();
  });

  it('should emit new_message events with valid data', async () => {
    startWsServer(db);

    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    // Skip the first connection_state message
    const messages: string[] = [];

    const newMessage = await new Promise<unknown>((resolve, reject) => {
      ws.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        messages.push(data.toString());
        if (parsed.type === 'new_message') {
          resolve(parsed);
        }
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('No message received within 5s')), 5000);
    });

    const msg = newMessage as {
      type: string;
      data: {
        message: { id: string; chatId: string; ts: number; sender: string; body: string };
        chatId: string;
        chatTitle: string;
      };
    };
    expect(msg.type).toBe('new_message');
    expect(msg.data.message.id).toBeDefined();
    expect(msg.data.message.chatId).toBeDefined();
    expect(msg.data.message.ts).toBeGreaterThan(0);
    expect(msg.data.message.sender).toBeDefined();
    expect(msg.data.message.body).toBeDefined();
    expect(msg.data.chatId).toBe(msg.data.message.chatId);
    expect(msg.data.chatTitle).toBeDefined();

    ws.close();
  });

  it('should write new messages to the database', async () => {
    startWsServer(db);

    const initialCount = (
      db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }
    ).count;

    const ws = new WebSocket(`ws://localhost:${WS_PORT}`);

    // Wait for a new_message event
    await new Promise<void>((resolve, reject) => {
      ws.on('message', (data) => {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'new_message') {
          resolve();
        }
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('No message within 5s')), 5000);
    });

    const newCount = (
      db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number }
    ).count;
    expect(newCount).toBeGreaterThan(initialCount);

    ws.close();
  });
});
