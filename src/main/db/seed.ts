import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { SecurityService } from '../security/SecurityService';
import {
  TOTAL_CHATS,
  MESSAGES_PER_CHAT_MIN,
  MESSAGES_PER_CHAT_MAX,
} from '../../shared/constants';

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
  'Iris', 'Jack', 'Karen', 'Leo', 'Mia', 'Noah', 'Olivia', 'Paul',
  'Quinn', 'Rose', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
  'Yara', 'Zane', 'Amara', 'Björn', 'Chiara', 'Dmitri', 'Elif', 'Fatima',
  'Gustav', 'Hana', 'Ibrahim', 'Jing', 'Kai', 'Lena', 'Marco', 'Nadia',
];

const CHAT_PREFIXES = [
  'Project', 'Team', 'Design', 'Engineering', 'Marketing', 'Sales',
  'Support', 'Product', 'Security', 'DevOps', 'Frontend', 'Backend',
  'Mobile', 'QA', 'Research', 'Analytics', 'Infrastructure', 'Platform',
];

const CHAT_SUFFIXES = [
  'Standup', 'Review', 'Planning', 'Retro', 'Sync', 'Updates',
  'Discussion', 'Channel', 'Hub', 'Room', 'Thread', 'Group',
];

const MESSAGE_TEMPLATES = [
  'Hey, has anyone looked at the latest PR?',
  'I just pushed a fix for the authentication issue.',
  'Can we schedule a meeting to discuss the architecture?',
  'The deployment pipeline is running smoothly now.',
  'I found a potential security vulnerability in the API.',
  'Great work on the new feature! Looks clean.',
  'Does anyone have experience with WebSocket reconnection strategies?',
  'The test suite is passing on all environments.',
  'We need to optimize the database queries for better performance.',
  'I updated the documentation with the new API endpoints.',
  'The client reported a bug in the message sync feature.',
  'Let me share my screen to walk through the implementation.',
  'I think we should use Redux Toolkit for the state management.',
  'The Electron build is ready for testing.',
  'Can someone review my changes to the encryption module?',
  'The virtualized list is rendering smoothly with 10K+ items.',
  'I added indexes to improve the SQLite query performance.',
  'The WebSocket connection drops every 30 seconds. Investigating.',
  'Good morning team! What are we working on today?',
  'I finished implementing the search functionality.',
  'The CI pipeline caught a TypeScript error in the preload script.',
  'We should add integration tests for the IPC bridge.',
  'The message history loads instantly with pagination.',
  'I refactored the connection state machine to handle edge cases.',
  'The dark mode theme looks great with MUI components.',
  'Reminder: code freeze is tomorrow at 5 PM.',
  'I created a Pact contract test for the WebSocket events.',
  'The voice search feature is working perfectly in Electron.',
  'Let me know when the PR is ready for merge.',
  'I optimized the message list with react-virtuoso.',
  'The security audit passed with zero critical findings.',
  'Can we add better error handling for offline scenarios?',
  'I benchmarked better-sqlite3 vs sql.js — 5x faster reads.',
  'The unread count badge updates correctly on new messages.',
  'I set up Husky hooks for pre-commit linting.',
  'The Docker build is working for headless testing.',
  'We should document the architecture decisions in the README.',
  'The exponential backoff reconnection is working as expected.',
  'I added WAL mode to SQLite for concurrent reads.',
  'The message encryption boundary is clean and testable.',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateChatTitle(index: number): string {
  if (index < FIRST_NAMES.length) {
    return FIRST_NAMES[index];
  }
  return `${randomElement(CHAT_PREFIXES)} ${randomElement(CHAT_SUFFIXES)}`;
}

function generateSender(): string {
  return randomElement(FIRST_NAMES);
}

function generateMessageBody(): string {
  return randomElement(MESSAGE_TEMPLATES);
}

export function seedDatabase(database: Database.Database): { chats: number; messages: number } {
  const security = SecurityService.getInstance();

  const existingChats = database.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number };
  if (existingChats.count > 0) {
    return { chats: existingChats.count, messages: 0 };
  }

  const insertChat = database.prepare(
    'INSERT INTO chats (id, title, lastMessageAt, unreadCount) VALUES (?, ?, ?, ?)'
  );

  const insertMessage = database.prepare(
    'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)'
  );

  let totalMessages = 0;
  const now = Date.now();

  const updateChatTs = database.prepare(
    'UPDATE chats SET lastMessageAt = ? WHERE id = ?'
  );

  const seedAll = database.transaction(() => {
    for (let i = 0; i < TOTAL_CHATS; i++) {
      const chatId = uuidv4();
      const title = generateChatTitle(i);
      const messageCount = randomInt(MESSAGES_PER_CHAT_MIN, MESSAGES_PER_CHAT_MAX);
      const unreadCount = randomInt(0, Math.min(10, messageCount));

      // Insert chat first (FK constraint: messages reference chats)
      insertChat.run(chatId, title, 0, unreadCount);

      // Generate messages with timestamps spread over the past 7 days
      const chatStartTime = now - 7 * 24 * 60 * 60 * 1000;
      let lastTs = 0;

      for (let j = 0; j < messageCount; j++) {
        const ts = chatStartTime + Math.floor((j / messageCount) * (now - chatStartTime)) + randomInt(0, 60000);
        const sender = generateSender();
        const body = security.encrypt(generateMessageBody());
        const msgId = uuidv4();

        insertMessage.run(msgId, chatId, ts, sender, body);
        lastTs = Math.max(lastTs, ts);
        totalMessages++;
      }

      // Update chat with actual lastMessageAt
      updateChatTs.run(lastTs, chatId);
    }
  });

  seedAll();

  return { chats: TOTAL_CHATS, messages: totalMessages };
}
