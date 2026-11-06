import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Cada worktree usa a sua porta (D56); o Tauri espera a 1420.
const porta = Number(process.env.PORTA_APP ?? 1420);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  // O .env fica na raiz do monorepo (T00-10).
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: porta, strictPort: true },
  // Pré-otimizadas na partida: descobertas no primeiro uso, faziam o Vite recarregar a página no
  // meio dos testes (T00-14).
  optimizeDeps: {
    include: [
      '@tauri-apps/api',
      '@tauri-apps/plugin-deep-link',
      '@tauri-apps/plugin-dialog',
      '@tauri-apps/plugin-fs',
      'cmdk',
      'vaul',
      'recharts',
      'html-to-image',
      'radix-ui',
      'react-hook-form',
    ],
  },
  preview: { port: porta, strictPort: true },
});
