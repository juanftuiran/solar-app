import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['@supabase/supabase-js', 'chart.js'] },
      },
    },
  },
  server: { port: 3000, open: true },
});
