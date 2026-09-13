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
    const existing = await navigator.serviceWorker.getRegistration('/');
    if (existing) return existing;
    return navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getOrCreateSubscription(): Promise<PushSubscription | null> {
  if (getPermission() !== 'granted') return null;
  try {
    const reg = await ensureServiceWorkerRegistration();
    if (!reg) return null;
    let sub = await reg.pushManager.getSubscription();
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
  return Notification.requestPermission();
}

export function timezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}