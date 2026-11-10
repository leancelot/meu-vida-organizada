/**
 * Web Notifications API Service (Silencioso - Sem alertas sonoros)
 */

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
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
 * Triggers a silent Web Notification if permission is granted
 */
export function sendWebNotification(
  title: string,
  options?: {
    body?: string;
    tag?: string;
    onClick?: () => void;
  }
): boolean {
  // Som removido a pedido do usuário
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notification = new Notification(title, {
      body: options?.body,
      tag: options?.tag,
      icon: '/favicon.ico',
      silent: true, // Garante que o navegador não emita som
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
