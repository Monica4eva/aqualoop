import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { createAuth, assertConfig, type AuthEnv } from './auth'

const app = new Hono()

function parseAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS ?? 'https://expo-base.expo.app'
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// F1: strict origin allowlist instead of reflecting arbitrary origins.
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin) return null
      const allowed = parseAllowedOrigins()
      if (allowed.includes(origin)) return origin
      if (
        process.env.NEWLY_ENV !== 'production' &&
        (origin === 'http://localhost' || origin.startsWith('http://localhost:'))
      ) {
        return origin
      }
      return null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id', 'expo-origin'],
    credentials: true,
    maxAge: 86400,
  }),
)

// F3: in-memory rate limiter for auth endpoints using Cloud Run's X-Forwarded-For.
const rateBuckets = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_REQUESTS = 20

app.use('/api/auth/*', async (c, next) => {
  const path = c.req.path
  if (path.endsWith('/jwks') || path.endsWith('/get-session')) {
    return next()
  }
  const forwarded = c.req.header('x-forwarded-for') ?? ''
  const ip = forwarded.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  const entry = rateBuckets.get(ip)
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count += 1
    if (entry.count > MAX_REQUESTS) {
      return c.json({ error: 'too_many_requests' }, 429)
    }
  }
  return next()
})

app.get('/health', (c) => c.json({ ok: true, service: 'auth' }))
app.get('/healthz', (c) => c.json({ ok: true, service: 'auth' }))

app.all('/api/auth/*', (c) => {
  const auth = createAuth(undefined, c.req.raw)
  return auth.handler(c.req.raw)
})

export { app }

// Start HTTP server when executed directly (Cloud Run injects PORT=8080).
if (process.env.NODE_ENV !== 'test') {
  const env: AuthEnv = {
    DATABASE_URL: process.env.DATABASE_URL ?? '',
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? '',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? '',
    NEWLY_EMAIL_URL: process.env.NEWLY_EMAIL_URL,
    NEWLY_EMAIL_TOKEN: process.env.NEWLY_EMAIL_TOKEN,
    NEWLY_ENV: process.env.NEWLY_ENV,
    APP_SCHEME: process.env.APP_SCHEME,
  }
  assertConfig(env, Boolean(env.NEWLY_EMAIL_URL && env.NEWLY_EMAIL_TOKEN))

  const port = Number(process.env.PORT || 8080)
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`auth-service listening on http://0.0.0.0:${info.port}`)
  })
}
export default app
