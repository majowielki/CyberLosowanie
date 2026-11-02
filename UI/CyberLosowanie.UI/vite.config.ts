/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import path from "path";
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
    // Node 25+ ships its own global localStorage, which shadows jsdom's (and is
    // undefined without --localstorage-file). Tests need jsdom's.
    poolOptions: {
      forks: { execArgv: ['--no-experimental-webstorage'] },
    },
  },
})
