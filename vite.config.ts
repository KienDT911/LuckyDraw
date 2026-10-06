import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base + hash routing lets the build run from any GitHub Pages repo path.
export default defineConfig({
  base: './',
  plugins: [react()],
});
