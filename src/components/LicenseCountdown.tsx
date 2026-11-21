import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarClock, Clock } from 'lucide-react';
import type { WorkspaceLicense } from '../types';
import { getLicenseCountdown } from '../services/developerLicense';

interface LicenseCountdownProps {
  license?: WorkspaceLicense | null;
  variant: 'desktop-header' | 'settings-card';
  expiredLabel?: string;
}

const DigitBox: React.FC<{ value: string; toneClass: string; compact?: boolean }> = ({
  value,
  toneClass,
  compact = false,
}) => (
  <span
    className={`relative inline-flex items-center justify-center overflow-hidden rounded font-mono font-bold tabular-nums leading-none ${
      compact ? 'min-w-[1.35rem] px-1 py-0.5 text-[11px]' : 'min-w-[1.6rem] px-1.5 py-1 text-xs'
    } ${toneClass}`}
  >
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={value}
        initial={{ y: -7, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 7, opacity: 0 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </span>
);

export const LicenseCountdown: React.FC<LicenseCountdownProps> = ({
  license,
  variant,
  expiredLabel = 'ផុតកំណត់',
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [license?.expireAt]);

  const info = getLicenseCountdown(license, nowMs);
  if (!info.hasExpireDate) {
    return variant === 'settings-card' ? (
      <span className="text-sm font-semibold text-muted">-</span>
    ) : null;
  }

  const hh = String(info.hours).padStart(2, '0');
  const mm = String(info.minutes).padStart(2, '0');
  const ss = String(info.seconds).padStart(2, '0');

  const tone = info.expired
    ? {
        wrapper: 'border-danger/45 bg-danger/10 text-danger',
        digit: 'bg-danger/15 text-danger border border-danger/30',
        dot: 'bg-danger',
        dateText: 'text-danger',
        colon: 'text-danger/80',
      }
    : info.isWarning
    ? {
        wrapper: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        digit:
          'bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/30',
        dot: 'bg-amber-500',
        dateText: 'text-amber-700 dark:text-amber-300',
        colon: 'text-amber-600/80 dark:text-amber-400/80',
      }
    : {
        wrapper: 'border-primary/25 bg-primary/8 text-primary',
        digit: 'bg-primary/12 text-primary border border-primary/25',
        dot: 'bg-success',
        dateText: 'text-foreground',
        colon: 'text-primary/70',
      };

  if (variant === 'desktop-header') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        title={`កាលបរិច្ឆេទផុតកំណត់៖ ${info.formattedExpireDate}`}
        className={`inline-flex items-center gap-2 rounded-control border px-2.5 py-1 text-xs shrink-0 shadow-2xs ${tone.wrapper}`}
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <motion.span
            className={`absolute inline-flex h-full w-full rounded-full opacity-70 ${tone.dot}`}
            animate={{ scale: [1, 1.9, 1], opacity: [0.7, 0, 0.7] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
        </span>

        <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-85" aria-hidden="true" />

        <span className={`font-semibold tabular-nums whitespace-nowrap ${tone.dateText}`}>
          {info.dateOnly}
        </span>

        <span className="opacity-35 select-none" aria-hidden="true">
          |
        </span>

        {info.expired ? (
          <span className="font-bold whitespace-nowrap">{expiredLabel}</span>
        ) : (
          <span className="font-semibold tabular-nums whitespace-nowrap opacity-90">
            {info.days} ថ្ងៃ
          </span>
        )}

        <div className="inline-flex items-center gap-0.5 shrink-0" aria-label={`រាប់ថយក្រោយ ${info.hhmmss}`}>
          <DigitBox value={hh} toneClass={tone.digit} compact />
          <motion.span
            aria-hidden="true"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className={`font-mono font-bold text-[11px] leading-none ${tone.colon}`}
          >
            :
          </motion.span>
          <DigitBox value={mm} toneClass={tone.digit} compact />
          <motion.span
            aria-hidden="true"
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className={`font-mono font-bold text-[11px] leading-none ${tone.colon}`}
          >
            :
          </motion.span>
          <DigitBox value={ss} toneClass={tone.digit} compact />
        </div>
      </motion.div>
    );
  }

  // variant === 'settings-card': Expire Date + live HH:MM:SS countdown
  return (
    <div className="flex flex-wrap items-center gap-2 pt-0.5">
      <strong className={`text-sm font-semibold tabular-nums ${info.expired ? 'text-danger' : 'text-primary'}`}>
        {info.dateOnly}
      </strong>
      <div className="inline-flex items-center gap-1">
        <Clock className={`h-3.5 w-3.5 shrink-0 ${info.expired ? 'text-danger' : 'text-primary'}`} aria-hidden="true" />
        <DigitBox value={hh} toneClass={tone.digit} />
        <motion.span
          aria-hidden="true"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className={`font-mono font-bold text-xs leading-none ${tone.colon}`}
        >
          :
        </motion.span>
        <DigitBox value={mm} toneClass={tone.digit} />
        <motion.span
          aria-hidden="true"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className={`font-mono font-bold text-xs leading-none ${tone.colon}`}
        >
          :
        </motion.span>
        <DigitBox value={ss} toneClass={tone.digit} />
      </div>
    </div>
  );
};
