import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/** Solo en `vite dev`: sirve el conjunto real local (git-ignorado). Nunca entra al build de producción. */
function privateData(): Plugin {
  return {
    name: 'incimmet-private-data',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__private/dataset.real.json', (_req, res) => {
        const p = path.resolve(process.cwd(), 'private/out/dataset.real.json');
        if (!fs.existsSync(p)) { res.statusCode = 404; res.end('{}'); return; }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        fs.createReadStream(p).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), privateData()],
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'], passWithNoTests: true },
});
