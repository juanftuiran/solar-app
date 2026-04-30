import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['@supabase/supabase-js', 'chart.js'],
        },
      },
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    open: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@js': path.resolve(__dirname, './src/js'),
      '@css': path.resolve(__dirname, './src/css'),
      '@assets': path.resolve(__dirname, './assets'),
    },
  },
});
