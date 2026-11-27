import type { UserRole } from '../types';

const OPERATOR_EMAIL_PREFIX = 'drpos_operator_email_';
const PENDING_OPERATOR_KEY = 'drpos_pending_operator_email';
const ROLE_PREF_PREFIX = 'drpos_role_pref_v1_';
const PENDING_ROLE_KEY = 'drpos_pending_role_pref_v1';
const AUTH_EXTERNAL_ERROR_KEY = 'drpos_auth_external_error_v1';

export interface StoredRolePref {
  role: UserRole;
  saleName?: string;
  warehouseName?: string;
  masterUid?: string;
  assignedAdminEmail?: string;
}

export const DUPLICATE_GMAIL_KHMER_ERROR =
  '⚠️ គណនី Gmail នេះមានក្នុងប្រព័ន្ធរួចរាល់ហើយ! Gmail មួយមិនអាចបង្កើតគណនី «Master Admin» ពីរដងបានជាដាច់ខាត។ សូមជ្រើសរើសផ្ទាំង «ចូលគណនី (Sign In)» ដើម្បីចូលប្រើប្រាស់។';

export const SUB_ADMIN_EXTERNAL_BLOCK_ERROR =
  '⚠️ គណនី Gmail នេះត្រូវបានបង្កើតជា Admin រង (Admin 2, 3...) នៅក្នុង Settings ដូចនេះមិនអាចយកមកបង្កើត Master Admin ឬ Sign In នៅផ្នែកខាងក្រៅបានជាដាច់ខាត! សូមប្រើ Gmail របស់ «Master Admin» ដំបូងដើម្បីចូលប្រើ រួចប្ដូរគណនី (Switch Account) នៅខាងក្នុងប្រព័ន្ធវិញ។';

export const WAREHOUSE_MANAGER_EXTERNAL_BLOCK_ERROR =
  '⚠️ គណនី Gmail នេះត្រូវបានបង្កើតជា «អ្នកគ្រប់គ្រងឃ្លាំង» នៅក្នុង Settings! Gmail នេះមិនអាចប្រើបង្កើត Master Admin ឬចូលនៅផ្នែក Admin បានទេ។ សូមចូលប្រើនៅផ្នែក «ចូលគណនី Sale» វិញ។';

export const WAREHOUSE_MANAGER_DUPLICATE_GMAIL_ERROR =
  '⚠️ គណនី Gmail នេះមាននៅក្នុងប្រព័ន្ធរួចរាល់ហើយ! Gmail ១ អាចបង្កើតបានតែម្ដងប៉ុណ្ណោះ មិនអាចបង្កើតបាន ២ ឬច្រើនដងជាដាច់ខាត។';

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

export function setPendingOperatorEmail(operatorEmail: string): void {
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
    if (
      parsed &&
      (parsed.role === 'admin' || parsed.role === 'sale' || parsed.role === 'warehouse')
    ) {
      return {
        role: parsed.role,
        saleName: typeof parsed.saleName === 'string' ? parsed.saleName : undefined,
        warehouseName:
          typeof parsed.warehouseName === 'string' ? parsed.warehouseName : undefined,
        masterUid: typeof parsed.masterUid === 'string' ? parsed.masterUid : undefined,
        assignedAdminEmail:
          typeof parsed.assignedAdminEmail === 'string'
            ? parsed.assignedAdminEmail
            : undefined,
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
    if (
      parsed &&
      (parsed.role === 'admin' || parsed.role === 'sale' || parsed.role === 'warehouse')
    ) {
      return {
        role: parsed.role,
        saleName: typeof parsed.saleName === 'string' ? parsed.saleName : undefined,
        warehouseName:
          typeof parsed.warehouseName === 'string' ? parsed.warehouseName : undefined,
        masterUid: typeof parsed.masterUid === 'string' ? parsed.masterUid : undefined,
        assignedAdminEmail:
          typeof parsed.assignedAdminEmail === 'string'
            ? parsed.assignedAdminEmail
            : undefined,
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

export function consumeExternalAuthError(): string {
  try {
    const msg = sessionStorage.getItem(AUTH_EXTERNAL_ERROR_KEY) || '';
    sessionStorage.removeItem(AUTH_EXTERNAL_ERROR_KEY);
    return msg;
  } catch {
    return '';
  }
}
