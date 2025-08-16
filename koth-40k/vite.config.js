import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// Project site on GitHub Pages -> set base to '/<REPO_NAME>/'
export default defineConfig({
  base: '/WKKOTH/',
  plugins: [react(), tailwind()],
})
