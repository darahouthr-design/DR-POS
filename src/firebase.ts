import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  getAuth,
  GoogleAuthProvider,
  initializeAuth,
  inMemoryPersistence,
  linkWithCredential,
  sendEmailVerification,
  setPersistence,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  enableIndexedDbPersistence,
  getDocFromServer,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const firestorePersistenceReady: Promise<void> =
  typeof window !== 'undefined'
    ? enableIndexedDbPersistence(db).catch((err: { code?: string }) => {
        if (err?.code === 'failed-precondition') {
          // Multiple tabs open; offline persistence can only be enabled in one tab at a time.
          console.warn(
            'Firestore IndexedDB persistence unavailable (multiple tabs open):',
            err
          );
        } else if (err?.code === 'unimplemented') {
          // Browser environment does not support all required IndexedDB features.
          console.warn(
            'Firestore IndexedDB persistence is not supported in this browser:',
            err
          );
        } else {
          console.warn('Failed to enable Firestore IndexedDB persistence:', err);
        }
      })
    : Promise.resolve();
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.error('Failed to enable Firebase Auth local persistence:', err);
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function getOrCreateSecondaryFirebase(): {
  secondaryApp: FirebaseApp;
  secondaryAuth: ReturnType<typeof getAuth>;
  secondaryDb: Firestore;
} {
  const SECONDARY_NAME = 'drpos-secondary-admin';
  const alreadyExists = getApps().some((a) => a.name === SECONDARY_NAME);
  const secondaryApp = alreadyExists
    ? getApp(SECONDARY_NAME)
    : initializeApp(firebaseConfig, SECONDARY_NAME);
  const secondaryAuth = alreadyExists
    ? getAuth(secondaryApp)
    : initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
  const secondaryDb = getFirestore(secondaryApp, firebaseConfig.firestoreDatabaseId);
  return { secondaryApp, secondaryAuth, secondaryDb };
}

export async function createSecondaryAdminUser(
  rawEmail: string,
  password: string,
  displayName: string,
  onSeedWorkspace?: (targetDb: Firestore, uid: string, email: string, name: string) => Promise<void>
): Promise<{ uid: string; email: string; displayName: string }> {
  const email = rawEmail.trim().toLowerCase();
  const cleanName = displayName.trim() || email.split('@')[0] || 'DR-POS Admin';
  const { secondaryAuth, secondaryDb } = getOrCreateSecondaryFirebase();

  try {
    const methods = await fetchSignInMethodsForEmail(secondaryAuth, email).catch(() => []);
    if (methods.length > 0) {
      const dupErr = new Error('auth/email-already-in-use') as Error & { code?: string };
      dupErr.code = 'auth/email-already-in-use';
      throw dupErr;
    }

    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await updateProfile(cred.user, { displayName: cleanName }).catch(() => {});
    sendEmailVerification(cred.user).catch(() => {});

    if (onSeedWorkspace) {
      await onSeedWorkspace(secondaryDb, cred.user.uid, email, cleanName).catch(() => {});
    }

    return {
      uid: cred.user.uid,
      email,
      displayName: cleanName,
    };
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }
}

export async function setOrLinkCurrentAdminPassword(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('សូមចូលគណនី Admin ជាមុនសិន។');
  }
  const hasPasswordProvider = user.providerData.some((p) => p.providerId === 'password');
  if (hasPasswordProvider) {
    await updatePassword(user, newPassword);
    return;
  }
  const credential = EmailAuthProvider.credential(user.email, newPassword);
  await linkWithCredential(user, credential);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  await firestorePersistenceReady;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();
