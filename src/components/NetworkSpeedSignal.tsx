import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface NetworkSpeedSignalProps {
  onlineTitle: string;
  offlineTitle: string;
  onOnlineChange?: (online: boolean) => void;
}

interface SpeedMeasurement {
  online: boolean;
  mbps: number | null;
  measuredAt: number;
}

interface NetworkInformationLike {
  downlink?: number;
}

function formatMbpsNumber(mbps: number): string {
  if (!Number.isFinite(mbps) || mbps <= 0) return '0';
  if (mbps < 1) return mbps.toFixed(2);
  if (mbps < 10) return mbps.toFixed(1);
  if (mbps < 100) return mbps.toFixed(1);
  return String(Math.round(mbps));
}

async function runSingleProbe(
  bytes: number,
  signal: AbortSignal
): Promise<{ bytes: number; elapsedMs: number; ok: boolean; status: number }> {
  const url = `/api/speed-probe?bytes=${bytes}&t=${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const t0 = performance.now();
  const res = await fetch(url, {
    method: 'GET',
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    return { bytes: 0, elapsedMs: 0, ok: false, status: res.status };
  }
  const buf = await res.arrayBuffer();
  const t1 = performance.now();
  return {
    bytes: buf.byteLength,
    elapsedMs: Math.max(1, t1 - t0),
    ok: buf.byteLength > 0,
    status: res.status,
  };
}

async function measureAccurateInternetSpeed(
  externalSignal?: AbortSignal
): Promise<{ online: boolean; mbps: number | null }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { online: false, mbps: 0 };
  }

  const controller = new AbortController();
  const handleExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', handleExternalAbort);
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);

  try {
    // 1. Warm up HTTP keep-alive connection & confirm live reachability
    const headRes = await fetch(`/api/speed-probe?ping=${Date.now()}`, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    if (headRes.ok) {
      // 2. Stage 1 probe: 96 KB incompressible random binary bytes (uncached, identity encoding)
      const stage1 = await runSingleProbe(98304, controller.signal);
      if (stage1.ok && stage1.bytes > 0) {
        let bestBytes = stage1.bytes;
        let bestMs = stage1.elapsedMs;

        // 3. Adaptive Stage 2 probe (256 KB) for fast connections to prevent millisecond jitter
        if (stage1.elapsedMs < 110) {
          const stage2 = await runSingleProbe(262144, controller.signal);
          if (stage2.ok && stage2.bytes > 0) {
            bestBytes = stage2.bytes;
            bestMs = stage2.elapsedMs;
          }
        }

        const mbps = (bestBytes * 8) / ((bestMs / 1000) * 1_000_000);
        const clamped = Math.max(0.05, Math.min(9999, mbps));
        return { online: true, mbps: clamped };
      }
    }

    // Fallback when running on static hosting without /api/speed-probe
    const fallbackStart = performance.now();
    const fallbackRes = await fetch(`/manifest.webmanifest?ping=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!fallbackRes.ok && fallbackRes.status >= 500) {
      return { online: false, mbps: 0 };
    }
    const fallbackBuf = await fallbackRes.arrayBuffer();
    const fallbackMs = Math.max(1, performance.now() - fallbackStart);

    const navConn = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    if (navConn && typeof navConn.downlink === 'number' && navConn.downlink > 0) {
      return { online: true, mbps: navConn.downlink };
    }

    if (fallbackBuf.byteLength > 0) {
      const estMbps = (fallbackBuf.byteLength * 8) / ((fallbackMs / 1000) * 1_000_000);
      return { online: true, mbps: Math.max(0.1, Math.min(999, estMbps)) };
    }
    return { online: true, mbps: null };
  } catch {
    return { online: false, mbps: 0 };
  } finally {
    externalSignal?.removeEventListener('abort', handleExternalAbort);
    window.clearTimeout(timeoutId);
  }
}

export const NetworkSpeedSignal: React.FC<NetworkSpeedSignalProps> = ({
  onlineTitle,
  offlineTitle,
  onOnlineChange,
}) => {
  const [measurement, setMeasurement] = useState<SpeedMeasurement>(() => ({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    mbps: typeof navigator !== 'undefined' && navigator.onLine === false ? 0 : null,
    measuredAt: 0,
  }));
  const [measuring, setMeasuring] = useState(false);
  const inFlightRef = useRef(false);
  const activeAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const onOnlineChangeRef = useRef(onOnlineChange);
  onOnlineChangeRef.current = onOnlineChange;

  const runSpeedTest = useCallback(async (force = false) => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      activeAbortRef.current?.abort();
      if (mountedRef.current) {
        setMeasuring(false);
        setMeasurement({ online: false, mbps: 0, measuredAt: Date.now() });
      }
      onOnlineChangeRef.current?.(false);
      return;
    }

    if (inFlightRef.current) {
      if (!force) return;
      activeAbortRef.current?.abort();
    }

    const runAbort = new AbortController();
    activeAbortRef.current = runAbort;
    inFlightRef.current = true;
    if (mountedRef.current) setMeasuring(true);
    try {
      const result = await measureAccurateInternetSpeed(runAbort.signal);
      if (!mountedRef.current || activeAbortRef.current !== runAbort) return;
      setMeasurement({
        online: result.online,
        mbps: result.mbps,
        measuredAt: Date.now(),
      });
      onOnlineChangeRef.current?.(result.online);
    } finally {
      if (activeAbortRef.current === runAbort) {
        activeAbortRef.current = null;
        inFlightRef.current = false;
        if (mountedRef.current) setMeasuring(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const handleOffline = () => {
      activeAbortRef.current?.abort();
      activeAbortRef.current = null;
      inFlightRef.current = false;
      setMeasuring(false);
      setMeasurement({ online: false, mbps: 0, measuredAt: Date.now() });
      onOnlineChangeRef.current?.(false);
    };
    const handleOnline = () => {
      setMeasurement((prev) => ({ ...prev, online: true }));
      onOnlineChangeRef.current?.(true);
      void runSpeedTest(true);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void runSpeedTest(false);
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);

    // Quick initial probe without blocking first paint, then refresh every 5 seconds
    const initialTimer = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        void runSpeedTest(false);
      }
    }, 800);

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void runSpeedTest(false);
      }
    }, 5_000);

    return () => {
      mountedRef.current = false;
      activeAbortRef.current?.abort();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearTimeout(initialTimer);
      window.clearInterval(pollTimer);
    };
  }, [runSpeedTest]);

  const isOnline = measurement.online;
  const mbpsValue = measurement.mbps;
  const isSlowConnection = isOnline && mbpsValue !== null && mbpsValue < 3;
  const formattedSpeed = !isOnline
    ? '0'
    : mbpsValue === null
    ? '...'
    : formatMbpsNumber(mbpsValue);

  const toneClass = !isOnline
    ? 'text-danger hover:bg-danger/10'
    : isSlowConnection
    ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
    : 'text-success hover:bg-success/10';

  const badgeToneClass = !isOnline
    ? 'text-danger bg-danger/12 border-danger/30'
    : isSlowConnection
    ? 'text-amber-700 dark:text-amber-300 bg-amber-500/12 border-amber-500/30'
    : 'text-success bg-success/10 border-success/25';

  const tooltipText = isOnline
    ? `${onlineTitle}${mbpsValue !== null ? ` · ${formattedSpeed} Mbps` : ''} (ចុចដើម្បីវាស់ល្បឿនឡើងវិញ)`
    : `${offlineTitle} · 0 Mbps`;

  return (
    <motion.button
      type="button"
      role="status"
      aria-live="polite"
      onClick={() => void runSpeedTest(true)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      title={tooltipText}
      aria-label={tooltipText}
      className={`relative inline-flex h-11 sm:h-10 min-w-[3.4rem] px-1.5 flex-col items-center justify-center rounded-xl bg-transparent shrink-0 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${toneClass}`}
    >
      {/* Compact animated Mbps speed readout directly above the signal tower */}
      <div
        className={`relative -mb-0.5 flex items-baseline gap-[2px] rounded px-1 py-[1px] border text-[9px] leading-none font-bold tracking-tight tabular-nums select-none ${badgeToneClass}`}
      >
        {measuring && isOnline && (
          <motion.span
            aria-hidden="true"
            className="inline-block h-1 w-1 rounded-full bg-current self-center mr-[1px]"
            animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.25, 0.8] }}
            transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={formattedSpeed}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {formattedSpeed}
          </motion.span>
        </AnimatePresence>
        <span className="text-[7.5px] font-semibold opacity-80 uppercase">Mbps</span>
      </div>

      {/* Signal Tower SVG with live animated waves */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.95"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-[22px] w-[22px]"
      >
        <path d="M12 9.5v11.5M8.5 21l3.5-10 3.5 10M9.7 17.2h4.6" />
        {isOnline ? (
          <>
            <motion.circle
              cx="12"
              cy="7.5"
              r="1.6"
              fill="currentColor"
              stroke="none"
              animate={{ scale: [1, 1.25, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: measuring ? 0.9 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path
              d="M8.7 11a4.7 4.7 0 0 1 0-6.8"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: measuring ? 0.9 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path
              d="M15.3 4.2a4.7 4.7 0 0 1 0 6.8"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: measuring ? 0.9 : 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.path
              d="M5.8 13.4a8.2 8.2 0 0 1 0-11.6"
              animate={{ opacity: [0.18, 0.95, 0.18] }}
              transition={{
                duration: measuring ? 0.9 : 1.8,
                delay: 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <motion.path
              d="M18.2 1.8a8.2 8.2 0 0 1 0 11.6"
              animate={{ opacity: [0.18, 0.95, 0.18] }}
              transition={{
                duration: measuring ? 0.9 : 1.8,
                delay: 0.3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </>
        ) : (
          <>
            <circle cx="12" cy="7.5" r="1.4" fill="currentColor" stroke="none" opacity="0.7" />
            <path d="M4 4l16 16" strokeWidth="2.1" />
          </>
        )}
      </svg>
    </motion.button>
  );
};
