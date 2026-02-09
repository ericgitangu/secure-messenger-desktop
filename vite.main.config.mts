import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Node.js native/C++ addon modules that must not be bundled by Vite
const nativeExternals = [
  'better-sqlite3',
  'ws',
  'bufferutil',
  'utf-8-validate',
  'prom-client',
  'express',
  'electron',
];

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    rollupOptions: {
      external: [
        ...nativeExternals,
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
  },
});
