/**
 * CLASSIUM WEB PUSH & BROWSER NOTIFICATION SERVICE
 * Manages Notification API permissions, ServiceWorker registration,
 * Web Push subscriptions, and system notification delivery.
 */

export interface WebPushStatus {
  isSupported: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
  subscription: PushSubscription | null;
  platformLimitationMessage?: string;
}

export async function getWebPushStatus(): Promise<WebPushStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return {
      isSupported: false,
      permission: 'unsupported',
      isSubscribed: false,
      subscription: null,
      platformLimitationMessage: 'Este navegador não suporta a Web Notification API.'
    };
  }

  const permission = Notification.permission;
  let isSubscribed = false;
  let subscription: PushSubscription | null = null;

  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      subscription = await reg.pushManager.getSubscription();
      isSubscribed = !!subscription;
    } catch (e) {
      console.warn('[WebPush] Error checking subscription:', e);
    }
  }

  return {
    isSupported: true,
    permission,
    isSubscribed,
    subscription
  };
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[WebPush] Request permission error:', err);
    return 'denied';
  }
}

/**
 * Triggers a local browser notification when permitted (foreground or active session)
 */
export async function showBrowserNotification(
  title: string,
  options: {
    body: string;
    icon?: string;
    tag?: string;
    url?: string;
    requireInteraction?: boolean;
  }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // Prefer ServiceWorker showNotification if available
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: options.tag || 'classium-notice',
        data: { url: options.url || '/' },
        requireInteraction: options.requireInteraction || false
      });
      return true;
    }

    // Fallback to standard Notification
    new Notification(title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag || 'classium-notice'
    });
    return true;
  } catch (err) {
    console.warn('[WebPush] Show notification error:', err);
    return false;
  }
}
