import { File, Paths } from 'expo-file-system';

import { API_URL, authClient, BEARER_TOKEN_KEY, tokenStorage } from '@/lib/auth';

const DEVICE_KEY = 'expobase_device_login';

interface DeviceLogin {
  email: string;
  password: string;
}

function randomID(len: number) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function deviceLogin(): DeviceLogin {
  const saved = tokenStorage.getItem(DEVICE_KEY);
  if (saved) return JSON.parse(saved) as DeviceLogin;
  const login = { email: `phone-${randomID(16)}@devices.aqualoop.app`, password: `${randomID(24)}-Aq1` };
  tokenStorage.setItem(DEVICE_KEY, JSON.stringify(login));
  return login;
}

/** A silent per-phone account, so voice notes reach the transcriber without a sign-in screen. */
async function bearer(): Promise<string> {
  const session = await authClient.getSession();
  const fresh = tokenStorage.getItem(BEARER_TOKEN_KEY);
  if (session.data?.user && fresh) return fresh;
  const login = deviceLogin();
  const signedIn = await authClient.signIn.email(login);
  if (signedIn.error) {
    const created = await authClient.signUp.email({ ...login, name: 'AquaLoop customer' });
    if (created.error) throw new Error(created.error.message ?? 'Could not connect');
  }
  await authClient.getSession();
  const token = tokenStorage.getItem(BEARER_TOKEN_KEY);
  if (!token) throw new Error('Could not connect');
  return token;
}

function wavBytes(chunks: Uint8Array[], sampleRate: number) {
  const dataLen = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(44 + dataLen);
  const v = new DataView(out.buffer);
  const tag = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
  tag(0, 'RIFF');
  v.setUint32(4, 36 + dataLen, true);
  tag(8, 'WAVE');
  tag(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  tag(36, 'data');
  v.setUint32(40, dataLen, true);
  let at = 44;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Sends 16-bit mono PCM to the transcriber and returns the words. The audio file is deleted straight after. */
export async function transcribePcm(chunks: Uint8Array[], sampleRate: number): Promise<string> {
  const token = await bearer();
  const file = new File(Paths.cache, `voice-${Date.now()}.wav`);
  file.write(wavBytes(chunks, sampleRate));
  try {
    const form = new FormData();
    form.append('audio', file);
    form.append('key', `voice-${Date.now()}-${randomID(8)}`);
    const res = await fetch(`${API_URL}/voice/transcribe`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const body = (await res.json().catch(() => ({}))) as { text?: string; message?: string };
    if (!res.ok) throw new Error(body.message ?? 'Transcription failed');
    return body.text ?? '';
  } finally {
    if (file.exists) file.delete();
  }
}
