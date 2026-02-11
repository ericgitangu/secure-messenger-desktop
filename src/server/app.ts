import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import {
  getChats,
  createChat,
  sendMessage,
  markChatRead,
  getMessages,
  searchMessages,
} from '@main/db/queries';
import { seedDatabase } from '@main/db/seed';
import { getMetricsText, ipcCallDuration } from '@main/metrics/MetricsCollector';
import { simulateDisconnect } from '@main/ws/server';
import type Database from 'better-sqlite3';

export function createApp(db: Database.Database): express.Application {
  const app = express();

  app.use(express.json());

  // --- REST API ---

  app.get('/api/chats', (req, res) => {
    const end = ipcCallDuration.startTimer({ channel: 'getChats' });
    const offset = parseInt(req.query.offset as string) || 0;
    const limit = parseInt(req.query.limit as string) || 50;
    const chats = getChats(db, offset, limit);
    end();
    res.json(chats);
  });

  app.post('/api/chats', (req, res) => {
    const end = ipcCallDuration.startTimer({ channel: 'createChat' });
    const { title } = req.body as { title: string };
    if (!title || typeof title !== 'string') {
      end();
      res.status(400).json({ error: 'title is required' });
      return;
    }
    const id = crypto.randomUUID();
    const chat = createChat(db, id, title.trim());
    end();
    res.status(201).json(chat);
  });

  app.put('/api/chats/:chatId/read', (req, res) => {
    markChatRead(db, req.params.chatId);
    res.json({ ok: true });
  });

  app.get('/api/messages', (req, res) => {
    const end = ipcCallDuration.startTimer({ channel: 'getMessages' });
    const chatId = req.query.chatId as string;
    const beforeTs = parseInt(req.query.beforeTs as string) || Date.now() + 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = getMessages(db, chatId, beforeTs, limit);
    end();
    res.json(messages);
  });

  app.post('/api/messages', (req, res) => {
    const end = ipcCallDuration.startTimer({ channel: 'sendMessage' });
    const { chatId, body } = req.body as { chatId: string; body: string };
    if (!chatId || !body || typeof chatId !== 'string' || typeof body !== 'string') {
      end();
      res.status(400).json({ error: 'chatId and body are required' });
      return;
    }
    const message = sendMessage(db, chatId, body.trim());
    end();
    res.status(201).json(message);
  });

  app.get('/api/messages/search', (req, res) => {
    const end = ipcCallDuration.startTimer({ channel: 'searchMessages' });
    const chatId = (req.query.chatId as string) || null;
    const query = req.query.query as string;
    const limit = parseInt(req.query.limit as string) || 100;
    const results = searchMessages(db, chatId, query, limit);
    end();
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

  // --- Health check ---

  const startedAt = Date.now();

  app.get('/health', (_req, res) => {
    try {
      db.prepare('SELECT 1').get();
      res.json({
        status: 'ok',
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        status: 'error',
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        timestamp: new Date().toISOString(),
      });
    }
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

  // --- Swagger UI ---

  const openapiPath = path.resolve(__dirname, '../docs/openapi.yaml');
  if (fs.existsSync(openapiPath)) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const yaml = require('js-yaml') as typeof import('js-yaml');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const swaggerUi = require('swagger-ui-express') as typeof import('swagger-ui-express');
      const openapiDoc = yaml.load(fs.readFileSync(openapiPath, 'utf8')) as Record<string, unknown>;
      app.use('/swagger', swaggerUi.serve, swaggerUi.setup(openapiDoc));
    } catch {
      // graceful skip — modules may not be available in Electron dev mode
    }
  }

  // --- Static SPA fallback ---

  const rendererDir = path.resolve(__dirname, '../renderer');
  const indexHtml = path.join(rendererDir, 'index.html');

  if (fs.existsSync(indexHtml)) {
    app.use(express.static(rendererDir));

    app.get('/{*path}', (_req, res) => {
      res.sendFile(indexHtml);
    });
  }

  return app;
}
