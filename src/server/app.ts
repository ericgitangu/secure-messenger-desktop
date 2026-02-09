import path from 'node:path';
import express from 'express';
import { getChats, markChatRead, getMessages, searchMessages } from '@main/db/queries';
import { seedDatabase } from '@main/db/seed';
import { getMetricsText } from '@main/metrics/MetricsCollector';
import { simulateDisconnect } from '@main/ws/server';
import type Database from 'better-sqlite3';

export function createApp(db: Database.Database): express.Application {
  const app = express();

  app.use(express.json());

  // --- REST API ---

  app.get('/api/chats', (req, res) => {
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const chats = getChats(db, offset, limit);
    res.json(chats);
  });

  app.put('/api/chats/:chatId/read', (req, res) => {
    markChatRead(db, req.params.chatId);
    res.json({ ok: true });
  });

  app.get('/api/messages', (req, res) => {
    const chatId = req.query.chatId as string;
    const beforeTs = parseInt(req.query.beforeTs as string) || Date.now() + 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = getMessages(db, chatId, beforeTs, limit);
    res.json(messages);
  });

  app.get('/api/messages/search', (req, res) => {
    const chatId = (req.query.chatId as string) || null;
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const results = searchMessages(db, chatId, query, limit);
    res.json(results);
  });

  app.post('/api/database/seed', (_req, res) => {
    const result = seedDatabase(db);
    res.json(result);
  });

  app.post('/api/connection/disconnect', (_req, res) => {
    simulateDisconnect();
    res.json({ ok: true });
  });

  // --- Prometheus metrics ---

  app.get('/metrics', async (_req, res) => {
    try {
      const text = await getMetricsText();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(text);
    } catch (err) {
      res.status(500).send('Error collecting metrics');
    }
  });

  // --- Static SPA fallback ---

  const rendererDir = path.resolve(__dirname, '../renderer');
  app.use(express.static(rendererDir));

  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(rendererDir, 'index.html'));
  });

  return app;
}
