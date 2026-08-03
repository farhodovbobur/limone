import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  server: {
    port: 4200,
    host: true,
  },
  preview: {
    port: 4200,
    host: true,
  },
  plugins: [react(), tailwindcss()],
});
