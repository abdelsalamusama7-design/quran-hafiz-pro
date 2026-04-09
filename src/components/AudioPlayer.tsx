import { useAudio, reciters } from '@/contexts/AudioContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { Play, Pause, SkipForward, SkipBack, Repeat, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';

const AudioPlayer = () => {
  const { t } = useLanguage();
  const audio = useAudio();
  const [expanded, setExpanded] = useState(false);

  if (!audio.currentSurahId) return null;

  const surah = surahs.find(s => s.id === audio.currentSurahId);
  if (!surah) return null;

  const speeds = [0.5, 0.75, 1, 1.25, 1.5];

  return (
    <div className="fixed bottom-16 inset-x-0 z-40 px-2">
      <div className="max-w-lg mx-auto bg-card border border-border rounded-2xl shadow-islamic overflow-hidden">
        {/* Compact bar */}
        <div className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 rounded-xl gradient-islamic flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            {surah.id}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground font-arabic truncate">{surah.name}</p>
            <p className="text-[10px] text-muted-foreground">{t('verses')} {audio.currentVerse}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={audio.prevVerse} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <SkipBack size={16} />
            </button>
            <button
              onClick={audio.isPlaying ? audio.pause : audio.resume}
              className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
            >
              {audio.isPlaying ? <Pause size={16} /> : <Play size={16} className="ms-0.5" />}
            </button>
            <button onClick={audio.nextVerse} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <SkipForward size={16} />
            </button>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 text-muted-foreground">
            {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          <button onClick={audio.stop} className="p-1 text-muted-foreground hover:text-destructive">
            <X size={16} />
          </button>
        </div>

        {/* Expanded controls */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 animate-fade-in">
            {/* Speed */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">{t('speed')}</p>
              <div className="flex gap-1.5">
                {speeds.map(s => (
                  <button
                    key={s}
                    onClick={() => audio.setSpeed(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      audio.speed === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Loop */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground">{t('loopVerse')}</span>
              <button
                onClick={() => audio.setLoopVerse(!audio.loopVerse)}
                className={`p-2 rounded-lg transition-all ${
                  audio.loopVerse ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Repeat size={14} />
              </button>
            </div>

            {/* Reciter */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5">{t('reciter')}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {reciters.map(r => (
                  <button
                    key={r.id}
                    onClick={() => audio.setReciter(r.id)}
                    className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-all ${
                      audio.reciter === r.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {t(r.name)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioPlayer;
