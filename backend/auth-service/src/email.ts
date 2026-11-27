export type NewlyEmailEnv = { NEWLY_EMAIL_URL?: string; NEWLY_EMAIL_TOKEN?: string }
export type NewlyEmail = { to: string; subject: string; html?: string; text?: string; from?: string }

const isTimeout = (err: unknown) => err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')

// F16: set to the real mailer hostname once known (e.g. 'mail.newly.app').
// While null, only the https check runs.
const EXPECTED_MAILER_HOST: string | null = null

/** Validates the mailer URL: must be https and (when configured) the expected host. */
function mailerBase(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('email_misconfigured')
  }
  if (url.protocol !== 'https:') throw new Error('email_misconfigured')
  if (EXPECTED_MAILER_HOST && url.hostname !== EXPECTED_MAILER_HOST) throw new Error('email_misconfigured')
  return url.origin + url.pathname.replace(/\/+$/, '')
}

/** Sends an auth email through Newly's mailer from the app's verified domain (no-reply@ unless `from` is given). */
export async function sendNewlyEmail(env: NewlyEmailEnv, message: NewlyEmail): Promise<{ id: string }> {
  if (!env.NEWLY_EMAIL_URL || !env.NEWLY_EMAIL_TOKEN) throw new Error('email_not_configured')
  // A hung request would hold the background send open, so keep the timeout.
  const response = await fetch(`${mailerBase(env.NEWLY_EMAIL_URL)}/email/v1/send`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.NEWLY_EMAIL_TOKEN}`, 'content-type': 'application/json' },
    // Every email this service sends is sign-up verification or a password reset: Newly counts them as `auth`.
    body: JSON.stringify({ ...message, category: 'auth' }),
    signal: AbortSignal.timeout(10_000),
  }).catch((cause) => {
    // F17: don't attach `cause`; fetch errors can include the URL.
    throw new Error(isTimeout(cause) ? 'email_timeout' : 'email_unavailable')
  })
  const payload = (await response.json().catch(() => ({}))) as { id?: string; error?: string }
  if (!response.ok || !payload.id) {
    // F17: use only a short machine code. Never include `payload.message`,
    // which may contain the recipient address.
    const rawCode = typeof payload.error === 'string' ? payload.error : ''
    const code = /^[a-z0-9_]{1,40}$/i.test(rawCode) ? rawCode : `email_failed_${response.status}`
    throw new Error(code)
  }
  return { id: payload.id }
}