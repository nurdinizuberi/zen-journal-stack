'use client';
import React, { useState, useEffect } from 'react';

interface Goal {
  id: string;
  title: string;
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly';
  isCompleted: boolean;
}

export default function GoalsEngine() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [activeTimeframe, setActiveTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [isLoading, setIsLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('zen_token') : null;

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:5000/api/goals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (err) {
      console.error("Error loading goals:", err);
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !token) return;

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newGoalTitle, timeframe: activeTimeframe })
      });

      if (res.ok) {
        const freshGoal = await res.json();
        setGoals([freshGoal, ...goals]);
        setNewGoalTitle('');
      }
    } catch (err) {
      console.error("Error creating goal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGoal = async (id: string, currentStatus: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/goals/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isCompleted: !currentStatus })
      });

      if (res.ok) {
        setGoals(goals.map(g => g.id === id ? { ...g, isCompleted: !currentStatus } : g));
      }
    } catch (err) {
      console.error("Error updating goal:", err);
    }
  };

  const deleteGoal = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/goals/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setGoals(goals.filter(g => g.id !== id));
      }
    } catch (err) {
      console.error("Error removing goal:", err);
    }
  };

  const timeframes: ('daily' | 'weekly' | 'monthly' | 'yearly')[] = ['daily', 'weekly', 'monthly', 'yearly'];
  const filteredGoals = goals.filter(g => g.timeframe === activeTimeframe);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      {/* Control Panel Block */}
      <div className="lg:col-span-1">
        <form onSubmit={handleAddGoal} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:sticky lg:top-24">
          <h3 className="text-lg font-bold text-slate-800">Map Horizon Focus</h3>
          
          <div>
            <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Target Objective</label>
            <input
              type="text"
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder={`E.g., Complete UI/UX parameters...`}
              className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="text-xs font-bold tracking-wider uppercase text-slate-400">Target Scale</label>
            <select 
              value={activeTimeframe} 
              onChange={(e) => setActiveTimeframe(e.target.value as any)}
              className="w-full mt-1 px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm bg-white capitalize"
            >
              {timeframes.map(tf => (
                <option key={tf} value={tf}>{tf} Target</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white font-medium py-3 rounded-xl hover:bg-slate-800 transition text-sm disabled:opacity-50"
            disabled={isLoading || !newGoalTitle.trim()}
          >
            {isLoading ? 'Committing...' : 'Commit to Horizon'}
          </button>
        </form>
      </div>

      {/* Output Stack Timeline */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 capitalize">{activeTimeframe} Horizon Tracker</h3>
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition capitalize ${
                  activeTimeframe === tf ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredGoals.length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-slate-400 text-sm">
              No active targets mapped on this horizon level yet.
            </div>
          ) : (
            filteredGoals.map((goal) => (
              <div 
                key={goal.id} 
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition bg-white ${
                  goal.isCompleted ? 'border-slate-100 opacity-60' : 'border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={goal.isCompleted}
                    onChange={() => toggleGoal(goal.id, goal.isCompleted)}
                    className="h-5 w-5 border-slate-300 accent-slate-900 rounded cursor-pointer shrink-0"
                  />
                  <span className={`text-sm font-semibold text-slate-800 truncate ${
                    goal.isCompleted ? 'line-through text-slate-400' : ''
                  }`}>
                    {goal.title}
                  </span>
                </div>
                <button
                  onClick={() => deleteGoal(goal.id)}
                  className="text-xs text-red-400 hover:text-red-600 font-medium transition shrink-0"
                >
                  🗑️ Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}