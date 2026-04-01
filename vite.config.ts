import { defineConfig } from 'vite';
import path from 'path';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';

export default defineConfig({
  base: './',
  plugins: [
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
