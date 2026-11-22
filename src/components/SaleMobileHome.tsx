import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Bell, User } from 'lucide-react';
import type { PageId } from '../types';
import { useI18n } from '../utils/i18nContext';

interface SaleMobileHomeProps {
  saleName: string;
  avatarUrl?: string;
  totalBellAlerts: number;
  bellOpen: boolean;
  onToggleBell: () => void;
  onSelectPage: (page: PageId) => void;
  networkSignalButton?: React.ReactNode;
  bellPopover?: React.ReactNode;
  banners?: React.ReactNode;
}

interface LauncherTileConfig {
  id: PageId;
  gradientClass: string;
  shadowClass: string;
  renderArtwork: () => React.ReactNode;
}

function getInitials(name: string): string {
  const clean = String(name || '').trim();
  if (!clean) return 'S';
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

/**
 * 1. Dashboard — 3D Sky-Blue Cozy House Illustration
 */
const ArtworkDashboard3D: React.FC = () => (
  <svg viewBox="0 0 120 112" fill="none" className="w-full h-full drop-shadow-[0_10px_14px_rgba(120,10,10,0.28)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-house-roof" x1="16" y1="22" x2="104" y2="62" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#64c8ff" />
        <stop offset="55%" stopColor="#3598eb" />
        <stop offset="100%" stopColor="#1e6ec4" />
      </linearGradient>
      <linearGradient id="sm-house-roof-under" x1="14" y1="54" x2="52" y2="54" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#124e91" />
        <stop offset="100%" stopColor="#1b6bb8" />
      </linearGradient>
      <linearGradient id="sm-house-wall-l" x1="26" y1="44" x2="66" y2="94" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#9cdbff" />
        <stop offset="100%" stopColor="#5eb4e8" />
      </linearGradient>
      <linearGradient id="sm-house-wall-r" x1="66" y1="48" x2="102" y2="92" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#72c4f2" />
        <stop offset="100%" stopColor="#3f94cf" />
      </linearGradient>
      <linearGradient id="sm-house-base" x1="18" y1="90" x2="102" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2673cf" />
        <stop offset="100%" stopColor="#12499e" />
      </linearGradient>
      <linearGradient id="sm-house-chimney" x1="74" y1="22" x2="90" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#d4e6f5" />
      </linearGradient>
    </defs>

    {/* Ground shadow */}
    <ellipse cx="62" cy="102" rx="44" ry="6.5" fill="#7a0909" fillOpacity="0.28" />

    {/* 3D Blue Plinth Base */}
    <path
      d="M22 92C22 89.2 24.4 87 27.3 87H96.5C99.5 87 102 89.2 102 92V95.5C102 98.4 99.5 100.8 96.5 100.8H27.3C24.4 100.8 22 98.4 22 95.5V92Z"
      fill="url(#sm-house-base)"
    />
    <path
      d="M23 91.5C23 89.5 25 88 27.5 88H96C98.5 88 100.5 89.5 100.5 91.5C100.5 93.2 98.5 94.5 96 94.5H27.5C25 94.5 23 93.2 23 91.5Z"
      fill="#3889e6"
    />

    {/* Left Roof Overhang Shadow */}
    <path d="M16 57L38 26L46 31L26 60L16 57Z" fill="url(#sm-house-roof-under)" />

    {/* Front Wall (Left facet) */}
    <path d="M27 53L48 33L70 53V92H27V53Z" fill="url(#sm-house-wall-l)" />
    {/* Side Wall (Right facet) */}
    <path d="M70 53L97 49V91.5L70 92V53Z" fill="url(#sm-house-wall-r)" />

    {/* Wall subtle top eaves shadow */}
    <path d="M27 56L48 37L70 56V60L48 41L27 60V56Z" fill="#2366a3" fillOpacity="0.26" />
    <path d="M70 55L97 51V55.5L70 59V55Z" fill="#18518a" fillOpacity="0.24" />

    {/* Arched White Doorway */}
    <path d="M40 92V74.5C40 69.5 43.8 66 48.5 66C53.2 66 57 69.5 57 74.5V92H40Z" fill="#24629e" fillOpacity="0.28" />
    <path d="M42.2 92V75C42.2 71 45 68 48.8 68C52.6 68 55.4 71 55.4 75V92H42.2Z" fill="#f3f9ff" />
    <path d="M42.2 75C42.2 71 45 68 48.8 68C50.2 68 51.4 68.4 52.3 69.1C49.5 69.5 47.4 72 47.4 75.2V92H42.2V75Z" fill="#d9ecfa" />

    {/* Side Windows */}
    <rect x="75" y="65" width="7.2" height="13.5" rx="3.2" fill="#215e96" />
    <rect x="76.6" y="66.5" width="4.4" height="10.5" rx="2.2" fill="#a8deff" />
    <rect x="85.5" y="64" width="6.8" height="13" rx="3.1" fill="#215e96" />
    <rect x="87" y="65.5" width="4.1" height="10" rx="2" fill="#a8deff" />

    {/* Main 3D Pitched Roof */}
    <path
      d="M44 26.5C46.3 23.8 50.2 23.5 53 25.5L83.5 25.5C86 25.5 88.2 26.8 89.6 28.8L106.5 51.5C108.4 54.1 106.9 57.8 103.7 58.3L73.5 62.5C71.1 62.8 68.7 61.8 67.2 59.9L47.8 35.8L25.4 59.8C23.1 62.2 19.2 61.9 17.4 59.1C15.9 56.9 16.2 53.9 18 51.9L44 26.5Z"
      fill="url(#sm-house-roof)"
    />
    {/* Roof Ridge Highlight */}
    <path d="M48.5 28.5L70.5 55.5L103 52.5L85.5 29.5H48.5Z" fill="#7fd3ff" fillOpacity="0.28" />

    {/* White Chimney */}
    <path d="M75 24H87V41L81 43L75 40V24Z" fill="url(#sm-house-chimney)" />
    <path d="M81 24H87V41L81 43V24Z" fill="#bdd8ed" />
    <rect x="73" y="20.5" width="16" height="5.5" rx="2.2" fill="#ffffff" />
    <rect x="75.5" y="22" width="11" height="2" rx="1" fill="#9bc2df" fillOpacity="0.45" />
  </svg>
);

/**
 * 2. Orders — 3D Tilted Checklist Clipboard Illustration
 */
const ArtworkOrders3D: React.FC = () => (
  <svg viewBox="0 0 120 118" fill="none" className="w-full h-full drop-shadow-[0_10px_16px_rgba(7,46,138,0.3)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-ord-board" x1="26" y1="20" x2="96" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#eab097" />
        <stop offset="100%" stopColor="#c57d62" />
      </linearGradient>
      <linearGradient id="sm-ord-paper" x1="34" y1="26" x2="88" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#dbe8f5" />
      </linearGradient>
      <linearGradient id="sm-ord-clip" x1="48" y1="14" x2="78" y2="38" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6be5d2" />
        <stop offset="100%" stopColor="#2ca69b" />
      </linearGradient>
    </defs>

    <g transform="rotate(26 60 60)">
      {/* Extruded Board Depth */}
      <rect x="27" y="23" width="66" height="82" rx="12" fill="#9f5c44" />
      {/* Board Front */}
      <rect x="25" y="19" width="66" height="82" rx="12" fill="url(#sm-ord-board)" />

      {/* Paper Stack Depth */}
      <rect x="33" y="27" width="52" height="68" rx="7" fill="#b7cce0" />
      {/* Paper Front */}
      <rect x="32" y="25" width="52" height="67" rx="7" fill="url(#sm-ord-paper)" />

      {/* Top Mint-Teal Badge Clip */}
      <rect x="44" y="14" width="28" height="21" rx="8" fill="#1e7b73" />
      <rect x="44" y="12" width="28" height="20" rx="8" fill="url(#sm-ord-clip)" />
      <path
        d="M52.5 22L56.5 25.8L64.5 18.2"
        stroke="#ffffff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Checklist Rows */}
      {[43, 57, 71].map((y, idx) => (
        <g key={y}>
          <rect x="39" y={y} width="9.5" height="9.5" rx="2.6" fill="#f7c865" />
          <rect x="39.8" y={y + 0.8} width="7.9" height="3.2" rx="1.2" fill="#fde3a7" fillOpacity="0.6" />
          <rect
            x="53"
            y={y + 2.5}
            width={idx === 2 ? 18 : 24}
            height="4.6"
            rx="2.3"
            fill="#4d738a"
          />
        </g>
      ))}
    </g>
  </svg>
);

/**
 * 3. Products — 3D Cardboard Parcel Box + Smartphone Checklist Illustration
 */
const ArtworkProducts3D: React.FC = () => (
  <svg viewBox="0 0 124 112" fill="none" className="w-full h-full drop-shadow-[0_10px_14px_rgba(3,94,20,0.3)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-box-top" x1="18" y1="22" x2="80" y2="48" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#d8ba43" />
        <stop offset="100%" stopColor="#b09128" />
      </linearGradient>
      <linearGradient id="sm-box-left" x1="16" y1="38" x2="54" y2="94" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ba9a2a" />
        <stop offset="100%" stopColor="#8d7217" />
      </linearGradient>
      <linearGradient id="sm-box-right" x1="54" y1="38" x2="86" y2="92" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#9d801c" />
        <stop offset="100%" stopColor="#725a0e" />
      </linearGradient>
      <linearGradient id="sm-phone-frame" x1="72" y1="42" x2="110" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#268f9c" />
        <stop offset="100%" stopColor="#145669" />
      </linearGradient>
    </defs>

    {/* Soft shadow */}
    <ellipse cx="62" cy="100" rx="46" ry="6.5" fill="#045916" fillOpacity="0.28" />

    {/* 3D Parcel Box */}
    <path d="M51 22L84 35L52 49L18 36L51 22Z" fill="url(#sm-box-top)" />
    <path d="M18 36L52 49V94L18 80V36Z" fill="url(#sm-box-left)" />
    <path d="M52 49L84 35V79L52 94V49Z" fill="url(#sm-box-right)" />

    {/* Blue Packing Tape across top & side */}
    <path d="M35 28.8L68 42L60.5 45.3L27.5 32.1L35 28.8Z" fill="#2c75ad" />
    <path d="M60.5 45.3L68 42V55L60.5 58.3V45.3Z" fill="#1e5a8c" />

    {/* Box barcode / shipping label */}
    <g opacity="0.82">
      <rect x="24" y="71" width="12" height="2.6" rx="1.2" fill="#e7d288" transform="skewY(21)" />
      <rect x="24" y="75.5" width="9" height="2.4" rx="1.1" fill="#e7d288" transform="skewY(21)" />
    </g>

    {/* Smartphone Checklist in Foreground Right */}
    <rect x="74" y="42" width="38" height="60" rx="9" fill="#0d3f50" />
    <rect x="72" y="40" width="38" height="60" rx="9" fill="url(#sm-phone-frame)" stroke="#4cc5cf" strokeWidth="1.4" />
    {/* Screen */}
    <rect x="76" y="45" width="30" height="50" rx="5.5" fill="#1d6d7e" />
    {/* Top notch speaker */}
    <rect x="86" y="47.5" width="10" height="2.2" rx="1.1" fill="#0f414f" />

    {/* Yellow checkmarks & inventory bars on phone */}
    {[55, 64, 73, 82].map((y) => (
      <g key={y}>
        <circle cx="82.5" cy={y + 2} r="3.2" fill="#e6cf42" />
        <path
          d={`M81 ${y + 2}L82.1 ${y + 3.1}L84.2 ${y + 0.9}`}
          stroke="#19525e"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="88" y={y} width="14" height="2.2" rx="1.1" fill="#c7f2f5" />
        <rect x="88" y={y + 3.2} width="9.5" height="1.7" rx="0.85" fill="#7ecad4" />
      </g>
    ))}
  </svg>
);

/**
 * 4. Due Payments — 3D Clipboard + Paper Invoice + Floating Golden $ Coins
 */
const ArtworkDuePayments3D: React.FC = () => (
  <svg viewBox="0 0 124 114" fill="none" className="w-full h-full drop-shadow-[0_10px_14px_rgba(140,80,0,0.28)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-due-board" x1="28" y1="22" x2="94" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#659be6" />
        <stop offset="100%" stopColor="#3b6cb8" />
      </linearGradient>
      <linearGradient id="sm-due-paper" x1="36" y1="30" x2="88" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#fffdf2" />
        <stop offset="100%" stopColor="#efe4c6" />
      </linearGradient>
      <linearGradient id="sm-coin-face" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ffe175" />
        <stop offset="100%" stopColor="#e59710" />
      </linearGradient>
    </defs>

    {/* Ground shadow */}
    <ellipse cx="62" cy="103" rx="36" ry="5.5" fill="#8f5400" fillOpacity="0.28" />

    {/* Extruded Clipboard */}
    <rect x="29" y="25" width="66" height="77" rx="11" fill="#2c5394" />
    <rect x="27" y="22" width="66" height="77" rx="11" fill="url(#sm-due-board)" />

    {/* Top Arch Clip */}
    <path d="M44 26C44 16 51 11 60 11C69 11 76 16 76 26V32H44V26Z" fill="#5084d4" />

    {/* Cream Invoice Sheet */}
    <path d="M36 32H84V90C84 92 82.5 93.5 80.5 93.5H39.5C37.5 93.5 36 92 36 90V32Z" fill="url(#sm-due-paper)" />
    {/* Ledger lines */}
    {[48, 56, 64, 72, 80].map((y, idx) => (
      <rect
        key={y}
        x="43"
        y={y}
        width={idx === 4 ? 22 : 34}
        height="3.4"
        rx="1.7"
        fill="#7f7865"
        fillOpacity={idx === 4 ? 0.55 : 0.78}
      />
    ))}

    {/* Top Center Golden Coin */}
    <g transform="translate(60, 23)">
      <circle cx="0" cy="2" r="10.5" fill="#b56c04" />
      <circle cx="0" cy="0" r="10.5" fill="url(#sm-coin-face)" stroke="#fff3be" strokeWidth="1.4" />
      <text x="0" y="4.5" textAnchor="middle" fill="#fffdf0" fontSize="13" fontWeight="800" fontFamily="sans-serif">
        $
      </text>
    </g>

    {/* Floating Left Golden Coin */}
    <g transform="translate(29, 64)">
      <circle cx="0" cy="2.2" r="12" fill="#b56c04" />
      <circle cx="0" cy="0" r="12" fill="url(#sm-coin-face)" stroke="#fff3be" strokeWidth="1.5" />
      <text x="0" y="5" textAnchor="middle" fill="#fffdf0" fontSize="15" fontWeight="800" fontFamily="sans-serif">
        $
      </text>
    </g>

    {/* Floating Right Golden Coin */}
    <g transform="translate(94, 48)">
      <circle cx="0" cy="2.4" r="13.5" fill="#b56c04" />
      <circle cx="0" cy="0" r="13.5" fill="url(#sm-coin-face)" stroke="#fff3be" strokeWidth="1.6" />
      <text x="0" y="5.5" textAnchor="middle" fill="#fffdf0" fontSize="17" fontWeight="800" fontFamily="sans-serif">
        $
      </text>
    </g>
  </svg>
);

/**
 * 5. POS — 3D Modern Cash Register & Touch Terminal Illustration
 */
const ArtworkPos3D: React.FC = () => (
  <svg viewBox="0 0 124 112" fill="none" className="w-full h-full drop-shadow-[0_10px_14px_rgba(128,0,128,0.3)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-pos-screen" x1="36" y1="16" x2="98" y2="62" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#94a9ff" />
        <stop offset="100%" stopColor="#5d72db" />
      </linearGradient>
      <linearGradient id="sm-pos-shell" x1="20" y1="62" x2="106" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#dce4ff" />
        <stop offset="100%" stopColor="#8fa1f0" />
      </linearGradient>
      <linearGradient id="sm-pos-drawer" x1="20" y1="84" x2="102" y2="102" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5f73d9" />
        <stop offset="100%" stopColor="#35449e" />
      </linearGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="62" cy="101" rx="45" ry="6.5" fill="#700070" fillOpacity="0.28" />

    {/* Cash Drawer Base */}
    <path d="M18 82L78 86L106 74V89L78 101L18 96V82Z" fill="url(#sm-pos-drawer)" />
    <path d="M18 82L46 70L106 74L78 86L18 82Z" fill="url(#sm-pos-shell)" />

    {/* Drawer front slot detail */}
    <path d="M23 87L73 90.5V94.5L23 91V87Z" fill="#29347d" />
    <rect x="42" y="89.2" width="12" height="2.4" rx="1.2" fill="#b7c6ff" transform="rotate(4 48 90)" />

    {/* Keypad Deck */}
    <path d="M28 77L52 67L92 70L68 80L28 77Z" fill="#eef2ff" />
    <circle cx="43" cy="74" r="1.8" fill="#5c6fd6" />
    <circle cx="51" cy="74.8" r="1.8" fill="#5c6fd6" />
    <circle cx="59" cy="75.5" r="1.8" fill="#5c6fd6" />
    <circle cx="50" cy="71.2" r="1.8" fill="#7c8ee6" />
    <circle cx="58" cy="71.9" r="1.8" fill="#7c8ee6" />
    <circle cx="66" cy="72.6" r="1.8" fill="#7c8ee6" />

    {/* Curved Stand Neck */}
    <path d="M56 71L62 56H77L79 71L56 71Z" fill="#5a6ed1" />
    <path d="M62 56H73L70 71H56L62 56Z" fill="#c6d2ff" />

    {/* Tilted 3D Touch Monitor Back Rim */}
    <path
      d="M42 22C42.8 18.2 46.2 15.6 50.1 16L96 20.5C99.9 20.9 102.6 24.4 101.8 28.2L95.5 55.8C94.7 59.5 91.3 62 87.5 61.6L41.8 57C37.9 56.6 35.2 53.1 36 49.3L42 22Z"
      fill="#cfd9ff"
    />
    {/* Monitor Face */}
    <path
      d="M45 23.8C45.6 21 48.1 19 51 19.3L93 23.4C95.9 23.7 97.9 26.3 97.3 29.1L91.8 53.4C91.2 56.2 88.7 58.1 85.8 57.8L43.8 53.7C40.9 53.4 38.9 50.8 39.5 48L45 23.8Z"
      fill="url(#sm-pos-screen)"
    />
    {/* Screen Gloss Highlight */}
    <path d="M48 22.5L78 25.4L56 51.5L42.5 50.2L48 22.5Z" fill="#ffffff" fillOpacity="0.18" />
  </svg>
);

/**
 * 6. Settings — 3D Blue-and-Gold Mechanical Cogwheel Gear Illustration
 */
const ArtworkSettings3D: React.FC = () => (
  <svg viewBox="0 0 116 114" fill="none" className="w-full h-full drop-shadow-[0_10px_14px_rgba(3,79,76,0.3)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-gear-blue" x1="20" y1="16" x2="96" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3da3f5" />
        <stop offset="55%" stopColor="#1b74cc" />
        <stop offset="100%" stopColor="#0f4e94" />
      </linearGradient>
      <linearGradient id="sm-gear-gold" x1="32" y1="28" x2="84" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#e8cd68" />
        <stop offset="100%" stopColor="#bf9e38" />
      </linearGradient>
    </defs>

    {/* Ground shadow */}
    <ellipse cx="58" cy="102" rx="34" ry="5.5" fill="#034f4c" fillOpacity="0.28" />

    {/* Extruded 3D Gear Shadow Layer */}
    <g transform="translate(-4, 5)">
      <path
        d="M52 15H64L67.5 24.8C70.6 25.7 73.5 27.1 76.1 28.9L85.4 24.4L93.9 32.9L89.4 42.2C91.2 44.8 92.6 47.7 93.5 50.8L103 54.3V66.3L93.5 69.8C92.6 72.9 91.2 75.8 89.4 78.4L93.9 87.7L85.4 96.2L76.1 91.7C73.5 93.5 70.6 94.9 67.5 95.8L64 105.5H52L48.5 95.8C45.4 94.9 42.5 93.5 39.9 91.7L30.6 96.2L22.1 87.7L26.6 78.4C24.8 75.8 23.4 72.9 22.5 69.8L13 66.3V54.3L22.5 50.8C23.4 47.7 24.8 44.8 26.6 42.2L22.1 32.9L30.6 24.4L39.9 28.9C42.5 27.1 45.4 25.7 48.5 24.8L52 15Z"
        fill="#0b3d75"
      />
    </g>

    {/* Main 3D Blue Cogwheel Face */}
    <path
      d="M52 13H64L67.5 22.8C70.6 23.7 73.5 25.1 76.1 26.9L85.4 22.4L93.9 30.9L89.4 40.2C91.2 42.8 92.6 45.7 93.5 48.8L103 52.3V64.3L93.5 67.8C92.6 70.9 91.2 73.8 89.4 76.4L93.9 85.7L85.4 94.2L76.1 89.7C73.5 91.5 70.6 92.9 67.5 93.8L64 103.5H52L48.5 93.8C45.4 92.9 42.5 91.5 39.9 89.7L30.6 94.2L22.1 85.7L26.6 76.4C24.8 73.8 23.4 70.9 22.5 67.8L13 64.3V52.3L22.5 48.8C23.4 45.7 24.8 42.8 26.6 40.2L22.1 30.9L30.6 22.4L39.9 26.9C42.5 25.1 45.4 23.7 48.5 22.8L52 13Z"
      fill="url(#sm-gear-blue)"
    />

    {/* Golden Inner Ring */}
    <circle cx="58" cy="58.2" r="26.5" fill="url(#sm-gear-gold)" />
    <circle cx="58" cy="58.2" r="24" fill="none" stroke="#f7e499" strokeWidth="1.6" strokeOpacity="0.65" />

    {/* Center Cobalt Hub Rim + Hollow Hole */}
    <circle cx="58" cy="58.2" r="14.5" fill="#186bc2" />
    <circle cx="58" cy="58.2" r="9.5" fill="#0b8f89" />
    <path
      d="M50.5 53.5C52.5 50.2 56.4 48.4 60.4 49.1C64.4 49.8 67.4 53.1 67.5 57.2"
      stroke="#094078"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 7. Privacy Policy — 3D Protective Shield & Padlock Illustration
 */
const ArtworkPrivacyPolicy3D: React.FC = () => (
  <svg viewBox="0 0 120 114" fill="none" className="w-full h-full drop-shadow-[0_10px_14px_rgba(14,26,115,0.34)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-priv-shield-back" x1="22" y1="14" x2="96" y2="104" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#2647b8" />
        <stop offset="100%" stopColor="#12216b" />
      </linearGradient>
      <linearGradient id="sm-priv-shield-face" x1="22" y1="12" x2="94" y2="98" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#8ce4ff" />
        <stop offset="48%" stopColor="#4bb3ff" />
        <stop offset="100%" stopColor="#2268e6" />
      </linearGradient>
      <linearGradient id="sm-priv-inner" x1="34" y1="24" x2="84" y2="88" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#d7e8ff" />
      </linearGradient>
      <linearGradient id="sm-priv-lock" x1="46" y1="48" x2="74" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffe175" />
        <stop offset="100%" stopColor="#e69410" />
      </linearGradient>
    </defs>

    {/* Ground shadow */}
    <ellipse cx="60" cy="103" rx="35" ry="5.5" fill="#0d175e" fillOpacity="0.32" />

    {/* Extruded 3D Shield Depth */}
    <path
      d="M62 14L96 27.5V54.5C96 76.5 81.8 94.5 62 102C42.2 94.5 28 76.5 28 54.5V27.5L62 14Z"
      fill="url(#sm-priv-shield-back)"
    />

    {/* Front 3D Shield Face */}
    <path
      d="M58 11L92 24.5V51.5C92 73.5 77.8 91.5 58 99C38.2 91.5 24 73.5 24 51.5V24.5L58 11Z"
      fill="url(#sm-priv-shield-face)"
      stroke="#c7f2ff"
      strokeWidth="1.8"
    />

    {/* Inner Glossy White Shield Inset */}
    <path
      d="M58 20L83 30V50.5C83 67.5 72.4 81.4 58 87.5C43.6 81.4 33 67.5 33 50.5V30L58 20Z"
      fill="url(#sm-priv-inner)"
    />

    {/* Soft Left Gloss Reflection */}
    <path
      d="M58 20L33 30V50.5C33 67.5 43.6 81.4 58 87.5V20Z"
      fill="#ffffff"
      fillOpacity="0.32"
    />

    {/* 3D Golden Padlock Emblem */}
    <path
      d="M49.5 49V43.5C49.5 38.8 53.3 35 58 35C62.7 35 66.5 38.8 66.5 43.5V49"
      stroke="#2b55c9"
      strokeWidth="4.6"
      strokeLinecap="round"
    />
    <rect x="45.5" y="49.5" width="27" height="22" rx="6.5" fill="#b36a05" />
    <rect x="44.5" y="47.5" width="27" height="22" rx="6.5" fill="url(#sm-priv-lock)" stroke="#fff4c2" strokeWidth="1.3" />
    <circle cx="58" cy="56.8" r="2.8" fill="#7a4400" />
    <rect x="56.7" y="58.2" width="2.6" height="5.6" rx="1.3" fill="#7a4400" />

    {/* Floating Green Verified Badge */}
    <g transform="translate(88, 76)">
      <circle cx="0" cy="2" r="12" fill="#06733b" />
      <circle cx="0" cy="0" r="12" fill="#1ed76c" stroke="#d8ffea" strokeWidth="1.6" />
      <path
        d="M-4.8 0.3L-1.4 3.7L5.2 -3.2"
        stroke="#ffffff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

/**
 * 8. About — 3D Indigo-Gold App Information Emblem & Shield Illustration
 */
const ArtworkAbout3D: React.FC = () => (
  <svg viewBox="0 0 120 112" fill="none" className="w-full h-full drop-shadow-[0_10px_14px_rgba(32,20,120,0.34)]" aria-hidden="true">
    <defs>
      <linearGradient id="sm-about-card-back" x1="20" y1="22" x2="96" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#65d4ff" />
        <stop offset="100%" stopColor="#267de8" />
      </linearGradient>
      <linearGradient id="sm-about-disc" x1="28" y1="16" x2="92" y2="92" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="65%" stopColor="#e3ecff" />
        <stop offset="100%" stopColor="#bdd1ff" />
      </linearGradient>
      <linearGradient id="sm-about-rim" x1="24" y1="20" x2="96" y2="96" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3c7cf0" />
        <stop offset="100%" stopColor="#1e3c9c" />
      </linearGradient>
      <linearGradient id="sm-about-letter" x1="48" y1="30" x2="72" y2="82" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#5d4ef7" />
        <stop offset="100%" stopColor="#2e1fb8" />
      </linearGradient>
      <linearGradient id="sm-about-star" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff099" />
        <stop offset="100%" stopColor="#f5a614" />
      </linearGradient>
    </defs>

    {/* Ground shadow */}
    <ellipse cx="60" cy="100" rx="38" ry="6" fill="#211473" fillOpacity="0.3" />

    {/* Tilted 3D App Document Card Behind */}
    <g transform="rotate(-12 58 58)">
      <rect x="20" y="23" width="66" height="64" rx="15" fill="#174494" />
      <rect x="18" y="20" width="66" height="64" rx="15" fill="url(#sm-about-card-back)" />
      <rect x="26" y="31" width="28" height="5" rx="2.5" fill="#ffffff" fillOpacity="0.65" />
      <rect x="26" y="40" width="20" height="4" rx="2" fill="#ffffff" fillOpacity="0.4" />
    </g>

    {/* Main 3D Extruded Circular Info Medallion */}
    <circle cx="66" cy="60" r="34" fill="url(#sm-about-rim)" />
    <circle cx="64" cy="56" r="34" fill="url(#sm-about-disc)" stroke="#ffffff" strokeWidth="2" />
    <circle cx="64" cy="56" r="27.5" fill="none" stroke="#85a6ff" strokeWidth="1.5" strokeOpacity="0.45" />

    {/* Raised 3D "i" Emblem */}
    <circle cx="65.2" cy="41.5" r="5.4" fill="#b7c6ff" />
    <circle cx="64" cy="40.5" r="5.4" fill="url(#sm-about-letter)" />
    <rect x="60.4" y="51.2" width="9.2" height="23.5" rx="4.6" fill="#b7c6ff" />
    <rect x="59.4" y="50" width="9.2" height="23.5" rx="4.6" fill="url(#sm-about-letter)" />

    {/* Gloss Highlight Arc */}
    <path
      d="M41 44C45.5 34.5 54.5 29 64.5 29"
      stroke="#ffffff"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeOpacity="0.85"
    />

    {/* Floating 3D Golden Star Badge */}
    <g transform="translate(94, 24)">
      <path
        d="M0 -11L2.9 -3.2L11 -0.5L2.9 2.3L0 10.5L-2.9 2.3L-11 -0.5L-2.9 -3.2L0 -11Z"
        fill="#b86c04"
        transform="translate(0, 1.8)"
      />
      <path
        d="M0 -11L2.9 -3.2L11 -0.5L2.9 2.3L0 10.5L-2.9 2.3L-11 -0.5L-2.9 -3.2L0 -11Z"
        fill="url(#sm-about-star)"
      />
    </g>
  </svg>
);

const LAUNCHER_TILES: LauncherTileConfig[] = [
  {
    id: 'dashboard',
    gradientClass: 'bg-gradient-to-br from-[#ff6a60] via-[#ff352a] to-[#e81010]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(232,16,16,0.42)]',
    renderArtwork: () => <ArtworkDashboard3D />,
  },
  {
    id: 'orders',
    gradientClass: 'bg-gradient-to-br from-[#62b0ff] via-[#3484ff] to-[#0a60f5]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(10,96,245,0.42)]',
    renderArtwork: () => <ArtworkOrders3D />,
  },
  {
    id: 'products',
    gradientClass: 'bg-gradient-to-br from-[#2be06f] via-[#0ac742] to-[#00a61c]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(0,166,28,0.4)]',
    renderArtwork: () => <ArtworkProducts3D />,
  },
  {
    id: 'due-payments',
    gradientClass: 'bg-gradient-to-br from-[#fbe17c] via-[#f0b42c] to-[#d98a06]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(217,138,6,0.4)]',
    renderArtwork: () => <ArtworkDuePayments3D />,
  },
  {
    id: 'pos',
    gradientClass: 'bg-gradient-to-br from-[#ff67eb] via-[#f424e2] to-[#d400d6]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(212,0,214,0.4)]',
    renderArtwork: () => <ArtworkPos3D />,
  },
  {
    id: 'settings',
    gradientClass: 'bg-gradient-to-br from-[#20dacb] via-[#0db3a8] to-[#058a84]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(5,138,132,0.4)]',
    renderArtwork: () => <ArtworkSettings3D />,
  },
  {
    id: 'privacy-policy',
    gradientClass: 'bg-gradient-to-br from-[#4d79ff] via-[#3155f2] to-[#1b34c4]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(27,52,196,0.42)]',
    renderArtwork: () => <ArtworkPrivacyPolicy3D />,
  },
  {
    id: 'about',
    gradientClass: 'bg-gradient-to-br from-[#9e6bff] via-[#7c46f5] to-[#5a22d9]',
    shadowClass: 'shadow-[0_12px_26px_-8px_rgba(90,34,217,0.42)]',
    renderArtwork: () => <ArtworkAbout3D />,
  },
];

export const SaleMobileHome: React.FC<SaleMobileHomeProps> = ({
  saleName,
  avatarUrl,
  totalBellAlerts,
  bellOpen,
  onToggleBell,
  onSelectPage,
  networkSignalButton,
  bellPopover,
  banners,
}) => {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const cleanAvatarUrl = String(avatarUrl || '').trim();

  return (
    <div className="min-h-dvh w-full bg-[#fcfbfd] dark:bg-background text-foreground flex flex-col">
      {/* Top Profile, Online Signal & Notification Row */}
      <header className="sticky top-0 z-30 bg-[#fcfbfd]/95 dark:bg-background/95 backdrop-blur-md pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3">
        <div className="w-full max-w-xl mx-auto px-5 sm:px-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Read-only Sale Avatar controlled exclusively by Master Admin */}
            <div
              aria-label={saleName}
              className="relative h-15 w-15 sm:h-16 sm:w-16 shrink-0 rounded-full p-[3px] bg-gradient-to-tr from-[#22c8e5] via-[#2ed7cb] to-[#49e3c4] shadow-sm select-none"
            >
              <div className="h-full w-full rounded-full bg-white dark:bg-surface p-[2.5px] overflow-hidden">
                {cleanAvatarUrl ? (
                  <img
                    src={cleanAvatarUrl}
                    alt={saleName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-100 font-bold text-lg select-none">
                    {saleName ? getInitials(saleName) : <User className="h-6 w-6" />}
                  </div>
                )}
              </div>
            </div>

            <h1 className="text-[22px] sm:text-2xl font-bold tracking-tight text-foreground truncate leading-snug">
              {saleName}
            </h1>
          </div>

          {/* Right Bar: Online Signal Tower + Clean Notification Bell */}
          <div className="flex items-center gap-1.5 shrink-0">
            {networkSignalButton}

            <div className="relative shrink-0">
              <motion.button
                type="button"
                onClick={onToggleBell}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                aria-label={t.header.notifications}
                aria-expanded={bellOpen}
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-full text-foreground hover:bg-foreground/5 active:bg-foreground/10 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Bell className="h-7 w-7 stroke-[2]" />
                {totalBellAlerts > 0 && (
                  <span
                    aria-label={`${totalBellAlerts}`}
                    className="absolute top-2 right-2 h-3 w-3 rounded-full bg-[#ff3b30] ring-2 ring-[#fcfbfd] dark:ring-background"
                  />
                )}
              </motion.button>
              {bellPopover}
            </div>
          </div>
        </div>
      </header>

      {banners}

      {/* 2x3 Vibrant 3D Launcher Grid */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 pt-3 pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {LAUNCHER_TILES.map((tile, index) => {
            const label = t.nav[tile.id];
            return (
              <motion.button
                key={tile.id}
                type="button"
                onClick={() => onSelectPage(tile.id)}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: prefersReducedMotion ? 0 : index * 0.035,
                  ease: [0.16, 1, 0.3, 1],
                }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                className={`group relative overflow-hidden rounded-[26px] sm:rounded-[30px] aspect-[1/1.08] min-h-[162px] p-4 sm:p-5 text-left flex flex-col justify-between cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${tile.gradientClass} ${tile.shadowClass}`}
              >
                {/* Soft top-left luminous sheen */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-white/18 blur-2xl"
                />

                {/* Top-Left Crisp White Card Label */}
                <span className="relative z-10 block text-[17px] sm:text-[19px] font-bold text-white leading-snug tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.14)] truncate">
                  {label}
                </span>

                {/* Bottom-Right Large 3D Illustration */}
                <div className="relative z-10 mt-auto self-end w-[72%] max-w-[126px] aspect-square -mr-1 -mb-1.5 transition-transform duration-200 ease-out group-hover:scale-105 group-active:scale-95">
                  {tile.renderArtwork()}
                </div>
              </motion.button>
            );
          })}
        </div>
      </main>
    </div>
  );
};
