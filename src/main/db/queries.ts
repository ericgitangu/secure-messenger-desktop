import Database from 'better-sqlite3';
import { SecurityService } from '../security/SecurityService';

export interface ChatRow {
  id: string;
  title: string;
  lastMessageAt: number;
  unreadCount: number;
}

export interface MessageRow {
  id: string;
  chatId: string;
  ts: number;
  sender: string;
  body: string;
}

export function getChats(db: Database.Database, offset: number, limit: number): ChatRow[] {
  const stmt = db.prepare(
    'SELECT id, title, lastMessageAt, unreadCount FROM chats ORDER BY lastMessageAt DESC LIMIT ? OFFSET ?'
  );
  return stmt.all(limit, offset) as ChatRow[];
}

export function markChatRead(db: Database.Database, chatId: string): void {
  const stmt = db.prepare('UPDATE chats SET unreadCount = 0 WHERE id = ?');
  stmt.run(chatId);
}

export function getMessages(
  db: Database.Database,
  chatId: string,
  beforeTs: number,
  limit: number
): MessageRow[] {
  const security = SecurityService.getInstance();
  const stmt = db.prepare(
    'SELECT id, chatId, ts, sender, body FROM messages WHERE chatId = ? AND ts < ? ORDER BY ts DESC LIMIT ?'
  );
  const rows = stmt.all(chatId, beforeTs, limit) as MessageRow[];

  return rows.map((row) => ({
    ...row,
    body: security.decrypt(row.body),
  }));
}

/**
 * Search messages by decrypting and matching in-memory.
 *
 * Since message bodies are encrypted at rest, SQL LIKE cannot search
 * plaintext content directly. We fetch candidates from the DB and
 * filter after decryption. In production, this would use FTS5 on a
 * separate plaintext index (encrypted at the filesystem level) or
 * searchable encryption schemes.
 */
export function searchMessages(
  db: Database.Database,
  chatId: string | null,
  query: string,
  limit: number
): MessageRow[] {
  const security = SecurityService.getInstance();
  const lowerQuery = query.toLowerCase();

  let stmt: Database.Statement;
  let rows: MessageRow[];

  if (chatId) {
    stmt = db.prepare(
      'SELECT id, chatId, ts, sender, body FROM messages WHERE chatId = ? ORDER BY ts DESC'
    );
    rows = stmt.all(chatId) as MessageRow[];
  } else {
    stmt = db.prepare(
      'SELECT id, chatId, ts, sender, body FROM messages ORDER BY ts DESC'
    );
    rows = stmt.all() as MessageRow[];
  }

  const results: MessageRow[] = [];
  for (const row of rows) {
    const decryptedBody = security.decrypt(row.body);
    if (decryptedBody.toLowerCase().includes(lowerQuery)) {
      results.push({ ...row, body: decryptedBody });
      if (results.length >= limit) break;
    }
  }

  return results;
}

export function insertMessage(
  db: Database.Database,
  message: { id: string; chatId: string; ts: number; sender: string; body: string }
): void {
  const security = SecurityService.getInstance();
  const encryptedBody = security.encrypt(message.body);

  const insertMsg = db.prepare(
    'INSERT INTO messages (id, chatId, ts, sender, body) VALUES (?, ?, ?, ?, ?)'
  );
  insertMsg.run(message.id, message.chatId, message.ts, message.sender, encryptedBody);

  const updateChat = db.prepare(
    'UPDATE chats SET lastMessageAt = MAX(lastMessageAt, ?), unreadCount = unreadCount + 1 WHERE id = ?'
  );
  updateChat.run(message.ts, message.chatId);
}

export function getRandomChat(db: Database.Database): ChatRow | undefined {
  const stmt = db.prepare(
    'SELECT id, title, lastMessageAt, unreadCount FROM chats ORDER BY RANDOM() LIMIT 1'
  );
  return stmt.get() as ChatRow | undefined;
}

export function getChatById(db: Database.Database, chatId: string): ChatRow | undefined {
  const stmt = db.prepare(
    'SELECT id, title, lastMessageAt, unreadCount FROM chats WHERE id = ?'
  );
  return stmt.get(chatId) as ChatRow | undefined;
}
