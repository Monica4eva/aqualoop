import { describe, expect, it } from 'vitest'
import { createAuth, assertConfig, type AuthEnv } from '../../src/auth'

const baseEnv: AuthEnv = {
  DATABASE_URL: 'postgres://test:test@localhost:5432/test',
  BETTER_AUTH_SECRET: '0123456789abcdef0123456789abcdef',
  BETTER_AUTH_URL: 'https://auth.example.com',
  NEWLY_EMAIL_URL: 'https://mailer.example.com',
  NEWLY_EMAIL_TOKEN: 'secret-token',
  NEWLY_ENV: 'production',
  APP_SCHEME: 'expobase://',
}

describe('auth config & security hardening', () => {
  it('fails fast if BETTER_AUTH_SECRET is shorter than 32 chars', () => {
    expect(() => assertConfig({ ...baseEnv, BETTER_AUTH_SECRET: 'short' }, true)).toThrow(
      /at least 32 characters/,
    )
  })

  it('fails fast if BETTER_AUTH_URL is non-https outside localhost', () => {
    expect(() =>
      assertConfig({ ...baseEnv, BETTER_AUTH_URL: 'http://auth.example.com' }, true),
    ).toThrow(/must be https/)
  })

  it('fails fast in production when email is not configured', () => {
    expect(() => assertConfig(baseEnv, false)).toThrow(/Email must be configured/)
  })

  it('enforces email verification and configures X-Forwarded-For IP extraction', () => {
    const auth = createAuth(baseEnv)
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(true)
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual(['x-forwarded-for'])
  })

  it('only trusts configured APP_SCHEME in production', () => {
    const matchingReq = new Request('https://auth.example.com/api/auth/sign-in/social', {
      headers: { 'expo-origin': 'expobase://auth-callback' },
    })
    const authMatched = createAuth(baseEnv, matchingReq)
    expect(authMatched.options.trustedOrigins).toContain('expobase://')

    const rogueReq = new Request('https://auth.example.com/api/auth/sign-in/social', {
      headers: { 'expo-origin': 'evilapp://auth-callback' },
    })
    const authRogue = createAuth(baseEnv, rogueReq)
    expect(authRogue.options.trustedOrigins).not.toContain('evilapp://')
  })
})
