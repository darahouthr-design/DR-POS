import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  Loader2,
  Pencil,
  PlusCircle,
  Search,
  Trash2,
} from 'lucide-react';
import { Button, Surface, inputClass } from './ui';
import { cleanSaleNameDisplay, formatCompactCount, formatMoney } from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type { CurrencyCode, SaleActivityActionType, SaleActivityLog } from '../types';

interface ActivityLogPanelProps {
  logs: SaleActivityLog[];
  loading?: boolean;
  currency: CurrencyCode;
  onClearExpiredLogs?: () => Promise<number>;
  autoClearedCount?: number | null;
}

const INITIAL_VISIBLE_COUNT = 12;

function getLogTimestampMs(log: SaleActivityLog): number {
  if (log.serverCreatedMs && log.serverCreatedMs > 0) {
    return log.serverCreatedMs;
  }
  const parsed = Date.parse(log.createdAt || '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAbsoluteTimestamp(ms: number, fallbackIso: string): string {
  const targetMs = ms > 0 ? ms : Date.parse(fallbackIso || '');
  if (!Number.isFinite(targetMs) || targetMs <= 0) return fallbackIso || '-';
  const d = new Date(targetMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

export const ActivityLogPanel: React.FC<ActivityLogPanelProps> = ({
  logs,
  loading = false,
  currency,
  onClearExpiredLogs,
  autoClearedCount = null,
}) => {
  const { t } = useI18n();
  const prefersReducedMotion = useReducedMotion();

  const [actionFilter, setActionFilter] = useState<'all' | SaleActivityActionType>('all');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expanded, setExpanded] = useState<boolean>(false);
  const [clearingExpired, setClearingExpired] = useState<boolean>(false);
  const [clearFeedback, setClearFeedback] = useState<{ count: number } | null>(null);

  const uniqueStaffOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of logs) {
      const display = cleanSaleNameDisplay(log.saleName) || log.saleName;
      if (log.saleKey && display && !map.has(log.saleKey)) {
        map.set(log.saleKey, display);
      }
    }
    return Array.from(map.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = logs.filter((log) => {
      if (actionFilter !== 'all' && log.actionType !== actionFilter) {
        return false;
      }
      if (staffFilter !== 'ALL' && log.saleKey !== staffFilter) {
        return false;
      }
      if (q) {
        const haystack = [
          log.saleName,
          log.orderNumber || '',
          log.customerName || '',
          log.summary || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const diff = getLogTimestampMs(b) - getLogTimestampMs(a);
      return sortOrder === 'desc' ? diff : -diff;
    });
  }, [logs, actionFilter, staffFilter, searchQuery, sortOrder]);

  const visibleLogs = expanded
    ? filteredLogs
    : filteredLogs.slice(0, INITIAL_VISIBLE_COUNT);

  const hasActiveFilters =
    actionFilter !== 'all' || staffFilter !== 'ALL' || searchQuery.trim().length > 0;

  const getActionMeta = (actionType: SaleActivityActionType) => {
    switch (actionType) {
      case 'order_created':
        return {
          label: t.dashboard.activityActionCreated,
          Icon: PlusCircle,
          toneClass: 'text-primary',
        };
      case 'order_updated':
        return {
          label: t.dashboard.activityActionUpdated,
          Icon: Pencil,
          toneClass: 'text-accent',
        };
      case 'payment_updated':
        return {
          label: t.dashboard.activityActionPayment,
          Icon: CreditCard,
          toneClass: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'order_deleted':
        return {
          label: t.dashboard.activityActionDeleted,
          Icon: Trash2,
          toneClass: 'text-danger',
        };
      case 'orders_bulk_deleted':
        return {
          label: t.dashboard.activityActionBulkDeleted,
          Icon: Trash2,
          toneClass: 'text-danger',
        };
      case 'problem_customer_added':
        return {
          label: t.dashboard.activityActionProblemCustomer,
          Icon: AlertTriangle,
          toneClass: 'text-amber-600 dark:text-amber-400',
        };
      default:
        return {
          label: t.dashboard.activityActionCreated,
          Icon: CheckCircle2,
          toneClass: 'text-primary',
        };
    }
  };

  const formatRelativeTime = (ms: number): string => {
    if (!ms) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
    if (diffSec < 60) return t.dashboard.justNow;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return t.dashboard.minutesAgo.replace('{n}', String(diffMin));
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return t.dashboard.hoursAgo.replace('{n}', String(diffHours));
    return '';
  };

  const actionTabs: Array<{ id: 'all' | SaleActivityActionType; label: string }> = [
    { id: 'all', label: t.dashboard.activityFilterAll },
    { id: 'order_created', label: t.dashboard.activityActionCreated },
    { id: 'order_updated', label: t.dashboard.activityActionUpdated },
    { id: 'payment_updated', label: t.dashboard.activityActionPayment },
    { id: 'order_deleted', label: t.dashboard.activityActionDeleted },
  ];

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, delay: 0.11, ease: [0.16, 1, 0.3, 1] }}
    >
      <Surface className="p-4 sm:p-6">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-control border border-border/75 bg-background flex items-center justify-center shrink-0 text-primary">
              <History className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="text-sm sm:text-base font-semibold text-foreground">
                  {t.dashboard.activityLogTitle}
                </h2>
                <span className="text-xs font-medium text-muted tabular-nums">
                  · {formatCompactCount(filteredLogs.length)} {t.dashboard.activityEventsUnit}
                </span>
              </div>
              <p className="text-xs text-muted leading-snug mt-0.5">
                {t.dashboard.activityLogSubtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onClearExpiredLogs && (
              <Button
                tone="quiet"
                disabled={clearingExpired}
                onClick={async () => {
                  setClearingExpired(true);
                  try {
                    const deleted = await onClearExpiredLogs();
                    setClearFeedback({ count: deleted });
                  } finally {
                    setClearingExpired(false);
                  }
                }}
                className="min-h-10 sm:min-h-9 px-3 text-xs whitespace-nowrap shrink-0"
              >
                {clearingExpired ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 text-muted shrink-0" />
                )}
                <span>{t.dashboard.activityAutoClearBtn}</span>
              </Button>
            )}
            <Button
              tone="quiet"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              className="min-h-10 sm:min-h-9 px-3 text-xs whitespace-nowrap shrink-0"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                {sortOrder === 'desc'
                  ? t.dashboard.activitySortNewest
                  : t.dashboard.activitySortOldest}
              </span>
            </Button>
          </div>
        </div>

        {/* 30-Day Automatic Retention Policy Bar */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted">
          <p className="inline-flex items-start sm:items-center gap-1.5 leading-snug">
            <Clock3 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            <span>{t.dashboard.activityAutoClearNote}</span>
          </p>
          {(clearFeedback !== null || (typeof autoClearedCount === 'number' && autoClearedCount > 0)) && (
            <p className="inline-flex items-center gap-1.5 font-medium text-primary shrink-0 tabular-nums">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {clearFeedback !== null
                  ? clearFeedback.count > 0
                    ? t.dashboard.activityAutoClearedResult.replace(
                        '{count}',
                        String(clearFeedback.count)
                      )
                    : t.dashboard.activityAutoClearNone
                  : t.dashboard.activityAutoClearedResult.replace(
                      '{count}',
                      String(autoClearedCount)
                    )}
              </span>
            </p>
          )}
        </div>

        {/* Interactive Filter Controls */}
        <div className="mt-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label={t.dashboard.activityLogTitle}
            className="flex flex-wrap items-center gap-1 rounded-control border border-border/75 bg-background/85 p-1"
          >
            {actionTabs.map((tab) => {
              const active = actionFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActionFilter(tab.id)}
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {uniqueStaffOptions.length > 0 && (
              <select
                aria-label={t.dashboard.activityAllStaff}
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className={`${inputClass} min-h-10 sm:min-h-9 py-1.5 text-xs sm:w-44`}
              >
                <option value="ALL">{t.dashboard.activityAllStaff}</option>
                {uniqueStaffOptions.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.name}
                  </option>
                ))}
              </select>
            )}

            <div className="relative sm:w-64">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.dashboard.activitySearchPlaceholder}
                aria-label={t.dashboard.activitySearchPlaceholder}
                className={`${inputClass} min-h-10 sm:min-h-9 pl-8 pr-3 py-1.5 text-xs`}
              />
            </div>
          </div>
        </div>

        {/* Chronological Event Feed */}
        {loading ? (
          <div className="mt-4 divide-y divide-border/45" aria-busy="true">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="h-3.5 w-44 rounded bg-border/60 animate-pulse" />
                  <div className="h-3 w-72 max-w-full rounded bg-border/40 animate-pulse" />
                </div>
                <div className="h-3 w-32 rounded bg-border/50 animate-pulse shrink-0" />
              </div>
            ))}
            <p className="sr-only">{t.dashboard.activityLoading}</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center space-y-1.5">
            <p className="text-sm font-semibold text-foreground">
              {t.dashboard.activityEmptyTitle}
            </p>
            <p className="text-xs text-muted max-w-lg mx-auto leading-relaxed">
              {t.dashboard.activityEmptyHint}
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-9 text-center space-y-3">
            <p className="text-sm text-muted">{t.dashboard.activityFilteredEmpty}</p>
            {hasActiveFilters && (
              <Button
                tone="quiet"
                onClick={() => {
                  setActionFilter('all');
                  setStaffFilter('ALL');
                  setSearchQuery('');
                }}
                className="min-h-10 px-4 text-xs"
              >
                {t.dashboard.activityResetFilter}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mt-4 divide-y divide-border/45">
              <AnimatePresence mode="popLayout">
                {visibleLogs.map((log, idx) => {
                  const meta = getActionMeta(log.actionType);
                  const ActionIcon = meta.Icon;
                  const tsMs = getLogTimestampMs(log);
                  const absTimestamp = formatAbsoluteTimestamp(tsMs, log.createdAt);
                  const relTimestamp = formatRelativeTime(tsMs);
                  const saleDisplay = cleanSaleNameDisplay(log.saleName) || log.saleName;

                  return (
                    <motion.div
                      key={log.id}
                      layout="position"
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{
                        duration: 0.16,
                        delay: Math.min(idx * 0.015, 0.15),
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                          <span
                            className={`inline-flex items-center gap-1.5 font-semibold whitespace-nowrap ${meta.toneClass}`}
                          >
                            <ActionIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>{meta.label}</span>
                          </span>
                          <span className="text-muted" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-semibold text-foreground truncate max-w-[14rem]">
                            {saleDisplay}
                          </span>
                          {log.orderNumber && (
                            <>
                              <span className="text-muted" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-mono font-medium text-foreground/85 tabular-nums">
                                {log.orderNumber}
                              </span>
                            </>
                          )}
                          {typeof log.amount === 'number' && (
                            <>
                              <span className="text-muted" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-bold text-foreground tabular-nums">
                                {formatMoney(log.amount, currency)}
                              </span>
                            </>
                          )}
                        </div>

                        <p className="text-xs text-muted leading-snug break-words">
                          {log.customerName ? (
                            <>
                              <span className="font-medium text-foreground/85">
                                {log.customerName}
                              </span>
                              {log.summary ? ` — ${log.summary}` : ''}
                            </>
                          ) : (
                            log.summary
                          )}
                        </p>
                      </div>

                      <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1 shrink-0 text-[11px] text-muted tabular-nums">
                        <time
                          dateTime={log.createdAt || undefined}
                          className="font-mono text-foreground/80 whitespace-nowrap"
                        >
                          {absTimestamp}
                        </time>
                        {relTimestamp && (
                          <span className="whitespace-nowrap text-muted">{relTimestamp}</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {filteredLogs.length > INITIAL_VISIBLE_COUNT && (
              <div className="mt-3 pt-3 border-t border-border/50 flex justify-center">
                <Button
                  tone="quiet"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="min-h-10 px-4 text-xs"
                >
                  {expanded
                    ? t.dashboard.activityShowLess
                    : `${t.dashboard.activityShowMore} (${formatCompactCount(
                        filteredLogs.length - INITIAL_VISIBLE_COUNT
                      )})`}
                </Button>
              </div>
            )}
          </>
        )}
      </Surface>
    </motion.div>
  );
};
