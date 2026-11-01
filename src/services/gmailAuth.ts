import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Reuse existing app if already initialized, or initialize new
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// All Workspace Gmail scopes requested & configured
export const GMAIL_SCOPES: string[] = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.addons.current.action.compose',
  'https://www.googleapis.com/auth/gmail.addons.current.message.action',
  'https://www.googleapis.com/auth/gmail.addons.current.message.metadata',
  'https://www.googleapis.com/auth/gmail.addons.current.message.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.insert',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.settings.basic',
  'https://www.googleapis.com/auth/gmail.settings.sharing',
];

const provider = new GoogleAuthProvider();
// Add all configured Workspace Gmail scopes
GMAIL_SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'consent',
});

// In-memory token caching ONLY (Never in localStorage or sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize auth state listener.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // If user is logged in to Firebase but token is not in memory, we need re-authentication or token retrieval
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign in with Google Popup and obtain access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Gmail Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieve the in-memory cached OAuth token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Disconnect/Sign out
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};
