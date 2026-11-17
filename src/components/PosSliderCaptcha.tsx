import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export interface PosSliderCaptchaProps {
  verified: boolean;
  onVerifiedChange: (verified: boolean, metrics?: { elapsedMs: number; moves: number }) => void;
  disabled?: boolean;
}

const LOGICAL_WIDTH = 340;
const LOGICAL_HEIGHT = 156;
const PIECE_SIZE = 44;
const TAB_RADIUS = 8;
const TOLERANCE_PX = 6;
const PIECE_MARGIN_LEFT = 14;
const KNOB_WIDTH = 44;

interface PuzzleGeometry {
  targetX: number;
  targetY: number;
  themeIdx: number;
  seed: number;
}

function drawJigsawPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  tabR: number
) {
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y);

  // Top edge with outward semicircular tab
  ctx.lineTo(x + half - tabR, y);
  ctx.arc(x + half, y - tabR * 0.25, tabR, Math.PI * 0.88, Math.PI * 0.12, false);
  ctx.lineTo(x + size, y);

  // Right edge with outward semicircular tab
  ctx.lineTo(x + size, y + half - tabR);
  ctx.arc(x + size + tabR * 0.25, y + half, tabR, Math.PI * 1.38, Math.PI * 0.62, false);
  ctx.lineTo(x + size, y + size);

  // Bottom edge (flat with subtle inward notch for lock stability)
  ctx.lineTo(x + half + tabR, y + size);
  ctx.arc(x + half, y + size - tabR * 0.2, tabR * 0.85, Math.PI * 0.08, Math.PI * 0.92, true);
  ctx.lineTo(x, y + size);

  // Left edge straight
  ctx.lineTo(x, y);
  ctx.closePath();
}

const SCENES = [
  {
    bgTop: '#064e3b',
    bgBottom: '#0f766e',
    accent: '#34d399',
    gold: '#fbbf24',
    label: 'DR-POS Enterprise',
  },
  {
    bgTop: '#0f172a',
    bgBottom: '#115e59',
    accent: '#2dd4bf',
    gold: '#f59e0b',
    label: 'DR-POS Inventory',
  },
  {
    bgTop: '#134e4a',
    bgBottom: '#047857',
    accent: '#6ee7b7',
    gold: '#fde047',
    label: 'DR-POS Security',
  },
];

function paintPosArtwork(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  geom: PuzzleGeometry
) {
  const palette = SCENES[geom.themeIdx % SCENES.length];

  // Rich domain-authentic gradient sky/surface
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, palette.bgTop);
  grad.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Architectural coordinate grid (precision retail blueprint feel)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 1;
  for (let gx = 20; gx < width; gx += 24) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, height);
    ctx.stroke();
  }
  for (let gy = 20; gy < height; gy += 24) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(width, gy);
    ctx.stroke();
  }

  // Stylized radial warm studio glow
  const glowX = 60 + (geom.seed % 180);
  const glowY = 30 + ((geom.seed * 7) % 80);
  const radial = ctx.createRadialGradient(glowX, glowY, 6, glowX, glowY, 120);
  radial.addColorStop(0, 'rgba(251, 191, 36, 0.34)');
  radial.addColorStop(0.5, 'rgba(52, 211, 153, 0.16)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, width, height);

  // Retail revenue waves & barcode/shelf silhouettes (rich visual landmarks for human alignment)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
  const barHeights = [42, 68, 54, 86, 62, 94, 76, 58, 82, 48];
  barHeights.forEach((bh, i) => {
    const bx = 24 + i * 30 + ((geom.seed % 3) * 3);
    const by = height - bh - 12;
    ctx.beginPath();
    ctx.roundRect(bx, by, 18, bh, [5, 5, 2, 2]);
    ctx.fill();
  });

  // Crisp gold/emerald trend curve across the bars
  ctx.strokeStyle = palette.gold;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  barHeights.forEach((bh, i) => {
    const cx = 33 + i * 30 + ((geom.seed % 3) * 3);
    const cy = height - bh - 18;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  });
  ctx.stroke();

  // Crisp data nodes along the trend line
  barHeights.forEach((bh, i) => {
    const cx = 33 + i * 30 + ((geom.seed % 3) * 3);
    const cy = height - bh - 18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.bgTop;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });

  // Geometric POS receipt / emblem accent at top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.beginPath();
  ctx.roundRect(14, 14, 118, 28, 7);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(palette.label, 24, 32);

  // Subtle diagonal stripes on bottom edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const sx = 240 + ((geom.seed + i * 15) % 90);
    const sy = 18 + ((geom.seed + i * 11) % 34);
    ctx.beginPath();
    ctx.arc(sx, sy, 4 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function createPuzzleGeometry(): PuzzleGeometry {
  const minX = 128;
  const maxX = LOGICAL_WIDTH - PIECE_SIZE - 26;
  const minY = 24;
  const maxY = LOGICAL_HEIGHT - PIECE_SIZE - 22;

  const targetX = Math.floor(minX + Math.random() * Math.max(10, maxX - minX));
  const targetY = Math.floor(minY + Math.random() * Math.max(10, maxY - minY));
  const themeIdx = Math.floor(Math.random() * SCENES.length);
  const seed = Math.floor(Math.random() * 10000);
  return { targetX, targetY, themeIdx, seed };
}

export const PosSliderCaptcha: React.FC<PosSliderCaptchaProps> = ({
  verified,
  onVerifiedChange,
  disabled = false,
}) => {
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pieceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const puzzleBoxRef = useRef<HTMLDivElement | null>(null);

  const [geom, setGeom] = useState<PuzzleGeometry>(() => createPuzzleGeometry());
  const [sliderRatio, setSliderRatio] = useState(0); // 0..1 across draggable travel
  const [dragging, setDragging] = useState(false);
  const [statusState, setStatusState] = useState<'idle' | 'verified' | 'error'>(
    verified ? 'verified' : 'idle'
  );
  const [statusMessage, setStatusMessage] = useState<string>(
    verified ? 'បានផ្ទៀងផ្ទាត់រួចរាល់ · មិនមែន Bot' : ''
  );
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [trackWidth, setTrackWidth] = useState(320);
  const latestRatioRef = useRef(0);

  const dragStartRef = useRef<{
    pointerId: number;
    startClientX: number;
    startRatio: number;
    startedAt: number;
    moveCount: number;
  } | null>(null);

  useEffect(() => {
    setStatusState(verified ? 'verified' : 'idle');
    if (verified) {
      const maxTravel = LOGICAL_WIDTH - PIECE_SIZE - PIECE_MARGIN_LEFT * 2;
      const snappedRatio = Math.min(1, Math.max(0, (geom.targetX - PIECE_MARGIN_LEFT) / maxTravel));
      latestRatioRef.current = snappedRatio;
      setSliderRatio(snappedRatio);
      setStatusMessage((prev) => prev || 'បានផ្ទៀងផ្ទាត់រួចរាល់ · មិនមែន Bot');
    } else {
      setStatusMessage('');
      latestRatioRef.current = 0;
      setSliderRatio(0);
    }
  }, [verified, geom.targetX]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      const w = el.clientWidth;
      if (w > 0) setTrackWidth(w);
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const renderCanvases = useCallback((currentGeom: PuzzleGeometry) => {
    const bg = bgCanvasRef.current;
    const piece = pieceCanvasRef.current;
    if (!bg || !piece) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Paint clean offscreen full artwork first
    const offscreen = document.createElement('canvas');
    offscreen.width = LOGICAL_WIDTH * dpr;
    offscreen.height = LOGICAL_HEIGHT * dpr;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    offCtx.scale(dpr, dpr);
    paintPosArtwork(offCtx, LOGICAL_WIDTH, LOGICAL_HEIGHT, currentGeom);

    // 1. Background canvas: full artwork + recessed hole cutout
    bg.width = LOGICAL_WIDTH * dpr;
    bg.height = LOGICAL_HEIGHT * dpr;
    const bgCtx = bg.getContext('2d');
    if (bgCtx) {
      bgCtx.scale(dpr, dpr);
      bgCtx.drawImage(offscreen, 0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

      // Draw puzzle socket shadow & dark recessed hole
      bgCtx.save();
      drawJigsawPath(bgCtx, currentGeom.targetX, currentGeom.targetY, PIECE_SIZE, TAB_RADIUS);
      bgCtx.fillStyle = 'rgba(3, 7, 18, 0.58)';
      bgCtx.fill();
      bgCtx.lineWidth = 1.6;
      bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      bgCtx.stroke();
      bgCtx.restore();
    }

    // 2. Floating Jigsaw Piece canvas: exact matching cutout cropped from artwork
    const pieceCanvasW = PIECE_SIZE + TAB_RADIUS * 2 + 8;
    const pieceCanvasH = PIECE_SIZE + TAB_RADIUS * 2 + 8;
    const offsetInPiece = TAB_RADIUS + 4;

    piece.width = pieceCanvasW * dpr;
    piece.height = pieceCanvasH * dpr;
    const pCtx = piece.getContext('2d');
    if (pCtx) {
      pCtx.scale(dpr, dpr);
      pCtx.clearRect(0, 0, pieceCanvasW, pieceCanvasH);

      // Soft outer glow/shadow
      pCtx.save();
      pCtx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      pCtx.shadowBlur = 6;
      pCtx.shadowOffsetX = 1;
      pCtx.shadowOffsetY = 2;
      drawJigsawPath(pCtx, offsetInPiece, offsetInPiece, PIECE_SIZE, TAB_RADIUS);
      pCtx.fillStyle = '#000000';
      pCtx.fill();
      pCtx.restore();

      // Clip artwork precisely to jigsaw shape
      pCtx.save();
      drawJigsawPath(pCtx, offsetInPiece, offsetInPiece, PIECE_SIZE, TAB_RADIUS);
      pCtx.clip();
      pCtx.drawImage(
        offscreen,
        (currentGeom.targetX - offsetInPiece) * dpr,
        (currentGeom.targetY - offsetInPiece) * dpr,
        pieceCanvasW * dpr,
        pieceCanvasH * dpr,
        0,
        0,
        pieceCanvasW,
        pieceCanvasH
      );
      pCtx.restore();

      // Crisp inner highlight border
      pCtx.save();
      drawJigsawPath(pCtx, offsetInPiece, offsetInPiece, PIECE_SIZE, TAB_RADIUS);
      pCtx.lineWidth = 1.75;
      pCtx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      pCtx.stroke();
      pCtx.restore();
    }
  }, []);

  useEffect(() => {
    renderCanvases(geom);
  }, [geom, renderCanvases]);

  const maxPieceTravelLogical = LOGICAL_WIDTH - PIECE_SIZE - PIECE_MARGIN_LEFT * 2;
  const pieceCurrentLogicalX = PIECE_MARGIN_LEFT + sliderRatio * maxPieceTravelLogical;
  const maxKnobTravelPx = Math.max(120, trackWidth - KNOB_WIDTH - 4);

  const handleRefreshPuzzle = useCallback(() => {
    if (disabled) return;
    setGeom(createPuzzleGeometry());
    latestRatioRef.current = 0;
    setSliderRatio(0);
    setDragging(false);
    setStatusState('idle');
    setStatusMessage('');
    onVerifiedChange(false);
  }, [disabled, onVerifiedChange]);

  const evaluateAlignment = useCallback(
    (finalRatio: number, elapsedMs: number, moves: number, isKeyboard = false) => {
      const finalX = PIECE_MARGIN_LEFT + finalRatio * maxPieceTravelLogical;
      const diff = Math.abs(finalX - geom.targetX);
      const humanValid = isKeyboard ? moves >= 2 : moves >= 3 && elapsedMs >= 90;

      if (diff <= TOLERANCE_PX && humanValid) {
        const snappedRatio = Math.min(
          1,
          Math.max(0, (geom.targetX - PIECE_MARGIN_LEFT) / maxPieceTravelLogical)
        );
        latestRatioRef.current = snappedRatio;
        setSliderRatio(snappedRatio);
        setStatusState('verified');
        setFailCount(0);
        const secStr = (Math.max(100, elapsedMs) / 1000).toFixed(1);
        setStatusMessage(`បានផ្ទៀងផ្ទាត់ជោគជ័យ (${secStr}s · មិនមែន Bot)`);
        onVerifiedChange(true, { elapsedMs, moves });
        return;
      }

      setShakeTrigger((v) => v + 1);
      setStatusState('error');
      const nextFails = failCount + 1;
      setFailCount(nextFails);
      onVerifiedChange(false);

      if (!humanValid && diff <= TOLERANCE_PX) {
        setStatusMessage('សូមអូសផ្គុំដោយដៃយឺតៗ ដើម្បីបញ្ជាក់ថាមិនមែន Bot!');
      } else {
        setStatusMessage('មិនទាន់ចំទីតាំងទេ! សូមអូសរូបផ្គុំឱ្យចំប្រហោង។');
      }

      window.setTimeout(() => {
        latestRatioRef.current = 0;
        setSliderRatio(0);
        if (nextFails >= 3) {
          setFailCount(0);
          setGeom(createPuzzleGeometry());
        }
        setStatusState((prev) => (prev === 'verified' ? 'verified' : 'idle'));
      }, 420);
    },
    [failCount, geom.targetX, maxPieceTravelLogical, onVerifiedChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || statusState === 'verified') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startRatio: latestRatioRef.current,
      startedAt: performance.now(),
      moveCount: 0,
    };
    setDragging(true);
    setStatusState('idle');
    setStatusMessage('');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId || statusState === 'verified') return;
    const deltaPx = e.clientX - drag.startClientX;
    const deltaRatio = deltaPx / maxKnobTravelPx;
    const nextRatio = Math.min(1, Math.max(0, drag.startRatio + deltaRatio));
    drag.moveCount += 1;
    latestRatioRef.current = nextRatio;
    setSliderRatio(nextRatio);
  };

  const finishPointerDrag = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStartRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragStartRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const elapsedMs = performance.now() - drag.startedAt;
    evaluateAlignment(latestRatioRef.current, elapsedMs, drag.moveCount, false);
  };

  // Keyboard accessibility (ArrowLeft / ArrowRight + Enter to verify)
  const keyboardMovesRef = useRef(0);
  const keyboardStartRef = useRef(0);
  const handleKnobKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || statusState === 'verified') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (keyboardMovesRef.current === 0) {
        keyboardStartRef.current = performance.now();
      }
      keyboardMovesRef.current += 1;
      const step = (e.shiftKey ? 10 : 3) / maxPieceTravelLogical;
      const nextRatio = Math.min(
        1,
        Math.max(0, latestRatioRef.current + (e.key === 'ArrowRight' ? step : -step))
      );
      latestRatioRef.current = nextRatio;
      setSliderRatio(nextRatio);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const elapsed = performance.now() - (keyboardStartRef.current || performance.now() - 300);
      evaluateAlignment(
        latestRatioRef.current,
        elapsed,
        Math.max(2, keyboardMovesRef.current),
        true
      );
      keyboardMovesRef.current = 0;
    }
  };

  const pieceLeftPercent = ((pieceCurrentLogicalX - (TAB_RADIUS + 4)) / LOGICAL_WIDTH) * 100;
  const pieceTopPercent = ((geom.targetY - (TAB_RADIUS + 4)) / LOGICAL_HEIGHT) * 100;
  const pieceWidthPercent = ((PIECE_SIZE + TAB_RADIUS * 2 + 8) / LOGICAL_WIDTH) * 100;
  const pieceHeightPercent = ((PIECE_SIZE + TAB_RADIUS * 2 + 8) / LOGICAL_HEIGHT) * 100;
  const knobOffsetPx = sliderRatio * maxKnobTravelPx;

  return (
    <motion.div
      key={shakeTrigger}
      animate={shakeTrigger > 0 && statusState === 'error' ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.32 }}
      className="rounded-control border border-primary/25 bg-background/80 p-3 sm:p-4 space-y-3 shadow-xs select-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>ផ្ទៀងផ្ទាត់សុវត្ថិភាព (Slider Puzzle CAPTCHA)</span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={handleRefreshPuzzle}
          title="ប្ដូររូបផ្គុំថ្មី"
          className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
        >
          <RefreshCw className="h-3.5 w-3.5 shrink-0" />
          <span>ប្ដូររូបថ្មី</span>
        </button>
      </div>

      {/* Interactive Puzzle Canvas Stage */}
      <div
        ref={puzzleBoxRef}
        className="relative w-full aspect-[340/156] overflow-hidden rounded-control border border-border/80 bg-slate-900 shadow-inner"
      >
        <canvas
          ref={bgCanvasRef}
          aria-label="ផ្ទាំងរូបផ្គុំ CAPTCHA"
          className="block h-full w-full"
        />

        {/* Floating Movable Jigsaw Piece */}
        <canvas
          ref={pieceCanvasRef}
          style={{
            left: `${pieceLeftPercent}%`,
            top: `${pieceTopPercent}%`,
            width: `${pieceWidthPercent}%`,
            height: `${pieceHeightPercent}%`,
          }}
          className={`pointer-events-none absolute ${
            dragging ? '' : 'transition-[left] duration-200 ease-out'
          }`}
        />

        {/* Crisp Verification Sheen Overlay */}
        {statusState === 'verified' && (
          <motion.div
            initial={{ x: '-120%', opacity: 0.8 }}
            animate={{ x: '220%', opacity: 0 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/45 to-transparent"
          />
        )}

        {statusState === 'verified' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-emerald-950/80 backdrop-blur-xs px-3 py-1.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Tactile Slider Track & Thumb */}
      <div
        ref={trackRef}
        className={`relative h-11 w-full rounded-control border flex items-center overflow-hidden transition-colors ${
          statusState === 'verified'
            ? 'border-primary/50 bg-primary/12'
            : statusState === 'error'
            ? 'border-danger/60 bg-danger/10'
            : 'border-border bg-surface'
        }`}
      >
        {/* Active Progress Fill */}
        <div
          style={{ width: `${knobOffsetPx + KNOB_WIDTH / 2}px` }}
          className={`pointer-events-none absolute inset-y-0 left-0 transition-colors ${
            statusState === 'verified'
              ? 'bg-primary/20'
              : statusState === 'error'
              ? 'bg-danger/20'
              : 'bg-primary/14'
          } ${dragging ? '' : 'transition-[width] duration-200 ease-out'}`}
        />

        {/* Center Instruction Prompt */}
        <span
          className={`pointer-events-none w-full text-center text-xs font-medium pl-10 pr-3 truncate ${
            statusState === 'verified'
              ? 'text-primary font-semibold'
              : statusState === 'error'
              ? 'text-danger font-semibold'
              : 'text-muted'
          }`}
        >
          {statusState === 'verified'
            ? 'ផ្ទៀងផ្ទាត់ជោគជ័យ (មិនមែន Bot)'
            : statusState === 'error'
            ? 'មិនចំទីតាំងទេ · សូមអូសម្ដងទៀត'
            : 'អូសគ្រាប់រំកិលទៅស្ដាំ ដើម្បីផ្គុំរូបឱ្យចំប្រហោង →'}
        </span>

        {/* Draggable Thumb Button */}
        <button
          type="button"
          role="slider"
          aria-label="គ្រាប់រំកិលផ្ទៀងផ្ទាត់រូបផ្គុំ CAPTCHA"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderRatio * 100)}
          disabled={disabled || statusState === 'verified'}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
          onKeyDown={handleKnobKeyDown}
          style={{ transform: `translate3d(${knobOffsetPx}px, 0, 0)` }}
          className={`absolute left-0.5 top-0.5 bottom-0.5 w-10.5 rounded-control border flex items-center justify-center touch-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-primary ${
            statusState === 'verified'
              ? 'bg-primary border-primary text-primary-foreground cursor-default shadow-xs'
              : statusState === 'error'
              ? 'bg-danger border-danger text-white shadow-xs'
              : dragging
              ? 'bg-primary border-primary text-primary-foreground shadow-sm'
              : 'bg-surface-elevated border-border text-foreground hover:border-primary hover:text-primary shadow-xs'
          } ${dragging ? '' : 'transition-transform duration-200 ease-out'}`}
        >
          {statusState === 'verified' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <ArrowRight className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>

      {statusState === 'error' && statusMessage && (
        <p role="alert" className="text-xs font-medium text-danger flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{statusMessage}</span>
        </p>
      )}
    </motion.div>
  );
};
