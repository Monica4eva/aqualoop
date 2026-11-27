import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
import { jwt } from 'better-auth/plugins'
import { and, eq } from 'drizzle-orm'
import { createDb } from './db/client'
import { account } from './db/schema'
import { sendNewlyEmail } from './email'
import { authEmail, type AuthEmailKind } from './emailTemplates'

const DEV_TRUSTED_ORIGINS = [
  'exp://',
  '*.newly.app',
  '*.newly.dev',
  '*.newly-desktop-preview.pages.dev',
  '*.modal.host',
  'http://localhost',
  'http://localhost:*',
]

const PROD_DEFAULT_ORIGINS = [
  'https://expo-base.expo.app',
]

const ANY_SCHEME = /^[a-z][a-z0-9.+-]*:\/\//i
const HTTP_SCHEME = /^https?:\/\//i

function appSchemeOrigin(request?: Request): string[] {
  const origin = request?.headers.get('expo-origin') ?? request?.headers.get('origin') ?? ''
  const appScheme = process.env.APP_SCHEME

  if (appScheme) {
    return origin.toLowerCase().startsWith(appScheme.toLowerCase()) ? [appScheme] : []
  }

  // Disallow arbitrary custom URL schemes in production when APP_SCHEME is unset.
  if (process.env.NEWLY_ENV === 'production') return []

  if (!ANY_SCHEME.test(origin) || HTTP_SCHEME.test(origin)) return []
  return [origin.slice(0, origin.indexOf('://') + 3)]
}

/**
 * F16 / F7 / F4: fail fast on unsafe configuration at Cloud Run container startup.
 */
export function assertConfig() {
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  if (secret.length < 32) {
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

async function revokeAppleTokens(userId: string) {
  const clientId = process.env.APPLE_CLIENT_ID
  const clientSecret = process.env.APPLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return

  const rows = await createDb(process.env.DATABASE_URL!)
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

export function createAuth(request?: Request) {
  const emailOn = Boolean(process.env.NEWLY_EMAIL_URL && process.env.NEWLY_EMAIL_TOKEN)
  assertConfig()

  const socialProviders: Record<string, any> = {}
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }
  }
  if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
    socialProviders.apple = {
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }
  }

  const isProd = process.env.NEWLY_ENV === 'production'
  const baseOrigins = isProd
    ? PROD_DEFAULT_ORIGINS
    : [...PROD_DEFAULT_ORIGINS, ...DEV_TRUSTED_ORIGINS]

  const configuredOrigins = process.env.TRUSTED_ORIGINS
    ? process.env.TRUSTED_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const send = (to: string, kind: AuthEmailKind, url: string) =>
    sendNewlyEmail(process.env as any, {
      to,
      ...authEmail(kind, { appName: process.env.NEWLY_APP_NAME ?? '', url }),
    }).then(() => undefined)

  return betterAuth({
    database: drizzleAdapter(createDb(process.env.DATABASE_URL!), { provider: 'pg' }),
    secret: process.env.BETTER_AUTH_SECRET!,
    baseURL: process.env.BETTER_AUTH_URL!,
    trustedOrigins: [
      ...new Set([...baseOrigins, ...configuredOrigins, ...appSchemeOrigin(request)]),
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      ...(emailOn
        ? {
            // F14: fire-and-forget on Node/Cloud Run so response timing stays constant.
            sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) => {
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
            sendVerificationEmail: ({ user, url }: { user: { email: string }; url: string }) => {
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
        // Google Cloud Run puts the client IP in x-forwarded-for.
        ipAddressHeaders: ['x-forwarded-for'],
      },
    },
  })
}
