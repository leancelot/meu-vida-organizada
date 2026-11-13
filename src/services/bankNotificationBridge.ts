import { Capacitor, PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface NativePendingBankEvent {
  id: string;
  packageName?: string;
  bankName: string;
  title?: string;
  text: string;
  timestamp: number;
}

interface BankNotificationListenerPlugin {
  isPermissionGranted(): Promise<{ granted: boolean }>;
  openNotificationAccessSettings(): Promise<void>;
  getPendingNotifications(): Promise<{ notifications: NativePendingBankEvent[] }>;
  clearPendingNotifications(options?: { ids?: string[] }): Promise<void>;
  addListener(
    eventName: 'bankNotificationReceived',
    listenerFunc: (event: NativePendingBankEvent) => void
  ): Promise<PluginListenerHandle>;
}

const BankNotificationListener = registerPlugin<BankNotificationListenerPlugin>(
  'BankNotificationListener'
);

export function isAndroidNotificationCaptureSupported(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function checkBankNotificationPermission(): Promise<boolean> {
  if (!isAndroidNotificationCaptureSupported()) return false;
  try {
    const res = await BankNotificationListener.isPermissionGranted();
    return Boolean(res?.granted);
  } catch (err) {
    console.warn('Erro ao verificar permissão de leitura bancária:', err);
    return false;
  }
}

export async function openBankNotificationSettings(): Promise<boolean> {
  if (!isAndroidNotificationCaptureSupported()) return false;
  try {
    await BankNotificationListener.openNotificationAccessSettings();
    return true;
  } catch (err) {
    console.warn('Erro ao abrir configurações de acesso às notificações:', err);
    return false;
  }
}

export async function fetchNativePendingBankNotifications(): Promise<NativePendingBankEvent[]> {
  if (!isAndroidNotificationCaptureSupported()) return [];
  try {
    const res = await BankNotificationListener.getPendingNotifications();
    return Array.isArray(res?.notifications) ? res.notifications : [];
  } catch (err) {
    console.warn('Erro ao buscar notificações bancárias pendentes:', err);
    return [];
  }
}

export async function acknowledgeNativeBankNotifications(ids?: string[]): Promise<void> {
  if (!isAndroidNotificationCaptureSupported()) return;
  try {
    await BankNotificationListener.clearPendingNotifications(ids ? { ids } : undefined);
  } catch (err) {
    console.warn('Erro ao limpar fila nativa de notificações bancárias:', err);
  }
}

export async function subscribeNativeBankNotifications(
  callback: (event: NativePendingBankEvent) => void
): Promise<(() => void) | null> {
  if (!isAndroidNotificationCaptureSupported()) return null;
  try {
    const handle = await BankNotificationListener.addListener(
      'bankNotificationReceived',
      callback
    );
    return () => {
      handle.remove().catch(() => {});
    };
  } catch (err) {
    console.warn('Erro ao inscrever listener de notificações bancárias:', err);
    return null;
  }
}
