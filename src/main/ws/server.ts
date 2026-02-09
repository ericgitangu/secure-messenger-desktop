import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  WS_PORT,
  WS_EMIT_INTERVAL_MIN,
  WS_EMIT_INTERVAL_MAX,
  HEARTBEAT_INTERVAL,
} from '@shared/constants';
import { getRandomChat, insertMessage } from '../db/queries';
import type Database from 'better-sqlite3';

const SENDERS = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
const MESSAGES = [
  'Just finished the code review',
  'Can you check the latest commit?',
  'The build is passing now',
  'Meeting in 5 minutes',
  'Great progress on the sprint',
  'I updated the documentation',
  'Found an edge case in the tests',
  'The deployment was successful',
  'Let me know your thoughts',
  'I will investigate the issue',
  'Pushed a hotfix for the bug',
  'The performance metrics look good',
  'Can we pair on this tomorrow?',
  'I created a PR for review',
  'The feature flag is enabled',
];

let wss: WebSocketServer | null = null;
let emitTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function scheduleNextMessage(db: Database.Database): void {
  const delay = randomInt(WS_EMIT_INTERVAL_MIN, WS_EMIT_INTERVAL_MAX);

  emitTimer = setTimeout(() => {
    if (!wss) return;

    const chat = getRandomChat(db);
    if (!chat) {
      scheduleNextMessage(db);
      return;
    }

    const message = {
      id: uuidv4(),
      chatId: chat.id,
      ts: Date.now(),
      sender: randomElement(SENDERS),
      body: randomElement(MESSAGES),
    };

    // Write to DB
    insertMessage(db, message);

    // Broadcast to all connected clients
    const payload = JSON.stringify({
      type: 'new_message',
      data: {
        message,
        chatId: chat.id,
        chatTitle: chat.title,
      },
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    scheduleNextMessage(db);
  }, delay);
}

export function startWsServer(db: Database.Database): WebSocketServer {
  wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws) => {
    // Send initial connection state
    ws.send(JSON.stringify({ type: 'connection_state', data: 'connected' }));

    ws.on('pong', () => {
      (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    });

    (ws as WebSocket & { isAlive: boolean }).isAlive = true;
  });

  // Heartbeat — ping clients every HEARTBEAT_INTERVAL
  heartbeatTimer = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      const client = ws as WebSocket & { isAlive: boolean };
      if (!client.isAlive) {
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, HEARTBEAT_INTERVAL);

  // Start emitting messages
  scheduleNextMessage(db);

  return wss;
}

export function stopWsServer(): void {
  if (emitTimer) {
    clearTimeout(emitTimer);
    emitTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (wss) {
    wss.close();
    wss = null;
  }
}

export function simulateDisconnect(): void {
  if (!wss) return;

  // Close all client connections to simulate a server drop
  wss.clients.forEach((client) => {
    client.close();
  });
}
