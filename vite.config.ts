// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: base must match your GitHub repo name for GitHub Pages
// Your repo is likely "playoff-bracket", so:
export default defineConfig({
  plugins: [react()],
  base: '/playoff-bracket/',
})
