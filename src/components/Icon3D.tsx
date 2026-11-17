import React from 'react';
import { useIsDesktopDevice } from '../utils/device';

export type Icon3DName =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'products'
  | 'track-staff'
  | 'analytics'
  | 'problem-customers'
  | 'due-payments'
  | 'staff-info'
  | 'price-record'
  | 'stock-log'
  | 'settings'
  | 'about'
  | 'bell'
  | 'cart'
  | 'money'
  | 'calendar'
  | 'alert'
  | 'box'
  | 'barcode'
  | 'printer'
  | 'excel'
  | 'edit'
  | 'trash'
  | 'plus'
  | 'search'
  | 'user'
  | 'store'
  | 'warehouse'
  | 'shield'
  | 'upload'
  | 'check';

interface Palette {
  base: string;
  faceTop: string;
  faceBottom: string;
  rim: string;
}

const PALETTES: Record<string, Palette> = {
  emerald: {
    base: '#0f5132',
    faceTop: '#20a36c',
    faceBottom: '#13794e',
    rim: '#7be3b5',
  },
  teal: {
    base: '#0d4a52',
    faceTop: '#188d9c',
    faceBottom: '#116875',
    rim: '#7bdbe8',
  },
  amber: {
    base: '#7a4108',
    faceTop: '#e88d1f',
    faceBottom: '#bd680b',
    rim: '#fbd18e',
  },
  coral: {
    base: '#7d1d1d',
    faceTop: '#e04848',
    faceBottom: '#b32b2b',
    rim: '#f8a4a4',
  },
  slate: {
    base: '#1e293b',
    faceTop: '#475569',
    faceBottom: '#334155',
    rim: '#94a3b8',
  },
  gold: {
    base: '#6e4e08',
    faceTop: '#d69e17',
    faceBottom: '#a6760d',
    rim: '#fae08c',
  },
  sky: {
    base: '#10446e',
    faceTop: '#247cc4',
    faceBottom: '#175d99',
    rim: '#90caf9',
  },
};

function getPaletteForIcon(name: Icon3DName): Palette {
  switch (name) {
    case 'dashboard':
    case 'pos':
    case 'money':
    case 'check':
    case 'excel':
      return PALETTES.emerald;
    case 'orders':
    case 'products':
    case 'box':
    case 'warehouse':
    case 'barcode':
      return PALETTES.teal;
    case 'due-payments':
    case 'calendar':
    case 'bell':
    case 'price-record':
    case 'store':
      return PALETTES.amber;
    case 'problem-customers':
    case 'alert':
    case 'trash':
      return PALETTES.coral;
    case 'track-staff':
    case 'analytics':
    case 'staff-info':
    case 'user':
    case 'printer':
      return PALETTES.sky;
    case 'stock-log':
    case 'upload':
    case 'plus':
    case 'cart':
      return PALETTES.gold;
    case 'settings':
    case 'shield':
    case 'edit':
    case 'search':
    case 'about':
    default:
      return PALETTES.slate;
  }
}

/**
 * Composed 3D Vector Icon Component:
 * Built with layered extruded 3D base, top specular bevel, inner cast shadow, and crisp 3D inner glyph.
 */
export const Icon3D: React.FC<{
  name: Icon3DName;
  size?: number;
  className?: string;
}> = ({ name, size = 34, className = '' }) => {
  const uid = React.useId().replace(/:/g, '');
  const pal = getPaletteForIcon(name);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id={`grad-${uid}`} x1="6" y1="4" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={pal.faceTop} />
          <stop offset="100%" stopColor={pal.faceBottom} />
        </linearGradient>
        <linearGradient id={`glyph-${uid}`} x1="12" y1="10" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Soft ground drop shadow */}
      <ellipse cx="22" cy="40" rx="14" ry="2.5" fill="#000000" fillOpacity="0.16" />

      {/* 3D Extruded Bottom Bevel */}
      <rect x="4" y="8" width="36" height="32" rx="10" fill={pal.base} />

      {/* 3D Main Tactile Keycap Surface */}
      <rect x="4" y="4" width="36" height="32" rx="10" fill={`url(#grad-${uid})`} />

      {/* Top Specular Rim Highlight */}
      <rect
        x="5"
        y="5"
        width="34"
        height="30"
        rx="9"
        stroke={pal.rim}
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />

      {/* Inner Glyph Shadow + Crisp Foreground Glyph */}
      <g transform="translate(0, 1.4)" opacity="0.28" stroke="#000000" fill="#000000">
        {renderGlyph(name, '#000000')}
      </g>
      <g>{renderGlyph(name, `url(#glyph-${uid})`)}</g>
    </svg>
  );
};

function renderGlyph(name: Icon3DName, fillOrStroke: string): React.ReactNode {
  switch (name) {
    case 'dashboard':
      return (
        <>
          <rect x="11" y="10" width="9" height="9" rx="2.5" fill={fillOrStroke} />
          <rect x="24" y="10" width="9" height="6" rx="2" fill={fillOrStroke} />
          <rect x="24" y="19" width="9" height="11" rx="2.5" fill={fillOrStroke} />
          <rect x="11" y="22" width="9" height="8" rx="2" fill={fillOrStroke} />
        </>
      );
    case 'pos':
    case 'cart':
      return (
        <path
          d="M11 12h3.2l2.1 10.5a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L31.5 15H15.2M18 28.5a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Zm11 0a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z"
          stroke={fillOrStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'orders':
      return (
        <path
          d="M14 10h16a2 2 0 0 1 2 2v18l-3.5-2-3.5 2-3-2-3 2-3.5-2L12 30V12a2 2 0 0 1 2-2Zm3 6h10m-10 4.5h10m-10 4.5h6"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'products':
    case 'box':
      return (
        <path
          d="M22 9.5 32.5 15v10L22 30.5 11.5 25V15L22 9.5Zm0 0V20m0 0 10.5-5M22 20 11.5 15m5.2-2.7 10.5 5"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'track-staff':
      return (
        <path
          d="M13 27v-4m6 4v-8m6 8v-5m6 5V13M12 16l6-4 5 3 8-5"
          stroke={fillOrStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'analytics':
      return (
        <path
          d="M12 28h20M15 25V18m7 7V12m7 13v-9"
          stroke={fillOrStroke}
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'problem-customers':
    case 'alert':
      return (
        <path
          d="M22 11 33 29H11L22 11Zm0 6.5v5.5m0 3.5h.02"
          stroke={fillOrStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'due-payments':
    case 'calendar':
      return (
        <path
          d="M13 13h18a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2Zm4-3v4m10-4v4m-15 4h20m-11 5h4"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'staff-info':
    case 'user':
      return (
        <path
          d="M22 19a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Zm-8.5 10c0-3.8 3.8-6.5 8.5-6.5s8.5 2.7 8.5 6.5"
          stroke={fillOrStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'price-record':
    case 'money':
      return (
        <path
          d="M22 10v20m4.5-15.5h-6.2a3.2 3.2 0 0 0 0 6.4h3.4a3.2 3.2 0 0 1 0 6.4H17"
          stroke={fillOrStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'stock-log':
      return (
        <path
          d="M13 19a9 9 0 1 1 2.4 6.2M13 14v5h5m4-3v4.5l3 2"
          stroke={fillOrStroke}
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'settings':
      return (
        <path
          d="M22 23.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm9.5-3.5-2-1.2.2-2.3-2.1-2.1-2.3.2-1.2-2h-4.2l-1.2 2-2.3-.2-2.1 2.1.2 2.3-2 1.2v4l2 1.2-.2 2.3 2.1 2.1 2.3-.2 1.2 2h4.2l1.2-2 2.3.2 2.1-2.1-.2-2.3 2-1.2v-4Z"
          stroke={fillOrStroke}
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'about':
      return (
        <path
          d="M22 29a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-8.5v4.5m0-8.2h.02"
          stroke={fillOrStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'bell':
      return (
        <path
          d="M15 24h14l-1.6-2.4v-4.2a5.4 5.4 0 1 0-10.8 0v4.2L15 24Zm4.8 3a2.4 2.4 0 0 0 4.4 0"
          stroke={fillOrStroke}
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'barcode':
      return (
        <path
          d="M12 13v14m3.5-14v14m3-14v10m3.5-10v14m3.5-14v10m3.5-10v14m3-14v14"
          stroke={fillOrStroke}
          strokeWidth="2.1"
          strokeLinecap="round"
        />
      );
    case 'printer':
      return (
        <path
          d="M16 14v-3h12v3M15 24h-2a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2m-13-3h12v8H16v-8Z"
          stroke={fillOrStroke}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'excel':
      return (
        <path
          d="M14 11h11l5 5v12a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2Zm4 7 6 7m0-7-6 7"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'edit':
      return (
        <path
          d="m25.5 12.5 4 4L17 29H13v-4l12.5-12.5Z"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'trash':
      return (
        <path
          d="M13 14h18m-15 0 1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14m-9 0v-2.5h6V14m-4.5 4v7m3-7v7"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'plus':
      return (
        <path
          d="M22 12v16m-8-8h16"
          stroke={fillOrStroke}
          strokeWidth="2.8"
          strokeLinecap="round"
        />
      );
    case 'search':
      return (
        <path
          d="M20.5 26a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm5 1.5 5 5"
          stroke={fillOrStroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'store':
      return (
        <path
          d="M12 16 14 11h16l2 5M12 16h20v2a3 3 0 0 1-5 2.2A3 3 0 0 1 22 20.2a3 3 0 0 1-5 0A3 3 0 0 1 12 18v-2Zm2 4.8V29h16v-8.2"
          stroke={fillOrStroke}
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'warehouse':
      return (
        <path
          d="M11 18 22 11l11 7v11H11V18Zm5 11v-7h12v7"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'shield':
      return (
        <path
          d="M22 10 31 13.5v6.5c0 5.2-3.8 8.8-9 10.5-5.2-1.7-9-5.3-9-10.5v-6.5L22 10Zm-3.5 10 2.5 2.5 5-5"
          stroke={fillOrStroke}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'upload':
      return (
        <path
          d="M22 25V13m0 0-4.5 4.5M22 13l4.5 4.5M13 25v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"
          stroke={fillOrStroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
    case 'check':
    default:
      return (
        <path
          d="m14.5 20.5 5 5 10-10"
          stroke={fillOrStroke}
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      );
  }
}

export const APP_LOGO_URL = '/assets/aistudio/Modern_DR-POS_Retail_Logo_d82ce2c2.png';

const LOGO_SIZE_CLASSES: Record<number, string> = {
  36: 'h-9 w-9',
  38: 'h-9.5 w-9.5',
  42: 'h-10.5 w-10.5',
  44: 'h-11 w-11',
  48: 'h-12 w-12',
  56: 'h-14 w-14',
  64: 'h-16 w-16',
};

/**
 * DR-POS Signature App Profile Logo Mark
 */
export const DrPosLogo: React.FC<{ size?: number; showTagline?: boolean }> = ({
  size = 44,
  showTagline = false,
}) => {
  const isDesktop = useIsDesktopDevice();
  const boxSizeClass = LOGO_SIZE_CLASSES[size] || 'h-11 w-11';
  return (
    <div className="inline-flex items-center gap-3 select-none">
      <div
        className={`${boxSizeClass} shrink-0 rounded-xl bg-white p-0.5 border border-border/80 shadow-xs overflow-hidden flex items-center justify-center`}
      >
        <img
          src={APP_LOGO_URL}
          alt="DR-POS Logo"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
          <span>DR-POS</span>
          <span className="text-xs font-medium text-primary">Realtime</span>
        </div>
        {showTagline && (
          <p className="text-xs text-muted">{isDesktop ? 'Device POS Systems' : 'POS Sale'}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Animated Cambodian National Flag (ទង់ជាតិព្រះរាជាណាចក្រកម្ពុជា)
 */
export const CambodiaFlagAnimated: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center select-none ${className}`}
      role="img"
      aria-label="Cambodia National Flag"
    >
      {/* Subtle metallic flagpole */}
      <div className="flex flex-col items-center mr-0.5 shrink-0">
        <span className="h-2 w-2 rounded-full bg-amber-400 border border-amber-600/50 shadow-xs" />
        <span className="w-[3px] h-11 sm:h-12 rounded-b-full bg-gradient-to-b from-slate-300 via-slate-400 to-slate-500 shadow-xs" />
      </div>

      {/* Waving 3:2 Royal Flag Body */}
      <div className="kh-flag-wave relative w-16 h-10 sm:w-[72px] sm:h-[46px] rounded-[5px] overflow-hidden border border-slate-900/20 shadow-md shrink-0">
        <svg
          viewBox="0 0 180 120"
          className="h-full w-full block"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Official 1 : 2 : 1 horizontal stripes */}
          <rect x="0" y="0" width="180" height="30" fill="#032EA1" />
          <rect x="0" y="30" width="180" height="60" fill="#E00025" />
          <rect x="0" y="90" width="180" height="30" fill="#032EA1" />

          {/* Clean Crisp White Angkor Wat Silhouette */}
          <g fill="#FFFFFF" stroke="#032EA1" strokeWidth="1.2" strokeLinejoin="round">
            {/* Base & Stepped Terraces */}
            <rect x="44" y="81" width="92" height="5.5" rx="0.8" />
            <rect x="50" y="75.5" width="80" height="5.5" rx="0.6" />
            <rect x="55" y="65" width="70" height="10.5" rx="0.6" />

            {/* Left Tower (Prasat) */}
            <path d="M62 65 L64 52 L67 45 L69 40 L71 45 L74 52 L76 65 Z" />
            <path d="M66 47 L72 47 M65 53 L73 53 M64 59 L74 59" strokeWidth="1" />

            {/* Center Tall Main Tower (Prasat) */}
            <path d="M81 65 L83.5 47 L87 38 L90 33 L93 38 L96.5 47 L99 65 Z" />
            <path d="M86 41 L94 41 M85 48 L95 48 M84 55 L96 55" strokeWidth="1" />

            {/* Right Tower (Prasat) */}
            <path d="M104 65 L106 52 L109 45 L111 40 L113 45 L116 52 L118 65 Z" />
            <path d="M108 47 L114 47 M107 53 L115 53 M106 59 L116 59" strokeWidth="1" />

            {/* Gallery Pillars & Portals */}
            <rect x="67" y="68" width="4" height="7.5" fill="#032EA1" stroke="none" />
            <rect x="77" y="68" width="4" height="7.5" fill="#032EA1" stroke="none" />
            <rect x="87.5" y="67" width="5" height="8.5" fill="#032EA1" stroke="none" />
            <rect x="99" y="68" width="4" height="7.5" fill="#032EA1" stroke="none" />
            <rect x="109" y="68" width="4" height="7.5" fill="#032EA1" stroke="none" />
          </g>
        </svg>

        {/* Subtle cloth wave sheen overlay */}
        <div
          aria-hidden="true"
          className="kh-flag-sheen pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
        {/* Soft left fold shadow near pole */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/20 to-transparent"
        />
      </div>
    </div>
  );
};
