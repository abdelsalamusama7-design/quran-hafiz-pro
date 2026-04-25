import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Robust Arabic speech recognition hook.
 * Fixes common Web Speech API issues:
 *  - Duplicated text when continuous + interimResults are on
 *  - Re-emission of finalized chunks on auto-restart
 *  - Stale finals lingering when user pauses
 *
 * Behavior:
 *  - `transcript` always reflects: committed final text + current interim (no dupes)
 *  - `onFinalChunk(chunk)` fires once per truly new finalized utterance
 *  - Auto-restarts on `onend` if still listening, without re-counting old finals
 */

interface Options {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  /** Called once per new finalized utterance, debounced by content */
  onFinalChunk?: (chunk: string, fullTranscript: string) => void;
  /** Called on hard errors (not no-speech / aborted) */
  onError?: (error: string) => void;
}

interface ReturnShape {
  transcript: string;
  interim: string;
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

const normalize = (s: string) =>
  s
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const useSpeechRecognition = (opts: Options = {}): ReturnShape => {
  const {
    lang = 'ar-SA',
    continuous = true,
    interimResults = true,
    onFinalChunk,
    onError,
  } = opts;

  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [isListening, setIsListening] = useState(false);

  // Refs (avoid stale closures + survive auto-restart)
  const recognitionRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const finalTextRef = useRef(''); // accumulated committed text
  const seenFinalsRef = useRef<Set<string>>(new Set()); // dedupe finals
  const onFinalChunkRef = useRef(onFinalChunk);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFinalChunkRef.current = onFinalChunk;
    onErrorRef.current = onError;
  }, [onFinalChunk, onError]);

  const SR: any =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const isSupported = !!SR;

  const buildRecognition = useCallback(() => {
    if (!SR) return null;
    const recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let newFinalChunk = '';
      let interimChunk = '';

      // Process ONLY results from resultIndex onward — the spec guarantees
      // earlier results are already final and shouldn't be re-read. But some
      // browsers re-emit; we additionally dedupe via seenFinalsRef.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const text = res[0]?.transcript ?? '';
        if (res.isFinal) {
          const key = normalize(text);
          if (key && !seenFinalsRef.current.has(key)) {
            seenFinalsRef.current.add(key);
            newFinalChunk += text.trim() + ' ';
          }
        } else {
          interimChunk += text;
        }
      }

      if (newFinalChunk) {
        const trimmed = newFinalChunk.trim();
        finalTextRef.current = (finalTextRef.current + ' ' + trimmed).trim();
        const full = finalTextRef.current;
        setTranscript(full);
        onFinalChunkRef.current?.(trimmed, full);
      }

      // Live interim for UI (separate state so it doesn't pollute final text)
      setInterim(interimChunk.trim());
    };

    recognition.onerror = (e: any) => {
      const err = e?.error || 'unknown';
      // Benign: keep listening
      if (err === 'no-speech' || err === 'aborted') return;
      onErrorRef.current?.(err);
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        listeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Clear interim on segment end
      setInterim('');
      // Auto-restart while user still wants to listen
      if (listeningRef.current && continuous) {
        try {
          recognition.start();
        } catch {
          // If we can't restart, mark as stopped
          listeningRef.current = false;
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [SR, lang, continuous, interimResults]);

  const start = useCallback(() => {
    if (!isSupported || listeningRef.current) return;
    // Fresh state
    finalTextRef.current = '';
    seenFinalsRef.current = new Set();
    setTranscript('');
    setInterim('');

    const recognition = buildRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    listeningRef.current = true;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      // Already started — ignore
    }
  }, [buildRecognition, isSupported]);

  const stop = useCallback(() => {
    listeningRef.current = false;
    setIsListening(false);
    setInterim('');
    try {
      recognitionRef.current?.stop();
    } catch {}
    recognitionRef.current = null;
  }, []);

  const reset = useCallback(() => {
    finalTextRef.current = '';
    seenFinalsRef.current = new Set();
    setTranscript('');
    setInterim('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      listeningRef.current = false;
      try {
        recognitionRef.current?.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  return { transcript, interim, isListening, isSupported, start, stop, reset };
};
