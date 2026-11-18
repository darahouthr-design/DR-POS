import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AlertTriangle, ArrowLeftRight, Menu, Send, Volume2, VolumeX, Wifi, X } from 'lucide-react';
import { deleteUser, onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth, setOrLinkCurrentAdminPassword } from './firebase';
import {
  addProblemCustomerFs,
  addStockLogFs,
  createOrderFs,
  deleteAccountWorkspaceFs,
  deleteOrderFs,
  deleteOrdersNoRestoreFs,
  deletePriceRecordFs,
  deleteProblemCustomerFs,
  deleteProductFs,
  deleteStaffFs,
  fetchLatestWorkspaceSaleProfilesFromServer,
  markSalePresenceOfflineFs,
  reorderProductsFs,
  savePriceRecordFs,
  saveProductFs,
  saveStaffFs,
  seedWorkspaceIfNeeded,
  subscribeToSalePresence,
  subscribeToWorkspace,
  updateOrderFs,
  updateSettingsFs,
  updateWorkspaceLicenseFs,
  upsertSalePresenceFs,
  type WorkspaceSubscription,
} from './services/firestoreWorkspace';
import {
  AuthGate,
  clearRolePref,
  consumePendingOperatorEmail,
  consumePendingRolePref,
  loadOperatorEmailPref,
  loadRolePref,
  saveOperatorEmailPref,
  saveRolePref,
  setExternalAuthError,
  SUB_ADMIN_EXTERNAL_BLOCK_ERROR,
  type StoredRolePref,
} from './components/AuthGate';
import {
  checkEmailAuthGate,
  DEFAULT_TELEGRAM_URL,
  isWorkspaceExpired,
  syncWorkspaceLicenseWithServer,
} from './services/developerLicense';
import { APP_LOGO_URL, DrPosLogo, Icon3D, type Icon3DName } from './components/Icon3D';

const DashboardView = React.lazy(() =>
  import('./components/DashboardView').then((m) => ({ default: m.DashboardView }))
);
const PosView = React.lazy(() =>
  import('./components/PosView').then((m) => ({ default: m.PosView }))
);
const OrdersView = React.lazy(() =>
  import('./components/OrdersView').then((m) => ({ default: m.OrdersView }))
);
const ProductsView = React.lazy(() =>
  import('./components/ProductsView').then((m) => ({ default: m.ProductsView }))
);
const AnalyticsView = React.lazy(() =>
  import('./components/OperationsViews').then((m) => ({ default: m.AnalyticsView }))
);
const DuePaymentsView = React.lazy(() =>
  import('./components/OperationsViews').then((m) => ({ default: m.DuePaymentsView }))
);
const PriceRecordView = React.lazy(() =>
  import('./components/OperationsViews').then((m) => ({ default: m.PriceRecordView }))
);
const ProblemCustomersView = React.lazy(() =>
  import('./components/OperationsViews').then((m) => ({ default: m.ProblemCustomersView }))
);
const StaffInfoView = React.lazy(() =>
  import('./components/OperationsViews').then((m) => ({ default: m.StaffInfoView }))
);
const StockLogView = React.lazy(() =>
  import('./components/OperationsViews').then((m) => ({ default: m.StockLogView }))
);
const TrackStaffView = React.lazy(() =>
  import('./components/OperationsViews').then((m) => ({ default: m.TrackStaffView }))
);
const AboutView = React.lazy(() =>
  import('./components/SettingsAndAboutViews').then((m) => ({ default: m.AboutView }))
);
const SettingsView = React.lazy(() =>
  import('./components/SettingsAndAboutViews').then((m) => ({ default: m.SettingsView }))
);
import { Button, ImageZoomModal, Surface } from './components/ui';
import { useIsDesktopDevice } from './utils/device';
import {
  formatMoney,
  normalizeSaleKey,
  playNewOrderNotification,
  todayLocalISO,
} from './utils/helpers';
import { TRANSLATIONS } from './utils/i18n';
import { LanguageProvider } from './utils/i18nContext';
import type {
  AdminProfile,
  AuthSession,
  PageId,
  PriceTier,
  ProblemCustomer,
  Product,
  SalePresence,
  SaleProfile,
  StaffMember,
  WorkspaceData,
  WorkspacePaginationState,
  WorkspaceSettings,
} from './types';

const PRESENCE_ID_STORAGE_KEY = 'drpos_sale_presence_id';
const PRESENCE_LOGIN_STORAGE_KEY = 'drpos_sale_logged_in_at';
const PRESENCE_OWNER_STORAGE_KEY = 'drpos_sale_presence_owner';

function clearSalePresenceSessionKeys() {
  try {
    sessionStorage.removeItem(PRESENCE_ID_STORAGE_KEY);
    sessionStorage.removeItem(PRESENCE_LOGIN_STORAGE_KEY);
    sessionStorage.removeItem(PRESENCE_OWNER_STORAGE_KEY);
  } catch {
    // Ignore storage unavailability
  }
}

function getOrCreateTabSalePresence(ownerTag: string): { presenceId: string; loggedInAt: string } {
  const nowIso = new Date().toISOString();
  const fallbackId = `pres_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    const existingOwner = sessionStorage.getItem(PRESENCE_OWNER_STORAGE_KEY);
    const existingId = sessionStorage.getItem(PRESENCE_ID_STORAGE_KEY);
    const existingLogin = sessionStorage.getItem(PRESENCE_LOGIN_STORAGE_KEY);
    if (existingOwner === ownerTag && existingId && /^[a-zA-Z0-9_-]{6,120}$/.test(existingId)) {
      return {
        presenceId: existingId,
        loggedInAt: existingLogin || nowIso,
      };
    }
    sessionStorage.setItem(PRESENCE_OWNER_STORAGE_KEY, ownerTag);
    sessionStorage.setItem(PRESENCE_ID_STORAGE_KEY, fallbackId);
    sessionStorage.setItem(PRESENCE_LOGIN_STORAGE_KEY, nowIso);
    return { presenceId: fallbackId, loggedInAt: nowIso };
  } catch {
    return { presenceId: fallbackId, loggedInAt: nowIso };
  }
}

function detectPresenceDeviceType(): string {
  if (typeof window === 'undefined') return 'desktop';
  if (window.innerWidth < 768) return 'mobile';
  if (window.innerWidth < 1024) return 'tablet';
  return 'desktop';
}

const NAV_ITEMS: Array<{ id: PageId; icon: Icon3DName }> = [
  { id: 'dashboard', icon: 'dashboard' },
  { id: 'pos', icon: 'pos' },
  { id: 'orders', icon: 'orders' },
  { id: 'products', icon: 'products' },
  { id: 'track-staff', icon: 'track-staff' },
  { id: 'analytics', icon: 'analytics' },
  { id: 'problem-customers', icon: 'problem-customers' },
  { id: 'due-payments', icon: 'due-payments' },
  { id: 'staff-info', icon: 'staff-info' },
  { id: 'price-record', icon: 'price-record' },
  { id: 'stock-log', icon: 'stock-log' },
  { id: 'settings', icon: 'settings' },
  { id: 'about', icon: 'about' },
];

const SALE_ALLOWED_PAGES: PageId[] = [
  'dashboard',
  'pos',
  'orders',
  'products',
  'due-payments',
  'settings',
];

export function App() {
  const isDesktop = useIsDesktopDevice();
  const [initializing, setInitializing] = useState<boolean>(true);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [operatorEmailState, setOperatorEmailState] = useState<string>('');
  const [roleState, setRoleState] = useState<StoredRolePref>({ role: 'admin' });
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [problemCustomers, setProblemCustomers] = useState<ProblemCustomer[]>([]);
  const [activePage, setActivePage] = useState<PageId>('dashboard');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [apiError, setApiError] = useState('');
  const [pagination, setPagination] = useState<WorkspacePaginationState>({
    hasMoreOrders: false,
    hasMoreStockLogs: false,
  });
  const [loadingMoreOrders, setLoadingMoreOrders] = useState(false);
  const [loadingMoreStockLogs, setLoadingMoreStockLogs] = useState(false);
  const [licenseClockTick, setLicenseClockTick] = useState(0);
  const [todayDateKey, setTodayDateKey] = useState(() => todayLocalISO());
  const [salePresenceList, setSalePresenceList] = useState<SalePresence[]>([]);

  // Image Zoom Lightbox state
  const [zoomState, setZoomState] = useState<{ url: string | null; title: string }>({
    url: null,
    title: '',
  });

  const wsSubRef = useRef<WorkspaceSubscription | null>(null);
  const notifiedOrderIdsRef = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef<boolean>(true);
  const langRef = useRef<'kh' | 'en' | 'kr'>('kh');
  const activeRoleRef = useRef<StoredRolePref>({ role: 'admin' });
  const activeAdminEmailRef = useRef<string>('');
  const activePageRef = useRef<PageId>('dashboard');
  const activeSalePresenceRef = useRef<{ uid: string; presenceId: string } | null>(null);
  const latestWorkspaceRef = useRef<WorkspaceData | null>(null);
  const licenseSyncSeqRef = useRef(0);
  const deletingAccountRef = useRef(false);
  const saleVerifyInFlightRef = useRef<string | null>(null);
  const serverVerifiedSaleProfilesRef = useRef<SaleProfile[] | null>(null);

  useEffect(() => {
    activeRoleRef.current = roleState;
  }, [roleState]);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    latestWorkspaceRef.current = workspace;
    if (workspace) {
      soundEnabledRef.current = workspace.settings.soundEnabled;
      langRef.current = workspace.settings.language;
      document.documentElement.classList.toggle('dark', Boolean(workspace.settings.darkMode));
    }
  }, [workspace]);

  // Persistent Firebase Authentication + Realtime Multi-Device Firestore Sync
  useEffect(() => {
    let activeRunId = 0;

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      activeRunId += 1;
      licenseSyncSeqRef.current += 1;
      const currentRun = activeRunId;

      if (wsSubRef.current) {
        wsSubRef.current.unsubscribe();
        wsSubRef.current = null;
      }

      notifiedOrderIdsRef.current.clear();

      if (!fbUser) {
        activeSalePresenceRef.current = null;
        clearSalePresenceSessionKeys();
        setSalePresenceList([]);
        setFirebaseUser(null);
        setOperatorEmailState('');
        setRoleState({ role: 'admin' });
        activeRoleRef.current = { role: 'admin' };
        setWorkspace(null);
        setProblemCustomers([]);
        setPagination({ hasMoreOrders: false, hasMoreStockLogs: false });
        setInitializing(false);
        return;
      }

      setInitializing(true);
      setApiError('');
      setFirebaseUser(fbUser);

      const cleanEmail = (fbUser.email || `${fbUser.uid}@drpos.local`).trim().toLowerCase();
      const displayName = fbUser.displayName || cleanEmail.split('@')[0] || 'DR-POS User';

      if (fbUser.email) {
        const gate = await checkEmailAuthGate(cleanEmail);
        if (currentRun !== activeRunId) return;
        if (gate.isSubAdmin) {
          setExternalAuthError(SUB_ADMIN_EXTERNAL_BLOCK_ERROR);
          clearRolePref(fbUser.uid);
          setWorkspace(null);
          setProblemCustomers([]);
          setPagination({ hasMoreOrders: false, hasMoreStockLogs: false });
          setInitializing(false);
          await signOut(auth).catch(() => {});
          return;
        }
      }

      const pendingRole = consumePendingRolePref();
      if (pendingRole) {
        saveRolePref(fbUser.uid, pendingRole);
      }
      const resolvedRole: StoredRolePref = pendingRole || loadRolePref(fbUser.uid) || { role: 'admin' };
      setRoleState(resolvedRole);
      activeRoleRef.current = resolvedRole;

      const pendingOp = consumePendingOperatorEmail();
      if (pendingOp) {
        saveOperatorEmailPref(fbUser.uid, pendingOp);
      }
      const savedOp = pendingOp || loadOperatorEmailPref(fbUser.uid);
      const initialOp = (
        savedOp || (resolvedRole.role === 'sale' ? '' : cleanEmail)
      )
        .trim()
        .toLowerCase();
      setOperatorEmailState(initialOp);
      activeAdminEmailRef.current = initialOp;

      setActivePage('dashboard');

      saleVerifyInFlightRef.current = null;
      serverVerifiedSaleProfilesRef.current = null;

      try {
        await seedWorkspaceIfNeeded(fbUser.uid, cleanEmail, displayName);
        if (currentRun !== activeRunId) return;

        const rejectSaleLogin = () => {
          licenseSyncSeqRef.current += 1;
          if (activeSalePresenceRef.current) {
            void markSalePresenceOfflineFs(
              activeSalePresenceRef.current.uid,
              activeSalePresenceRef.current.presenceId
            ).catch(() => {});
            activeSalePresenceRef.current = null;
          }
          clearSalePresenceSessionKeys();
          if (wsSubRef.current) {
            wsSubRef.current.unsubscribe();
            wsSubRef.current = null;
          }
          setExternalAuthError(
            'ឈ្មោះ Sale នេះមិនមាននៅក្នុងការកំណត់របស់ Admin ឬត្រូវបានបិទសិទ្ធិប្រើប្រាស់! សូមពិនិត្យឈ្មោះ Sale ម្ដងទៀត ឬទាក់ទង Admin។'
          );
          clearRolePref(fbUser.uid);
          setWorkspace(null);
          setProblemCustomers([]);
          setPagination({ hasMoreOrders: false, hasMoreStockLogs: false });
          setInitializing(false);
          signOut(auth).catch(() => {});
        };

        wsSubRef.current = subscribeToWorkspace(fbUser.uid, cleanEmail, displayName, {
          onUpdate: ({
            workspace: ws,
            problemCustomers: pc,
            newOrders,
            pagination: nextPag,
            rootFromCache,
          }) => {
            if (currentRun !== activeRunId) return;

            let effectiveWs = ws;
            const currentRole = activeRoleRef.current;
            if (currentRole.role === 'sale') {
              const targetSale = normalizeSaleKey(currentRole.saleName || '');
              const currentSaleList = ws.settings.saleProfiles || [];
              let matchedSale = currentSaleList.find(
                (sp) => sp.active !== false && normalizeSaleKey(sp.name) === targetSale
              );

              if (!matchedSale && rootFromCache && serverVerifiedSaleProfilesRef.current) {
                const serverMatched = serverVerifiedSaleProfilesRef.current.find(
                  (sp) => sp.active !== false && normalizeSaleKey(sp.name) === targetSale
                );
                if (serverMatched) {
                  matchedSale = serverMatched;
                  effectiveWs = {
                    ...ws,
                    settings: {
                      ...ws.settings,
                      saleProfiles: serverVerifiedSaleProfilesRef.current,
                    },
                  };
                }
              }

              if (!targetSale) {
                rejectSaleLogin();
                return;
              }

              if (!matchedSale) {
                const verifyKey = `${currentRun}:${targetSale}`;
                if (saleVerifyInFlightRef.current !== verifyKey) {
                  saleVerifyInFlightRef.current = verifyKey;
                  void fetchLatestWorkspaceSaleProfilesFromServer(fbUser.uid).then(
                    (serverSales) => {
                      if (currentRun !== activeRunId) return;
                      saleVerifyInFlightRef.current = null;
                      if (serverSales === null) {
                        if (!rootFromCache) {
                          rejectSaleLogin();
                        }
                        return;
                      }
                      const serverMatched = serverSales.find(
                        (sp) => sp.active !== false && normalizeSaleKey(sp.name) === targetSale
                      );
                      if (!serverMatched) {
                        serverVerifiedSaleProfilesRef.current = null;
                        rejectSaleLogin();
                        return;
                      }
                      serverVerifiedSaleProfilesRef.current = serverSales;
                      if (serverMatched.name !== activeRoleRef.current.saleName) {
                        const normalizedPref: StoredRolePref = {
                          role: 'sale',
                          saleName: serverMatched.name,
                        };
                        saveRolePref(fbUser.uid, normalizedPref);
                        setRoleState(normalizedPref);
                        activeRoleRef.current = normalizedPref;
                      }
                      setWorkspace((prev) => {
                        const base = prev || effectiveWs;
                        return {
                          ...base,
                          settings: {
                            ...base.settings,
                            saleProfiles: serverSales,
                          },
                        };
                      });
                      setProblemCustomers(pc);
                      setPagination(nextPag);
                      setInitializing(false);
                    }
                  );
                }
                return;
              }

              if (!rootFromCache) {
                serverVerifiedSaleProfilesRef.current = currentSaleList;
              }
              if (matchedSale.name !== currentRole.saleName) {
                const normalizedPref: StoredRolePref = { role: 'sale', saleName: matchedSale.name };
                saveRolePref(fbUser.uid, normalizedPref);
                setRoleState(normalizedPref);
                activeRoleRef.current = normalizedPref;
              }
            }

            setWorkspace(effectiveWs);
            setProblemCustomers(pc);
            setPagination(nextPag);
            setInitializing(false);

            for (const o of newOrders) {
              const targetAdmin = (activeAdminEmailRef.current || effectiveWs.email)
                .trim()
                .toLowerCase();
              const orderAdmin = (
                o.operatorEmail ||
                o.createdByEmail ||
                effectiveWs.email
              )
                .trim()
                .toLowerCase();
              if (currentRole.role === 'sale') {
                const sKey = normalizeSaleKey(currentRole.saleName || '');
                if (normalizeSaleKey(o.staffName) !== sKey) continue;
                if (activeAdminEmailRef.current && orderAdmin !== targetAdmin) continue;
              } else {
                if (orderAdmin !== targetAdmin) continue;
              }
              if (!notifiedOrderIdsRef.current.has(o.id)) {
                notifiedOrderIdsRef.current.add(o.id);
                playNewOrderNotification(soundEnabledRef.current, o.orderNumber, langRef.current);
              }
            }
          },
          onDeleted: () => {
            if (currentRun !== activeRunId) return;
            setWorkspace(null);
            setProblemCustomers([]);
            setPagination({ hasMoreOrders: false, hasMoreStockLogs: false });
            setInitializing(false);
          },
          onError: (err) => {
            if (currentRun !== activeRunId) return;
            setApiError(
              err.message.includes('Missing or insufficient permissions')
                ? 'គ្មានសិទ្ធិចូលប្រើទិន្នន័យគណនីនេះទេ។ សូមពិនិត្យការចូលគណនី Gmail ម្ដងទៀត។'
                : 'មានបញ្ហាក្នុងការធ្វើសមកាលកម្មទិន្នន័យ Realtime Firestore។ សូមព្យាយាមម្ដងទៀត។'
            );
            setInitializing(false);
          },
        });
      } catch (err) {
        if (currentRun !== activeRunId) return;
        setApiError(
          err instanceof Error && !err.message.startsWith('{')
            ? err.message
            : 'មិនអាចផ្ទុកទិន្នន័យគណនីពី Cloud Firestore បានទេ។'
        );
        setInitializing(false);
      }
    });

    return () => {
      activeRunId += 1;
      unsubAuth();
      if (wsSubRef.current) {
        wsSubRef.current.unsubscribe();
        wsSubRef.current = null;
      }
    };
  }, []);

  const session: AuthSession | null = useMemo(() => {
    if (!firebaseUser) return null;
    const email = (firebaseUser.email || `${firebaseUser.uid}@drpos.local`).trim().toLowerCase();
    return {
      token: firebaseUser.uid,
      email,
      displayName:
        roleState.role === 'sale' && roleState.saleName
          ? roleState.saleName
          : firebaseUser.displayName ||
            workspace?.settings.personalName ||
            email.split('@')[0] ||
            'DR-POS User',
      operatorEmail: operatorEmailState || email,
      role: roleState.role,
      saleName: roleState.saleName,
      createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
    };
  }, [firebaseUser, workspace?.settings.personalName, operatorEmailState, roleState]);

  const runFsMutation = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    if (isWorkspaceExpired(latestWorkspaceRef.current?.license)) {
      setApiError(
        'គណនីរបស់អ្នកបានផុតកំណត់ (Expired)! លោកអ្នកអាចមើលបានតែរបាយការណ៍លក់ និង Export Excel ប៉ុណ្ណោះ។ សូមទាក់ទង Developer តាម Telegram ដើម្បីបន្តសុពលភាព។'
      );
      return false;
    }
    setApiError('');
    try {
      await action();
      return true;
    } catch (err) {
      setApiError(
        err instanceof Error && !err.message.startsWith('{')
          ? err.message
          : 'ប្រតិបត្តិការរក្សាទុកទិន្នន័យមិនជោគជ័យទេ។ សូមព្យាយាមម្ដងទៀត។'
      );
      return false;
    }
  }, []);

  const handleLoadMoreOrders = useCallback(async () => {
    if (!wsSubRef.current || loadingMoreOrders) return;
    setLoadingMoreOrders(true);
    try {
      await wsSubRef.current.loadMoreOrders();
    } finally {
      setLoadingMoreOrders(false);
    }
  }, [loadingMoreOrders]);

  const handleLoadMoreStockLogs = useCallback(async () => {
    if (!wsSubRef.current || loadingMoreStockLogs) return;
    setLoadingMoreStockLogs(true);
    try {
      await wsSubRef.current.loadMoreStockLogs();
    } finally {
      setLoadingMoreStockLogs(false);
    }
  }, [loadingMoreStockLogs]);

  useEffect(() => {
    if (!workspace?.license?.expireAt) return;
    const timer = window.setInterval(() => setLicenseClockTick((t) => t + 1), 15_000);
    return () => window.clearInterval(timer);
  }, [workspace?.license?.expireAt]);

  // Keep Bell Notification daily date synchronized automatically across midnight
  useEffect(() => {
    const syncDateKey = () => {
      const next = todayLocalISO();
      setTodayDateKey((prev) => (prev === next ? prev : next));
    };
    const timer = window.setInterval(syncDateKey, 60_000);
    window.addEventListener('focus', syncDateKey);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncDateKey);
    };
  }, []);

  useEffect(() => {
    if (!workspace) return;
    const currentlyExpired = isWorkspaceExpired(workspace.license);
    if (!currentlyExpired && apiError.includes('Expired')) {
      setApiError('');
    }
  }, [workspace, apiError, licenseClockTick]);

  // Sync Master Admin license (1-month trial / Developer Expire Date / Telegram Link) & Sub-Admin registry with server
  const adminProfilesFingerprint = useMemo(
    () =>
      (workspace?.settings.adminProfiles || [])
        .map((a) => `${a.email.toLowerCase()}:${a.name}:${a.isMaster ? '1' : '0'}`)
        .join('|'),
    [workspace?.settings.adminProfiles]
  );

  const hasWorkspace = Boolean(workspace);

  const revalidateLicenseInBackground = useCallback(
    async (forceServer = false) => {
      const ws = latestWorkspaceRef.current;
      if (deletingAccountRef.current || !firebaseUser || !ws || auth.currentUser?.uid !== firebaseUser.uid) {
        return;
      }
      const seqId = ++licenseSyncSeqRef.current;
      const cleanEmail = (firebaseUser.email || ws.email || `${firebaseUser.uid}@drpos.local`)
        .trim()
        .toLowerCase();
      const res = await syncWorkspaceLicenseWithServer(
        {
          uid: firebaseUser.uid,
          email: cleanEmail,
          displayName:
            firebaseUser.displayName ||
            ws.settings.personalName ||
            cleanEmail.split('@')[0] ||
            'DR-POS Admin',
          license: ws.license,
          subAdmins: ws.settings.adminProfiles || [],
        },
        { forceServer }
      );
      if (
        deletingAccountRef.current ||
        seqId !== licenseSyncSeqRef.current ||
        !res?.license ||
        auth.currentUser?.uid !== firebaseUser.uid
      ) {
        return;
      }

      const cur = latestWorkspaceRef.current?.license;
      const licenseChanged =
        !cur ||
        cur.expireAt !== res.license.expireAt ||
        cur.planType !== res.license.planType ||
        cur.telegramUrl !== res.license.telegramUrl ||
        cur.developerUpdatedAt !== res.license.developerUpdatedAt ||
        cur.trialStartedAt !== res.license.trialStartedAt;

      if (licenseChanged) {
        setWorkspace((prev) => {
          if (!prev) return prev;
          const nextWs = { ...prev, license: res.license };
          latestWorkspaceRef.current = nextWs;
          return nextWs;
        });
        if (!isWorkspaceExpired(res.license)) {
          setApiError((prev) => (prev.includes('Expired') ? '' : prev));
        }
      }

      if (
        !deletingAccountRef.current &&
        (res.shouldUpdateFirestore || licenseChanged) &&
        auth.currentUser?.uid === firebaseUser.uid
      ) {
        await updateWorkspaceLicenseFs(firebaseUser.uid, res.license).catch(() => {});
      }
    },
    [firebaseUser]
  );

  useEffect(() => {
    if (!firebaseUser || !hasWorkspace) return;
    void revalidateLicenseInBackground(false);
    const onFocus = () => void revalidateLicenseInBackground(true);
    const onOnline = () => void revalidateLicenseInBackground(true);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void revalidateLicenseInBackground(true);
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(() => void revalidateLicenseInBackground(true), 60_000);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [firebaseUser, hasWorkspace, adminProfilesFingerprint, revalidateLicenseInBackground]);

  // Forced background license re-validation when switching to POS or Orders
  useEffect(() => {
    if (!firebaseUser || !hasWorkspace) return;
    if (activePage !== 'pos' && activePage !== 'orders') return;
    void revalidateLicenseInBackground(true);
  }, [activePage, firebaseUser, hasWorkspace, revalidateLicenseInBackground]);

  // Access Control Rules for active operator email
  const activeAccessRule = useMemo(() => {
    if (!workspace || !session) return null;
    const op = (session.operatorEmail || session.email).toLowerCase();
    return workspace.settings.accessRules.find((r) => r.email.toLowerCase() === op) || null;
  }, [workspace, session]);

  const knownAdminEmails = useMemo(() => {
    if (!workspace) return new Set<string>();
    const set = new Set<string>();
    const master = workspace.email.trim().toLowerCase();
    if (master) set.add(master);
    for (const adm of workspace.settings.adminProfiles || []) {
      const em = (adm.email || '').trim().toLowerCase();
      if (em) set.add(em);
    }
    return set;
  }, [workspace]);

  const activeAdminEmail = useMemo(
    () => (session?.operatorEmail || session?.email || '').trim().toLowerCase(),
    [session?.operatorEmail, session?.email]
  );

  const matchedSaleProfile = useMemo(() => {
    if (!workspace || session?.role !== 'sale') return null;
    const targetSale = normalizeSaleKey(session.saleName || '');
    if (!targetSale) return null;
    return (
      (workspace.settings.saleProfiles || []).find(
        (sp) => sp.active !== false && normalizeSaleKey(sp.name) === targetSale
      ) || null
    );
  }, [workspace, session?.role, session?.saleName]);

  const effectiveAdminEmail = useMemo(() => {
    if (!workspace || !session) return '';
    if (session.role === 'sale') {
      const explicitOp = operatorEmailState.trim().toLowerCase();
      if (explicitOp && knownAdminEmails.has(explicitOp)) {
        return explicitOp;
      }
      return (matchedSaleProfile?.ownerAdminEmail || workspace.email).trim().toLowerCase();
    }
    return activeAdminEmail || workspace.email.trim().toLowerCase();
  }, [workspace, session, operatorEmailState, knownAdminEmails, matchedSaleProfile, activeAdminEmail]);

  useEffect(() => {
    activeAdminEmailRef.current = effectiveAdminEmail;
  }, [effectiveAdminEmail]);

  const masterEmailLowerComputed = useMemo(
    () => (firebaseUser?.email || workspace?.email || '').trim().toLowerCase(),
    [firebaseUser?.email, workspace?.email]
  );

  const isMasterAdmin = useMemo(
    () =>
      Boolean(
        firebaseUser &&
          workspace &&
          session?.role === 'admin' &&
          effectiveAdminEmail === masterEmailLowerComputed
      ),
    [firebaseUser, workspace, session?.role, effectiveAdminEmail, masterEmailLowerComputed]
  );

  // Live Sale Web App Presence Heartbeat (tracks when a Sale signs in / navigates / closes tab)
  useEffect(() => {
    if (
      !firebaseUser?.uid ||
      !hasWorkspace ||
      session?.role !== 'sale' ||
      !session.saleName
    ) {
      activeSalePresenceRef.current = null;
      return;
    }

    const uid = firebaseUser.uid;
    const saleDisplayName = session.saleName.trim();
    const saleKey = normalizeSaleKey(saleDisplayName);
    if (!saleKey) return;

    const { presenceId, loggedInAt } = getOrCreateTabSalePresence(`${uid}:${saleKey}`);
    activeSalePresenceRef.current = { uid, presenceId };

    const ownerAdmin = (effectiveAdminEmail || masterEmailLowerComputed).trim().toLowerCase();

    const pingOnline = () => {
      if (deletingAccountRef.current || auth.currentUser?.uid !== uid) return;
      void upsertSalePresenceFs(uid, {
        presenceId,
        saleName: saleDisplayName,
        saleKey,
        ownerAdminEmail: ownerAdmin,
        online: true,
        activePage: activePageRef.current || 'dashboard',
        deviceType: detectPresenceDeviceType(),
        loggedInAt,
      });
    };

    pingOnline();

    const heartbeat = window.setInterval(pingOnline, 25_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        pingOnline();
      }
    };
    const onOnline = () => pingOnline();
    const onUnload = () => {
      if (deletingAccountRef.current) return;
      void markSalePresenceOfflineFs(uid, presenceId);
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('online', onOnline);
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
      if (!deletingAccountRef.current && auth.currentUser?.uid === uid) {
        void markSalePresenceOfflineFs(uid, presenceId);
      }
    };
  }, [
    firebaseUser?.uid,
    hasWorkspace,
    session?.role,
    session?.saleName,
    effectiveAdminEmail,
    masterEmailLowerComputed,
  ]);

  // Immediately update activePage in Sale's live presence when navigating between tabs
  useEffect(() => {
    if (
      !firebaseUser?.uid ||
      !hasWorkspace ||
      session?.role !== 'sale' ||
      !session.saleName ||
      !activeSalePresenceRef.current
    ) {
      return;
    }
    const saleDisplayName = session.saleName.trim();
    const saleKey = normalizeSaleKey(saleDisplayName);
    if (!saleKey) return;
    const { presenceId, loggedInAt } = getOrCreateTabSalePresence(
      `${firebaseUser.uid}:${saleKey}`
    );
    void upsertSalePresenceFs(firebaseUser.uid, {
      presenceId,
      saleName: saleDisplayName,
      saleKey,
      ownerAdminEmail: (effectiveAdminEmail || masterEmailLowerComputed).trim().toLowerCase(),
      online: true,
      activePage,
      deviceType: detectPresenceDeviceType(),
      loggedInAt,
    });
  }, [
    activePage,
    firebaseUser?.uid,
    hasWorkspace,
    session?.role,
    session?.saleName,
    effectiveAdminEmail,
    masterEmailLowerComputed,
  ]);

  // Real-time Sale Presence Subscription (Strictly Master Admin ONLY)
  useEffect(() => {
    if (!firebaseUser?.uid || !hasWorkspace || !isMasterAdmin) {
      setSalePresenceList([]);
      return;
    }
    const unsub = subscribeToSalePresence(
      firebaseUser.uid,
      (items) => setSalePresenceList(items),
      () => {
        // Presence subscription error is non-fatal for core POS operation
      }
    );
    return () => unsub();
  }, [firebaseUser?.uid, hasWorkspace, isMasterAdmin]);

  // Strict Multi-Admin Isolation across ALL pages:
  // Admin 1 (Master) and Sub-Admins 2, 3... see ONLY their own Orders, Products, Staff,
  // Price Records, Stock Logs, and Sale Profiles. ONLY Problem Customers is shared across all Admins.
  const visibleOrders = useMemo(() => {
    if (!workspace || !session) return [];
    if (session.role === 'sale') {
      const targetSale = normalizeSaleKey(session.saleName || '');
      if (!targetSale) return [];
      return workspace.orders.filter(
        (o) =>
          normalizeSaleKey(o.staffName) === targetSale &&
          (o.operatorEmail || o.createdByEmail || workspace.email).trim().toLowerCase() ===
            effectiveAdminEmail
      );
    }
    return workspace.orders.filter(
      (o) =>
        (o.operatorEmail || o.createdByEmail || workspace.email).trim().toLowerCase() ===
        effectiveAdminEmail
    );
  }, [workspace, session, effectiveAdminEmail]);

  const visibleProducts = useMemo(() => {
    if (!workspace || !session) return [];
    return workspace.products.filter(
      (p) => (p.operatorEmail || workspace.email).trim().toLowerCase() === effectiveAdminEmail
    );
  }, [workspace, session, effectiveAdminEmail]);

  const visibleStaff = useMemo(() => {
    if (!workspace || !session) return [];
    return workspace.staff.filter(
      (s) => (s.operatorEmail || workspace.email).trim().toLowerCase() === effectiveAdminEmail
    );
  }, [workspace, session, effectiveAdminEmail]);

  const visiblePriceRecords = useMemo(() => {
    if (!workspace || !session) return [];
    return workspace.priceRecords.filter(
      (r) => (r.operatorEmail || workspace.email).trim().toLowerCase() === effectiveAdminEmail
    );
  }, [workspace, session, effectiveAdminEmail]);

  const visibleSaleProfiles = useMemo(() => {
    if (!workspace || !session) return [];
    return (workspace.settings.saleProfiles || []).filter(
      (sp) => (sp.ownerAdminEmail || workspace.email).trim().toLowerCase() === effectiveAdminEmail
    );
  }, [workspace, session, effectiveAdminEmail]);

  const scopedSettings = useMemo(() => {
    if (!workspace) return null;
    return {
      ...workspace.settings,
      saleProfiles: visibleSaleProfiles,
    };
  }, [workspace, visibleSaleProfiles]);

  const visibleStockLogs = useMemo(() => {
    if (!workspace || !session) return [];
    if (session.role === 'sale') return [];
    return workspace.stockLogs.filter(
      (l) => (l.operatorEmail || workspace.email).trim().toLowerCase() === effectiveAdminEmail
    );
  }, [workspace, session, effectiveAdminEmail]);

  const hideWarehouse = Boolean(activeAccessRule?.hideWarehouseReports);
  const blockedPages = useMemo(
    () => (session?.role === 'sale' ? [] : activeAccessRule?.blockedPages || []),
    [activeAccessRule, session?.role]
  );

  useEffect(() => {
    if (session?.role === 'sale') {
      if (!SALE_ALLOWED_PAGES.includes(activePage)) {
        setActivePage('dashboard');
      }
      return;
    }
    if (activePage !== 'settings' && blockedPages.includes(activePage)) {
      const firstAllowed =
        NAV_ITEMS.map((n) => n.id).find((id) => !blockedPages.includes(id)) || 'settings';
      setActivePage(firstAllowed);
    }
  }, [activePage, blockedPages, session?.role]);

  const todayOrdersForBell = useMemo(
    () => visibleOrders.filter((o) => o.date === todayDateKey),
    [visibleOrders, todayDateKey]
  );

  const lowStockItems = useMemo(
    () => visibleProducts.filter((p) => p.stock <= 10),
    [visibleProducts]
  );

  const duePaymentItems = useMemo(
    () => visibleOrders.filter((o) => o.paymentStatus === 'unpaid' || Boolean(o.dueDate)),
    [visibleOrders]
  );

  if (initializing) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <Surface className="p-6 flex items-center gap-3">
          <DrPosLogo size={42} />
          <span className="text-sm font-medium text-muted">កំពុងភ្ជាប់ប្រព័ន្ធ DR-POS...</span>
        </Surface>
      </div>
    );
  }

  // Mandatory Auth Gate (Cannot close or bypass until signed in)
  if (!firebaseUser || !session || !workspace) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthGate
          onSaveOperatorPref={(uid, opEmail) => {
            if (uid === firebaseUser?.uid) {
              setOperatorEmailState(opEmail || session?.email || '');
            }
          }}
          onSaveRolePref={(uid, pref) => {
            if (uid === firebaseUser?.uid) {
              setRoleState(pref);
              activeRoleRef.current = pref;
            }
          }}
        />
      </MotionConfig>
    );
  }

  const t = TRANSLATIONS[workspace.settings.language] || TRANSLATIONS.kh;
  const currency = workspace.settings.currency;
  void licenseClockTick;
  const isExpired = isWorkspaceExpired(workspace.license);
  const telegramUrl = workspace.license?.telegramUrl || DEFAULT_TELEGRAM_URL;
  const totalBellAlerts =
    todayOrdersForBell.length + lowStockItems.length + duePaymentItems.length;

  const isSaleRole = session.role === 'sale';
  const allowedNavItems = isSaleRole
    ? NAV_ITEMS.filter((item) => SALE_ALLOWED_PAGES.includes(item.id))
    : NAV_ITEMS.filter(
        (item) => item.id === 'settings' || !blockedPages.includes(item.id)
      );

  const masterEmailLower = session.email.trim().toLowerCase();
  const rawAdminProfiles = workspace.settings.adminProfiles || [];
  const adminSwitchOptions: AdminProfile[] = rawAdminProfiles.some(
    (a) => a.email.trim().toLowerCase() === masterEmailLower
  )
    ? rawAdminProfiles.map((a) => ({
        ...a,
        isMaster: a.isMaster || a.email.trim().toLowerCase() === masterEmailLower,
      }))
    : [
        {
          id: 'adm-master',
          name: workspace.settings.personalName || session.displayName || 'Admin មេ',
          email: masterEmailLower,
          isMaster: true,
          createdAt: session.createdAt,
        },
        ...rawAdminProfiles,
      ];

  const activeAdminOption =
    adminSwitchOptions.find((a) => a.email.trim().toLowerCase() === effectiveAdminEmail) ||
    adminSwitchOptions[0];
  const activeAdminLabel = activeAdminOption?.name || effectiveAdminEmail;

  const handleQuickSwitchAdmin = (nextEmail: string) => {
    const clean = nextEmail.trim().toLowerCase() || masterEmailLower;
    saveOperatorEmailPref(firebaseUser.uid, clean);
    activeAdminEmailRef.current = clean;
    setOperatorEmailState(clean);
    setBellOpen(false);
    setMobileMenuOpen(false);
    setZoomState({ url: null, title: '' });
  };

  return (
    <LanguageProvider language={workspace.settings.language}>
      <MotionConfig reducedMotion="user">
        <div className="min-h-dvh w-full bg-background text-foreground flex">
        {/* Desktop Sidebar (For Sale on Mobile & Tablet, strictly uses the 6-tab bottom bar) */}
        <aside
          className={
            isSaleRole
              ? isDesktop
                ? 'hidden lg:flex lg:w-68 shrink-0 flex-col border-r border-border/80 bg-surface sticky top-0 h-dvh'
                : 'hidden'
              : 'hidden md:flex md:w-64 lg:w-68 shrink-0 flex-col border-r border-border/80 bg-surface sticky top-0 h-dvh'
          }
        >
          <div className="p-4 border-b border-border/60">
            <DrPosLogo size={42} showTagline />
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main Navigation">
            {allowedNavItems.map((item) => {
              const active = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-background'
                  }`}
                >
                  <Icon3D name={item.icon} size={26} />
                  <span className="truncate">{t.nav[item.id]}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-3.5 border-t border-border/60 text-xs space-y-2">
            {!isSaleRole && adminSwitchOptions.length > 1 && (
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted">
                  <ArrowLeftRight className="h-3 w-3 text-primary" /> {t.common.switchAccount}
                </label>
                <select
                  value={activeAdminEmail}
                  onChange={(e) => handleQuickSwitchAdmin(e.target.value)}
                  className="w-full rounded-control border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/35 cursor-pointer"
                >
                  {adminSwitchOptions.map((adm) => (
                    <option key={adm.id || adm.email} value={adm.email.toLowerCase()}>
                      {adm.name} ({adm.isMaster ? t.common.masterAdmin : t.common.subAdmin})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-muted">
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-primary" /> Realtime Sync
                </span>
                <span className="font-semibold text-primary">
                  {session.role === 'sale'
                    ? `Sale: ${session.saleName}`
                    : activeAdminEmail === masterEmailLower
                    ? t.common.masterAdmin
                    : t.common.subAdmin}
                </span>
              </div>
              <p className="truncate font-medium text-foreground" title={effectiveAdminEmail}>
                {effectiveAdminEmail}
              </p>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Drawer (Admin only; Sale uses clean 5-page bottom bar) */}
        <AnimatePresence>
          {!isSaleRole && mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <div
                className="fixed inset-0 bg-foreground/55 backdrop-blur-[2px]"
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ duration: 0.18 }}
                className="relative z-10 w-72 max-w-[85vw] bg-surface h-dvh flex flex-col border-r border-border shadow-float"
              >
                <div className="p-4 border-b border-border/60 flex items-center justify-between gap-2">
                  <DrPosLogo size={36} />
                  <Button
                    tone="quiet"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-11 min-w-11 px-2.5"
                    aria-label={t.common.closeMenu}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                  {allowedNavItems.map((item) => {
                    const active = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActivePage(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full min-h-11 flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'text-foreground hover:bg-background'
                        }`}
                      >
                        <Icon3D name={item.icon} size={24} />
                        <span className="truncate">{t.nav[item.id]}</span>
                      </button>
                    );
                  })}
                </nav>
                <div className="p-3.5 border-t border-border/60 text-xs space-y-2 pb-safe">
                  {!isSaleRole && adminSwitchOptions.length > 1 && (
                    <div className="space-y-1">
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-muted">
                        <ArrowLeftRight className="h-3 w-3 text-primary" /> {t.common.switchAccount}
                      </label>
                      <select
                        value={activeAdminEmail}
                        onChange={(e) => handleQuickSwitchAdmin(e.target.value)}
                        className="w-full rounded-control border border-border bg-background px-2 py-1.5 text-xs font-medium text-foreground"
                      >
                        {adminSwitchOptions.map((adm) => (
                          <option key={adm.id || adm.email} value={adm.email.toLowerCase()}>
                            {adm.name} ({adm.isMaster ? t.common.masterAdmin : t.common.subAdmin})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-muted">
                      <span className="flex items-center gap-1.5">
                        <Wifi className="h-3.5 w-3.5 text-primary" /> Realtime Sync
                      </span>
                      <span className="font-semibold text-primary">
                        {session.role === 'sale'
                          ? `Sale: ${session.saleName}`
                          : activeAdminEmail === masterEmailLower
                          ? t.common.masterAdmin
                          : t.common.subAdmin}
                      </span>
                    </div>
                    <p className="truncate font-medium text-foreground" title={activeAdminEmail}>
                      {activeAdminEmail}
                    </p>
                  </div>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        {/* Main Workspace Pane */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Workspace Header (Clean single-row bar: App Profile on left, quick actions on right) */}
          <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/95 backdrop-blur-md px-3.5 md:px-6 h-14 md:h-auto md:py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() =>
                  setActivePage(
                    isSaleRole || blockedPages.includes('about') ? 'dashboard' : 'about'
                  )
                }
                title="DR-POS App Profile"
                aria-label="DR-POS App Profile"
                className="h-10 w-10 shrink-0 rounded-xl bg-white p-0.5 border border-border/80 shadow-xs overflow-hidden flex items-center justify-center cursor-pointer hover:border-primary/60 transition-colors"
              >
                <img
                  src={APP_LOGO_URL}
                  alt="DR-POS"
                  className="h-full w-full object-contain"
                />
              </button>
              <div className={isSaleRole ? 'min-w-0 flex-1' : 'hidden md:block min-w-0 flex-1'}>
                <h1 className="text-sm sm:text-base md:text-lg font-semibold text-foreground truncate leading-tight">
                  {t.nav[activePage]}
                </h1>
                <p className="text-[11px] sm:text-xs text-muted truncate">
                  {session.role === 'sale'
                    ? `Sale: ${session.saleName} · ${activeAdminLabel}`
                    : `${workspace.settings.businessName} · ${
                        activeAdminEmail === masterEmailLower ? t.common.masterAdmin : t.common.subAdmin
                      } · ${activeAdminEmail}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {!isSaleRole && adminSwitchOptions.length > 1 && (
                <div className="hidden lg:flex items-center gap-1.5 rounded-control border border-border bg-background/80 px-2.5 h-10">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-primary shrink-0" />
                  <select
                    aria-label={t.header.switchAdminLabel}
                    value={activeAdminEmail}
                    onChange={(e) => handleQuickSwitchAdmin(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer max-w-[155px]"
                  >
                    {adminSwitchOptions.map((adm) => (
                      <option key={adm.id || adm.email} value={adm.email.toLowerCase()}>
                        {adm.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sound Notification Quick Toggle (Admin only — User/Sale cannot alter settings) */}
              {!isSaleRole && (
                <Button
                  tone="quiet"
                  disabled={isExpired}
                  onClick={() =>
                    runFsMutation(() =>
                      updateSettingsFs(firebaseUser.uid, workspace.settings, {
                        soundEnabled: !workspace.settings.soundEnabled,
                      })
                    )
                  }
                  className="min-h-10 h-10 min-w-10 px-2.5 sm:px-3"
                  title={t.header.toggleSoundTitle}
                  aria-label={t.header.toggleSoundTitle}
                >
                  {workspace.settings.soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-primary" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted" />
                  )}
                </Button>
              )}

              {/* Bell Notification Icon */}
              <div className="relative">
                <Button
                  tone="quiet"
                  onClick={() => setBellOpen((v) => !v)}
                  className="min-h-10 h-10 px-2.5 sm:px-3 relative"
                  aria-label={t.header.notifications}
                >
                  <Icon3D name="bell" size={22} />
                  {totalBellAlerts > 0 && (
                    <span className="ml-0.5 text-xs font-bold tabular-nums text-danger">
                      {totalBellAlerts}
                    </span>
                  )}
                </Button>

                <AnimatePresence>
                  {bellOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40 bg-transparent"
                        onClick={() => setBellOpen(false)}
                        aria-hidden="true"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 z-50"
                      >
                        <Surface className="p-4 shadow-float space-y-4 max-h-[75dvh] overflow-y-auto">
                          <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                            <span className="text-sm font-semibold">{t.header.notifications}</span>
                            <button
                              type="button"
                              onClick={() => setBellOpen(false)}
                              className="min-h-10 px-2.5 text-xs font-medium text-muted hover:text-foreground cursor-pointer"
                            >
                              {t.common.close}
                            </button>
                          </div>

                        {/* 1. Daily Sales Reports (Strict today-only reset each day) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActivePage('orders');
                                setBellOpen(false);
                              }}
                              className="text-xs font-semibold text-primary hover:underline cursor-pointer text-left"
                            >
                              {t.header.recentSales} ({todayOrdersForBell.length})
                            </button>
                            <span className="text-[11px] text-muted tabular-nums shrink-0">
                              {todayDateKey}
                            </span>
                          </div>
                          {todayOrdersForBell.length === 0 ? (
                            <p className="text-xs text-muted">{t.header.noTodaySales}</p>
                          ) : (
                            <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1">
                              {todayOrdersForBell.map((o) => (
                                <div
                                  key={o.id}
                                  className="flex justify-between gap-2 text-xs py-1.5 border-b border-border/30"
                                >
                                  <span className="truncate">
                                    {o.customerName} ({o.staffName}){o.time ? ` · ${o.time}` : ''}
                                  </span>
                                  <strong className="tabular-nums shrink-0">
                                    {formatMoney(o.totalAmount, currency)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. Low Stock <= 10 */}
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePage('products');
                              setBellOpen(false);
                            }}
                            className="text-xs font-semibold text-danger hover:underline cursor-pointer"
                          >
                            {t.header.lowStockAlert} ({lowStockItems.length})
                          </button>
                          {lowStockItems.length === 0 ? (
                            <p className="text-xs text-muted">{t.header.noLowStock}</p>
                          ) : (
                            lowStockItems.slice(0, 5).map((p) => (
                              <div
                                key={p.id}
                                className="flex justify-between text-xs py-1.5 border-b border-border/30"
                              >
                                <span className="truncate pr-2">{p.name}</span>
                                <strong className="text-danger tabular-nums shrink-0">
                                  {t.common.remaining} {p.stock}
                                </strong>
                              </div>
                            ))
                          )}
                        </div>

                        {/* 3. Due Payment Customers */}
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActivePage('due-payments');
                              setBellOpen(false);
                            }}
                            className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                          >
                            {t.header.dueCustomerReport} ({duePaymentItems.length})
                          </button>
                          {duePaymentItems.length === 0 ? (
                            <p className="text-xs text-muted">{t.header.noDueCustomers}</p>
                          ) : (
                            duePaymentItems.slice(0, 4).map((d) => (
                              <div
                                key={d.id}
                                className="flex justify-between text-xs py-1.5 border-b border-border/30"
                              >
                                <span className="truncate pr-2">
                                  {d.customerName} ({d.dueDate || t.common.unscheduled})
                                </span>
                                <strong className="tabular-nums shrink-0">
                                  {formatMoney(d.totalAmount, currency)}
                                </strong>
                              </div>
                            ))
                          )}
                        </div>
                      </Surface>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {activePage !== 'pos' && (isSaleRole || !blockedPages.includes('pos')) && (
                <Button
                  tone="primary"
                  onClick={() => setActivePage('pos')}
                  className="hidden sm:inline-flex min-h-10"
                >
                  <Icon3D name="pos" size={20} /> POS
                </Button>
              )}
            </div>
          </header>

          {/* License Expiration Alert Banner (All Devices: Desktop, Phone, Tablet) */}
          {isExpired && (
            <div
              role="alert"
              className="mx-3 sm:mx-6 mt-3 sm:mt-4 rounded-card border border-danger/55 bg-danger/12 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-foreground leading-relaxed">
                  <strong className="text-danger">{t.header.expiredTitle}</strong>{' '}
                  <span>{t.header.expiredBody}</span>
                </div>
              </div>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-control bg-primary px-3.5 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs hover:brightness-105 shrink-0"
              >
                <Send className="h-4 w-4 shrink-0" />
                <span>{t.header.contactDevTelegram}</span>
              </a>
            </div>
          )}

          {/* Error Banner */}
          {apiError && (
            <div
              role="alert"
              className="mx-3 sm:mx-6 mt-3 sm:mt-4 flex items-center justify-between gap-2 rounded-control border border-danger/40 bg-danger/10 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm text-danger"
            >
              <span>{apiError}</span>
              <button
                type="button"
                onClick={() => setApiError('')}
                className="min-h-9 px-2 text-xs font-semibold cursor-pointer shrink-0"
              >
                {t.common.close}
              </button>
            </div>
          )}

          {/* Main Active Module Content */}
          <main
            key={effectiveAdminEmail}
            className={`flex-1 p-3 sm:p-6 ${
              isSaleRole ? (isDesktop ? 'pb-24 lg:pb-6' : 'pb-24') : 'pb-24 md:pb-6'
            }`}
          >
            <Suspense
              fallback={
                <div className="min-h-[45dvh] flex items-center justify-center">
                  <Surface className="px-5 py-3.5 flex items-center gap-3">
                    <DrPosLogo size={32} />
                    <span className="text-sm font-medium text-muted">កំពុងបើកទំព័រ...</span>
                  </Surface>
                </div>
              }
            >
            {activePage === 'dashboard' && (
              <DashboardView
                orders={visibleOrders}
                products={visibleProducts}
                currency={currency}
                saleName={isSaleRole ? session.saleName : undefined}
                isMasterAdmin={isMasterAdmin}
                salePresenceList={isMasterAdmin ? salePresenceList : undefined}
                saleProfiles={isMasterAdmin ? workspace.settings.saleProfiles : undefined}
                onNavigate={setActivePage}
              />
            )}

            {activePage === 'pos' && scopedSettings && (
              <PosView
                products={visibleProducts}
                orders={visibleOrders}
                problemCustomers={problemCustomers}
                staff={visibleStaff}
                settings={scopedSettings}
                currency={currency}
                hideWarehouse={hideWarehouse}
                lockedSaleName={session.role === 'sale' ? session.saleName : undefined}
                readOnly={isExpired}
                telegramUrl={telegramUrl}
                onZoomImage={(url, title) => setZoomState({ url, title })}
                onCreateOrder={async (payload) =>
                  runFsMutation(async () => {
                    const effectivePayload =
                      session.role === 'sale' && session.saleName
                        ? { ...payload, staffName: session.saleName }
                        : payload;
                    const created = await createOrderFs(
                      firebaseUser.uid,
                      session.email,
                      effectiveAdminEmail,
                      session.displayName,
                      effectivePayload,
                      visibleOrders.length,
                      scopedSettings,
                      visibleStaff,
                      visibleProducts
                    );
                    if (!notifiedOrderIdsRef.current.has(created.id)) {
                      notifiedOrderIdsRef.current.add(created.id);
                      playNewOrderNotification(
                        workspace.settings.soundEnabled,
                        created.orderNumber,
                        workspace.settings.language
                      );
                    }
                  })
                }
                onAddProblemCustomer={async (payload) =>
                  runFsMutation(() => addProblemCustomerFs(firebaseUser.uid, payload))
                }
              />
            )}

            {activePage === 'orders' && scopedSettings && (
              <OrdersView
                orders={visibleOrders}
                products={visibleProducts}
                staff={visibleStaff}
                settings={scopedSettings}
                currency={currency}
                hideWarehouse={hideWarehouse}
                lockedSaleName={session.role === 'sale' ? session.saleName : undefined}
                readOnly={isExpired}
                hasMoreOrders={pagination.hasMoreOrders}
                loadingMoreOrders={loadingMoreOrders}
                onLoadMoreOrders={handleLoadMoreOrders}
                onZoomImage={(url, title) => setZoomState({ url, title })}
                onUpdateOrder={async (id, payload) =>
                  runFsMutation(() =>
                    updateOrderFs(
                      firebaseUser.uid,
                      id,
                      session.role === 'sale' && session.saleName
                        ? { ...payload, staffName: session.saleName }
                        : payload
                    )
                  )
                }
                onDeleteOrder={async (id) => {
                  const ok = await runFsMutation(() => deleteOrderFs(firebaseUser.uid, id));
                  if (ok) wsSubRef.current?.evictOrders([id]);
                  return ok;
                }}
                onDeleteAllOrders={async (ids) => {
                  const ok = await runFsMutation(() =>
                    deleteOrdersNoRestoreFs(firebaseUser.uid, ids)
                  );
                  if (ok) wsSubRef.current?.evictOrders(ids);
                  return ok;
                }}
              />
            )}

            {activePage === 'products' && scopedSettings && (
              <ProductsView
                products={visibleProducts}
                settings={scopedSettings}
                currency={currency}
                hideWarehouse={hideWarehouse}
                readOnly={isSaleRole || isExpired}
                onZoomImage={(url, title) => setZoomState({ url, title })}
                onSaveProduct={async (payload: Partial<Product>) => {
                  if (isSaleRole || isExpired) return false;
                  return runFsMutation(() =>
                    saveProductFs(
                      firebaseUser.uid,
                      payload,
                      visibleProducts,
                      scopedSettings,
                      activeAdminEmail
                    )
                  );
                }}
                onDeleteProduct={async (id) => {
                  if (isSaleRole || isExpired) return false;
                  return runFsMutation(() => deleteProductFs(firebaseUser.uid, id));
                }}
                onReorderProducts={async (orderedIds) => {
                  if (isSaleRole || isExpired) return;
                  await runFsMutation(() => reorderProductsFs(firebaseUser.uid, orderedIds));
                }}
              />
            )}

            {!isSaleRole && activePage === 'track-staff' && (
              <TrackStaffView
                orders={visibleOrders}
                staff={visibleStaff}
                currency={currency}
              />
            )}

            {!isSaleRole && activePage === 'analytics' && (
              <AnalyticsView orders={visibleOrders} currency={currency} />
            )}

            {!isSaleRole && activePage === 'problem-customers' && (
              <ProblemCustomersView
                problemCustomers={problemCustomers}
                orders={visibleOrders}
                readOnly={isExpired}
                onAddProblemCustomer={async (payload) =>
                  runFsMutation(() => addProblemCustomerFs(firebaseUser.uid, payload))
                }
                onDeleteProblemCustomer={async (id) =>
                  runFsMutation(() => deleteProblemCustomerFs(firebaseUser.uid, id))
                }
              />
            )}

            {activePage === 'due-payments' && (
              <DuePaymentsView
                orders={visibleOrders}
                currency={currency}
                readOnly={isExpired}
                onUpdateOrder={async (id, payload) =>
                  runFsMutation(() => updateOrderFs(firebaseUser.uid, id, payload))
                }
              />
            )}

            {!isSaleRole && activePage === 'staff-info' && (
              <StaffInfoView
                staff={visibleStaff}
                onZoomImage={(url, title) => setZoomState({ url, title })}
              />
            )}

            {!isSaleRole && activePage === 'price-record' && (
              <PriceRecordView
                records={visiblePriceRecords}
                currency={currency}
                readOnly={isExpired}
                onZoomImage={(url, title) => setZoomState({ url, title })}
                onSaveRecord={async (payload: {
                  id?: string;
                  productName: string;
                  imageUrl: string;
                  prices: PriceTier[];
                }) =>
                  runFsMutation(() =>
                    savePriceRecordFs(firebaseUser.uid, payload, activeAdminEmail)
                  )
                }
                onDeleteRecord={async (id) =>
                  runFsMutation(() => deletePriceRecordFs(firebaseUser.uid, id))
                }
              />
            )}

            {!isSaleRole && activePage === 'stock-log' && (
              <StockLogView
                stockLogs={visibleStockLogs}
                products={visibleProducts}
                readOnly={isExpired}
                hasMoreStockLogs={pagination.hasMoreStockLogs}
                loadingMoreStockLogs={loadingMoreStockLogs}
                onLoadMoreStockLogs={handleLoadMoreStockLogs}
                onAddStock={async (productId, addedQuantity) =>
                  runFsMutation(() =>
                    addStockLogFs(firebaseUser.uid, productId, addedQuantity, activeAdminEmail)
                  )
                }
              />
            )}

            {activePage === 'settings' && scopedSettings && (
              <SettingsView
                session={{
                  ...session,
                  operatorEmail: effectiveAdminEmail || session.operatorEmail,
                }}
                settings={scopedSettings}
                allSaleProfiles={workspace.settings.saleProfiles}
                staff={visibleStaff}
                license={workspace.license}
                isExpired={isExpired}
                isDesktop={isDesktop}
                onZoomImage={(url, title) => setZoomState({ url, title })}
                onSaveSettings={async (patch: Partial<WorkspaceSettings>) => {
                  if (isSaleRole) return false;
                  const baseSettings = latestWorkspaceRef.current?.settings || workspace.settings;
                  let nextPatch = patch;
                  if (Array.isArray(patch.saleProfiles)) {
                    const otherAdminSales = (baseSettings.saleProfiles || []).filter(
                      (sp: SaleProfile) =>
                        (sp.ownerAdminEmail || workspace.email).trim().toLowerCase() !==
                        effectiveAdminEmail
                    );
                    const taggedCurrentSales = patch.saleProfiles.map((sp) => ({
                      ...sp,
                      ownerAdminEmail: sp.ownerAdminEmail || effectiveAdminEmail,
                    }));
                    nextPatch = {
                      ...patch,
                      saleProfiles: [...otherAdminSales, ...taggedCurrentSales],
                    };
                  }
                  const ok = await runFsMutation(() =>
                    updateSettingsFs(firebaseUser.uid, baseSettings, nextPatch)
                  );
                  if (ok) {
                    if (latestWorkspaceRef.current) {
                      latestWorkspaceRef.current = {
                        ...latestWorkspaceRef.current,
                        settings: {
                          ...latestWorkspaceRef.current.settings,
                          ...nextPatch,
                        },
                      };
                    }
                    if (patch.adminProfiles !== undefined) {
                      void revalidateLicenseInBackground(true);
                    }
                  }
                  return ok;
                }}
                onSaveStaff={async (payload: Partial<StaffMember>) => {
                  if (isSaleRole) return false;
                  return runFsMutation(() =>
                    saveStaffFs(firebaseUser.uid, payload, activeAdminEmail)
                  );
                }}
                onDeleteStaff={async (id) => {
                  if (isSaleRole) return false;
                  return runFsMutation(() => deleteStaffFs(firebaseUser.uid, id));
                }}
                onSetAdminPassword={async (password) => {
                  if (!isDesktop || session.role !== 'admin') {
                    return {
                      ok: false,
                      message: 'មុខងារនេះអនុញ្ញាតឱ្យប្រើតែលើកុំព្យូទ័រប៉ុណ្ណោះ។',
                    };
                  }
                  if (isExpired) {
                    return {
                      ok: false,
                      message: 'គណនីបានផុតកំណត់ (Expired)! សូមទាក់ទង Developer តាម Telegram ជាមុនសិន។',
                    };
                  }
                  try {
                    await setOrLinkCurrentAdminPassword(password);
                    return {
                      ok: true,
                      message:
                        'បានរក្សាទុកលេខសម្ងាត់គណនី Admin រួចរាល់! បុគ្គលិក Sale អាចប្រើ Gmail + Password នេះដើម្បីចូលប្រើបាន។',
                    };
                  } catch (err) {
                    const code = (err as { code?: string })?.code || '';
                    if (code === 'auth/requires-recent-login') {
                      return {
                        ok: false,
                        message:
                          'ដើម្បីសុវត្ថិភាព សូម Sign out រួច Sign in ម្ដងទៀត មុនពេលកំណត់ Password។',
                      };
                    }
                    if (code === 'auth/weak-password') {
                      return {
                        ok: false,
                        message: 'លេខសម្ងាត់ត្រូវមានយ៉ាងតិច 6 តួអក្សរ។',
                      };
                    }
                    return {
                      ok: false,
                      message:
                        err instanceof Error
                          ? err.message
                          : 'មិនអាចកំណត់លេខសម្ងាត់បានទេ។',
                    };
                  }
                }}
                onSwitchOperatorEmail={async (operatorEmail) => {
                  handleQuickSwitchAdmin(operatorEmail);
                }}
                onLogout={async () => {
                  licenseSyncSeqRef.current += 1;
                  if (activeSalePresenceRef.current) {
                    await markSalePresenceOfflineFs(
                      activeSalePresenceRef.current.uid,
                      activeSalePresenceRef.current.presenceId
                    ).catch(() => {});
                    activeSalePresenceRef.current = null;
                  }
                  clearSalePresenceSessionKeys();
                  if (wsSubRef.current) {
                    wsSubRef.current.unsubscribe();
                    wsSubRef.current = null;
                  }
                  saveOperatorEmailPref(firebaseUser.uid, '');
                  clearRolePref(firebaseUser.uid);
                  await signOut(auth);
                }}
                onDeleteAccount={async () => {
                  if (isSaleRole || activeAdminEmail !== masterEmailLower || deletingAccountRef.current) {
                    return;
                  }
                  setApiError('');
                  const lastSignInMs = firebaseUser.metadata.lastSignInTime
                    ? new Date(firebaseUser.metadata.lastSignInTime).getTime()
                    : 0;
                  if (lastSignInMs && Date.now() - lastSignInMs > 4 * 60 * 1000) {
                    setApiError(
                      'ដើម្បីសុវត្ថិភាពគណនី សូម Sign out រួច Sign in ម្ដងទៀត មុនពេលលុបគណនី (Delete Account)។'
                    );
                    return;
                  }

                  const masterEmail = (firebaseUser.email || workspace.email || '')
                    .trim()
                    .toLowerCase();
                  const subAdminEmails = (workspace.settings.adminProfiles || [])
                    .map((a) => (a.email || '').trim().toLowerCase())
                    .filter((e) => e.includes('@') && e !== masterEmail);

                  deletingAccountRef.current = true;
                  licenseSyncSeqRef.current += 1;
                  try {
                    await deleteAccountWorkspaceFs(firebaseUser.uid, {
                      masterEmail,
                      subAdminEmails,
                    });
                    if (wsSubRef.current) {
                      wsSubRef.current.unsubscribe();
                      wsSubRef.current = null;
                    }
                    saveOperatorEmailPref(firebaseUser.uid, '');
                    clearRolePref(firebaseUser.uid);
                    await deleteUser(firebaseUser);
                  } catch (err) {
                    const code = (err as { code?: string })?.code;
                    if (code === 'auth/requires-recent-login') {
                      setApiError(
                        'ដើម្បីសុវត្ថិភាពគណនី សូម Sign out រួច Sign in ម្ដងទៀត មុនពេលលុបគណនី។'
                      );
                      await signOut(auth).catch(() => {});
                      return;
                    }
                    setApiError(
                      err instanceof Error
                        ? err.message
                        : 'មិនអាចលុបគណនីបានទេ។ សូមព្យាយាមម្ដងទៀត។'
                    );
                  } finally {
                    deletingAccountRef.current = false;
                  }
                }}
              />
            )}

            {!isSaleRole && activePage === 'about' && <AboutView />}
            </Suspense>
          </main>
        </div>

        {/* Mobile & Tablet Bottom Thumb-Zone Navigation Bar (Sale gets strictly 6 pages on Mobile & Tablet) */}
        <nav
          aria-label="Mobile Quick Navigation"
          className={`${
            isSaleRole ? (isDesktop ? 'lg:hidden' : '') : 'md:hidden'
          } fixed bottom-0 inset-x-0 z-30 border-t border-border/80 bg-surface/95 backdrop-blur-md pb-safe`}
        >
          <div
            className={`grid ${
              isSaleRole ? 'grid-cols-6 max-w-3xl mx-auto' : 'grid-cols-5'
            } items-center h-14 sm:h-15 px-1`}
          >
            {(isSaleRole
              ? SALE_ALLOWED_PAGES
              : (['dashboard', 'pos', 'orders', 'products'] as PageId[])
            ).map((pid) => {
              const allowed = isSaleRole || !blockedPages.includes(pid);
              if (!allowed) {
                return <div key={pid} aria-hidden="true" />;
              }
              const navMeta = NAV_ITEMS.find((n) => n.id === pid)!;
              const isActive = activePage === pid;
              const shortLabel =
                t.navShort[pid as keyof typeof t.navShort] || t.nav[pid];
              return (
                <button
                  key={pid}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActivePage(pid)}
                  className={`relative flex flex-col items-center justify-center min-h-11 px-0.5 rounded-control transition-colors cursor-pointer ${
                    isActive ? 'text-primary font-semibold' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 inset-x-2.5 sm:inset-x-4 h-0.5 rounded-full bg-primary"
                    />
                  )}
                  <Icon3D name={navMeta.icon} size={isSaleRole ? 20 : 21} />
                  <span
                    className={`mt-0.5 leading-snug truncate max-w-full whitespace-nowrap ${
                      isSaleRole ? 'text-[10px] sm:text-[11px]' : 'text-[11px]'
                    }`}
                  >
                    {shortLabel}
                  </span>
                </button>
              );
            })}

            {!isSaleRole && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className={`relative flex flex-col items-center justify-center min-h-11 px-1 rounded-control transition-colors cursor-pointer ${
                  !['dashboard', 'pos', 'orders', 'products'].includes(activePage)
                    ? 'text-primary font-semibold'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {!['dashboard', 'pos', 'orders', 'products'].includes(activePage) && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-primary"
                  />
                )}
                <Menu className="h-5 w-5" />
                <span className="mt-0.5 text-[11px] leading-snug">{t.navShort.menu}</span>
              </button>
            )}
          </div>
        </nav>

        {/* Full-Screen Zoom In / Out Product Image Lightbox */}
        <ImageZoomModal
          imageUrl={zoomState.url}
          title={zoomState.title}
          onClose={() => setZoomState({ url: null, title: '' })}
        />
        </div>
      </MotionConfig>
    </LanguageProvider>
  );
}

export default App;
