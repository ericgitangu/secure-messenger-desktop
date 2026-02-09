import path from 'node:path';
import fs from 'node:fs';
import Database from 'better-sqlite3';

let db: Database.Database | null = null;

function getElectronUserDataPath(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electron = require('electron') as { app?: { getPath?: (name: string) => string } };
    return electron.app?.getPath?.('userData') ?? null;
  } catch {
    return null;
  }
}

export function getDbPath(): string {
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }
  const userDataPath = getElectronUserDataPath() ?? path.join(process.cwd(), '.data');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'messenger.db');
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  db = new Database(dbPath);

  // Enable WAL mode for concurrent reads
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  initSchema(db);
  return db;
}

export function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      lastMessageAt INTEGER NOT NULL,
      unreadCount INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chatId TEXT NOT NULL,
      ts INTEGER NOT NULL,
      sender TEXT NOT NULL,
      body TEXT NOT NULL,
      FOREIGN KEY (chatId) REFERENCES chats(id)
    );

    CREATE INDEX IF NOT EXISTS idx_chats_last_message ON chats(lastMessageAt DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_ts ON messages(chatId, ts DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_body ON messages(body);
  `);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** For testing — create an in-memory database with schema */
export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  initSchema(testDb);
  return testDb;
}
