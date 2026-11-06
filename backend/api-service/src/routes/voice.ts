import { Hono } from 'hono'
import type { HonoEnv } from '../env'
import { authMiddleware } from '../middleware/auth'
import { aiMedia, newlyAi, NewlyAiError } from '../platform/ai'

export const voiceRoutes = new Hono<HonoEnv>()

const KEY_RE = /^[A-Za-z0-9_-]{8,128}$/
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// A customer's voice note in, its words out. The audio is never stored here:
// it goes to the transcriber inline and only the transcript comes back.
voiceRoutes.post('/voice/transcribe', authMiddleware, async (c) => {
  const form = await c.req.formData().catch(() => null)
  const file = form?.get('audio')
  if (!(file instanceof Blob)) return c.json({ error: 'missing_audio' }, 400)
  const key = String(form?.get('key') ?? '')
  if (!KEY_RE.test(key)) return c.json({ error: 'bad_key' }, 400)

  try {
    const media = await aiMedia(file)
    const ai = newlyAi(c.env, c.get('userId'))
    let job = await ai.generate({ model: 'transcribe', media: [media], languageCode: 'eng' }, key)
    for (let i = 0; i < 60 && !['succeeded', 'failed', 'cancelled'].includes(job.status); i += 1) {
      await sleep(1000)
      job = await ai.get(job.id)
    }
    if (job.status !== 'succeeded') return c.json({ error: job.error ?? 'transcription_failed', status: job.status }, 502)
    const out = await ai.output(job.id)
    const raw = await out.text()
    let text = raw
    try {
      const parsed = JSON.parse(raw) as { text?: string }
      if (typeof parsed.text === 'string') text = parsed.text
    } catch {}
    return c.json({ text: text.trim() })
  } catch (err) {
    if (err instanceof NewlyAiError) return c.json({ error: err.code, message: err.message }, err.status as 400)
    return c.json({ error: 'bad_audio', message: err instanceof Error ? err.message : 'Unreadable audio' }, 400)
  }
})
