import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  // Se o arquivo local firebase-applet-config.json existir no disco (ignorado pelo git),
  // carrega suas chaves em tempo de execução sem expor no repositório.
  let localConfig: Record<string, string> = {};
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      localConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    } catch {
      // ignore
    }
  }

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(
        process.env.VITE_FIREBASE_API_KEY || localConfig.apiKey || ''
      ),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(
        process.env.VITE_FIREBASE_PROJECT_ID || localConfig.projectId || 'gen-lang-client-0273340873'
      ),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(
        process.env.VITE_FIREBASE_APP_ID || localConfig.appId || ''
      ),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(
        process.env.VITE_FIREBASE_AUTH_DOMAIN || localConfig.authDomain || ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
