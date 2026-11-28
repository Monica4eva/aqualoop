import { transcribePcm } from "@/features/aqua/utils/voice-api";
import { useEffect, useRef, useState } from "react";

export type VoicePhase = "idle" | "recording" | "transcribing";

const MAX_SECONDS = 60;

export function useVoiceNote(
  onTranscript: (text: string) => void | Promise<void>,
) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const state = useRef<VoicePhase>("idle");
  const locked = useRef(false);
  const chunks = useRef<Uint8Array[]>([]);
  const rate = useRef(16000);
  const media = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  function changePhase(value: VoicePhase) {
    state.current = value;
    setPhase(value);
  }

  function cleanup() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }

    processor.current?.disconnect();
    processor.current = null;

    media.current?.getTracks().forEach((track) => track.stop());
    media.current = null;

    if (context.current) {
      void context.current.close().catch(() => {});
      context.current = null;
    }
  }

  useEffect(() => {
    return cleanup;
  }, []);

  async function start() {
    if (locked.current) return;
    locked.current = true;

    setError(null);
    setSeconds(0);
    chunks.current = [];

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone unavailable in this browser");
      }

      media.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      context.current = new AudioContext();
      await context.current.resume();

      rate.current = context.current.sampleRate;

      const source = context.current.createMediaStreamSource(media.current);

      processor.current = context.current.createScriptProcessor(4096, 1, 1);

      const mute = context.current.createGain();
      mute.gain.value = 0;

      processor.current.onaudioprocess = (event) => {
        if (state.current !== "recording") return;

        const samples = event.inputBuffer.getChannelData(0);
        const pcm = new Uint8Array(samples.length * 2);
        const view = new DataView(pcm.buffer);

        for (let i = 0; i < samples.length; i++) {
          const value = Math.max(-1, Math.min(1, samples[i]));

          view.setInt16(i * 2, value < 0 ? value * 32768 : value * 32767, true);
        }

        chunks.current.push(pcm);
      };

      source.connect(processor.current);
      processor.current.connect(mute);
      mute.connect(context.current.destination);

      changePhase("recording");

      const started = Date.now();

      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);

        setSeconds(elapsed);

        if (elapsed >= MAX_SECONDS) {
          void stop();
        }
      }, 250);
    } catch (err) {
      cleanup();
      changePhase("idle");

      console.error("Microphone error:", err);

      setError(
        "Unable to access the microphone. Check your browser permissions.",
      );
    } finally {
      locked.current = false;
    }
  }

  async function stop() {
    if (state.current !== "recording") return;

    changePhase("transcribing");
    cleanup();

    const captured = chunks.current;
    chunks.current = [];

    const length = captured.reduce((total, chunk) => total + chunk.length, 0);

    try {
      if (length < rate.current * 2) {
        setError("Recording too short. Please try again.");
        return;
      }

      const said = await transcribePcm(captured, rate.current);

      const text = said.replace(/\[[^\]]*\]|\([^)]*\)/g, "").trim();

      if (!/[\p{L}\p{N}]/u.test(text)) {
        setError("No clear speech detected. Please try again.");
        return;
      }

      await onTranscript(text);
    } catch (err) {
      console.error("Voice transcription error:", err);

      setError("Unable to process your voice note. Please try again.");
    } finally {
      changePhase("idle");
    }
  }

  function toggle() {
    if (state.current === "recording") {
      void stop();
    } else if (state.current === "idle") {
      void start();
    }
  }

  return { phase, seconds, error, toggle };
}
