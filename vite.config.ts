import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { port: 5173, strictPort: true }, build: { rollupOptions: { output: { manualChunks: (id: string) => id.includes('/node_modules/phaser/') ? 'phaser' : undefined } }, chunkSizeWarningLimit: 1600 } });
