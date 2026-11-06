import React from 'react';

export type Icon3DType =
  | 'pos'
  | 'orders'
  | 'products'
  | 'due_payments'
  | 'track_staff'
  | 'problem_customers'
  | 'stock_log'
  | 'price_record'
  | 'staff_info'
  | 'setting'
  | 'about'
  | 'bell'
  | 'cart'
  | 'barcode'
  | 'bluetooth'
  | 'excel'
  | 'print'
  | 'money'
  | 'revenue'
  | 'customer'
  | 'warning'
  | 'check';

interface Icon3DProps {
  name: Icon3DType;
  size?: number | string;
  className?: string;
  animate?: boolean;
}

export const Icon3D: React.FC<Icon3DProps> = ({
  name,
  size = 40,
  className = '',
  animate = true,
}) => {
  const pixelSize = typeof size === 'number' ? `${size}px` : size;

  const renderIconContent = () => {
    switch (name) {
      case 'pos':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="pos-base" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
              <linearGradient id="pos-screen" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="pos-accent" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Base Body 3D */}
            <path d="M12 40 L32 50 L52 40 L52 48 L32 58 L12 48 Z" fill="#1e1b4b" opacity="0.6" />
            <path d="M12 28 L32 38 L52 28 L52 44 L32 54 L12 44 Z" fill="url(#pos-base)" />
            {/* Screen Stand & Display */}
            <path d="M22 10 L42 10 L48 26 L16 26 Z" fill="url(#pos-screen)" stroke="#bae6fd" strokeWidth="1.5" />
            {/* Screen shine */}
            <path d="M20 12 L38 12 L44 24 L18 24 Z" fill="#ffffff" opacity="0.25" />
            {/* Scanner Bar */}
            <rect x="22" y="34" width="20" height="4" rx="2" fill="url(#pos-accent)" />
            {/* Cash Drawer Lip */}
            <path d="M16 42 L32 49 L48 42" stroke="#818cf8" strokeWidth="2" fill="none" />
            {/* Card Slot */}
            <rect x="44" y="24" width="4" height="12" rx="1" fill="#fbbf24" />
          </svg>
        );

      case 'orders':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="ord-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <linearGradient id="paper-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>
            </defs>
            {/* Clipboard Back 3D */}
            <rect x="14" y="10" width="36" height="46" rx="6" fill="url(#ord-grad)" />
            <rect x="16" y="12" width="32" height="42" rx="4" fill="#0284c7" opacity="0.4" />
            {/* Receipt Sheet */}
            <path d="M18 16 L46 16 L46 48 L42 45 L38 48 L34 45 L30 48 L26 45 L22 48 L18 45 Z" fill="url(#paper-grad)" />
            {/* Paper Lines */}
            <line x1="22" y1="22" x2="42" y2="22" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="22" y1="28" x2="38" y2="28" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="34" x2="40" y2="34" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
            <line x1="22" y1="40" x2="32" y2="40" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" />
            {/* Gold Badge */}
            <circle cx="44" cy="44" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
            <path d="M41 44 L43 46 L47 42" stroke="#78350f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );

      case 'products':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="box-top" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#f97316" />
              </linearGradient>
              <linearGradient id="box-left" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#c2410c" />
              </linearGradient>
              <linearGradient id="box-right" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>
            </defs>
            {/* 3D Isometric Box Top */}
            <path d="M32 10 L54 22 L32 34 L10 22 Z" fill="url(#box-top)" />
            {/* Left Face */}
            <path d="M10 22 L32 34 L32 54 L10 42 Z" fill="url(#box-left)" />
            {/* Right Face */}
            <path d="M32 34 L54 22 L54 42 L32 54 Z" fill="url(#box-right)" />
            {/* Box Tape Band */}
            <path d="M22 16 L42 27 L42 47 L22 36 Z" fill="#fed7aa" opacity="0.35" />
            {/* Star sparkle */}
            <circle cx="48" cy="16" r="3" fill="#fef08a" />
          </svg>
        );

      case 'due_payments':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="cal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="100%" stopColor="#be185d" />
              </linearGradient>
              <linearGradient id="coin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Calendar Body */}
            <rect x="12" y="14" width="40" height="40" rx="8" fill="url(#cal-grad)" />
            {/* Header bar */}
            <path d="M12 22 Q12 14 20 14 L44 14 Q52 14 52 22 L12 22 Z" fill="#9d174d" />
            {/* Binder Rings */}
            <circle cx="22" cy="14" r="3" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
            <circle cx="42" cy="14" r="3" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
            {/* White Face */}
            <rect x="16" y="26" width="32" height="24" rx="4" fill="#ffffff" />
            {/* Alert Clock / Dollar Coin in 3D */}
            <circle cx="38" cy="38" r="10" fill="url(#coin-grad)" stroke="#b45309" strokeWidth="1.5" />
            <text x="38" y="42" fontSize="11" fontWeight="bold" fill="#78350f" textAnchor="middle">$</text>
            {/* Exclamation */}
            <circle cx="24" cy="36" r="4" fill="#ef4444" />
            <line x1="24" y1="34" x2="24" y2="36" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="24" cy="38" r="0.8" fill="#ffffff" />
          </svg>
        );

      case 'track_staff':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="staff-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
              <linearGradient id="bar-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>
            </defs>
            {/* Badge backplate */}
            <rect x="12" y="12" width="40" height="42" rx="8" fill="url(#staff-grad)" />
            {/* User Avatar Circle 3D */}
            <circle cx="25" cy="24" r="7" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="25" cy="22" r="3.5" fill="#a16207" />
            <path d="M19 30 C19 26 31 26 31 30 Z" fill="#a16207" />
            {/* Growth Bars */}
            <rect x="36" y="32" width="4" height="12" rx="1.5" fill="#38bdf8" />
            <rect x="42" y="26" width="4" height="18" rx="1.5" fill="#a78bfa" />
            <rect x="48" y="20" width="4" height="24" rx="1.5" fill="url(#bar-grad)" />
            {/* Sparkle */}
            <circle cx="50" cy="16" r="2.5" fill="#facc15" />
          </svg>
        );

      case 'problem_customers':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="warn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#991b1b" />
              </linearGradient>
            </defs>
            {/* 3D Crest Shield */}
            <path d="M32 8 L52 16 L52 34 C52 46 32 56 32 56 C32 56 12 46 12 34 L12 16 Z" fill="url(#warn-grad)" stroke="#fca5a5" strokeWidth="1.5" />
            {/* Inner warning triangle */}
            <path d="M32 20 L44 42 L20 42 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1.5" />
            {/* Exclamation */}
            <line x1="32" y1="26" x2="32" y2="34" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="38" r="1.5" fill="#7f1d1d" />
          </svg>
        );

      case 'stock_log':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="stock-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#14b8a6" />
                <stop offset="100%" stopColor="#0f766e" />
              </linearGradient>
            </defs>
            {/* 3D Warehouses Crate Stack */}
            <rect x="12" y="28" width="22" height="22" rx="3" fill="url(#stock-grad)" stroke="#5eead4" strokeWidth="1" />
            <rect x="30" y="32" width="22" height="20" rx="3" fill="#0d9488" stroke="#2dd4bf" strokeWidth="1" />
            <rect x="20" y="14" width="24" height="20" rx="3" fill="#2dd4bf" stroke="#99f6e4" strokeWidth="1" />
            {/* Sync circular arrow */}
            <path d="M46 14 A 10 10 0 0 1 54 26 L56 22" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'price_record':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="gold-tag" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            {/* 3D Angled Price Tag */}
            <path d="M16 32 L34 14 L52 32 L34 50 Z" fill="url(#gold-tag)" stroke="#fde68a" strokeWidth="1.5" />
            {/* Hole */}
            <circle cx="26" cy="24" r="3" fill="#78350f" />
            {/* String thread */}
            <path d="M26 24 C20 18 16 14 14 10" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" fill="none" />
            {/* Currency Symbol in center */}
            <text x="36" y="36" fontSize="14" fontWeight="800" fill="#ffffff" textAnchor="middle">៛</text>
          </svg>
        );

      case 'staff_info':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
            </defs>
            {/* Lanyard Strap */}
            <path d="M26 6 L32 14 L38 6" stroke="#94a3b8" strokeWidth="3" fill="none" />
            {/* Clip */}
            <rect x="28" y="12" width="8" height="4" rx="1" fill="#cbd5e1" />
            {/* ID Card 3D */}
            <rect x="14" y="16" width="36" height="44" rx="6" fill="url(#card-grad)" stroke="#a5b4fc" strokeWidth="1.5" />
            {/* Photo box */}
            <rect x="22" y="22" width="20" height="18" rx="3" fill="#ffffff" opacity="0.9" />
            <circle cx="32" cy="29" r="4" fill="#6366f1" />
            <path d="M26 38 C26 34 38 34 38 38 Z" fill="#6366f1" />
            {/* Info lines */}
            <line x1="20" y1="45" x2="44" y2="45" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
            <line x1="24" y1="50" x2="40" y2="50" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );

      case 'setting':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="gear-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
              <linearGradient id="gear-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#0891b2" />
              </linearGradient>
            </defs>
            {/* Large Cog */}
            <circle cx="28" cy="34" r="14" fill="url(#gear-grad)" stroke="#94a3b8" strokeWidth="2" />
            <circle cx="28" cy="34" r="5" fill="#1e293b" />
            {/* Smaller Interlocking Cog */}
            <circle cx="44" cy="22" r="10" fill="url(#gear-blue)" stroke="#67e8f9" strokeWidth="1.5" />
            <circle cx="44" cy="22" r="3.5" fill="#083344" />
            {/* Cog teeth highlights */}
            <circle cx="28" cy="18" r="2" fill="#cbd5e1" />
            <circle cx="28" cy="50" r="2" fill="#cbd5e1" />
            <circle cx="12" cy="34" r="2" fill="#cbd5e1" />
            <circle cx="44" cy="34" r="2" fill="#cbd5e1" />
          </svg>
        );

      case 'about':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="about-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            {/* Glowing Gem / Orb */}
            <circle cx="32" cy="32" r="22" fill="url(#about-grad)" stroke="#f472b6" strokeWidth="2" />
            {/* Info Symbol 'i' in 3D */}
            <circle cx="32" cy="22" r="3.5" fill="#ffffff" />
            <rect x="29" y="28" width="6" height="15" rx="3" fill="#ffffff" />
            {/* Star crown */}
            <path d="M32 4 L34 10 L40 12 L34 14 L32 20 L30 14 L24 12 L30 10 Z" fill="#facc15" />
          </svg>
        );

      case 'bell':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="bell-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            {/* Top Loop */}
            <circle cx="32" cy="14" r="4" fill="none" stroke="#b45309" strokeWidth="2.5" />
            {/* Bell Dome */}
            <path d="M20 38 C20 22 24 18 32 18 C40 18 44 22 44 38 L48 44 L16 44 Z" fill="url(#bell-grad)" stroke="#fde68a" strokeWidth="1.5" />
            {/* Clapper */}
            <circle cx="32" cy="48" r="4" fill="#78350f" />
            {/* Sound Wave Accent */}
            <path d="M52 24 A 12 12 0 0 1 54 36" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 24 A 12 12 0 0 0 10 36" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        );

      case 'cart':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="cart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            <path d="M12 16 L20 16 L26 40 L46 40 L52 22 L22 22" fill="none" stroke="url(#cart-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="28" cy="48" r="4" fill="#047857" stroke="#6ee7b7" strokeWidth="1.5" />
            <circle cx="44" cy="48" r="4" fill="#047857" stroke="#6ee7b7" strokeWidth="1.5" />
            {/* Glowing items inside */}
            <circle cx="32" cy="24" r="5" fill="#f59e0b" />
            <circle cx="42" cy="26" r="4" fill="#ef4444" />
          </svg>
        );

      case 'barcode':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="scanner-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#4338ca" />
              </linearGradient>
            </defs>
            {/* Barcode Lines */}
            <rect x="14" y="16" width="3" height="32" fill="#334155" />
            <rect x="20" y="16" width="5" height="32" fill="#334155" />
            <rect x="28" y="16" width="2" height="32" fill="#334155" />
            <rect x="33" y="16" width="4" height="32" fill="#334155" />
            <rect x="40" y="16" width="2" height="32" fill="#334155" />
            <rect x="45" y="16" width="5" height="32" fill="#334155" />
            {/* Red Laser Beam 3D */}
            <line x1="8" y1="32" x2="56" y2="32" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
          </svg>
        );

      case 'excel':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="xls-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
            </defs>
            <rect x="14" y="12" width="36" height="42" rx="5" fill="url(#xls-grad)" stroke="#86efac" strokeWidth="1" />
            <line x1="20" y1="24" x2="44" y2="24" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.7" />
            <line x1="20" y1="32" x2="44" y2="32" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.7" />
            <line x1="20" y1="40" x2="44" y2="40" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.7" />
            <line x1="32" y1="18" x2="32" y2="48" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.7" />
            <rect x="8" y="24" width="20" height="20" rx="3" fill="#14532d" />
            <text x="18" y="38" fontSize="13" fontWeight="900" fill="#ffffff" textAnchor="middle">X</text>
          </svg>
        );

      case 'print':
      case 'bluetooth':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="prt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            {/* Paper feed top */}
            <path d="M22 10 L42 10 L42 22 L22 22 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
            {/* Printer Main Block */}
            <rect x="12" y="22" width="40" height="26" rx="6" fill="url(#prt-grad)" stroke="#93c5fd" strokeWidth="1.5" />
            {/* Receipt output slot */}
            <rect x="18" y="30" width="28" height="4" rx="2" fill="#0f172a" />
            {/* Paper coming out */}
            <path d="M20 34 L44 34 L44 48 L20 48 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            <line x1="24" y1="38" x2="40" y2="38" stroke="#64748b" strokeWidth="1.5" />
            <line x1="24" y1="42" x2="36" y2="42" stroke="#64748b" strokeWidth="1.5" />
            {/* LED Status Light */}
            <circle cx="44" cy="26" r="2" fill="#10b981" />
          </svg>
        );

      case 'revenue':
      case 'money':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="mon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#047857" />
              </linearGradient>
            </defs>
            {/* Stack of Cash */}
            <rect x="12" y="28" width="40" height="22" rx="4" fill="url(#mon-grad)" stroke="#6ee7b7" strokeWidth="1.5" />
            <rect x="16" y="22" width="36" height="6" rx="2" fill="#059669" />
            <rect x="20" y="16" width="32" height="6" rx="2" fill="#34d399" />
            <circle cx="32" cy="39" r="6" fill="#047857" stroke="#a7f3d0" strokeWidth="1" />
            <text x="32" y="43" fontSize="10" fontWeight="bold" fill="#ffffff" textAnchor="middle">$</text>
          </svg>
        );

      case 'customer':
        return (
          <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-lg">
            <defs>
              <linearGradient id="cust-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
            </defs>
            <circle cx="32" cy="22" r="12" fill="url(#cust-grad)" stroke="#bae6fd" strokeWidth="1.5" />
            <path d="M16 48 C16 38 24 36 32 36 C40 36 48 38 48 48 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
          </svg>
        );

      default:
        return (
          <div className="w-full h-full flex items-center justify-center font-bold text-indigo-500">
            •
          </div>
        );
    }
  };

  return (
    <div
      style={{ width: pixelSize, height: pixelSize }}
      className={`inline-flex items-center justify-center flex-shrink-0 transition-transform duration-200 select-none ${
        animate ? 'hover:scale-110 active:scale-95' : ''
      } ${className}`}
    >
      {renderIconContent()}
    </div>
  );
};
