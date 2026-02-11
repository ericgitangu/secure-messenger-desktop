import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { builtinModules } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nativeExternals = [
  'better-sqlite3',
  'ws',
  'bufferutil',
  'utf-8-validate',
  'prom-client',
  'express',
  'electron',
  'swagger-ui-express',
  'js-yaml',
];

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@server': path.resolve(__dirname, 'src/server'),
    },
  },
  build: {
    ssr: 'src/server/index.ts',
    outDir: 'dist/server',
    emptyOutDir: true,
    rollupOptions: {
      external: [
        ...nativeExternals,
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
      output: {
        entryFileNames: 'index.cjs',
        format: 'cjs',
      },
    },
  },
});
