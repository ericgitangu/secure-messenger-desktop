import path from 'node:path';
import { app, BrowserWindow, ipcMain, session } from 'electron';
import started from 'electron-squirrel-startup';
import { getDb, closeDb } from './main/db/schema';
import { seedDatabase } from './main/db/seed';
import * as queries from './main/db/queries';
import {
  startWsServer,
  stopWsServer,
  simulateDisconnect as serverSimulateDisconnect,
} from './main/ws/server';
import {
  connect as clientConnect,
  disconnect as clientDisconnect,
  simulateDisconnect as clientSimulateDisconnect,
} from './main/ws/client';
import { IPC_CHANNELS } from './shared/constants';
import { createApp } from './server/app';

if (started) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Secure Messenger Desktop',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

function registerIpcHandlers(): void {
  const db = getDb();

  ipcMain.handle(IPC_CHANNELS.GET_CHATS, (_event, offset: number, limit: number) => {
    return queries.getChats(db, offset, limit);
  });

  ipcMain.handle(IPC_CHANNELS.MARK_CHAT_READ, (_event, chatId: string) => {
    queries.markChatRead(db, chatId);
  });

  ipcMain.handle(
    IPC_CHANNELS.GET_MESSAGES,
    (_event, chatId: string, beforeTs: number, limit: number) => {
      return queries.getMessages(db, chatId, beforeTs, limit);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SEARCH_MESSAGES,
    (_event, chatId: string | null, query: string, limit: number) => {
      return queries.searchMessages(db, chatId, query, limit);
    },
  );

  ipcMain.handle(IPC_CHANNELS.SEED_DATABASE, () => {
    return seedDatabase(db);
  });

  ipcMain.on(IPC_CHANNELS.SIMULATE_DISCONNECT, () => {
    serverSimulateDisconnect();
    clientSimulateDisconnect();
  });
}

app.on('ready', () => {
  // Set Content-Security-Policy — relaxed in dev to allow Vite HMR
  const isDev = !!MAIN_WINDOW_VITE_DEV_SERVER_URL;
  const csp = isDev
    ? "default-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:* http://localhost:*; style-src 'self' 'unsafe-inline'"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://localhost:9876";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  const db = getDb();

  // Seed database on first launch
  seedDatabase(db);

  // Register IPC handlers
  registerIpcHandlers();

  // Start WebSocket server
  startWsServer(db);

  // Start Express server for metrics endpoint (Prometheus scrapes :3000/metrics)
  const expressApp = createApp(db);
  const HTTP_PORT = parseInt(process.env.HTTP_PORT ?? '3000', 10);
  expressApp.listen(HTTP_PORT, '0.0.0.0', () => {
    // Express server running for metrics + API
  });

  // Start WebSocket client (connects to our own server)
  clientConnect();

  // Create window
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  clientDisconnect();
  stopWsServer();
  closeDb();
});
