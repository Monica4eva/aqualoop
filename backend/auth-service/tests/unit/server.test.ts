import { describe, expect, it, beforeEach } from 'vitest'
import { app } from '../../src/server'

describe('auth-service Cloud Run server', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test'
    process.env.BETTER_AUTH_SECRET = '0123456789abcdef0123456789abcdef'
    process.env.BETTER_AUTH_URL = 'http://localhost:8080'
    process.env.ALLOWED_ORIGINS = 'https://expo-base.expo.app'
    process.env.NEWLY_ENV = 'production'
  })

  it('responds ok on /health and /healthz', async () => {
    const res1 = await app.request('/health')
    expect(res1.status).toBe(200)
    expect(await res1.json()).toEqual({ ok: true, service: 'auth' })

    const res2 = await app.request('/healthz')
    expect(res2.status).toBe(200)
  })

  it('allows configured production origin in CORS', async () => {
    const res = await app.request('/health', {
      headers: { Origin: 'https://expo-base.expo.app' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBe('https://expo-base.expo.app')
  })

  it('rejects untrusted origins in CORS', async () => {
    const res = await app.request('/health', {
      headers: { Origin: 'https://evil.example.com' },
    })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })
})
