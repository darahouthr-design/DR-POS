import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Surface } from './ui';
import { APP_LOGO_URL } from './Icon3D';

export interface DatabaseProgressBarProps {
  /** Whether the database fetch / page load is currently in progress */
  active: boolean;
  /** Optional milestone target (0..96) reflecting actual loaded streams/collections */
  targetProgress?: number;
  /** Primary status text shown next to the animated graphic columns */
  label?: string;
  /** Visual layout variant */
  variant?: 'card' | 'banner' | 'inline';
  /** Changing this key resets the progress cleanly back to 0% for a new fetch */
  resetKey?: string | number;
  /** Optional callback invoked right after 100% completion finishes */
  onComplete?: () => void;
  className?: string;
}

const EQ_DELAYS = ['0ms', '140ms', '280ms', '90ms'];
const SCALE_MARKS = [0, 25, 50, 75, 100];

export const DatabaseProgressBar: React.FC<DatabaseProgressBarProps> = ({
  active,
  targetProgress,
  label = 'កំពុងទាញរបាយការណ៍..',
  variant = 'banner',
  resetKey,
  onComplete,
  className = '',
}) => {
  const [visible, setVisible] = useState<boolean>(active);
  const [progress, setProgress] = useState<number>(active ? 0 : 100);
  const progressRef = useRef<number>(active ? 0 : 100);
  const wasActiveRef = useRef<boolean>(active);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset cleanly to 0% when a new fetch starts or resetKey changes while active
  useEffect(() => {
    if (active) {
      if (!wasActiveRef.current || progressRef.current >= 99) {
        progressRef.current = 0;
        setProgress(0);
      }
      wasActiveRef.current = true;
      setVisible(true);
    }
  }, [active, resetKey]);

  useEffect(() => {
    if (!visible) return;

    let rafId = 0;
    let hideTimer = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, Math.max(8, now - lastTs));
      lastTs = now;

      const cur = progressRef.current;

      if (!active) {
        // Database fetch completed -> glide smoothly to 100%, hold briefly, then fade out
        const rem = 100 - cur;
        const speed = Math.max(1.2, rem * 0.28);
        const next = Math.min(100, cur + speed * (dt / 16));
        progressRef.current = next;
        const rounded = Math.round(next);
        setProgress((prev) => (Math.round(prev) === rounded ? prev : next));

        if (next >= 99.6) {
          progressRef.current = 100;
          setProgress(100);
          wasActiveRef.current = false;
          hideTimer = window.setTimeout(() => {
            setVisible(false);
            onCompleteRef.current?.();
          }, 200);
          return;
        }
      } else {
        // Still fetching from Database -> smoothly advance according to real milestone / speed
        const desiredTarget =
          typeof targetProgress === 'number' && Number.isFinite(targetProgress)
            ? Math.max(24, Math.min(94, targetProgress))
            : 90;

        if (cur < desiredTarget) {
          const rem = desiredTarget - cur;
          const rate = cur < 35 ? 0.085 : cur < 70 ? 0.045 : 0.025;
          const step = Math.max(0.1, rem * rate) * (dt / 16);
          const next = Math.min(desiredTarget, cur + step);
          progressRef.current = next;
          const rounded = Math.round(next);
          setProgress((prev) => (Math.round(prev) === rounded ? prev : next));
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [active, visible, targetProgress]);

  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const scaleX = Math.max(0, Math.min(1, progress / 100));

  const graphicBarBlock = (showTicks: boolean) => (
    <div className="space-y-2 w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="inline-flex items-end gap-[2.5px] h-3.5 shrink-0"
          >
            {EQ_DELAYS.map((delay, idx) => (
              <span
                key={idx}
                className="drpos-eq-bar w-[3px] h-full rounded-full bg-primary"
                style={{ animationDelay: delay }}
              />
            ))}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
            {label}
          </span>
        </div>

        <span className="font-mono text-xs sm:text-sm font-bold tabular-nums text-primary shrink-0">
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

      {showTicks && (
        <div
          aria-hidden="true"
          className="flex items-center justify-between px-0.5 pt-0.5"
        >
          {SCALE_MARKS.map((mark) => {
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
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            key="db-progress-card"
            role="status"
            aria-live="polite"
            aria-label={`${label} ${pct}%`}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`min-h-[48dvh] w-full flex items-center justify-center px-4 py-8 ${className}`}
          >
            <Surface className="w-full max-w-[350px] rounded-2xl p-6 sm:p-7 shadow-[var(--shadow-float)] space-y-5">
              <div className="flex justify-center">
                <div className="relative flex items-center justify-center">
                  <motion.span
                    aria-hidden="true"
                    animate={{ scale: [1, 1.15, 1], opacity: [0.22, 0.04, 0.22] }}
                    transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-2xl bg-primary/35"
                  />
                  <div className="relative h-13 w-13 rounded-2xl border border-border/70 bg-surface-elevated p-1.5 shadow-xs overflow-hidden flex items-center justify-center">
                    <img
                      src={APP_LOGO_URL}
                      alt="DR-POS"
                      width={40}
                      height={40}
                      className="h-full w-full rounded-xl object-cover"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              {graphicBarBlock(true)}
            </Surface>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (variant === 'inline') {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            key="db-progress-inline"
            role="status"
            aria-live="polite"
            aria-label={`${label} ${pct}%`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`py-6 px-3 sm:px-6 flex justify-center ${className}`}
          >
            <div className="w-full max-w-md rounded-card border border-border/70 bg-background/60 p-4">
              {graphicBarBlock(true)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // variant === 'banner'
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="db-progress-banner"
          role="status"
          aria-live="polite"
          aria-label={`${label} ${pct}%`}
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.99 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className={className}
        >
          <Surface className="p-3.5 sm:p-4 border-primary/25 shadow-xs">
            {graphicBarBlock(true)}
          </Surface>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
