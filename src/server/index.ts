/* eslint-disable no-console */
import { getDb } from '../main/db/schema';
import { seedDatabase } from '../main/db/seed';
import { startWsServer } from '../main/ws/server';
import { createApp } from './app';

const PORT = parseInt(process.env.PORT ?? '3000', 10);

function main(): void {
  // Initialize database
  const db = getDb();
  console.log('[server] Database initialized');

  // Seed data if empty
  const seedResult = seedDatabase(db);
  if (seedResult.messages > 0) {
    console.log(`[server] Seeded ${seedResult.chats} chats, ${seedResult.messages} messages`);
  } else {
    console.log(`[server] Database already seeded (${seedResult.chats} chats)`);
  }

  // Start WebSocket server (port 9876)
  startWsServer(db);
  console.log('[server] WebSocket server started on :9876');

  // Start Express HTTP server
  const app = createApp(db);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] HTTP server started on :${PORT}`);
    console.log(`[server] Open http://localhost:${PORT} in your browser`);
  });
}

main();
