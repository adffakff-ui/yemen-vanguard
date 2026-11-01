import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  Auth,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import rawFirebaseConfig from '../../firebase-applet-config.json';

export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
  firestoreDatabaseId?: string;
  databaseId?: string;
}

/**
 * Resolves Firebase configuration dynamically.
 * Reads provided firebase-applet-config.json with optional window/runtime override.
 */
export function getFirebaseConfig(): FirebaseAppletConfig {
  const win = typeof window !== 'undefined' ? (window as any) : {};
  const runtimeOverride = win.__FIREBASE_APPLET_CONFIG__ || win.__FIREBASE_CONFIG__;

  return {
    ...rawFirebaseConfig,
    ...(runtimeOverride || {}),
  };
}

export const firebaseConfig: FirebaseAppletConfig = getFirebaseConfig();

/**
 * Dynamic, idempotent initialization of Firebase App.
 * Prevents duplicate-app initialization crashes across hot reloads and multi-service imports.
 */
function initFirebaseApp(): FirebaseApp {
  try {
    if (getApps().length > 0) {
      return getApp();
    }
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Firebase dynamic initialization error, attempting fallback recovery:', error);
    if (getApps().length > 0) {
      return getApp();
    }
    throw error;
  }
}

export const app: FirebaseApp = initFirebaseApp();

/**
 * Firebase Authentication instance
 */
export const auth: Auth = getAuth(app);

/**
 * Firestore Database instance
 * Strictly connects to firestoreDatabaseId when specified in firebase-applet-config.json,
 * defaulting to the standard default database.
 */
export const db: Firestore = (firebaseConfig as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Interactive Google Sign-In with popup
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

/**
 * Sign out the currently authenticated user
 */
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

/**
 * Check if Firebase has active valid configuration
 */
export const isFirebaseReady = (): boolean => {
  return Boolean(app && auth && db && firebaseConfig.projectId);
};

// Error handling helper as per Firebase Integration Skill specification
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

// Re-export common Firestore methods for convenience and consistency
export {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
};
