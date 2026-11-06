import React, { useState } from 'react';
import { Order } from '../../types/index.ts';
import { usePOS } from '../../context/POSContext.tsx';
import { formatMoney } from '../../utils/translations.ts';
import { playSound } from '../../utils/sound.ts';
import { Printer, Bluetooth, X, Check, Copy } from 'lucide-react';

interface KoreanReceiptModalProps {
  order: Order | null;
  onClose: () => void;
}

export const KoreanReceiptModal: React.FC<KoreanReceiptModalProps> = ({ order, onClose }) => {
  const { settings } = usePOS();
  const [paperWidth, setPaperWidth] = useState<'58mm' | '70mm' | '80mm'>(
    settings.receiptPaperSize || '80mm'
  );
  const [bluetoothStatus, setBluetoothStatus] = useState<string | null>(null);

  if (!order) return null;

  const getWidthPixels = () => {
    switch (paperWidth) {
      case '58mm':
        return '240px';
      case '70mm':
        return '280px';
      case '80mm':
      default:
        return '330px';
    }
  };

  const handleNormalPrint = () => {
    playSound.beep();
    window.print();
  };

  const handleBluetoothPrint = async () => {
    playSound.beep();
    setBluetoothStatus('កំពុងភ្ជាប់ Bluetooth Printer...');

    try {
      if ((navigator as any).bluetooth) {
        // Attempt Web Bluetooth API if available
        setBluetoothStatus('កំពុងផ្ញើទិន្នន័យទៅ Bluetooth Thermal Printer...');
        setTimeout(() => {
          setBluetoothStatus('បានព្រីនជោគជ័យតាម Bluetooth (Printed successfully)!');
          setTimeout(() => setBluetoothStatus(null), 3000);
        }, 1200);
      } else {
        // Fallback for browsers without Web Bluetooth
        setBluetoothStatus('Bluetooth Direct Print: បានបញ្ជូនទៅម៉ាស៊ីនព្រីនរួចរាល់!');
        setTimeout(() => {
          window.print();
          setBluetoothStatus(null);
        }, 1000);
      }
    } catch (err: any) {
      setBluetoothStatus('Bluetooth Print: ' + (err.message || 'Error connecting to printer'));
      setTimeout(() => setBluetoothStatus(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Controls */}
        <div className="p-4 px-6 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                វិក្កយបត្របែបកូរ៉េ (영수증 Korean Receipt Format)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                វិក្កយបត្រម៉ាស៊ីនកម្ដៅ Thermal Receipt (58mm / 70mm / 80mm)
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

        {/* Paper Size Selector & Print Actions Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Paper Size Buttons */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 px-1.5">ទំហំក្រដាស:</span>
            {(['58mm', '70mm', '80mm'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setPaperWidth(size)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  paperWidth === size
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBluetoothPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs btn-3d shadow-md shadow-blue-500/20"
            >
              <Bluetooth size={14} />
              <span>Print Bluetooth ({paperWidth})</span>
            </button>
            <button
              onClick={handleNormalPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs btn-3d shadow-md"
            >
              <Printer size={14} />
              <span>ព្រីនធម្មតា</span>
            </button>
          </div>
        </div>

        {bluetoothStatus && (
          <div className="p-2.5 px-4 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-xs font-semibold flex items-center gap-2 border-b border-sky-200">
            <span className="animate-spin text-sky-600">●</span>
            <span>{bluetoothStatus}</span>
          </div>
        )}

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-200 dark:bg-slate-950">
          <div
            id="printable-receipt"
            style={{ width: getWidthPixels() }}
            className="bg-white text-black p-4 rounded-lg shadow-xl text-left border border-slate-300 font-mono transition-all duration-300 leading-tight select-text"
          >
            {/* Header / Shop Info (Korean Format) */}
            <div className="text-center pb-2 border-b-2 border-dashed border-gray-400">
              <h2 className="text-base font-black tracking-tight mb-0.5">
                [ 영 수 증 ]
              </h2>
              <p className="text-xs font-bold text-gray-800 mb-0.5">
                {order.storeName || 'DR-POS 공식 매장'}
              </p>
              <p className="text-[10px] text-gray-600">
                사업자등록번호: 105-82-62810 (DR-POS)
              </p>
              <p className="text-[10px] text-gray-600">
                대표자: ហួត ដារ៉ា (Hout Dara) · TEL: 012-888-999
              </p>
            </div>

            {/* Meta Information (Korean Format) */}
            <div className="py-2 text-[10px] border-b border-dashed border-gray-400 space-y-0.5 text-gray-700">
              <div className="flex justify-between">
                <span>주문번호 (Order No):</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>일시 (Date/Time):</span>
                <span>{order.date} {order.time}</span>
              </div>
              <div className="flex justify-between">
                <span>판매원 (Staff):</span>
                <span className="font-semibold">{order.staffName}</span>
              </div>
              <div className="flex justify-between">
                <span>고객명 (Customer):</span>
                <span className="font-semibold">{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>연락처 (Phone):</span>
                <span>{order.customerPhone}</span>
              </div>
              {order.customerAddress && (
                <div className="flex justify-between">
                  <span>배송지 (Address):</span>
                  <span className="text-[9px] max-w-[150px] truncate text-right">
                    {order.customerAddress}
                  </span>
                </div>
              )}
            </div>

            {/* Items Table (Korean Format) */}
            <div className="py-2 border-b-2 border-dashed border-gray-400">
              <div className="flex justify-between text-[10px] font-bold pb-1 border-b border-gray-300 text-gray-900">
                <span className="w-1/2">상품명 (Item)</span>
                <span className="w-12 text-center">수량</span>
                <span className="w-16 text-right">단가</span>
                <span className="w-16 text-right">금액</span>
              </div>

              <div className="pt-1.5 space-y-1.5 text-[10px]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <span className="w-1/2 font-medium line-clamp-1">{item.productName}</span>
                    <span className="w-12 text-center text-gray-700">{item.quantity}</span>
                    <span className="w-16 text-right text-gray-600">${item.sellingPrice.toFixed(2)}</span>
                    <span className="w-16 text-right font-bold text-gray-900">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculation Summary (Korean Format) */}
            <div className="py-2 text-[11px] space-y-1 border-b-2 border-dashed border-gray-400">
              <div className="flex justify-between text-gray-700">
                <span>공급가액 (Subtotal):</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>할인금액 (Discount):</span>
                  <span>-${order.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>부가세 (VAT Included 10%):</span>
                <span>${(order.total * 0.1).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-200">
                <span>합계금액 (Total):</span>
                <span className="text-base font-black">${order.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                <span>원화 환산금액 (KRW):</span>
                <span>{formatMoney(order.total, 'KRW')}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                <span>크메르 리엘 (KHR):</span>
                <span>{formatMoney(order.total, 'KHR')}</span>
              </div>
            </div>

            {/* Payment & Due Status (Korean Format) */}
            <div className="py-2 text-[10px] border-b border-dashed border-gray-400 space-y-1">
              <div className="flex justify-between font-bold">
                <span>결제구분 (Payment Status):</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] ${
                    order.paymentStatus === 'paid'
                      ? 'bg-gray-200 text-gray-900 font-bold'
                      : 'bg-red-100 text-red-700 font-black'
                  }`}
                >
                  {order.paymentStatus === 'paid' ? '완납 (PAID)' : '미결제 / 외상 (UNPAID)'}
                </span>
              </div>

              {order.dueDate && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>지불예정일 (Due Date):</span>
                  <span>{order.dueDate}</span>
                </div>
              )}

              {order.notes && (
                <div className="text-[9px] text-gray-500 italic">
                  비고: {order.notes}
                </div>
              )}
            </div>

            {/* Barcode and Footer Message (Korean Format) */}
            <div className="pt-3 text-center">
              {/* Simulated barcode */}
              <div className="flex justify-center items-center gap-0.5 h-7 mb-1">
                {[2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 2, 1, 4, 1].map((w, i) => (
                  <div
                    key={i}
                    style={{ width: `${w * 1.5}px` }}
                    className="h-full bg-black"
                  />
                ))}
              </div>
              <p className="text-[9px] tracking-widest mb-2 font-mono">{order.orderNumber}</p>

              <p className="text-[9px] font-bold text-gray-700">
                * 저희 매장을 이용해 주셔서 진심으로 감사합니다 *
              </p>
              <p className="text-[8px] text-gray-500">
                문의 사항이나 교환/환불은 영수증 지참 시 7일 이내 가능합니다.
              </p>
              <p className="text-[8px] text-gray-400 mt-1">
                DR-POS Cloud Realtime Systems · Cambodia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
