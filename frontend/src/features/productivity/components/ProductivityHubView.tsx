'use client';

import HabitMatrix from '@/components/HabitMatrix';

interface AnalyticsSummary {
  totalTasksCreated: number;
  completedTasks: number;
  completionRate: string;
  hoursDedicated: string;
}

interface Analytics {
  summary: AnalyticsSummary;
  moodDistribution: Record<string, number>;
  readingSummary?: {
    totalBooks: number;
    completedBooks: number;
    pagesRead: number;
    totalPages: number;
    activeBook: string;
  };
}

interface Todo {
  id: string;
  task: string;
  isCompleted: boolean;
  timeSpent: number;
}

interface CalendarCell {
  day: number;
  active: boolean;
}

interface ProductivityHubViewProps {
  analytics: Analytics | null;
  aiReport: string;
  isAiLoading: boolean;
  todos: Todo[];
  timeRange: 'all' | 'week' | 'month';
  calendarCells: CalendarCell[];
  dailyFuelFocusTag?: string;
  onTimeRangeChange: (value: 'all' | 'week' | 'month') => void;
  onRefreshAiReport: () => void;
}

export default function ProductivityHubView({
  analytics,
  aiReport,
  isAiLoading,
  todos,
  timeRange,
  calendarCells,
  dailyFuelFocusTag,
  onTimeRangeChange,
  onRefreshAiReport,
}: ProductivityHubViewProps) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-linear-to-br from-slate-900 via-slate-800 to-slate-700 p-6 sm:p-8 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
              <span>⚡</span> Pillar 5 • Core Productivity Hub
            </span>
            <h3 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">One view for momentum, focus, and measurable progress.</h3>
            <p className="mt-2 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
              Combine your habit cadence, task completion, and reflective insight into a single decision-ready workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Current focus</p>
            <p className="mt-1 font-semibold text-white">{dailyFuelFocusTag || 'Aligned execution'}</p>
          </div>
        </div>
      </div>

      {!analytics ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6 sm:gap-8">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
            <div className="h-3 w-24 rounded-full bg-slate-100" />
            <div className="mt-4 space-y-3">
              <div className="h-3 rounded-full bg-slate-100" />
              <div className="h-3 w-5/6 rounded-full bg-slate-100" />
              <div className="h-3 w-4/5 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
            <div className="h-3 w-28 rounded-full bg-slate-100" />
            <div className="mt-4 space-y-3">
              <div className="h-3 rounded-full bg-slate-100" />
              <div className="h-3 w-5/6 rounded-full bg-slate-100" />
              <div className="h-3 w-4/5 rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end gap-2 bg-white p-1.5 rounded-xl border max-w-xs ml-auto shadow-sm">
            {(['all', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                  timeRange === range ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                {range === 'all' ? 'All Time' : `This ${range}`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Total Tracked</span>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{analytics.summary.totalTasksCreated}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Completed</span>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{analytics.summary.completedTasks}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Success Yield</span>
              <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1">{analytics.summary.completionRate}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">Hours Logged</span>
              <p className="text-2xl sm:text-3xl font-black text-purple-600 mt-1">{analytics.summary.hoursDedicated}h</p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">Reading milestones</p>
                <p className="mt-1 text-lg font-black text-slate-900">
                  {analytics.readingSummary?.completedBooks || 0}/{analytics.readingSummary?.totalBooks || 0} books completed
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {analytics.readingSummary?.pagesRead || 0} of {analytics.readingSummary?.totalPages || 0} pages read
                </p>
              </div>
              <div className="rounded-xl border border-white bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Current book</p>
                <p className="mt-1 font-semibold text-slate-900">{analytics.readingSummary?.activeBook || 'No active book'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 sm:gap-8">
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Today’s priority</p>
                    <p className="mt-2 text-lg font-black text-slate-900">{todos[0]?.task || 'Define your next high-impact task'}</p>
                  </div>
                  <div className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-white">Focus</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Completion rate</p>
                    <p className="text-sm text-slate-500 mt-1">Current momentum across your active workflow.</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg viewBox="0 0 120 120" className="h-24 w-24 -rotate-90">
                      <circle cx="60" cy="60" r="48" stroke="#e2e8f0" strokeWidth="12" fill="none" />
                      <circle
                        cx="60"
                        cy="60"
                        r="48"
                        stroke="#0f172a"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={301.6}
                        strokeDashoffset={301.6 - (301.6 * Number.parseInt(analytics.summary.completionRate.replace('%', ''), 10)) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-center">
                      <p className="text-xl font-black text-slate-900">{analytics.summary.completionRate}</p>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Done</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-900">{analytics.summary.completedTasks}</span> completed of {analytics.summary.totalTasksCreated}</p>
                    <p><span className="font-semibold text-slate-900">{analytics.summary.hoursDedicated}h</span> logged this range</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Task snapshot</p>
                    <p className="text-sm text-slate-500 mt-1">A quick pulse on your current queue.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {todos.slice(0, 4).map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{task.task}</p>
                        <p className="text-[11px] text-slate-400">{task.timeSpent} min invested</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${task.isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {task.isCompleted ? 'Done' : 'Live'}
                      </span>
                    </div>
                  ))}
                  {todos.length === 0 && <p className="text-sm text-slate-400">No tasks queued yet.</p>}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h4 className="text-md font-bold text-slate-800 mb-4">Emotional Balance Spectrum</h4>
                <div className="space-y-3">
                  {Object.entries(analytics.moodDistribution).map(([mood, count]) => (
                    <div key={mood} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{mood}</span>
                        <span className="text-slate-400">{count} times</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-slate-900 h-full rounded-full" style={{ width: `${Math.min((count / 10) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-md font-bold text-slate-800">Analytics calendar</h4>
                    <p className="text-xs text-slate-400 mt-1">A compact glance at your active cadence.</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Calendar</span>
                </div>
                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold text-slate-400">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, index) => (
                    <div key={`${label}-${index}`} className="text-[10px] uppercase tracking-[0.2em]">{label}</div>
                  ))}
                  {calendarCells.map((cell) => (
                    <div
                      key={`day-${cell.day}`}
                      className={`rounded-lg border px-1 py-2 text-sm ${cell.active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                    >
                      {cell.day}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="text-md font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <span>✨</span> AI Companion Mindset Insight
                  </h4>
                  {isAiLoading ? (
                    <div className="space-y-2 py-4">
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
                      <div className="h-3 bg-slate-100 rounded animate-pulse w-4/5" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 leading-relaxed italic whitespace-pre-wrap">"{aiReport}"</p>
                  )}
                </div>
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-medium mt-6 flex items-center justify-between">
                  <span>💡 Powered by Gemini 2.5 Flash (Free Tier)</span>
                  {!isAiLoading && (
                    <button onClick={onRefreshAiReport} className="text-emerald-700 hover:underline font-bold">
                      Refresh 🔄
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-md font-bold text-slate-800">Habit Matrix</h4>
                  <p className="text-xs text-slate-400 mt-1">Your daily consistency view is now embedded here for quick check-ins.</p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Habit cadence</span>
              </div>
              <HabitMatrix />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
