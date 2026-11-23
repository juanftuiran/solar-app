import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  MAX_BODY_BYTES,
  processSolarmanRequest,
  resolveAllowedOrigin,
  verifySupabaseJwt,
} from './api/solarman.js';

function solarmanLocalProxyPlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/solarman', (req, res, next) => {
      const allowedOrigin = resolveAllowedOrigin(req.headers?.origin, req.headers?.host);
      if (allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
      }
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        if (req.headers?.origin && !allowedOrigin) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, msg: 'Origen no permitido.' }));
          return;
        }
        res.statusCode = 200;
        res.end();
        return;
      }

      if (req.headers?.origin && !allowedOrigin) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, msg: 'Origen no permitido.' }));
        return;
      }

      if (req.method !== 'POST') {
        next();
        return;
      }

      const contentLength = Number(req.headers?.['content-length'] || 0);
      if (contentLength > MAX_BODY_BYTES) {
        res.statusCode = 413;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, msg: 'Payload excede el límite de 64 KB.' }));
        req.destroy();
        return;
      }

      const chunks = [];
      let byteCount = 0;
      let aborted = false;

      req.on('data', (chunk) => {
        if (aborted) return;
        byteCount += chunk.length;
        if (byteCount > MAX_BODY_BYTES) {
          aborted = true;
          res.statusCode = 413;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, msg: 'Payload excede el límite de 64 KB.' }));
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });

      req.on('end', async () => {
        if (aborted) return;
        try {
          const authCheck = await verifySupabaseJwt(req.headers?.authorization);
          if (!authCheck.ok) {
            res.statusCode = authCheck.status || 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, msg: authCheck.msg }));
            return;
          }

          const raw = Buffer.concat(chunks).toString('utf8');
          const body = raw ? JSON.parse(raw) : {};
          const result = await processSolarmanRequest(body);
          res.statusCode = result.status || 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result.data));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, msg: err.message || 'Internal Proxy Error' }));
        }
      });
    });
  };

  return {
    name: 'solarman-local-proxy',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const serverEnvKeys = [
    'SOLARMAN_APP_ID',
    'SOLARMAN_APP_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'ALLOWED_ORIGIN',
  ];
  for (const key of serverEnvKeys) {
    if (env[key] && !process.env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [react(), solarmanLocalProxyPlugin()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-charts': ['chart.js'],
          },
        },
      },
    },
    server: { port: 6600, open: false },
  };
});
