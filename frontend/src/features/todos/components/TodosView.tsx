'use client';

interface Todo {
  id: string;
  task: string;
  isCompleted: boolean;
  timeSpent: number;
  dueDate: string;
}

interface TodosViewProps {
  todos: Todo[];
  trackingTodoId: string | null;
  secondsElapsed: number;
  todoTask: string;
  onTodoTaskChange: (value: string) => void;
  onSubmitTodo: (event: React.FormEvent) => void;
  onToggleTodoStatus: (id: string, currentStatus: boolean) => void;
  onStartTracking: (id: string) => void;
  onStopTrackingTime: (id: string) => void;
  onDeleteTodo: (id: string) => void;
}

export default function TodosView({
  todos,
  trackingTodoId,
  secondsElapsed,
  todoTask,
  onTodoTaskChange,
  onSubmitTodo,
  onToggleTodoStatus,
  onStartTracking,
  onStopTrackingTime,
  onDeleteTodo,
}: TodosViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-1">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm lg:sticky lg:top-24 space-y-6">
          <form onSubmit={onSubmitTodo} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Add Routine Task</h3>
            <input type="text" required value={todoTask} onChange={(e) => onTodoTaskChange(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-slate-900 text-sm" placeholder="E.g., Design fluid layout parameters" />
            <button type="submit" className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-xl text-sm">Queue Task</button>
          </form>

          {trackingTodoId && (
            <div className="p-4 bg-slate-900 rounded-xl text-white space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Active Focus Session</span>
              <div className="text-2xl font-black font-mono">
                {Math.floor(secondsElapsed / 60)}m {secondsElapsed % 60}s
              </div>
              <p className="text-xs text-slate-300 truncate">Tracking: {todos.find((todo) => todo.id === trackingTodoId)?.task}</p>
              <button onClick={() => onStopTrackingTime(trackingTodoId)} className="w-full mt-2 bg-red-500 hover:bg-red-600 font-bold py-2 rounded-lg text-xs transition">
                Stop & Log Minutes
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <h3 className="text-lg font-bold text-slate-800">Task Matrix Flow</h3>
        {todos.length === 0 ? (
          <div className="p-12 text-center bg-white border border-dashed rounded-2xl text-slate-400 text-sm">No tasks listed today.</div>
        ) : (
          todos.map((todo) => (
            <div key={todo.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition bg-white ${todo.isCompleted ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input type="checkbox" checked={todo.isCompleted} onChange={() => onToggleTodoStatus(todo.id, todo.isCompleted)} className="h-5 w-5 border-slate-300 accent-slate-900 rounded cursor-pointer shrink-0" />
                <div className="min-w-0">
                  <p className={`text-sm font-semibold text-slate-800 truncate ${todo.isCompleted ? 'line-through text-slate-400' : ''}`}>{todo.task}</p>
                  <span className="text-xs text-slate-400 font-mono">Invested: {todo.timeSpent} mins</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!todo.isCompleted && !trackingTodoId && (
                  <button onClick={() => onStartTracking(todo.id)} className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 transition">Start ⏱️</button>
                )}
                <button onClick={() => onDeleteTodo(todo.id)} className="text-slate-300 hover:text-red-500 text-sm p-1 transition" title="Remove Task">🗑️</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
