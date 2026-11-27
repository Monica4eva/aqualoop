import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
      BETTER_AUTH_URL: 'http://localhost:8080',
      NEWLY_ENV: 'test',
    },
  },
})
