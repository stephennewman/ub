"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  onTranscription: (transcript: string, durationSeconds: number) => void;
  disabled?: boolean;
  /** Default 30 minutes. Whisper sync caps at 25MB so very long sessions
   *  may need chunking; for the demo this is plenty. */
  maxDurationSeconds?: number;
};

export function VoiceRecorder({
  onTranscription,
  disabled = false,
  maxDurationSeconds = 60 * 30,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      recorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  useEffect(() => {
    if (duration >= maxDurationSeconds && isRecording) {
      stopRecording();
    }
  }, [duration, maxDurationSeconds, isRecording, stopRecording]);

  const transcribeAudio = useCallback(
    async (blob: Blob) => {
      setIsTranscribing(true);
      setError(null);
      try {
        const form = new FormData();
        const ext = blob.type.includes("webm") ? "webm" : "mp4";
        form.append("audio", blob, `recording.${ext}`);

        const res = await fetch("/api/transcribe", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Transcription failed");
        }
        const data = (await res.json()) as {
          transcript: string;
          duration_seconds: number | null;
        };
        onTranscription(data.transcript, data.duration_seconds ?? duration);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error ? err.message : "Transcription failed.",
        );
      } finally {
        setIsTranscribing(false);
      }
    },
    [duration, onTranscription],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await transcribeAudio(blob);
      };

      recorder.start(1000);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(
        "Microphone access denied. Allow mic access in your browser and try again.",
      );
    }
  }, [transcribeAudio]);

  const togglePause = useCallback(() => {
    if (!recorderRef.current) return;
    if (isPaused) {
      recorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      recorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    setIsPaused(!isPaused);
  }, [isPaused]);

  if (isTranscribing) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-white p-5">
        <Spinner />
        <div>
          <p className="text-sm font-semibold text-ink">Transcribing audio…</p>
          <p className="text-xs text-muted">
            Long sessions can take a minute or two.
          </p>
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div
        className="flex flex-col gap-3 rounded-2xl border p-5"
        style={{
          background: "var(--brand-red-soft)",
          borderColor: "rgba(225,37,27,0.3)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-3 w-3 rounded-full ${
                isPaused ? "" : "animate-pulse"
              }`}
              style={{ background: "var(--brand-red)" }}
            />
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--brand-red-hover)" }}
            >
              {isPaused ? "Paused" : "Recording"}
            </span>
          </div>
          <span
            className="font-mono text-lg font-semibold"
            style={{ color: "var(--brand-red-hover)" }}
          >
            {formatDuration(duration)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePause}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-medium text-ink hover:bg-surface-soft"
          >
            {isPaused ? "▶ Resume" : "❚❚ Pause"}
          </button>
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white shadow-sm"
            style={{ background: "var(--brand-red)" }}
          >
            ■ Stop &amp; transcribe
          </button>
        </div>

        <p className="text-xs text-ink-soft">
          Max recording length: {formatDuration(maxDurationSeconds)}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={startRecording}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-dashed border-line bg-white px-5 py-7 text-sm font-semibold text-ink hover:bg-surface-soft disabled:opacity-60"
      >
        <span
          className="grid h-9 w-9 place-items-center rounded-full text-white"
          style={{ background: "var(--brand-red)" }}
        >
          <MicIcon />
        </span>
        Start recording
      </button>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : (
        <p className="text-center text-xs text-muted">
          We&rsquo;ll transcribe locally to your account. Audio is never stored.
        </p>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function Spinner() {
  return (
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
      style={{ color: "var(--brand-red)" }}
      aria-hidden
    />
  );
}
