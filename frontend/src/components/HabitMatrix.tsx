// src/components/HabitMatrix.tsx
'use client';

import { useState, useEffect } from 'react';

interface HabitLog {
  id: string;
  completedAt: string;
}

interface Habit {
  id: string;
  name: string;
  description: string | null;
  streakCount: number;
  logs: HabitLog[];
}

export default function HabitMatrix() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitDesc, setNewHabitDesc] = useState('');
  
  // Dynamic temporal references for a standard 30-day view baseline
  const [daysInView, setDaysInView] = useState<string[]>([]);

  useEffect(() => {
    fetchHabits();
    generatePastMonthDays();
  }, []);

  const generatePastMonthDays = () => {
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    setDaysInView(dates);
  };

  const fetchHabits = async () => {
    const token = localStorage.getItem('zen_token');
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/habits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHabits(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch habits:', err);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const token = localStorage.getItem('zen_token');
    if (!token) return;

    try {
      const res = await fetch('http://localhost:5000/api/habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: newHabitName, description: newHabitDesc })
      });

      if (res.ok) {
        setNewHabitName('');
        setNewHabitDesc('');
        fetchHabits();
      }
    } catch (err) {
      console.error('Failed to create habit:', err);
    }
  };

  const toggleDayCompletion = async (habitId: string, dateStr: string) => {
    const token = localStorage.getItem('zen_token');
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:5000/api/habits/${habitId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dateStr })
      });

      if (res.ok) {
        fetchHabits();
      }
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const isDateCompleted = (habit: Habit, dateStr: string) => {
    return habit.logs.some(log => log.completedAt.startsWith(dateStr));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Creation Node */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Initialize Habit Matrix</h3>
          <form onSubmit={handleCreateHabit} className="space-y-4">
            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Habit Focus Objective</label>
              <input 
                type="text" 
                required 
                value={newHabitName} 
                onChange={(e) => setNewHabitName(e.target.value)} 
                className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-slate-900" 
                placeholder="E.g., Forex Chart Markups, Code Refactoring" 
              />
            </div>
            <div>
              <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Context Strategy</label>
              <input 
                type="text" 
                value={newHabitDesc} 
                onChange={(e) => setNewHabitDesc(e.target.value)} 
                className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-slate-900" 
                placeholder="E.g., 45 minutes execution focus right at market open" 
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white text-sm font-medium py-3 rounded-xl hover:bg-slate-800 transition shadow-sm">
              Deploy Matrix Stream
            </button>
          </form>
        </div>

        {/* Accountability Streams Timeline Grids */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-800">30-Day Chronological Metric Distribution</h3>
          
          {habits.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-slate-400 text-sm">
              No active habit accountability matrix modules instantiated yet.
            </div>
          ) : (
            <div className="space-y-4">
              {habits.map((habit) => (
                <div key={habit.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{habit.name}</h4>
                      {habit.description && <p className="text-xs text-slate-400 font-medium mt-0.5">{habit.description}</p>}
                    </div>
                    <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                      🔥 {habit.streakCount} Day Streak
                    </div>
                  </div>

                  {/* Matrix Completion Matrix Nodes */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">Past 30 Days Timeline</span>
                    <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
                      {daysInView.map((dateStr) => {
                        const completed = isDateCompleted(habit, dateStr);
                        const displayDayNumber = new Date(dateStr).getDate();
                        return (
                          <button
                            key={dateStr}
                            onClick={() => toggleDayCompletion(habit.id, dateStr)}
                            title={`Date: ${dateStr}`}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all relative group border ${
                              completed 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-sm ring-1 ring-slate-900' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-400'
                            }`}
                          >
                            <span>{displayDayNumber}</span>
                            <span className="absolute bottom-1 text-[5px] opacity-0 group-hover:opacity-100 transition-opacity">
                              {completed ? '✓' : '+'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}