import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // globals: jest-dom necesita `expect` global y Testing Library limpia el DOM entre tests
    globals: true,
    setupFiles: './tests/setup.js',
  },
})
