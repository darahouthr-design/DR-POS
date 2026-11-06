import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Barcode as BarcodeIcon, Check } from 'lucide-react';
import { playSound } from '../../utils/sound.ts';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    let activeStream: MediaStream | null = null;

    const startCamera = async () => {
      setCameraError(null);
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('ឧបករណ៍របស់អ្នកមិនគាំទ្រ Camera តាម Browser ទេ');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }

        setIsScanning(true);

        // Try BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
          });

          const interval = setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const detected = barcodes[0].rawValue;
                  if (detected) {
                    clearInterval(interval);
                    playSound.beep();
                    onScan(detected);
                    onClose();
                  }
                }
              } catch {
                // detection frame error
              }
            }
          }, 400);

          return () => clearInterval(interval);
        }
      } catch (err: any) {
        console.warn('Camera error:', err);
        setCameraError(err.message || 'មិនអាចបើកកាមេរ៉ាបានទេ');
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, onScan, onClose]);

  if (!isOpen) return null;

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    playSound.beep();
    onScan(manualCode.trim());
    onClose();
  };

  const handleSampleBarcode = (code: string) => {
    playSound.beep();
    onScan(code);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                ម៉ាស៊ីនស្កេនបាកូដ (Barcode Scanner)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ដាក់លេខកូដទំនិញអោយចំប្រអប់ដើម្បីស្កេនស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Camera Viewport */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Scanner Guide Overlay & Laser Line */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-36 border-2 border-indigo-400 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.5)] flex items-center justify-center">
              {/* Corner target marks */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />

              {/* Animated laser */}
              <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#ef4444] animate-pulse" />
            </div>
          </div>

          {cameraError && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white">
              <Camera size={40} className="text-slate-400 mb-2 opacity-60" />
              <p className="text-xs font-semibold text-rose-400 mb-1">
                មិនអាចដំណើរការកាមេរ៉ា៖ {cameraError}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                អ្នកអាចបញ្ចូលលេខបាកូដដោយផ្ទាល់តាមប្រអប់ខាងក្រោម
              </p>
            </div>
          )}
        </div>

        {/* Manual Barcode Input & Quick Test Barcodes */}
        <div className="p-5 space-y-4">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <BarcodeIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="ឬវាយបញ្ចូលលេខបាកូដដោយផ្ទាល់..."
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs btn-3d shadow-md shadow-indigo-500/20"
            >
              ស្កេន
            </button>
          </form>

          {/* Preset Barcodes */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
              តេស្តស្កេនរហ័ស (Quick Sample Barcodes):
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {['88501234001', '88501234002', '88501234003', '88501234004', '88501234005'].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleSampleBarcode(code)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 font-mono text-[11px] flex items-center gap-1 transition-colors"
                >
                  <BarcodeIcon size={12} className="text-indigo-500" />
                  <span>{code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
