import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';

const DURATION_OPTIONS = [
  { value: 20, label: '20 min', desc: 'Quick session' },
  { value: 30, label: '30 min', desc: 'Focused block' },
  { value: 45, label: '45 min', desc: 'Deep dive' },
];

const EXAMPLE_GOALS = [
  'Learn Binary Search Trees',
  'Understand React Hooks',
  'Study Linear Algebra',
  'Master Dynamic Programming',
  'Explore Machine Learning',
];

export default function Home() {
  const navigate = useNavigate();
  const { updateSession } = useSession();
  const [goal, setGoal] = useState('');
 const [duration, setDuration] = useState(25);
  const [customInput, setCustomInput] = useState('');
  const [error, setError] = useState('');
  const [exampleIndex, setExampleIndex] = useState(0);
const [mode, setMode] = useState('custom'); // 'custom' or 'pomodoro'
  const handleStart = () => {
    if (!goal.trim()) {
      setError('Please enter a study goal to begin');
      return;
    }
    setError('');
   updateSession({
      goal: goal.trim(),
      focusDuration: mode === 'pomodoro' ? 25 : duration,// default to 25 min for pomodoro mode
      pomodoroMode: mode === 'pomodoro',
      pomodoroSession: 1,
      pomodoroPhase: 'focus',
    });
    navigate('/search');
  };

  const useExample = (eg) => {
    setGoal(eg);
    setError('');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* Glow orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500 opacity-5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">FocusTube</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Distraction-free learning from YouTube.<br />
            Set your goal. Stay focused. Retain more.
          </p>
        </div>

        {/* Main card */}
        <div className="bg-dark-800 border border-dark-500 rounded-2xl p-8 shadow-2xl">
          {/* Study Goal */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              What do you want to learn today?
            </label>
            <input
              type="text"
              value={goal}
              onChange={(e) => { setGoal(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="e.g. Learn Binary Search Trees"
              className="w-full bg-dark-700 border border-dark-400 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 transition-colors text-sm"
            />
            {error && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <span>⚠</span> {error}
              </p>
            )}
          </div>

          {/* Example goals */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 mb-2">Try an example:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_GOALS.map((eg, i) => (
                <button
                  key={i}
                  onClick={() => useExample(eg)}
                  className="text-xs bg-dark-600 hover:bg-dark-500 border border-dark-400 hover:border-green-500/50 text-gray-400 hover:text-green-400 px-3 py-1.5 rounded-lg transition-all"
                >
                  {eg}
                </button>
              ))}
            </div>
          </div>
{/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('custom')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                mode === 'custom'
                  ? 'bg-green-500/10 border-green-500 text-green-400'
                  : 'bg-dark-700 border-dark-400 text-gray-400'
              }`}
            >
              Custom Timer
            </button>
            <button
              onClick={() => setMode('pomodoro')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                mode === 'pomodoro'
                  ? 'bg-red-500/10 border-red-500 text-red-400'
                  : 'bg-dark-700 border-dark-400 text-gray-400'
              }`}
            >
              🍅 Pomodoro
            </button>
          </div>

          {/* Pomodoro info */}
          {mode === 'pomodoro' && (
            <div className="mb-8 bg-dark-700 border border-dark-500 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 text-center">Session Structure</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-red-400 font-bold text-lg">25 min</p>
                  <p className="text-gray-500 text-xs">Focus</p>
                </div>
                <div>
                  <p className="text-blue-400 font-bold text-lg">5 min</p>
                  <p className="text-gray-500 text-xs">Short Break</p>
                </div>
                <div>
                  <p className="text-purple-400 font-bold text-lg">15 min</p>
                  <p className="text-gray-500 text-xs">Long Break (×4)</p>
                </div>
              </div>
            </div>
          )}

          {/* Duration selector — only in custom mode */}
          {mode === 'custom' && (
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Focus session duration
              </label>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setDuration(opt.value); setCustomInput(''); }}
                    className={`py-3 px-4 rounded-xl border text-center transition-all ${
                      duration === opt.value && !customInput
                        ? 'bg-green-500/10 border-green-500 text-green-400'
                        : 'bg-dark-700 border-dark-400 text-gray-400 hover:border-dark-300'
                    }`}
                  >
                    <div className="text-lg font-bold timer-display">{opt.label}</div>
                    <div className="text-xs opacity-60 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {/* Custom duration input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="300"
                  placeholder="Or type custom minutes (1–300)..."
                  value={customInput}
                  onChange={(e) => {
                    setCustomInput(e.target.value);
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= 300) setDuration(val);
                  }}
                  className={`flex-1 bg-dark-700 border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none transition-colors ${
                    customInput ? 'border-green-500' : 'border-dark-400 focus:border-green-500'
                  }`}
                />
                {customInput && (
                  <button
                    onClick={() => { setCustomInput(''); setDuration(25); }}
                    className="text-xs px-3 py-2.5 rounded-xl border border-dark-400 text-gray-500 hover:text-gray-300 transition-all"
                  >
                    ✕
                  </button>
                )}
              </div>

              {customInput && parseInt(customInput) >= 1 && parseInt(customInput) <= 300 && (
                <p className="text-green-400 text-xs mt-1.5">✓ {customInput} minutes selected</p>
              )}
              {customInput && (isNaN(parseInt(customInput)) || parseInt(customInput) < 1 || parseInt(customInput) > 300) && (
                <p className="text-red-400 text-xs mt-1.5">⚠ Enter a value between 1 and 300 minutes</p>
              )}
            </div>
          )}
          {/* CTA Button */}
          <button
            onClick={handleStart}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm tracking-wide hover:shadow-lg hover:shadow-green-500/20"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Start Studying
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          {[
            { value: '0 ads', label: 'No ads shown' },
            { value: '0 rabbit holes', label: 'No rabbit holes' },
            { value: '100%', label: 'Your focus' }
          ].map((stat, i) => (
            <div key={i} className="bg-dark-800/60 border border-dark-600 rounded-xl p-3">
              <div className="text-green-400 font-bold text-sm">{stat.value}</div>
              <div className="text-gray-600 text-xs mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
