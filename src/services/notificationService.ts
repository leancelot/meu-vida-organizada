/**
 * Notification Service com suporte nativo Android (Capacitor LocalNotifications)
 * e fallback suave para Web Notifications (Silencioso - Sem alertas sonoros)
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export function isNotificationSupported(): boolean {
  if (Capacitor.isNativePlatform()) {
    return true;
  }
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (Capacitor.isNativePlatform()) {
    try {
      const saved = localStorage.getItem('vidaorganizada_native_notif_perm');
      if (saved === 'granted' || saved === 'denied') return saved as NotificationPermission;
    } catch {
      // ignore
    }
    return 'default';
  }

  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await LocalNotifications.requestPermissions();
      const perm: NotificationPermission = result.display === 'granted' ? 'granted' : 'denied';
      try {
        localStorage.setItem('vidaorganizada_native_notif_perm', perm);
      } catch {
        // ignore
      }
      return perm;
    } catch (error) {
      console.warn('Erro ao solicitar permissão de notificações nativas:', error);
      return 'denied';
    }
  }

  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificações:', error);
    return 'denied';
  }
}

/**
 * Dispara uma notificação nativa no Android ou Web Notification no desktop/PWA (silenciosa)
 */
export async function sendWebNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    onClick?: () => void;
  }
): Promise<boolean> {
  // 1. Canal nativo Android via Capacitor LocalNotifications
  if (Capacitor.isNativePlatform()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== 'granted') return false;
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Math.random() * 1000000) + 1,
            title,
            body: options?.body || '',
            schedule: { at: new Date(Date.now() + 200) },
            extra: { tag: options?.tag },
          },
        ],
      });
      return true;
    } catch (e) {
      console.warn('Erro ao disparar notificação nativa:', e);
      return false;
    }
  }

  // 2. Canal Web Notifications
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: '/favicon.ico',
      silent: true, // Silencioso
    });

    if (options?.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    return true;
  } catch (error) {
    console.warn('Erro ao disparar Web Notification:', error);
    return false;
  }
}
