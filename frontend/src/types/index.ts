// src/types/index.ts — shared domain types for the ZenJournal redesign

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  tags: string[];
  lifeArea?: string | null;
  isFavorite: boolean;
  voiceTranscript?: string;
  attachments?: Array<{ url: string; name: string; fileType: string }>;
  goalId?: string | null;
  goal?: { id: string; title: string } | null;
  todoId?: string | null;
  todo?: { id: string; task: string } | null;
  bookId?: string | null;
  book?: { id: string; title: string; author: string } | null;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: string;
  task: string;
  isCompleted: boolean;
  timeSpent: number;
  dueDate: string;
  createdAt: string;
  updatedAt?: string;
  goalId?: string | null;
  goal?: { id: string; title: string } | null;
  priority: Priority;
  lifeArea?: string | null;
  notes?: string;
  reminderEnabled?: boolean;
  reminderTime?: string | null;
  reminderDate?: string | null;
  reminderRepeat?: 'none' | 'daily' | 'weekly';
  reminderLastSentAt?: string | null;
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly';

export interface NotificationPrefs {
  id: string;
  allEnabled: boolean;
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
  timezone: string;
  lastMorningSent?: string | null;
  lastEveningSent?: string | null;
  updatedAt?: string;
}

export interface GoalMilestone {
  id: string;
  title: string;
  completed: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  whyItMatters: string;
  lifeArea?: string | null;
  timeframe: string;
  targetDate?: string | null;
  progress: number;
  milestones: GoalMilestone[];
  isCompleted: boolean;
  createdAt: string;
  todos?: Array<{ id: string; task: string; isCompleted: boolean }>;
  books?: Array<{ id: string; title: string; status: string }>;
  entries?: Array<{ id: string; title: string; mood: string; createdAt: string; content: string }>;
}

export interface ReadingBook {
  id: string;
  title: string;
  author: string;
  totalPages: number;
  currentPage: number;
  notes: string;
  keyIdeas: string;
  reflection: string;
  completed: boolean;
  status: 'reading' | 'completed' | 'paused' | 'wishlist';
  startDate?: string | null;
  completedDate?: string | null;
  goalId?: string | null;
  goal?: { id: string; title: string } | null;
  lifeArea?: string | null;
  createdAt: string;
}

export interface DailyIntention {
  id: string;
  date: string;
  intention: string;
  priority?: string | null;
  desiredState?: string | null;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  completedAt: string;
}

export interface Habit {
  id: string;
  name: string;
  description: string | null;
  streakCount: number;
  logs: HabitLog[];
}

export interface InsightObservation {
  icon: string;
  title: string;
  message: string;
  tone: 'positive' | 'gentle' | 'neutral';
}

export interface DayOfWeekStat {
  label: string;
  count: number;
}

export interface HourBucketStat {
  label: string;
  count: number;
}

export interface IntentionComparison {
  ready: boolean;
  intentionDays: number;
  otherDays: number;
  avgWordsWith: number;
  avgWordsWithout: number;
  dominantMoodWith: string;
  dominantMoodWithout: string;
  taskCompletionWith: number;
  taskCompletionWithout: number;
}

export interface ThemeMood {
  theme: string;
  count: number;
  mood: string;
  moodShare: number;
}

export interface InsightData {
  totals: {
    reflections: number;
    tasksCompleted: number;
    goalsCompleted: number;
    booksCompleted: number;
    favorites: number;
  };
  streak: number;
  thisWeek: number;
  thisMonth: number;
  moodDistribution: Record<string, number>;
  moodByWeek: Record<string, number>;
  moodByMonth: Record<string, number>;
  moodDeltas: Record<string, number>;
  topics: Record<string, number>;
  booksReading: number;
  observations: InsightObservation[];
  longestStreak: number;
  dayOfWeek: DayOfWeekStat[];
  hourBuckets: HourBucketStat[];
  intentionComparison: IntentionComparison;
  themeMoods: ThemeMood[];
}

export interface AnalyticsData {
  summary: {
    totalTasksCreated: number;
    completedTasks: number;
    completionRate: string;
    hoursDedicated: string;
  };
  moodDistribution: Record<string, number>;
  readingSummary: {
    totalBooks: number;
    completedBooks: number;
    pagesRead: number;
    totalPages: number;
    activeBook: string;
  };
}