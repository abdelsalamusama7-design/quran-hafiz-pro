import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

export interface AudioState {
  isPlaying: boolean;
  currentSurahId: number | null;
  currentVerse: number;
  speed: number;
  loopVerse: boolean;
  reciter: string;
}

interface AudioContextType extends AudioState {
  playVerse: (surahId: number, verseNum: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setSpeed: (speed: number) => void;
  setLoopVerse: (loop: boolean) => void;
  setReciter: (reciter: string) => void;
  nextVerse: () => void;
  prevVerse: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const reciters = [
  { id: 'ar.alafasy', name: 'alAfasy', folder: '128/ar.alafasy' },
  { id: 'ar.husary', name: 'alHusary', folder: '128/ar.husary' },
  { id: 'ar.minshawi', name: 'alMinshawi', folder: '128/ar.minshawi' },
  { id: 'ar.abdulbasitmurattal', name: 'abdelBaset', folder: '128/ar.abdulbasitmurattal' },
];

// Build the cumulative verse number for audio URL
const surahVerseOffsets: Record<number, number> = {};
const verseCounts = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
let cumulative = 0;
for (let i = 0; i < verseCounts.length; i++) {
  surahVerseOffsets[i + 1] = cumulative;
  cumulative += verseCounts[i];
}

const getAudioUrl = (reciterFolder: string, surahId: number, verseNum: number) => {
  const globalVerseNum = surahVerseOffsets[surahId] + verseNum;
  return `https://cdn.islamic.network/quran/audio/${reciterFolder}/${globalVerseNum}.mp3`;
};

const getMaxVerse = (surahId: number) => verseCounts[surahId - 1] || 1;

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentSurahId: null,
    currentVerse: 1,
    speed: 1,
    loopVerse: false,
    reciter: 'ar.alafasy',
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getReciterFolder = useCallback(() => {
    return reciters.find(r => r.id === state.reciter)?.folder || '128/ar.alafasy';
  }, [state.reciter]);

  const playVerse = useCallback((surahId: number, verseNum: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const folder = reciters.find(r => r.id === stateRef.current.reciter)?.folder || '128/ar.alafasy';
    const url = getAudioUrl(folder, surahId, verseNum);
    const audio = new Audio(url);
    audio.playbackRate = stateRef.current.speed;
    audioRef.current = audio;

    audio.onended = () => {
      const s = stateRef.current;
      if (s.loopVerse) {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        const maxVerse = getMaxVerse(surahId);
        if (verseNum < maxVerse) {
          playVerse(surahId, verseNum + 1);
        } else {
          setState(prev => ({ ...prev, isPlaying: false }));
        }
      }
    };

    audio.play().catch(() => {});
    setState(prev => ({ ...prev, isPlaying: true, currentSurahId: surahId, currentVerse: verseNum }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState(prev => ({ ...prev, isPlaying: false, currentSurahId: null }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
    setState(prev => ({ ...prev, speed }));
  }, []);

  const setLoopVerse = useCallback((loopVerse: boolean) => {
    setState(prev => ({ ...prev, loopVerse }));
  }, []);

  const setReciter = useCallback((reciter: string) => {
    setState(prev => ({ ...prev, reciter }));
  }, []);

  const nextVerse = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentSurahId) return;
    const max = getMaxVerse(s.currentSurahId);
    if (s.currentVerse < max) {
      playVerse(s.currentSurahId, s.currentVerse + 1);
    }
  }, [playVerse]);

  const prevVerse = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentSurahId) return;
    if (s.currentVerse > 1) {
      playVerse(s.currentSurahId, s.currentVerse - 1);
    }
  }, [playVerse]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return (
    <AudioContext.Provider value={{ ...state, playVerse, pause, resume, stop, setSpeed, setLoopVerse, setReciter, nextVerse, prevVerse }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
};
