import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { searchVideos } from '../services/api';

// Entertainment keywords for rabbit-hole detection
const ENTERTAINMENT_KEYWORDS = [
  'prank', 'meme', 'funny', 'song', 'music', 'vlog', 'reaction',
  'challenge', 'compilation', 'fail', 'viral', 'gaming', 'unboxing',
  'haul', 'storytime', 'drama', 'roast'
];

function isRelatedToGoal(query, goal) {
  if (!goal) return true;
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const goalWords = goal.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const hasOverlap = queryWords.some(w => goalWords.some(g => g.includes(w) || w.includes(g)));
  const hasEntertainment = ENTERTAINMENT_KEYWORDS.some(kw => query.toLowerCase().includes(kw));
  return hasOverlap || !hasEntertainment;
}

function VideoCard({ video, onWatch }) {
  return (
    <div className="bg-dark-800 border border-dark-500 rounded-xl overflow-hidden hover:border-dark-400 transition-all group animate-slide-up">
      <div className="relative">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full aspect-video object-cover group-hover:opacity-90 transition-opacity"
          onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${video.video_id}/mqdefault.jpg`; }}
        />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded font-mono">
          {video.duration}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white text-sm font-medium line-clamp-2 mb-2 leading-snug group-hover:text-green-400 transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-dark-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
              </svg>
            </div>
            <span className="text-gray-500 text-xs truncate max-w-32">{video.channel_name}</span>
          </div>
          <button
            onClick={() => onWatch(video)}
            className="bg-green-500 hover:bg-green-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-all hover:shadow-md hover:shadow-green-500/20 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            Watch
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const { session, updateSession } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRabbitHoleWarning, setShowRabbitHoleWarning] = useState(false);
  const [pendingSearch, setPendingSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [apiNote, setApiNote] = useState('');
  const inputRef = useRef(null);

  // Auto-search with goal on page load
  useEffect(() => {
    if (session.goal) {
      setQuery(session.goal);
      performSearch(session.goal, true);
    }
    inputRef.current?.focus();
  }, []);

  const performSearch = async (searchQuery, isInitial = false) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const data = await searchVideos(searchQuery, session.goal);
      setResults(data.results || []);
      if (data.note) setApiNote(data.note);
    } catch (err) {
      setError('Failed to search. Make sure the backend is running and your YouTube API key is configured.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!query.trim()) return;

    // Rabbit hole detection (only after a session goal is set)
    if (session.goal && !isRelatedToGoal(query, session.goal)) {
      setPendingSearch(query);
      setShowRabbitHoleWarning(true);
      return;
    }

    performSearch(query);
  };

  const confirmSearch = () => {
    setShowRabbitHoleWarning(false);
    performSearch(pendingSearch);
  };

  const handleWatch = (video) => {
    updateSession({
      videoId: video.video_id,
      videoTitle: video.title,
      channelName: video.channel_name,
    });
    navigate(`/player/${video.video_id}`);
  };

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-dark-900/95 backdrop-blur border-b border-dark-600">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <span className="font-bold text-white text-sm hidden sm:block">FocusTube</span>
          </div>

          {/* Search bar */}
          <div className="flex-1 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search educational videos..."
              className="flex-1 bg-dark-700 border border-dark-400 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500 transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Goal banner */}
        {session.goal && (
          <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 mb-6">
            <div className="w-2 h-2 bg-green-500 rounded-full shrink-0" />
            <span className="text-sm text-gray-300">
              Study goal: <span className="text-green-400 font-medium">{session.goal}</span>
            </span>
            <span className="ml-auto text-xs text-gray-600 timer-display font-bold">
              {session.focusDuration} min
            </span>
          </div>
        )}

        {/* API note banner */}
        {apiNote && (
          <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 mb-6">
            <span className="text-yellow-400 text-sm">⚠ {apiNote}</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-dark-800 border border-dark-600 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-dark-600" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-dark-600 rounded w-full" />
                  <div className="h-4 bg-dark-600 rounded w-2/3" />
                  <div className="h-3 bg-dark-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-400">
                {results.length} educational results
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                Filtered for learning
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((video, i) => (
                <VideoCard key={video.video_id || i} video={video} onWatch={handleWatch} />
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔍</div>
            <p className="text-gray-400 text-sm">No educational results found.</p>
            <p className="text-gray-600 text-xs mt-1">Try a more specific programming or academic topic.</p>
          </div>
        )}

        {/* Default state */}
        {!loading && !hasSearched && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-gray-400">Search for a topic to find educational videos</p>
            <p className="text-gray-600 text-xs mt-2">Results are filtered to show lectures and tutorials only</p>
          </div>
        )}
      </main>

      {/* Rabbit hole warning modal */}
      {showRabbitHoleWarning && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 border border-yellow-500/40 rounded-2xl p-6 max-w-sm w-full animate-slide-up">
            <div className="text-3xl mb-3">🐰</div>
            <h3 className="text-white font-bold text-lg mb-2">Rabbit Hole Detected!</h3>
            <p className="text-gray-400 text-sm mb-2">
              Your search <span className="text-yellow-400 font-medium">"{pendingSearch}"</span> seems unrelated to your study goal:
            </p>
            <p className="text-green-400 text-sm font-medium mb-5">"{session.goal}"</p>
            <p className="text-gray-500 text-xs mb-5">
              Stay focused! Do you want to continue with this search anyway?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRabbitHoleWarning(false)}
                className="flex-1 bg-dark-600 hover:bg-dark-500 border border-dark-400 text-white text-sm py-2.5 rounded-xl transition-colors"
              >
                Stay Focused
              </button>
              <button
                onClick={confirmSearch}
                className="flex-1 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 text-sm py-2.5 rounded-xl transition-colors"
              >
                Search Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
