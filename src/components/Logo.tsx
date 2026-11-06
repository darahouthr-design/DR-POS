import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showSubtitle = true,
  iconOnly = false,
  className = '',
}) => {
  const getDims = () => {
    switch (size) {
      case 'sm':
        return { iconSize: 32, titleClass: 'text-base font-extrabold', subClass: 'text-[9px]' };
      case 'lg':
        return { iconSize: 52, titleClass: 'text-2xl font-black', subClass: 'text-xs' };
      case 'xl':
        return { iconSize: 68, titleClass: 'text-3xl font-black', subClass: 'text-sm' };
      case 'md':
      default:
        return { iconSize: 42, titleClass: 'text-xl font-black', subClass: 'text-[10px]' };
    }
  };

  const { iconSize, titleClass, subClass } = getDims();

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* 3D App Emblem */}
      <div
        style={{ width: iconSize, height: iconSize }}
        className="relative flex items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 p-1.5 shadow-lg shadow-indigo-500/25 border border-indigo-400/40 transform hover:rotate-2 transition-transform duration-300"
      >
        {/* Gloss overlay */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-xl pointer-events-none" />

        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
          <defs>
            <linearGradient id="logo-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Isometric Cash Register / Terminal Silhouette */}
          <polygon points="50,15 85,32 85,68 50,85 15,68 15,32" fill="#1e1b4b" opacity="0.4" />
          <polygon points="50,18 80,34 80,66 50,82 20,66 20,34" fill="url(#logo-gold)" />

          {/* Inner Display */}
          <rect x="33" y="32" width="34" height="22" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
          {/* Signal / Receipt Beam */}
          <path d="M40 40 L60 40" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M43 46 L57 46" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

          {/* Letters D R Monogram */}
          <text
            x="50"
            y="74"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="18"
            fontWeight="900"
            fontFamily="Inter, sans-serif"
            letterSpacing="1"
          >
            DR
          </text>
        </svg>

        {/* Realtime Pulsing Dot */}
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-900"></span>
        </span>
      </div>

      {/* Typography */}
      {!iconOnly && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 dark:from-indigo-400 dark:via-sky-300 dark:to-emerald-400 bg-clip-text text-transparent tracking-tight leading-none ${titleClass}`}>
              DR-POS
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700">
              PRO
            </span>
          </div>
          {showSubtitle && (
            <span className={`text-slate-500 dark:text-slate-400 font-medium leading-tight ${subClass}`}>
              ប្រព័ន្ធគ្រប់គ្រងការលក់ស្តង់ដារ
            </span>
          )}
        </div>
      )}
    </div>
  );
};
