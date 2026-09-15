// src/lib/constants.ts — app-wide vocabulary (life areas, moods, states, priorities)

export const LIFE_AREAS = [
  'Career',
  'Learning',
  'Health',
  'Finance',
  'Family',
  'Relationships',
  'Spirituality',
  'Personal Growth',
  'Creativity',
  'Other',
] as const;

export const MOODS = [
  { label: 'Calm', emoji: '🌿' },
  { label: 'Focused', emoji: '🎯' },
  { label: 'Grateful', emoji: '🙏' },
  { label: 'Courageous', emoji: '🦁' },
  { label: 'Energized', emoji: '⚡' },
  { label: 'Patient', emoji: '🕊️' },
  { label: 'Anxious', emoji: '🌊' },
  { label: 'Reflective', emoji: '🌙' },
  { label: 'Tired', emoji: '🌧️' },
  { label: 'Peaceful', emoji: '🏞️' },
] as const;

export const DESIRED_STATES = [
  'Calm',
  'Focused',
  'Grateful',
  'Courageous',
  'Energized',
  'Patient',
] as const;

export const PRIORITIES = ['high', 'medium', 'low'] as const;

export const GOAL_TIMEFRAMES = ['daily', 'weekly', 'monthly', 'yearly'] as const;

export const EMOJI_BY_MOOD: Record<string, string> = MOODS.reduce(
  (acc, mood) => ({ ...acc, [mood.label]: mood.emoji }),
  {}
);

export const DEFAULT_TAGS = [
  '#career',
  '#learning',
  '#family',
  '#ideas',
  '#gratitude',
  '#problem',
  '#achievement',
  '#reflection',
] as const;

export function moodEmoji(mood: string): string {
  return EMOJI_BY_MOOD[mood] || '💭';
}

// Rough 0–100 valence used only for internal pattern comparisons — never shown as a score.
export const MOOD_VALENCE: Record<string, number> = {
  Calm: 80,
  Focused: 75,
  Grateful: 88,
  Courageous: 78,
  Energized: 85,
  Patient: 70,
  Anxious: 32,
  Reflective: 55,
  Tired: 38,
  Peaceful: 84,
};

export function moodValence(mood: string): number {
  return MOOD_VALENCE[mood] ?? 50;
}

export function friendlyDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export function timeAgo(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function hourGreeting(): { greeting: string; question: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { greeting: 'Good morning', question: 'How is your morning unfolding?' };
  if (hour < 18) return { greeting: 'Good afternoon', question: 'How is your day going?' };
  return { greeting: 'Good evening', question: 'How are you doing today?' };
}