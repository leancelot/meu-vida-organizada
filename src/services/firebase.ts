import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

export interface GoogleSignInResult {
  user?: User;
  accessToken?: string;
  idToken?: string | null;
  isNativeRedirect?: boolean;
  isWebRedirect?: boolean;
}

export const mapGoogleAuthError = (error: unknown): string => {
  const err = error as { code?: string; message?: string } | null;
  const code = err?.code || '';
  const msg = err?.message || '';

  if (!isFirebaseConfigured || msg.includes('não configurada')) {
    return 'Configuração de login Google não carregada no servidor. Atualize a página e tente novamente.';
  }
  if (code === 'auth/popup-blocked') {
    return 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente novamente.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Este endereço ainda não está autorizado para autenticação com o Google.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Falha de conexão com a internet. Verifique sua rede e tente novamente.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'O login com Conta Google não está ativado neste projeto.';
  }
  if (code === 'auth/internal-error') {
    return 'Erro temporário ao comunicar com o Google. Tente novamente em alguns instantes.';
  }
  return 'Não foi possível autenticar com o Google. Tente novamente.';
};

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

export const consumeRedirectSignInResult = async (): Promise<{
  user: User;
  accessToken: string;
  idToken?: string | null;
} | null> => {
  if (!auth) return null;
  try {
    isSigningIn = true;
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      return null;
    }
    cachedAccessToken = credential.accessToken;
    return {
      user: result.user,
      accessToken: cachedAccessToken,
      idToken: credential.idToken || null,
    };
  } catch (error) {
    console.warn('Falha ao concluir autenticação via redirecionamento:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignIn = async (options?: {
  allowRedirectFallback?: boolean;
}): Promise<GoogleSignInResult | null> => {
  try {
    isSigningIn = true;

    // Se estiver rodando nativamente no Android (Capacitor APK)
    if (Capacitor.isNativePlatform()) {
      const baseUrl =
        (import.meta.env.VITE_APP_URL as string) ||
        'https://ais-dev-3wiiypdjeboooeth4s5qlf-202698123569.us-east1.run.app';
      const bridgeUrl = `${baseUrl.replace(/\/$/, '')}?connect_native=1`;
      await Browser.open({ url: bridgeUrl, windowName: '_system' });
      return { isNativeRedirect: true };
    }

    if (!auth) {
      throw new Error('Autenticação Google não configurada neste ambiente.');
    }

    // Fluxo padrão via popup seguro do Firebase Auth
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Falha ao obter token de acesso do Google.');
      }

      cachedAccessToken = credential.accessToken;
      return {
        user: result.user,
        accessToken: cachedAccessToken,
        idToken: credential.idToken || null,
      };
    } catch (popupError: any) {
      if (
        options?.allowRedirectFallback &&
        (popupError?.code === 'auth/popup-blocked' ||
          popupError?.code === 'auth/operation-not-supported-in-this-environment')
      ) {
        await signInWithRedirect(auth, provider);
        return { isWebRedirect: true };
      }
      throw popupError;
    }
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

