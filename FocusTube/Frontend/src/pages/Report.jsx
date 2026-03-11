import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { completeSession } from '../services/api';

function StatCard({ icon, label, value, sub, color = 'text-white', accent = false }) {
  return (
    <div className={`bg-dark-800 border rounded-xl p-5 flex flex-col gap-2 ${accent ? 'border-green-500/40' : 'border-dark-500'}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold timer-display ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
    </div>
  );
}

function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#1a1a25" strokeWidth="12" />
          <circle
            cx="70" cy="70" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white timer-display">{score}%</span>
          <span className="text-xs text-gray-500">Focus Score</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium" style={{ color }}>
        {score >= 80 ? '🏆 Outstanding!' : score >= 60 ? '👍 Well done!' : score >= 40 ? '📖 Keep at it!' : '💪 Try again!'}
      </p>
    </div>
  );
}

function formatTime(seconds) {
  if (!seconds) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function Report() {
  const navigate = useNavigate();
  const { session, updateSession, resetSession } = useSession();
  const [focusScore, setFocusScore] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session.goal) {
      navigate('/');
      return;
    }
    finalizeSession();
  }, []);

  const finalizeSession = async () => {
    try {
      if (session.sessionId) {
        const data = await completeSession(session.sessionId, {
          focus_time_spent: session.focusTimeSpent || 0,
          quiz_score: session.quizScore || 0,
          quiz_total: session.quizTotal || 5,
        });
        setFocusScore(data.session?.focus_score ?? calculateLocalScore());
      } else {
        setFocusScore(calculateLocalScore());
      }
    } catch (err) {
      setFocusScore(calculateLocalScore());
    }
    setLoaded(true);
    updateSession({ focusScore: focusScore });
  };

  const calculateLocalScore = () => {
    const maxTime = (session.focusDuration || 25) * 60;
    const timeScore = Math.min(100, ((session.focusTimeSpent || 0) / maxTime) * 100);
    const distractionPenalty = Math.min(50, (session.distractions || 0) * 10);
    const quizBonus = ((session.quizScore || 0) / (session.quizTotal || 5)) * 20;
    return Math.max(0, Math.round(timeScore - distractionPenalty + quizBonus));
  };

  const handleStudyAgain = () => {
    resetSession();
    navigate('/');
  };

  const quizPercent = session.quizScore !== null
    ? Math.round((session.quizScore / (session.quizTotal || 5)) * 100)
    : 0;

  const displayScore = focusScore ?? calculateLocalScore();

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 mb-4">
            <span className="text-green-400 text-sm">✓</span>
            <span className="text-green-400 text-sm font-medium">Study Session Complete</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Your Study Report</h1>
          <p className="text-gray-400 text-sm">Here's how your session went</p>
        </div>

        {/* Focus score ring */}
        {loaded && (
          <div className="flex justify-center mb-8 animate-slide-up">
            <ScoreRing score={displayScore} />
          </div>
        )}

        {/* Goal banner */}
        <div className="bg-dark-800 border border-dark-500 rounded-xl px-5 py-4 mb-6 flex items-start gap-3">
          <span className="text-2xl shrink-0">🎯</span>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-0.5">Study Goal</p>
            <p className="text-white font-medium">{session.goal}</p>
            {session.videoTitle && (
              <p className="text-gray-500 text-xs mt-1 truncate">{session.videoTitle}</p>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon="⏱️"
            label="Focus Time"
            value={formatTime(session.focusTimeSpent)}
            sub={`Goal: ${session.focusDuration} min`}
            color="text-blue-400"
          />
          <StatCard
            icon="🧠"
            label="Quiz Score"
            value={`${session.quizScore ?? 0}/${session.quizTotal ?? 5}`}
            sub={`${quizPercent}% correct`}
            color={quizPercent >= 80 ? 'text-green-400' : quizPercent >= 60 ? 'text-yellow-400' : 'text-red-400'}
            accent={quizPercent >= 80}
          />
          <StatCard
            icon="⚡"
            label="Distractions"
            value={session.distractions ?? 0}
            sub={session.distractions === 0 ? 'Perfect focus!' : `${(session.distractions ?? 0) * 10}% penalty`}
            color={session.distractions === 0 ? 'text-green-400' : 'text-yellow-400'}
          />
          <StatCard
            icon="📺"
            label="Video"
            value={session.channelName ? session.channelName.split(' ').slice(0, 2).join(' ') : 'Watched'}
            sub="Educational content"
            color="text-purple-400"
          />
        </div>

        {/* Quiz breakdown */}
        {session.quizResults && (
          <div className="bg-dark-800 border border-dark-500 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-4">Quiz Breakdown</h3>
            <div className="space-y-2">
              {session.quizResults.map((result, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={`mt-0.5 shrink-0 ${result.is_correct ? 'text-green-400' : 'text-red-400'}`}>
                    {result.is_correct ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs ${result.is_correct ? 'text-gray-400' : 'text-red-400/70'} line-clamp-2`}>
                      {result.question}
                    </p>
                    {!result.is_correct && (
                      <p className="text-xs text-green-400/70 mt-0.5">
                        ✓ {result.correct_option}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-dark-800 border border-dark-500 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Achievements</h3>
          <div className="flex flex-wrap gap-2">
            {session.distractions === 0 && (
              <span className="bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-full">
                🎯 Zero Distractions
              </span>
            )}
            {quizPercent >= 80 && (
              <span className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs px-3 py-1.5 rounded-full">
                🧠 Quiz Master
              </span>
            )}
            {(session.focusTimeSpent || 0) >= (session.focusDuration || 25) * 60 * 0.9 && (
              <span className="bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs px-3 py-1.5 rounded-full">
                ⏱️ Full Focus
              </span>
            )}
            {displayScore >= 80 && (
              <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-3 py-1.5 rounded-full">
                🏆 High Achiever
              </span>
            )}
            {displayScore < 40 && (
              <span className="bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs px-3 py-1.5 rounded-full">
                📖 Keep Practicing
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleStudyAgain}
            className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/20 text-sm"
          >
            Start New Session
          </button>
          <button
            onClick={() => navigate('/search')}
            className="flex-1 bg-dark-800 hover:bg-dark-700 border border-dark-500 text-gray-300 font-medium py-4 rounded-xl transition-all text-sm"
          >
            Watch Another
          </button>
        </div>
      </div>
    </div>
  );
}
