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
 * matches these as GLOBS, not regex. They are merged with — never replaced by —
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
 * F1: when APP_SCHEME is set, only that exact scheme is trusted. An attacker's
 * app can send any header it likes, so trusting whatever scheme arrives lets a
 * reset link be redirected to a malicious app.
 *
 * When APP_SCHEME is NOT set, this falls back to the old behavior so app
 * sign-in keeps working. Set APP_SCHEME in each Worker to close the gap.
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
