// backend/routes/notifications.js
// Notification preferences + Web Push subscriptions + test delivery.

import express from 'express';
import authMiddleware from '../auth.js';
import { prisma } from '../db.js';
import { canPush, sendToUser } from '../services/notifier.js';

const router = express.Router();

const getUserId = (req) => req.user?.userId || req.user?.id || req.userId;

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

router.use(authMiddleware);

const SAFE_PREFS = [
  'allEnabled', 'morningEnabled', 'morningTime', 'eveningEnabled',
  'eveningTime', 'timezone',
];

router.get('/prefs', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const pref = await prisma.notificationPref.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        timezone: req.query.tz || 'UTC',
      },
    });
    res.json(pref);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notification preferences.' });
  }
});

async function updatePrefs(req, res) {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const data = {};
  for (const key of SAFE_PREFS) {
    if (typeof req.body[key] === 'boolean') data[key] = req.body[key];
    else if (typeof req.body[key] === 'string') data[key] = req.body[key].slice(0, 64);
  }

  if (data.morningTime && !/^\d{2}:\d{2}$/.test(data.morningTime)) delete data.morningTime;
  if (data.eveningTime && !/^\d{2}:\d{2}$/.test(data.eveningTime)) delete data.eveningTime;

  try {
    const pref = await prisma.notificationPref.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    res.json(pref);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save notification preferences.' });
  }
}

router.put('/prefs', updatePrefs);
router.patch('/prefs', updatePrefs);

router.post('/subscribe', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const sub = req.body?.subscription;
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : null;
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : null;
  const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : null;

  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'A full push subscription is required.' });
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, userId, userAgent: String(req.headers['user-agent'] || '').slice(0, 300) },
      create: { endpoint, p256dh, auth, userId, userAgent: String(req.headers['user-agent'] || '').slice(0, 300) },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to store push subscription.' });
  }
});

router.post('/unsubscribe', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : null;
  if (!endpoint) return res.status(400).json({ error: 'Subscriptions is required.' });

  try {
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove push subscription.' });
  }
});

router.post('/test', async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  if (!canPush()) {
    return res.status(503).json({ error: 'Web Push is not configured on the server yet (missing VAPID keys).' });
  }

  try {
    const sent = await sendToUser(userId, {
      title: 'ZenJournal test 🌿',
      body: 'Your notifications are working. Calm, clear, ready.',
      url: '/today',
    });
    if (!sent) {
      return res.status(404).json({ error: 'No push subscription found for this account. Re-enable notifications in Settings, then try again.' });
    }
    res.json({ ok: true, sent });
  } catch (err) {
    console.error('[notifications] test push failed:', err?.message || err);
    if (err?.statusCode) {
      return res.status(502).json({ error: `Push service rejected the notification (HTTP ${err.statusCode}). Re-enable notifications to refresh your subscription.` });
    }
    res.status(500).json({ error: 'Failed to send test notification.' });
  }
});

export default router;