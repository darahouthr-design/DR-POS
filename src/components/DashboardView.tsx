import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
} from 'lucide-react';
import { Icon3D } from './Icon3D';
import { ActivityLogPanel } from './ActivityLogPanel';
import { Button, Surface } from './ui';
import {
  cleanSaleNameDisplay,
  formatCompactCount,
  formatCompactMoney,
  formatMoney,
  normalizeSaleKey,
  todayLocalISO,
} from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type {
  CurrencyCode,
  LanguageCode,
  Order,
  PageId,
  Product,
  SaleActivityLog,
  SalePresence,
  SaleProfile,
} from '../types';

interface DashboardViewProps {
  orders: Order[];
  products: Product[];
  currency: CurrencyCode;
  saleName?: string;
  isMasterAdmin?: boolean;
  salePresenceList?: SalePresence[];
  saleProfiles?: SaleProfile[];
  saleActivityLogs?: SaleActivityLog[];
  loadingActivityLogs?: boolean;
  onClearExpiredActivityLogs?: () => Promise<number>;
  autoClearedActivityCount?: number | null;
  onNavigate: (page: PageId) => void;
}

const PRESENCE_STALE_MS = 180_000;

function getPresenceRefMs(p: SalePresence): number {
  if (p.observedAtMs && p.observedAtMs > 0) {
    return p.observedAtMs;
  }
  const parsedLast = Date.parse(p.lastSeenAt || '');
  return Math.max(p.serverUpdatedMs || 0, Number.isFinite(parsedLast) ? parsedLast : 0);
}

function isPresenceSessionOnline(p: SalePresence, nowMs: number): boolean {
  if (!p.online) return false;
  if (p.observedAtMs && p.observedAtMs > 0) {
    return nowMs - p.observedAtMs <= PRESENCE_STALE_MS;
  }
  const refMs = getPresenceRefMs(p);
  if (!refMs) return true;
  return nowMs - refMs <= PRESENCE_STALE_MS;
}

function formatClockTime(iso: string): string {
  const ms = Date.parse(iso || '');
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const MONTH_NAMES: Record<LanguageCode, readonly string[]> = {
  kh: [
    'មករា',
    'កុម្ភៈ',
    'មីនា',
    'មេសា',
    'ឧសភា',
    'មិថុនា',
    'កក្កដា',
    'សីហា',
    'កញ្ញា',
    'តុលា',
    'វិច្ឆិកា',
    'ធ្នូ',
  ],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  kr: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
};

const STAFF_LINE_PALETTE = [
  '#0f8a5f', // Emerald (primary)
  '#0284c7', // Sky
  '#d97706', // Amber
  '#7c3aed', // Violet
  '#e11d48', // Rose
  '#475569', // Slate
] as const;

interface PlotPoint {
  x: number;
  y: number;
}

function buildSmoothLinePath(points: PlotPoint[], baselineY: number, topY: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;

    // Prevent spline overshoot beyond flat segments or chart bounds
    const rawCp1y = p1.y + (p2.y - p0.y) / 6;
    const rawCp2y = p2.y - (p3.y - p1.y) / 6;
    const segMinY = Math.max(topY, Math.min(p1.y, p2.y));
    const segMaxY = Math.min(baselineY, Math.max(p1.y, p2.y));
    const cp1y = Math.min(segMaxY, Math.max(segMinY, rawCp1y));
    const cp2y = Math.min(segMaxY, Math.max(segMinY, rawCp2y));

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function buildSmoothAreaPath(points: PlotPoint[], baselineY: number, topY: number): string {
  if (points.length === 0) return '';
  const line = buildSmoothLinePath(points, baselineY, topY);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(2)} ${baselineY.toFixed(2)} L ${first.x.toFixed(2)} ${baselineY.toFixed(2)} Z`;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  orders,
  products,
  currency,
  saleName,
  isMasterAdmin = false,
  salePresenceList,
  saleProfiles,
  saleActivityLogs,
  loadingActivityLogs = false,
  onClearExpiredActivityLogs,
  autoClearedActivityCount = null,
  onNavigate,
}) => {
  const { t, lang } = useI18n();
  const prefersReducedMotion = useReducedMotion();
  const today = todayLocalISO();
  const currentYear = today.slice(0, 4);
  const currentMonthNum = today.slice(5, 7);

  const [chartRange, setChartRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);
  const [selectedMonthNum, setSelectedMonthNum] = useState<string>(currentMonthNum);
  const [lineMetric, setLineMetric] = useState<'units' | 'orders' | 'revenue'>('units');
  const [focusedStaffKey, setFocusedStaffKey] = useState<string | null>(null);
  const [hoveredBarIso, setHoveredBarIso] = useState<string | null>(null);
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);
  const [recentStatusFilter, setRecentStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online'>('all');
  const [presenceNowMs, setPresenceNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!isMasterAdmin) return;
    setPresenceNowMs(Date.now());
    const timer = window.setInterval(() => setPresenceNowMs(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, [isMasterAdmin]);

  const monthNames = MONTH_NAMES[lang] || MONTH_NAMES.kh;

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>([currentYear]);
    for (const o of orders) {
      const yr = String(o.date || '').slice(0, 4);
      if (/^\d{4}$/.test(yr)) {
        yearSet.add(yr);
      }
    }
    return Array.from(yearSet).sort((a, b) => b.localeCompare(a));
  }, [orders, currentYear]);

  const effectiveYear = availableYears.includes(selectedYear) ? selectedYear : currentYear;
  const selectedYearMonth = `${effectiveYear}-${selectedMonthNum}`;

  // Today metrics
  const todayOrders = useMemo(() => orders.filter((o) => o.date === today), [orders, today]);
  const todayRevenue = useMemo(
    () => todayOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    [todayOrders]
  );
  const todayProfit = useMemo(
    () => todayOrders.reduce((sum, o) => sum + (o.totalAmount - o.totalCost), 0),
    [todayOrders]
  );
  const todayItemsSold = useMemo(
    () =>
      todayOrders.reduce(
        (sum, o) => sum + o.items.reduce((itemSum, it) => itemSum + (it.quantity || 0), 0),
        0
      ),
    [todayOrders]
  );

  // Monthly & Yearly metrics
  const monthlyStats = useMemo(() => {
    const list = orders.filter((o) => String(o.date || '').startsWith(selectedYearMonth));
    const revenue = list.reduce((s, o) => s + o.totalAmount, 0);
    const profit = list.reduce((s, o) => s + (o.totalAmount - o.totalCost), 0);
    const itemsSold = list.reduce(
      (s, o) => s + o.items.reduce((is, it) => is + (it.quantity || 0), 0),
      0
    );
    const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
    return { count: list.length, revenue, profit, itemsSold, marginPct };
  }, [orders, selectedYearMonth]);

  const yearlyStats = useMemo(() => {
    const prefix = `${effectiveYear}-`;
    const list = orders.filter((o) => String(o.date || '').startsWith(prefix));
    const revenue = list.reduce((s, o) => s + o.totalAmount, 0);
    const profit = list.reduce((s, o) => s + (o.totalAmount - o.totalCost), 0);
    const itemsSold = list.reduce(
      (s, o) => s + o.items.reduce((is, it) => is + (it.quantity || 0), 0),
      0
    );
    const marginPct = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;
    return { count: list.length, revenue, profit, itemsSold, marginPct };
  }, [orders, effectiveYear]);

  // Low stock & due payments
  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock),
    [products]
  );

  const duePaymentOrders = useMemo(
    () =>
      orders
        .filter((o) => o.paymentStatus === 'unpaid' || Boolean(o.dueDate))
        .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
    [orders]
  );

  const duePaymentTotal = useMemo(
    () => duePaymentOrders.reduce((s, o) => s + o.totalAmount, 0),
    [duePaymentOrders]
  );

  // Daily Bar Chart Data
  const ordersByDate = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const o of orders) {
      const cur = map.get(o.date);
      if (cur) {
        cur.total += o.totalAmount;
        cur.count += 1;
      } else {
        map.set(o.date, { total: o.totalAmount, count: 1 });
      }
    }
    return map;
  }, [orders]);

  const chartPoints = useMemo(() => {
    const count = chartRange === '7d' ? 7 : chartRange === '14d' ? 14 : 30;
    const days: Array<{ label: string; iso: string; total: number; count: number }> = [];
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${y}-${m}-${day}`;
      const agg = ordersByDate.get(iso);
      days.push({
        label: `${m}/${day}`,
        iso,
        total: Math.round((agg?.total || 0) * 100) / 100,
        count: agg?.count || 0,
      });
    }
    return days;
  }, [ordersByDate, chartRange]);

  const maxChartVal = useMemo(() => {
    const m = Math.max(...chartPoints.map((d) => d.total), 10);
    return Math.ceil(m * 1.15);
  }, [chartPoints]);

  const periodTotal = useMemo(
    () => chartPoints.reduce((s, p) => s + p.total, 0),
    [chartPoints]
  );

  const periodOrdersCount = useMemo(
    () => chartPoints.reduce((s, p) => s + p.count, 0),
    [chartPoints]
  );

  const periodDailyAvg = useMemo(
    () => (chartPoints.length > 0 ? periodTotal / chartPoints.length : 0),
    [chartPoints, periodTotal]
  );

  const peakDayPoint = useMemo(() => {
    let best: (typeof chartPoints)[number] | null = null;
    for (const pt of chartPoints) {
      if (!best || pt.total > best.total) {
        best = pt;
      }
    }
    return best;
  }, [chartPoints]);

  const activeBarPoint = useMemo(() => {
    if (hoveredBarIso) {
      const matched = chartPoints.find((p) => p.iso === hoveredBarIso);
      if (matched) return matched;
    }
    return chartPoints.find((p) => p.iso === today) || chartPoints[chartPoints.length - 1] || null;
  }, [chartPoints, hoveredBarIso, today]);

  // Monthly Staff Comparison Line Graphic Data (12 months of selectedYear)
  const staffMonthlySeries = useMemo(() => {
    const prefix = `${effectiveYear}-`;
    const map = new Map<
      string,
      {
        key: string;
        name: string;
        months: Array<{ units: number; orders: number; revenue: number }>;
        totalUnits: number;
        totalOrders: number;
        totalRevenue: number;
      }
    >();

    for (const o of orders) {
      const dateStr = String(o.date || '');
      if (!dateStr.startsWith(prefix)) continue;
      const monthIdx = Number(dateStr.slice(5, 7)) - 1;
      if (!Number.isInteger(monthIdx) || monthIdx < 0 || monthIdx > 11) continue;

      const rawName = cleanSaleNameDisplay(o.staffName || '');
      const displayName = rawName || '-';
      const staffKey = normalizeSaleKey(displayName) || 'unknown';
      const orderUnits = o.items.reduce((sum, it) => sum + (it.quantity || 0), 0);

      let entry = map.get(staffKey);
      if (!entry) {
        entry = {
          key: staffKey,
          name: displayName,
          months: Array.from({ length: 12 }, () => ({ units: 0, orders: 0, revenue: 0 })),
          totalUnits: 0,
          totalOrders: 0,
          totalRevenue: 0,
        };
        map.set(staffKey, entry);
      }
      entry.months[monthIdx].units += orderUnits;
      entry.months[monthIdx].orders += 1;
      entry.months[monthIdx].revenue += o.totalAmount;
      entry.totalUnits += orderUnits;
      entry.totalOrders += 1;
      entry.totalRevenue += o.totalAmount;
    }

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (lineMetric === 'revenue') return b.totalRevenue - a.totalRevenue;
      if (lineMetric === 'orders') return b.totalOrders - a.totalOrders;
      return b.totalUnits - a.totalUnits;
    });

    return sorted.slice(0, 6).map((s, idx) => ({
      ...s,
      color: STAFF_LINE_PALETTE[idx % STAFF_LINE_PALETTE.length],
    }));
  }, [orders, effectiveYear, lineMetric]);

  const activeLineStaffSeries = useMemo(() => {
    if (!focusedStaffKey) return staffMonthlySeries;
    const exists = staffMonthlySeries.some((s) => s.key === focusedStaffKey);
    return exists ? staffMonthlySeries : staffMonthlySeries;
  }, [staffMonthlySeries, focusedStaffKey]);

  const maxStaffLineVal = useMemo(() => {
    let peak = 0;
    for (const s of activeLineStaffSeries) {
      for (const m of s.months) {
        const val = m[lineMetric];
        if (val > peak) peak = val;
      }
    }
    if (peak <= 0) return lineMetric === 'revenue' ? 10 : 5;
    if (lineMetric === 'revenue') return Math.ceil(peak * 1.18);
    if (peak <= 4) return 5;
    return Math.ceil(peak * 1.2);
  }, [activeLineStaffSeries, lineMetric]);

  const defaultActiveMonthIdx = useMemo(() => {
    const selectedIdx = Math.max(0, Math.min(11, Number(selectedMonthNum) - 1));
    const hasSelectedData = activeLineStaffSeries.some(
      (s) => s.months[selectedIdx]?.[lineMetric] > 0
    );
    if (hasSelectedData || activeLineStaffSeries.length === 0) return selectedIdx;
    for (let i = 11; i >= 0; i--) {
      if (activeLineStaffSeries.some((s) => s.months[i]?.[lineMetric] > 0)) {
        return i;
      }
    }
    return selectedIdx;
  }, [selectedMonthNum, activeLineStaffSeries, lineMetric]);

  const activeMonthIdx = hoveredMonthIdx ?? defaultActiveMonthIdx;

  // Recent Orders filtered & sorted newest-first
  const recentOrdersFiltered = useMemo(() => {
    const list =
      recentStatusFilter === 'all'
        ? orders
        : orders.filter((o) => o.paymentStatus === recentStatusFilter);
    return [...list]
      .sort((a, b) => {
        const aKey = `${a.date || ''}T${a.time || '00:00'}|${a.createdAt || ''}`;
        const bKey = `${b.date || ''}T${b.time || '00:00'}|${b.createdAt || ''}`;
        return bKey.localeCompare(aKey);
      })
      .slice(0, 10);
  }, [orders, recentStatusFilter]);

  const linePlotLeft = 64;
  const linePlotRight = 736;
  const linePlotTop = 24;
  const linePlotBottom = 202;
  const linePlotW = linePlotRight - linePlotLeft;
  const linePlotH = linePlotBottom - linePlotTop;
  const monthStepX = linePlotW / 11;

  const formatMetricValue = (val: number) =>
    lineMetric === 'revenue' ? formatCompactMoney(val, currency) : formatCompactCount(val);

  const selectedMonthDisplayName =
    monthNames[Math.max(0, Math.min(11, Number(selectedMonthNum) - 1))] || selectedMonthNum;

  // Aggregated Live Sale Access Rows (Strictly computed for Master Admin ONLY)
  const saleAccessSummary = useMemo(() => {
    if (!isMasterAdmin) {
      return { rows: [] as Array<{
        key: string;
        saleName: string;
        ownerAdminEmail: string;
        isOnline: boolean;
        onlineSessions: number;
        activePage: string;
        deviceType: string;
        loggedInAt: string;
        lastSeenMs: number;
        lastSeenIso: string;
      }>, onlineCount: 0, totalCount: 0 };
    }

    interface AggRow {
      key: string;
      saleName: string;
      ownerAdminEmail: string;
      onlineSessions: number;
      latestOnlineMs: number;
      latestAnyMs: number;
      activePage: string;
      deviceType: string;
      loggedInAt: string;
      lastSeenIso: string;
    }

    const map = new Map<string, AggRow>();

    for (const sp of saleProfiles || []) {
      if (sp.active === false) continue;
      const cleanName = cleanSaleNameDisplay(sp.name || '');
      const key = normalizeSaleKey(cleanName);
      if (!key) continue;
      if (!map.has(key)) {
        map.set(key, {
          key,
          saleName: cleanName,
          ownerAdminEmail: (sp.ownerAdminEmail || '').trim().toLowerCase(),
          onlineSessions: 0,
          latestOnlineMs: 0,
          latestAnyMs: 0,
          activePage: '',
          deviceType: '',
          loggedInAt: '',
          lastSeenIso: '',
        });
      }
    }

    for (const p of salePresenceList || []) {
      const cleanName = cleanSaleNameDisplay(p.saleName || '');
      const key = normalizeSaleKey(p.saleKey || cleanName);
      if (!key) continue;
      const online = isPresenceSessionOnline(p, presenceNowMs);
      const refMs = getPresenceRefMs(p);
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          saleName: cleanName || key,
          ownerAdminEmail: (p.ownerAdminEmail || '').trim().toLowerCase(),
          onlineSessions: 0,
          latestOnlineMs: 0,
          latestAnyMs: 0,
          activePage: '',
          deviceType: '',
          loggedInAt: '',
          lastSeenIso: '',
        };
        map.set(key, row);
      }
      if (online) {
        row.onlineSessions += 1;
        if (refMs >= row.latestOnlineMs) {
          row.latestOnlineMs = refMs;
          row.activePage = p.activePage || 'dashboard';
          row.deviceType = p.deviceType || 'desktop';
          row.loggedInAt = p.loggedInAt || '';
          row.lastSeenIso = p.lastSeenAt || '';
          if (p.ownerAdminEmail) {
            row.ownerAdminEmail = p.ownerAdminEmail.trim().toLowerCase();
          }
        }
      } else if (row.onlineSessions === 0 && refMs >= row.latestAnyMs) {
        row.latestAnyMs = refMs;
        row.activePage = p.activePage || 'dashboard';
        row.deviceType = p.deviceType || 'desktop';
        row.loggedInAt = p.loggedInAt || '';
        row.lastSeenIso = p.lastSeenAt || '';
        if (p.ownerAdminEmail && !row.ownerAdminEmail) {
          row.ownerAdminEmail = p.ownerAdminEmail.trim().toLowerCase();
        }
      }
      if (refMs > row.latestAnyMs) {
        row.latestAnyMs = refMs;
      }
    }

    const rows = Array.from(map.values())
      .map((r) => ({
        key: r.key,
        saleName: r.saleName,
        ownerAdminEmail: r.ownerAdminEmail,
        isOnline: r.onlineSessions > 0,
        onlineSessions: r.onlineSessions,
        activePage: r.activePage,
        deviceType: r.deviceType,
        loggedInAt: r.loggedInAt,
        lastSeenMs: r.onlineSessions > 0 ? r.latestOnlineMs : r.latestAnyMs,
        lastSeenIso: r.lastSeenIso,
      }))
      .sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        if (b.lastSeenMs !== a.lastSeenMs) return b.lastSeenMs - a.lastSeenMs;
        return a.saleName.localeCompare(b.saleName);
      });

    const onlineCount = rows.filter((r) => r.isOnline).length;
    return { rows, onlineCount, totalCount: rows.length };
  }, [isMasterAdmin, saleProfiles, salePresenceList, presenceNowMs]);

  const filteredSaleAccessRows = useMemo(() => {
    if (presenceFilter === 'online') {
      return saleAccessSummary.rows.filter((r) => r.isOnline);
    }
    return saleAccessSummary.rows;
  }, [saleAccessSummary.rows, presenceFilter]);

  const formatPresenceRelative = (lastSeenMs: number, lastSeenIso: string): string => {
    if (!lastSeenMs) return t.dashboard.neverLoggedIn;
    const diffMs = Math.max(0, presenceNowMs - lastSeenMs);
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 1) return t.dashboard.justNow;
    if (diffMins < 60) return t.dashboard.minutesAgo.replace('{n}', String(diffMins));
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t.dashboard.hoursAgo.replace('{n}', String(diffHours));
    const parsed = Date.parse(lastSeenIso || '');
    if (!Number.isFinite(parsed)) return t.dashboard.neverLoggedIn;
    const d = new Date(parsed);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${formatClockTime(lastSeenIso)}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Daily Sales Summary Form Card */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Surface className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon3D name="money" size={36} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">
                  {t.dashboard.dailySalesTitle} ({today})
                </h2>
                <p className="text-xs text-muted leading-snug">
                  {saleName
                    ? `${t.dashboard.salePersonalSubtitle} ${saleName}`
                    : t.dashboard.generalSummarySubtitle}
                </p>
              </div>
            </div>
            <Button
              tone="primary"
              onClick={() => onNavigate('pos')}
              className="w-full sm:w-auto shrink-0 whitespace-nowrap"
            >
              <Icon3D name="pos" size={20} /> {t.dashboard.newSalePosBtn}
            </Button>
          </div>

          <div className="mt-4 sm:mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-0 lg:divide-x lg:divide-border/50">
            <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pr-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
              <Icon3D name="money" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">{t.dashboard.todayRevenue}</p>
                <p
                  title={formatMoney(todayRevenue, currency)}
                  className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-0.5 truncate"
                >
                  {formatCompactMoney(todayRevenue, currency)}
                </p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 tabular-nums">
                  {formatCompactCount(todayOrders.length)} {t.dashboard.invoicesUnit}
                </p>
              </div>
            </div>

            <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
              <Icon3D name="analytics" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">
                  {saleName ? t.dashboard.todayItemsSoldLabel : t.dashboard.todayNetProfit}
                </p>
                <p
                  title={
                    saleName
                      ? `${todayItemsSold} ${t.dashboard.itemsSoldUnit}`
                      : formatMoney(todayProfit, currency)
                  }
                  className="text-lg sm:text-2xl font-bold tabular-nums text-primary mt-0.5 truncate"
                >
                  {saleName
                    ? `${formatCompactCount(todayItemsSold)} ${t.dashboard.itemsSoldUnit}`
                    : formatCompactMoney(todayProfit, currency)}
                </p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5">
                  {saleName ? t.dashboard.personalSaleOnlyNote : t.dashboard.calculatedFromCost}
                </p>
              </div>
            </div>

            <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
              <Icon3D name="due-payments" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">{t.dashboard.totalDueCustomers}</p>
                <p className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-0.5">
                  {formatCompactCount(duePaymentOrders.length)}
                </p>
                <p
                  title={formatMoney(duePaymentTotal, currency)}
                  className="text-[11px] sm:text-xs text-muted mt-0.5 truncate tabular-nums"
                >
                  {t.common.total}: {formatCompactMoney(duePaymentTotal, currency)}
                </p>
              </div>
            </div>

            <div className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pl-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
              <Icon3D name="alert" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">{t.dashboard.lowStockCountLabel}</p>
                <p className="text-lg sm:text-2xl font-bold tabular-nums text-danger mt-0.5">
                  {formatCompactCount(lowStockProducts.length)} {t.dashboard.itemsUnit}
                </p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5">{t.dashboard.needRestock}</p>
              </div>
            </div>
          </div>
        </Surface>
      </motion.div>

      {/* 2. NEW Form Card: Monthly & Yearly Revenue + Net Profit Report */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, delay: 0.04, ease: [0.16, 1, 0.3, 1] }}
      >
        <Surface className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon3D name="calendar" size={36} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">
                  {t.dashboard.monthlyYearlyTitle}
                </h2>
                <p className="text-xs text-muted leading-snug">
                  {t.dashboard.monthlyYearlySubtitle} · {selectedMonthDisplayName} {effectiveYear}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span className="whitespace-nowrap">{t.dashboard.selectMonthLabel}:</span>
                <select
                  aria-label={t.dashboard.selectMonthLabel}
                  value={selectedMonthNum}
                  onChange={(e) => setSelectedMonthNum(e.target.value)}
                  className="min-h-10 rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                >
                  {monthNames.map((mLabel, idx) => {
                    const num = String(idx + 1).padStart(2, '0');
                    return (
                      <option key={num} value={num}>
                        {num} · {mLabel}
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span className="whitespace-nowrap">{t.dashboard.selectYearLabel}:</span>
                <select
                  aria-label={t.dashboard.selectYearLabel}
                  value={effectiveYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="min-h-10 rounded-control border border-border bg-surface px-2.5 py-1.5 text-xs sm:text-sm font-semibold tabular-nums text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-4 sm:mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-0 lg:divide-x lg:divide-border/50">
            {/* Monthly Revenue */}
            <motion.div
              key={`m-rev-${selectedYearMonth}`}
              initial={prefersReducedMotion ? false : { opacity: 0.65, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pr-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3"
            >
              <Icon3D name="money" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">
                  {t.dashboard.monthlyRevenue} ({selectedYearMonth})
                </p>
                <p
                  title={formatMoney(monthlyStats.revenue, currency)}
                  className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-0.5 truncate"
                >
                  {formatCompactMoney(monthlyStats.revenue, currency)}
                </p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 tabular-nums">
                  {formatCompactCount(monthlyStats.count)} {t.dashboard.invoicesUnit} ·{' '}
                  {formatCompactCount(monthlyStats.itemsSold)} {t.dashboard.itemsSoldUnit}
                </p>
              </div>
            </motion.div>

            {/* Monthly Net Profit (or Monthly Items Sold for Sale role) */}
            <motion.div
              key={`m-prof-${selectedYearMonth}`}
              initial={prefersReducedMotion ? false : { opacity: 0.65, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.03 }}
              className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3"
            >
              <Icon3D name="analytics" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">
                  {saleName ? t.dashboard.monthlyItemsSold : t.dashboard.monthlyNetProfit} (
                  {selectedMonthDisplayName})
                </p>
                <p
                  title={
                    saleName
                      ? `${monthlyStats.itemsSold} ${t.dashboard.itemsSoldUnit}`
                      : formatMoney(monthlyStats.profit, currency)
                  }
                  className={`text-lg sm:text-2xl font-bold tabular-nums mt-0.5 truncate ${
                    !saleName && monthlyStats.profit < 0 ? 'text-danger' : 'text-primary'
                  }`}
                >
                  {saleName
                    ? `${formatCompactCount(monthlyStats.itemsSold)} ${t.dashboard.itemsSoldUnit}`
                    : formatCompactMoney(monthlyStats.profit, currency)}
                </p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 tabular-nums">
                  {saleName
                    ? t.dashboard.personalSaleOnlyNote
                    : `${t.dashboard.profitMarginLabel}: ${monthlyStats.marginPct}%`}
                </p>
              </div>
            </motion.div>

            {/* Yearly Revenue */}
            <motion.div
              key={`y-rev-${effectiveYear}`}
              initial={prefersReducedMotion ? false : { opacity: 0.65, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.06 }}
              className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:px-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3"
            >
              <Icon3D name="dashboard" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">
                  {t.dashboard.yearlyRevenue} ({effectiveYear})
                </p>
                <p
                  title={formatMoney(yearlyStats.revenue, currency)}
                  className="text-lg sm:text-2xl font-bold tabular-nums text-foreground mt-0.5 truncate"
                >
                  {formatCompactMoney(yearlyStats.revenue, currency)}
                </p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 tabular-nums">
                  {formatCompactCount(yearlyStats.count)} {t.dashboard.invoicesUnit} ·{' '}
                  {formatCompactCount(yearlyStats.itemsSold)} {t.dashboard.itemsSoldUnit}
                </p>
              </div>
            </motion.div>

            {/* Yearly Net Profit (or Yearly Items Sold for Sale role) */}
            <motion.div
              key={`y-prof-${effectiveYear}`}
              initial={prefersReducedMotion ? false : { opacity: 0.65, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.09 }}
              className="rounded-control border border-border/60 bg-background/50 p-3 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:pl-5 flex flex-col sm:flex-row items-start gap-2 sm:gap-3"
            >
              <Icon3D name="check" size={30} />
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs text-muted leading-snug">
                  {saleName ? t.dashboard.yearlyItemsSold : t.dashboard.yearlyNetProfit} ({effectiveYear})
                </p>
                <p
                  title={
                    saleName
                      ? `${yearlyStats.itemsSold} ${t.dashboard.itemsSoldUnit}`
                      : formatMoney(yearlyStats.profit, currency)
                  }
                  className={`text-lg sm:text-2xl font-bold tabular-nums mt-0.5 truncate ${
                    !saleName && yearlyStats.profit < 0 ? 'text-danger' : 'text-primary'
                  }`}
                >
                  {saleName
                    ? `${formatCompactCount(yearlyStats.itemsSold)} ${t.dashboard.itemsSoldUnit}`
                    : formatCompactMoney(yearlyStats.profit, currency)}
                </p>
                <p className="text-[11px] sm:text-xs text-muted mt-0.5 tabular-nums">
                  {saleName
                    ? t.dashboard.personalSaleOnlyNote
                    : `${t.dashboard.profitMarginLabel}: ${yearlyStats.marginPct}%`}
                </p>
              </div>
            </motion.div>
          </div>
        </Surface>
      </motion.div>

      {/* 3. Side-by-Side Analytics Charts: Daily Sales Bar Chart (Left) + Staff Monthly Sales Line Graphic (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch">
        {/* Left: Highlighted Sales Data Chart Form Card */}
        <motion.div
          className="lg:col-span-6 flex"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
        >
          <Surface className="w-full p-4 sm:p-6 flex flex-col border-primary/35 bg-gradient-to-b from-primary/[0.045] via-surface to-surface ring-1 ring-primary/12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Icon3D name="dashboard" size={36} />
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                    {t.dashboard.salesChartTitle}
                  </h2>
                  <p className="text-xs text-muted leading-snug tabular-nums">
                    {chartRange === '7d'
                      ? t.dashboard.days7
                      : chartRange === '14d'
                      ? t.dashboard.days14
                      : t.dashboard.days30}{' '}
                    · {formatCompactCount(periodOrdersCount)} {t.dashboard.invoicesUnit}
                  </p>
                </div>
              </div>

              <div
                role="tablist"
                aria-label={t.dashboard.salesChartTitle}
                className="grid grid-cols-3 sm:flex items-center gap-1 rounded-control border border-border/75 bg-background/85 p-1 shrink-0"
              >
                {(['7d', '14d', '30d'] as const).map((r) => {
                  const active = chartRange === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setChartRange(r);
                        setHoveredBarIso(null);
                      }}
                      className={`min-h-9 rounded-control px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {r === '7d'
                        ? t.dashboard.days7
                        : r === '14d'
                        ? t.dashboard.days14
                        : t.dashboard.days30}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean 3-Column Period Summary Strip */}
            <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50 py-3 gap-2">
              <div className="min-w-0 pr-2">
                <p className="text-[11px] text-muted truncate">{t.dashboard.selectedPeriodTotal}</p>
                <p
                  title={formatMoney(periodTotal, currency)}
                  className="text-base sm:text-xl font-bold tabular-nums text-primary mt-0.5 truncate"
                >
                  {formatCompactMoney(periodTotal, currency)}
                </p>
              </div>
              <div className="min-w-0 px-2 sm:px-3">
                <p className="text-[11px] text-muted truncate">{t.dashboard.dailyAverageLabel}</p>
                <p
                  title={formatMoney(periodDailyAvg, currency)}
                  className="text-sm sm:text-base font-semibold tabular-nums text-foreground mt-0.5 truncate"
                >
                  {formatCompactMoney(periodDailyAvg, currency)}
                </p>
              </div>
              <div className="min-w-0 pl-2 sm:pl-3">
                <p className="text-[11px] text-muted truncate">{t.dashboard.peakDayLabel}</p>
                <p
                  title={
                    peakDayPoint && peakDayPoint.total > 0
                      ? `${peakDayPoint.iso}: ${formatMoney(peakDayPoint.total, currency)}`
                      : undefined
                  }
                  className="text-sm sm:text-base font-semibold tabular-nums text-foreground mt-0.5 truncate"
                >
                  {peakDayPoint && peakDayPoint.total > 0
                    ? formatCompactMoney(peakDayPoint.total, currency)
                    : '—'}
                  {peakDayPoint && peakDayPoint.total > 0 && (
                    <span className="ml-1 text-[11px] font-normal text-muted">
                      ({peakDayPoint.label})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="mt-3 flex-1 flex flex-col justify-between gap-2.5">
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox="0 0 760 238"
                  className={`h-auto w-full ${chartRange === '7d' ? '' : 'min-w-[500px]'}`}
                  role="img"
                  aria-label={t.dashboard.chartAriaLabel}
                  onMouseLeave={() => setHoveredBarIso(null)}
                >
                  <defs>
                    <linearGradient id="sales-bar-active" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="1" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.68" />
                    </linearGradient>
                    <linearGradient id="sales-bar-default" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.60 0.105 164)" stopOpacity="0.95" />
                      <stop offset="100%" stopColor="oklch(0.70 0.065 164)" stopOpacity="0.58" />
                    </linearGradient>
                  </defs>

                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = 200 - ratio * 164;
                    const val = maxChartVal * ratio;
                    return (
                      <g key={idx}>
                        <line
                          x1="76"
                          y1={y}
                          x2="742"
                          y2={y}
                          stroke="var(--color-border)"
                          strokeDasharray={idx === 0 ? undefined : '4 4'}
                          strokeWidth="1"
                        />
                        <text
                          x="68"
                          y={y + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill="var(--color-muted)"
                          style={{
                            paintOrder: 'stroke',
                            stroke: 'var(--color-surface)',
                            strokeWidth: '4px',
                            strokeLinejoin: 'round',
                          }}
                        >
                          {formatCompactMoney(val, currency)}
                        </text>
                      </g>
                    );
                  })}

                  {chartPoints.map((pt, i) => {
                    const plotW = 656;
                    const step = plotW / chartPoints.length;
                    const colX = 80 + i * step;
                    const barW = Math.min(38, Math.max(10, step * 0.56));
                    const x = colX + (step - barW) / 2;
                    const barH = pt.total > 0 ? Math.max(4, (pt.total / maxChartVal) * 164) : 2;
                    const y = 200 - barH;
                    const showLabel =
                      chartPoints.length <= 14 || i % 3 === 0 || i === chartPoints.length - 1;
                    const isActiveBar = activeBarPoint?.iso === pt.iso;
                    const isHoverDimmed = Boolean(hoveredBarIso && !isActiveBar);

                    return (
                      <g key={`${chartRange}-${pt.iso}`}>
                        {isActiveBar && (
                          <rect
                            x={colX + 2}
                            y={26}
                            width={Math.max(4, step - 4)}
                            height={174}
                            rx="6"
                            fill="var(--color-primary)"
                            fillOpacity="0.065"
                          />
                        )}

                        {isActiveBar && pt.total > 0 && (
                          <line
                            x1={76}
                            y1={y}
                            x2={x}
                            y2={y}
                            stroke="var(--color-primary)"
                            strokeOpacity="0.45"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                        )}

                        <motion.rect
                          x={x}
                          y={y}
                          width={barW}
                          height={barH}
                          rx="5"
                          fill={
                            isActiveBar || pt.iso === today
                              ? 'url(#sales-bar-active)'
                              : 'url(#sales-bar-default)'
                          }
                          stroke={isActiveBar ? 'var(--color-primary)' : 'none'}
                          strokeWidth={isActiveBar ? 1.25 : 0}
                          style={{ transformOrigin: `${x + barW / 2}px 200px` }}
                          initial={prefersReducedMotion ? false : { scaleY: 0, opacity: 0.35 }}
                          animate={{
                            scaleY: 1,
                            opacity: isHoverDimmed ? 0.48 : 1,
                          }}
                          transition={{
                            scaleY: {
                              duration: 0.34,
                              delay: Math.min(i * 0.015, 0.2),
                              ease: [0.16, 1, 0.3, 1],
                            },
                            opacity: { duration: 0.16 },
                          }}
                        />

                        {pt.total > 0 && (chartPoints.length <= 14 || isActiveBar) && (
                          <text
                            x={x + barW / 2}
                            y={Math.max(16, y - 7)}
                            textAnchor="middle"
                            fontSize="10.5"
                            fontWeight="700"
                            fill={isActiveBar ? 'var(--color-primary)' : 'var(--color-foreground)'}
                            style={{
                              paintOrder: 'stroke',
                              stroke: 'var(--color-surface)',
                              strokeWidth: '4px',
                              strokeLinejoin: 'round',
                            }}
                          >
                            {formatCompactMoney(pt.total, currency)}
                          </text>
                        )}

                        {(showLabel || isActiveBar) && (
                          <text
                            x={x + barW / 2}
                            y={223}
                            textAnchor="middle"
                            fontSize="11"
                            fontWeight={isActiveBar ? '700' : '500'}
                            fill={isActiveBar ? 'var(--color-primary)' : 'var(--color-muted)'}
                            style={{
                              paintOrder: 'stroke',
                              stroke: 'var(--color-surface)',
                              strokeWidth: '3px',
                              strokeLinejoin: 'round',
                            }}
                          >
                            {pt.label}
                          </text>
                        )}

                        {/* Full-column hit zone for smooth mouse & touch selection */}
                        <rect
                          x={colX}
                          y={20}
                          width={step}
                          height={212}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredBarIso(pt.iso)}
                          onClick={() => setHoveredBarIso(pt.iso)}
                        >
                          <title>
                            {pt.iso}: {formatMoney(pt.total, currency)} ({pt.count}{' '}
                            {t.dashboard.invoicesUnit})
                          </title>
                        </rect>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Active Day Readout Strip (symmetric with Staff Line Chart) */}
              {activeBarPoint && (
                <div className="border-t border-border/50 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {t.dashboard.selectedDayReadout}:{' '}
                    <span className="text-primary tabular-nums">{activeBarPoint.iso}</span>
                    {activeBarPoint.iso === today && (
                      <span className="ml-1.5 text-[11px] font-medium text-muted">
                        ({t.dashboard.todayTag})
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3 tabular-nums">
                    <strong className="text-foreground">
                      {formatMoney(activeBarPoint.total, currency)}
                    </strong>
                    <span className="text-muted">
                      {formatCompactCount(activeBarPoint.count)} {t.dashboard.invoicesUnit}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Surface>
        </motion.div>

        {/* Right: NEW Staff Monthly Sales Comparison (Line Graphic) */}
        <motion.div
          className="lg:col-span-6 flex"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Surface className="w-full p-4 sm:p-6 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Icon3D name="track-staff" size={34} />
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-semibold text-foreground">
                    {t.dashboard.staffLineChartTitle}
                  </h2>
                  <p className="text-xs text-muted">
                    {t.dashboard.staffLineChartSubtitle} <strong className="tabular-nums text-foreground">{effectiveYear}</strong>
                  </p>
                </div>
              </div>

              {/* Clean Segmented Metric Selector */}
              <div
                role="tablist"
                aria-label={t.dashboard.staffLineChartTitle}
                className="grid grid-cols-3 sm:flex items-center gap-1 rounded-control border border-border/75 bg-background/85 p-1 shrink-0"
              >
                {(
                  [
                    { id: 'units' as const, label: t.dashboard.metricUnits },
                    { id: 'orders' as const, label: t.dashboard.metricOrders },
                    { id: 'revenue' as const, label: t.dashboard.metricRevenue },
                  ]
                ).map((tab) => {
                  const active = lineMetric === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setLineMetric(tab.id)}
                      className={`relative min-h-9 rounded-control px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {staffMonthlySeries.length === 0 ? (
              <div className="flex-1 py-10 flex flex-col items-center justify-center text-center gap-3">
                <TrendingUp className="h-8 w-8 text-muted/60" />
                <p className="text-sm text-muted max-w-sm">{t.dashboard.noStaffChartData}</p>
                <Button tone="quiet" onClick={() => onNavigate('pos')} className="min-h-10 px-4 text-xs">
                  {t.dashboard.newSalePosBtn}
                </Button>
              </div>
            ) : (
              <div className="mt-3 flex-1 flex flex-col justify-between gap-3">
                {/* Interactive Staff Legend */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  {focusedStaffKey && (
                    <button
                      type="button"
                      onClick={() => setFocusedStaffKey(null)}
                      className="min-h-8 rounded-control border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-surface cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {t.dashboard.allStaffOption}
                    </button>
                  )}
                  {staffMonthlySeries.map((s) => {
                    const isFocused = focusedStaffKey === s.key;
                    const isDimmed = Boolean(focusedStaffKey && !isFocused);
                    const totalMetric =
                      lineMetric === 'revenue'
                        ? formatCompactMoney(s.totalRevenue, currency)
                        : lineMetric === 'orders'
                        ? formatCompactCount(s.totalOrders)
                        : formatCompactCount(s.totalUnits);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() =>
                          setFocusedStaffKey((prev) => (prev === s.key ? null : s.key))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-control border px-2 py-1 text-[11px] font-medium transition-opacity cursor-pointer whitespace-nowrap shrink-0 ${
                          isFocused
                            ? 'border-primary/60 bg-primary/8 text-foreground font-semibold'
                            : 'border-border/60 bg-background/70 text-foreground hover:border-border'
                        } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-0.5 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="max-w-[96px] truncate">{s.name}</span>
                        <span className="text-muted tabular-nums">({totalMetric})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Animated Multi-Series Line Graphic SVG */}
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox="0 0 760 232"
                    className="h-auto w-full min-w-[480px]"
                    role="img"
                    aria-label={t.dashboard.staffLineChartTitle}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                  >
                    <defs>
                      {staffMonthlySeries.map((s) => (
                        <linearGradient
                          key={`grad-${s.key}`}
                          id={`staff-area-${s.key}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={s.color} stopOpacity="0.20" />
                          <stop offset="100%" stopColor={s.color} stopOpacity="0.01" />
                        </linearGradient>
                      ))}
                    </defs>

                    {/* Horizontal Gridlines & Y-Axis Labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                      const y = linePlotBottom - ratio * linePlotH;
                      const val = maxStaffLineVal * ratio;
                      return (
                        <g key={idx}>
                          <line
                            x1={linePlotLeft}
                            y1={y}
                            x2={linePlotRight}
                            y2={y}
                            stroke="var(--color-border)"
                            strokeDasharray={idx === 0 ? undefined : '4 4'}
                            strokeWidth="1"
                          />
                          <text
                            x={linePlotLeft - 8}
                            y={y + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="var(--color-muted)"
                          >
                            {formatMetricValue(val)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Active Month Vertical Crosshair */}
                    <line
                      x1={linePlotLeft + activeMonthIdx * monthStepX}
                      y1={linePlotTop}
                      x2={linePlotLeft + activeMonthIdx * monthStepX}
                      y2={linePlotBottom}
                      stroke="var(--color-primary)"
                      strokeOpacity="0.32"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />

                    {/* Soft Area Fills (for focused series, or top series) */}
                    {staffMonthlySeries.map((s, idx) => {
                      const showArea = focusedStaffKey ? focusedStaffKey === s.key : idx === 0;
                      if (!showArea) return null;
                      const pts = s.months.map((m, mIdx) => {
                        const x = linePlotLeft + mIdx * monthStepX;
                        const y = linePlotBottom - (m[lineMetric] / maxStaffLineVal) * linePlotH;
                        return { x, y };
                      });
                      return (
                        <motion.path
                          key={`area-${effectiveYear}-${lineMetric}-${s.key}`}
                          d={buildSmoothAreaPath(pts, linePlotBottom, linePlotTop)}
                          fill={`url(#staff-area-${s.key})`}
                          initial={prefersReducedMotion ? false : { opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4 }}
                        />
                      );
                    })}

                    {/* Staff Lines & Animated Dots */}
                    {staffMonthlySeries.map((s, idx) => {
                      const isFocused = focusedStaffKey === s.key;
                      const isDimmed = Boolean(focusedStaffKey && !isFocused);
                      const pts = s.months.map((m, mIdx) => {
                        const x = linePlotLeft + mIdx * monthStepX;
                        const y = linePlotBottom - (m[lineMetric] / maxStaffLineVal) * linePlotH;
                        return { x, y, val: m[lineMetric] };
                      });
                      const pathD = buildSmoothLinePath(pts, linePlotBottom, linePlotTop);

                      return (
                        <g key={`line-${effectiveYear}-${lineMetric}-${s.key}`}>
                          <motion.path
                            d={pathD}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={isFocused ? 3.2 : 2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            initial={prefersReducedMotion ? false : { pathLength: 0, opacity: 0 }}
                            animate={{
                              pathLength: 1,
                              opacity: isDimmed ? 0.2 : 1,
                            }}
                            transition={{
                              pathLength: {
                                duration: 0.65,
                                delay: Math.min(idx * 0.05, 0.25),
                                ease: [0.16, 1, 0.3, 1],
                              },
                              opacity: { duration: 0.18 },
                            }}
                          />
                          {pts.map((pt, mIdx) => {
                            const isActiveMonth = mIdx === activeMonthIdx;
                            if (!isActiveMonth && pt.val <= 0 && !isFocused) return null;
                            return (
                              <motion.circle
                                key={`${s.key}-${mIdx}`}
                                cx={pt.x}
                                cy={pt.y}
                                r={isActiveMonth ? 4.8 : 2.8}
                                fill="var(--color-surface)"
                                stroke={s.color}
                                strokeWidth={isActiveMonth ? 2.5 : 2}
                                initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
                                animate={{
                                  scale: 1,
                                  opacity: isDimmed ? 0.2 : 1,
                                }}
                                transition={{
                                  duration: 0.2,
                                  delay: prefersReducedMotion ? 0 : 0.25 + mIdx * 0.015,
                                }}
                              />
                            );
                          })}
                        </g>
                      );
                    })}

                    {/* X-Axis Month Labels */}
                    {monthNames.map((mLabel, mIdx) => {
                      const x = linePlotLeft + mIdx * monthStepX;
                      const isActive = mIdx === activeMonthIdx;
                      return (
                        <text
                          key={mIdx}
                          x={x}
                          y={222}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight={isActive ? '700' : '500'}
                          fill={isActive ? 'var(--color-primary)' : 'var(--color-muted)'}
                        >
                          {String(mIdx + 1).padStart(2, '0')}
                        </text>
                      );
                    })}

                    {/* Interactive Hover / Tap Month Hit Zones */}
                    {monthNames.map((mLabel, mIdx) => {
                      const centerX = linePlotLeft + mIdx * monthStepX;
                      const halfW = monthStepX / 2;
                      return (
                        <rect
                          key={`hit-${mIdx}`}
                          x={Math.max(linePlotLeft - 12, centerX - halfW)}
                          y={linePlotTop - 6}
                          width={monthStepX}
                          height={linePlotH + 30}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredMonthIdx(mIdx)}
                          onClick={() => setHoveredMonthIdx(mIdx)}
                        >
                          <title>
                            {mLabel} {effectiveYear}
                          </title>
                        </rect>
                      );
                    })}
                  </svg>
                </div>

                {/* Clean Active Month Comparison Readout Strip */}
                <div className="border-t border-border/50 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-foreground whitespace-nowrap">
                    {t.dashboard.monthActiveReadout}:{' '}
                    <span className="text-primary tabular-nums">
                      {monthNames[activeMonthIdx]} {effectiveYear}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {staffMonthlySeries
                      .map((s) => ({
                        ...s,
                        val: s.months[activeMonthIdx],
                      }))
                      .sort((a, b) => b.val[lineMetric] - a.val[lineMetric])
                      .map((s) => (
                        <span key={`ro-${s.key}`} className="inline-flex items-center gap-1.5 tabular-nums">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-muted">{s.name}:</span>
                          <strong className="text-foreground">
                            {formatMetricValue(s.val[lineMetric])}
                          </strong>
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </Surface>
        </motion.div>
      </div>

      {/* 3.5 Strictly Master-Admin Only: Live Sale Web App Access (Online) Report */}
      {isMasterAdmin && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <Surface className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Icon3D name="staff-info" size={34} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-sm sm:text-base font-semibold text-foreground">
                      {t.dashboard.salePresenceTitle}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-primary">
                      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                        {saleAccessSummary.onlineCount > 0 && !prefersReducedMotion && (
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex rounded-full h-2 w-2 ${
                            saleAccessSummary.onlineCount > 0 ? 'bg-primary' : 'bg-muted/50'
                          }`}
                        />
                      </span>
                      {t.dashboard.onlineCountSummary}: {formatCompactCount(saleAccessSummary.onlineCount)} /{' '}
                      {formatCompactCount(saleAccessSummary.totalCount)}
                    </span>
                  </div>
                  <p className="text-xs text-muted leading-snug mt-0.5">
                    {t.dashboard.salePresenceSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                <div
                  role="tablist"
                  aria-label={t.dashboard.salePresenceTitle}
                  className="flex items-center gap-1 rounded-control border border-border/75 bg-background/85 p-1"
                >
                  {(
                    [
                      {
                        id: 'all' as const,
                        label: `${t.dashboard.filterAllSales} (${formatCompactCount(saleAccessSummary.totalCount)})`,
                      },
                      {
                        id: 'online' as const,
                        label: `${t.dashboard.filterOnlineOnly} (${formatCompactCount(saleAccessSummary.onlineCount)})`,
                      },
                    ]
                  ).map((tab) => {
                    const active = presenceFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setPresenceFilter(tab.id)}
                        className={`min-h-9 rounded-control px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <Button
                  tone="quiet"
                  onClick={() => onNavigate('settings')}
                  className="min-h-10 sm:min-h-9 px-3 text-xs shrink-0 whitespace-nowrap"
                >
                  <span>{t.dashboard.manageSalesBtn}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {saleAccessSummary.totalCount === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-muted">{t.dashboard.noConfiguredSales}</p>
                <Button
                  tone="quiet"
                  onClick={() => onNavigate('settings')}
                  className="min-h-10 px-4 text-xs"
                >
                  {t.dashboard.manageSalesBtn}
                </Button>
              </div>
            ) : filteredSaleAccessRows.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm text-muted">{t.dashboard.noOnlineSalesYet}</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {filteredSaleAccessRows.map((row, idx) => {
                    const DeviceIcon =
                      row.deviceType === 'mobile'
                        ? Smartphone
                        : row.deviceType === 'tablet'
                        ? Tablet
                        : Monitor;
                    const deviceLabel =
                      row.deviceType === 'mobile'
                        ? t.dashboard.deviceMobile
                        : row.deviceType === 'tablet'
                        ? t.dashboard.deviceTablet
                        : t.dashboard.deviceDesktop;
                    const pageTitle =
                      row.activePage && row.activePage in t.nav
                        ? t.nav[row.activePage as PageId]
                        : row.activePage || t.nav.dashboard;
                    const loginClock = row.loggedInAt ? formatClockTime(row.loggedInAt) : '';

                    return (
                      <motion.div
                        key={row.key}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                        transition={{
                          duration: 0.18,
                          delay: Math.min(idx * 0.025, 0.18),
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={`rounded-control border p-3.5 transition-colors ${
                          row.isOnline
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/65 bg-background/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              title={row.saleName}
                              className="text-sm font-semibold text-foreground truncate"
                            >
                              {row.saleName}
                            </p>
                            {row.ownerAdminEmail && (
                              <p className="text-[11px] text-muted truncate mt-0.5">
                                {row.ownerAdminEmail}
                              </p>
                            )}
                          </div>

                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 whitespace-nowrap ${
                              row.isOnline ? 'text-primary' : 'text-muted'
                            }`}
                          >
                            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                              {row.isOnline && !prefersReducedMotion && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                              )}
                              <span
                                className={`relative inline-flex rounded-full h-2 w-2 ${
                                  row.isOnline ? 'bg-primary' : 'bg-muted/50'
                                }`}
                              />
                            </span>
                            {row.isOnline ? t.dashboard.statusOnline : t.dashboard.statusOffline}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2.5 border-t border-border/45 space-y-1 text-xs">
                          {row.lastSeenMs > 0 ? (
                            <>
                              <div className="flex items-center justify-between gap-2 text-muted">
                                <span className="truncate text-foreground/85 font-medium">
                                  {pageTitle}
                                </span>
                                <span className="inline-flex items-center gap-1 shrink-0 tabular-nums">
                                  <DeviceIcon className="h-3.5 w-3.5" />
                                  <span>{deviceLabel}</span>
                                  {row.isOnline && row.onlineSessions > 1 && (
                                    <span className="font-semibold text-primary">
                                      ×{row.onlineSessions}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[11px] text-muted tabular-nums">
                                <span className="truncate">
                                  {t.dashboard.lastSeenPrefix}{' '}
                                  <strong className={row.isOnline ? 'text-primary' : 'text-foreground'}>
                                    {formatPresenceRelative(row.lastSeenMs, row.lastSeenIso)}
                                  </strong>
                                </span>
                                {loginClock && (
                                  <span className="shrink-0">
                                    {t.dashboard.loggedInAtPrefix} {loginClock}
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-[11px] text-muted">{t.dashboard.neverLoggedIn}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </Surface>
        </motion.div>
      )}

      {/* 3.6 Strictly Master-Admin Only: Sale Staff Chronological Activity Log */}
      {isMasterAdmin && (
        <ActivityLogPanel
          logs={saleActivityLogs || []}
          loading={loadingActivityLogs}
          currency={currency}
          onClearExpiredLogs={onClearExpiredActivityLogs}
          autoClearedCount={autoClearedActivityCount}
        />
      )}

      {/* 4. Middle Grid: Low Stock (<= 10) + Due Payment Customers Report */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* Low Stock Alert Card */}
        <Surface className="lg:col-span-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon3D name="box" size={34} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">{t.dashboard.lowStockCardTitle}</h2>
                <p className="text-xs text-muted">{t.dashboard.lowStockCardSubtitle}</p>
              </div>
            </div>
            <Button tone="quiet" onClick={() => onNavigate('products')} className="min-h-11 sm:min-h-9 px-3 text-xs shrink-0 whitespace-nowrap">
              {saleName ? t.dashboard.viewProductsBtn : t.dashboard.manageStockBtn}
            </Button>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              {products.length === 0
                ? t.dashboard.noProductsYet
                : t.dashboard.allStockSufficient}
            </p>
          ) : (
            <div className="divide-y divide-border/50 mt-2">
              {lowStockProducts.map((p) => (
                <motion.div
                  key={p.id}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate" title={p.name}>
                      {p.name}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {p.category} · {p.warehouse}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-danger">
                    {t.common.remaining} {formatCompactCount(p.stock)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </Surface>

        {/* Due Payment Customers Report Form Card */}
        <Surface className="lg:col-span-7 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon3D name="due-payments" size={34} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">{t.dashboard.dueReportTitle}</h2>
                <p className="text-xs text-muted">{t.dashboard.dueReportSubtitle}</p>
              </div>
            </div>
            <Button tone="quiet" onClick={() => onNavigate('due-payments')} className="min-h-11 sm:min-h-9 px-3 text-xs shrink-0 whitespace-nowrap">
              {t.dashboard.viewAllBtn}
            </Button>
          </div>

          {duePaymentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t.dashboard.noDueOrders}</p>
          ) : (
            <>
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-border/50 mt-2">
                {duePaymentOrders.slice(0, 8).map((o) => (
                  <div key={o.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">{o.customerName}</span>
                      <span
                        title={formatMoney(o.totalAmount, currency)}
                        className="text-sm font-bold tabular-nums text-danger shrink-0"
                      >
                        {formatCompactMoney(o.totalAmount, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="tabular-nums">{o.customerPhone || '-'} · {o.staffName}</span>
                      <span className="font-medium text-accent tabular-nums shrink-0">
                        {o.dueDate || t.common.unscheduled}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto mt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted">
                      <th className="py-2.5 pr-3">{t.dashboard.colDueDate}</th>
                      <th className="py-2.5 px-3">{t.dashboard.colStaff}</th>
                      <th className="py-2.5 px-3">{t.dashboard.colCustomerPhone}</th>
                      <th className="py-2.5 px-3">{t.dashboard.colStore}</th>
                      <th className="py-2.5 pl-3 text-right">{t.dashboard.colTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {duePaymentOrders.slice(0, 8).map((o) => (
                      <tr key={o.id} className="hover:bg-background/60 transition-colors">
                        <td className="py-3 pr-3 whitespace-nowrap font-medium text-accent tabular-nums">
                          {o.dueDate || t.common.unscheduled}
                        </td>
                        <td className="py-3 px-3">{o.staffName}</td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-foreground">{o.customerName}</div>
                          <div className="text-xs text-muted tabular-nums">{o.customerPhone || '-'}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-muted">{o.storeName || '-'}</td>
                        <td
                          title={formatMoney(o.totalAmount, currency)}
                          className="py-3 pl-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap"
                        >
                          {formatCompactMoney(o.totalAmount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Surface>
      </div>

      {/* 5. Redesigned, Clean & Animated "Recent / New Orders" Form Card */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
      >
        <Surface className="p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Icon3D name="orders" size={34} />
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">
                  {t.dashboard.recentOrdersTitle}
                </h2>
                <p className="text-xs text-muted leading-snug">
                  {t.dashboard.recentOrdersSubtitle} ·{' '}
                  <span className="tabular-nums font-medium text-foreground">
                    {formatCompactCount(recentOrdersFiltered.length)} {t.dashboard.invoicesUnit}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
              {/* Clean Segmented Status Filter */}
              <div
                role="tablist"
                aria-label={t.dashboard.recentOrdersTitle}
                className="flex items-center gap-1 rounded-control border border-border/75 bg-background/85 p-1"
              >
                {(
                  [
                    { id: 'all' as const, label: t.dashboard.recentFilterAll },
                    { id: 'paid' as const, label: t.dashboard.recentFilterPaid },
                    { id: 'unpaid' as const, label: t.dashboard.recentFilterUnpaid },
                  ]
                ).map((tab) => {
                  const active = recentStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setRecentStatusFilter(tab.id)}
                      className={`min-h-9 rounded-control px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted hover:text-foreground'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <Button
                tone="quiet"
                onClick={() => onNavigate('orders')}
                className="min-h-10 sm:min-h-9 px-3 text-xs shrink-0 whitespace-nowrap"
              >
                <span>{t.dashboard.viewOrdersBtn}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted">{t.dashboard.noOrdersYet}</p>
              <Button tone="primary" onClick={() => onNavigate('pos')} className="min-h-10 px-4 text-xs">
                {t.dashboard.newSalePosBtn}
              </Button>
            </div>
          ) : recentOrdersFiltered.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted">{t.dashboard.noFilteredOrders}</p>
              <Button
                tone="quiet"
                onClick={() => setRecentStatusFilter('all')}
                className="min-h-10 px-4 text-xs"
              >
                {t.dashboard.recentFilterAll}
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile Animated Order Items */}
              <div className="sm:hidden divide-y divide-border/50 mt-2">
                <AnimatePresence mode="popLayout">
                  {recentOrdersFiltered.map((ord, idx) => {
                    const totalQty = ord.items.reduce((s, it) => s + (it.quantity || 0), 0);
                    const itemsPreview = ord.items
                      .map((it) => `${it.productName} ×${it.quantity}`)
                      .join(', ');
                    const isPaid = ord.paymentStatus === 'paid';

                    return (
                      <motion.div
                        key={ord.id}
                        layout
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                        transition={{
                          duration: 0.18,
                          delay: Math.min(idx * 0.025, 0.2),
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.99 }}
                        onClick={() => onNavigate('orders')}
                        className="py-3.5 space-y-1.5 cursor-pointer active:bg-background/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted tabular-nums">
                          <span className="font-mono font-semibold text-foreground/85 truncate">
                            {ord.orderNumber || ord.id.slice(0, 8)} · {ord.date} {ord.time}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                              isPaid ? 'text-primary' : 'text-danger'
                            }`}
                          >
                            {isPaid ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5" />
                            )}
                            {isPaid ? t.common.paid : t.common.unpaid}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {ord.customerName}
                          </p>
                          <span
                            title={formatMoney(ord.totalAmount, currency)}
                            className="text-sm font-bold tabular-nums text-foreground shrink-0"
                          >
                            {formatCompactMoney(ord.totalAmount, currency)}
                          </span>
                        </div>

                        <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                          <span className="font-medium text-foreground/80 tabular-nums">
                            {formatCompactCount(totalQty)} {t.dashboard.itemsSoldUnit}
                          </span>
                          {' · '}
                          {itemsPreview}
                        </p>

                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
                          <span className="truncate">
                            {ord.staffName}
                            {ord.storeName ? ` · ${ord.storeName}` : ''}
                          </span>
                          {ord.customerPhone && (
                            <span className="tabular-nums shrink-0">{ord.customerPhone}</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Desktop Clean Structured Table with Animated Rows */}
              <div className="hidden sm:block overflow-x-auto mt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-xs font-semibold tracking-wider text-muted">
                      <th className="py-2.5 pr-3 whitespace-nowrap">{t.dashboard.colInvoiceDate}</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">{t.dashboard.colStaff}</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">{t.dashboard.colCustomerName}</th>
                      <th className="py-2.5 px-3">{t.dashboard.colSoldItems}</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">{t.dashboard.colStatus}</th>
                      <th className="py-2.5 pl-3 text-right whitespace-nowrap">{t.dashboard.colTotal}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/45">
                    <AnimatePresence mode="popLayout">
                      {recentOrdersFiltered.map((ord, idx) => {
                        const totalQty = ord.items.reduce((s, it) => s + (it.quantity || 0), 0);
                        const itemsPreview = ord.items
                          .map((it) => `${it.productName} (×${it.quantity})`)
                          .join(', ');
                        const isPaid = ord.paymentStatus === 'paid';

                        return (
                          <motion.tr
                            key={ord.id}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                            transition={{
                              duration: 0.18,
                              delay: Math.min(idx * 0.025, 0.2),
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            onClick={() => onNavigate('orders')}
                            className="group cursor-pointer hover:bg-background/75 transition-colors duration-150"
                          >
                            <td className="py-3 pr-3 whitespace-nowrap">
                              <div className="font-mono text-xs font-semibold text-foreground tabular-nums">
                                {ord.orderNumber || ord.id.slice(0, 8)}
                              </div>
                              <div className="text-xs text-muted tabular-nums mt-0.5">
                                {ord.date} · {ord.time}
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-medium text-foreground whitespace-nowrap">
                                {ord.staffName}
                              </div>
                              {ord.storeName && (
                                <div className="text-xs text-muted truncate max-w-[140px]">
                                  {ord.storeName}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-medium text-foreground max-w-[170px] truncate">
                                {ord.customerName}
                              </div>
                              {ord.customerPhone && (
                                <div className="text-xs text-muted tabular-nums mt-0.5">
                                  {ord.customerPhone}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-3 max-w-[280px]">
                              <div className="text-xs text-foreground line-clamp-2 leading-relaxed" title={itemsPreview}>
                                {itemsPreview}
                              </div>
                              <div className="text-[11px] text-muted tabular-nums mt-0.5">
                                {formatCompactCount(totalQty)} {t.dashboard.itemsSoldUnit}
                              </div>
                            </td>

                            <td className="py-3 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                  isPaid ? 'text-primary' : 'text-danger'
                                }`}
                              >
                                {isPaid ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {isPaid ? t.common.paid : t.common.unpaid}
                              </span>
                            </td>

                            <td
                              title={formatMoney(ord.totalAmount, currency)}
                              className="py-3 pl-3 text-right font-bold tabular-nums whitespace-nowrap text-foreground group-hover:text-primary transition-colors"
                            >
                              {formatCompactMoney(ord.totalAmount, currency)}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Surface>
      </motion.div>
    </div>
  );
};
