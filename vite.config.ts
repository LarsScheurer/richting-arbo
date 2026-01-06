import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        // host: '0.0.0.0', // Verwijderd om permissie problemen te voorkomen

        proxy: {
          '/api/functions': {
            target: 'https://europe-west4-richting-sales-d764a.cloudfunctions.net',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/functions/, '')
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
