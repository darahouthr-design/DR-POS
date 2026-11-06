import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext.tsx';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

export const ImageZoomModal: React.FC = () => {
  const { activeZoomImage, setActiveZoomImage } = usePOS();
  const [scale, setScale] = useState(1);

  if (!activeZoomImage) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.3, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const handleReset = () => setScale(1);

  return (
    <div
      onClick={() => setActiveZoomImage(null)}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
      >
        {/* Floating Zoom Controls Bar */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 backdrop-blur border border-white/20 text-white shadow-xl">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-2 rounded-xl hover:bg-white/20 transition-colors"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-2 rounded-xl hover:bg-white/20 transition-colors"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={handleReset}
            title="Reset"
            className="p-2 rounded-xl hover:bg-white/20 transition-colors"
          >
            <RotateCcw size={18} />
          </button>
          <div className="w-[1px] h-5 bg-white/20 mx-1" />
          <button
            onClick={() => setActiveZoomImage(null)}
            title="Close"
            className="p-2 rounded-xl hover:bg-rose-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scaled Image */}
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-black/40 flex items-center justify-center p-2">
          <img
            src={activeZoomImage}
            alt="Product Zoom"
            style={{ transform: `scale(${scale})` }}
            className="max-h-[80vh] max-w-full object-contain rounded-2xl transition-transform duration-200 cursor-grab select-none"
          />
        </div>

        <p className="mt-3 text-xs text-slate-400 font-medium bg-slate-900/60 px-3 py-1 rounded-full border border-white/10">
          ពង្រីក/បង្រួម៖ {Math.round(scale * 100)}% · ចុចកន្លែងទំនេរដើម្បីបិទ
        </p>
      </div>
    </div>
  );
};
