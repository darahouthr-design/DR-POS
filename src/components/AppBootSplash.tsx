import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { APP_LOGO_URL } from './Icon3D';

export type BootStage = 'auth' | 'workspace' | 'ready' | 'suspense';

interface AppBootSplashProps {
  stage: BootStage;
  onComplete?: () => void;
}

declare global {
  interface Window {
    __DRPOS_BOOT_PROGRESS__?: number;
    __DRPOS_STOP_HTML_BOOT__?: () => void;
  }
}

const STAGE_TARGET: Record<BootStage, number> = {
  auth: 56,
  workspace: 92,
  suspense: 94,
  ready: 100,
};

const EQ_BARS = [
  { delay: '0ms', minScale: 0.35 },
  { delay: '140ms', minScale: 0.55 },
  { delay: '280ms', minScale: 0.3 },
  { delay: '90ms', minScale: 0.45 },
];

export const AppBootSplash: React.FC<AppBootSplashProps> = ({ stage, onComplete }) => {
  const [progress, setProgress] = useState<number>(() => {
    if (typeof window !== 'undefined' && typeof window.__DRPOS_BOOT_PROGRESS__ === 'number') {
      const initial = Math.max(0, Math.min(96, window.__DRPOS_BOOT_PROGRESS__));
      return stage === 'suspense' ? Math.max(initial, 74) : initial;
    }
    return stage === 'suspense' ? 76 : 12;
  });

  const progressRef = useRef(progress);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Hand off cleanly from the pre-React inline HTML boot script
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.__DRPOS_STOP_HTML_BOOT__ === 'function') {
      window.__DRPOS_STOP_HTML_BOOT__();
    }
  }, []);

  useEffect(() => {
    if (stage !== 'ready') {
      completedRef.current = false;
    }

    let rafId = 0;
    let finishTimer = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, Math.max(8, now - lastTs));
      lastTs = now;

      const target = STAGE_TARGET[stage];
      const current = progressRef.current;

      let next = current;
      if (stage === 'ready') {
        const remaining = 100 - current;
        const speed = Math.max(0.45, remaining * 0.22);
        next = Math.min(100, current + speed * (dt / 16));
      } else if (current < target) {
        const remaining = target - current;
        const rate = stage === 'auth' ? 0.055 : 0.04;
        const step = Math.max(0.08, remaining * rate) * (dt / 16);
        next = Math.min(target, current + step);
      }

      progressRef.current = next;
      if (typeof window !== 'undefined') {
        window.__DRPOS_BOOT_PROGRESS__ = next;
      }

      const roundedNext = Math.round(next);
      setProgress((prev) => (Math.round(prev) === roundedNext ? prev : next));

      if (stage === 'ready' && next >= 99.6) {
        progressRef.current = 100;
        setProgress(100);
        if (!completedRef.current) {
          completedRef.current = true;
          finishTimer = window.setTimeout(() => {
            onCompleteRef.current?.();
          }, 150);
        }
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
  }, [stage]);

  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const scaleX = Math.max(0, Math.min(1, progress / 100));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`កំពុងដំណើរការ ${pct}%`}
      className="min-h-dvh w-full flex items-center justify-center bg-background px-6 py-8"
    >
      <motion.div
        initial={{ opacity: 0.92, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[330px] rounded-2xl border border-border/80 bg-surface p-6 sm:p-7 shadow-[var(--shadow-float)] space-y-5"
      >
        {/* Centered Brand Emblem with Soft Animated Ring */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex items-center justify-center">
            <motion.span
              aria-hidden="true"
              animate={{ scale: [1, 1.16, 1], opacity: [0.22, 0.04, 0.22] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-2xl bg-primary/35"
            />
            <div className="relative h-14 w-14 rounded-2xl border border-border/70 bg-surface-elevated p-1.5 shadow-xs overflow-hidden flex items-center justify-center">
              <img
                src={APP_LOGO_URL}
                alt="DR-POS"
                width={44}
                height={44}
                className="h-full w-full rounded-xl object-cover"
                draggable={false}
              />
            </div>
          </div>
        </div>

        {/* Status Text + Animated Graphic Bars + Live 0%-100% Readout */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden="true"
                className="inline-flex items-end gap-[2.5px] h-3.5 shrink-0"
              >
                {EQ_BARS.map((bar, idx) => (
                  <span
                    key={idx}
                    className="drpos-eq-bar w-[3px] h-full rounded-full bg-primary"
                    style={{ animationDelay: bar.delay }}
                  />
                ))}
              </span>
              <span className="text-sm font-semibold text-foreground whitespace-nowrap truncate">
                កំពុងដំណើរការ..
              </span>
            </div>

            <span className="font-mono text-sm font-bold tabular-nums text-primary shrink-0">
              {pct}%
            </span>
          </div>

          {/* Standard Graphical Progress Bar */}
          <div className="relative h-2.5 w-full rounded-full bg-border/60 overflow-hidden">
            <div
              className="relative h-full w-full rounded-full origin-left bg-gradient-to-r from-[#0e6b48] via-[#138c5f] to-[#1ab37a] will-change-transform"
              style={{ transform: `scaleX(${scaleX})` }}
            >
              <span
                aria-hidden="true"
                className="drpos-progress-shimmer absolute inset-0"
              />
            </div>
          </div>

          {/* Subtle Precision Graphic Tick Marks (0% -> 100%) */}
          <div
            aria-hidden="true"
            className="flex items-center justify-between px-0.5 pt-0.5"
          >
            {[0, 25, 50, 75, 100].map((mark) => {
              const reached = pct >= mark;
              return (
                <div key={mark} className="flex flex-col items-center gap-1">
                  <span
                    className={`h-1.5 w-[1.5px] rounded-full transition-colors duration-150 ${
                      reached ? 'bg-primary/75' : 'bg-border'
                    }`}
                  />
                  <span
                    className={`font-mono text-[10px] tabular-nums transition-colors duration-150 ${
                      reached ? 'text-primary/85 font-semibold' : 'text-muted/70'
                    }`}
                  >
                    {mark}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
