// src/lib/notifications.ts — Web Push helpers (graceful, calm, user-controlled)

import { apiGet, apiPost } from '@/lib/api';

export function notificationsSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const data = await apiGet<{ publicKey: string | null }>('/notifications/vapid-public-key');
    return data.publicKey || null;
  } catch {
    return null;
  }
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  try {
    // Register if needed, then wait until the SW is actually active. On the very
    // first visit, ready can stay pending until the page regains focus — the
    // waiting event resolves that case in Chrome.
    let reg = await navigator.serviceWorker.getRegistration('/');
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    if (reg && !reg.active) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        if (reg!.active) return done();
        reg!.addEventListener('activate', done, { once: true });
        if ('waiting' in navigator.serviceWorker) {
          navigator.serviceWorker.addEventListener('waiting', done, { once: true });
        }
        setTimeout(done, 5000);
      });
    }
    return reg || (await navigator.serviceWorker.ready);
  } catch {
    return null;
  }
}

function sameKey(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  return norm(a) === norm(b);
}

export async function getOrCreateSubscription(): Promise<PushSubscription | null> {
  if (getPermission() !== 'granted') return null;
  try {
    const reg = await ensureServiceWorkerRegistration();
    if (!reg) return null;
    let sub = await reg.pushManager.getSubscription();
    if (sub) {
      // If the server's VAPID key changed (e.g. re-deploy), the old subscription
      // can never receive pushes. Detect it and resubscribe once.
      const key = await fetchVapidPublicKey();
      const appServerKey = sub.options.applicationServerKey;
      let currentKey: string | null = null;
      try {
        const bytes: Uint8Array | null =
          typeof appServerKey === 'string'
            ? urlBase64ToUint8Array(appServerKey)
            : appServerKey instanceof Uint8Array
              ? new Uint8Array(appServerKey)
              : null;
        if (bytes && bytes.length) {
          let binary = '';
          for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
          currentKey = btoa(binary);
        }
      } catch {
        currentKey = null;
      }
      if (key && !sameKey(currentKey, key)) {
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
    }
    if (!sub) {
      const key = await fetchVapidPublicKey();
      if (!key) return null;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    return sub;
  } catch {
    return null;
  }
}

export async function syncPushSubscription(token: string | null): Promise<boolean> {
  if (!token || getPermission() !== 'granted') return false;
  const sub = await getOrCreateSubscription();
  if (!sub) return false;
  const json = sub.toJSON();
  try {
    await apiPost<{ ok: boolean }>(
      '/notifications/subscribe',
      {
        subscription: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        },
      },
      token,
    );
    return true;
  } catch {
    return false;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  // Must run directly in the user-gesture call stack: awaiting anything first
  // (an API fetch, a SW lookup) makes the browser drop the prompt silently.
  return Notification.requestPermission();
}

export function timezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
