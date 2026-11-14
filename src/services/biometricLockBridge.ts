import { Capacitor, registerPlugin } from '@capacitor/core';

export interface BiometricAvailability {
  available: boolean;
  biometryAvailable: boolean;
  credentialAvailable: boolean;
  status: string;
}

export interface BiometricAuthResult {
  authenticated: boolean;
  errorCode?: number;
  message?: string;
}

interface BiometricLockPluginInterface {
  checkAvailability(): Promise<BiometricAvailability>;
  authenticate(options?: { title?: string; subtitle?: string }): Promise<BiometricAuthResult>;
}

const BiometricLock = registerPlugin<BiometricLockPluginInterface>('BiometricLock');

export function isBiometricSupportedOnPlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  if (!isBiometricSupportedOnPlatform()) {
    return {
      available: false,
      biometryAvailable: false,
      credentialAvailable: false,
      status: 'WEB_UNSUPPORTED',
    };
  }
  try {
    return await BiometricLock.checkAvailability();
  } catch {
    return {
      available: false,
      biometryAvailable: false,
      credentialAvailable: false,
      status: 'PLUGIN_ERROR',
    };
  }
}

export async function authenticateFinanceAccess(
  title = 'Desbloquear Finanças',
  subtitle = 'Confirme com sua digital, rosto ou senha do aparelho'
): Promise<BiometricAuthResult> {
  if (!isBiometricSupportedOnPlatform()) {
    return { authenticated: true };
  }
  try {
    return await BiometricLock.authenticate({ title, subtitle });
  } catch (err: any) {
    return {
      authenticated: false,
      message: err?.message || 'Não foi possível validar sua identidade.',
    };
  }
}
