import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { startSession, recordDistraction } from '../services/api';

export default function Player() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { session, updateSession } = useSession();

  const [timeLeft, setTimeLeft] = useState(session.focusDuration * 60);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [showDistractAlert, setShowDistractAlert] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const timerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const playerRef = useRef(null);
  const progressRef = useRef(null);

  // Start backend session
  useEffect(() => {
    const initSession = async () => {
      try {
        const data = await startSession({
          goal: session.goal,
          focus_duration: session.focusDuration,
          video_id: videoId,
          video_title: session.videoTitle,
          channel_name: session.channelName,
        });
        sessionIdRef.current = data.session_id;
        updateSession({ sessionId: data.session_id });
      } catch (err) {
        console.error('Session start failed:', err);
        // Continue offline
        sessionIdRef.current = `local-${Date.now()}`;
      }
    };
    initSession();
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoId) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          disablekb: 0,
          fs: 1,
          iv_load_policy: 3,
          cc_load_policy: 0,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            setIsRunning(true);
            setSessionStarted(true);
          },
          onStateChange: (event) => {
            // YT.PlayerState.ENDED = 0
            if (event.data === 0) {
              setVideoProgress(100);
              handleVideoEnd();
            }
          },
        },
      });
    };

    // If API already loaded
    if (window.YT && window.YT.Player) {
      window.onYouTubeIframeAPIReady();
    }

    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [videoId]);

  // Track video progress
  useEffect(() => {
    const trackProgress = () => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          const current = playerRef.current.getCurrentTime();
          const total = playerRef.current.getDuration();
          if (total > 0) setVideoProgress(Math.round((current / total) * 100));
        } catch (e) {}
      }
    };
    progressRef.current = setInterval(trackProgress, 3000);
    return () => clearInterval(progressRef.current);
  }, []);

  // Focus timer countdown
  useEffect(() => {
    if (!isRunning) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsRunning(false);
          setShowEndDialog(true);
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && sessionStarted) {
        setDistractions(prev => {
          const newCount = prev + 1;
          if (sessionIdRef.current) recordDistraction(sessionIdRef.current);
          updateSession({ distractions: newCount });
          return newCount;
        });
        setShowDistractAlert(true);
        setTimeout(() => setShowDistractAlert(false), 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [sessionStarted]);

  const handleVideoEnd = () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    setTimeout(() => setShowEndDialog(true), 1000);
  };

  const handleGoToQuiz = () => {
    updateSession({ focusTimeSpent: timeSpent, distractions });
    navigate('/quiz');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalSeconds = session.focusDuration * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;
  const isWarning = timeLeft <= 300 && timeLeft > 60;
  const isCritical = timeLeft <= 60;

  const timerClass = isCritical ? 'timer-critical' : isWarning ? 'timer-warning' : 'text-green-400';

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header bar */}
      <header className="bg-dark-800 border-b border-dark-600 px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Goal */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-2 h-2 bg-green-500 rounded-full shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Study Goal</p>
              <p className="text-sm text-white font-medium truncate">{session.goal || 'No goal set'}</p>
            </div>
          </div>

          {/* Timer */}
          <div className="flex flex-col items-center shrink-0">
            <span className="text-xs text-gray-500 mb-0.5">Focus Timer</span>
            <span className={`text-2xl font-bold timer-display ${timerClass}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-center">
              <p className="text-xs text-gray-500">Distractions</p>
              <p className={`text-lg font-bold timer-display ${distractions > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                {distractions}
              </p>
            </div>
            <button
              onClick={() => setShowEndDialog(true)}
              className="bg-dark-600 hover:bg-dark-500 border border-dark-400 text-gray-300 text-xs px-3 py-2 rounded-lg transition-colors"
            >
              End Session
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-7xl mx-auto mt-2">
          <div className="h-1 bg-dark-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-4 py-4 gap-4">
        {/* Video player */}
        <div className="flex-1 flex flex-col">
          <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {!playerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-dark-800">
                <div className="text-center">
                  <svg className="w-8 h-8 animate-spin text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-gray-500 text-sm">Loading video...</p>
                </div>
              </div>
            )}
            <div id="yt-player" className="w-full h-full" />
          </div>

          {/* Video info */}
          <div className="mt-3 px-1">
            <h2 className="text-white font-medium text-sm line-clamp-2 leading-snug">
              {session.videoTitle || 'Loading...'}
            </h2>
            <p className="text-gray-500 text-xs mt-1">{session.channelName}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500/60 rounded-full transition-all"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 timer-display">{videoProgress}%</span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:w-72 shrink-0 flex flex-col gap-3">
          {/* Focus status card */}
          <div className="bg-dark-800 border border-dark-500 rounded-xl p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Session Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Status</span>
                <span className={`text-sm font-medium flex items-center gap-1.5 ${isRunning ? 'text-green-400' : 'text-yellow-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  {isRunning ? 'Focused' : 'Paused'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Time Spent</span>
                <span className="text-sm font-medium text-white timer-display">{formatTime(timeSpent)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Distractions</span>
                <span className={`text-sm font-bold timer-display ${distractions === 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {distractions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Video Progress</span>
                <span className="text-sm font-medium text-white timer-display">{videoProgress}%</span>
              </div>
            </div>
          </div>

          {/* Timer ring */}
          <div className="bg-dark-800 border border-dark-500 rounded-xl p-4 flex flex-col items-center">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#1a1a25" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke={isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-bold timer-display ${timerClass}`}>{formatTime(timeLeft)}</span>
                <span className="text-xs text-gray-600">left</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Focus time remaining</p>
          </div>

          {/* Focus tips */}
          <div className="bg-dark-800 border border-dark-500 rounded-xl p-4">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Focus Tips</h3>
            <ul className="space-y-1.5 text-xs text-gray-500">
              <li className="flex items-center gap-2"><span className="text-green-500">•</span> Stay on this tab</li>
              <li className="flex items-center gap-2"><span className="text-green-500">•</span> Take notes while watching</li>
              <li className="flex items-center gap-2"><span className="text-green-500">•</span> Pause if needed, don't rush</li>
              <li className="flex items-center gap-2"><span className="text-green-500">•</span> Quiz follows when done</li>
            </ul>
          </div>

          {/* End session button */}
          <button
            onClick={handleGoToQuiz}
            className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl transition-all text-sm"
          >
            Finish & Take Quiz →
          </button>
        </div>
      </div>

      {/* Distraction alert */}
      {showDistractAlert && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-xl px-5 py-3 flex items-center gap-3 shadow-2xl backdrop-blur">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-yellow-400 font-bold text-sm">Stay focused on your study goal!</p>
              <p className="text-yellow-500/70 text-xs">Distraction #{distractions} recorded</p>
            </div>
          </div>
        </div>
      )}

      {/* End session dialog */}
      {showEndDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-dark-500 rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-white font-bold text-xl mb-2">Session Complete!</h3>
            <p className="text-gray-400 text-sm mb-5">
              You studied for <span className="text-green-400 font-medium">{formatTime(timeSpent)}</span> with{' '}
              <span className={distractions === 0 ? 'text-green-400' : 'text-yellow-400'}>
                {distractions} distraction{distractions !== 1 ? 's' : ''}
              </span>.
            </p>
            <p className="text-gray-400 text-sm mb-6">Ready to test your knowledge?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndDialog(false)}
                className="flex-1 bg-dark-600 border border-dark-400 text-gray-300 py-3 rounded-xl text-sm transition-colors hover:bg-dark-500"
              >
                Keep Watching
              </button>
              <button
                onClick={handleGoToQuiz}
                className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-xl text-sm transition-all"
              >
                Take Quiz →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
