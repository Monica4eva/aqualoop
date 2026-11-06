import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from 'expo-audio';
import { useRef, useState } from 'react';
import { Linking } from 'react-native';

import { transcribePcm } from '@/features/aqua/utils/voice-api';

export type VoicePhase = 'idle' | 'recording' | 'transcribing';

const MAX_SECONDS = 60;

/** Tap once to record, tap again to stop: the words come back as a transcript, the audio is never kept. */
export function useVoiceNote(onTranscript: (text: string) => void) {
  const chunks = useRef<Uint8Array[]>([]);
  const rate = useRef(16000);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { stream } = useAudioStream({
    sampleRate: 16000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (b) => {
      chunks.current.push(new Uint8Array(b.data.slice(0)));
      rate.current = b.sampleRate;
      setSeconds(Math.floor(b.timestamp));
      if (b.timestamp >= MAX_SECONDS) void stop();
    },
  });

  async function start() {
    setError(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setError(perm.canAskAgain ? 'Microphone access is needed for voice notes.' : 'Turn on the microphone for AquaLoop in Settings.');
      if (!perm.canAskAgain) void Linking.openSettings();
      return;
    }
    chunks.current = [];
    setSeconds(0);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await stream.start();
    setPhase('recording');
  }

  async function stop() {
    if (phase === 'transcribing') return;
    stream.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const captured = chunks.current;
    chunks.current = [];
    if (captured.reduce((n, c) => n + c.length, 0) < rate.current) {
      setPhase('idle');
      setError('That was too short. Tap the mic and speak, then tap again to send.');
      return;
    }
    setPhase('transcribing');
    try {
      const text = await transcribePcm(captured, rate.current);
      if (!text) {
        setError("We couldn't hear any words. Try again a bit closer to the phone.");
        return;
      }
      onTranscript(text);
    } catch {
      setError("Couldn't turn that into text. Check your connection and try again.");
    } finally {
      setPhase('idle');
    }
  }

  function toggle() {
    if (phase === 'recording') return void stop();
    if (phase === 'idle') return void start();
  }

  return { phase, seconds, error, toggle };
}
