import { expo } from '@better-auth/expo'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { jwt } from 'better-auth/plugins'
import { and, eq } from 'drizzle-orm'
import { createDb } from './db/client'
import { account } from './db/schema'
import { sendNewlyEmail } from './email'
import { authEmail, type AuthEmailKind } from './emailTemplates'

export interface AuthEnv {
  DATABASE_URL: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  APPLE_CLIENT_ID?: string
  APPLE_CLIENT_SECRET?: string
  TRUSTED_ORIGINS?: string
  NEWLY_EMAIL_URL?: string
  NEWLY_EMAIL_TOKEN?: string
  NEWLY_APP_NAME?: string
  NEWLY_ENV?: string
  APP_SCHEME?: string // e.g. "expobase://" (F1). See appSchemeOrigin().
}

/**
 * Origins used during local development and preview builds.
 * Excluded automatically when NEWLY_ENV === 'production' (F2).
 */
const DEV_TRUSTED_ORIGINS = [
  'exp://',
  '*.newly.app',
  '*.newly.dev',
  '*.newly-desktop-preview.pages.dev',
  '*.modal.host',
  'http://localhost',
  'http://localhost:*',
]

/**
 * Exact production web origins (root origin only, no paths or trailing slashes).
 */
const PROD_DEFAULT_ORIGINS = [
  'https://expo-base.expo.app',
]

const ANY_SCHEME = /^[a-z][a-z0-9.+-]*:\/\//i
const HTTP_SCHEME = /^https?:\/\//i

function resolveEnv(override?: Partial<AuthEnv>): AuthEnv {
  return {
    DATABASE_URL: override?.DATABASE_URL ?? process.env.DATABASE_URL ?? '',
    BETTER_AUTH_SECRET: override?.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? '',
    BETTER_AUTH_URL: override?.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL ?? '',
    GOOGLE_CLIENT_ID: override?.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: override?.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET,
    APPLE_CLIENT_ID: override?.APPLE_CLIENT_ID ?? process.env.APPLE_CLIENT_ID,
    APPLE_CLIENT_SECRET: override?.APPLE_CLIENT_SECRET ?? process.env.APPLE_CLIENT_SECRET,
    TRUSTED_ORIGINS: override?.TRUSTED_ORIGINS ?? process.env.TRUSTED_ORIGINS,
    NEWLY_EMAIL_URL: override?.NEWLY_EMAIL_URL ?? process.env.NEWLY_EMAIL_URL,
    NEWLY_EMAIL_TOKEN: override?.NEWLY_EMAIL_TOKEN ?? process.env.NEWLY_EMAIL_TOKEN,
    NEWLY_APP_NAME: override?.NEWLY_APP_NAME ?? process.env.NEWLY_APP_NAME,
    NEWLY_ENV: override?.NEWLY_ENV ?? process.env.NEWLY_ENV,
    APP_SCHEME: override?.APP_SCHEME ?? process.env.APP_SCHEME,
  }
}

/**
 * The app's own deep-link origin (`expobase://`), read off the request the
 * `@better-auth/expo` client tags with `expo-origin`.
 *
 * F1: when APP_SCHEME is set, only that exact scheme is trusted. In non-production,
 * falls back to any non-http scheme so local Expo builds keep working.
 */
function appSchemeOrigin(env: AuthEnv, request?: Request): string[] {
  const origin = request?.headers.get('expo-origin') ?? request?.headers.get('origin') ?? ''
  const appScheme = process.env.APP_SCHEME

  if (appScheme) {
    return origin.toLowerCase().startsWith(appScheme.toLowerCase()) ? [appScheme] : []
  }

  // Disallow arbitrary custom URL schemes in production when APP_SCHEME is unset.
  if (env.NEWLY_ENV === 'production') return []

  if (!ANY_SCHEME.test(origin) || HTTP_SCHEME.test(origin)) return []
  return [origin.slice(0, origin.indexOf('://') + 3)]
}

/**
 * F16 / F7 / F4: fail fast on unsafe configuration at Cloud Run container startup.
 */
export function assertConfig(env: AuthEnv, emailOn: boolean) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
  }
  const authUrl = process.env.BETTER_AUTH_URL ?? ''
  if (!authUrl.startsWith('https://') && !authUrl.startsWith('http://localhost')) {
    throw new Error('BETTER_AUTH_URL must be https (or http://localhost for local dev)')
  }
  if (process.env.NEWLY_EMAIL_URL && !process.env.NEWLY_EMAIL_URL.startsWith('https://')) {
    throw new Error('NEWLY_EMAIL_URL must be https')
  }
  const emailOn = Boolean(process.env.NEWLY_EMAIL_URL && process.env.NEWLY_EMAIL_TOKEN)
  if (!emailOn && process.env.NEWLY_ENV === 'production') {
    throw new Error('Email must be configured in production')
  }
}

/**
 * App Store account deletion expects apps with Sign in with Apple to revoke the
 * user's Apple token (TN3194).
 */
async function revokeAppleTokens(env: AuthEnv, userId: string) {
  if (!env.APPLE_CLIENT_ID || !env.APPLE_CLIENT_SECRET) return
  const rows = await createDb(env.DATABASE_URL)
    .select({ refreshToken: account.refreshToken })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'apple')))

  for (const { refreshToken } of rows) {
    if (!refreshToken) continue
    const res = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }),
    })
    if (!res.ok) console.error('apple token revoke failed', res.status)
  }
}

export function createAuth(envOverride?: Partial<AuthEnv>, request?: Request) {
  const env = resolveEnv(envOverride)
  const emailOn = Boolean(env.NEWLY_EMAIL_URL && env.NEWLY_EMAIL_TOKEN)
  assertConfig(env, emailOn)

  const socialProviders: Record<string, any> = {}
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }
  }
  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
    socialProviders.apple = {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: env.APPLE_CLIENT_SECRET,
    }
  }

  const isProd = env.NEWLY_ENV === 'production'
  const baseOrigins = isProd
    ? PROD_DEFAULT_ORIGINS
    : [...PROD_DEFAULT_ORIGINS, ...DEV_TRUSTED_ORIGINS]

  const configuredOrigins = env.TRUSTED_ORIGINS
    ? env.TRUSTED_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const send = (to: string, kind: AuthEmailKind, url: string) =>
    sendNewlyEmail(env, {
      to,
      ...authEmail(kind, { appName: env.NEWLY_APP_NAME ?? '', url }),
    }).then(() => undefined)

  return betterAuth({
    database: drizzleAdapter(createDb(process.env.DATABASE_URL!), { provider: 'pg' }),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
    trustedOrigins: [
      ...new Set([...baseOrigins, ...configuredOrigins, ...appSchemeOrigin(env, request)]),
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      ...(emailOn
        ? {
            // F14: fire-and-forget on Node/Cloud Run so response time is the same
            // whether or not the account exists.
            sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
              void send(user.email, 'reset', url).catch(() =>
                console.error('auth email failed: reset'),
              )
            },
          }
        : {}),
    },
    ...(emailOn
      ? {
          emailVerification: {
            sendOnSignUp: true,
            sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
              void send(user.email, 'verify', url).catch(() =>
                console.error('auth email failed: verify'),
              )
            },
          },
        }
      : {}),
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: (user) =>
          revokeAppleTokens(user.id).catch(() => console.error('apple token revoke failed')),
      },
    },
    socialProviders,
    plugins: [expo(), jwt()],
    advanced: {
      // Keep 'none' while frontend (expo-base.expo.app) and Cloud Run (*.run.app) are on different root domains.
      defaultCookieAttributes: { sameSite: 'none', secure: true, httpOnly: true },
      ipAddress: {
        // Google Cloud Run appends the client IP to X-Forwarded-For.
        ipAddressHeaders: ['x-forwarded-for'],
      },
    },
  })
}