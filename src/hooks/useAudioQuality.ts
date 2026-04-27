import { useEffect, useRef, useState } from 'react';

export type AudioQuality = 'idle' | 'good' | 'low' | 'noisy' | 'silent';

interface Options {
  active: boolean;
  /** Below this RMS (0-1) for >silenceMs => silent */
  silenceThreshold?: number;
  /** Below this RMS for >lowMs => low volume */
  lowThreshold?: number;
  /** Above this noise floor ratio => noisy environment */
  noiseRatio?: number;
  /** Time in ms of sustained low signal to flag */
  lowMs?: number;
  /** Time in ms of pure silence to flag */
  silenceMs?: number;
  /** Called once when quality issue is sustained */
  onIssue?: (q: AudioQuality) => void;
}

/**
 * Live audio-quality monitor using Web Audio API.
 * Tracks RMS volume + noise floor and flags 'low' / 'noisy' / 'silent'.
 * Used to prompt the user to speak louder or restart in a quieter place.
 */
export const useAudioQuality = ({
  active,
  silenceThreshold = 0.012,
  lowThreshold = 0.04,
  noiseRatio = 0.55,
  lowMs = 3500,
  silenceMs = 4000,
  onIssue,
}: Options) => {
  const [quality, setQuality] = useState<AudioQuality>('idle');
  const [level, setLevel] = useState(0);
  const onIssueRef = useRef(onIssue);
  useEffect(() => { onIssueRef.current = onIssue; }, [onIssue]);

  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lowSinceRef = useRef<number | null>(null);
  const silenceSinceRef = useRef<number | null>(null);
  const noiseSamplesRef = useRef<number[]>([]);
  const lastIssueRef = useRef<AudioQuality | null>(null);

  useEffect(() => {
    if (!active) {
      cleanup();
      setQuality('idle');
      setLevel(0);
      lastIssueRef.current = null;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AC();
        ctxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 1024;
        an.smoothingTimeConstant = 0.8;
        src.connect(an);
        analyserRef.current = an;
        loop();
      } catch {
        setQuality('silent');
      }
    })();
    return () => { cancelled = true; cleanup(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const loop = () => {
    const an = analyserRef.current;
    if (!an) return;
    const buf = new Float32Array(an.fftSize);
    const tick = () => {
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      setLevel(rms);

      const now = performance.now();

      // Silent
      if (rms < silenceThreshold) {
        if (silenceSinceRef.current == null) silenceSinceRef.current = now;
        if (now - silenceSinceRef.current > silenceMs) flag('silent');
      } else {
        silenceSinceRef.current = null;
      }

      // Low volume
      if (rms >= silenceThreshold && rms < lowThreshold) {
        if (lowSinceRef.current == null) lowSinceRef.current = now;
        if (now - lowSinceRef.current > lowMs) flag('low');
      } else if (rms >= lowThreshold) {
        lowSinceRef.current = null;
      }

      // Noise floor estimate (rolling min over ~3s of low samples)
      noiseSamplesRef.current.push(rms);
      if (noiseSamplesRef.current.length > 180) noiseSamplesRef.current.shift();
      const sorted = [...noiseSamplesRef.current].sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length * 0.2)] || 0;
      const peak = sorted[sorted.length - 1] || 0;
      // If noise floor is high relative to peak => background noisy
      if (peak > 0.05 && floor / peak > noiseRatio && noiseSamplesRef.current.length > 120) {
        flag('noisy');
      }

      // Good signal recovers state
      if (rms >= lowThreshold && (floor / Math.max(peak, 0.0001)) < noiseRatio * 0.7) {
        if (lastIssueRef.current && quality !== 'good') {
          lastIssueRef.current = null;
          setQuality('good');
        } else if (!lastIssueRef.current) {
          setQuality('good');
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const flag = (q: AudioQuality) => {
    if (lastIssueRef.current === q) return;
    lastIssueRef.current = q;
    setQuality(q);
    onIssueRef.current?.(q);
  };

  const cleanup = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') ctxRef.current.close().catch(() => {});
    ctxRef.current = null;
    analyserRef.current = null;
    lowSinceRef.current = null;
    silenceSinceRef.current = null;
    noiseSamplesRef.current = [];
  };

  const reset = () => {
    lowSinceRef.current = null;
    silenceSinceRef.current = null;
    noiseSamplesRef.current = [];
    lastIssueRef.current = null;
    setQuality('idle');
  };

  return { quality, level, reset };
};
