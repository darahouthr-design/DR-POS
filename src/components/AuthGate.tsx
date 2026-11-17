import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, createSecondaryAdminUser } from '../firebase';
import { seedWorkspaceIfNeeded } from '../services/firestoreWorkspace';
import {
  checkEmailAuthGate,
  DEFAULT_TELEGRAM_URL,
  fetchDeveloperOverviewApi,
  getLicenseRemainingSummary,
  issueDeveloperMasterOtpApi,
  requestMasterAdminOtpApi,
  subscribeToDeveloperVault,
  updateDeveloperTelegramApi,
  updateMasterAdminExpireApi,
  verifyDeveloperKeyApi,
  verifyMasterAdminOtpApi,
  type MasterAdminLicenseRecord,
} from '../services/developerLicense';
import { useIsDesktopDevice } from '../utils/device';
import firebaseConfig from '../../firebase-applet-config.json';
import { APP_LOGO_URL, DrPosLogo, Icon3D } from './Icon3D';
import { PosSliderCaptcha } from './PosSliderCaptcha';
import { cleanSaleNameDisplay } from '../utils/helpers';
import { Button, Field, Surface, inputClass } from './ui';
import type { UserRole } from '../types';

const LEGACY_KNOWN_EMAILS_KEY = 'drpos_known_emails_v1';
const LEGACY_KNOWN_ADMINS_KEY = 'drpos_known_admins_v1';
const OPERATOR_EMAIL_PREFIX = 'drpos_operator_email_';
const PENDING_OPERATOR_KEY = 'drpos_pending_operator_email';
const ROLE_PREF_PREFIX = 'drpos_role_pref_v1_';
const PENDING_ROLE_KEY = 'drpos_pending_role_pref_v1';
const AUTH_EXTERNAL_ERROR_KEY = 'drpos_auth_external_error_v1';

export interface StoredRolePref {
  role: UserRole;
  saleName?: string;
}

export const DUPLICATE_GMAIL_KHMER_ERROR =
  '⚠️ គណនី Gmail នេះមានក្នុងប្រព័ន្ធរួចរាល់ហើយ! Gmail មួយមិនអាចបង្កើតគណនី «Admin មេ» ពីរដងបានជាដាច់ខាត។ សូមជ្រើសរើសផ្ទាំង «ចូលគណនី (Sign In)» ដើម្បីចូលប្រើប្រាស់។';

export const SUB_ADMIN_EXTERNAL_BLOCK_ERROR =
  '⚠️ គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings ដូចនេះមិនអាចយកមកបង្កើត Admin មេ ឬ Sign In នៅផ្នែកខាងក្រៅបានជាដាច់ខាត! សូមប្រើ Gmail របស់ «Admin មេ» ដំបូងដើម្បីចូលប្រើ រួចប្ដូរគណនី (Switch Account) នៅខាងក្នុងប្រព័ន្ធវិញ។';

export function saveOperatorEmailPref(uid: string, operatorEmail: string): void {
  try {
    const clean = operatorEmail.trim().toLowerCase();
    if (clean) {
      localStorage.setItem(`${OPERATOR_EMAIL_PREFIX}${uid}`, clean);
    } else {
      localStorage.removeItem(`${OPERATOR_EMAIL_PREFIX}${uid}`);
    }
  } catch {
    // Ignore storage errors
  }
}

export function loadOperatorEmailPref(uid: string): string {
  try {
    return localStorage.getItem(`${OPERATOR_EMAIL_PREFIX}${uid}`) || '';
  } catch {
    return '';
  }
}

function setPendingOperatorEmail(operatorEmail: string): void {
  try {
    const clean = operatorEmail.trim().toLowerCase();
    if (clean) {
      sessionStorage.setItem(PENDING_OPERATOR_KEY, clean);
    } else {
      sessionStorage.removeItem(PENDING_OPERATOR_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function consumePendingOperatorEmail(): string {
  try {
    const val = sessionStorage.getItem(PENDING_OPERATOR_KEY) || '';
    sessionStorage.removeItem(PENDING_OPERATOR_KEY);
    return val;
  } catch {
    return '';
  }
}

export function saveRolePref(uid: string, pref: StoredRolePref): void {
  try {
    localStorage.setItem(`${ROLE_PREF_PREFIX}${uid}`, JSON.stringify(pref));
  } catch {
    // Ignore storage errors
  }
}

export function loadRolePref(uid: string): StoredRolePref | null {
  try {
    const raw = localStorage.getItem(`${ROLE_PREF_PREFIX}${uid}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRolePref;
    if (parsed && (parsed.role === 'admin' || parsed.role === 'sale')) {
      return {
        role: parsed.role,
        saleName: typeof parsed.saleName === 'string' ? parsed.saleName : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function clearRolePref(uid: string): void {
  try {
    localStorage.removeItem(`${ROLE_PREF_PREFIX}${uid}`);
  } catch {
    // Ignore storage errors
  }
}

export function setPendingRolePref(pref: StoredRolePref | null): void {
  try {
    if (pref) {
      sessionStorage.setItem(PENDING_ROLE_KEY, JSON.stringify(pref));
    } else {
      sessionStorage.removeItem(PENDING_ROLE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function consumePendingRolePref(): StoredRolePref | null {
  try {
    const raw = sessionStorage.getItem(PENDING_ROLE_KEY);
    sessionStorage.removeItem(PENDING_ROLE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRolePref;
    if (parsed && (parsed.role === 'admin' || parsed.role === 'sale')) {
      return {
        role: parsed.role,
        saleName: typeof parsed.saleName === 'string' ? parsed.saleName : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function setExternalAuthError(message: string): void {
  try {
    if (message) {
      sessionStorage.setItem(AUTH_EXTERNAL_ERROR_KEY, message);
    } else {
      sessionStorage.removeItem(AUTH_EXTERNAL_ERROR_KEY);
    }
  } catch {
    // Ignore
  }
}

function consumeExternalAuthError(): string {
  try {
    const msg = sessionStorage.getItem(AUTH_EXTERNAL_ERROR_KEY) || '';
    sessionStorage.removeItem(AUTH_EXTERNAL_ERROR_KEY);
    return msg;
  } catch {
    return '';
  }
}

function mapFirebaseAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return DUPLICATE_GMAIL_KHMER_ERROR;
    case 'auth/invalid-email':
      return 'ទម្រង់អាសយដ្ឋាន Gmail មិនត្រឹមត្រូវទេ (ឧ. example@gmail.com)។';
    case 'auth/weak-password':
      return 'លេខសម្ងាត់ខ្សោយពេក! សូមប្រើលេខសម្ងាត់យ៉ាងតិច 6 តួអក្សរ។';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'អ៊ីមែល Gmail របស់ Admin ឬលេខសម្ងាត់មិនត្រឹមត្រូវទេ! សូមពិនិត្យឡើងវិញ។';
    case 'auth/too-many-requests':
      return 'មានការព្យាយាមចូលច្រើនដងពេក! សូមរង់ចាំបន្តិចរួចព្យាយាមម្ដងទៀត។';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'អ្នកបានបិទផ្ទាំងចូលគណនី Google មុនពេលបញ្ចប់។ សូមចុចម្ដងទៀតដើម្បីបន្ត។';
    case 'auth/popup-blocked':
      return 'កម្មវិធីរុករកបានទប់ស្កាត់ផ្ទាំង Popup! សូមអនុញ្ញាត Popup រួចព្យាយាមម្ដងទៀត។';
    case 'auth/account-exists-with-different-credential':
      return 'អាសយដ្ឋាន Gmail នេះមានគណនីរួចហើយ។ សូមចូលតាមវិធីសាស្ត្រដែលអ្នកបានចុះឈ្មោះពីមុន។';
    case 'auth/operation-not-allowed':
      return 'មុខងារចូលដោយ Email/Password មិនទាន់បានបើកនៅក្នុង Firebase Console ទេ។ សូមបើក Email/Password Sign-in ជាមុនសិន។';
    case 'auth/network-request-failed':
      return 'មិនមានការតភ្ជាប់អ៊ីនធឺណិតទេ! សូមពិនិត្យបណ្ដាញរបស់អ្នក។';
    default:
      return err instanceof Error && err.message
        ? err.message
        : 'ការភ្ជាប់គណនីមិនជោគជ័យទេ។ សូមព្យាយាមម្ដងទៀត។';
  }
}

type DesktopAuthTab = 'create-admin' | 'admin-signin' | 'sale-signin';

interface AuthGateProps {
  onSaveOperatorPref?: (uid: string, operatorEmail: string) => void;
  onSaveRolePref?: (uid: string, pref: StoredRolePref) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({
  onSaveOperatorPref,
  onSaveRolePref,
}) => {
  const isDesktop = useIsDesktopDevice();

  // Desktop tabs: Create Master Admin (first right under Google Popup), Admin Sign In, Sale Sign In
  // Phone & Tablet: ONLY Sale Sign In is permitted
  const [desktopTab, setDesktopTab] = useState<DesktopAuthTab>('create-admin');
  const activeMode: DesktopAuthTab = isDesktop ? desktopTab : 'sale-signin';

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [continuePassword, setContinuePassword] = useState('');
  const [saleName, setSaleName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showContinuePassword, setShowContinuePassword] = useState(false);

  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [stepCheckingBusy, setStepCheckingBusy] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);

  const [busy, setBusy] = useState(false);
  const [creatingAdditionalBusy, setCreatingAdditionalBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [operationNotAllowed, setOperationNotAllowed] = useState(false);

  // Key Developer Console Modal State
  const [devModalOpen, setDevModalOpen] = useState(false);
  const [devKeyInput, setDevKeyInput] = useState('');
  const [devVerifying, setDevVerifying] = useState(false);
  const [devRefreshing, setDevRefreshing] = useState(false);
  const [devAuthError, setDevAuthError] = useState('');
  const [devToken, setDevToken] = useState('');
  const [devMasterAdmins, setDevMasterAdmins] = useState<MasterAdminLicenseRecord[]>([]);
  const [devTelegramInput, setDevTelegramInput] = useState(DEFAULT_TELEGRAM_URL);
  const [devSearch, setDevSearch] = useState('');
  const [devCategoryTab, setDevCategoryTab] = useState<'all' | 'trial' | 'paid-active' | 'expired'>('all');
  const [devSelectedEmail, setDevSelectedEmail] = useState('');
  const [devSelectedName, setDevSelectedName] = useState('');
  const [devDurationUnit, setDevDurationUnit] = useState<'months' | 'years'>('months');
  const [devDurationAmount, setDevDurationAmount] = useState('1');
  const [devFromNow, setDevFromNow] = useState(false);
  const [devExactDate, setDevExactDate] = useState('');
  const [devActionBusy, setDevActionBusy] = useState(false);
  const [devFeedback, setDevFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Master Admin Registration OTP State (6-digit)
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [otpChallengeToken, setOtpChallengeToken] = useState('');
  const [otpTargetEmail, setOtpTargetEmail] = useState('');
  const [otpVerifiedEmail, setOtpVerifiedEmail] = useState('');
  const [otpVerifiedToken, setOtpVerifiedToken] = useState('');
  const [otpRequestBusy, setOtpRequestBusy] = useState(false);
  const [otpVerifyBusy, setOtpVerifyBusy] = useState(false);
  const [otpInfoMsg, setOtpInfoMsg] = useState('');
  const [otpErrorMsg, setOtpErrorMsg] = useState('');
  const [otpCooldownSec, setOtpCooldownSec] = useState(0);
  const [otpTelegramFallbackUrl, setOtpTelegramFallbackUrl] = useState('');

  // Developer Console: Issue Master Admin OTP State
  const [devOtpEmail, setDevOtpEmail] = useState('');
  const [devOtpBusy, setDevOtpBusy] = useState(false);
  const [devOtpCopied, setDevOtpCopied] = useState(false);
  const [devGeneratedOtp, setDevGeneratedOtp] = useState<{
    email: string;
    otpCode: string;
    expiresAt: string;
    emailedToUser?: boolean;
  } | null>(null);

  const firebaseProvidersUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`;

  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_KNOWN_EMAILS_KEY);
      localStorage.removeItem(LEGACY_KNOWN_ADMINS_KEY);
    } catch {
      // Ignore storage restrictions
    }
    const extErr = consumeExternalAuthError();
    if (extErr) {
      setError(extErr);
    }
  }, []);

  useEffect(() => {
    if (otpCooldownSec <= 0) return;
    const timer = window.setInterval(() => {
      setOtpCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldownSec]);

  useEffect(() => {
    if (!devModalOpen || !devToken) return;
    let cancelled = false;
    let lastSeenTelegram = '';
    setDevRefreshing(true);
    fetchDeveloperOverviewApi(devToken)
      .then((res) => {
        if (cancelled) return;
        setDevMasterAdmins(res.masterAdmins);
        lastSeenTelegram = res.telegramUrl || DEFAULT_TELEGRAM_URL;
        setDevTelegramInput(lastSeenTelegram);
      })
      .catch(() => {
        // Keep existing state if silent refresh fails
      })
      .finally(() => {
        if (!cancelled) setDevRefreshing(false);
      });

    const unsubVault = subscribeToDeveloperVault(
      (vault) => {
        if (cancelled || !vault.exists) return;
        setDevMasterAdmins(vault.sortedMasterAdminsList);
        const nextTg = vault.telegramUrl || DEFAULT_TELEGRAM_URL;
        if (nextTg !== lastSeenTelegram) {
          lastSeenTelegram = nextTg;
          setDevTelegramInput(nextTg);
        }
      },
      () => {
        // Keep existing state if realtime listener drops transiently
      }
    );

    return () => {
      cancelled = true;
      unsubVault();
    };
  }, [devModalOpen, devToken]);

  const resetOtpState = () => {
    setOtpCodeInput('');
    setOtpChallengeToken('');
    setOtpTargetEmail('');
    setOtpVerifiedEmail('');
    setOtpVerifiedToken('');
    setOtpInfoMsg('');
    setOtpErrorMsg('');
    setOtpCooldownSec(0);
    setOtpTelegramFallbackUrl('');
    setCaptchaVerified(false);
    setCaptchaResetKey((k) => k + 1);
  };

  const handleRequestMasterOtp = async () => {
    setError('');
    setSuccessMsg('');
    setOtpErrorMsg('');
    setOtpInfoMsg('');
    setOtpTelegramFallbackUrl('');

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setOtpErrorMsg('សូមបញ្ចូលអាសយដ្ឋាន Gmail អោយបានត្រឹមត្រូវ ជាមុនសិន។');
      return;
    }

    setOtpRequestBusy(true);
    try {
      const res = await requestMasterAdminOtpApi(cleanEmail);
      if (res.ok) {
        setOtpTargetEmail(cleanEmail);
        setOtpChallengeToken(res.challengeToken || '');
        setOtpCooldownSec(res.resendCooldownSeconds || 30);
        setOtpVerifiedEmail('');
        setOtpVerifiedToken('');
        setOtpInfoMsg(
          `បានផ្ញើលេខកូដ OTP ៦ ខ្ទង់ទៅកាន់ ${res.maskedEmail || cleanEmail} រួចរាល់! សូមពិនិត្យ Inbox ឬ Spam (សុពលភាព ១០ នាទី)។`
        );
      } else {
        if (typeof res.retryAfterSeconds === 'number' && res.retryAfterSeconds > 0) {
          setOtpCooldownSec(res.retryAfterSeconds);
        }
        if (res.code === 'OTP_EMAIL_NOT_CONFIGURED') {
          setOtpTelegramFallbackUrl(res.telegramUrl || DEFAULT_TELEGRAM_URL);
        }
        setOtpErrorMsg(res.error || 'មិនអាចផ្ញើលេខកូដ OTP បានទេ។');
      }
    } catch {
      setOtpErrorMsg('មិនអាចភ្ជាប់ទៅសេវាផ្ញើ OTP បានទេនៅពេលនេះ។ សូមព្យាយាមម្ដងទៀត។');
    } finally {
      setOtpRequestBusy(false);
    }
  };

  const verifyOtpForEmail = async (cleanEmail: string): Promise<boolean> => {
    if (otpVerifiedEmail === cleanEmail && otpVerifiedToken) {
      return true;
    }
    const cleanOtp = otpCodeInput.replace(/\D+/g, '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      setOtpErrorMsg('សូមបញ្ចូលលេខកូដ OTP ៦ ខ្ទង់ជាមុនសិន មុនពេលបង្កើតគណនី Admin មេថ្មី។');
      return false;
    }
    setOtpVerifyBusy(true);
    setOtpErrorMsg('');
    try {
      const res = await verifyMasterAdminOtpApi({
        email: cleanEmail,
        otp: cleanOtp,
        challengeToken: otpTargetEmail === cleanEmail ? otpChallengeToken : '',
      });
      if (res.ok && res.verified) {
        setOtpVerifiedEmail(cleanEmail);
        setOtpVerifiedToken(res.otpVerifiedToken || 'verified');
        setOtpInfoMsg('');
        setOtpTelegramFallbackUrl('');
        return true;
      }
      setOtpErrorMsg(res.error || 'លេខកូដ OTP មិនត្រឹមត្រូវទេ!');
      return false;
    } catch {
      setOtpErrorMsg('មិនអាចផ្ទៀងផ្ទាត់លេខកូដ OTP បានទេ។ សូមព្យាយាមម្ដងទៀត។');
      return false;
    } finally {
      setOtpVerifyBusy(false);
    }
  };

  const handleVerifyOtpClick = async () => {
    setError('');
    setSuccessMsg('');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setOtpErrorMsg('សូមបញ្ចូលអាសយដ្ឋាន Gmail អោយបានត្រឹមត្រូវ ជាមុនសិន។');
      return;
    }
    await verifyOtpForEmail(cleanEmail);
  };

  // Desktop-only: Create another Master Admin account (each Master Admin gets 1-month free trial)
  const handleCreateAnotherAdmin = async () => {
    if (!isDesktop) return;
    setError('');
    setSuccessMsg('');
    setOperationNotAllowed(false);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('សូមបញ្ចូលអាសយដ្ឋាន Gmail របស់ Admin មេ អោយបានត្រឹមត្រូវ។');
      return;
    }
    if (!password || password.length < 6) {
      setError('សូមបញ្ចូលលេខសម្ងាត់ (Password) យ៉ាងតិច 6 តួអក្សរ។');
      return;
    }
    if (password !== continuePassword) {
      setError('លេខសម្ងាត់ និង Continue Password មិនដូចគ្នាទេ! សូមពិនិត្យឡើងវិញ។');
      return;
    }

    setCreatingAdditionalBusy(true);
    try {
      const gate = await checkEmailAuthGate(cleanEmail);
      if (gate.isSubAdmin) {
        setError(SUB_ADMIN_EXTERNAL_BLOCK_ERROR);
        return;
      }
      if (gate.isRegisteredMaster) {
        setError(DUPLICATE_GMAIL_KHMER_ERROR);
        return;
      }

      const otpOk = await verifyOtpForEmail(cleanEmail);
      if (!otpOk) {
        setCreateStep(3);
        setError('សូមផ្ទៀងផ្ទាត់លេខកូដ OTP ៦ ខ្ទង់សម្រាប់ Gmail នេះជាមុនសិន!');
        return;
      }

      if (!captchaVerified) {
        setError('សូមអូសផ្គុំរូបភាព (Slider Puzzle CAPTCHA) ដើម្បីបញ្ជាក់ថាមិនមែនជា Bot ជាមុនសិន!');
        return;
      }

      const created = await createSecondaryAdminUser(
        cleanEmail,
        password,
        displayName,
        (targetDb, uid, mail, name) => seedWorkspaceIfNeeded(uid, mail, name, targetDb)
      );
      setSuccessMsg(
        `បានបង្កើតគណនី Admin មេ "${created.displayName}" (${created.email}) ដោយជោគជ័យ (សាកល្បងប្រើ Free ១ ខែ)!`
      );
      setDisplayName('');
      setEmail('');
      setPassword('');
      setContinuePassword('');
      setCreateStep(1);
      resetOtpState();
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      setOperationNotAllowed(code === 'auth/operation-not-allowed');
      setError(mapFirebaseAuthError(err));
    } finally {
      setCreatingAdditionalBusy(false);
    }
  };

  const handleAdvanceCreateStep = async () => {
    if (activeMode !== 'create-admin' || !isDesktop) return;
    setError('');
    setSuccessMsg('');
    setOperationNotAllowed(false);

    if (createStep === 1) {
      if (!displayName.trim()) {
        setError('សូមបំពេញឈ្មោះ Admin ឬ ឈ្មោះហាង ជាមុនសិន។');
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError('សូមបញ្ចូលអាសយដ្ឋាន Gmail របស់ Admin អោយបានត្រឹមត្រូវ (ឧ. example@gmail.com)។');
        return;
      }

      setStepCheckingBusy(true);
      try {
        const gate = await checkEmailAuthGate(cleanEmail);
        if (gate.isSubAdmin) {
          setError(SUB_ADMIN_EXTERNAL_BLOCK_ERROR);
          return;
        }
        if (gate.isRegisteredMaster) {
          setError(DUPLICATE_GMAIL_KHMER_ERROR);
          return;
        }

        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
          if (methods.length > 0) {
            setError(DUPLICATE_GMAIL_KHMER_ERROR);
            return;
          }
        } catch {
          // Proceed to step 2
        }

        setCreateStep(2);
      } finally {
        setStepCheckingBusy(false);
      }
      return;
    }

    if (createStep === 2) {
      if (!password || password.length < 6) {
        setError('សូមបញ្ចូលលេខសម្ងាត់ (Password) យ៉ាងតិច 6 តួអក្សរ។');
        return;
      }
      if (password !== continuePassword) {
        setError('លេខសម្ងាត់ និង Continue Password មិនដូចគ្នាទេ! សូមពិនិត្យឡើងវិញ។');
        return;
      }
      setCreateStep(3);
      return;
    }

    if (createStep === 3) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setCreateStep(1);
        setError('សូមបញ្ចូលអាសយដ្ឋាន Gmail របស់ Admin អោយបានត្រឹមត្រូវ (ឧ. example@gmail.com)។');
        return;
      }
      const otpOk = await verifyOtpForEmail(cleanEmail);
      if (!otpOk) {
        return;
      }
      setCreateStep(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setOperationNotAllowed(false);

    // 1. Desktop-ONLY: 4-Step Create Master Admin & Sign In immediately (1-month Free Trial)
    if (activeMode === 'create-admin') {
      if (!isDesktop) return;
      if (createStep < 4) {
        await handleAdvanceCreateStep();
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setCreateStep(1);
        setError('សូមបញ្ចូលអាសយដ្ឋាន Gmail របស់ Admin អោយបានត្រឹមត្រូវ (ឧ. example@gmail.com)។');
        return;
      }

      if (!password || password.length < 6) {
        setCreateStep(2);
        setError('សូមបញ្ចូលលេខសម្ងាត់ (Password) យ៉ាងតិច 6 តួអក្សរ។');
        return;
      }

      if (password !== continuePassword) {
        setCreateStep(2);
        setError('លេខសម្ងាត់ និង Continue Password មិនដូចគ្នាទេ! សូមពិនិត្យឡើងវិញ។');
        return;
      }

      setBusy(true);
      const adminRolePref: StoredRolePref = { role: 'admin' };
      setPendingRolePref(adminRolePref);
      setPendingOperatorEmail('');
      try {
        const gate = await checkEmailAuthGate(cleanEmail);
        if (gate.isSubAdmin) {
          setPendingRolePref(null);
          setError(SUB_ADMIN_EXTERNAL_BLOCK_ERROR);
          return;
        }
        if (gate.isRegisteredMaster) {
          setPendingRolePref(null);
          setError(DUPLICATE_GMAIL_KHMER_ERROR);
          return;
        }

        try {
          const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
          if (methods.length > 0) {
            setPendingRolePref(null);
            setError(DUPLICATE_GMAIL_KHMER_ERROR);
            return;
          }
        } catch {
          // Proceed to OTP check and createUserWithEmailAndPassword
        }

        const otpOk = await verifyOtpForEmail(cleanEmail);
        if (!otpOk) {
          setPendingRolePref(null);
          setCreateStep(3);
          setError('សូមផ្ទៀងផ្ទាត់លេខកូដ OTP ៦ ខ្ទង់សម្រាប់ Gmail នេះជាមុនសិន!');
          return;
        }

        if (!captchaVerified) {
          setPendingRolePref(null);
          setError('សូមអូសផ្គុំរូបភាព (Slider Puzzle CAPTCHA) ដើម្បីបញ្ជាក់ថាមិនមែនជា Bot ជាមុនសិន!');
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const cleanName = displayName.trim() || cleanEmail.split('@')[0] || 'Admin';
        await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
        sendEmailVerification(cred.user).catch(() => {});

        saveRolePref(cred.user.uid, adminRolePref);
        onSaveRolePref?.(cred.user.uid, adminRolePref);
        saveOperatorEmailPref(cred.user.uid, cleanEmail);
        onSaveOperatorPref?.(cred.user.uid, cleanEmail);
      } catch (err) {
        setPendingRolePref(null);
        const code = (err as { code?: string })?.code || '';
        setOperationNotAllowed(code === 'auth/operation-not-allowed');
        setError(mapFirebaseAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('សូមបញ្ចូលអាសយដ្ឋាន Gmail របស់ Admin អោយបានត្រឹមត្រូវ (ឧ. example@gmail.com)។');
      return;
    }
    if (!password || password.length < 6) {
      setError('សូមបញ្ចូលលេខសម្ងាត់ (Password) យ៉ាងតិច 6 តួអក្សរ។');
      return;
    }

    // 2. Desktop-ONLY: Master Admin Sign In
    if (activeMode === 'admin-signin') {
      if (!isDesktop) return;
      setBusy(true);
      const adminRolePref: StoredRolePref = { role: 'admin' };
      setPendingRolePref(adminRolePref);
      setPendingOperatorEmail('');
      try {
        const gate = await checkEmailAuthGate(cleanEmail);
        if (gate.isSubAdmin) {
          setPendingRolePref(null);
          setError(SUB_ADMIN_EXTERNAL_BLOCK_ERROR);
          return;
        }

        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        saveRolePref(cred.user.uid, adminRolePref);
        onSaveRolePref?.(cred.user.uid, adminRolePref);
        saveOperatorEmailPref(cred.user.uid, cleanEmail);
        onSaveOperatorPref?.(cred.user.uid, cleanEmail);
      } catch (err) {
        setPendingRolePref(null);
        const code = (err as { code?: string })?.code || '';
        setOperationNotAllowed(code === 'auth/operation-not-allowed');
        setError(mapFirebaseAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    // 3. Sale Sign In (Mandatory on Phone & Tablet, optional tab on Desktop)
    const cleanSaleName = cleanSaleNameDisplay(saleName);
    if (!cleanSaleName) {
      setError('សូមបញ្ចូលឈ្មោះ Sale ដែល Admin បានកំណត់នៅក្នុងប្រព័ន្ធ!');
      return;
    }

    setBusy(true);
    const saleRolePref: StoredRolePref = { role: 'sale', saleName: cleanSaleName };
    setPendingRolePref(saleRolePref);
    setPendingOperatorEmail('');
    try {
      const gate = await checkEmailAuthGate(cleanEmail);
      if (gate.isSubAdmin) {
        setPendingRolePref(null);
        setError(SUB_ADMIN_EXTERNAL_BLOCK_ERROR);
        return;
      }

      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      saveRolePref(cred.user.uid, saleRolePref);
      onSaveRolePref?.(cred.user.uid, saleRolePref);
      saveOperatorEmailPref(cred.user.uid, '');
      onSaveOperatorPref?.(cred.user.uid, '');
    } catch (err) {
      setPendingRolePref(null);
      const code = (err as { code?: string })?.code || '';
      setOperationNotAllowed(code === 'auth/operation-not-allowed');
      setError(mapFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  // Developer Key Verification & Actions
  const handleVerifyDevKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setDevAuthError('');
    setDevFeedback(null);
    if (!devKeyInput.trim()) {
      setDevAuthError('សូមបញ្ចូលលេខ Key Developer ជាមុនសិន។');
      return;
    }
    setDevVerifying(true);
    try {
      const res = await verifyDeveloperKeyApi(devKeyInput.trim());
      setDevToken(res.devToken);
      setDevMasterAdmins(res.masterAdmins);
      setDevTelegramInput(res.telegramUrl || DEFAULT_TELEGRAM_URL);
      if (res.masterAdmins.length > 0 && !devSelectedEmail) {
        setDevSelectedEmail(res.masterAdmins[0].email);
        setDevSelectedName(res.masterAdmins[0].displayName);
      }
      setDevKeyInput('');
    } catch (err) {
      setDevAuthError(err instanceof Error ? err.message : 'លេខ Key Developer មិនត្រឹមត្រូវទេ!');
    } finally {
      setDevVerifying(false);
    }
  };

  const handleSaveDevTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devToken) return;
    setDevActionBusy(true);
    setDevFeedback(null);
    try {
      const savedUrl = await updateDeveloperTelegramApi(devToken, devTelegramInput.trim());
      setDevTelegramInput(savedUrl);
      setDevFeedback({
        type: 'success',
        message: `បានរក្សាទុក Telegram Developer Link (${savedUrl}) ដោយជោគជ័យ!`,
      });
    } catch (err) {
      setDevFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'មិនអាចរក្សាទុក Telegram Link បានទេ។',
      });
    } finally {
      setDevActionBusy(false);
    }
  };

  const handleRefreshDevOverview = async () => {
    if (!devToken) return;
    setDevRefreshing(true);
    setDevFeedback(null);
    try {
      const res = await fetchDeveloperOverviewApi(devToken);
      setDevMasterAdmins(res.masterAdmins);
      setDevTelegramInput(res.telegramUrl || DEFAULT_TELEGRAM_URL);
    } catch (err) {
      setDevFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'មិនអាចធ្វើបច្ចុប្បន្នភាពបញ្ជី Admin មេ បានទេ។',
      });
    } finally {
      setDevRefreshing(false);
    }
  };

  const handleQuickRenewAdmin = async (
    adm: MasterAdminLicenseRecord,
    unit: 'months' | 'years',
    amount: number
  ) => {
    if (!devToken) return;
    setDevSelectedEmail(adm.email);
    setDevSelectedName(adm.displayName);
    setDevActionBusy(true);
    setDevFeedback(null);
    try {
      const res = await updateMasterAdminExpireApi(devToken, {
        email: adm.email,
        displayName: adm.displayName,
        mode: 'add',
        unit,
        amount,
        fromNow: true,
      });
      setDevMasterAdmins(res.masterAdmins);
      setDevExactDate(res.masterAdmin.expireAt.slice(0, 10));
      const summary = getLicenseRemainingSummary({
        trialStartedAt: res.masterAdmin.trialStartedAt,
        expireAt: res.masterAdmin.expireAt,
        planType: res.masterAdmin.planType,
        telegramUrl: devTelegramInput,
        developerUpdatedAt: res.masterAdmin.developerUpdatedAt,
      });
      setDevFeedback({
        type: 'success',
        message: `បានបន្តសុពលភាពឱ្យ ${res.masterAdmin.displayName} (${res.masterAdmin.email}) រហូតដល់ ${summary.formattedExpireDate} (នៅសល់ ${summary.daysLeft} ថ្ងៃ)!`,
      });
    } catch (err) {
      setDevFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'មិនអាចបន្តសុពលភាពបានទេ។',
      });
    } finally {
      setDevActionBusy(false);
    }
  };

  const handleApplyDevExpire = async (
    mode: 'add' | 'exact' | 'expire-now' | 'reset-trial',
    overrideUnit?: 'months' | 'years',
    overrideAmount?: number
  ) => {
    if (!devToken) return;
    const targetEmail = devSelectedEmail.trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setDevFeedback({
        type: 'error',
        message: 'សូមជ្រើសរើស ឬបញ្ចូល Gmail របស់ Admin មេ ជាមុនសិន។',
      });
      return;
    }
    setDevActionBusy(true);
    setDevFeedback(null);
    try {
      const res = await updateMasterAdminExpireApi(devToken, {
        email: targetEmail,
        displayName: devSelectedName.trim() || undefined,
        mode,
        unit: overrideUnit || devDurationUnit,
        amount: overrideAmount ?? Math.max(1, Number(devDurationAmount) || 1),
        fromNow: devFromNow,
        exactDate: mode === 'exact' ? devExactDate : undefined,
      });
      setDevMasterAdmins(res.masterAdmins);
      setDevExactDate(res.masterAdmin.expireAt.slice(0, 10));
      const summary = getLicenseRemainingSummary({
        trialStartedAt: res.masterAdmin.trialStartedAt,
        expireAt: res.masterAdmin.expireAt,
        planType: res.masterAdmin.planType,
        telegramUrl: devTelegramInput,
        developerUpdatedAt: res.masterAdmin.developerUpdatedAt,
      });
      setDevFeedback({
        type: 'success',
        message:
          mode === 'expire-now'
            ? `បានបិទសុពលភាព (Expire) សម្រាប់ ${res.masterAdmin.email} ភ្លាមៗ!`
            : `បានកំណត់ថ្ងៃ Expire ថ្មីសម្រាប់ ${res.masterAdmin.email} → ${summary.formattedExpireDate} (${summary.expired ? 'ផុតកំណត់' : `នៅសល់ ${summary.daysLeft} ថ្ងៃ`})`,
      });
    } catch (err) {
      setDevFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'មិនអាចកំណត់ថ្ងៃ Expire បានទេ។',
      });
    } finally {
      setDevActionBusy(false);
    }
  };

  const handleIssueDevMasterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devToken) return;
    const targetEmail = devOtpEmail.trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setDevFeedback({
        type: 'error',
        message: 'សូមបញ្ចូល Gmail របស់ «Admin មេថ្មី» អោយបានត្រឹមត្រូវ ជាមុនសិន។',
      });
      return;
    }
    setDevOtpBusy(true);
    setDevFeedback(null);
    setDevOtpCopied(false);
    try {
      const res = await issueDeveloperMasterOtpApi(devToken, {
        email: targetEmail,
        alsoSendEmail: true,
      });
      if (res.otpCode) {
        setDevGeneratedOtp({
          email: res.email || targetEmail,
          otpCode: res.otpCode,
          expiresAt: res.expiresAt || '',
          emailedToUser: res.emailedToUser,
        });
        setDevFeedback({
          type: 'success',
          message: res.emailedToUser
            ? `បានបង្កើតលេខកូដ OTP (${res.otpCode}) និងផ្ញើទៅ ${res.email || targetEmail} ដោយជោគជ័យ!`
            : `បានបង្កើតលេខកូដ OTP ៦ ខ្ទង់សម្រាប់ ${res.email || targetEmail} ដោយជោគជ័យ!`,
        });
      }
    } catch (err) {
      setDevFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'មិនអាចបង្កើតលេខកូដ OTP បានទេ។',
      });
    } finally {
      setDevOtpBusy(false);
    }
  };

  const classifyDevAdmin = (adm: MasterAdminLicenseRecord) => {
    const info = getLicenseRemainingSummary({
      trialStartedAt: adm.trialStartedAt,
      expireAt: adm.expireAt,
      planType: adm.planType,
      telegramUrl: devTelegramInput,
      developerUpdatedAt: adm.developerUpdatedAt,
    });
    const category: 'trial' | 'paid-active' | 'expired' = info.expired
      ? 'expired'
      : adm.planType === 'trial'
      ? 'trial'
      : 'paid-active';
    return { adm, info, category };
  };

  const allClassifiedAdmins = devMasterAdmins.map(classifyDevAdmin);
  const devSearchLower = devSearch.trim().toLowerCase();
  const filteredClassifiedAdmins = allClassifiedAdmins.filter(({ adm }) => {
    if (!devSearchLower) return true;
    return (
      adm.email.toLowerCase().includes(devSearchLower) ||
      adm.displayName.toLowerCase().includes(devSearchLower)
    );
  });

  const trialAdmins = filteredClassifiedAdmins.filter((x) => x.category === 'trial');
  const paidActiveAdmins = filteredClassifiedAdmins.filter((x) => x.category === 'paid-active');
  const expiredAdmins = filteredClassifiedAdmins.filter((x) => x.category === 'expired');

  const totalTrialCount = allClassifiedAdmins.filter((x) => x.category === 'trial').length;
  const totalPaidActiveCount = allClassifiedAdmins.filter((x) => x.category === 'paid-active').length;
  const totalExpiredCount = allClassifiedAdmins.filter((x) => x.category === 'expired').length;

  const cleanEmailLower = email.trim().toLowerCase();
  const isOtpVerifiedForCurrentEmail =
    Boolean(cleanEmailLower) &&
    otpVerifiedEmail === cleanEmailLower &&
    Boolean(otpVerifiedToken);
  const canAdvanceStep3Otp =
    isOtpVerifiedForCurrentEmail || otpCodeInput.replace(/\D+/g, '').length === 6;
  const canSubmitFinalCreateAdmin = isOtpVerifiedForCurrentEmail && captchaVerified;

  const anyBusy = busy || creatingAdditionalBusy || otpVerifyBusy || stepCheckingBusy;

  return (
    <div className="relative min-h-dvh w-full overflow-x-clip bg-background flex items-center justify-center p-3 py-5 sm:p-6 pb-safe">
      {/* Animated Dynamic Mesh Glow Background (Red - Gold - Blue) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 36, -18, 0],
            y: [0, -28, 20, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-28 -left-24 h-80 w-80 sm:h-[28rem] sm:w-[28rem] rounded-full bg-red-500/22 dark:bg-red-500/20 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -30, 26, 0],
            y: [0, 32, -16, 0],
            scale: [1, 0.94, 1.07, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -right-24 h-80 w-80 sm:h-[30rem] sm:w-[30rem] rounded-full bg-amber-400/25 dark:bg-amber-400/18 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, 24, -30, 0],
            y: [0, -22, 18, 0],
            scale: [1, 1.06, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 left-1/3 h-80 w-80 sm:h-[30rem] sm:w-[30rem] rounded-full bg-blue-500/24 dark:bg-blue-500/20 blur-3xl"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,transparent_0%,var(--color-background)_92%)] opacity-60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-stretch"
      >
        {/* Brand & Security Information Panel (Second on mobile, Left on desktop) */}
        <div className="order-2 lg:order-1 lg:col-span-5 rounded-card border border-white/45 dark:border-white/10 bg-surface/75 backdrop-blur-xl shadow-float p-5 sm:p-8 flex flex-col justify-between space-y-5 sm:space-y-6">
          <div className="space-y-4 sm:space-y-5">
            <DrPosLogo size={48} showTagline />
            <div className="space-y-2 border-t border-border/60 pt-4 sm:pt-5">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground leading-snug">
                {isDesktop
                  ? 'ប្រព័ន្ធគ្រប់គ្រង Admin & Sale តាម Gmail'
                  : 'ច្រកចូលប្រើប្រាស់សម្រាប់បុគ្គលិក Sale'}
              </h1>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                {isDesktop
                  ? 'នៅលើកុំព្យូទ័រ លោកអ្នកអាចបង្កើតគណនី Admin បានច្រើន និងកំណត់ឈ្មោះ Sale ដើម្បីគ្រប់គ្រងការលក់នៅលើទូរស័ព្ទ និងថេបលេត។'
                  : 'សម្រាប់ទូរស័ព្ទ និងថេបលេត៖ សូមចូលប្រើប្រាស់ដោយប្រើគណនី Gmail របស់ Admin និងឈ្មោះ Sale ដែល Admin បានកំណត់។'}
              </p>
            </div>

            <div className="divide-y divide-border/50 border-t border-border/50 text-sm">
              <div className="py-3 flex items-start gap-3">
                <Icon3D name="shield" size={28} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-[13px] sm:text-sm">
                    {isDesktop
                      ? 'Admin មើលឃើញ Orders ទាំងអស់'
                      : 'បំពេញឈ្មោះ Sale ដែល Admin កំណត់'}
                  </p>
                  <p className="text-xs text-muted">
                    {isDesktop
                      ? 'Admin អាចគ្រប់គ្រង និងមើលរបាយការណ៍លក់របស់ Sale គ្រប់រូបតាម Realtime។'
                      : 'ប្រសិនបើមិនមានឈ្មោះ Sale ក្នុងការកំណត់របស់ Admin ទេ មិនអាចចូលប្រើបានឡើយ។'}
                  </p>
                </div>
              </div>
              <div className="py-3 flex items-start gap-3">
                <Icon3D name="orders" size={28} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-[13px] sm:text-sm">
                    Sale មើលឃើញតែ Orders របស់ខ្លួនឯង
                  </p>
                  <p className="text-xs text-muted">
                    Sale ម្នាក់ៗឃើញតែរបាយការណ៍ Orders ផ្ទាល់ខ្លួនប៉ុណ្ណោះ សុវត្ថិភាព និងច្បាស់លាស់។
                  </p>
                </div>
              </div>
              <div className="py-3 flex items-start gap-3">
                <Icon3D name="pos" size={28} />
                <div className="min-w-0">
                  <p className="font-medium text-foreground text-[13px] sm:text-sm">
                    ចងចាំការចូលប្រើដោយស្វ័យប្រវត្តិ
                  </p>
                  <p className="text-xs text-muted">
                    ពេលចូលប្រើលើកក្រោយ មិនចាំបាច់ Sign in ម្ដងទៀតឡើយ។
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border/50 pt-4 flex items-center gap-2 text-xs text-muted">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              {isDesktop
                ? 'មុខងារបង្កើត Admin ដំណើរការតែលើកុំព្យូទ័រប៉ុណ្ណោះ'
                : 'សិទ្ធិចូលប្រើលើទូរស័ព្ទ/ថេបលេត៖ Sale Sign In ប៉ុណ្ណោះ'}
            </span>
          </div>
        </div>

        {/* Highlighted Standard Auth Form Card */}
        <div className="order-1 lg:order-2 lg:col-span-7 relative overflow-hidden rounded-card border border-primary/25 ring-1 ring-primary/10 bg-surface/92 backdrop-blur-2xl shadow-float p-4 sm:p-8 flex flex-col justify-center">
          {/* Clean Emerald Top Accent Bar */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-teal-500"
          />

          {/* Animated DR-POS Logo Showcase Header (Replaces Sign in with Gmail Button) */}
          <div className="pb-4 sm:pb-5 mb-4 border-b border-border/60 flex items-center justify-between gap-3">
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="flex items-center gap-3.5 min-w-0"
            >
              <div className="relative shrink-0">
                {/* Soft breathing aura */}
                <motion.div
                  aria-hidden="true"
                  animate={{ scale: [0.95, 1.08, 0.95], opacity: [0.32, 0.6, 0.32] }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -inset-1 rounded-2xl bg-primary/25 blur-md"
                />
                {/* Floating emblem with clean specular sheen sweep */}
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.05, rotate: -2 }}
                  className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white p-1.5 border border-primary/25 shadow-surface overflow-hidden flex items-center justify-center"
                >
                  <img
                    src={APP_LOGO_URL}
                    alt="DR-POS Logo"
                    className="h-full w-full object-contain relative z-10"
                  />
                  <motion.div
                    aria-hidden="true"
                    animate={{ x: ['-150%', '260%'] }}
                    transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 3.2, ease: 'easeInOut' }}
                    className="pointer-events-none absolute inset-y-0 w-1/2 skew-x-[-22deg] bg-gradient-to-r from-transparent via-white/70 to-transparent z-20"
                  />
                </motion.div>
              </div>

              <div className="min-w-0 leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    DR-POS
                  </span>
                  <span className="text-xs font-semibold text-primary">Realtime</span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted truncate mt-0.5">
                  {isDesktop ? 'Device POS Systems' : 'POS Sale'}
                </p>
              </div>
            </motion.div>

            {!isDesktop && (
              <span className="text-xs font-semibold text-primary shrink-0">Sale Sign In</span>
            )}
          </div>

          {/* DESKTOP ONLY: Clean Segmented Mode Tabs */}
          {isDesktop && (
            <div className="grid grid-cols-3 gap-1.5 p-1.5 mb-5 rounded-control border border-border/75 bg-background/85">
              {([
                { id: 'create-admin' as const, label: 'បង្កើត Admin', icon: UserPlus },
                { id: 'admin-signin' as const, label: 'ចូល Admin', icon: Mail },
                { id: 'sale-signin' as const, label: 'ចូល Sale', icon: Users },
              ]).map((tab) => {
                const Icon = tab.icon;
                const isActive = desktopTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={anyBusy}
                    onClick={() => {
                      setDesktopTab(tab.id);
                      if (tab.id === 'create-admin') {
                        setCreateStep(1);
                      }
                      setError('');
                      setSuccessMsg('');
                      setOperationNotAllowed(false);
                    }}
                    className={`relative min-h-10 px-2.5 py-2 rounded-control text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 ${
                      isActive
                        ? 'text-primary-foreground'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="auth-desktop-tab-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-control bg-primary shadow-xs"
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0 relative z-10" />
                    <span className="relative z-10 truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.form
              key={activeMode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="rounded-card border border-primary/20 bg-surface-elevated/75 p-4 sm:p-5 shadow-xs space-y-4 overflow-hidden"
            >
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground leading-snug">
                  {activeMode === 'create-admin'
                    ? '១. បង្កើតគណនី Admin មេ (សាកល្បង Free ១ ខែ)'
                    : activeMode === 'admin-signin'
                    ? 'ចូលគណនី Admin មេ (Sign In)'
                    : 'ចូលគណនី Sale (Sale Sign In)'}
                </h2>
                {activeMode !== 'create-admin' && (
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {activeMode === 'admin-signin'
                      ? 'ចូលប្រើដោយប្រើ Gmail របស់ «Admin មេ» ដើម្បីគ្រប់គ្រងទំនិញ កំណត់ឈ្មោះ Sale និងមើលរបាយការណ៍ Orders។'
                      : 'បញ្ចូល Gmail របស់ Admin មេ, លេខសម្ងាត់ និងឈ្មោះ Sale ដែល Admin បានកំណត់ ដើម្បីចូលប្រើប្រាស់។'}
                  </p>
                )}
              </div>

              {activeMode === 'create-admin' ? (
                <>
                  {/* 4-Step Indicator Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
                    {([
                      { step: 1 as const, label: 'ដំណាក់កាលទី១', sub: 'ឈ្មោះ & Gmail' },
                      { step: 2 as const, label: 'ដំណាក់កាលទី២', sub: 'លេខសម្ងាត់' },
                      { step: 3 as const, label: 'ដំណាក់កាលទី៣', sub: 'ផ្ទៀងផ្ទាត់ OTP' },
                      { step: 4 as const, label: 'ដំណាក់កាលទី៤', sub: 'រូបផ្គុំ CAPTCHA' },
                    ]).map((item) => {
                      const isCurrent = createStep === item.step;
                      const isCompleted = createStep > item.step;
                      const canJumpBack = item.step < createStep && !anyBusy;
                      return (
                        <button
                          key={item.step}
                          type="button"
                          disabled={!canJumpBack}
                          onClick={() => {
                            if (!canJumpBack) return;
                            setError('');
                            setSuccessMsg('');
                            setCreateStep(item.step);
                          }}
                          className={`text-left space-y-1.5 rounded-control p-2 border transition-colors ${
                            isCurrent
                              ? 'border-primary/45 bg-primary/8'
                              : isCompleted
                              ? 'border-primary/25 bg-background/70 hover:border-primary/45 cursor-pointer'
                              : 'border-border/60 bg-background/40 opacity-65'
                          } disabled:cursor-default`}
                        >
                          <div className="h-1 w-full rounded-sm bg-border/60 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isCurrent || isCompleted ? 'w-full bg-primary' : 'w-0'
                              }`}
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span
                              className={`text-[11px] font-bold truncate ${
                                isCurrent || isCompleted ? 'text-primary' : 'text-muted'
                              }`}
                            >
                              {item.label}
                            </span>
                            {isCompleted && (
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] font-medium text-foreground/85 truncate">
                            {item.sub}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  <AnimatePresence mode="wait">
                    {createStep === 1 && (
                      <motion.div
                        key="create-step-1"
                        initial={{ opacity: 0, y: 14, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.985 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="space-y-4"
                      >
                        <Field label="១. ឈ្មោះ Admin ឬ ឈ្មោះហាង (Admin Display Name)">
                          <input
                            type="text"
                            required
                            value={displayName}
                            onChange={(e) => {
                              setDisplayName(e.target.value);
                              setError('');
                            }}
                            placeholder="ឧ. Admin ភ្នំពេញ / ហាង DR-POS"
                            autoComplete="name"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="២. អាសយដ្ឋាន Gmail របស់ Admin">
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => {
                              const nextVal = e.target.value;
                              setEmail(nextVal);
                              const nextLower = nextVal.trim().toLowerCase();
                              if (otpVerifiedEmail && nextLower !== otpVerifiedEmail) {
                                setOtpVerifiedEmail('');
                                setOtpVerifiedToken('');
                              }
                              if (otpTargetEmail && nextLower !== otpTargetEmail) {
                                setOtpChallengeToken('');
                                setOtpInfoMsg('');
                              }
                              setCaptchaVerified(false);
                              setError('');
                              setOtpErrorMsg('');
                              setOtpTelegramFallbackUrl('');
                            }}
                            placeholder="admin@gmail.com"
                            autoComplete="email"
                            className={inputClass}
                          />
                        </Field>
                      </motion.div>
                    )}

                    {createStep === 2 && (
                      <motion.div
                        key="create-step-2"
                        initial={{ opacity: 0, y: 14, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.985 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="space-y-4"
                      >
                        <div className="rounded-control border border-border/70 bg-background/70 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 truncate text-muted">
                            <strong className="text-foreground">{displayName.trim() || cleanEmailLower}</strong>
                            <span className="mx-1.5">·</span>
                            <span>{cleanEmailLower}</span>
                          </div>
                          <button
                            type="button"
                            disabled={anyBusy}
                            onClick={() => {
                              setError('');
                              setCreateStep(1);
                            }}
                            className="text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                          >
                            កែប្រែ
                          </button>
                        </div>

                        <Field label="១. លេខសម្ងាត់ (Password)" hint="ត្រូវមានយ៉ាងតិច 6 តួអក្សរ">
                          <div className="relative flex items-center">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              value={password}
                              onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                              }}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              className={`${inputClass} pr-12`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={showPassword ? 'លាក់លេខសម្ងាត់' : 'បង្ហាញលេខសម្ងាត់'}
                              className="absolute right-0.5 inline-flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-foreground cursor-pointer"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </Field>

                        <Field label="២. Continue Password (បញ្ជាក់លេខសម្ងាត់ម្ដងទៀត)">
                          <div className="relative flex items-center">
                            <input
                              type={showContinuePassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              value={continuePassword}
                              onChange={(e) => {
                                setContinuePassword(e.target.value);
                                setError('');
                              }}
                              placeholder="••••••••"
                              autoComplete="new-password"
                              className={`${inputClass} pr-12`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowContinuePassword((v) => !v)}
                              aria-label={showContinuePassword ? 'លាក់លេខសម្ងាត់' : 'បង្ហាញលេខសម្ងាត់'}
                              className="absolute right-0.5 inline-flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-foreground cursor-pointer"
                            >
                              {showContinuePassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </Field>
                      </motion.div>
                    )}

                    {createStep === 3 && (
                      <motion.div
                        key="create-step-3"
                        initial={{ opacity: 0, y: 14, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.985 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="space-y-3"
                      >
                        <div className="rounded-control border border-border/70 bg-background/70 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 truncate text-muted">
                            <strong className="text-foreground">{displayName.trim() || cleanEmailLower}</strong>
                            <span className="mx-1.5">·</span>
                            <span>{cleanEmailLower}</span>
                          </div>
                          <button
                            type="button"
                            disabled={anyBusy}
                            onClick={() => {
                              setError('');
                              setCreateStep(2);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                          >
                            <ArrowLeft className="h-3 w-3" />
                            <span>ត្រឡប់ក្រោយ</span>
                          </button>
                        </div>

                        <div className="rounded-control border border-primary/25 bg-background/75 p-3 sm:p-4 space-y-3 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
                              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                              <span>ផ្ទៀងផ្ទាត់លេខកូដ OTP (៦ ខ្ទង់)</span>
                            </div>
                            {isOtpVerifiedForCurrentEmail ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                <span>បានផ្ទៀងផ្ទាត់រួចរាល់</span>
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted">
                                បញ្ចូល OTP ៦ ខ្ទង់ដើម្បីបង្កើត
                              </span>
                            )}
                          </div>

                          <div className="space-y-2.5">
                            <Button
                              type="button"
                              tone="quiet"
                              disabled={otpRequestBusy || otpCooldownSec > 0 || anyBusy}
                              onClick={handleRequestMasterOtp}
                              className="w-full min-h-10 px-3 text-xs font-semibold"
                            >
                              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span>
                                {otpRequestBusy
                                  ? 'កំពុងផ្ញើ OTP...'
                                  : otpCooldownSec > 0
                                  ? `ផ្ញើ OTP ម្ដងទៀត (${otpCooldownSec}s)`
                                  : 'ផ្ញើ OTP ទៅ Gmail'}
                              </span>
                            </Button>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                autoFocus
                                value={otpCodeInput}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D+/g, '').slice(0, 6);
                                  setOtpCodeInput(digits);
                                  setOtpErrorMsg('');
                                  setError('');
                                }}
                                disabled={isOtpVerifiedForCurrentEmail}
                                placeholder="បញ្ចូល OTP ៦ ខ្ទង់"
                                aria-label="លេខកូដ OTP ៦ ខ្ទង់"
                                className={`${inputClass} min-h-10 min-w-0 flex-1 text-center font-mono font-bold tracking-[0.25em] placeholder:font-sans placeholder:font-medium placeholder:tracking-normal tabular-nums disabled:opacity-70`}
                              />
                              <Button
                                type="button"
                                tone={isOtpVerifiedForCurrentEmail ? 'quiet' : 'primary'}
                                disabled={
                                  isOtpVerifiedForCurrentEmail ||
                                  otpVerifyBusy ||
                                  otpCodeInput.replace(/\D+/g, '').length !== 6
                                }
                                onClick={handleVerifyOtpClick}
                                className="min-h-10 px-3 text-xs font-semibold shrink-0 whitespace-nowrap"
                              >
                                {isOtpVerifiedForCurrentEmail ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                    <span>រួចរាល់</span>
                                  </>
                                ) : otpVerifyBusy ? (
                                  <span>កំពុងពិនិត្យ...</span>
                                ) : (
                                  <span>ផ្ទៀងផ្ទាត់ OTP</span>
                                )}
                              </Button>
                            </div>
                          </div>

                          {isOtpVerifiedForCurrentEmail && (
                            <p role="status" className="text-xs font-medium text-primary flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                              <span>បានផ្ទៀងផ្ទាត់លេខកូដ OTP សម្រាប់ {cleanEmailLower} ត្រឹមត្រូវ!</span>
                            </p>
                          )}

                          {otpInfoMsg && !isOtpVerifiedForCurrentEmail && (
                            <p role="status" className="text-xs text-primary leading-relaxed">
                              {otpInfoMsg}
                            </p>
                          )}

                          {otpErrorMsg && (
                            <div role="alert" className="space-y-2">
                              <p className="text-xs font-medium text-danger leading-relaxed">
                                {otpErrorMsg}
                              </p>
                              {otpTelegramFallbackUrl && (
                                <a
                                  href={otpTelegramFallbackUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                                >
                                  <Send className="h-3.5 w-3.5 shrink-0" />
                                  <span>ទាក់ទង Developer តាម Telegram ដើម្បីទទួល OTP</span>
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {createStep === 4 && (
                      <motion.div
                        key="create-step-4"
                        initial={{ opacity: 0, y: 14, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.985 }}
                        transition={{ duration: 0.24, ease: 'easeOut' }}
                        className="space-y-3"
                      >
                        <div className="rounded-control border border-border/70 bg-background/70 px-3 py-2 flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 truncate text-muted">
                            <strong className="text-foreground">{displayName.trim() || cleanEmailLower}</strong>
                            <span className="mx-1.5">·</span>
                            <span>{cleanEmailLower}</span>
                            <span className="mx-1.5">·</span>
                            <span className="font-semibold text-primary">OTP ✓</span>
                          </div>
                          <button
                            type="button"
                            disabled={anyBusy}
                            onClick={() => {
                              setError('');
                              setCreateStep(3);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0 cursor-pointer"
                          >
                            <ArrowLeft className="h-3 w-3" />
                            <span>ត្រឡប់ក្រោយ</span>
                          </button>
                        </div>

                        <PosSliderCaptcha
                          key={captchaResetKey}
                          verified={captchaVerified}
                          disabled={anyBusy}
                          onVerifiedChange={(ok) => {
                            setCaptchaVerified(ok);
                            if (ok) setError('');
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <>
                  <Field
                    label={
                      activeMode === 'sale-signin'
                        ? 'អាសយដ្ឋាន Gmail របស់ Admin (Admin Gmail)'
                        : 'អាសយដ្ឋាន Gmail របស់ Admin'
                    }
                  >
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@gmail.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </Field>

                  {activeMode === 'sale-signin' && (
                    <Field
                      label="ឈ្មោះ Sale (ដែល Admin បានកំណត់)"
                      hint="បញ្ចូលឈ្មោះ Sale អោយត្រូវគ្នានឹងឈ្មោះដែល Admin បានបង្កើតក្នុងប្រព័ន្ធ"
                    >
                      <input
                        type="text"
                        required
                        value={saleName}
                        onChange={(e) => setSaleName(e.target.value)}
                        placeholder="ឧ. សុខ ចាន់ណា / Sale A"
                        autoComplete="username"
                        className={inputClass}
                      />
                    </Field>
                  )}

                  <Field label="លេខសម្ងាត់ (Password)" hint="ត្រូវមានយ៉ាងតិច 6 តួអក្សរ">
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className={`${inputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'លាក់លេខសម្ងាត់' : 'បង្ហាញលេខសម្ងាត់'}
                        className="absolute right-0.5 inline-flex h-11 w-11 items-center justify-center rounded-control text-muted hover:text-foreground cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  role="status"
                  className="rounded-control border border-primary/40 bg-primary/10 px-3.5 py-3 text-xs sm:text-sm font-medium text-foreground leading-relaxed flex items-start gap-2"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  role="alert"
                  className="rounded-control border border-danger/45 bg-danger/10 px-3.5 py-3 text-xs sm:text-sm font-medium text-danger leading-relaxed space-y-2.5"
                >
                  <p>{error}</p>

                  {operationNotAllowed && isDesktop && (
                    <div className="rounded-control border border-border/70 bg-surface p-3 text-xs text-foreground space-y-2.5">
                      <p className="font-semibold text-foreground leading-snug">
                        របៀបបើក Email/Password ក្នុង Firebase Console (ប្រើពេល ១០ វិនាទី)៖
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-muted leading-relaxed">
                        <li>ចុចប៊ូតុងខាងក្រោមដើម្បីបើក Firebase Authentication Providers</li>
                        <li>ចុច <strong>Add new provider</strong> → ជ្រើសរើស <strong>Email/Password</strong></li>
                        <li>បើក <strong>Enable</strong> រួចចុច <strong>Save</strong> ហើយមកចុចបង្កើតគណនីម្ដងទៀត</li>
                      </ol>
                      <div className="pt-1">
                        <a
                          href={firebaseProvidersUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full min-h-11 items-center justify-center gap-1.5 rounded-control border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface transition-colors text-center"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>បើក Firebase Console</span>
                        </a>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              <div className="pt-1 space-y-2.5">
                {activeMode === 'create-admin' ? (
                  createStep < 4 ? (
                    <div className="flex items-center gap-2">
                      {createStep > 1 && (
                        <Button
                          type="button"
                          tone="quiet"
                          disabled={anyBusy}
                          onClick={() => {
                            setError('');
                            setCreateStep((prev) => (prev === 3 ? 2 : 1));
                          }}
                          className="min-h-11 px-4 text-sm shrink-0"
                        >
                          <ArrowLeft className="h-4 w-4 shrink-0" />
                          <span>ត្រឡប់ក្រោយ</span>
                        </Button>
                      )}
                      <Button
                        type="submit"
                        tone="primary"
                        disabled={anyBusy || (createStep === 3 && !canAdvanceStep3Otp)}
                        className="flex-1 py-3 whitespace-normal text-center text-sm sm:text-base"
                      >
                        <span>
                          {stepCheckingBusy
                            ? 'កំពុងត្រួតពិនិត្យ Gmail...'
                            : otpVerifyBusy
                            ? 'កំពុងផ្ទៀងផ្ទាត់ OTP...'
                            : 'បន្ទាប់'}
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                          type="button"
                          tone="quiet"
                          disabled={anyBusy}
                          onClick={() => {
                            setError('');
                            setCreateStep(3);
                          }}
                          className="min-h-11 px-4 text-sm shrink-0"
                        >
                          <ArrowLeft className="h-4 w-4 shrink-0" />
                          <span>ត្រឡប់ក្រោយ</span>
                        </Button>
                        <Button
                          type="submit"
                          tone="primary"
                          disabled={anyBusy || !canSubmitFinalCreateAdmin}
                          className="flex-1 py-3 whitespace-normal text-center text-sm sm:text-base"
                        >
                          <KeyRound className="h-4 w-4 shrink-0" />
                          <span>
                            {busy
                              ? 'កំពុងភ្ជាប់គណនី...'
                              : 'បង្កើត Admin & ចូលប្រើ (Create Admin & Sign In)'}
                          </span>
                        </Button>
                      </div>

                      {isDesktop && (
                        <Button
                          type="button"
                          tone="quiet"
                          disabled={anyBusy || !canSubmitFinalCreateAdmin}
                          onClick={handleCreateAnotherAdmin}
                          className="w-full py-2.5 whitespace-normal text-center text-xs sm:text-sm"
                        >
                          <UserPlus className="h-4 w-4 text-primary shrink-0" />
                          <span>
                            {creatingAdditionalBusy
                              ? 'កំពុងបង្កើតគណនី Admin មេ...'
                              : '+ បង្កើត Admin មេថ្មីបន្ថែមទៀត (Gmail ផ្សេងទៀត)'}
                          </span>
                        </Button>
                      )}
                    </>
                  )
                ) : (
                  <Button
                    type="submit"
                    tone="primary"
                    disabled={anyBusy}
                    className="w-full py-3 whitespace-normal text-center text-sm sm:text-base"
                  >
                    <Lock className="h-4 w-4 shrink-0" />
                    <span>
                      {busy
                        ? 'កំពុងភ្ជាប់គណនី...'
                        : activeMode === 'admin-signin'
                        ? 'ចូលគណនី Admin (Admin Sign In)'
                        : 'ចូលប្រើប្រាស់គណនី Sale (Sign In)'}
                    </span>
                  </Button>
                )}
              </div>
            </motion.form>
          </AnimatePresence>

          {/* Compact Key Developer Button at Bottom-Right */}
          {isDesktop && (
            <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-end">
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setDevAuthError('');
                  setDevFeedback(null);
                  setDevModalOpen(true);
                }}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-border/90 bg-background/80 px-2.5 py-1.5 text-[11px] font-semibold text-muted hover:text-primary hover:border-primary/60 cursor-pointer transition-colors shadow-xs"
              >
                <Code2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Key Developer</span>
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Key Developer Verification & License Console Modal */}
      <AnimatePresence>
        {devModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Key Developer Console"
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/65 backdrop-blur-[2px] p-3 sm:p-5"
            onClick={() => setDevModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Surface className="flex flex-col max-h-[90dvh] overflow-hidden shadow-float border-primary/25">
                <div className="flex items-center justify-between border-b border-border/60 px-4 sm:px-6 py-3.5 bg-surface shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-control bg-primary/12 border border-primary/30 flex items-center justify-center shrink-0">
                      <Code2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-foreground truncate">
                        Key Developer
                      </h3>
                      <p className="text-[11px] text-muted truncate">
                        គណនី Free ១ខែ
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {devToken && (
                      <>
                        <Button
                          tone="quiet"
                          disabled={devRefreshing}
                          onClick={handleRefreshDevOverview}
                          className="min-h-9 px-2.5 text-xs whitespace-nowrap shrink-0"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${devRefreshing ? 'animate-spin' : ''}`} />
                          <span>ធ្វើបច្ចុប្បន្នភាព</span>
                        </Button>
                        <Button
                          tone="quiet"
                          onClick={() => {
                            setDevToken('');
                            setDevFeedback(null);
                            setDevGeneratedOtp(null);
                            setDevOtpEmail('');
                          }}
                          className="min-h-9 px-2.5 text-xs whitespace-nowrap shrink-0"
                        >
                          <Lock className="h-3.5 w-3.5" /> Lock
                        </Button>
                      </>
                    )}
                    <Button
                      tone="quiet"
                      onClick={() => setDevModalOpen(false)}
                      className="min-h-9 min-w-9 px-2.5"
                      aria-label="បិទ"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                  {!devToken ? (
                    <form onSubmit={handleVerifyDevKey} className="max-w-md mx-auto py-4 space-y-4">
                      <div className="rounded-control border border-primary/30 bg-primary/8 p-3.5 text-xs text-foreground leading-relaxed">
                        មុខងារនេះសម្រាប់តែ Developer ម្នាក់ប៉ុណ្ណោះ
                      </div>

                      <Field label="បញ្ចូល Key Developer">
                        <input
                          type="password"
                          required
                          autoFocus
                          value={devKeyInput}
                          onChange={(e) => setDevKeyInput(e.target.value)}
                          placeholder="••••••••••••"
                          className={inputClass}
                        />
                      </Field>

                      {devAuthError && (
                        <p role="alert" className="text-xs font-semibold text-danger">
                          {devAuthError}
                        </p>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button tone="quiet" onClick={() => setDevModalOpen(false)}>
                          បោះបង់
                        </Button>
                        <Button type="submit" tone="primary" disabled={devVerifying}>
                          <KeyRound className="h-4 w-4 shrink-0" />
                          <span>{devVerifying ? 'កំពុងផ្ទៀងផ្ទាត់...' : 'បើក Developer Console'}</span>
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-5">
                      {devFeedback && (
                        <div
                          role={devFeedback.type === 'error' ? 'alert' : 'status'}
                          className={`rounded-control border px-3.5 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2 ${
                            devFeedback.type === 'error'
                              ? 'border-danger/45 bg-danger/10 text-danger'
                              : 'border-primary/40 bg-primary/10 text-foreground'
                          }`}
                        >
                          <CheckCircle2
                            className={`h-4 w-4 shrink-0 ${
                              devFeedback.type === 'error' ? 'text-danger' : 'text-primary'
                            }`}
                          />
                          <span>{devFeedback.message}</span>
                        </div>
                      )}

                      {/* Top 3-Category Summary Strip (Separated Metrics with Direct Filter Click) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/60 rounded-card border border-border/80 bg-background/60 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setDevCategoryTab('trial')}
                          className={`p-3.5 text-left transition-colors cursor-pointer ${
                            devCategoryTab === 'trial' ? 'bg-amber-500/10' : 'hover:bg-surface/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted">
                              ១. ទើបបង្កើតថ្មី Free ១ខែ
                            </span>
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                          </div>
                          <p className="mt-1 text-xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                            {totalTrialCount}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDevCategoryTab('paid-active')}
                          className={`p-3.5 text-left transition-colors cursor-pointer ${
                            devCategoryTab === 'paid-active' ? 'bg-primary/10' : 'hover:bg-surface/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted">
                              ២. មិនទាន់អស់សុពលភាព (បន្តរួច)
                            </span>
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                          </div>
                          <p className="mt-1 text-xl font-bold tabular-nums text-primary">
                            {totalPaidActiveCount}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDevCategoryTab('expired')}
                          className={`p-3.5 text-left transition-colors cursor-pointer ${
                            devCategoryTab === 'expired' ? 'bg-danger/10' : 'hover:bg-surface/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-muted">
                              ៣. អស់សុពលភាព (Expire)
                            </span>
                            <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                          </div>
                          <p className="mt-1 text-xl font-bold tabular-nums text-danger">
                            {totalExpiredCount}
                          </p>
                        </button>
                      </div>

                      {/* 1. Telegram Developer Link */}
                      <form
                        onSubmit={handleSaveDevTelegram}
                        className="rounded-card border border-border/80 bg-background/60 p-4 space-y-3"
                      >
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                          <Send className="h-4 w-4 text-primary shrink-0" />
                          <span>តំណ Link Telegram Developer (បង្ហាញពេល App Expire &amp; ក្នុង Settings)</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            required
                            value={devTelegramInput}
                            onChange={(e) => setDevTelegramInput(e.target.value)}
                            placeholder="https://t.me/houtdara"
                            className={`${inputClass} flex-1 font-mono text-xs sm:text-sm`}
                          />
                          <Button type="submit" tone="primary" disabled={devActionBusy} className="shrink-0">
                            <Sparkles className="h-4 w-4 shrink-0" /> រក្សាទុក Telegram Link
                          </Button>
                        </div>
                      </form>

                      {/* 1B. Developer OTP Generator for New Master Admin Accounts */}
                      <form
                        onSubmit={handleIssueDevMasterOtp}
                        className="rounded-card border border-primary/30 bg-background/60 p-4 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                            <span>បង្កើតលេខកូដ OTP ៦ ខ្ទង់ (សម្រាប់បង្កើតគណនី Admin មេថ្មី)</span>
                          </div>
                          <span className="text-[11px] text-muted">សុពលភាព ១០ នាទី · ប្រើបាន ១ ដង</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="email"
                            required
                            value={devOtpEmail}
                            onChange={(e) => setDevOtpEmail(e.target.value)}
                            placeholder="បញ្ចូល Gmail របស់ Admin មេថ្មី (ឧ. shop@gmail.com)"
                            className={`${inputClass} flex-1 text-xs sm:text-sm`}
                          />
                          <Button type="submit" tone="primary" disabled={devOtpBusy} className="shrink-0">
                            <KeyRound className="h-4 w-4 shrink-0" />
                            <span>{devOtpBusy ? 'កំពុងបង្កើត...' : 'បង្កើតលេខកូដ OTP'}</span>
                          </Button>
                        </div>
                        {devGeneratedOtp && (
                          <div className="rounded-control border border-primary/35 bg-primary/8 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs text-muted truncate">
                                សម្រាប់ Gmail៖{' '}
                                <strong className="text-foreground">{devGeneratedOtp.email}</strong>
                              </p>
                              <p className="text-lg sm:text-xl font-bold font-mono tracking-[0.25em] text-primary tabular-nums">
                                {devGeneratedOtp.otpCode}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(devGeneratedOtp.otpCode).catch(() => {});
                                setDevOtpCopied(true);
                                window.setTimeout(() => setDevOtpCopied(false), 2000);
                              }}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-control border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer shrink-0"
                            >
                              {devOtpCopied ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-primary" />
                                  <span>បានចម្លង!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-primary" />
                                  <span>ចម្លង OTP</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </form>

                      {/* 2. Master Admins Separated Directory + Expire Adjustment Control */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                        {/* Left: Search + 3 Separated Categories Directory */}
                        <div className="lg:col-span-7 rounded-card border border-border/80 bg-background/60 p-4 space-y-3.5">
                          {/* Search Box (By Master Admin Gmail or Name) */}
                          <div className="space-y-2">
                            <label className="block text-xs sm:text-sm font-semibold text-foreground">
                              ស្វែងរកតាម Gmail &quot;Admin មេ&quot; ឬ តាមឈ្មោះ ({filteredClassifiedAdmins.length}/{devMasterAdmins.length})
                            </label>
                            <div className="relative flex items-center">
                              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted" />
                              <input
                                type="search"
                                value={devSearch}
                                onChange={(e) => setDevSearch(e.target.value)}
                                placeholder="វាយ Gmail Admin មេ ឬ ឈ្មោះហាង ដើម្បីស្វែងរក..."
                                className={`${inputClass} pl-9 pr-9`}
                              />
                              {devSearch && (
                                <button
                                  type="button"
                                  onClick={() => setDevSearch('')}
                                  aria-label="សម្អាតការស្វែងរក"
                                  className="absolute right-2 inline-flex h-8 w-8 items-center justify-center rounded-control text-muted hover:text-foreground cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Segmented Category Filter Tabs */}
                          <div className="flex flex-wrap items-center gap-1.5 rounded-control bg-surface border border-border/70 p-1">
                            {[
                              {
                                id: 'all' as const,
                                label: `ទាំង ៣ ផ្នែក (${filteredClassifiedAdmins.length})`,
                              },
                              {
                                id: 'trial' as const,
                                label: `១. Free ១ខែ (${trialAdmins.length})`,
                              },
                              {
                                id: 'paid-active' as const,
                                label: `២. មិនទាន់ Expire (${paidActiveAdmins.length})`,
                              },
                              {
                                id: 'expired' as const,
                                label: `៣. Expire (${expiredAdmins.length})`,
                              },
                            ].map((tab) => {
                              const active = devCategoryTab === tab.id;
                              return (
                                <button
                                  key={tab.id}
                                  type="button"
                                  onClick={() => setDevCategoryTab(tab.id)}
                                  className={`px-2.5 py-1.5 rounded-control text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                                    active
                                      ? tab.id === 'expired'
                                        ? 'bg-danger text-white shadow-xs'
                                        : 'bg-primary text-primary-foreground shadow-xs'
                                      : tab.id === 'expired' && expiredAdmins.length > 0
                                      ? 'text-danger hover:bg-danger/10'
                                      : 'text-muted hover:text-foreground hover:bg-background/70'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Separated Category Sections */}
                          <div className="max-h-[430px] overflow-y-auto space-y-4 pr-0.5">
                            {/* Category 1: Free 1-Month Trial */}
                            {(devCategoryTab === 'all' || devCategoryTab === 'trial') && (
                              <section className="rounded-control border border-amber-500/35 bg-surface overflow-hidden">
                                <div className="px-3.5 py-2.5 border-b border-border/50 bg-amber-500/8 flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                    ១. &quot;Admin មេ&quot; ដែលទើបបង្កើតថ្មី (Free ១ខែ)
                                  </span>
                                  <span className="text-xs font-bold tabular-nums text-amber-700 dark:text-amber-300">
                                    {trialAdmins.length} គណនី
                                  </span>
                                </div>
                                {trialAdmins.length === 0 ? (
                                  <p className="p-3.5 text-center text-xs text-muted">
                                    {devSearch
                                      ? 'រកមិនឃើញ Admin មេ ក្នុងផ្នែក Free ១ខែ ទេ។'
                                      : 'មិនមានគណនី Admin មេ ក្នុងផ្នែក Free ១ខែ ទេ។'}
                                  </p>
                                ) : (
                                  <div className="divide-y divide-border/50">
                                    {trialAdmins.map(({ adm, info }) => {
                                      const selected =
                                        devSelectedEmail.trim().toLowerCase() === adm.email.toLowerCase();
                                      return (
                                        <button
                                          key={adm.email}
                                          type="button"
                                          onClick={() => {
                                            setDevSelectedEmail(adm.email);
                                            setDevSelectedName(adm.displayName);
                                            setDevExactDate(adm.expireAt.slice(0, 10));
                                            setDevFromNow(false);
                                            setDevFeedback(null);
                                          }}
                                          className={`w-full text-left p-3 transition-colors cursor-pointer space-y-1 ${
                                            selected ? 'bg-primary/10' : 'hover:bg-background/70'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <strong className="text-xs sm:text-sm text-foreground truncate">
                                              {adm.displayName}
                                            </strong>
                                            <span className="text-[11px] font-bold tabular-nums text-amber-700 dark:text-amber-300 shrink-0">
                                              Free ១ខែ · សល់ {info.daysLeft} ថ្ងៃ
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted tabular-nums">
                                            <span className="text-foreground/85 font-medium truncate">
                                              {adm.email}
                                            </span>
                                            <span aria-hidden="true">·</span>
                                            <span>Expire: {info.formattedExpireDate}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </section>
                            )}

                            {/* Category 2: Active Renewed (Paid & Not Expired) */}
                            {(devCategoryTab === 'all' || devCategoryTab === 'paid-active') && (
                              <section className="rounded-control border border-primary/35 bg-surface overflow-hidden">
                                <div className="px-3.5 py-2.5 border-b border-border/50 bg-primary/8 flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-primary">
                                    ២. &quot;Admin មេ&quot; ដែលមិនទាន់អស់សុពលភាព (បន្តកាលបរិច្ឆេទហើយ)
                                  </span>
                                  <span className="text-xs font-bold tabular-nums text-primary">
                                    {paidActiveAdmins.length} គណនី
                                  </span>
                                </div>
                                {paidActiveAdmins.length === 0 ? (
                                  <p className="p-3.5 text-center text-xs text-muted">
                                    {devSearch
                                      ? 'រកមិនឃើញ Admin មេ ក្នុងផ្នែកមិនទាន់អស់សុពលភាព ទេ។'
                                      : 'មិនមានគណនី Admin មេ ដែលបានបន្តសុពលភាពនៅឡើយទេ។'}
                                  </p>
                                ) : (
                                  <div className="divide-y divide-border/50">
                                    {paidActiveAdmins.map(({ adm, info }) => {
                                      const selected =
                                        devSelectedEmail.trim().toLowerCase() === adm.email.toLowerCase();
                                      return (
                                        <button
                                          key={adm.email}
                                          type="button"
                                          onClick={() => {
                                            setDevSelectedEmail(adm.email);
                                            setDevSelectedName(adm.displayName);
                                            setDevExactDate(adm.expireAt.slice(0, 10));
                                            setDevFromNow(false);
                                            setDevFeedback(null);
                                          }}
                                          className={`w-full text-left p-3 transition-colors cursor-pointer space-y-1 ${
                                            selected ? 'bg-primary/10' : 'hover:bg-background/70'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <strong className="text-xs sm:text-sm text-foreground truncate">
                                              {adm.displayName}
                                            </strong>
                                            <span className="text-[11px] font-bold tabular-nums text-primary shrink-0">
                                              កំពុងប្រើប្រាស់ · សល់ {info.daysLeft} ថ្ងៃ
                                            </span>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted tabular-nums">
                                            <span className="text-foreground/85 font-medium truncate">
                                              {adm.email}
                                            </span>
                                            <span aria-hidden="true">·</span>
                                            <span>Expire: {info.formattedExpireDate}</span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </section>
                            )}

                            {/* Category 3: Expired Master Admins (With Inline Renewal Actions Right Here) */}
                            {(devCategoryTab === 'all' || devCategoryTab === 'expired') && (
                              <section className="rounded-control border border-danger/45 bg-surface overflow-hidden">
                                <div className="px-3.5 py-2.5 border-b border-danger/25 bg-danger/10 flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-danger flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                    <span>៣. &quot;Admin មេ&quot; ដែលអស់សុពលភាពប្រើប្រាស់ (Expire)</span>
                                  </span>
                                  <span className="text-xs font-bold tabular-nums text-danger">
                                    {expiredAdmins.length} គណនី
                                  </span>
                                </div>
                                {expiredAdmins.length === 0 ? (
                                  <p className="p-3.5 text-center text-xs text-muted">
                                    {devSearch
                                      ? 'រកមិនឃើញ Admin មេ ដែលផុតកំណត់ (Expire) ត្រូវនឹងការស្វែងរកទេ។'
                                      : 'មិនមានគណនី Admin មេ ណាមួយអស់សុពលភាព (Expire) ទេ។'}
                                  </p>
                                ) : (
                                  <div className="divide-y divide-border/50">
                                    {expiredAdmins.map(({ adm, info }) => {
                                      const selected =
                                        devSelectedEmail.trim().toLowerCase() === adm.email.toLowerCase();
                                      return (
                                        <div
                                          key={adm.email}
                                          className={`p-3 space-y-2.5 transition-colors ${
                                            selected ? 'bg-danger/8' : 'hover:bg-background/60'
                                          }`}
                                        >
                                          <div
                                            onClick={() => {
                                              setDevSelectedEmail(adm.email);
                                              setDevSelectedName(adm.displayName);
                                              setDevExactDate(adm.expireAt.slice(0, 10));
                                              setDevFromNow(true);
                                              setDevFeedback(null);
                                            }}
                                            className="cursor-pointer space-y-1"
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <strong className="text-xs sm:text-sm text-foreground truncate">
                                                {adm.displayName}
                                              </strong>
                                              <span className="text-[11px] font-bold text-danger shrink-0">
                                                អស់សុពលភាព (Expired)
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted tabular-nums">
                                              <span className="text-foreground/85 font-medium truncate">
                                                {adm.email}
                                              </span>
                                              <span aria-hidden="true">·</span>
                                              <span>
                                                ប្រភេទមុន៖ {adm.planType === 'trial' ? 'Free ១ខែ' : 'Paid'}
                                              </span>
                                              <span aria-hidden="true">·</span>
                                              <span className="text-danger font-medium">
                                                បាន Expire: {info.formattedExpireDate}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Inline Renewal Controls Directly Inside Expired Section */}
                                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <span className="text-[11px] font-semibold text-foreground mr-0.5">
                                              បន្តសុពលភាពភ្លាមៗ៖
                                            </span>
                                            {[
                                              { label: '+1 ខែ', unit: 'months' as const, amount: 1 },
                                              { label: '+3 ខែ', unit: 'months' as const, amount: 3 },
                                              { label: '+6 ខែ', unit: 'months' as const, amount: 6 },
                                              { label: '+1 ឆ្នាំ', unit: 'years' as const, amount: 1 },
                                            ].map((opt) => (
                                              <button
                                                key={opt.label}
                                                type="button"
                                                disabled={devActionBusy}
                                                onClick={() =>
                                                  handleQuickRenewAdmin(adm, opt.unit, opt.amount)
                                                }
                                                className="inline-flex min-h-8 items-center justify-center rounded-control border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer disabled:opacity-50"
                                              >
                                                {opt.label}
                                              </button>
                                            ))}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setDevSelectedEmail(adm.email);
                                                setDevSelectedName(adm.displayName);
                                                setDevExactDate(adm.expireAt.slice(0, 10));
                                                setDevFromNow(true);
                                                setDevFeedback(null);
                                              }}
                                              className="inline-flex min-h-8 items-center justify-center rounded-control border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer ml-auto"
                                            >
                                              កំណត់លម្អិត
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </section>
                            )}
                          </div>
                        </div>

                        {/* Right: Detailed Expire / Renewal Adjustment Controls */}
                        <div className="lg:col-span-5 rounded-card border border-border/80 bg-background/60 p-4 space-y-3.5">
                          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground">
                            <CalendarClock className="h-4 w-4 text-primary shrink-0" />
                            <span>កំណត់ ឬបន្តសុពលភាពលម្អិត (ខែ / ឆ្នាំ)</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            <Field label="Gmail របស់ «Admin មេ»">
                              <input
                                type="email"
                                value={devSelectedEmail}
                                onChange={(e) => setDevSelectedEmail(e.target.value)}
                                placeholder="master@gmail.com"
                                className={inputClass}
                              />
                            </Field>
                            <Field label="ឈ្មោះ Admin មេ">
                              <input
                                type="text"
                                value={devSelectedName}
                                onChange={(e) => setDevSelectedName(e.target.value)}
                                placeholder="ឈ្មោះហាង / Admin មេ"
                                className={inputClass}
                              />
                            </Field>
                          </div>

                          {/* Quick Add Months / Years Buttons */}
                          <div className="space-y-1.5">
                            <span className="block text-xs font-medium text-muted">
                              បន្ថែមរយៈពេលរហ័ស៖
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {[
                                { label: '+1 ខែ', unit: 'months' as const, amount: 1 },
                                { label: '+3 ខែ', unit: 'months' as const, amount: 3 },
                                { label: '+6 ខែ', unit: 'months' as const, amount: 6 },
                                { label: '+1 ឆ្នាំ', unit: 'years' as const, amount: 1 },
                              ].map((preset) => (
                                <Button
                                  key={preset.label}
                                  tone="quiet"
                                  disabled={devActionBusy}
                                  onClick={() =>
                                    handleApplyDevExpire('add', preset.unit, preset.amount)
                                  }
                                  className="min-h-10 px-2 text-xs font-semibold"
                                >
                                  {preset.label}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Custom Month / Year Input */}
                          <div className="space-y-2 border-t border-border/50 pt-3">
                            <span className="block text-xs font-medium text-muted">
                              ឬកំណត់ចំនួន ខែ / ឆ្នាំ ដោយខ្លួនឯង៖
                            </span>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                type="number"
                                min="1"
                                max="120"
                                value={devDurationAmount}
                                onChange={(e) => setDevDurationAmount(e.target.value)}
                                className={`${inputClass} tabular-nums font-semibold`}
                              />
                              <select
                                value={devDurationUnit}
                                onChange={(e) =>
                                  setDevDurationUnit(e.target.value as 'months' | 'years')
                                }
                                className={inputClass}
                              >
                                <option value="months">ខែ (Months)</option>
                                <option value="years">ឆ្នាំ (Years)</option>
                              </select>
                              <Button
                                tone="primary"
                                disabled={devActionBusy}
                                onClick={() => handleApplyDevExpire('add')}
                                className="text-xs px-2"
                              >
                                បន្តសុពលភាព
                              </Button>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={devFromNow}
                                onChange={(e) => setDevFromNow(e.target.checked)}
                                className="h-4 w-4 rounded accent-primary"
                              />
                              <span>គិតចាប់ពីថ្ងៃនេះ (មិនបូកបន្តពីថ្ងៃ Expire ចាស់)</span>
                            </label>
                          </div>

                          {/* Exact Date Override & Status Actions */}
                          <div className="space-y-2 border-t border-border/50 pt-3">
                            <span className="block text-xs font-medium text-muted">
                              កំណត់ថ្ងៃ Expire ផ្ទាល់ ឬ បិទសុពលភាព៖
                            </span>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <input
                                type="date"
                                value={devExactDate}
                                onChange={(e) => setDevExactDate(e.target.value)}
                                className={`${inputClass} flex-1`}
                              />
                              <Button
                                tone="quiet"
                                disabled={devActionBusy || !devExactDate}
                                onClick={() => handleApplyDevExpire('exact')}
                                className="text-xs shrink-0"
                              >
                                កំណត់ថ្ងៃនេះ
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                              <Button
                                tone="quiet"
                                disabled={devActionBusy}
                                onClick={() => handleApplyDevExpire('reset-trial')}
                                className="min-h-10 text-xs"
                              >
                                Reset Trial ១ ខែ
                              </Button>
                              <Button
                                tone="danger"
                                disabled={devActionBusy}
                                onClick={() => handleApplyDevExpire('expire-now')}
                                className="min-h-10 text-xs"
                              >
                                Expire ឥឡូវនេះ
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Surface>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
