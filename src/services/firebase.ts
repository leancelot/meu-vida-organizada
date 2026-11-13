import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { firebaseConfig } from '../config/firebaseConfig';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.authDomain
);

// Initialize Firebase App only when configured
export const app: FirebaseApp | null = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth: Auth | null = app ? getAuth(app) : null;

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => {
  provider.addScope(scope);
});
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (never stored in localStorage or sessionStorage as required)
let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const setSessionToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    cachedAccessToken = null;
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string; isNativeRedirect?: boolean } | null> => {
  try {
    isSigningIn = true;

    // Se estiver rodando nativamente no Android (Capacitor APK)
    if (Capacitor.isNativePlatform()) {
      const baseUrl =
        (import.meta.env.VITE_APP_URL as string) ||
        'https://ais-dev-3wiiypdjeboooeth4s5qlf-202698123569.us-east1.run.app';
      const bridgeUrl = `${baseUrl.replace(/\/$/, '')}?connect_native=1`;
      await Browser.open({ url: bridgeUrl, windowName: '_system' });
      return { isNativeRedirect: true } as any;
    }

    if (!auth) {
      throw new Error('Autenticação Google não configurada neste ambiente.');
    }

    // Fluxo padrão para Navegador Web Desktop / Dev
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Falha ao obter token de acesso do Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    console.warn('Falha na autenticação do Google:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const completeNativeGoogleAuth = async (
  accessToken: string,
  idToken?: string | null
): Promise<User | null> => {
  cachedAccessToken = accessToken;

  if (auth && idToken) {
    try {
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    } catch (e) {
      console.warn('signInWithCredential fallback:', e);
    }
  }

  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      const syntheticUser = {
        uid: data.sub || 'google-user-' + Date.now(),
        displayName: data.name || data.given_name || 'Usuário Google',
        email: data.email || '',
        photoURL: data.picture || null,
        emailVerified: Boolean(data.email_verified),
      } as unknown as User;
      return syntheticUser;
    }
  } catch (err) {
    console.warn('Falha ao buscar perfil Google via access token:', err);
  }

  return null;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  if (auth) {
    await auth.signOut();
  }
  cachedAccessToken = null;
};

