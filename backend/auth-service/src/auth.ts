import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { expo } from '@better-auth/expo'
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
  APP_SCHEME?: string // e.g. "myapp://" (F1). See appSchemeOrigin().
}

/**
 * Origins the Newly platform itself serves app previews from. Better Auth
 * matches these as GLOBS, not regex. They are merged with, never replaced by,
 * `TRUSTED_ORIGINS`, so a project provisioned before a preview host existed
 * picks it up on its next deploy instead of failing with "Invalid origin".
 *
 * TODO (F2): narrow these to exact production domains once they are known.
 */
const PLATFORM_TRUSTED_ORIGINS = [
  'exp://',
  '*.newly.app',
  '*.newly.dev',
  '*.newly-desktop-preview.pages.dev',
  '*.modal.host',
  'http://localhost',
  'http://localhost:*',
]

const ANY_SCHEME = /^[a-z][a-z0-9.+-]*:\/\//i
const HTTP_SCHEME = /^https?:\/\//i

/**
 * The app's own deep-link origin (`myapp://`), read off the request the
 * `@better-auth/expo` client tags with `expo-origin`.
 *
 * F1: when APP_SCHEME is set, only that exact scheme is trusted. When it is
 * NOT set, this falls back to the old behavior so app sign-in keeps working.
 */
function appSchemeOrigin(env: AuthEnv, request?: Request): string[] {
  const origin = request?.headers.get('expo-origin') ?? request?.headers.get('origin') ?? ''

  if (env.APP_SCHEME) {
    return origin.toLowerCase().startsWith(env.APP_SCHEME.toLowerCase()) ? [env.APP_SCHEME] : []
  }

  // Legacy fallback (remove once APP_SCHEME is set everywhere).
  if (!ANY_SCHEME.test(origin) || HTTP_SCHEME.test(origin)) return []
  return [origin.slice(0, origin.indexOf('://') + 3)]
}

/**
 * F16 / F7: fail fast on unsafe configuration. Workers have no startup phase,
 * so this runs when the auth instance is created.
 */
function assertConfig(env: AuthEnv, emailOn: boolean) {
  if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be at least 32 characters')
  }
  const authUrl = env.BETTER_AUTH_URL ?? ''
  if (!authUrl.startsWith('https://') && !authUrl.startsWith('http://localhost')) {
    throw new Error('BETTER_AUTH_URL must be https (or http://localhost for local dev)')
  }
  if (env.NEWLY_EMAIL_URL && !env.NEWLY_EMAIL_URL.startsWith('https://')) {
    throw new Error('NEWLY_EMAIL_URL must be https')
  }
  // requireEmailVerification is on, so without a mailer nobody can sign in.
  if (!emailOn && env.NEWLY_ENV === 'production') {
    throw new Error('Email must be configured in production')
  }
}

/**
 * App Store account deletion expects apps with Sign in with Apple to revoke the
 * user's Apple token (TN3194). The redirect sign-in stores Apple's refresh token,
 * so hand it back to Apple before Better Auth deletes the account row.
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
        client_id: env.APPLE_CLIENT_ID,
        client_secret: env.APPLE_CLIENT_SECRET,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }),
    })
    // F7: log the status only, never the response body.
    if (!res.ok) console.error('apple token revoke failed', res.status)
  }
}

export function createAuth(env: AuthEnv, request: Request | undefined, ctx: ExecutionContext) {
  const emailOn = Boolean(env.NEWLY_EMAIL_URL && env.NEWLY_EMAIL_TOKEN)
  assertConfig(env, emailOn)

  const socialProviders: Record<string, any> = {}
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
  }
  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) {
    socialProviders.apple = { clientId: env.APPLE_CLIENT_ID, clientSecret: env.APPLE_CLIENT_SECRET }
  }
  const configuredOrigins = env.TRUSTED_ORIGINS
    ? env.TRUSTED_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  // Better Auth logs and swallows send failures: sign-up and reset still succeed without the email.
  const send = (to: string, kind: AuthEmailKind, url: string) =>
    sendNewlyEmail(env, { to, ...authEmail(kind, { appName: env.NEWLY_APP_NAME ?? '', url }) }).then(() => undefined)

  return betterAuth({
    database: drizzleAdapter(createDb(env.DATABASE_URL), { provider: 'pg' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [
      ...new Set([...PLATFORM_TRUSTED_ORIGINS, ...configuredOrigins, ...appSchemeOrigin(env, request)]),
    ],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      ...(emailOn
        ? {
            // F14: don't await the mailer, so response time is the same
            // whether or not the account exists.
            sendResetPassword: ({ user, url }: { user: { email: string }; url: string }) => {
              ctx.waitUntil(
                send(user.email, 'reset', url).catch(() => console.error('auth email failed: reset')),
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
              ctx.waitUntil(
                send(user.email, 'verify', url).catch(() => console.error('auth email failed: verify')),
              )
            },
          },
        }
      : {}),
    // App Store (5.1.1(v)) and Google Play both require in-app account deletion;
    // Better Auth ships it off. It still demands the password or a fresh session.
    // A failed Apple revoke never blocks the deletion itself.
    user: {
      deleteUser: {
        enabled: true,
        beforeDelete: (user) =>
          revokeAppleTokens(env, user.id).catch(() => console.error('apple token revoke failed')),
      },
    },
    socialProviders,
    plugins: [expo(), jwt()],
    advanced: {
      // TODO (F2): switch to 'lax' if the frontend and auth share a site.
      defaultCookieAttributes: { sameSite: 'none', secure: true, httpOnly: true },
    },
  })
}