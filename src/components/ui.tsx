import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ZoomIn, ZoomOut, RotateCcw, X, Camera } from 'lucide-react';
import { resolveImageUrl } from '../utils/helpers';
import { TRANSLATIONS } from '../utils/i18n';
import { useI18n } from '../utils/i18nContext';

export const Surface: React.FC<
  React.ComponentProps<'div'> & { inset?: boolean }
> = ({ inset = false, className = '', ...props }) => (
  <div
    className={`min-w-0 rounded-card border border-border/80 ${
      inset ? 'bg-background' : 'bg-surface shadow-surface'
    } text-foreground ${className}`}
    {...props}
  />
);

const buttonTones = {
  primary: 'bg-primary text-primary-foreground btn-3d-primary btn-animated-sheen',
  quiet: 'border border-border bg-surface text-foreground btn-3d-quiet hover:bg-background/80',
  danger: 'bg-danger text-danger-foreground btn-3d-danger btn-animated-sheen',
  accent: 'bg-accent text-accent-foreground btn-3d-primary btn-animated-sheen',
};

export const Button: React.FC<
  React.ComponentProps<'button'> & { tone?: keyof typeof buttonTones }
> = ({ tone = 'primary', type = 'button', className = '', children, disabled, ...props }) => (
  <motion.button
    whileHover={disabled ? undefined : { y: -1.5 }}
    whileTap={disabled ? undefined : { scale: 0.965, y: 1 }}
    transition={{ type: 'spring', stiffness: 460, damping: 28 }}
    type={type}
    disabled={disabled}
    className={`inline-flex min-h-11 items-center justify-center gap-1.5 sm:gap-2 rounded-control px-3 sm:px-4 py-2 text-[13px] sm:text-sm font-medium leading-snug focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${buttonTones[tone]} ${className}`}
    {...(props as Record<string, unknown>)}
  >
    {children}
  </motion.button>
);

export const Field: React.FC<{
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, required = false, children, className = '' }) => (
  <label className={`block min-w-0 space-y-1.5 ${className}`}>
    <span className="block text-[13px] sm:text-sm font-medium text-foreground leading-relaxed">
      {label}
      {required && (
        <span className="ml-1 font-bold text-danger" aria-hidden="true">
          *
        </span>
      )}
    </span>
    {children}
    {hint && <span className="block text-xs text-muted leading-relaxed">{hint}</span>}
  </label>
);

export const inputClass =
  'w-full min-w-0 max-w-full min-h-11 rounded-control border border-border bg-surface px-3.5 py-2 text-base sm:text-sm leading-normal text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary/30 transition-colors duration-150';

export const ProductImage: React.FC<{
  src?: string;
  alt: string;
  className?: string;
  onZoom?: (resolvedUrl: string, title: string) => void;
}> = ({ src, alt, className = 'h-36 w-full', onZoom }) => {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!resolved || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center overflow-hidden rounded-control border border-border/60 bg-background px-1.5 text-center ${className}`}
      >
        <span className="text-[10px] sm:text-xs font-semibold text-primary line-clamp-2 leading-tight break-words">
          {alt}
        </span>
      </div>
    );
  }

  if (onZoom) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onZoom(resolved, alt);
        }}
        title={t.ui.zoomTitle}
        className={`group relative block overflow-hidden rounded-control border border-border/60 bg-background cursor-zoom-in ${className}`}
      >
        <img
          src={resolved}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <span className="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-control bg-surface/90 px-2 py-0.5 text-[11px] font-medium text-foreground opacity-85 sm:opacity-0 transition-opacity duration-150 sm:group-hover:opacity-100">
          <ZoomIn className="h-3 w-3" /> Zoom
        </span>
      </button>
    );
  }

  return (
    <div className={`overflow-hidden rounded-control border border-border/60 bg-background ${className}`}>
      <img
        src={resolved}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </div>
  );
};

/**
 * Full-Screen Image Lightbox with Zoom In (+), Zoom Out (-), Reset (100%), and Mouse Wheel Zoom
 */
export const ImageZoomModal: React.FC<{
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}> = ({ imageUrl, title, onClose }) => {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    setScale(1);
  }, [imageUrl]);

  useEffect(() => {
    if (!imageUrl) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)));
      if (e.key === '-') setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex flex-col bg-foreground/85 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="mx-auto flex w-full max-w-4xl flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-card bg-surface px-3.5 sm:px-4 py-3 text-foreground shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 min-w-0">
          <p className="font-semibold text-sm truncate" title={title}>
            {title}
          </p>
          <Button tone="danger" onClick={onClose} aria-label={t.common.close} className="sm:hidden min-h-11 px-3">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <Button
            tone="quiet"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)))}
            aria-label={t.ui.zoomOut}
            className="flex-1 sm:flex-initial px-2.5 sm:px-3"
          >
            <ZoomOut className="h-4 w-4" /> <span className="hidden sm:inline">{t.ui.zoomOut}</span>
          </Button>
          <span className="min-w-12 text-center text-xs sm:text-sm font-semibold tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button
            tone="quiet"
            onClick={() => setScale((s) => Math.min(4, +(s + 0.25).toFixed(2)))}
            aria-label={t.ui.zoomIn}
            className="flex-1 sm:flex-initial px-2.5 sm:px-3"
          >
            <ZoomIn className="h-4 w-4" /> <span className="hidden sm:inline">{t.ui.zoomIn}</span>
          </Button>
          <Button tone="quiet" onClick={() => setScale(1)} aria-label="Reset zoom" className="px-2.5 sm:px-3">
            <RotateCcw className="h-4 w-4" /> 100%
          </Button>
          <Button tone="danger" onClick={onClose} aria-label={t.common.close} className="hidden sm:inline-flex">
            <X className="h-4 w-4" /> {t.common.close}
          </Button>
        </div>
      </div>

      <div
        className="mt-3 sm:mt-4 flex flex-1 items-center justify-center overflow-auto rounded-card"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.2 : -0.2;
          setScale((s) => Math.min(4, Math.max(0.5, +(s + delta).toFixed(2))));
        }}
      >
        <img
          src={imageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          style={{ transform: `scale(${scale})` }}
          className="max-h-[75dvh] max-w-full rounded-control object-contain transition-transform duration-150"
        />
      </div>
    </div>
  );
};

/**
 * Camera Barcode Scanner Modal using native video stream + BarcodeDetector API (with manual entry fallback)
 */
export const BarcodeScannerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDetected: (code: string) => void;
}> = ({ open, onClose, onDetected }) => {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [camErrorKey, setCamErrorKey] = useState<'' | 'noCameraError' | 'cameraAccessError'>('');
  const [manualCode, setManualCode] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let active = true;
    setCamErrorKey('');

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCamErrorKey('noCameraError');
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (!active) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const BarcodeDet = (
          window as unknown as {
            BarcodeDetector?: new (opts?: { formats: string[] }) => {
              detect: (el: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;

        if (BarcodeDet) {
          const detector = new BarcodeDet({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'qr_code'],
          });
          const scanLoop = async () => {
            if (!active || !videoRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const results = await detector.detect(videoRef.current);
                if (results && results.length > 0 && results[0].rawValue) {
                  onDetected(results[0].rawValue);
                  onClose();
                  return;
                }
              }
            } catch {
              // Keep scanning
            }
            rafId = requestAnimationFrame(scanLoop);
          };
          rafId = requestAnimationFrame(scanLoop);
        }
      } catch {
        setCamErrorKey('cameraAccessError');
      }
    };

    startCamera();

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, [open, onClose, onDetected]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.ui.scannerTitle}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/65 p-0 sm:p-4"
    >
      <Surface className="w-full max-w-md rounded-t-2xl sm:rounded-card p-4 sm:p-5 space-y-4 pb-safe">
        <div className="mx-auto h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="h-5 w-5 text-primary shrink-0" />
            <h3 className="text-sm sm:text-base font-semibold truncate">{t.ui.scannerTitle}</h3>
          </div>
          <Button tone="quiet" onClick={onClose} className="min-h-11 sm:min-h-9 px-3 shrink-0" aria-label={t.common.close}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-control border border-border bg-background flex items-center justify-center">
          {camErrorKey ? (
            <p className="px-4 text-center text-sm text-muted leading-relaxed">{t.ui[camErrorKey]}</p>
          ) : (
            <>
              <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-danger" />
            </>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) {
              onDetected(manualCode.trim());
              setManualCode('');
              onClose();
            }
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder={t.ui.scannerPlaceholder}
            className={`${inputClass} flex-1 min-w-0 font-mono`}
            autoFocus
          />
          <Button type="submit" tone="primary" className="w-full sm:w-auto shrink-0">
            {t.ui.useBarcode}
          </Button>
        </form>
      </Surface>
    </div>
  );
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const docLang = typeof document !== 'undefined' ? document.documentElement.lang : '';
      const lang = docLang === 'ko' ? 'kr' : docLang === 'en' ? 'en' : 'kh';
      const dict = TRANSLATIONS[lang];
      return (
        <div className="min-h-dvh flex items-center justify-center bg-background p-6 text-foreground">
          <Surface role="alert" className="max-w-md p-6 space-y-4">
            <h1 className="text-lg font-semibold text-danger">{dict.ui.errorBoundaryTitle}</h1>
            <p className="text-sm text-muted">{this.state.error.message}</p>
            <Button onClick={() => window.location.reload()}>{dict.ui.reloadApp}</Button>
          </Surface>
        </div>
      );
    }
    return this.props.children;
  }
}
