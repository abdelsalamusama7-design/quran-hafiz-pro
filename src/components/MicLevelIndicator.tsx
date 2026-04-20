import { useEffect, useRef, useState } from 'react';

interface Props {
  active: boolean;
  className?: string;
}

/**
 * Animated mic-level indicator using Web Audio API.
 * Shows live waveform bars reflecting actual microphone input level.
 * Falls back to a pulsing dots animation if mic access is unavailable.
 */
const MicLevelIndicator = ({ active, className = '' }: Props) => {
  const [levels, setLevels] = useState<number[]>(new Array(7).fill(0));
  const [hasMic, setHasMic] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!active) {
      cleanup();
      setLevels(new Array(7).fill(0));
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        setHasMic(true);
        tick();
      } catch {
        setHasMic(false);
      }
    };

    const tick = () => {
      const analyser = analyserRef.current;
      const data = dataArrayRef.current;
      if (!analyser || !data) return;
      analyser.getByteFrequencyData(data);

      // Bucket into 7 bands
      const bandCount = 7;
      const bandSize = Math.floor(data.length / bandCount);
      const newLevels: number[] = [];
      for (let b = 0; b < bandCount; b++) {
        let sum = 0;
        for (let i = 0; i < bandSize; i++) sum += data[b * bandSize + i];
        const avg = sum / bandSize / 255; // 0-1
        // Boost low signals so visible
        newLevels.push(Math.min(1, Math.pow(avg * 1.4, 0.7)));
      }
      setLevels(newLevels);
      rafRef.current = requestAnimationFrame(tick);
    };

    init();

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const cleanup = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    dataArrayRef.current = null;
  };

  if (!active) return null;

  // Fallback pulsing dots (mic blocked)
  if (!hasMic) {
    return (
      <div className={`flex items-center justify-center gap-1.5 h-8 ${className}`}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-destructive"
            style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
        <span className="text-[10px] text-destructive ms-1 font-bold">MIC?</span>
      </div>
    );
  }

  // Live waveform bars
  return (
    <div className={`flex items-center justify-center gap-1 h-8 ${className}`} aria-label="microphone level">
      {levels.map((lvl, i) => {
        // Symmetric heights (centered higher in middle)
        const center = (levels.length - 1) / 2;
        const distFromCenter = Math.abs(i - center) / center;
        const heightPct = Math.max(15, (lvl * 100) * (1 - distFromCenter * 0.3));
        return (
          <span
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-primary to-emerald-400 transition-all duration-75"
            style={{
              height: `${heightPct}%`,
              minHeight: '4px',
              opacity: 0.6 + lvl * 0.4,
            }}
          />
        );
      })}
    </div>
  );
};

export default MicLevelIndicator;
