import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendNewlyEmail } from '../../src/email'

const ENV = {
  NEWLY_EMAIL_URL: 'https://mail.example.com',
  NEWLY_EMAIL_TOKEN: 'secret-project-token',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sendNewlyEmail', () => {
  it('posts to the Newly mailer with the project token', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'msg_123' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await sendNewlyEmail(ENV, {
      to: 'user@example.com',
      subject: 'Verify',
      html: '<p>Hi</p>',
    })

    expect(res).toEqual({ id: 'msg_123' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://mail.example.com/email/v1/send')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer secret-project-token')
  })

  it('throws the mailer error code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: 'daily_email_limit_reached' }), { status: 429 }),
      ),
    )

    await expect(
      sendNewlyEmail(ENV, { to: 'user@example.com', subject: 'Hi' }),
    ).rejects.toThrow('daily_email_limit_reached')
  })

  it('throws email_not_configured when the platform has not injected email', async () => {
    await expect(
      sendNewlyEmail({}, { to: 'user@example.com', subject: 'Hi' }),
    ).rejects.toThrow('email_not_configured')
  })

  it('rejects non-https mailer URLs with email_misconfigured', async () => {
    await expect(
      sendNewlyEmail(
        { NEWLY_EMAIL_URL: 'http://mail.example.com', NEWLY_EMAIL_TOKEN: 'tok' },
        { to: 'user@example.com', subject: 'Hi' },
      ),
    ).rejects.toThrow('email_misconfigured')
  })

  it('strips trailing slashes from the base URL', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'msg_1' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendNewlyEmail(
      { NEWLY_EMAIL_URL: 'https://mail.example.com///', NEWLY_EMAIL_TOKEN: 'tok' },
      { to: 'user@example.com', subject: 'Hi' },
    )

    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://mail.example.com/email/v1/send')
  })

  it('omits mailer message and token from errors to prevent PII/secret leakage (F17)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: 'sending_paused',
              message: 'paused by admin for secret-project-token user@example.com',
            }),
            { status: 403 },
          ),
      ),
    )

    let err!: Error
    try {
      await sendNewlyEmail(ENV, { to: 'user@example.com', subject: 'Hi' })
    } catch (e) {
      err = e as Error
    }
    expect(err.message).toBe('sending_paused')
    expect(err.message).not.toContain('secret-project-token')
    expect(err.message).not.toContain('user@example.com')
  })

  it('sends with a timeout signal and maps a timeout to email_timeout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        expect(init?.signal).toBeInstanceOf(AbortSignal)
        throw new DOMException('timed out', 'TimeoutError')
      }),
    )

    await expect(
      sendNewlyEmail(ENV, { to: 'user@example.com', subject: 'Hi' }),
    ).rejects.toThrow('email_timeout')
  })

  it('maps a body-phase error or timeout to email_failed_200', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => {
          throw new DOMException('body timed out', 'TimeoutError')
        },
      })),
    )

    await expect(
      sendNewlyEmail(ENV, { to: 'user@example.com', subject: 'Hi' }),
    ).rejects.toThrow('email_failed_200')
  })

  it('maps network errors to email_unavailable without attaching cause (F17)', async () => {
    const cause = new Error('connect ECONNREFUSED https://mail.example.com')
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw cause
      }),
    )

    let err!: Error
    try {
      await sendNewlyEmail(ENV, { to: 'user@example.com', subject: 'Hi' })
    } catch (e) {
      err = e as Error
    }
    expect(err.message).toBe('email_unavailable')
    expect(err.cause).toBeUndefined()
  })
})
