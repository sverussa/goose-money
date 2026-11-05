import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Cada worktree usa a sua porta (D56); o Tauri espera a 1420.
const porta = Number(process.env.PORTA_APP ?? 1420);

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_ENV_'],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: porta, strictPort: true },
  preview: { port: porta, strictPort: true },
});
