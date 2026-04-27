import { Mic, MicOff, type LucideIcon } from 'lucide-react';

interface StickyStartBarProps {
  active: boolean;
  onStart: () => void;
  onStop: () => void;
  startLabel: string;
  stopLabel: string;
  hint?: string;
  activeHint?: string;
  disabled?: boolean;
  StartIcon?: LucideIcon;
  StopIcon?: LucideIcon;
}

/**
 * Reusable always-visible top action bar used across recitation tools.
 * Provides a single, prominent Start/Stop button with consistent styling.
 */
const StickyStartBar = ({
  active,
  onStart,
  onStop,
  startLabel,
  stopLabel,
  hint,
  activeHint,
  disabled,
  StartIcon = Mic,
  StopIcon = MicOff,
}: StickyStartBarProps) => {
  return (
    <div className="sticky top-2 z-30 -mx-1">
      <div className="bg-background/85 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-border/50">
        <button
          onClick={() => { if (active) onStop(); else onStart(); }}
          disabled={disabled}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 shadow-md active:scale-[0.98] transition-all disabled:opacity-60 ${
            active
              ? 'bg-destructive text-destructive-foreground animate-pulse'
              : 'bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground'
          }`}
        >
          {active ? <StopIcon size={22} /> : <StartIcon size={22} />}
          <span className="font-arabic">{active ? stopLabel : startLabel}</span>
        </button>
        {(active && activeHint) || (!active && hint) ? (
          <p className="text-[11px] text-center text-muted-foreground mt-1.5 font-arabic">
            {active ? activeHint : hint}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default StickyStartBar;