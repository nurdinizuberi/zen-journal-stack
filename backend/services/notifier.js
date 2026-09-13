// backend/services/notifier.js
// Web Push delivery + the "Daily Rhythm" scheduler.
// The scheduler runs inside the server process and is intentionally tolerant
// of restarts and sleep: it only ever sends once per calendar day (in the
// user's own timezone) and never spams.

import webpush from 'web-push';
import { prisma } from '../db.js';

let configured = false;

export function initNotifier() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:support@zenjournal.app';
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv);
    configured = true;
  }
  return configured;
}

export function canPush() {
  return configured;
}

function cleanSubscription(sub) {
  return {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
}

export async function sendToUser(userId, payload) {
  if (!configured) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(cleanSubscription(sub), JSON.stringify(payload), {
        timeout: 15000,
        TTL: 24 * 60 * 60,
      });
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }
  return sent;
}

// --- timezone helpers -----------------------------------------------------

function localParts(ts, tz) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = {};
  for (const p of fmt.formatToParts(new Date(ts))) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }
  if (parts.hour === '24') parts.hour = '00';
  return parts;
}

function ymdFromParts(p) {
  return `${p.year}-${p.month}-${p.day}`;
}

function minutesOfDay(hm) {
  const [h, m] = hm.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

function toUtcTs(y, mo, d, h, mi, tz) {
  const base = Date.UTC(+y, mo - 1, +d, h, mi);
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const roundtrip = (ts) => {
    const p = {};
    for (const part of fmt.formatToParts(new Date(ts))) {
      if (part.type !== 'literal') p[part.type] = part.value;
    }
    if (p.hour === '24') p.hour = '00';
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  };
  return base - (roundtrip(base) - base);
}

// --- scheduler ------------------------------------------------------------

const MORNING_WRAP = 2 * 60 * 60 * 1000;
const EVENING_WRAP = 3 * 60 * 60 * 1000;

async function sendDailyRhythm(now) {
  const prefs = await prisma.notificationPref.findMany({
    where: { allEnabled: true },
    include: { user: { select: { id: true } } },
  });
  for (const pref of prefs) {
    const tz = pref.timezone || 'UTC';
    const cur = localParts(now, tz);
    const today = ymdFromParts(cur);
    const curMin = minutesOfDay(`${cur.hour}:${cur.minute}`);

    if (pref.morningEnabled) {
      const last = pref.lastMorningSent ? ymdFromParts(localParts(pref.lastMorningSent.getTime(), tz)) : null;
      if ((last !== today) && curMin >= minutesOfDay(pref.morningTime) && now - toUtcTs(cur.year, cur.month, cur.day, ...pref.morningTime.split(':').map(Number), tz) <= MORNING_WRAP) {
        await sendToUser(pref.userId, {
          title: 'Good morning 🌅',
          body: 'What matters today? Set your intention and start gently.',
          url: '/today',
        });
        await prisma.notificationPref.update({
          where: { id: pref.id },
          data: { lastMorningSent: new Date(now) },
        }).catch(() => {});
      }
    }

    if (pref.eveningEnabled) {
      const last = pref.lastEveningSent ? ymdFromParts(localParts(pref.lastEveningSent.getTime(), tz)) : null;
      if ((last !== today) && curMin >= minutesOfDay(pref.eveningTime) && now - toUtcTs(cur.year, cur.month, cur.day, ...pref.eveningTime.split(':').map(Number), tz) <= EVENING_WRAP) {
        await sendToUser(pref.userId, {
          title: 'Evening check-in 🌙',
          body: 'Pause and reflect on your day. What did you learn?',
          url: '/journal/new?type=reflection',
        });
        await prisma.notificationPref.update({
          where: { id: pref.id },
          data: { lastEveningSent: new Date(now) },
        }).catch(() => {});
      }
    }
  }
}

async function sendTaskReminders(now) {
  const prefs = await prisma.notificationPref.findMany({ where: { allEnabled: true } });
  for (const pref of prefs) {
    const tz = pref.timezone || 'UTC';
    const todos = await prisma.todo.findMany({
      where: { userId: pref.userId, reminderEnabled: true, isCompleted: false },
    });
    if (!todos.length) continue;

    const cur = localParts(now, tz);
    const todayYmd = ymdFromParts(cur);

    for (const todo of todos) {
      if (!todo.reminderTime) continue;
      const [h, m] = todo.reminderTime.split(':').map(Number);

      let occurrenceDate = null; // "YYYY-MM-DD" local
      let dueTs = null;

      if (todo.reminderRepeat === 'none') {
        if (todo.reminderDate && todo.reminderDate <= todayYmd) {
          occurrenceDate = todo.reminderDate;
        } else if (todo.reminderDate) {
          continue;
        } else {
          continue;
        }
      } else if (todo.reminderRepeat === 'weekly') {
        const [ay, am, ad] = (todo.reminderDate || todayYmd).split('-').map(Number);
        const anchorTs = Date.UTC(ay, am - 1, ad);
        const anchorWeekday = new Date(anchorTs).getUTCDay();
        const todayTs = Date.UTC(+cur.year, +cur.month - 1, +cur.day);
        const todayWeekday = new Date(todayTs).getUTCDay();
        const daysIntoWeek = (todayWeekday - anchorWeekday + 7) % 7;
        const occ = new Date(todayTs - daysIntoWeek * 86400000);
        occurrenceDate = `${occ.getUTCFullYear()}-${String(occ.getUTCMonth() + 1).padStart(2, '0')}-${String(occ.getUTCDate()).padStart(2, '0')}`;
        if (todo.reminderDate && occurrenceDate < todo.reminderDate) continue;
      } else {
        // daily
        if (todo.reminderDate && todo.reminderDate > todayYmd) continue;
        occurrenceDate = todayYmd;
      }

      const [y, mo, d] = occurrenceDate.split('-').map(Number);
      dueTs = toUtcTs(y, mo, d, h, m, tz);

      const lastSentOccurrence = todo.reminderLastSentAt
        ? ymdFromParts(localParts(todo.reminderLastSentAt.getTime(), tz))
        : null;

      if (now >= dueTs && lastSentOccurrence !== occurrenceDate) {
        await sendToUser(pref.userId, {
          title: 'Task reminder ⏰',
          body: todo.title,
          url: `/tasks/${todo.id}`,
        });
        await prisma.todo.update({ where: { id: todo.id }, data: { reminderLastSentAt: new Date(now) } }).catch(() => {});
      }
    }
  }
}

export async function runSchedulerOnce() {
  if (!configured) return;
  const now = Date.now();
  await sendDailyRhythm(now);
  await sendTaskReminders(now);
}

export function startScheduler(intervalMs = 20000) {
  if (!configured) return;
  setInterval(() => {
    runSchedulerOnce().catch(() => {});
  }, intervalMs);
  runSchedulerOnce().catch(() => {});
}