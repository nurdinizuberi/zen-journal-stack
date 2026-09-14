// src/hooks/useNotifications.ts — Notification Center state for Settings + task reminders
// Never asks for permission on load. Everything here is triggered by an explicit user action.

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { NotificationPrefs } from '@/types';
import {
  notificationsSupported,
  requestNotificationPermission,
  syncPushSubscription,
  timezoneLabel,
} from '@/lib/notifications';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('zen_token');
}

export function useNotifications() {
  const token = getToken();
  const supported = typeof window !== 'undefined' && notificationsSupported();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState<{ ok: boolean; message: string } | null>(null);
  const resynced = useRef(false);

  const refreshPermission = useCallback(() => {
    if (!notificationsSupported()) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    refreshPermission();
  }, [refreshPermission]);

  const refresh = useCallback(async () => {
    if (!token) {
      setPrefs(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const tz = timezoneLabel();
      const data = await apiGet<NotificationPrefs>(`/notifications/prefs?tz=${encodeURIComponent(tz)}`, token);
      setPrefs(data);
    } catch {
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-sync the push subscription on load. Covers: permission granted while
  // signed out, a subscription the server lost, or a VAPID key change on the
  // server (getOrCreateSubscription resubscribes in that case).
  useEffect(() => {
    if (!token || resynced.current) return;
    if (!notificationsSupported() || Notification.permission !== 'granted') return;
    resynced.current = true;
    syncPushSubscription(token);
  }, [token]);

  const requestPermission = useCallback(async () => {
    if (!supported) return false;
    // requestNotificationPermission fires the browser prompt synchronously,
    // inside the user gesture — awaiting anything before it voids the prompt.
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      setSyncing(true);
      await syncPushSubscription(token);
      setSyncing(false);
      return true;
    }
    return false;
  }, [supported, token]);

  const enable = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted || !token) return false;
    const tz = timezoneLabel();
    try {
      const data = await apiPatch<NotificationPrefs>(
        '/notifications/prefs',
        { allEnabled: true, timezone: tz },
        token
      );
      setPrefs(data);
      return true;
    } catch {
      return false;
    }
  }, [token, requestPermission]);

  const update = useCallback(
    async (partial: Partial<NotificationPrefs>) => {
      if (!token) return null;
      setPrefs((prev) => (prev ? { ...prev, ...partial } : prev));
      try {
        const data = await apiPatch<NotificationPrefs>('/notifications/prefs', partial, token);
        setPrefs(data);
        return data;
      } catch {
        return null;
      }
    },
    [token]
  );

  const disableAll = useCallback(async () => {
    await update({ allEnabled: false });
  }, [update]);

  const sendTest = useCallback(async () => {
    if (!token) return { ok: false, message: 'Sign in to send a test notification.' };
    setTestSending(true);
    setTestMessage(null);
    try {
      const res = await apiPost<{ ok: boolean; error?: string }>('/notifications/test', {}, token);
      const msg = { ok: true, message: 'Test notification sent — check your device 🔔' };
      setTestMessage(msg);
      return msg;
    } catch (e) {
      const msg = { ok: false, message: e instanceof Error ? e.message : 'Could not send test.' };
      setTestMessage(msg);
      return msg;
    } finally {
      setTestSending(false);
    }
  }, [token]);

  return {
    supported,
    permission,
    prefs,
    loading,
    syncing,
    testSending,
    testMessage,
    refresh,
    requestPermission,
    enable,
    update,
    disableAll,
    sendTest,
  };
}
