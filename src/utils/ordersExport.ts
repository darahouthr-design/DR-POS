import type { CurrencyCode, Order } from '../types';
import { formatMoney, todayLocalISO } from './helpers';

export type OrderExportFormat = 'excel' | 'csv' | 'pdf';

interface ExportOrderRow {
  cells: string[];
  paymentStatus: 'paid' | 'unpaid';
  subtotalUsd: number;
  discountUsd: number;
  totalUsd: number;
}

interface OrdersExportReportData {
  exportDate: string;
  headers: string[];
  rows: ExportOrderRow[];
  productTotals: Array<{ name: string; quantity: number }>;
  grandTotalUnits: number;
  grandSubtotalUsd: number;
  grandDiscountUsd: number;
  grandTotalUsd: number;
  currency: CurrencyCode;
}

const ORDER_EXPORT_HEADERS: string[] = [
  'Order No',
  'កាលបរិច្ឆេទ (Date)',
  'ម៉ោង (Time)',
  'អតិថិជន (Customer)',
  'លេខទូរស័ព្ទ (Phone)',
  'អាសយដ្ឋាន (Address)',
  'ហាង (Store)',
  'ក្រុម (Group)',
  'បុគ្គលិកលក់ (Staff)',
  'ឃ្លាំង (Warehouse)',
  'ទំនិញ (Items)',
  'ស្ថានភាពទូទាត់ (Payment)',
  'ថ្ងៃណាត់ទូទាត់ (Due Date)',
  'តម្លៃមុនបញ្ចុះ (Subtotal)',
  'បញ្ចុះតម្លៃ (Discount)',
  'តម្លៃសរុប (Total)',
  'កំណត់ចំណាំ (Note)',
];

function buildOrdersExportReportData(
  orders: Order[],
  currency: CurrencyCode
): OrdersExportReportData {
  const productTotalsMap = new Map<string, { name: string; quantity: number }>();
  let grandSubtotalUsd = 0;
  let grandDiscountUsd = 0;
  let grandTotalUsd = 0;

  const rows: ExportOrderRow[] = orders.map((o) => {
    for (const it of o.items || []) {
      const displayName = String(it.productName || '').trim() || '-';
      const key = displayName.toLowerCase();
      const qty = Math.max(0, Number(it.quantity) || 0);
      if (qty <= 0) continue;
      const existing = productTotalsMap.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        productTotalsMap.set(key, { name: displayName, quantity: qty });
      }
    }

    const subtotalUsd =
      o.subtotalAmount ?? o.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    const discountUsd = Math.max(0, Number(o.discountAmount) || 0);
    const totalUsd = Number(o.totalAmount) || 0;

    grandSubtotalUsd += subtotalUsd;
    grandDiscountUsd += discountUsd;
    grandTotalUsd += totalUsd;

    return {
      paymentStatus: o.paymentStatus === 'paid' ? 'paid' : 'unpaid',
      subtotalUsd,
      discountUsd,
      totalUsd,
      cells: [
        o.orderNumber || '-',
        o.date || '-',
        o.time || '-',
        o.customerName || '-',
        o.customerPhone || '-',
        o.customerAddress || '-',
        o.storeName || '-',
        o.groupName || '-',
        o.staffName || '-',
        o.warehouse || '-',
        (o.items || []).map((i) => `${i.productName} x${i.quantity}`).join(', ') || '-',
        o.paymentStatus === 'paid' ? 'ទូទាត់រួច' : 'មិនទាន់ទូទាត់',
        o.dueDate || '-',
        formatMoney(subtotalUsd, currency),
        discountUsd > 0 ? `-${formatMoney(discountUsd, currency)}` : '-',
        formatMoney(totalUsd, currency),
        o.note || '',
      ],
    };
  });

  const productTotals = Array.from(productTotalsMap.values()).sort(
    (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name)
  );
  const grandTotalUnits = productTotals.reduce((sum, p) => sum + p.quantity, 0);

  return {
    exportDate: todayLocalISO(),
    headers: ORDER_EXPORT_HEADERS,
    rows,
    productTotals,
    grandTotalUnits,
    grandSubtotalUsd,
    grandDiscountUsd,
    grandTotalUsd,
    currency,
  };
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * 1. EXCEL (.xlsx) EXPORT — Highlighted Standard Table + Per-Product Summary
 */
export async function exportOrdersToExcel(
  orders: Order[],
  currency: CurrencyCode
): Promise<void> {
  const { default: XLSX } = await import('xlsx-js-style');
  const report = buildOrdersExportReportData(orders, currency);

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'B8C7C0' } },
    bottom: { style: 'thin', color: { rgb: 'B8C7C0' } },
    left: { style: 'thin', color: { rgb: 'B8C7C0' } },
    right: { style: 'thin', color: { rgb: 'B8C7C0' } },
  } as const;

  const darkBorder = {
    top: { style: 'thin', color: { rgb: '0F5132' } },
    bottom: { style: 'medium', color: { rgb: '0F5132' } },
    left: { style: 'thin', color: { rgb: '0F5132' } },
    right: { style: 'thin', color: { rgb: '0F5132' } },
  } as const;

  const titleBannerStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '0B3D2E' } },
    font: { sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const metaBannerStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'E8F5EE' } },
    font: { sz: 10.5, bold: true, color: { rgb: '0F5132' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'A7D7BE' } },
    },
  };

  const orderHeaderStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '0F5132' } },
    font: { sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: darkBorder,
  };

  const summaryHeaderStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: '002060' } },
    font: { sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '002060' } },
      bottom: { style: 'medium', color: { rgb: '002060' } },
      left: { style: 'thin', color: { rgb: '002060' } },
      right: { style: 'thin', color: { rgb: '002060' } },
    },
  };

  const summaryTotalLabelStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'DCEEF8' } },
    font: { sz: 11, bold: true, color: { rgb: '002060' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };

  const summaryTotalQtyStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'DCEEF8' } },
    font: { sz: 11, bold: true, color: { rgb: '002060' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
    numFmt: '#,##0',
  };

  const grandTotalBarStyle = {
    fill: { patternType: 'solid', fgColor: { rgb: 'D1FAE5' } },
    font: { sz: 11, bold: true, color: { rgb: '064E3B' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: darkBorder,
  };

  const grandTotalLabelStyle = {
    ...grandTotalBarStyle,
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const colCount = report.headers.length;
  const blankMetaRow = (text: string, style: Record<string, unknown>) =>
    Array.from({ length: colCount }, (_, idx) => ({
      v: idx === 0 ? text : '',
      t: 's',
      s: style,
    }));

  const styledDataRows = report.rows.map((row, rIdx) => {
    const isAlt = rIdx % 2 === 1;
    const baseFill = isAlt
      ? { patternType: 'solid', fgColor: { rgb: 'F4F9F6' } }
      : { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } };

    return row.cells.map((val, cIdx) => {
      // Order No column
      if (cIdx === 0) {
        return {
          v: val,
          t: 's',
          s: {
            fill: baseFill,
            font: { sz: 10.5, bold: true, color: { rgb: '0F172A' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder,
          },
        };
      }
      // Cart Items column (highlighted soft tint + wrapped)
      if (cIdx === 10) {
        return {
          v: val,
          t: 's',
          s: {
            fill: {
              patternType: 'solid',
              fgColor: { rgb: isAlt ? 'EBF8F0' : 'F5FCF8' },
            },
            font: { sz: 10.5, color: { rgb: '0F172A' } },
            alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
            border: thinBorder,
          },
        };
      }
      // Payment Status column (color-coded highlight)
      if (cIdx === 11) {
        const isPaid = row.paymentStatus === 'paid';
        return {
          v: val,
          t: 's',
          s: {
            fill: {
              patternType: 'solid',
              fgColor: { rgb: isPaid ? 'DCFCE7' : 'FEE2E2' },
            },
            font: {
              sz: 10.5,
              bold: true,
              color: { rgb: isPaid ? '166534' : '991B1B' },
            },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder,
          },
        };
      }
      // Subtotal & Discount columns
      if (cIdx === 13 || cIdx === 14) {
        return {
          v: val,
          t: 's',
          s: {
            fill: baseFill,
            font: {
              sz: 10.5,
              color: { rgb: cIdx === 14 && val !== '-' ? 'B45309' : '1E293B' },
            },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: thinBorder,
          },
        };
      }
      // Total column (highlighted emerald tint + bold)
      if (cIdx === 15) {
        return {
          v: val,
          t: 's',
          s: {
            fill: {
              patternType: 'solid',
              fgColor: { rgb: isAlt ? 'DCFCE7' : 'ECFDF5' },
            },
            font: { sz: 10.5, bold: true, color: { rgb: '065F46' } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: thinBorder,
          },
        };
      }
      // Default cell
      return {
        v: val,
        t: 's',
        s: {
          fill: baseFill,
          font: { sz: 10.5, color: { rgb: '1E293B' } },
          alignment: {
            horizontal: cIdx === 1 || cIdx === 2 || cIdx === 12 ? 'center' : 'left',
            vertical: 'center',
            wrapText: cIdx === 5 || cIdx === 16,
          },
          border: thinBorder,
        },
      };
    });
  });

  const grandTotalRow = Array.from({ length: colCount }, (_, cIdx) => {
    if (cIdx === 0) {
      return {
        v: `សរុបរួម (${report.rows.length} Orders)`,
        t: 's',
        s: grandTotalLabelStyle,
      };
    }
    if (cIdx === 13) {
      return {
        v: formatMoney(report.grandSubtotalUsd, currency),
        t: 's',
        s: grandTotalBarStyle,
      };
    }
    if (cIdx === 14) {
      return {
        v:
          report.grandDiscountUsd > 0
            ? `-${formatMoney(report.grandDiscountUsd, currency)}`
            : '-',
        t: 's',
        s: grandTotalBarStyle,
      };
    }
    if (cIdx === 15) {
      return {
        v: formatMoney(report.grandTotalUsd, currency),
        t: 's',
        s: grandTotalBarStyle,
      };
    }
    return { v: '', t: 's', s: grandTotalBarStyle };
  });

  const summaryTableRows = [
    [
      { v: 'ទំនិញលក់បាន', t: 's', s: summaryHeaderStyle },
      { v: 'សរុបចំនួន', t: 's', s: summaryHeaderStyle },
    ],
    ...report.productTotals.map((item, idx) => {
      const fill =
        idx % 2 === 1
          ? { patternType: 'solid', fgColor: { rgb: 'F3F6FB' } }
          : { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } };
      return [
        {
          v: item.name,
          t: 's',
          s: {
            fill,
            font: { sz: 11, color: { rgb: '0F172A' } },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: thinBorder,
          },
        },
        {
          v: item.quantity,
          t: 'n',
          s: {
            fill,
            font: { sz: 11, bold: true, color: { rgb: '0F172A' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: thinBorder,
            numFmt: '#,##0',
          },
        },
      ];
    }),
    [
      { v: 'ទំនិញសរុប', t: 's', s: summaryTotalLabelStyle },
      { v: report.grandTotalUnits, t: 'n', s: summaryTotalQtyStyle },
    ],
  ];

  const metaLine = `កាលបរិច្ឆេទ Export: ${report.exportDate}   |   ចំនួន Orders: ${report.rows.length}   |   ទំនិញលក់សរុប: ${report.grandTotalUnits}   |   សរុបទឹកប្រាក់: ${formatMoney(report.grandTotalUsd, currency)}`;

  const ordersAoa = [
    blankMetaRow('DR-POS — របាយការណ៍ការបញ្ជាទិញ (Orders Report)', titleBannerStyle),
    blankMetaRow(metaLine, metaBannerStyle),
    [],
    report.headers.map((h) => ({ v: h, t: 's', s: orderHeaderStyle })),
    ...styledDataRows,
    grandTotalRow,
    [],
    [],
    ...summaryTableRows,
  ];

  const ordersSheet = XLSX.utils.aoa_to_sheet(ordersAoa);
  ordersSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
  ];

  const longestProductName = report.productTotals.reduce(
    (max, item) => Math.max(max, item.name.length),
    16
  );
  ordersSheet['!cols'] = [
    { wch: Math.max(24, Math.min(44, longestProductName + 6)) }, // Order No / Product Name
    { wch: 16 }, // Date / Total Qty
    { wch: 11 }, // Time
    { wch: 22 }, // Customer
    { wch: 16 }, // Phone
    { wch: 28 }, // Address
    { wch: 20 }, // Store
    { wch: 20 }, // Group
    { wch: 18 }, // Staff
    { wch: 18 }, // Warehouse
    { wch: 40 }, // Items
    { wch: 18 }, // Payment
    { wch: 16 }, // Due Date
    { wch: 18 }, // Subtotal
    { wch: 16 }, // Discount
    { wch: 18 }, // Total
    { wch: 24 }, // Note
  ];

  ordersSheet['!rows'] = [
    { hpt: 30 }, // Banner
    { hpt: 22 }, // Meta
    { hpt: 10 }, // Spacer
    { hpt: 28 }, // Table Header
    ...report.rows.map((row) => {
      const itemsLen = row.cells[10]?.length || 0;
      const lines = Math.max(1, Math.ceil(itemsLen / 38));
      return { hpt: Math.min(84, Math.max(22, lines * 17 + 6)) };
    }),
    { hpt: 26 }, // Grand Total
    { hpt: 10 },
    { hpt: 10 },
    ...summaryTableRows.map((_, idx) => ({
      hpt: idx === 0 || idx === summaryTableRows.length - 1 ? 25 : 21,
    })),
  ];

  // Sheet 2: Standalone Per-Product Total Summary sheet
  const productSummaryAoa = [
    [
      { v: 'DR-POS — សរុបទំនិញលក់តាមផលិតផល', t: 's', s: titleBannerStyle },
      { v: '', t: 's', s: titleBannerStyle },
    ],
    [
      { v: `កាលបរិច្ឆេទ Export: ${report.exportDate}`, t: 's', s: metaBannerStyle },
      { v: '', t: 's', s: metaBannerStyle },
    ],
    [],
    ...summaryTableRows,
  ];
  const productSummarySheet = XLSX.utils.aoa_to_sheet(productSummaryAoa);
  productSummarySheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];
  productSummarySheet['!cols'] = [
    { wch: Math.max(32, Math.min(50, longestProductName + 8)) },
    { wch: 18 },
  ];
  productSummarySheet['!rows'] = [
    { hpt: 28 },
    { hpt: 22 },
    { hpt: 10 },
    ...summaryTableRows.map((_, idx) => ({
      hpt: idx === 0 || idx === summaryTableRows.length - 1 ? 25 : 21,
    })),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ordersSheet, 'DR-POS Orders');
  XLSX.utils.book_append_sheet(workbook, productSummarySheet, 'សរុបតាមផលិតផល');
  XLSX.writeFile(workbook, `DR-POS_Orders_${report.exportDate}.xlsx`);
}

/**
 * 2. CSV (.csv) EXPORT — Exact Same Report Data (Orders Table + Grand Total + Per-Product Summary)
 * Includes UTF-8 BOM so Khmer, Korean, and English render cleanly in Excel / Google Sheets / Numbers.
 */
function escapeCsvCell(value: string | number): string {
  const s = String(value ?? '');
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportOrdersToCsv(
  orders: Order[],
  currency: CurrencyCode
): Promise<void> {
  const report = buildOrdersExportReportData(orders, currency);
  const lines: string[] = [];

  lines.push(
    [
      'DR-POS — របាយការណ៍ការបញ្ជាទិញ (Orders Report)',
      `Export Date: ${report.exportDate}`,
      `Orders: ${report.rows.length}`,
      `Total Units: ${report.grandTotalUnits}`,
      `Grand Total: ${formatMoney(report.grandTotalUsd, currency)}`,
    ]
      .map(escapeCsvCell)
      .join(',')
  );
  lines.push('');

  // Orders table header
  lines.push(report.headers.map(escapeCsvCell).join(','));

  // Orders table rows
  for (const row of report.rows) {
    lines.push(row.cells.map(escapeCsvCell).join(','));
  }

  // Grand Total row aligned to columns
  const grandTotalCells = Array.from({ length: report.headers.length }, () => '');
  grandTotalCells[0] = `សរុបរួម (${report.rows.length} Orders)`;
  grandTotalCells[13] = formatMoney(report.grandSubtotalUsd, currency);
  grandTotalCells[14] =
    report.grandDiscountUsd > 0 ? `-${formatMoney(report.grandDiscountUsd, currency)}` : '-';
  grandTotalCells[15] = formatMoney(report.grandTotalUsd, currency);
  lines.push(grandTotalCells.map(escapeCsvCell).join(','));

  // Blank separator + Per-Product Summary table
  lines.push('');
  lines.push(['ទំនិញលក់បាន', 'សរុបចំនួន'].map(escapeCsvCell).join(','));
  for (const item of report.productTotals) {
    lines.push([item.name, item.quantity].map(escapeCsvCell).join(','));
  }
  lines.push(['ទំនិញសរុប', report.grandTotalUnits].map(escapeCsvCell).join(','));

  const csvContent = `\uFEFF${lines.join('\r\n')}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerBlobDownload(blob, `DR-POS_Orders_${report.exportDate}.csv`);
}

/**
 * 3. PDF (.pdf) EXPORT — High-DPI Landscape A4 Multi-Page Standard Report
 * Renders crisp native Khmer/Korean/English text on Canvas and encodes a valid multi-page PDF 1.4 binary.
 */
function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 4
): string[] {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return ['-'];
  if (ctx.measureText(clean).width <= maxWidth) return [clean];

  const lines: string[] = [];
  let current = '';
  const words = clean.split(' ');

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      if (lines.length >= maxLines) break;
      current = '';
    }

    // Handle long words / Khmer phrases without spaces by character splitting
    if (ctx.measureText(word).width > maxWidth) {
      let chunk = '';
      for (const ch of Array.from(word)) {
        if (ctx.measureText(chunk + ch).width <= maxWidth) {
          chunk += ch;
        } else {
          if (chunk) {
            lines.push(chunk);
            if (lines.length >= maxLines) {
              chunk = '';
              break;
            }
          }
          chunk = ch;
        }
      }
      current = chunk;
    } else {
      current = word;
    }

    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  if (lines.length === 0) return [clean.slice(0, 12)];
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function encodeJpegPagesToPdfBlob(
  pages: Array<{ jpegBytes: Uint8Array; widthPx: number; heightPx: number }>
): Blob {
  // A4 Landscape in PDF points (72pt/inch): 841.89 x 595.28
  const pageW = 841.89;
  const pageH = 595.28;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  let byteOffset = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    byteOffset += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    byteOffset += b.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const offsets: number[] = [0]; // 1-indexed object offsets; index 0 is free object 0
  const startObject = (objNum: number) => {
    offsets[objNum] = byteOffset;
    pushStr(`${objNum} 0 obj\n`);
  };

  const pageObjIds: number[] = [];
  // Object 1: Catalog, Object 2: Pages
  // Each page uses 3 objects: Image XObject, Content Stream, Page Object
  let nextObjId = 3;
  const pageMeta = pages.map((p, idx) => {
    const imgObj = nextObjId++;
    const contentObj = nextObjId++;
    const pageObj = nextObjId++;
    pageObjIds.push(pageObj);
    return { ...p, idx, imgObj, contentObj, pageObj };
  });

  startObject(1);
  pushStr('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  startObject(2);
  pushStr(
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`
  );

  for (const pm of pageMeta) {
    // Image XObject
    startObject(pm.imgObj);
    pushStr(
      `<< /Type /XObject /Subtype /Image /Width ${pm.widthPx} /Height ${pm.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pm.jpegBytes.length} >>\nstream\n`
    );
    pushBytes(pm.jpegBytes);
    pushStr('\nendstream\nendobj\n');

    // Page Content Stream
    const streamStr = `q ${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm /Im${pm.idx} Do Q\n`;
    const streamBytes = encoder.encode(streamStr);
    startObject(pm.contentObj);
    pushStr(`<< /Length ${streamBytes.length} >>\nstream\n`);
    pushBytes(streamBytes);
    pushStr('endstream\nendobj\n');

    // Page Object
    startObject(pm.pageObj);
    pushStr(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}] /Resources << /XObject << /Im${pm.idx} ${pm.imgObj} 0 R >> >> /Contents ${pm.contentObj} 0 R >>\nendobj\n`
    );
  }

  const xrefOffset = byteOffset;
  const totalObjs = nextObjId;
  pushStr(`xref\n0 ${totalObjs}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < totalObjs; i++) {
    pushStr(`${String(offsets[i] || 0).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const merged = new Uint8Array(byteOffset);
  let pos = 0;
  for (const c of chunks) {
    merged.set(c, pos);
    pos += c.length;
  }
  return new Blob([merged], { type: 'application/pdf' });
}

export async function exportOrdersToPdf(
  orders: Order[],
  currency: CurrencyCode
): Promise<void> {
  const report = buildOrdersExportReportData(orders, currency);

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  // A4 Landscape at crisp 2x DPI
  const PAGE_W = 1684;
  const PAGE_H = 1191;
  const MARGIN_X = 36;
  const MARGIN_TOP = 34;
  const MARGIN_BOTTOM = 44;
  const TABLE_W = PAGE_W - MARGIN_X * 2; // 1612px
  const FONT_FAMILY =
    '"Noto Sans Khmer", "Kantumruy Pro", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  // Proportioned 17-column widths summing cleanly to 1612px
  const COL_SPEC: Array<{
    label: string;
    width: number;
    align: 'left' | 'center' | 'right';
  }> = [
    { label: 'Order No', width: 92, align: 'center' },
    { label: 'កាលបរិច្ឆេទ', width: 76, align: 'center' },
    { label: 'ម៉ោង', width: 52, align: 'center' },
    { label: 'អតិថិជន', width: 96, align: 'left' },
    { label: 'ទូរស័ព្ទ', width: 84, align: 'center' },
    { label: 'អាសយដ្ឋាន', width: 118, align: 'left' },
    { label: 'ហាង', width: 76, align: 'left' },
    { label: 'ក្រុម', width: 74, align: 'left' },
    { label: 'បុគ្គលិក', width: 74, align: 'left' },
    { label: 'ឃ្លាំង', width: 74, align: 'left' },
    { label: 'ទំនិញ (Items)', width: 224, align: 'left' },
    { label: 'ទូទាត់', width: 88, align: 'center' },
    { label: 'ថ្ងៃណាត់', width: 74, align: 'center' },
    { label: 'មុនបញ្ចុះ', width: 84, align: 'right' },
    { label: 'បញ្ចុះតម្លៃ', width: 72, align: 'right' },
    { label: 'តម្លៃសរុប', width: 94, align: 'right' },
    { label: 'កំណត់ចំណាំ', width: 160, align: 'left' },
  ];

  const pageCanvases: HTMLCanvasElement[] = [];

  const createPageCanvas = (): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } => {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot initialize PDF canvas renderer');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    pageCanvases.push(canvas);
    return { canvas, ctx };
  };

  let { ctx } = createPageCanvas();
  let cursorY = MARGIN_TOP;

  // Draw Branded Top Banner on Page 1
  const bannerH = 92;
  const grad = ctx.createLinearGradient(MARGIN_X, cursorY, MARGIN_X + TABLE_W, cursorY + bannerH);
  grad.addColorStop(0, '#0B3D2E');
  grad.addColorStop(0.55, '#0F5132');
  grad.addColorStop(1, '#146C43');
  drawRoundedRect(ctx, MARGIN_X, cursorY, TABLE_W, bannerH, 12);
  ctx.fillStyle = grad;
  ctx.fill();

  // Left Title inside Banner
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 26px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('DR-POS · របាយការណ៍ការបញ្ជាទិញ (Orders Report)', MARGIN_X + 24, cursorY + 34);

  ctx.fillStyle = '#CBEAD9';
  ctx.font = `500 14px ${FONT_FAMILY}`;
  ctx.fillText(
    `កាលបរិច្ឆេទ Export: ${report.exportDate}   •   របាយការណ៍ស្តង់ដារ (Standard Report)`,
    MARGIN_X + 24,
    cursorY + 66
  );

  // Right KPI Highlight Cards inside Banner
  const kpis = [
    { label: 'ចំនួន Orders', value: `${report.rows.length}` },
    { label: 'ទំនិញលក់សរុប', value: `${report.grandTotalUnits}` },
    { label: 'សរុបទឹកប្រាក់', value: formatMoney(report.grandTotalUsd, currency) },
  ];
  const kpiW = 182;
  const kpiGap = 12;
  const kpiStartX = MARGIN_X + TABLE_W - 22 - (kpiW * kpis.length + kpiGap * (kpis.length - 1));
  kpis.forEach((kpi, idx) => {
    const kx = kpiStartX + idx * (kpiW + kpiGap);
    const ky = cursorY + 14;
    drawRoundedRect(ctx, kx, ky, kpiW, 64, 9);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#D1FAE5';
    ctx.font = `600 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText(kpi.label, kx + 14, ky + 21);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 18px ${FONT_FAMILY}`;
    ctx.fillText(kpi.value, kx + 14, ky + 46);
  });

  cursorY += bannerH + 16;

  const HEADER_H = 38;
  const drawOrdersTableHeader = (c: CanvasRenderingContext2D, y: number): number => {
    drawRoundedRect(c, MARGIN_X, y, TABLE_W, HEADER_H, 6);
    c.fillStyle = '#0F5132';
    c.fill();

    let x = MARGIN_X;
    c.font = `700 12.5px ${FONT_FAMILY}`;
    c.textBaseline = 'middle';
    COL_SPEC.forEach((col, i) => {
      if (i > 0) {
        c.strokeStyle = 'rgba(255,255,255,0.22)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, y + 4);
        c.lineTo(x, y + HEADER_H - 4);
        c.stroke();
      }
      c.fillStyle = '#FFFFFF';
      c.textAlign = 'center';
      c.fillText(col.label, x + col.width / 2, y + HEADER_H / 2, col.width - 8);
      x += col.width;
    });

    return y + HEADER_H;
  };

  cursorY = drawOrdersTableHeader(ctx, cursorY);

  const CELL_FONT_SIZE = 11.5;
  const LINE_H = 16;
  const CELL_PAD_Y = 7;

  // Render Orders Table Rows with Automatic Pagination
  report.rows.forEach((row, rIdx) => {
    ctx.font = `500 ${CELL_FONT_SIZE}px ${FONT_FAMILY}`;
    const wrappedPerCol = COL_SPEC.map((col, cIdx) => {
      const maxLines = cIdx === 10 ? 5 : cIdx === 5 || cIdx === 16 ? 3 : 2;
      return wrapCanvasText(ctx, row.cells[cIdx], col.width - 12, maxLines);
    });
    const maxLineCount = wrappedPerCol.reduce((m, lines) => Math.max(m, lines.length), 1);
    const rowH = Math.max(30, maxLineCount * LINE_H + CELL_PAD_Y * 2);

    if (cursorY + rowH > PAGE_H - MARGIN_BOTTOM) {
      ({ ctx } = createPageCanvas());
      cursorY = MARGIN_TOP;
      cursorY = drawOrdersTableHeader(ctx, cursorY);
    }

    const isAlt = rIdx % 2 === 1;
    let x = MARGIN_X;

    COL_SPEC.forEach((col, cIdx) => {
      // Cell Background Highlight
      let bg = isAlt ? '#F6FAF8' : '#FFFFFF';
      if (cIdx === 10) {
        bg = isAlt ? '#EBF8F0' : '#F4FCF7'; // Highlighted Cart Items column
      } else if (cIdx === 11) {
        bg = row.paymentStatus === 'paid' ? '#DCFCE7' : '#FEE2E2';
      } else if (cIdx === 15) {
        bg = isAlt ? '#DCFCE7' : '#ECFDF5'; // Highlighted Total column
      }

      ctx.fillStyle = bg;
      ctx.fillRect(x, cursorY, col.width, rowH);

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x, cursorY, col.width, rowH);

      // Cell Text Style
      let textColor = '#0F172A';
      let weight = '500';
      if (cIdx === 0) {
        weight = '700';
      } else if (cIdx === 11) {
        weight = '700';
        textColor = row.paymentStatus === 'paid' ? '#166534' : '#991B1B';
      } else if (cIdx === 14 && row.cells[cIdx] !== '-') {
        textColor = '#B45309';
        weight = '600';
      } else if (cIdx === 15) {
        weight = '700';
        textColor = '#065F46';
      }

      ctx.fillStyle = textColor;
      ctx.font = `${weight} ${CELL_FONT_SIZE}px ${FONT_FAMILY}`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = col.align;

      const lines = wrappedPerCol[cIdx];
      const blockH = lines.length * LINE_H;
      const startTextY = cursorY + (rowH - blockH) / 2 + LINE_H / 2;
      const textX =
        col.align === 'center'
          ? x + col.width / 2
          : col.align === 'right'
          ? x + col.width - 6
          : x + 6;

      lines.forEach((line, lIdx) => {
        ctx.fillText(line, textX, startTextY + lIdx * LINE_H, col.width - 10);
      });

      x += col.width;
    });

    cursorY += rowH;
  });

  // Draw Highlighted Grand Total Footer Row
  const GRAND_ROW_H = 34;
  if (cursorY + GRAND_ROW_H > PAGE_H - MARGIN_BOTTOM) {
    ({ ctx } = createPageCanvas());
    cursorY = MARGIN_TOP;
  }

  ctx.fillStyle = '#D1FAE5';
  ctx.fillRect(MARGIN_X, cursorY, TABLE_W, GRAND_ROW_H);
  ctx.strokeStyle = '#0F5132';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(MARGIN_X, cursorY, TABLE_W, GRAND_ROW_H);

  ctx.fillStyle = '#064E3B';
  ctx.font = `700 13px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(
    `សរុបទឹកប្រាក់ទាំងអស់ (Grand Total · ${report.rows.length} Orders)`,
    MARGIN_X + 12,
    cursorY + GRAND_ROW_H / 2
  );

  // Align Subtotal, Discount, Total totals cleanly under columns 13, 14, 15
  let colX = MARGIN_X;
  COL_SPEC.forEach((col, cIdx) => {
    if (cIdx === 13) {
      ctx.textAlign = 'right';
      ctx.fillText(
        formatMoney(report.grandSubtotalUsd, currency),
        colX + col.width - 6,
        cursorY + GRAND_ROW_H / 2,
        col.width - 8
      );
    } else if (cIdx === 14 && report.grandDiscountUsd > 0) {
      ctx.textAlign = 'right';
      ctx.fillText(
        `-${formatMoney(report.grandDiscountUsd, currency)}`,
        colX + col.width - 6,
        cursorY + GRAND_ROW_H / 2,
        col.width - 8
      );
    } else if (cIdx === 15) {
      ctx.textAlign = 'right';
      ctx.fillText(
        formatMoney(report.grandTotalUsd, currency),
        colX + col.width - 6,
        cursorY + GRAND_ROW_H / 2,
        col.width - 8
      );
    }
    colX += col.width;
  });

  cursorY += GRAND_ROW_H + 24;

  // Draw Highlighted Per-Product Summary Table (Matching Excel Sheet 2 / Bottom Table)
  const SUM_COL1_W = 460;
  const SUM_COL2_W = 160;
  const SUM_TOTAL_W = SUM_COL1_W + SUM_COL2_W;
  const SUM_HEADER_H = 34;
  const SUM_ROW_H = 28;

  const drawSummaryHeader = (c: CanvasRenderingContext2D, y: number): number => {
    drawRoundedRect(c, MARGIN_X, y, SUM_TOTAL_W, SUM_HEADER_H, 6);
    c.fillStyle = '#002060';
    c.fill();

    c.strokeStyle = 'rgba(255,255,255,0.25)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(MARGIN_X + SUM_COL1_W, y + 4);
    c.lineTo(MARGIN_X + SUM_COL1_W, y + SUM_HEADER_H - 4);
    c.stroke();

    c.fillStyle = '#FFFFFF';
    c.font = `700 13px ${FONT_FAMILY}`;
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    c.fillText('ទំនិញលក់បាន', MARGIN_X + SUM_COL1_W / 2, y + SUM_HEADER_H / 2);
    c.fillText('សរុបចំនួន', MARGIN_X + SUM_COL1_W + SUM_COL2_W / 2, y + SUM_HEADER_H / 2);
    return y + SUM_HEADER_H;
  };

  if (cursorY + SUM_HEADER_H + SUM_ROW_H * 2 > PAGE_H - MARGIN_BOTTOM) {
    ({ ctx } = createPageCanvas());
    cursorY = MARGIN_TOP;
  }

  cursorY = drawSummaryHeader(ctx, cursorY);

  report.productTotals.forEach((item, idx) => {
    if (cursorY + SUM_ROW_H > PAGE_H - MARGIN_BOTTOM) {
      ({ ctx } = createPageCanvas());
      cursorY = MARGIN_TOP;
      cursorY = drawSummaryHeader(ctx, cursorY);
    }

    const bg = idx % 2 === 1 ? '#F3F6FB' : '#FFFFFF';
    ctx.fillStyle = bg;
    ctx.fillRect(MARGIN_X, cursorY, SUM_COL1_W, SUM_ROW_H);
    ctx.fillRect(MARGIN_X + SUM_COL1_W, cursorY, SUM_COL2_W, SUM_ROW_H);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(MARGIN_X, cursorY, SUM_COL1_W, SUM_ROW_H);
    ctx.strokeRect(MARGIN_X + SUM_COL1_W, cursorY, SUM_COL2_W, SUM_ROW_H);

    ctx.fillStyle = '#0F172A';
    ctx.font = `500 12.5px ${FONT_FAMILY}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(item.name, MARGIN_X + 12, cursorY + SUM_ROW_H / 2, SUM_COL1_W - 20);

    ctx.font = `700 12.5px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(
      new Intl.NumberFormat('en-US').format(item.quantity),
      MARGIN_X + SUM_COL1_W + SUM_COL2_W / 2,
      cursorY + SUM_ROW_H / 2
    );

    cursorY += SUM_ROW_H;
  });

  // Per-Product Summary Total Row
  if (cursorY + SUM_ROW_H + 4 > PAGE_H - MARGIN_BOTTOM) {
    ({ ctx } = createPageCanvas());
    cursorY = MARGIN_TOP;
  }
  ctx.fillStyle = '#DCEEF8';
  ctx.fillRect(MARGIN_X, cursorY, SUM_COL1_W, SUM_ROW_H + 4);
  ctx.fillRect(MARGIN_X + SUM_COL1_W, cursorY, SUM_COL2_W, SUM_ROW_H + 4);
  ctx.strokeStyle = '#002060';
  ctx.lineWidth = 1.1;
  ctx.strokeRect(MARGIN_X, cursorY, SUM_COL1_W, SUM_ROW_H + 4);
  ctx.strokeRect(MARGIN_X + SUM_COL1_W, cursorY, SUM_COL2_W, SUM_ROW_H + 4);

  ctx.fillStyle = '#002060';
  ctx.font = `700 13px ${FONT_FAMILY}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText('ទំនិញសរុប', MARGIN_X + 12, cursorY + (SUM_ROW_H + 4) / 2);
  ctx.textAlign = 'center';
  ctx.fillText(
    new Intl.NumberFormat('en-US').format(report.grandTotalUnits),
    MARGIN_X + SUM_COL1_W + SUM_COL2_W / 2,
    cursorY + (SUM_ROW_H + 4) / 2
  );

  // Stamp clean page numbers & footer on every page
  const totalPages = pageCanvases.length;
  const encodedPages = pageCanvases.map((canvas, idx) => {
    const pCtx = canvas.getContext('2d');
    if (pCtx) {
      const footerY = PAGE_H - 18;
      pCtx.strokeStyle = '#E2E8F0';
      pCtx.lineWidth = 1;
      pCtx.beginPath();
      pCtx.moveTo(MARGIN_X, footerY - 14);
      pCtx.lineTo(MARGIN_X + TABLE_W, footerY - 14);
      pCtx.stroke();

      pCtx.fillStyle = '#64748B';
      pCtx.font = `500 11.5px ${FONT_FAMILY}`;
      pCtx.textBaseline = 'middle';
      pCtx.textAlign = 'left';
      pCtx.fillText(
        `DR-POS Web Application  •  Orders Report (${report.exportDate})`,
        MARGIN_X,
        footerY
      );
      pCtx.textAlign = 'right';
      pCtx.fillText(`Page ${idx + 1} / ${totalPages}`, MARGIN_X + TABLE_W, footerY);
    }

    const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return {
      jpegBytes: dataUrlToUint8Array(jpegDataUrl),
      widthPx: PAGE_W,
      heightPx: PAGE_H,
    };
  });

  const pdfBlob = encodeJpegPagesToPdfBlob(encodedPages);
  triggerBlobDownload(pdfBlob, `DR-POS_Orders_${report.exportDate}.pdf`);
}
