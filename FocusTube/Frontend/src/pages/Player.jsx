import React, { useState, useEffect, useRef } from 'react';
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
  const [pauseCount, setPauseCount] = useState(0);
  const [rewindCount, setRewindCount] = useState(0);
  const [showDifficultyAlert, setShowDifficultyAlert] = useState(false);
  const [difficultyType, setDifficultyType] = useState('');
const [show202020, setShow202020] = useState(false);
const [eyeCountdown, setEyeCountdown] = useState(20);
const [showBreakScreen, setShowBreakScreen] = useState(false);
const [breakTimeLeft, setBreakTimeLeft] = useState(0);
const [breakType, setBreakType] = useState('');
  const timerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const playerRef = useRef(null);
  const progressRef = useRef(null);
  const lastTimeRef = useRef(0);
  const rewindCountRef = useRef(0);
  const pauseCountRef = useRef(0);
  const sessionStartedRef = useRef(false);
  const intentionalTabRef = useRef(false);
  const distractionCooldownRef = useRef(false);

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
        sessionIdRef.current = `local-${Date.now()}`;
      }
    };
    initSession();
  }, []);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoId) return;

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

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
          controls: 1,
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            setIsRunning(true);
            setSessionStarted(true);
            sessionStartedRef.current = true;
          },
          onStateChange: (event) => {
            if (event.data === 0) {       // ended
              setVideoProgress(100);
              handleVideoEnd();
            }
          if (event.data === 2) {       // paused
              setIsRunning(false);
              pauseCountRef.current += 1;
              setPauseCount(pauseCountRef.current);
              if (pauseCountRef.current >= 4) {
                setDifficultyType('pause');
                setShowDifficultyAlert(true);
                pauseCountRef.current = 0;
              }
            }
            if (event.data === 1) {       // playing
              setIsRunning(true);
              try {
                const currentTime = playerRef.current?.getCurrentTime() || 0;
                if (lastTimeRef.current > 8 && currentTime < lastTimeRef.current - 8) {
                  rewindCountRef.current += 1;
                  setRewindCount(rewindCountRef.current);
                 if (rewindCountRef.current >= 3) {
                    setDifficultyType('rewind');
                    setShowDifficultyAlert(true);
                    rewindCountRef.current = 0;
                    pauseCountRef.current = 0;
                  }
                }
                lastTimeRef.current = currentTime;
              } catch (e) {}
            }
          },
        },
      });
    };

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
          lastTimeRef.current = current;
        } catch (e) {}
      }
    };
    progressRef.current = setInterval(trackProgress, 1000);
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
          if (session.pomodoroMode) {
            playerRef.current?.pauseVideo();
            const isLongBreak = session.pomodoroSession % 4 === 0;
            setBreakType(isLongBreak ? 'long' : 'short');
            setBreakTimeLeft(isLongBreak ?15 * 60 : 4 * 60 + 40);
            setShow202020(true);
            setTimeout(() => {
              setShow202020(false);
              setShowBreakScreen(true);
            }, 22000);
          } else {
            setShowEndDialog(true);
          }
          return 0;
        }
        return prev - 1;
      });
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isRunning]);

  // Tab visibility + fullscreen detection
  useEffect(() => {
    const countDistraction = () => {
      // Debounce — visibilitychange and focus poll can fire close together
      // ensures only one distraction recorded per tab switch
      if (distractionCooldownRef.current) return;
      distractionCooldownRef.current = true;
      setTimeout(() => { distractionCooldownRef.current = false; }, 1000);

      setDistractions(prev => {
        const newCount = prev + 1;
        if (sessionIdRef.current) recordDistraction(sessionIdRef.current);
        updateSession({ distractions: newCount });
        return newCount;
      });
      setShowDistractAlert(true);
      setTimeout(() => setShowDistractAlert(false), 4000);
    };

    const handleVisibilityChange = () => {
      if (document.hidden && sessionStartedRef.current) {
        if (intentionalTabRef.current) return;
        countDistraction();
      } else if (!document.hidden) {
        // User returned to tab — reset intentional flag
        intentionalTabRef.current = false;
      }
    };

    // Poll document.hasFocus() every second
    // This is the only reliable way to detect focus loss during YouTube iframe fullscreen
    // because the iframe owns the fullscreen context, not your page —
    // so window blur and document.fullscreenElement both don't work
    let wasFocused = true;
    const focusPollInterval = setInterval(() => {
      const isFocused = document.hasFocus();
      if (wasFocused && !isFocused && sessionStartedRef.current) {
        if (!intentionalTabRef.current) {
          countDistraction();
        }
      }
      if (isFocused && !wasFocused) {
        // User came back — reset intentional flag
        intentionalTabRef.current = false;
      }
      wasFocused = isFocused;
    }, 1000);

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(focusPollInterval);
    };
  }, []);// 20-20-20 eye rule
useEffect(() => {
  if (!show202020) return;
  setEyeCountdown(20);
  const interval = setInterval(() => {
    setEyeCountdown(prev => {
      if (prev <= 1) {
        clearInterval(interval);
        setShow202020(false);
        return 20;
      }
      return prev - 1;
    });
  }, 1000);
  return () => clearInterval(interval);
}, [show202020]);
// Break countdown
  useEffect(() => {
    if (!showBreakScreen || breakTimeLeft <= 0) return;
    const breakTimer = setInterval(() => {
      setBreakTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(breakTimer);
          setShowBreakScreen(false);
          const nextSession = (session.pomodoroSession || 1) + 1;
          updateSession({ pomodoroSession: nextSession });
          setTimeLeft(25 * 60); // change to 25 * 60 after testing
          setIsRunning(true);
          playerRef.current?.playVideo();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(breakTimer);
  }, [showBreakScreen]);
  
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
            {!isRunning && playerReady && (
              <div
                className="absolute inset-0 bg-transparent z-10 cursor-pointer"
                onClick={() => {
                  playerRef.current?.playVideo();
                  setIsRunning(true);
                }}
              />
            )}
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

      {/* Difficulty alert */}
      {showDifficultyAlert && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-purple-500/40 rounded-2xl p-6 max-w-md w-full animate-slide-up shadow-2xl">

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">🤔</div>
              <div>
                <h3 className="text-white font-bold text-lg">Facing Difficulties?</h3>
                <p className="text-gray-400 text-xs mt-0.5">
                  {difficultyType === 'pause'
                    ? `You've paused ${pauseCount + 4} times — seems like something is unclear.`
                    : `You've rewound the same section ${rewindCount + 3} times — let's simplify this.`}
                </p>
              </div>
            </div>

            {/* Quick help options */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-dark-700 border border-dark-500 rounded-xl p-3">
                <div className="text-xl mb-1">🗺️</div>
                <p className="text-white text-xs font-medium mb-1">Visual Flowchart</p>
                <p className="text-gray-500 text-xs">Break the concept into a step-by-step diagram</p>
                <button
                  onClick={() => {
                    intentionalTabRef.current = true;
                    const query = encodeURIComponent(`${session.goal} flowchart diagram`);
                    window.open(`https://www.google.com/search?q=${query}&tbm=isch`, '_blank');
                  }}
                  className="mt-2 text-xs bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-400 px-2 py-1 rounded-lg transition-all w-full"
                >
                  Search Diagrams →
                </button>
              </div>

    <div className="bg-dark-700 border border-dark-500 rounded-xl p-3">
                <div className="text-xl mb-1">📝</div>
                <p className="text-white text-xs font-medium mb-1">Wikipedia</p>
                <p className="text-gray-500 text-xs">Read a quick overview of this topic</p>
                <button
                  onClick={() => {
                    intentionalTabRef.current = true;
                    const query = encodeURIComponent(`${session.goal}`);
                    window.open(`https://en.wikipedia.org/w/index.php?search=${query}`, '_blank');
                  }}
                  className="mt-2 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 px-2 py-1 rounded-lg transition-all w-full"
                >
                  Open Wikipedia →
                </button>
              </div>
            <div className="bg-dark-700 border border-dark-500 rounded-xl p-3 col-span-2">
                <div className="text-xl mb-1">🧒</div>
                <p className="text-white text-xs font-medium mb-1">Explain Like I'm 12</p>
                <p className="text-gray-500 text-xs">Get a super simple explanation of this topic</p>
                <button
                  onClick={() => {
                    intentionalTabRef.current = true;
                    const prompt = encodeURIComponent(
                      `Explain "${session.goal}" like I'm 12 years old. Use simple words, a fun analogy, and keep it under 100 words.`
                    ); 
                    window.open(`https://chatgpt.com/?q=${prompt}`, '_blank');
                  }}
                  className="mt-2 text-xs bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-400 px-2 py-1 rounded-lg transition-all w-full"
                >
                  Ask AI →
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDifficultyAlert(false)}
                className="flex-1 bg-dark-600 border border-dark-400 text-gray-300 py-2.5 rounded-xl text-sm hover:bg-dark-500 transition-colors"
              >
                I'm fine, keep going
              </button>
              <button
                onClick={() => {
                  setShowDifficultyAlert(false);
                  if (playerRef.current) playerRef.current.playVideo();
                  setIsRunning(true);
                }}
                className="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-bold py-2.5 rounded-xl text-sm transition-all"
              >
                Resume Video →
              </button>
            </div>

          </div>
        </div>
      )}
      {/* 20-20-20 Eye Rule */}
      {show202020 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'radial-gradient(ellipse at center, #0a1628 0%, #050d1a 60%, #000810 100%)'
          }}
        >
          {/* Animated stars background */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white animate-pulse"
                style={{
                  width: Math.random() * 3 + 1 + 'px',
                  height: Math.random() * 3 + 1 + 'px',
                  top: Math.random() * 100 + '%',
                  left: Math.random() * 100 + '%',
                  opacity: Math.random() * 0.5 + 0.1,
                  animationDelay: Math.random() * 3 + 's',
                  animationDuration: Math.random() * 3 + 2 + 's',
                }}
              />
            ))}
          </div>

          <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-md">

            {/* Eye icon */}
            <div className="text-7xl mb-6 animate-pulse">👁️</div>

            {/* Title */}
            <h2 className="text-white font-bold text-2xl mb-2">
              20 — 20 — 20 Rule
            </h2>
            <p className="text-blue-300 text-sm mb-8 leading-relaxed">
              Look at something <span className="text-white font-semibold">20 feet away</span> for the next
              <span className="text-white font-semibold"> 20 seconds</span> to rest your eyes.
            </p>

            {/* Countdown ring */}
            <div className="relative w-32 h-32 mb-8">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="#0f2040" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - eyeCountdown / 20)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-blue-400 timer-display">{eyeCountdown}</span>
                <span className="text-xs text-blue-300/60">seconds</span>
              </div>
            </div>

            {/* Breathing tip */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-6 w-full">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">While you wait</p>
              <p className="text-gray-200 text-sm">
                🌬️ Take a slow deep breath &nbsp;•&nbsp; 🧘 Relax your shoulders &nbsp;•&nbsp; 💧 Drink some water
              </p>
            </div>

            {/* Skip */}
            <button
              onClick={() => {
                setShow202020(false);
                setShowBreakScreen(true);
              }}
              className="text-gray-600 text-xs hover:text-gray-400 transition-colors"
            >
              Skip →
            </button>

          </div>
        </div>
      )}
      {/* Break screen */}
      {showBreakScreen && (
        <div className="fixed inset-0 bg-dark-900 flex flex-col items-center justify-center z-50">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">{breakType === 'long' ? '🎉' : '☕'}</div>
            <h2 className="text-white font-bold text-2xl mb-1">
              {breakType === 'long' ? 'Long Break!' : 'Short Break'}
            </h2>
            <p className="text-gray-400 text-sm">
              {breakType === 'long'
                ? 'Great work completing 4 sessions! Take 15 minutes.'
                : 'Good focus session! Rest for 5 minutes.'}
            </p>
          </div>

          <div className="text-5xl font-bold text-blue-400 timer-display mb-8">
            {formatTime(breakTimeLeft)}
          </div>

          <div className="bg-dark-800 border border-dark-500 rounded-2xl p-6 max-w-sm w-full mx-4 mb-6 text-center">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-3">Breathing Exercise</p>
            <p className="text-white text-sm">Inhale for 4 seconds, hold for 4, exhale for 4</p>
            <div className="mt-4 w-16 h-16 rounded-full border-2 border-blue-400 mx-auto flex items-center justify-center animate-pulse">
              <span className="text-blue-400 text-xs">breathe</span>
            </div>
          </div>

          <div className="bg-dark-800 border border-dark-500 rounded-xl p-4 max-w-sm w-full mx-4 mb-8">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Stretch Reminder</p>
            <p className="text-gray-300 text-sm">
              🧘 Roll your shoulders • 👀 Look away from screen • 🚶 Stand up and walk
            </p>
          </div>

          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i <= (session.pomodoroSession || 1)
                    ? 'bg-red-500 text-white'
                    : 'bg-dark-600 text-gray-600'
                }`}
              >
                🍅
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setShowBreakScreen(false);
              const nextSession = (session.pomodoroSession || 1) + 1;
              updateSession({ pomodoroSession: nextSession });
              setTimeLeft(25 * 60); // change to 25 * 60 after testing
              setIsRunning(true);
              playerRef.current?.playVideo();
            }}
            className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
          >
            Skip break →
          </button>
        </div>
      )}

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