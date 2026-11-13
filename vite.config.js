import { defineConfig, loadEnv } from 'vite';
import { processSolarmanRequest } from './api/solarman.js';

function solarmanLocalProxyPlugin() {
  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/solarman', (req, res, next) => {
      if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
      }
      if (req.method !== 'POST') {
        next();
        return;
      }
      let raw = '';
      req.on('data', chunk => {
        raw += chunk;
      });
      req.on('end', async () => {
        try {
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
  if (env.SOLARMAN_APP_ID && !process.env.SOLARMAN_APP_ID) {
    process.env.SOLARMAN_APP_ID = env.SOLARMAN_APP_ID;
  }
  if (env.SOLARMAN_APP_SECRET && !process.env.SOLARMAN_APP_SECRET) {
    process.env.SOLARMAN_APP_SECRET = env.SOLARMAN_APP_SECRET;
  }

  return {
    plugins: [solarmanLocalProxyPlugin()],
    build: {
      outDir: 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-charts': ['chart.js'],
          },
        },
      },
    },
    server: { port: 6600, open: false },
  };
});
