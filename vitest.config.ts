import { defineConfig } from 'vitest/config'

// Test config is kept separate from vite.config.ts to avoid the vite version
// skew between the app's vite and vitest's bundled vite. The core library is
// framework-agnostic and runs under Node.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
