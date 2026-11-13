import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');

export default defineConfig({
  root: here,
  plugins: [react()],
  resolve: {
    alias: {
      'zitejs/api': path.resolve(here, 'shims/api.ts'),
      'zitejs/upload': path.resolve(here, 'shims/upload.ts'),
      '@project/components': path.resolve(root, 'packages/components'),
      '@': path.resolve(root, 'apps/paramistech/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  css: { postcss: { plugins: [tailwindcss({ config: path.resolve(here, 'tailwind.config.cjs') }), autoprefixer()] } },
  server: { proxy: { '/api': 'http://127.0.0.1:3000', '/uploads': 'http://127.0.0.1:3000' } },
  build: { outDir: path.resolve(here, 'dist'), emptyOutDir: true, target: 'es2020', sourcemap: false, chunkSizeWarningLimit: 1500 },
});
