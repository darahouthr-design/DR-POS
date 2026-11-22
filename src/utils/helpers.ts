import type { CurrencyCode, LanguageCode, Order } from '../types';

export function resolveImageUrl(rawUrl?: string): string {
  if (!rawUrl || rawUrl.startsWith('asset:')) return '';
  return rawUrl;
}

export function normalizePhone(raw: string): string {
  const digits = String(raw || '').replace(/\D+/g, '');
  if (digits.startsWith('855') && digits.length > 8) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('82') && digits.length > 9) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export function cleanSaleNameDisplay(raw: string): string {
  return String(raw || '')
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSaleKey(raw: string): string {
  return cleanSaleNameDisplay(raw).toLowerCase();
}

export function formatMoney(usdAmount: number, currency: CurrencyCode): string {
  const safe = Number.isFinite(usdAmount) ? usdAmount : 0;
  if (currency === 'kh') {
    const khr = Math.round(safe * 4100);
    return `${new Intl.NumberFormat('en-US').format(khr)} ៛`;
  }
  if (currency === 'kr') {
    const krw = Math.round(safe * 1380);
    return `₩${new Intl.NumberFormat('ko-KR').format(krw)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function getCurrencyRate(currency: CurrencyCode): number {
  if (currency === 'kh') return 4100;
  if (currency === 'kr') return 1380;
  return 1;
}

export function getCurrencyMeta(currency: CurrencyCode): {
  code: 'USD' | 'KHR' | 'KRW';
  symbol: '$' | '៛' | '₩';
  step: string;
  inputLabel: string;
} {
  if (currency === 'kh') {
    return { code: 'KHR', symbol: '៛', step: '1', inputLabel: '៛ KHR' };
  }
  if (currency === 'kr') {
    return { code: 'KRW', symbol: '₩', step: '1', inputLabel: '₩ KRW' };
  }
  return { code: 'USD', symbol: '$', step: '0.01', inputLabel: '$ USD' };
}

export function roundUsdPrecision(usdAmount: number): number {
  const safe = Number.isFinite(usdAmount) ? Math.max(0, usdAmount) : 0;
  return Math.round(safe * 1e8) / 1e8;
}

export function usdToInputAmount(usdAmount: number, currency: CurrencyCode): number {
  const safe = Number.isFinite(usdAmount) ? Math.max(0, usdAmount) : 0;
  if (currency === 'kh' || currency === 'kr') {
    return Math.round(safe * getCurrencyRate(currency));
  }
  return Math.round(safe * 100) / 100;
}

export function inputAmountToUsd(displayAmount: number, currency: CurrencyCode): number {
  const safe = Number.isFinite(displayAmount) ? Math.max(0, displayAmount) : 0;
  if (currency === 'kh' || currency === 'kr') {
    return Math.round((safe / getCurrencyRate(currency)) * 1e8) / 1e8;
  }
  return Math.round(safe * 100) / 100;
}

function formatCompactMagnitude(absVal: number, isWholeCurrency: boolean): string {
  if (absVal >= 1_000_000_000) {
    const num = Number((absVal / 1_000_000_000).toFixed(2));
    return `${num}B`;
  }
  if (absVal >= 1_000_000) {
    const num = Number((absVal / 1_000_000).toFixed(2));
    return num >= 1000 ? `${Number((num / 1000).toFixed(2))}B` : `${num}M`;
  }
  if (absVal >= 1_000) {
    const decimals = absVal >= 100_000 ? 1 : 2;
    const num = Number((absVal / 1_000).toFixed(decimals));
    return num >= 1000 ? `${Number((num / 1000).toFixed(2))}M` : `${num}K`;
  }
  if (isWholeCurrency) {
    return String(Math.round(absVal));
  }
  return absVal.toFixed(2).replace(/\.00$/, '');
}

export function formatCompactCount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const sign = safe < 0 ? '-' : '';
  return `${sign}${formatCompactMagnitude(Math.abs(safe), true)}`;
}

export function formatCompactMoney(usdAmount: number, currency: CurrencyCode): string {
  const safe = Number.isFinite(usdAmount) ? usdAmount : 0;
  if (currency === 'kh') {
    const khr = Math.round(safe * 4100);
    const sign = khr < 0 ? '-' : '';
    return `${sign}${formatCompactMagnitude(Math.abs(khr), true)} ៛`;
  }
  if (currency === 'kr') {
    const krw = Math.round(safe * 1380);
    const sign = krw < 0 ? '-' : '';
    return `${sign}₩${formatCompactMagnitude(Math.abs(krw), true)}`;
  }
  const sign = safe < 0 ? '-' : '';
  return `${sign}$${formatCompactMagnitude(Math.abs(safe), false)}`;
}

export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function nowTimeLocal(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Uploads an image to Cloudinary Console (Cloud name: bn5s5spm, Upload preset: PConly)
 * Falls back cleanly to a compressed lightweight JPEG Data URL if offline or blocked.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'bn5s5spm';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'PConly';

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.secure_url === 'string') {
        return data.secure_url;
      }
    }
  } catch {
    // Fall back to compressed local data URL so memory stays small and uploads never break offline
  }

  return compressImageLocally(file);
}

/**
 * Compresses large camera/gallery photos to max 1080px JPEG before uploading to Cloudinary
 * and strictly returns an HTTPS URL (<= 2000 chars) suitable for Firestore product documents.
 */
export async function uploadProductPhotoUrl(file: File): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'bn5s5spm';
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'PConly';

  const preparedFile = await preparePhotoFileForUpload(file, 1080, 0.85);
  const formData = new FormData();
  formData.append('file', preparedFile);
  formData.append('upload_preset', uploadPreset);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('CLOUD_UPLOAD_FAILED');
  }

  const data = (await response.json()) as { secure_url?: unknown; url?: unknown };
  const rawUrl =
    typeof data?.secure_url === 'string'
      ? data.secure_url
      : typeof data?.url === 'string'
      ? data.url
      : '';

  if (!rawUrl || !rawUrl.startsWith('http') || rawUrl.length > 2000) {
    throw new Error('INVALID_IMAGE_URL');
  }

  return rawUrl;
}

function preparePhotoFileForUpload(
  file: File,
  maxSide: number,
  quality: number
): Promise<File> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;
      if (!w || !h) {
        resolve(file);
        return;
      }
      if (w <= maxSide && h <= maxSide && file.size <= 450 * 1024 && file.type === 'image/jpeg') {
        resolve(file);
        return;
      }
      if (w > maxSide || h > maxSide) {
        if (w > h) {
          h = Math.max(1, Math.round((h * maxSide) / w));
          w = maxSide;
        } else {
          w = Math.max(1, Math.round((w * maxSide) / h));
          h = maxSide;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = (file.name || 'product-photo').replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.src = objectUrl;
  });
}

function compressImageLocally(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('មិនអាចអានឯកសាររូបភាពបានទេ'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ''));
      img.onload = () => {
        const maxSide = 640;
        let w = img.width;
        let h = img.height;
        if (w > maxSide || h > maxSide) {
          if (w > h) {
            h = Math.round((h * maxSide) / w);
            w = maxSide;
          } else {
            w = Math.round((w * maxSide) / h);
            h = maxSide;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Custom voice notification played when a new order arrives from Sale or any device.
 * Uses a dual-engine (Web Audio API AudioBuffer + HTMLAudioElement fallback) with
 * first-gesture audio unlocking so realtime Firestore order alerts play reliably on
 * iOS Safari, Android, and Desktop browsers.
 */
export const NEW_ORDER_VOICE_URL = '/assets/aistudio/khmervoice_Kore__1__359e4228.mp3';

let sharedAudioCtx: AudioContext | null = null;
let orderVoiceRawBytes: ArrayBuffer | null = null;
let orderVoiceFetchPromise: Promise<ArrayBuffer | null> | null = null;
let decodedOrderVoiceBuffer: AudioBuffer | null = null;
let decodedForCtx: AudioContext | null = null;
let activeVoiceSource: AudioBufferSourceNode | null = null;
let sharedOrderAudioEl: HTMLAudioElement | null = null;
let orderAudioElUnlocked = false;
let lastOrderNotificationPlayAt = 0;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
      decodedOrderVoiceBuffer = null;
      decodedForCtx = null;
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function getSharedOrderAudioElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  try {
    if (!sharedOrderAudioEl) {
      const audio = new Audio(NEW_ORDER_VOICE_URL);
      audio.preload = 'auto';
      audio.setAttribute('playsinline', 'true');
      sharedOrderAudioEl = audio;
    }
    return sharedOrderAudioEl;
  } catch {
    return null;
  }
}

async function fetchOrderVoiceBytes(): Promise<ArrayBuffer | null> {
  if (orderVoiceRawBytes) return orderVoiceRawBytes;
  if (!orderVoiceFetchPromise) {
    orderVoiceFetchPromise = fetch(NEW_ORDER_VOICE_URL, { cache: 'force-cache' })
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => {
        if (buf && buf.byteLength > 0) {
          orderVoiceRawBytes = buf;
          return buf;
        }
        orderVoiceFetchPromise = null;
        return null;
      })
      .catch(() => {
        orderVoiceFetchPromise = null;
        return null;
      });
  }
  return orderVoiceFetchPromise;
}

async function ensureDecodedOrderVoiceBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (decodedOrderVoiceBuffer && decodedForCtx === ctx) {
    return decodedOrderVoiceBuffer;
  }
  const bytes = await fetchOrderVoiceBytes();
  if (!bytes) return null;
  try {
    const copy = bytes.slice(0);
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
      const maybePromise = ctx.decodeAudioData(copy, resolve, reject);
      if (maybePromise && typeof (maybePromise as Promise<AudioBuffer>).then === 'function') {
        (maybePromise as Promise<AudioBuffer>).then(resolve, reject);
      }
    });
    decodedOrderVoiceBuffer = decoded;
    decodedForCtx = ctx;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Unlocks Web Audio & preloads the new-order voice asset during a user interaction
 * so subsequent realtime Firestore new-order alerts can play without autoplay blocks.
 */
export function primeNewOrderNotificationAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getSharedAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      // Play a 1-sample silent buffer to unlock iOS Safari Web Audio output
      const silent = ctx.createBuffer(1, 1, 22050);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
      void ensureDecodedOrderVoiceBuffer(ctx);
    }
  } catch {
    // Ignore unlock errors
  }

  try {
    const audio = getSharedOrderAudioElement();
    if (audio && !orderAudioElUnlocked) {
      audio.muted = true;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
            audio.muted = false;
            orderAudioElUnlocked = true;
          })
          .catch(() => {
            audio.muted = false;
          });
      } else {
        audio.muted = false;
      }
    }
  } catch {
    // Ignore audio element preload errors
  }
}

function playFallbackAudioElement(): void {
  try {
    const audio = getSharedOrderAudioElement();
    if (!audio) return;
    audio.muted = false;
    audio.volume = 1;
    audio.pause();
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // Fallback fresh Audio instance if shared element is busy
        try {
          const fresh = new Audio(NEW_ORDER_VOICE_URL);
          fresh.volume = 1;
          void fresh.play().catch(() => {});
        } catch {
          // Ignore autoplay restriction before first user gesture
        }
      });
    }
  } catch {
    // Ignore HTMLAudio playback errors
  }
}

export function playNewOrderNotification(
  enabled: boolean,
  _orderNumber?: string,
  _lang: LanguageCode = 'kh'
): void {
  if (!enabled || typeof window === 'undefined') return;
  const now = Date.now();
  if (now - lastOrderNotificationPlayAt < 280) return;
  lastOrderNotificationPlayAt = now;

  void (async () => {
    try {
      const ctx = getSharedAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        if (ctx.state === 'running') {
          const buffer = await ensureDecodedOrderVoiceBuffer(ctx);
          if (buffer) {
            try {
              activeVoiceSource?.stop();
            } catch {
              // Previous source already ended
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            activeVoiceSource = source;
            source.onended = () => {
              if (activeVoiceSource === source) {
                activeVoiceSource = null;
              }
            };
            source.start(0);
            return;
          }
        }
      }
    } catch {
      // Fall through to HTMLAudioElement playback
    }

    playFallbackAudioElement();
  })();
}

export {
  exportOrdersToExcel,
  exportOrdersToCsv,
  exportOrdersToPdf,
  type OrderExportFormat,
} from './ordersExport';

/**
 * Web Bluetooth ESC/POS thermal print helper (with graceful fallback to formatted Korean receipt print dialog)
 */
export async function tryBluetoothPrintKoreanReceipt(
  order: Order,
  paperWidth: '58mm' | '70mm' | '80mm',
  currency: CurrencyCode,
  language: LanguageCode = 'kh'
): Promise<{ sentViaBluetooth: boolean; message: string }> {
  const btMsgs: Record<
    LanguageCode,
    {
      noSupport: string;
      connectFail: string;
      success: string;
      noChar: string;
      fallback: string;
    }
  > = {
    kh: {
      noSupport: `ឧបករណ៍នេះមិនគាំទ្រ Web Bluetooth ផ្ទាល់ទេ — បានបើកផ្ទាំងព្រីនខ្នាត ${paperWidth} ជំនួស។`,
      connectFail: 'មិនអាចភ្ជាប់ម៉ាស៊ីនព្រីន Bluetooth បានទេ។',
      success: `ព្រីនតាម Bluetooth (${paperWidth}) ជោគជ័យ!`,
      noChar: 'រកមិនឃើញច្រកសរសេរទិន្នន័យលើម៉ាស៊ីនព្រីន — បើកផ្ទាំងព្រីនជំនួស។',
      fallback: `បើកផ្ទាំងព្រីនខ្នាត ${paperWidth} រួចរាល់។`,
    },
    en: {
      noSupport: `Web Bluetooth is not supported on this device — opened ${paperWidth} print preview instead.`,
      connectFail: 'Could not connect to the Bluetooth printer.',
      success: `Printed via Bluetooth (${paperWidth}) successfully!`,
      noChar: 'No writable printer characteristic found — opened print preview instead.',
      fallback: `Opened ${paperWidth} print preview.`,
    },
    kr: {
      noSupport: `이 기기는 Web Bluetooth를 지원하지 않아 ${paperWidth} 인쇄 미리보기를 열었습니다.`,
      connectFail: 'Bluetooth 프린터에 연결할 수 없습니다.',
      success: `Bluetooth (${paperWidth}) 인쇄가 완료되었습니다!`,
      noChar: '프린터 쓰기 포트를 찾지 못해 인쇄 미리보기를 열었습니다.',
      fallback: `${paperWidth} 인쇄 미리보기를 열었습니다.`,
    },
  };
  const msgSet = btMsgs[language] || btMsgs.kh;

  const nav = navigator as unknown as {
    bluetooth?: {
      requestDevice: (opts: unknown) => Promise<{
        gatt?: {
          connect: () => Promise<{
            getPrimaryServices: () => Promise<
              Array<{
                getCharacteristics: () => Promise<
                  Array<{
                    properties: { write?: boolean; writeWithoutResponse?: boolean };
                    writeValue: (data: Uint8Array) => Promise<void>;
                  }>
                >;
              }>
            >;
          }>;
        };
      }>;
    };
  };

  if (!nav.bluetooth) {
    return {
      sentViaBluetooth: false,
      message: msgSet.noSupport,
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
      ],
    });
    const server = await device.gatt?.connect();
    if (!server) {
      return { sentViaBluetooth: false, message: msgSet.connectFail };
    }
    const services = await server.getPrimaryServices();
    const lines = [
      `=== DR-POS 영수증 (${paperWidth}) ===`,
      `주문번호: ${order.orderNumber}`,
      `주문일시: ${order.date} ${order.time}`,
      `고객성명: ${order.customerName}`,
      `전화번호: ${order.customerPhone || '-'}`,
      `배송주소: ${order.customerAddress || '-'}`,
      `매장 / 그룹: ${order.storeName || '-'} / ${order.groupName || '-'}`,
      `담당직원: ${order.staffName || '-'}`,
      `--------------------------------`,
      `총 합계금액: ${formatMoney(order.totalAmount, currency)}`,
      `결제상태: ${order.paymentStatus === 'paid' ? '결제완료' : '미결제'}`,
      `--------------------------------`,
      `이용해 주셔서 감사합니다 · DR-POS`,
      `\n\n\n`,
    ].join('\n');

    const encoder = new TextEncoder();
    const bytes = encoder.encode(lines);

    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      const writable = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
      if (writable) {
        const chunkSize = 180;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          await writable.writeValue(bytes.slice(i, i + chunkSize));
        }
        return { sentViaBluetooth: true, message: msgSet.success };
      }
    }
    return { sentViaBluetooth: false, message: msgSet.noChar };
  } catch {
    return { sentViaBluetooth: false, message: msgSet.fallback };
  }
}

/**
 * Word/character-aware line wrapper for HTML5 Canvas (handles Khmer, Korean, spaces, and unbroken strings).
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const safe = String(text || '');
  if (!safe) return ['-'];
  if (ctx.measureText(safe).width <= maxWidth) return [safe];

  const lines: string[] = [];
  const paragraphs = safe.split(/\r?\n/);

  for (const para of paragraphs) {
    if (!para) {
      lines.push('');
      continue;
    }
    let current = '';
    const tokens = para.split(/(\s+)/);
    for (const token of tokens) {
      if (!token) continue;
      const test = current + token;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else if (ctx.measureText(token).width > maxWidth) {
        if (current.trim()) {
          lines.push(current.trimEnd());
          current = '';
        }
        for (const ch of Array.from(token)) {
          if (ctx.measureText(current + ch).width > maxWidth && current) {
            lines.push(current);
            current = ch;
          } else {
            current += ch;
          }
        }
      } else {
        if (current.trim()) {
          lines.push(current.trimEnd());
        }
        current = token.trimStart();
      }
    }
    if (current) {
      lines.push(current);
    }
  }
  return lines.length > 0 ? lines : [safe];
}

/**
 * Renders the exact DR-POS Korean Bluetooth Receipt (영수증) to a crisp high-DPI HTML5 canvas
 * matching the selected thermal width ('58mm' | '70mm' | '80mm') and triggers PNG download.
 */
export async function downloadOrderInvoiceAsPng(
  order: Order,
  currency: CurrencyCode,
  paperWidth: '58mm' | '70mm' | '80mm' = '80mm',
  bluetoothOnly = false
): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed even if font readiness rejects
    }
  }

  const width = paperWidth === '58mm' ? 300 : paperWidth === '70mm' ? 344 : 384;
  const padding = 20;
  const contentWidth = width - padding * 2;
  const fontFamily = '"Noto Sans KR", "Kantumruy Pro", "Figtree", sans-serif';

  const renderReceipt = (
    ctx: CanvasRenderingContext2D,
    draw: boolean,
    canvasHeight = 0
  ): number => {
    if (draw) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, canvasHeight);

      ctx.strokeStyle = '#d4d4d4';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, width - 1, canvasHeight - 1);
    }

    let y = 32;

    const drawDashedDivider = (currY: number) => {
      if (!draw) return;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([4, 3]);
      ctx.moveTo(padding, currY);
      ctx.lineTo(width - padding, currY);
      ctx.strokeStyle = '#a3a3a3';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    };

    // Header (exact match to Bluetooth Korean Receipt preview)
    if (draw) {
      ctx.fillStyle = '#000000';
      ctx.font = `700 18px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText('DR-POS 영수증', width / 2, y);
    }
    y += 18;

    if (draw) {
      ctx.fillStyle = '#525252';
      ctx.font = `400 11px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText('주문 확인서 / 거래명세표', width / 2, y);
    }
    y += 12;

    drawDashedDivider(y);
    y += 18;

    // Order Metadata Rows (exact labels & right-wrapped values)
    const drawInfoRow = (label: string, value: string, valueFontWeight = 400) => {
      ctx.font = `600 11px ${fontFamily}`;
      const labelW = ctx.measureText(label).width;
      const maxValWidth = Math.max(96, contentWidth - labelW - 10);

      ctx.font = `${valueFontWeight} 11px ${fontFamily}`;
      const valLines = wrapCanvasText(ctx, value || '-', maxValWidth);

      if (draw) {
        ctx.fillStyle = '#000000';
        ctx.font = `600 11px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText(label, padding, y);

        ctx.font = `${valueFontWeight} 11px ${fontFamily}`;
        ctx.textAlign = 'right';
        valLines.forEach((line, idx) => {
          ctx.fillText(line, width - padding, y + idx * 16);
        });
      }
      y += valLines.length * 16 + 2;
    };

    drawInfoRow('주문번호:', order.orderNumber, 500);
    drawInfoRow('주문일시:', `${order.date} ${order.time}`);
    drawInfoRow('고객성명:', order.customerName);
    drawInfoRow('전화번호:', order.customerPhone || '-');
    drawInfoRow('배송주소:', order.customerAddress || '-');
    drawInfoRow('매장 / 그룹:', `${order.storeName || '-'} / ${order.groupName || '-'}`);
    drawInfoRow('담당직원:', order.staffName || '-');

    if (!bluetoothOnly) {
      // Items Section Divider & Table Header
      y += 4;
      drawDashedDivider(y);
      y += 17;

      if (draw) {
        ctx.fillStyle = '#000000';
        ctx.font = `700 11px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText('품목명 / 수량', padding, y);
        ctx.textAlign = 'right';
        ctx.fillText('금액', width - padding, y);
      }
      y += 18;

      // Items List (wraps long product names cleanly across lines)
      for (const item of order.items) {
        const priceText = formatMoney(item.unitPrice * item.quantity, currency);
        ctx.font = `500 11px ${fontFamily}`;
        const priceWidth = ctx.measureText(priceText).width;
        const maxTitleWidth = Math.max(88, contentWidth - priceWidth - 10);

        ctx.font = `400 11px ${fontFamily}`;
        const titleLines = wrapCanvasText(
          ctx,
          `${item.productName} × ${item.quantity}`,
          maxTitleWidth
        );

        if (draw) {
          ctx.fillStyle = '#000000';
          ctx.font = `400 11px ${fontFamily}`;
          ctx.textAlign = 'left';
          titleLines.forEach((line, idx) => {
            ctx.fillText(line, padding, y + idx * 16);
          });

          ctx.font = `500 11px ${fontFamily}`;
          ctx.textAlign = 'right';
          ctx.fillText(priceText, width - padding, y);
        }
        y += titleLines.length * 16 + 3;
      }
    }

    y += 3;
    drawDashedDivider(y);
    y += 18;

    // Totals & Payment Status (exact match to Bluetooth Korean Receipt)
    if (!bluetoothOnly && (order.discountAmount || 0) > 0) {
      const subtotal =
        order.subtotalAmount ??
        order.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

      if (draw) {
        ctx.fillStyle = '#525252';
        ctx.font = `400 11px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText('소계금액:', padding, y);
        ctx.textAlign = 'right';
        ctx.fillText(formatMoney(subtotal, currency), width - padding, y);
      }
      y += 18;

      const discountLabel =
        order.discountType === 'percent' && order.discountValue
          ? `할인금액 (${order.discountValue}%):`
          : '할인금액:';
      if (draw) {
        ctx.fillStyle = '#b91c1c';
        ctx.font = `600 11px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText(discountLabel, padding, y);
        ctx.textAlign = 'right';
        ctx.fillText(`-${formatMoney(order.discountAmount || 0, currency)}`, width - padding, y);
      }
      y += 19;
    }

    if (draw) {
      ctx.fillStyle = '#000000';
      ctx.font = `700 14px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.fillText('총 합계금액:', padding, y);
      ctx.textAlign = 'right';
      ctx.fillText(formatMoney(order.totalAmount, currency), width - padding, y);
    }
    y += 20;

    if (draw) {
      ctx.fillStyle = '#000000';
      ctx.font = `600 11px ${fontFamily}`;
      ctx.textAlign = 'left';
      ctx.fillText('결제상태:', padding, y);
      ctx.font = `700 11px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText(order.paymentStatus === 'paid' ? '결제완료' : '미결제', width - padding, y);
    }
    y += 17;

    if (!bluetoothOnly && order.dueDate) {
      if (draw) {
        ctx.fillStyle = '#000000';
        ctx.font = `600 11px ${fontFamily}`;
        ctx.textAlign = 'left';
        ctx.fillText('결제예정일:', padding, y);
        ctx.font = `400 11px ${fontFamily}`;
        ctx.textAlign = 'right';
        ctx.fillText(order.dueDate, width - padding, y);
      }
      y += 17;
    }

    if (!bluetoothOnly && order.note) {
      ctx.font = `400 11px ${fontFamily}`;
      const noteLines = wrapCanvasText(ctx, `비고: ${order.note}`, contentWidth);
      if (draw) {
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'left';
        noteLines.forEach((line, idx) => {
          if (idx === 0 && line.startsWith('비고: ')) {
            ctx.font = `600 11px ${fontFamily}`;
            const prefixW = ctx.measureText('비고: ').width;
            ctx.fillText('비고: ', padding, y);
            ctx.font = `400 11px ${fontFamily}`;
            ctx.fillText(line.slice(4), padding + prefixW, y);
          } else {
            ctx.font = `400 11px ${fontFamily}`;
            ctx.fillText(line, padding, y + idx * 16);
          }
        });
      }
      y += noteLines.length * 16 + 2;
    }

    // Footer
    y += 6;
    drawDashedDivider(y);
    y += 17;

    if (draw) {
      ctx.fillStyle = '#525252';
      ctx.font = `400 10px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText('이용해 주셔서 감사합니다 · DR-POS', width / 2, y);
    }
    y += 20;

    return y;
  };

  // Pass 1: Measure exact height without cutting off any items/notes/addresses
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  if (!measureCtx) return;
  const exactHeight = renderReceipt(measureCtx, false);

  // Pass 2: Render crisp high-DPI receipt image
  const scale = Math.max(3, Math.ceil(window.devicePixelRatio || 2));
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = exactHeight * scale;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);
  renderReceipt(ctx, true, exactHeight);

  // Trigger reliable PNG download via Blob URL (with DataURL fallback)
  const fileName = `DR-POS_Invoice_${order.orderNumber}_${order.date}.png`;
  const triggerDownload = (href: string, revokeAfter = false) => {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = href;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (revokeAfter) {
      window.setTimeout(() => URL.revokeObjectURL(href), 4000);
    }
  };

  await new Promise<void>((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((blob) => {
        if (blob) {
          triggerDownload(URL.createObjectURL(blob), true);
        } else {
          triggerDownload(canvas.toDataURL('image/png'));
        }
        resolve();
      }, 'image/png');
    } else {
      triggerDownload(canvas.toDataURL('image/png'));
      resolve();
    }
  });
}

