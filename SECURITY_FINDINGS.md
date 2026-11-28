# Security findings: auth service

Last updated: 2026-11-16

## 1. Who can call the API and where users are sent
- **F19, CORS (must fix).** server.ts, cors() block.
  - **Status: DONE (pushed, CORS test pending).** Origin is an allowlist from the `ALLOWED_ORIGINS` env var (comma-separated exact origins). Unset = all cross-origin browser requests blocked. To do: set `ALLOWED_ORIGINS` once the app domain is known.
- **F2, broad trusted origins and SameSite=None (must fix).** auth.ts, PLATFORM_TRUSTED_ORIGINS and cookie settings.
  - **Status: OPEN.** Waiting on the production domain. TODO markers are in auth.ts.
- **F1, any app scheme is trusted.** auth.ts, appSchemeOrigin().
  - **Status: PARTIAL.** Enforces `APP_SCHEME` when set; falls back to old behavior when unset. To do: set `APP_SCHEME` on every Worker, then remove the fallback.
- **F3, rate limiting probably does not work (must fix).** auth.ts, server.ts, Cloudflare.
  - **Status: OPEN.** Next planned item; also resolves F22.

## 2. Sign-up, email and account recovery
- **F4, email verification not enforced (must fix).** auth.ts, requireEmailVerification.
  - **Status: DONE.** Already enabled. Added a startup check so production fails loudly if email is not configured. To do: set `NEWLY_ENV=production` in production; test blocked sign-in.
- **F14, response timing reveals which accounts exist (must fix).** email.ts, auth.ts callbacks.
  - **Status: DONE (pushed, untested).** Sends run through `ctx.waitUntil()`; server.ts passes `c.executionCtx`. To do: compare response times for real and fake addresses.
- **F18, sender domain protection (must fix).** DNS (SPF, DKIM, DMARC).
  - **Status: OPEN.** DNS work, no code change.

## 3. Keys, tokens and data at rest
- **F8, no database role separation (must fix).** Status: OPEN.
- **F5, no signing-key rotation.** Status: OPEN.
- **F6 and F9, tokens stored in plain text.** Status: OPEN.
- **F10, signing-key protection unconfirmed.** Status: OPEN.

## 4. Third parties, secrets and configuration
- **F15, tokens pass through Newly's mailer.** Status: OPEN.
- **F16, mailer URL and token have no guardrails.**
  - **Status: PARTIAL.** https enforced in auth.ts `assertConfig()` and email.ts `mailerBase()`. To do: set `EXPECTED_MAILER_HOST`; rotate the token.
- **F21, monitoring fails quietly.** Status: OPEN.

## 5. Privacy and retention
- **F11, old data is never cleaned up.** Status: OPEN.
- **F12, account deletion may leave data behind.** Status: OPEN.

## 6. Logging, monitoring and smaller items
- **F17, error leaks and silent email failures.**
  - **Status: DONE in code (pushed, untested); alerting OPEN.** Mailer message text and fetch causes are no longer put in errors; auth.ts logs fixed labels only. To do: alert on email failure rates.
- **F7, smaller items in auth.ts.**
  - **Status: PARTIAL.** Secret length and https checks added; Apple revoke logs status only. To do: audit log of sign-ins and resets.
- **F13, smaller items in the schema.** Status: OPEN. Check email lowercasing, unique index on `lower(email)`, timestamp timezones, neon-http transactions.
- **F22, minor hygiene.** Status: OPEN. Addressed together with F3.

## Summary (2026-11-16)
- Done in code: F19, F4, F14, F17
- Partial: F1, F7, F16
- Open must-fix: F2, F3, F8, F18
- Open other: F5, F6/F9, F10, F11, F12, F13, F15, F21, F22
