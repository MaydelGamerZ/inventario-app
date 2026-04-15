import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite configuration that enables React and Tailwind CSS support.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})