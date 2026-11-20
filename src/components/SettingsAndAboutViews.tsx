import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Moon,
  Sun,
  Plus,
  Trash2,
  Upload,
  LogOut,
  Shield,
  UserX,
  UserPlus,
  Users,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  CalendarClock,
  Send,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Camera,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import {
  checkEmailAuthGate,
  DEFAULT_TELEGRAM_URL,
  getLicenseRemainingSummary,
} from '../services/developerLicense';
import { CambodiaFlagAnimated, DrPosLogo, Icon3D } from './Icon3D';
import { Button, Field, ProductImage, Surface, inputClass } from './ui';
import posVersionManifest from '../posVersion.json';
import {
  cleanSaleNameDisplay,
  normalizeSaleKey,
  uploadImageToCloudinary,
  uploadProductPhotoUrl,
} from '../utils/helpers';
import { useI18n } from '../utils/i18nContext';
import type {
  AdminProfile,
  AuthSession,
  CurrencyCode,
  LanguageCode,
  PageId,
  SaleProfile,
  SaleUserPreferences,
  StaffMember,
  UserAccessRule,
  WorkspaceLicense,
  WorkspaceSettings,
} from '../types';

const BLOCKABLE_PAGE_IDS: PageId[] = [
  'dashboard',
  'pos',
  'orders',
  'products',
  'track-staff',
  'analytics',
  'problem-customers',
  'due-payments',
  'staff-info',
  'price-record',
  'stock-log',
  'about',
];

interface SettingsViewProps {
  session: AuthSession;
  settings: WorkspaceSettings;
  allSaleProfiles?: SaleProfile[];
  staff: StaffMember[];
  license?: WorkspaceLicense;
  isExpired?: boolean;
  isDesktop: boolean;
  onSaveSettings: (next: Partial<WorkspaceSettings>) => Promise<boolean | void> | void;
  onUpdateSaleAvatar?: (saleId: string, avatarUrl: string) => Promise<boolean>;
  onSaveSalePreferences?: (next: Partial<SaleUserPreferences>) => Promise<boolean | void> | void;
  onSaveStaff: (payload: Partial<StaffMember>) => Promise<boolean>;
  onDeleteStaff: (id: string) => Promise<boolean>;
  onSetAdminPassword: (password: string) => Promise<{ ok: boolean; message: string }>;
  onSwitchOperatorEmail: (email: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onZoomImage: (url: string, title: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  session,
  settings,
  allSaleProfiles,
  staff,
  license,
  isExpired = false,
  isDesktop,
  onSaveSettings,
  onUpdateSaleAvatar,
  onSaveSalePreferences,
  onSaveStaff,
  onDeleteStaff,
  onSetAdminPassword,
  onSwitchOperatorEmail,
  onLogout,
  onDeleteAccount,
  onZoomImage,
}) => {
  const { t } = useI18n();
  const isAdminRole = session.role === 'admin';
  const canManageAdmins = isDesktop && isAdminRole;

  // 1. Personal Info
  const [personalName, setPersonalName] = useState(settings.personalName);
  const [personalPhone, setPersonalPhone] = useState(settings.personalPhone);
  const [businessName, setBusinessName] = useState(settings.businessName);

  // Sub-Admin Creation (Workspace Switch Account ONLY — No external Firebase Auth)
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [creatingAdminBusy, setCreatingAdminBusy] = useState(false);
  const [adminActionFeedback, setAdminActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Set / Link Password for current Admin (useful when signed in via Google Popup)
  const [saleLoginPw, setSaleLoginPw] = useState('');
  const [saleLoginPwConfirm, setSaleLoginPwConfirm] = useState('');
  const [settingPwBusy, setSettingPwBusy] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Sale Profiles Management
  const [newSaleName, setNewSaleName] = useState('');
  const [newSalePhone, setNewSalePhone] = useState('');
  const [uploadingSaleAvatarId, setUploadingSaleAvatarId] = useState<string | null>(null);
  const [saleFeedback, setSaleFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // 5. User Access Control
  const [targetRuleEmail, setTargetRuleEmail] = useState(
    settings.accessRules[0]?.email || session.operatorEmail || session.email
  );
  const [newRuleEmailInput, setNewRuleEmailInput] = useState('');
  const [activeOperatorInput, setActiveOperatorInput] = useState(session.operatorEmail || session.email);

  // 6. Master Lists Inputs
  const [newWarehouse, setNewWarehouse] = useState('');
  const [newStore, setNewStore] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [newCategory, setNewCategory] = useState('');

  // Staff Form
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffPhoto, setStaffPhoto] = useState('');
  const [staffPosition, setStaffPosition] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffAddress, setStaffAddress] = useState('');
  const [uploadingStaffPhoto, setUploadingStaffPhoto] = useState(false);

  // Delete Account Dialog
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Active Form Cart Pop-Up Modal
  type SettingsModalId =
    | 'sub-admin'
    | 'sale-profiles'
    | 'personal-general'
    | 'access-control'
    | 'warehouses'
    | 'stores'
    | 'groups'
    | 'categories'
    | 'staff';
  const [activeModal, setActiveModal] = useState<SettingsModalId | null>(null);
  const [personalSavedFeedback, setPersonalSavedFeedback] = useState(false);

  useEffect(() => {
    if (!activeModal || confirmDeleteOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, confirmDeleteOpen]);

  const normalizedTargetEmail = targetRuleEmail.trim().toLowerCase();
  const currentRule: UserAccessRule = settings.accessRules.find(
    (r) => r.email.toLowerCase() === normalizedTargetEmail
  ) || {
    email: normalizedTargetEmail,
    hideOtherUsersSales: false,
    hideWarehouseReports: false,
    blockedPages: [],
  };

  const updateAccessRule = async (patch: Partial<UserAccessRule>) => {
    if (!normalizedTargetEmail) return;
    const updatedRule: UserAccessRule = {
      ...currentRule,
      ...patch,
      email: normalizedTargetEmail,
    };
    const exists = settings.accessRules.some(
      (r) => r.email.toLowerCase() === normalizedTargetEmail
    );
    const nextRules = exists
      ? settings.accessRules.map((r) =>
          r.email.toLowerCase() === normalizedTargetEmail ? updatedRule : r
        )
      : [...settings.accessRules, updatedRule];

    await onSaveSettings({ accessRules: nextRules });
  };

  const toggleBlockedPage = async (pageId: PageId) => {
    const blocked = currentRule.blockedPages.includes(pageId)
      ? currentRule.blockedPages.filter((p) => p !== pageId)
      : [...currentRule.blockedPages, pageId];
    await updateAccessRule({ blockedPages: blocked });
  };

  const handleStaffPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingStaffPhoto(true);
    try {
      const url = await uploadImageToCloudinary(file);
      setStaffPhoto(url);
    } finally {
      setUploadingStaffPhoto(false);
    }
  };

  const handleSaveStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;
    const ok = await onSaveStaff({
      id: editingStaffId || undefined,
      name: staffName.trim(),
      photoUrl: staffPhoto,
      position: staffPosition.trim() || t.staffInfo.defaultPosition,
      phone: staffPhone.trim(),
      address: staffAddress.trim(),
    });
    if (ok) {
      setEditingStaffId(null);
      setStaffName('');
      setStaffPhoto('');
      setStaffPosition('');
      setStaffPhone('');
      setStaffAddress('');
    }
  };

  const handleCreateSubAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAdmins || isExpired) return;
    setAdminActionFeedback(null);

    const cleanEmail = newAdminEmail.trim().toLowerCase();
    const cleanName = newAdminName.trim() || cleanEmail.split('@')[0] || t.common.subAdmin;
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAdminActionFeedback({
        type: 'error',
        message: t.settings.errInvalidSubAdminEmail,
      });
      return;
    }

    if (cleanEmail === session.email.trim().toLowerCase()) {
      setAdminActionFeedback({
        type: 'error',
        message: t.settings.errAlreadyMasterEmail,
      });
      return;
    }

    const existingAdmins = settings.adminProfiles || [];
    if (existingAdmins.some((a) => a.email.trim().toLowerCase() === cleanEmail)) {
      setAdminActionFeedback({
        type: 'error',
        message: t.settings.errSubAdminExists.replace('{email}', cleanEmail),
      });
      return;
    }

    setCreatingAdminBusy(true);
    try {
      const gate = await checkEmailAuthGate(cleanEmail);
      if (gate.isRegisteredMaster) {
        setAdminActionFeedback({
          type: 'error',
          message: t.settings.errRegisteredMaster,
        });
        return;
      }

      const masterIncluded: AdminProfile[] = existingAdmins.some(
        (a) => a.email.trim().toLowerCase() === session.email.trim().toLowerCase()
      )
        ? existingAdmins.map((a) =>
            a.email.trim().toLowerCase() === session.email.trim().toLowerCase()
              ? { ...a, isMaster: true }
              : a
          )
        : [
            {
              id: `adm-master-${session.email.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`,
              name: settings.personalName || session.displayName || t.common.masterAdmin,
              email: session.email.trim().toLowerCase(),
              isMaster: true,
              createdAt: session.createdAt || new Date().toISOString(),
            },
            ...existingAdmins,
          ];

      const nextAdmin: AdminProfile = {
        id: `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        name: cleanName,
        email: cleanEmail,
        isMaster: false,
        createdAt: new Date().toISOString(),
      };

      await onSaveSettings({
        adminProfiles: [...masterIncluded, nextAdmin],
      });

      setNewAdminName('');
      setNewAdminEmail('');
      setAdminActionFeedback({
        type: 'success',
        message: t.settings.subAdminCreatedMsg
          .replace('{name}', cleanName)
          .replace('{email}', cleanEmail),
      });
    } finally {
      setCreatingAdminBusy(false);
    }
  };

  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAdmins || isExpired) return;
    setPwFeedback(null);
    if (!saleLoginPw || saleLoginPw.length < 6) {
      setPwFeedback({
        type: 'error',
        message: t.settings.errPasswordMin,
      });
      return;
    }
    if (saleLoginPw !== saleLoginPwConfirm) {
      setPwFeedback({
        type: 'error',
        message: t.settings.errPasswordMismatch,
      });
      return;
    }
    setSettingPwBusy(true);
    const res = await onSetAdminPassword(saleLoginPw);
    setSettingPwBusy(false);
    setPwFeedback({
      type: res.ok ? 'success' : 'error',
      message: res.message,
    });
    if (res.ok) {
      setSaleLoginPw('');
      setSaleLoginPwConfirm('');
    }
  };

  const addSaleProfile = async (
    nameInput: string,
    phoneInput = '',
    avatarUrlInput?: string
  ): Promise<boolean> => {
    if (isExpired) return false;
    setSaleFeedback(null);
    const cleanName = cleanSaleNameDisplay(nameInput);
    if (!cleanName) {
      setSaleFeedback({ type: 'error', message: t.settings.errSaleNameRequired });
      return false;
    }
    const cleanKey = normalizeSaleKey(cleanName);
    const currentSales = settings.saleProfiles || [];
    const globalSales = allSaleProfiles || currentSales;
    if (globalSales.some((s) => normalizeSaleKey(s.name) === cleanKey)) {
      setSaleFeedback({
        type: 'error',
        message: t.settings.errSaleNameExists.replace('{name}', cleanName),
      });
      return false;
    }
    const ownerAdminEmail = (session.operatorEmail || session.email).trim().toLowerCase();
    const cleanAvatar = String(avatarUrlInput || '').trim().slice(0, 2000);
    const nextSale: SaleProfile = {
      id: `sale-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      active: true,
      phone: phoneInput.trim(),
      ...(cleanAvatar ? { avatarUrl: cleanAvatar } : {}),
      ownerAdminEmail,
      createdAt: new Date().toISOString(),
    };
    const saved = await onSaveSettings({ saleProfiles: [...currentSales, nextSale] });
    if (saved === false) {
      setSaleFeedback({
        type: 'error',
        message: 'មិនអាចរក្សាទុកឈ្មោះ Sale ទៅកាន់ Cloud Firestore បានទេ! សូមពិនិត្យការតភ្ជាប់ រួចព្យាយាមម្ដងទៀត។',
      });
      return false;
    }
    if (!staff.some((st) => normalizeSaleKey(st.name) === cleanKey)) {
      await onSaveStaff({
        name: cleanName,
        position: t.staffInfo.defaultPosition,
        phone: phoneInput.trim(),
        address: '',
        photoUrl: cleanAvatar,
      });
    }
    setSaleFeedback({
      type: 'success',
      message: t.settings.saleAddedMsg.replace('{name}', cleanName),
    });
    return true;
  };

  const saleProfilesList = settings.saleProfiles || [];
  const rawAdminProfiles = settings.adminProfiles || [];
  const masterEmailClean = session.email.trim().toLowerCase();
  const adminProfilesList: AdminProfile[] = rawAdminProfiles.some(
    (a) => a.email.trim().toLowerCase() === masterEmailClean
  )
    ? rawAdminProfiles.map((a) => ({
        ...a,
        isMaster: a.isMaster || a.email.trim().toLowerCase() === masterEmailClean,
      }))
    : [
        {
          id: `adm-master`,
          name: settings.personalName || session.displayName || t.common.masterAdmin,
          email: masterEmailClean,
          isMaster: true,
          createdAt: session.createdAt || new Date().toISOString(),
        },
        ...rawAdminProfiles,
      ];

  const activeOperatorClean = (session.operatorEmail || session.email).trim().toLowerCase();
  const isMasterAdmin = isAdminRole && activeOperatorClean === masterEmailClean;
  const activeAdminEntry =
    adminProfilesList.find((a) => a.email.trim().toLowerCase() === activeOperatorClean) ||
    adminProfilesList[0];
  const licenseInfo = getLicenseRemainingSummary(license);
  const telegramUrl = license?.telegramUrl || DEFAULT_TELEGRAM_URL;

  const otherAdminSaleProfiles = isMasterAdmin
    ? (allSaleProfiles || []).filter(
        (sp) => (sp.ownerAdminEmail || masterEmailClean).trim().toLowerCase() !== masterEmailClean
      )
    : [];

  const handleMasterUploadSaleAvatar = async (sp: SaleProfile, file: File) => {
    if (!isMasterAdmin || isExpired || !onUpdateSaleAvatar) return;
    setSaleFeedback(null);
    setUploadingSaleAvatarId(sp.id);
    try {
      const uploadedUrl = await uploadProductPhotoUrl(file);
      const ok = await onUpdateSaleAvatar(sp.id, uploadedUrl);
      if (ok) {
        setSaleFeedback({
          type: 'success',
          message: `បានកំណត់រូបភាព Profile របស់ ${sp.name} រួចរាល់!`,
        });
      } else {
        setSaleFeedback({
          type: 'error',
          message: 'មិនអាចរក្សាទុករូបភាព Sale ទៅកាន់ Cloud Firestore បានទេ។',
        });
      }
    } catch {
      setSaleFeedback({
        type: 'error',
        message: 'មិនអាចផ្ទុកឡើងរូបភាពបានទេ! សូមពិនិត្យអ៊ីនធឺណិត រួចព្យាយាមម្ដងទៀត។',
      });
    } finally {
      setUploadingSaleAvatarId(null);
    }
  };

  const handleMasterClearSaleAvatar = async (sp: SaleProfile) => {
    if (!isMasterAdmin || isExpired || !onUpdateSaleAvatar) return;
    setSaleFeedback(null);
    setUploadingSaleAvatarId(sp.id);
    try {
      const ok = await onUpdateSaleAvatar(sp.id, '');
      if (ok) {
        setSaleFeedback({
          type: 'success',
          message: `បានលុបរូបភាព Profile របស់ ${sp.name} ចេញហើយ។`,
        });
      }
    } finally {
      setUploadingSaleAvatarId(null);
    }
  };

  const resolveSalePreviewAvatar = (sp: SaleProfile): string => {
    if (typeof sp.avatarUrl === 'string') return sp.avatarUrl.trim();
    const match = staff.find((st) => normalizeSaleKey(st.name) === normalizeSaleKey(sp.name));
    return (match?.photoUrl || '').trim();
  };

  const unlinkedStaffForSale = staff.filter(
    (st) => !saleProfilesList.some((sp) => sp.name.trim().toLowerCase() === st.name.trim().toLowerCase())
  );

  // Restricted Clean Settings View for Sale (Mobile & Tablet: ONLY Switch Account (Admin) + Sign out, always keeping Sale's own name)
  if (!isAdminRole) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
        <Surface className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-3.5 border-b border-border/60 pb-4">
            <Icon3D name="user" size={38} />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                {t.settings.userRestrictedTitle}
              </h2>
              <p className="mt-0.5 text-xs text-muted truncate">
                {t.settings.userRestrictedNameLabel}{' '}
                <strong className="text-primary">{session.saleName}</strong>
                <span aria-hidden="true"> · </span>
                <span>
                  {t.settings.saleActiveAdminPrefix}{' '}
                  <strong className="text-foreground">
                    {activeAdminEntry?.name || activeOperatorClean}
                  </strong>
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-control border border-border/70 bg-background/60 px-4 py-3.5 text-xs sm:text-sm text-muted leading-relaxed">
            {t.settings.userRestrictedNotice}
          </div>
        </Surface>

        {/* Per-Sale Personal Preferences (Dark Mode, Notification Sound, Language) */}
        <Surface className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3 border-b border-border/60 pb-4">
            <div className="h-10 w-10 rounded-control bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                {t.settings.salePersonalPrefsTitle}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {t.settings.salePersonalPrefsNote}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
            <Field label={t.settings.saleDarkModeLabel}>
              <Button
                type="button"
                tone={settings.darkMode ? 'primary' : 'quiet'}
                aria-pressed={Boolean(settings.darkMode)}
                onClick={() => onSaveSalePreferences?.({ darkMode: !settings.darkMode })}
                className="w-full h-11 px-3 text-xs sm:text-sm justify-center whitespace-nowrap"
              >
                {settings.darkMode ? (
                  <Moon className="h-4 w-4 shrink-0" />
                ) : (
                  <Sun className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {settings.darkMode ? t.settings.darkModeText : t.settings.lightModeText}
                </span>
              </Button>
            </Field>

            <Field label={t.settings.saleSoundLabel}>
              <Button
                type="button"
                tone={settings.soundEnabled ? 'primary' : 'quiet'}
                aria-pressed={Boolean(settings.soundEnabled)}
                onClick={() => onSaveSalePreferences?.({ soundEnabled: !settings.soundEnabled })}
                className="w-full h-11 px-3 text-xs sm:text-sm justify-center whitespace-nowrap"
              >
                {settings.soundEnabled ? (
                  <Volume2 className="h-4 w-4 shrink-0" />
                ) : (
                  <VolumeX className="h-4 w-4 shrink-0" />
                )}
                <span className="truncate">
                  {settings.soundEnabled ? t.settings.soundOn : t.settings.soundOff}
                </span>
              </Button>
            </Field>

            <Field label={t.settings.saleLanguageLabel} className="sm:col-span-2 lg:col-span-1">
              <select
                value={settings.language}
                onChange={(e) =>
                  onSaveSalePreferences?.({ language: e.target.value as LanguageCode })
                }
                className={inputClass}
              >
                <option value="kh">ភាសាខ្មែរ (KH)</option>
                <option value="en">English (EN)</option>
                <option value="kr">한국어 (KR)</option>
              </select>
            </Field>
          </div>
        </Surface>

        {/* Switch Account (Admin) — keeps Sale under their own session.saleName */}
        <Surface className="p-4 sm:p-6 space-y-4">
          <div className="flex items-start gap-3 border-b border-border/60 pb-4">
            <div className="h-10 w-10 rounded-control bg-primary/10 border border-primary/25 text-primary flex items-center justify-center shrink-0">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h3 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                {t.settings.saleSwitchAdminTitle}
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                {t.settings.saleSwitchAdminSubtitle}
              </p>
              <p className="text-xs font-medium text-primary">
                {t.settings.saleSwitchKeepNameNote}{' '}
                <span className="font-bold">{session.saleName}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {adminProfilesList.map((adm) => {
              const isMaster =
                adm.isMaster || adm.email.trim().toLowerCase() === masterEmailClean;
              const isCurrent = adm.email.trim().toLowerCase() === activeOperatorClean;
              return (
                <div
                  key={adm.id || adm.email}
                  className={`rounded-control border p-3.5 flex items-center justify-between gap-3 transition-colors ${
                    isCurrent
                      ? 'border-primary/70 bg-primary/8'
                      : 'border-border/70 bg-background/50'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
                      <span className="font-semibold text-foreground truncate">{adm.name}</span>
                      <span aria-hidden="true" className="text-muted">·</span>
                      <span
                        className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                          isMaster
                            ? 'text-primary'
                            : 'text-amber-700 dark:text-amber-300'
                        }`}
                      >
                        {isMaster ? t.common.masterAdmin : t.common.subAdmin}
                      </span>
                    </div>
                    <p className="text-xs text-muted truncate">{adm.email}</p>
                  </div>

                  <div className="shrink-0">
                    {isCurrent ? (
                      <span className="inline-flex min-h-11 sm:min-h-9 items-center gap-1 rounded-control bg-primary/12 px-3 py-1.5 text-xs font-semibold text-primary whitespace-nowrap">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.settings.currentlyActiveBadge}</span>
                      </span>
                    ) : (
                      <Button
                        tone="primary"
                        onClick={() => onSwitchOperatorEmail(adm.email)}
                        className="min-h-11 sm:min-h-10 px-3.5 text-xs whitespace-nowrap"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
                        <span>{t.settings.switchBtn}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {adminProfilesList.length <= 1 && (
            <p className="text-xs text-muted leading-relaxed">
              {t.settings.saleSingleAdminHint}
            </p>
          )}
        </Surface>

        {/* Sign Out */}
        <Surface className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-sm sm:text-base font-semibold text-foreground">
              {t.settings.userSignOutTitle}
            </h3>
            <p className="text-xs text-muted leading-relaxed">
              {t.settings.userSignOutSubtitle}
            </p>
          </div>
          <Button
            tone="danger"
            onClick={onLogout}
            className="w-full sm:w-auto min-h-11 shrink-0 whitespace-nowrap"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t.settings.signOutBtn}</span>
          </Button>
        </Surface>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
      {/* 1. License Validity & Expire Date Card */}
      <Surface
        className={`p-4 sm:p-6 space-y-4 ${
          isExpired ? 'border-danger/60 bg-danger/5' : 'border-primary/25'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`h-10 w-10 rounded-control flex items-center justify-center shrink-0 border ${
                isExpired
                  ? 'bg-danger/12 border-danger/35 text-danger'
                  : 'bg-primary/10 border-primary/25 text-primary'
              }`}
            >
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                {t.settings.licenseTitle}
              </h2>
              <p className="mt-0.5 text-xs text-muted truncate">
                {t.settings.masterAccountLabel}{' '}
                <strong className="text-foreground">{session.email}</strong>
              </p>
            </div>
          </div>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 sm:min-h-10 w-full sm:w-auto items-center justify-center gap-2 rounded-control bg-primary px-4 py-2 text-xs sm:text-sm font-semibold text-primary-foreground shadow-xs hover:brightness-105 transition-[filter] shrink-0 whitespace-nowrap"
          >
            <Send className="h-4 w-4 shrink-0" />
            <span>{t.header.contactDevTelegram}</span>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60 rounded-control border border-border/70 bg-background/55 overflow-hidden">
          <div className="px-4 py-3 space-y-1">
            <span className="text-muted block text-xs">{t.settings.planLabel}</span>
            <strong className="block text-sm font-semibold text-foreground">
              {license?.planType === 'paid' ? t.settings.planPaid : t.settings.planTrial}
            </strong>
          </div>
          <div className="px-4 py-3 space-y-1">
            <span className="text-muted block text-xs">{t.settings.expireDateLabel}</span>
            <strong
              className={`block text-sm font-semibold tabular-nums ${
                isExpired ? 'text-danger' : 'text-primary'
              }`}
            >
              {licenseInfo.formattedExpireDate}
            </strong>
          </div>
          <div className="px-4 py-3 space-y-1">
            <span className="text-muted block text-xs">{t.settings.statusLabel}</span>
            <strong
              className={`block text-sm font-semibold tabular-nums ${
                isExpired ? 'text-danger' : 'text-primary'
              }`}
            >
              {isExpired
                ? t.settings.statusExpired
                : licenseInfo.daysLeft <= 1
                ? t.settings.statusHoursLeft.replace('{n}', String(licenseInfo.hoursLeft))
                : t.settings.statusDaysLeft.replace('{n}', String(licenseInfo.daysLeft))}
            </strong>
          </div>
        </div>
      </Surface>

      {/* 2. Settings Form Cart Launcher Buttons (9 Categories) */}
      <Surface className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <Icon3D name="settings" size={38} />
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
              {t.settings.settingsMenusTitle}
            </h2>
            <p className="mt-0.5 text-xs text-muted leading-snug">
              {t.settings.settingsMenusSubtitle}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {([
            ...(canManageAdmins
              ? [
                  {
                    id: 'sub-admin' as SettingsModalId,
                    icon: 'shield' as const,
                    title: t.settings.subAdminHeading,
                    summary: `${t.settings.workspaceAdminsCount} ${adminProfilesList.length} · ${activeOperatorClean}`,
                  },
                ]
              : []),
            {
              id: 'sale-profiles' as SettingsModalId,
              icon: 'user' as const,
              title: t.settings.saleMgmtHeading,
              summary: `${saleProfilesList.length}`,
            },
            {
              id: 'personal-general' as SettingsModalId,
              icon: 'settings' as const,
              title: t.settings.personalInfoTitle,
              summary: `${settings.language.toUpperCase()} · ${settings.currency.toUpperCase()} · ${
                settings.darkMode ? t.settings.darkModeText : t.settings.lightModeText
              }`,
            },
            {
              id: 'access-control' as SettingsModalId,
              icon: 'shield' as const,
              title: t.settings.accessControlTitle,
              summary: session.operatorEmail || session.email,
            },
            {
              id: 'warehouses' as SettingsModalId,
              icon: 'warehouse' as const,
              title: t.settings.warehousesTitle,
              summary: `${settings.warehouses.length}`,
            },
            {
              id: 'stores' as SettingsModalId,
              icon: 'store' as const,
              title: t.settings.storesTitle,
              summary: `${settings.stores.length}`,
            },
            {
              id: 'groups' as SettingsModalId,
              icon: 'orders' as const,
              title: t.settings.groupsTitle,
              summary: `${settings.groups.length}`,
            },
            {
              id: 'categories' as SettingsModalId,
              icon: 'box' as const,
              title: t.settings.categoriesTitle,
              summary: `${settings.categories.length}`,
            },
            {
              id: 'staff' as SettingsModalId,
              icon: 'staff-info' as const,
              title: t.settings.staffMgmtTitle,
              summary: `${staff.length}`,
            },
          ]).map((item, idx, arr) => {
            const isLastOdd = arr.length % 2 === 1 && idx === arr.length - 1;
            return (
              <motion.button
                key={item.id}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                onClick={() => {
                  setPersonalSavedFeedback(false);
                  setActiveModal(item.id);
                }}
                className={`group flex w-full items-center justify-between gap-3 rounded-control border border-border/80 bg-background/60 p-3.5 sm:p-4 text-left shadow-xs hover:border-primary/65 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors cursor-pointer ${
                  isLastOdd ? 'md:col-span-2' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="shrink-0">
                    <Icon3D name={item.icon} size={36} />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="block text-xs sm:text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    <span className="block text-xs text-muted truncate tabular-nums">
                      {item.summary}
                    </span>
                  </div>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-border/70 bg-surface text-muted group-hover:border-primary/45 group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </span>
              </motion.button>
            );
          })}
        </div>
      </Surface>

      {/* Standard Animated Pop-Up Modal for the Selected Settings Form Cart */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            key={`settings-modal-backdrop-${activeModal}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              activeModal === 'sub-admin'
                ? t.settings.subAdminHeading
                : activeModal === 'sale-profiles'
                ? t.settings.saleMgmtHeading
                : activeModal === 'personal-general'
                ? t.settings.personalInfoTitle
                : activeModal === 'access-control'
                ? t.settings.accessControlTitle
                : activeModal === 'warehouses'
                ? t.settings.warehousesTitle
                : activeModal === 'stores'
                ? t.settings.storesTitle
                : activeModal === 'groups'
                ? t.settings.groupsTitle
                : activeModal === 'categories'
                ? t.settings.categoriesTitle
                : t.settings.staffMgmtTitle
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-foreground/60 backdrop-blur-[2px] p-0 sm:p-4"
          >
            <motion.div
              key={`settings-modal-card-${activeModal}`}
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full ${
                activeModal === 'warehouses' ||
                activeModal === 'stores' ||
                activeModal === 'groups' ||
                activeModal === 'categories'
                  ? 'max-w-xl'
                  : activeModal === 'personal-general' || activeModal === 'sale-profiles'
                  ? 'max-w-3xl'
                  : 'max-w-4xl'
              }`}
            >
              <Surface className="w-full max-h-[92dvh] sm:max-h-[88dvh] flex flex-col rounded-t-2xl sm:rounded-card shadow-float overflow-hidden">
                <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>

                {/* Modal Header */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-3.5 sm:py-4 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon3D
                      name={
                        activeModal === 'sub-admin' || activeModal === 'access-control'
                          ? 'shield'
                          : activeModal === 'sale-profiles'
                          ? 'user'
                          : activeModal === 'personal-general'
                          ? 'settings'
                          : activeModal === 'warehouses'
                          ? 'warehouse'
                          : activeModal === 'stores'
                          ? 'store'
                          : activeModal === 'groups'
                          ? 'orders'
                          : activeModal === 'categories'
                          ? 'box'
                          : 'staff-info'
                      }
                      size={36}
                    />
                    <div className="min-w-0">
                      <h2 className="text-sm sm:text-base font-semibold text-foreground leading-snug">
                        {activeModal === 'sub-admin' && t.settings.subAdminHeading}
                        {activeModal === 'sale-profiles' && t.settings.saleMgmtHeading}
                        {activeModal === 'personal-general' && t.settings.personalInfoTitle}
                        {activeModal === 'access-control' && t.settings.accessControlTitle}
                        {activeModal === 'warehouses' && t.settings.warehousesTitle}
                        {activeModal === 'stores' && t.settings.storesTitle}
                        {activeModal === 'groups' && t.settings.groupsTitle}
                        {activeModal === 'categories' && t.settings.categoriesTitle}
                        {activeModal === 'staff' && t.settings.staffMgmtTitle}
                      </h2>
                      <p className="mt-0.5 text-xs text-muted truncate">
                        {activeModal === 'sub-admin' &&
                          `${t.settings.masterPrefix} ${session.email} · ${t.settings.activePrefix} ${activeOperatorClean}`}
                        {activeModal === 'sale-profiles' &&
                          `${t.settings.saleMgmtHint.replace('{email}', session.email)}`}
                        {activeModal === 'personal-general' &&
                          `${t.settings.connectedGmailPrefix} ${session.email}`}
                        {activeModal === 'access-control' &&
                          `${t.settings.currentOperatorPrefix} ${session.operatorEmail || session.email}`}
                        {activeModal === 'warehouses' && `${settings.warehouses.length}`}
                        {activeModal === 'stores' && `${settings.stores.length}`}
                        {activeModal === 'groups' && `${settings.groups.length}`}
                        {activeModal === 'categories' && `${settings.categories.length}`}
                        {activeModal === 'staff' && t.settings.staffMgmtSubtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    aria-label={t.common.close}
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-control border border-border/70 bg-background text-muted hover:text-foreground hover:bg-background/80 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable Modal Body */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5">
                  {activeModal === 'sub-admin' && canManageAdmins && (
                    <>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted">
                        <p className="leading-relaxed">
                          {t.settings.subAdminHint1} {t.settings.subAdminHint2}
                        </p>
                        <span className="font-semibold text-foreground tabular-nums whitespace-nowrap shrink-0">
                          {t.settings.workspaceAdminsCount} {adminProfilesList.length}
                        </span>
                      </div>

                      <form
                        onSubmit={handleCreateSubAdminSubmit}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                      >
                        <Field label={t.settings.subAdminNameLabel} className="md:col-span-4">
                          <input
                            type="text"
                            disabled={isExpired}
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            placeholder={t.settings.subAdminNamePlaceholder}
                            className={inputClass}
                          />
                        </Field>
                        <Field label={t.settings.subAdminEmailLabel} className="md:col-span-5">
                          <input
                            type="email"
                            required
                            disabled={isExpired}
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            placeholder="admin2@gmail.com"
                            className={inputClass}
                          />
                        </Field>
                        <div className="md:col-span-3">
                          <Button
                            type="submit"
                            tone="primary"
                            disabled={isExpired || creatingAdminBusy}
                            className="w-full whitespace-nowrap"
                          >
                            <UserPlus className="h-4 w-4 shrink-0" />
                            <span>{creatingAdminBusy ? t.settings.creatingBtn : t.settings.createSubAdminBtn}</span>
                          </Button>
                        </div>
                      </form>

                      {adminActionFeedback && (
                        <div
                          role={adminActionFeedback.type === 'error' ? 'alert' : 'status'}
                          className={`rounded-control border px-3.5 py-2.5 text-xs font-medium flex items-center gap-2 ${
                            adminActionFeedback.type === 'error'
                              ? 'border-danger/45 bg-danger/10 text-danger'
                              : 'border-primary/40 bg-primary/10 text-foreground'
                          }`}
                        >
                          {adminActionFeedback.type === 'error' ? (
                            <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                          <span>{adminActionFeedback.message}</span>
                        </div>
                      )}

                      <div className="space-y-2.5 border-t border-border/60 pt-5">
                        <span className="block text-xs font-semibold text-foreground">
                          {t.settings.switchAccountHeading}
                        </span>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {adminProfilesList.map((adm) => {
                            const isMaster =
                              adm.isMaster || adm.email.trim().toLowerCase() === masterEmailClean;
                            const isCurrent = adm.email.trim().toLowerCase() === activeOperatorClean;
                            return (
                              <div
                                key={adm.id || adm.email}
                                className={`rounded-control border p-3.5 flex items-center justify-between gap-3 transition-colors ${
                                  isCurrent
                                    ? 'border-primary/70 bg-primary/8'
                                    : 'border-border/70 bg-background/50'
                                }`}
                              >
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-xs sm:text-sm min-w-0">
                                    <span className="font-semibold text-foreground truncate">{adm.name}</span>
                                    <span aria-hidden="true" className="text-muted">·</span>
                                    <span
                                      className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                                        isMaster
                                          ? 'text-primary'
                                          : 'text-amber-700 dark:text-amber-300'
                                      }`}
                                    >
                                      {isMaster ? t.common.masterAdmin : t.common.subAdmin}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted truncate">{adm.email}</p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCurrent ? (
                                    <span className="inline-flex min-h-9 items-center gap-1 rounded-control bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary whitespace-nowrap">
                                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                      <span>{t.settings.currentlyActiveBadge}</span>
                                    </span>
                                  ) : (
                                    <Button
                                      tone="quiet"
                                      onClick={() => onSwitchOperatorEmail(adm.email)}
                                      className="min-h-9 px-3 text-xs whitespace-nowrap"
                                    >
                                      <ArrowLeftRight className="h-3.5 w-3.5 text-primary shrink-0" />
                                      <span>{t.settings.switchBtn}</span>
                                    </Button>
                                  )}
                                  {!isMaster && !isExpired && (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const filtered = adminProfilesList.filter(
                                          (x) => x.email.toLowerCase() !== adm.email.toLowerCase()
                                        );
                                        await onSaveSettings({ adminProfiles: filtered });
                                        if (isCurrent) {
                                          await onSwitchOperatorEmail(masterEmailClean);
                                        }
                                      }}
                                      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-control text-danger hover:bg-danger/10 cursor-pointer"
                                      aria-label={`${t.common.delete} ${adm.name}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <form
                        onSubmit={handleSetPasswordSubmit}
                        className="border-t border-border/60 pt-5 space-y-3"
                      >
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-primary shrink-0" />
                            <span>{t.settings.setPasswordTitle.replace('{email}', session.email)}</span>
                          </p>
                          <p className="text-xs text-muted mt-0.5 leading-relaxed">
                            {t.settings.setPasswordHint}
                          </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <Field label={t.settings.newPasswordLabel} className="md:col-span-4">
                            <input
                              type="password"
                              minLength={6}
                              disabled={isExpired}
                              value={saleLoginPw}
                              onChange={(e) => setSaleLoginPw(e.target.value)}
                              placeholder="••••••••"
                              className={inputClass}
                            />
                          </Field>
                          <Field label={t.settings.confirmPasswordLabel} className="md:col-span-4">
                            <input
                              type="password"
                              minLength={6}
                              disabled={isExpired}
                              value={saleLoginPwConfirm}
                              onChange={(e) => setSaleLoginPwConfirm(e.target.value)}
                              placeholder="••••••••"
                              className={inputClass}
                            />
                          </Field>
                          <div className="md:col-span-4">
                            <Button
                              type="submit"
                              tone="quiet"
                              disabled={isExpired || settingPwBusy}
                              className="w-full whitespace-nowrap"
                            >
                              <KeyRound className="h-4 w-4 text-primary shrink-0" />
                              <span>
                                {settingPwBusy ? t.settings.savingPasswordBtn : t.settings.savePasswordBtn}
                              </span>
                            </Button>
                          </div>
                        </div>
                        {pwFeedback && (
                          <p
                            role={pwFeedback.type === 'error' ? 'alert' : 'status'}
                            className={`text-xs font-medium ${
                              pwFeedback.type === 'error' ? 'text-danger' : 'text-primary'
                            }`}
                          >
                            {pwFeedback.message}
                          </p>
                        )}
                      </form>
                    </>
                  )}

                  {activeModal === 'sale-profiles' && (
                    <>
                      <div className="flex items-center justify-between gap-2 text-xs text-muted">
                        <p className="leading-relaxed">
                          {t.settings.saleMgmtHint.replace('{email}', session.email)}
                        </p>
                        <span className="font-semibold text-foreground tabular-nums whitespace-nowrap shrink-0 flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{saleProfilesList.length}</span>
                        </span>
                      </div>

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const ok = await addSaleProfile(newSaleName, newSalePhone);
                          if (ok) {
                            setNewSaleName('');
                            setNewSalePhone('');
                          }
                        }}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                      >
                        <Field label={t.settings.saleNameLabel} className="md:col-span-5">
                          <input
                            type="text"
                            autoFocus
                            value={newSaleName}
                            onChange={(e) => setNewSaleName(e.target.value)}
                            placeholder={t.settings.saleNamePlaceholder}
                            className={inputClass}
                          />
                        </Field>
                        <Field label={t.settings.salePhoneOptionalLabel} className="md:col-span-4">
                          <input
                            type="tel"
                            value={newSalePhone}
                            onChange={(e) => setNewSalePhone(e.target.value)}
                            placeholder="012 345 678"
                            className={inputClass}
                          />
                        </Field>
                        <div className="md:col-span-3">
                          <Button
                            type="submit"
                            tone="primary"
                            disabled={isExpired}
                            className="w-full whitespace-nowrap"
                          >
                            <Plus className="h-4 w-4 shrink-0" />
                            <span>{t.settings.addSaleBtn}</span>
                          </Button>
                        </div>
                      </form>

                      {unlinkedStaffForSale.length > 0 && (
                        <div className="space-y-2 border-t border-border/50 pt-4">
                          <span className="block text-xs text-muted">
                            {t.settings.quickAddFromStaffHint}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {unlinkedStaffForSale.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                disabled={isExpired}
                                onClick={() => addSaleProfile(st.name, st.phone, st.photoUrl)}
                                className="inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-control border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>{st.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {saleFeedback && (
                        <p
                          role={saleFeedback.type === 'error' ? 'alert' : 'status'}
                          className={`text-xs font-medium ${
                            saleFeedback.type === 'error' ? 'text-danger' : 'text-primary'
                          }`}
                        >
                          {saleFeedback.message}
                        </p>
                      )}

                      <div className="divide-y divide-border/50 rounded-control border border-border/70 bg-background/45 px-3.5 sm:px-4">
                        {saleProfilesList.length === 0 ? (
                          <p className="py-5 text-xs text-muted text-center">
                            {t.settings.noSaleProfiles}
                          </p>
                        ) : (
                          saleProfilesList.map((sp) => {
                            const previewUrl = resolveSalePreviewAvatar(sp);
                            const isBusyAvatar = uploadingSaleAvatarId === sp.id;
                            return (
                              <div
                                key={sp.id}
                                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs sm:text-sm"
                              >
                                <div className="min-w-0 flex items-center gap-3">
                                  {/* Sale Profile Avatar Preview */}
                                  <button
                                    type="button"
                                    disabled={!previewUrl}
                                    onClick={() => previewUrl && onZoomImage(previewUrl, sp.name)}
                                    className={`h-11 w-11 shrink-0 rounded-full p-[2px] ${
                                      previewUrl
                                        ? 'bg-gradient-to-tr from-[#22c8e5] via-[#2ed7cb] to-[#49e3c4] cursor-pointer'
                                        : 'bg-border/70 cursor-default'
                                    }`}
                                    aria-label={sp.name}
                                  >
                                    <div className="h-full w-full rounded-full bg-surface overflow-hidden flex items-center justify-center text-xs font-bold text-muted">
                                      {previewUrl ? (
                                        <img
                                          src={previewUrl}
                                          alt={sp.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        sp.name.slice(0, 2).toUpperCase()
                                      )}
                                    </div>
                                  </button>

                                  <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span className="font-semibold text-foreground">{sp.name}</span>
                                    {sp.phone && (
                                      <span className="text-xs text-muted tabular-nums">({sp.phone})</span>
                                    )}
                                    <span aria-hidden="true" className="text-muted">·</span>
                                    <span
                                      className={`text-xs font-semibold ${
                                        sp.active ? 'text-primary' : 'text-danger'
                                      }`}
                                    >
                                      {sp.active ? t.settings.saleAllowed : t.settings.saleDisabled}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  {isMasterAdmin && onUpdateSaleAvatar && (
                                    <div className="inline-flex items-center gap-1">
                                      <label
                                        className={`inline-flex min-h-10 sm:min-h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors ${
                                          isExpired || isBusyAvatar
                                            ? 'opacity-50 pointer-events-none'
                                            : 'cursor-pointer'
                                        }`}
                                      >
                                        {isBusyAvatar ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                                        ) : (
                                          <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
                                        )}
                                        <span className="whitespace-nowrap">
                                          {previewUrl ? 'ប្ដូររូប' : 'ដាក់រូប'}
                                        </span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          disabled={isExpired || isBusyAvatar}
                                          onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            e.target.value = '';
                                            if (f) void handleMasterUploadSaleAvatar(sp, f);
                                          }}
                                          className="hidden"
                                        />
                                      </label>
                                      {previewUrl && (
                                        <button
                                          type="button"
                                          disabled={isExpired || isBusyAvatar}
                                          onClick={() => void handleMasterClearSaleAvatar(sp)}
                                          title="លុបរូបភាព Profile"
                                          aria-label={`លុបរូបភាព ${sp.name}`}
                                          className="inline-flex min-h-10 min-w-9 sm:min-h-9 sm:min-w-8 items-center justify-center rounded-control border border-border/80 bg-surface text-muted hover:text-danger hover:border-danger/50 cursor-pointer disabled:opacity-50"
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  <Button
                                    tone={sp.active ? 'quiet' : 'primary'}
                                    disabled={isExpired}
                                    onClick={() =>
                                      onSaveSettings({
                                        saleProfiles: saleProfilesList.map((x) =>
                                          x.id === sp.id ? { ...x, active: !x.active } : x
                                        ),
                                      })
                                    }
                                    className="flex-1 sm:flex-initial min-h-10 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                                  >
                                    {sp.active ? t.settings.disableSaleAccess : t.settings.enableSaleAccess}
                                  </Button>
                                  <button
                                    type="button"
                                    disabled={isExpired}
                                    onClick={() =>
                                      onSaveSettings({
                                        saleProfiles: saleProfilesList.filter((x) => x.id !== sp.id),
                                      })
                                    }
                                    className="inline-flex min-h-10 min-w-10 sm:min-h-9 sm:min-w-9 items-center justify-center rounded-control text-danger hover:bg-danger/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                    aria-label={`${t.common.delete} ${sp.name}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Master Admin can also set/change profile photos for Sub-Admin Sales */}
                      {isMasterAdmin && onUpdateSaleAvatar && otherAdminSaleProfiles.length > 0 && (
                        <div className="space-y-2 border-t border-border/50 pt-4">
                          <span className="block text-xs font-semibold text-muted">
                            កំណត់រូបភាព Sale របស់ Sub-Admin ({otherAdminSaleProfiles.length})
                          </span>
                          <div className="divide-y divide-border/50 rounded-control border border-border/70 bg-background/45 px-3.5 sm:px-4">
                            {otherAdminSaleProfiles.map((sp) => {
                              const previewUrl = resolveSalePreviewAvatar(sp);
                              const isBusyAvatar = uploadingSaleAvatarId === sp.id;
                              return (
                                <div
                                  key={sp.id}
                                  className="py-2.5 flex items-center justify-between gap-2.5 text-xs sm:text-sm"
                                >
                                  <div className="min-w-0 flex items-center gap-3">
                                    <button
                                      type="button"
                                      disabled={!previewUrl}
                                      onClick={() => previewUrl && onZoomImage(previewUrl, sp.name)}
                                      className={`h-10 w-10 shrink-0 rounded-full p-[2px] ${
                                        previewUrl
                                          ? 'bg-gradient-to-tr from-[#22c8e5] via-[#2ed7cb] to-[#49e3c4] cursor-pointer'
                                          : 'bg-border/70 cursor-default'
                                      }`}
                                      aria-label={sp.name}
                                    >
                                      <div className="h-full w-full rounded-full bg-surface overflow-hidden flex items-center justify-center text-xs font-bold text-muted">
                                        {previewUrl ? (
                                          <img
                                            src={previewUrl}
                                            alt={sp.name}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          sp.name.slice(0, 2).toUpperCase()
                                        )}
                                      </div>
                                    </button>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-foreground truncate">{sp.name}</p>
                                      {sp.ownerAdminEmail && (
                                        <p className="text-[11px] text-muted truncate">
                                          {sp.ownerAdminEmail}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="inline-flex items-center gap-1 shrink-0">
                                    <label
                                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border bg-surface px-2.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition-colors ${
                                        isExpired || isBusyAvatar
                                          ? 'opacity-50 pointer-events-none'
                                          : 'cursor-pointer'
                                      }`}
                                    >
                                      {isBusyAvatar ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                                      ) : (
                                        <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
                                      )}
                                      <span className="whitespace-nowrap">
                                        {previewUrl ? 'ប្ដូររូប' : 'ដាក់រូប'}
                                      </span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        disabled={isExpired || isBusyAvatar}
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          e.target.value = '';
                                          if (f) void handleMasterUploadSaleAvatar(sp, f);
                                        }}
                                        className="hidden"
                                      />
                                    </label>
                                    {previewUrl && (
                                      <button
                                        type="button"
                                        disabled={isExpired || isBusyAvatar}
                                        onClick={() => void handleMasterClearSaleAvatar(sp)}
                                        title="លុបរូបភាព Profile"
                                        aria-label={`លុបរូបភាព ${sp.name}`}
                                        className="inline-flex min-h-9 min-w-8 items-center justify-center rounded-control border border-border/80 bg-surface text-muted hover:text-danger hover:border-danger/50 cursor-pointer disabled:opacity-50"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {activeModal === 'personal-general' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field label={t.settings.fieldPersonalName}>
                          <input
                            type="text"
                            disabled={isExpired}
                            value={personalName}
                            onChange={(e) => {
                              setPersonalName(e.target.value);
                              setPersonalSavedFeedback(false);
                            }}
                            className={inputClass}
                          />
                        </Field>
                        <Field label={t.settings.fieldPersonalPhone}>
                          <input
                            type="tel"
                            disabled={isExpired}
                            value={personalPhone}
                            onChange={(e) => {
                              setPersonalPhone(e.target.value);
                              setPersonalSavedFeedback(false);
                            }}
                            className={inputClass}
                          />
                        </Field>
                        <Field label={t.settings.fieldBusinessName} className="sm:col-span-2 lg:col-span-1">
                          <input
                            type="text"
                            disabled={isExpired}
                            value={businessName}
                            onChange={(e) => {
                              setBusinessName(e.target.value);
                              setPersonalSavedFeedback(false);
                            }}
                            className={inputClass}
                          />
                        </Field>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-h-5">
                          {personalSavedFeedback && (
                            <p role="status" className="text-xs font-medium text-primary flex items-center gap-1.5">
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                              <span>{t.settings.savedFeedbackMsg}</span>
                            </p>
                          )}
                        </div>
                        <Button
                          tone="primary"
                          disabled={isExpired}
                          onClick={async () => {
                            await onSaveSettings({
                              personalName: personalName.trim(),
                              personalPhone: personalPhone.trim(),
                              businessName: businessName.trim(),
                            });
                            setPersonalSavedFeedback(true);
                          }}
                          className="w-full sm:w-auto whitespace-nowrap"
                        >
                          <Icon3D name="check" size={18} />
                          <span>{t.settings.savePersonalInfoBtn}</span>
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-border/60 pt-5 items-end">
                        <div className="space-y-1.5">
                          <span className="block text-[13px] sm:text-sm font-medium text-foreground leading-relaxed">
                            {t.settings.darkModeSoundLabel}
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              tone={settings.darkMode ? 'primary' : 'quiet'}
                              disabled={isExpired}
                              onClick={() => onSaveSettings({ darkMode: !settings.darkMode })}
                              className="w-full px-2.5 text-xs sm:text-[13px] whitespace-nowrap"
                            >
                              {settings.darkMode ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
                              <span className="truncate">
                                {settings.darkMode ? t.settings.darkModeText : t.settings.lightModeText}
                              </span>
                            </Button>

                            <Button
                              tone={settings.soundEnabled ? 'primary' : 'quiet'}
                              disabled={isExpired}
                              onClick={() => onSaveSettings({ soundEnabled: !settings.soundEnabled })}
                              className="w-full px-2.5 text-xs sm:text-[13px] whitespace-nowrap"
                            >
                              <span className="truncate">
                                {settings.soundEnabled ? t.settings.soundOn : t.settings.soundOff}
                              </span>
                            </Button>
                          </div>
                        </div>

                        <Field label={t.settings.languageLabel}>
                          <select
                            disabled={isExpired}
                            value={settings.language}
                            onChange={(e) => onSaveSettings({ language: e.target.value as LanguageCode })}
                            className={inputClass}
                          >
                            <option value="kh">ភាសាខ្មែរ (KH)</option>
                            <option value="en">English (EN)</option>
                            <option value="kr">한국어 (KR)</option>
                          </select>
                        </Field>

                        <Field label={t.settings.currencyLabel} className="sm:col-span-2 lg:col-span-1">
                          <select
                            disabled={isExpired}
                            value={settings.currency}
                            onChange={(e) => onSaveSettings({ currency: e.target.value as CurrencyCode })}
                            className={inputClass}
                          >
                            <option value="en">USD ($) — EN</option>
                            <option value="kh">រៀលខ្មែរ (៛) — KH</option>
                            <option value="kr">원화 KRW (₩) — KR</option>
                          </select>
                        </Field>
                      </div>
                    </>
                  )}

                  {activeModal === 'access-control' && (
                    <>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div className="space-y-2.5">
                          <span className="block text-xs font-medium text-muted leading-snug">
                            {t.settings.selectAddEmailRule}
                          </span>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="email"
                              value={newRuleEmailInput}
                              onChange={(e) => setNewRuleEmailInput(e.target.value)}
                              placeholder={t.settings.placeholderStaffEmail}
                              className={`${inputClass} flex-1 min-w-0`}
                            />
                            <Button
                              tone="quiet"
                              onClick={() => {
                                const clean = newRuleEmailInput.trim().toLowerCase();
                                if (!clean) return;
                                setTargetRuleEmail(clean);
                                setNewRuleEmailInput('');
                              }}
                              className="w-full sm:w-auto shrink-0 whitespace-nowrap"
                            >
                              {t.settings.selectBtn}
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {Array.from(
                              new Set([
                                session.email,
                                session.operatorEmail,
                                ...settings.accessRules.map((r) => r.email),
                              ].filter(Boolean))
                            ).map((em) => (
                              <button
                                key={em}
                                type="button"
                                onClick={() => setTargetRuleEmail(em)}
                                className={`min-h-10 sm:min-h-8 rounded-control border px-3 py-1 text-xs font-medium cursor-pointer max-w-full truncate transition-colors ${
                                  normalizedTargetEmail === em.toLowerCase()
                                    ? 'border-primary bg-primary/12 text-primary'
                                    : 'border-border bg-background text-muted hover:text-foreground'
                                }`}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          <span className="block text-xs font-medium text-muted leading-snug">
                            {t.settings.switchOperatorMachineLabel}
                          </span>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="email"
                              value={activeOperatorInput}
                              onChange={(e) => setActiveOperatorInput(e.target.value)}
                              className={`${inputClass} flex-1 min-w-0`}
                            />
                            <Button
                              tone="quiet"
                              onClick={() => onSwitchOperatorEmail(activeOperatorInput)}
                              className="w-full sm:w-auto shrink-0 whitespace-nowrap"
                            >
                              <Shield className="h-4 w-4 text-primary shrink-0" />
                              <span>{t.settings.applyOnDeviceBtn}</span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 border-t border-border/60 pt-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-foreground">{t.settings.hideOtherSalesTitle}</p>
                            <p className="text-xs text-muted leading-relaxed">
                              {t.settings.hideOtherSalesHintPrefix.replace('{email}', normalizedTargetEmail)}
                              {t.settings.hideOtherSalesHintSuffix}
                            </p>
                          </div>
                          <Button
                            tone={currentRule.hideOtherUsersSales ? 'primary' : 'quiet'}
                            onClick={() =>
                              updateAccessRule({ hideOtherUsersSales: !currentRule.hideOtherUsersSales })
                            }
                            className="w-full sm:w-auto sm:min-w-48 whitespace-normal text-center shrink-0"
                          >
                            {currentRule.hideOtherUsersSales ? t.settings.hideOtherSalesOn : t.settings.hideOtherSalesOff}
                          </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/50 pt-4">
                          <div className="min-w-0 space-y-0.5">
                            <p className="text-sm font-semibold text-foreground">{t.settings.hideWarehouseTitle}</p>
                            <p className="text-xs text-muted leading-relaxed">
                              {t.settings.hideWarehouseHint}
                            </p>
                          </div>
                          <Button
                            tone={currentRule.hideWarehouseReports ? 'primary' : 'quiet'}
                            onClick={() =>
                              updateAccessRule({ hideWarehouseReports: !currentRule.hideWarehouseReports })
                            }
                            className="w-full sm:w-auto sm:min-w-48 whitespace-normal text-center shrink-0"
                          >
                            {currentRule.hideWarehouseReports ? t.settings.hideWarehouseOn : t.settings.hideWarehouseOff}
                          </Button>
                        </div>

                        <div className="space-y-3 border-t border-border/50 pt-4">
                          <div className="space-y-0.5">
                            <p className="text-sm font-semibold text-foreground">
                              {t.settings.blockedPagesTitle.replace('{email}', normalizedTargetEmail)}
                            </p>
                            <p className="text-xs text-muted">{t.settings.blockedPagesHint}</p>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                            {BLOCKABLE_PAGE_IDS.map((pgId) => {
                              const isBlocked = currentRule.blockedPages.includes(pgId);
                              return (
                                <Button
                                  key={pgId}
                                  tone={isBlocked ? 'danger' : 'quiet'}
                                  onClick={() => toggleBlockedPage(pgId)}
                                  className="w-full min-h-11 sm:min-h-10 px-2.5 text-xs whitespace-normal text-center leading-tight"
                                >
                                  {isBlocked
                                    ? `${t.settings.pageBlockedPrefix} ${t.nav[pgId]}`
                                    : `${t.settings.pageAllowedPrefix} ${t.nav[pgId]}`}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {activeModal === 'warehouses' && (
                    <div className="flex flex-col gap-4">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (isExpired) return;
                          const v = newWarehouse.trim();
                          if (!v || settings.warehouses.includes(v)) return;
                          onSaveSettings({ warehouses: [...settings.warehouses, v] });
                          setNewWarehouse('');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          autoFocus
                          disabled={isExpired}
                          value={newWarehouse}
                          onChange={(e) => setNewWarehouse(e.target.value)}
                          placeholder={t.settings.warehousesPlaceholder}
                          className={`${inputClass} flex-1 min-w-0`}
                        />
                        <Button type="submit" tone="primary" disabled={isExpired} className="shrink-0 whitespace-nowrap">
                          <Plus className="h-4 w-4 shrink-0" />
                          <span>{t.common.add}</span>
                        </Button>
                      </form>
                      <div className="max-h-72 overflow-y-auto divide-y divide-border/45 rounded-control border border-border/60 bg-background/40 px-3">
                        {settings.warehouses.length === 0 ? (
                          <p className="py-5 text-xs text-muted text-center">{t.settings.emptyWarehouses}</p>
                        ) : null}
                        {settings.warehouses.map((w) => (
                          <div key={w} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{w}</span>
                            {!isExpired && (
                              <button
                                type="button"
                                onClick={() =>
                                  onSaveSettings({
                                    warehouses: settings.warehouses.filter((item) => item !== w),
                                  })
                                }
                                className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-control text-danger hover:bg-danger/10 cursor-pointer shrink-0"
                                aria-label={`${t.common.delete} ${w}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeModal === 'stores' && (
                    <div className="flex flex-col gap-4">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (isExpired) return;
                          const v = newStore.trim();
                          if (!v || settings.stores.includes(v)) return;
                          onSaveSettings({ stores: [...settings.stores, v] });
                          setNewStore('');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          autoFocus
                          disabled={isExpired}
                          value={newStore}
                          onChange={(e) => setNewStore(e.target.value)}
                          placeholder={t.settings.storesPlaceholder}
                          className={`${inputClass} flex-1 min-w-0`}
                        />
                        <Button type="submit" tone="primary" disabled={isExpired} className="shrink-0 whitespace-nowrap">
                          <Plus className="h-4 w-4 shrink-0" />
                          <span>{t.common.add}</span>
                        </Button>
                      </form>
                      <div className="max-h-72 overflow-y-auto divide-y divide-border/45 rounded-control border border-border/60 bg-background/40 px-3">
                        {settings.stores.length === 0 ? (
                          <p className="py-5 text-xs text-muted text-center">{t.settings.emptyStores}</p>
                        ) : null}
                        {settings.stores.map((s) => (
                          <div key={s} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{s}</span>
                            {!isExpired && (
                              <button
                                type="button"
                                onClick={() =>
                                  onSaveSettings({
                                    stores: settings.stores.filter((item) => item !== s),
                                  })
                                }
                                className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-control text-danger hover:bg-danger/10 cursor-pointer shrink-0"
                                aria-label={`${t.common.delete} ${s}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeModal === 'groups' && (
                    <div className="flex flex-col gap-4">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (isExpired) return;
                          const v = newGroup.trim();
                          if (!v || settings.groups.includes(v)) return;
                          onSaveSettings({ groups: [...settings.groups, v] });
                          setNewGroup('');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          autoFocus
                          disabled={isExpired}
                          value={newGroup}
                          onChange={(e) => setNewGroup(e.target.value)}
                          placeholder={t.settings.groupsPlaceholder}
                          className={`${inputClass} flex-1 min-w-0`}
                        />
                        <Button type="submit" tone="primary" disabled={isExpired} className="shrink-0 whitespace-nowrap">
                          <Plus className="h-4 w-4 shrink-0" />
                          <span>{t.common.add}</span>
                        </Button>
                      </form>
                      <div className="max-h-72 overflow-y-auto divide-y divide-border/45 rounded-control border border-border/60 bg-background/40 px-3">
                        {settings.groups.length === 0 ? (
                          <p className="py-5 text-xs text-muted text-center">{t.settings.emptyGroups}</p>
                        ) : null}
                        {settings.groups.map((g) => (
                          <div key={g} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{g}</span>
                            {!isExpired && (
                              <button
                                type="button"
                                onClick={() =>
                                  onSaveSettings({
                                    groups: settings.groups.filter((item) => item !== g),
                                  })
                                }
                                className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-control text-danger hover:bg-danger/10 cursor-pointer shrink-0"
                                aria-label={`${t.common.delete} ${g}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeModal === 'categories' && (
                    <div className="flex flex-col gap-4">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (isExpired) return;
                          const v = newCategory.trim();
                          if (!v || settings.categories.includes(v)) return;
                          onSaveSettings({ categories: [...settings.categories, v] });
                          setNewCategory('');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          autoFocus
                          disabled={isExpired}
                          value={newCategory}
                          onChange={(e) => setNewCategory(e.target.value)}
                          placeholder={t.settings.categoriesPlaceholder}
                          className={`${inputClass} flex-1 min-w-0`}
                        />
                        <Button type="submit" tone="primary" disabled={isExpired} className="shrink-0 whitespace-nowrap">
                          <Plus className="h-4 w-4 shrink-0" />
                          <span>{t.common.add}</span>
                        </Button>
                      </form>
                      <div className="max-h-72 overflow-y-auto divide-y divide-border/45 rounded-control border border-border/60 bg-background/40 px-3">
                        {settings.categories.length === 0 ? (
                          <p className="py-5 text-xs text-muted text-center">{t.settings.emptyCategories}</p>
                        ) : null}
                        {settings.categories.map((c) => (
                          <div key={c} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{c}</span>
                            {!isExpired && (
                              <button
                                type="button"
                                onClick={() =>
                                  onSaveSettings({
                                    categories: settings.categories.filter((item) => item !== c),
                                  })
                                }
                                className="inline-flex min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 items-center justify-center rounded-control text-danger hover:bg-danger/10 cursor-pointer shrink-0"
                                aria-label={`${t.common.delete} ${c}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeModal === 'staff' && (
                    <>
                      <form
                        onSubmit={handleSaveStaffForm}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end"
                      >
                        <Field label={t.settings.staffFieldName}>
                          <input
                            type="text"
                            required
                            autoFocus
                            disabled={isExpired}
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            placeholder={t.settings.staffPlaceholderName}
                            className={inputClass}
                          />
                        </Field>

                        <Field label={t.settings.staffFieldPosition}>
                          <input
                            type="text"
                            disabled={isExpired}
                            value={staffPosition}
                            onChange={(e) => setStaffPosition(e.target.value)}
                            placeholder={t.settings.staffPlaceholderPosition}
                            className={inputClass}
                          />
                        </Field>

                        <Field label={t.settings.staffFieldPhone}>
                          <input
                            type="tel"
                            disabled={isExpired}
                            value={staffPhone}
                            onChange={(e) => setStaffPhone(e.target.value)}
                            placeholder="012 345 678"
                            className={inputClass}
                          />
                        </Field>

                        <Field label={t.settings.staffFieldAddress}>
                          <input
                            type="text"
                            disabled={isExpired}
                            value={staffAddress}
                            onChange={(e) => setStaffAddress(e.target.value)}
                            placeholder={t.settings.staffPlaceholderAddress}
                            className={inputClass}
                          />
                        </Field>

                        <Field label={t.settings.staffFieldPhoto}>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-control border border-dashed border-primary/50 bg-background px-3 py-2 text-xs font-medium hover:border-primary transition-colors">
                              <Upload className="h-4 w-4 text-primary shrink-0" />
                              <span className="truncate">
                                {uploadingStaffPhoto ? t.settings.staffUploading : t.settings.staffChoosePhoto}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                disabled={isExpired}
                                onChange={handleStaffPhotoUpload}
                                className="hidden"
                              />
                            </label>
                            {staffPhoto && (
                              <ProductImage
                                src={staffPhoto}
                                alt={staffName || t.common.staff}
                                className="h-11 w-11 shrink-0"
                                onZoom={onZoomImage}
                              />
                            )}
                          </div>
                        </Field>

                        <div className="flex items-center gap-2">
                          {editingStaffId && (
                            <Button
                              tone="quiet"
                              onClick={() => {
                                setEditingStaffId(null);
                                setStaffName('');
                                setStaffPhoto('');
                                setStaffPosition('');
                                setStaffPhone('');
                                setStaffAddress('');
                              }}
                              className="shrink-0 whitespace-nowrap"
                            >
                              {t.common.cancel}
                            </Button>
                          )}
                          <Button
                            type="submit"
                            tone="primary"
                            disabled={isExpired || uploadingStaffPhoto}
                            className="flex-1 whitespace-nowrap"
                          >
                            <Icon3D name="check" size={18} />
                            <span>{t.settings.staffSaveBtn}</span>
                          </Button>
                        </div>
                      </form>

                      <div className="divide-y divide-border/50 rounded-control border border-border/70 bg-background/45 px-3.5 sm:px-4">
                        {staff.length === 0 ? (
                          <p className="py-5 text-xs text-muted text-center">{t.settings.emptyStaffList}</p>
                        ) : null}
                        {staff.map((st) => (
                          <div
                            key={st.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {st.photoUrl ? (
                                <ProductImage
                                  src={st.photoUrl}
                                  alt={st.name}
                                  className="h-11 w-11 shrink-0"
                                  onZoom={onZoomImage}
                                />
                              ) : (
                                <Icon3D name="user" size={34} />
                              )}
                              <div className="min-w-0 space-y-0.5">
                                <p className="font-semibold text-foreground truncate">{st.name}</p>
                                <p className="text-xs text-muted truncate tabular-nums">
                                  {st.position} · {st.phone || '-'} · {st.address || '-'}
                                </p>
                              </div>
                            </div>
                            {!isExpired && (
                              <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                                <Button
                                  tone="quiet"
                                  onClick={() => {
                                    setEditingStaffId(st.id);
                                    setStaffName(st.name);
                                    setStaffPhoto(st.photoUrl);
                                    setStaffPosition(st.position);
                                    setStaffPhone(st.phone);
                                    setStaffAddress(st.address);
                                  }}
                                  className="min-h-10 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                                >
                                  {t.common.edit}
                                </Button>
                                <Button
                                  tone="danger"
                                  onClick={() => onDeleteStaff(st.id)}
                                  className="min-h-10 sm:min-h-9 px-3 text-xs whitespace-nowrap"
                                >
                                  {t.common.delete}
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2.5 border-t border-border/60 bg-background/60 px-4 sm:px-6 py-3 shrink-0 pb-safe">
                  <Button tone="quiet" onClick={() => setActiveModal(null)} className="w-full sm:w-auto">
                    {t.common.close}
                  </Button>
                </div>
              </Surface>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 8. Sign out & Delete Account */}
      <Surface className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <h3 className="text-sm sm:text-base font-semibold text-foreground">
            {t.settings.accountSessionTitle}
          </h3>
          {t.settings.accountSessionSubtitle && (
            <p className="text-xs text-muted leading-relaxed">
              {t.settings.accountSessionSubtitle}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:flex sm:items-center gap-2.5 shrink-0">
          <Button tone="quiet" onClick={onLogout} className="w-full sm:w-auto whitespace-nowrap">
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{t.settings.signOutSwitchBtn}</span>
          </Button>
          {activeOperatorClean === masterEmailClean && (
            <Button
              tone="danger"
              onClick={() => setConfirmDeleteOpen(true)}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <UserX className="h-4 w-4 shrink-0" />
              <span>{t.settings.deleteAccountBtn}</span>
            </Button>
          )}
        </div>
      </Surface>

      {confirmDeleteOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-foreground/65 p-0 sm:p-4"
        >
          <Surface className="w-full max-w-md rounded-t-2xl sm:rounded-card p-5 sm:p-6 space-y-4 pb-safe">
            <div className="mx-auto h-1 w-10 rounded-full bg-border sm:hidden" />
            <h3 className="text-base font-semibold text-danger">
              {t.settings.confirmDeleteTitle.replace('{email}', session.email)}
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              {t.settings.confirmDeleteBody}
            </p>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button tone="quiet" onClick={() => setConfirmDeleteOpen(false)} className="w-full sm:w-auto">
                {t.common.cancel}
              </Button>
              <Button
                tone="danger"
                onClick={async () => {
                  setConfirmDeleteOpen(false);
                  await onDeleteAccount();
                }}
                className="w-full sm:w-auto"
              >
                {t.settings.confirmDeleteBtn}
              </Button>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   12. ABOUT VIEW
   ========================================================= */
const ABOUT_FEATURE_ICONS: Array<Parameters<typeof Icon3D>[0]['name']> = [
  'pos',
  'stock-log',
  'products',
  'dashboard',
  'alert',
  'analytics',
  'settings',
];

declare const __POS_APP_VERSION__: string | undefined;

export const AboutView: React.FC = () => {
  const { t } = useI18n();
  const appVersion =
    typeof __POS_APP_VERSION__ !== 'undefined'
      ? __POS_APP_VERSION__
      : `v${posVersionManifest.version}`;
  const features = t.about.features.map((text, idx) => ({
    icon: ABOUT_FEATURE_ICONS[idx % ABOUT_FEATURE_ICONS.length],
    text,
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 sm:space-y-6">
      <Surface className="p-4 sm:p-8 space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-6">
          <DrPosLogo size={64} showTagline />
          <div className="flex flex-col sm:items-end gap-2">
            <span className="text-xs font-medium text-muted">
              {t.about.tagline}
            </span>
            <div className="inline-flex items-center gap-2 rounded-control border border-primary/45 bg-gradient-to-r from-primary/15 via-primary/10 to-accent/15 px-3 py-1.5 shadow-xs">
              <span className="h-2 w-2 rounded-xs bg-primary shrink-0" aria-hidden="true" />
              <span className="text-xs font-bold tracking-wide text-primary">
                {t.about.versionLabel}
              </span>
              <span className="text-xs font-extrabold tabular-nums text-foreground font-mono">
                {appVersion}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">{t.about.keyFeaturesTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3.5 rounded-card border border-border/70 p-4"
              >
                <Icon3D name={f.icon} size={34} />
                <span className="text-sm font-medium text-foreground">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <CambodiaFlagAnimated className="shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted">{t.about.developerLabel}</p>
              <p className="text-lg font-bold text-foreground">{t.about.developerName}</p>
              <p className="text-sm text-primary font-medium">{t.about.developerRole}</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-card border-2 border-primary/45 bg-gradient-to-br from-primary/15 via-surface to-accent/15 px-5 py-3 shadow-sm sm:text-right shrink-0">
            <div className="flex items-center sm:justify-end gap-2">
              <span className="h-2 w-2 rounded-xs bg-primary shrink-0" aria-hidden="true" />
              <p className="text-xs font-extrabold uppercase tracking-wider text-primary">
                {t.about.versionLabel}
              </p>
            </div>
            <p className="mt-1 text-lg font-extrabold tracking-tight text-foreground font-mono tabular-nums">
              {appVersion}
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
};
