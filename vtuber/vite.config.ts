import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          vrm: ['@pixiv/three-vrm'],
          mediapipe: ['@mediapipe/tasks-vision'],
        },
      },
    },
  },
});
