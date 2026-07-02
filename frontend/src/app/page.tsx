// src/app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { JournalView } from '@/features/journal';
import { GoalsView } from '@/features/goals';
import { ProductivityHubView } from '@/features/productivity';
import { ReadingTracker } from '@/features/reading';
import { TodosView } from '@/features/todos';
import { getApiBaseUrl } from '@/lib/api';
import { getDailyFuel, FuelQuote } from '@/utils/morningFuel';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string;
  createdAt: string;
  attachments?: Array<{ url: string; name: string; fileType: string }>;
  voiceTranscript?: string;
}

interface Todo {
  id: string;
  task: string;
  isCompleted: boolean;
  timeSpent: number;
  dueDate: string;
}

interface Analytics {
  summary: {
    totalTasksCreated: number;
    completedTasks: number;
    completionRate: string;
    hoursDedicated: string;
  };
  moodDistribution: Record<string, number>;
  readingSummary?: {
    totalBooks: number;
    completedBooks: number;
    pagesRead: number;
    totalPages: number;
    activeBook: string;
  };
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [userName, setUserName] = useState('');

  const [activeTab, setActiveTab] = useState<'journal' | 'todos' | 'goals' | 'reading' | 'productivity'>('journal');
  const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [aiReport, setAiReport] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('Calm');
  const [todoTask, setTodoTask] = useState('');

  // PILLAR 3: Morning Fuel state register
  const [dailyFuel, setDailyFuel] = useState<FuelQuote | null>(null);

  // PILLAR 2: File upload state
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // PILLAR 2: Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [trackingTodoId, setTrackingTodoId] = useState<string | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [activeBookTitle, setActiveBookTitle] = useState('No book selected yet');

  const API_BASE = getApiBaseUrl();
  const calendarCells = Array.from({ length: 35 }, (_, index) => ({
    day: index + 1,
    active: index % 3 === 0 || index % 5 === 0,
  }));

  useEffect(() => {
    const savedToken = localStorage.getItem('zen_token');
    const savedName = localStorage.getItem('zen_name');
    if (savedToken && savedName) {
      setToken(savedToken);
      setUserName(savedName);
      // Seed unique user fuel variation
      setDailyFuel(getDailyFuel(savedName));
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'journal') fetchJournalEntries();
    if (activeTab === 'todos') fetchTodos();
    if (activeTab === 'productivity') {
      fetchAnalytics();
      fetchAiReport();
    }
  }, [token, activeTab, timeRange]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (trackingTodoId) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [trackingTodoId]);

  // PILLAR 2: Audio Recording Functionality
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Could not access microphone. Check app level browser security permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearRecording = () => {
    setAudioBlob(null);
    audioChunksRef.current = [];
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isLoginView ? '/auth/login' : '/auth/signup';
    const body = isLoginView ? { email: authEmail, password: authPassword } : { email: authEmail, password: authPassword, name: authName };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Authentication failed');

      localStorage.setItem('zen_token', data.token);
      localStorage.setItem('zen_name', data.user.name);
      setToken(data.token);
      setUserName(data.user.name);
      
      // Seed right away following authentic login parameters
      setDailyFuel(getDailyFuel(data.user.name));
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setEntries([]);
    setTodos([]);
    setDailyFuel(null);
    
    // Clear active runtime clocks safely across account resets
    setTrackingTodoId(null);
    setSecondsElapsed(0);
  };

  const fetchJournalEntries = async () => {
    const res = await fetch(`${API_BASE}/entries`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setEntries(data);
  };

  const submitJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', journalTitle);
    formData.append('content', journalContent);
    formData.append('mood', journalMood);

    if (selectedFiles) {
      Array.from(selectedFiles).forEach((file) => {
        formData.append('attachments', file);
      });
    }

    if (audioBlob) {
      formData.append('voiceAudio', audioBlob, 'voice-note.wav');
    }

    const res = await fetch(`${API_BASE}/entries`, {
      method: 'POST',
      headers: { 
        Authorization: `Bearer ${token}`
      },
      body: formData,
    });

    if (res.ok) {
      setJournalTitle('');
      setJournalContent('');
      setSelectedFiles(null);
      setAudioBlob(null);
      fetchJournalEntries();
    } else {
      const errorData = await res.json();
      alert(errorData.error || 'Failed to submit modern ledger entry.');
    }
  };

  const deleteJournalEntry = async (id: string) => {
    if (!confirm('Are you sure you want to remove this reflection forever?')) return;
    const res = await fetch(`${API_BASE}/entries/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchJournalEntries();
  };

  const fetchTodos = async () => {
    const res = await fetch(`${API_BASE}/todos`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setTodos(data);
  };

  const submitTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoTask) return;
    const res = await fetch(`${API_BASE}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ task: todoTask }),
    });
    if (res.ok) {
      setTodoTask('');
      fetchTodos();
    }
  };

  const toggleTodoStatus = async (id: string, currentStatus: boolean) => {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isCompleted: !currentStatus }),
    });
    if (res.ok) fetchTodos();
  };

  const startTracking = (id: string) => {
    setTrackingTodoId(id);
    setSecondsElapsed(0);
  };

  const stopTrackingTime = async (id: string) => {
    const minutesEarned = Math.ceil(secondsElapsed / 60);
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ timeSpent: minutesEarned }),
    });
    if (res.ok) {
      setTrackingTodoId(null);
      setSecondsElapsed(0);
      fetchTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    const res = await fetch(`${API_BASE}/todos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) fetchTodos();
  };

  const fetchAnalytics = async () => {
    const res = await fetch(`${API_BASE}/analytics?range=${timeRange}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setAnalytics(data);
  };

  const fetchAiReport = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ai/report`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (res.ok) {
        setAiReport(data.report);
      } else {
        setAiReport("Could not fetch insights at this time.");
      }
    } catch (err) {
      setAiReport("Network error loading AI report.");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-100 max-w-md w-full">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-2">ZenJournal</h2>
          <p className="text-center text-sm text-slate-400 mb-6 sm:mb-8">Your focus and mindfulness sanctuary.</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLoginView && (
              <div>
                <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Full Name</label>
                <input type="text" required value={authName} onChange={(e) => setAuthName(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="Mtoo Nurdini" />
              </div>
            )}
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Email Address</label>
              <input type="email" required value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="name@domain.com" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Password</label>
              <input type="password" required value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} className="w-full mt-1 px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-slate-900 outline-none text-sm" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition text-sm shadow-sm mt-2">
              {isLoginView ? 'Sign In to Hub' : 'Create Account'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button onClick={() => setIsLoginView(!isLoginView)} className="text-xs font-semibold text-slate-500 hover:underline">
              {isLoginView ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 lg:pb-0">
      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-black text-xl tracking-tight">ZenJournal Suite</span>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium truncate max-w-25">Hi, {userName.split(' ')[0]}</span>
              <button onClick={handleLogout} className="text-xs font-bold text-red-500">Exit</button>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button onClick={() => setActiveTab('journal')} className={`pb-1 border-b-2 transition ${activeTab === 'journal' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-400'}`}>Reflections</button>
            <button onClick={() => setActiveTab('todos')} className={`pb-1 border-b-2 transition ${activeTab === 'todos' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-400'}`}>Workspaces & Tasks</button>
            <button onClick={() => setActiveTab('goals')} className={`pb-1 border-b-2 transition ${activeTab === 'goals' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-400'}`}>Intentional Horizons</button>
            <button onClick={() => setActiveTab('reading')} className={`pb-1 border-b-2 transition ${activeTab === 'reading' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-400'}`}>Reading Journey</button>
            <button onClick={() => setActiveTab('productivity')} className={`pb-1 border-b-2 transition ${activeTab === 'productivity' ? 'border-slate-900 text-slate-900 font-bold' : 'border-transparent text-slate-400'}`}>Core Productivity Hub</button>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full font-medium">Hi, {userName}</span>
            <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:text-red-600">Sign Out</button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-10">

        {/* VIEW 1: REFLECTIONS */}
        {activeTab === 'journal' && (
          <JournalView
            dailyFuel={dailyFuel}
            entries={entries}
            journalTitle={journalTitle}
            journalContent={journalContent}
            journalMood={journalMood}
            selectedFiles={selectedFiles}
            audioBlob={audioBlob}
            isRecording={isRecording}
            onJournalTitleChange={setJournalTitle}
            onJournalContentChange={setJournalContent}
            onJournalMoodChange={setJournalMood}
            onSelectedFilesChange={setSelectedFiles}
            onSubmitJournalEntry={submitJournalEntry}
            onDeleteJournalEntry={deleteJournalEntry}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onClearRecording={clearRecording}
          />
        )}

        {/* VIEW 2: TODO LIST & STOPWATCH */}
        {activeTab === 'todos' && (
          <TodosView
            todos={todos}
            trackingTodoId={trackingTodoId}
            secondsElapsed={secondsElapsed}
            todoTask={todoTask}
            onTodoTaskChange={setTodoTask}
            onSubmitTodo={submitTodo}
            onToggleTodoStatus={toggleTodoStatus}
            onStartTracking={startTracking}
            onStopTrackingTime={stopTrackingTime}
            onDeleteTodo={deleteTodo}
          />
        )}

        {/* VIEW 3: INTENTIONAL HORIZONS (GOALS ENGINE) */}
        {activeTab === 'goals' && (
          <GoalsView />
        )}

        {/* VIEW 4: READING JOURNEY */}
        {activeTab === 'reading' && (
          <div className="space-y-6">
            <div className="rounded-3xl border border-amber-200 bg-linear-to-br from-amber-50 via-white to-slate-50 p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-amber-700">
                    <span>📚</span> Reading Journey
                  </span>
                  <h3 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Track the books you are reading and your progress over time.</h3>
                  <p className="mt-2 max-w-2xl text-sm sm:text-base text-slate-600 leading-relaxed">
                    Add a book, note what stands out, and keep your reading momentum visible alongside the rest of your life system.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">Current focus</p>
                  <p className="mt-1 font-semibold text-slate-900">{activeBookTitle}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6">
              <ReadingTracker onActiveBookChange={setActiveBookTitle} />
            </div>
          </div>
        )}

        {/* VIEW 5: CORE PRODUCTIVITY HUB */}
        {activeTab === 'productivity' && (
          <ProductivityHubView
            analytics={analytics}
            aiReport={aiReport}
            isAiLoading={isAiLoading}
            todos={todos}
            timeRange={timeRange}
            calendarCells={calendarCells}
            dailyFuelFocusTag={dailyFuel?.focusTag}
            onTimeRangeChange={setTimeRange}
            onRefreshAiReport={fetchAiReport}
          />
        )}

      </main>

      <footer className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center z-50 shadow-lg">
        <button onClick={() => setActiveTab('journal')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'journal' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <span>🍃</span>
          <span>Log</span>
        </button>
        <button onClick={() => setActiveTab('todos')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'todos' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <span>⏱️</span>
          <span>Tasks</span>
        </button>
        <button onClick={() => setActiveTab('reading')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'reading' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <span>📚</span>
          <span>Reading</span>
        </button>
        <button onClick={() => setActiveTab('productivity')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'productivity' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <span>🧠</span>
          <span>Hub</span>
        </button>
        <button onClick={() => setActiveTab('goals')} className={`flex flex-col items-center gap-0.5 text-xs font-medium transition ${activeTab === 'goals' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
          <span>🎯</span>
          <span>Goals</span>
        </button>
      </footer>
    </div>
  );
}