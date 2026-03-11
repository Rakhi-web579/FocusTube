const express = require('express');
const axios = require('axios');
const router = express.Router();

// Trusted educational channels - these get priority ranking
const TRUSTED_CHANNELS = [
  'Abdul Bari',
  'CodeWithHarry',
  'freeCodeCamp.org',
  'MIT OpenCourseWare',
  'Neso Academy',
  "Jenny's Lectures CS IT NET&JRF",
  'GeeksforGeeks',
  'CS Dojo',
  'Traversy Media',
  'The Coding Train',
  'CS50',
  'Khan Academy',
  'Sentdex',
  'Tech With Tim',
  '3Blue1Brown',
  'Computerphile',
  'mycodeschool',
  'William Fiset',
  'Back To Back SWE',
  'NeetCode',
  'Codersbucket',
  'Programming with Mosh',
  'Academind',
  'Fireship',
  'The Net Ninja'
];

// Keywords that indicate entertainment/non-educational
const ENTERTAINMENT_KEYWORDS = [
  'prank', 'meme', 'funny', 'song', 'music', 'vlog',
  'reaction', 'challenge', 'compilation', 'fail', 'viral',
  'tiktok', 'shorts', 'roast', 'beef', 'drama', 'exposed',
  'clickbait', 'asmr', 'gaming', 'minecraft', 'fortnite',
  'unboxing', 'review product', 'haul', 'storytime'
];

// Keywords that indicate educational content
const EDUCATIONAL_KEYWORDS = [
  'tutorial', 'lecture', 'explained', 'course', 'learn',
  'data structures', 'programming', 'algorithm', 'introduction',
  'guide', 'how to', 'complete', 'full course', 'beginner',
  'advanced', 'concepts', 'theory', 'practice', 'crash course',
  'workshop', 'lesson', 'study', 'understanding', 'deep dive'
];

// Parse ISO 8601 duration to seconds
function parseDuration(isoDuration) {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 3600 + minutes * 60 + seconds;
}

// Format seconds to HH:MM or MM:SS
function formatDuration(seconds) {
  if (seconds === 0) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Score a video based on educational relevance
function scoreVideo(video, studyGoal) {
  let score = 0;
  const titleLower = (video.title || '').toLowerCase();
  const channelLower = (video.channel_name || '').toLowerCase();

  // Trusted channel boost (+50 points)
  const isTrusted = TRUSTED_CHANNELS.some(ch =>
    channelLower.includes(ch.toLowerCase()) || ch.toLowerCase().includes(channelLower)
  );
  if (isTrusted) score += 50;

  // Educational keyword in title (+5 each)
  EDUCATIONAL_KEYWORDS.forEach(kw => {
    if (titleLower.includes(kw)) score += 5;
  });

  // Entertainment keyword penalty (-30 each)
  ENTERTAINMENT_KEYWORDS.forEach(kw => {
    if (titleLower.includes(kw)) score -= 30;
  });

  // Study goal alignment boost
  if (studyGoal) {
    const goalWords = studyGoal.toLowerCase().split(/\s+/);
    goalWords.forEach(word => {
      if (word.length > 3 && titleLower.includes(word)) score += 10;
    });
  }

  // Duration preference: 5-30 min is ideal
  const dur = video.duration_seconds || 0;
  // if (dur >= 300 && dur <= 1800) score += 15;
  // else if (dur >= 180 && dur < 300) score += 5;
  // else if (dur > 1800 && dur <= 7200) score += 8;
  const isLongForm = /(one.?shot|full course|complete|crash course)/i.test((studyGoal || '') + ' ' + (video.title || ''));
  if (dur >= 300 && dur <= 1800) score += 15;
  else if (dur >= 180 && dur < 300) score += 5;
  else if (dur > 1800 && dur <= 7200) score += isLongForm ? 25 : 8;
  else if (dur > 7200) score += isLongForm ? 20 : 3;

  return score;
}

// Check if video is educational
function isEducational(video) {
  const titleLower = (video.title || '').toLowerCase();
  const descLower = (video.description || '').toLowerCase();

  // Filter out entertainment content
  const hasEntertainment = ENTERTAINMENT_KEYWORDS.some(kw =>
    titleLower.includes(kw) || descLower.includes(kw)
  );
  if (hasEntertainment) return false;

  // Filter out very short videos (< 3 minutes = shorts/clips)
  const dur = video.duration_seconds || 0;
  if (dur > 0 && dur < 180) return false;

  // Filter out YouTube Shorts markers
  if (titleLower.includes('#shorts') || titleLower.includes('#short')) return false;

  return true;
}

// Build an enhanced educational search query
function buildEducationalQuery(userQuery) {
  const cleanQuery = userQuery.trim().toLowerCase();

  const subjects = {
    cs:      ['code', 'programming', 'algorithm', 'javascript', 'python', 'react', 'binary', 'linked list', 'sorting', 'tree', 'graph'],
    math:    ['calculus', 'algebra', 'geometry', 'trigonometry', 'statistics', 'probability', 'matrix', 'integral', 'derivative'],
    science: ['physics', 'chemistry', 'biology', 'photosynthesis', 'thermodynamics', 'genetics', 'quantum', 'evolution'],
    history: ['history', 'war', 'revolution', 'empire', 'civilization', 'ancient', 'medieval', 'colonialism'],
    language:['grammar', 'vocabulary', 'english', 'spanish', 'french', 'hindi', 'writing', 'essay'],
  };

  const suffixes = {
    cs:      'tutorial explained course',
    math:    'lecture explained solution',
    science: 'lecture explained documentary',
    history: 'lecture documentary explained',
    language:'lesson explained practice',
    default: 'lecture explained tutorial',
  };

  for (const [subject, keywords] of Object.entries(subjects)) {
    if (keywords.some(kw => cleanQuery.includes(kw))) {
      return `${cleanQuery} ${suffixes[subject]}`;
    }
  }

  return `${cleanQuery} ${suffixes.default}`;
}

// GET /api/search?q=keyword&goal=study_goal
router.get('/', async (req, res) => {
  const { q, goal } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey || apiKey === 'your_youtube_api_key_here') {
    // Return mock educational data when no API key is configured
    return res.json(getMockResults(q, goal));
  }

  try {
    const enhancedQuery = buildEducationalQuery(q);
    console.log(`🔍 Searching YouTube for: "${enhancedQuery}"`);

    // Step 1: Search YouTube API
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: enhancedQuery,
        type: 'video',
        videoDuration: 'any',
        maxResults: 20,
        order: 'relevance',
        videoEmbeddable: 'true',
        relevanceLanguage: 'en',
        key: apiKey
      }
    });

    const items = searchResponse.data.items || [];

    if (items.length === 0) {
      return res.json({ results: [], query: q });
    }

    // Step 2: Get video details (duration etc.)
    const videoIds = items.map(item => item.id.videoId).join(',');
    const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'contentDetails,statistics',
        id: videoIds,
        key: apiKey
      }
    });

    const detailsMap = {};
    (detailsResponse.data.items || []).forEach(item => {
      detailsMap[item.id] = item;
    });

    // Step 3: Build enriched video objects
    const videos = items.map(item => {
      const videoId = item.id.videoId;
      const details = detailsMap[videoId];
      const durationSeconds = details
        ? parseDuration(details.contentDetails?.duration)
        : 0;

      return {
        video_id: videoId,
        title: item.snippet.title,
        channel_name: item.snippet.channelTitle,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        duration: formatDuration(durationSeconds),
        duration_seconds: durationSeconds,
        published_at: item.snippet.publishedAt,
        view_count: details?.statistics?.viewCount || null
      };
    });

    // Step 4: Filter educational content
    const educationalVideos = videos.filter(isEducational);

    // Step 5: Score and sort
    const scoredVideos = educationalVideos.map(v => ({
      ...v,
      _score: scoreVideo(v, goal)
    }));
    scoredVideos.sort((a, b) => b._score - a._score);

    // Step 6: Return top 20 clean results
    const finalResults = scoredVideos.slice(0, 20).map(({ _score, ...v }) => v);

    console.log(`✅ Returning ${finalResults.length} educational results`);
    res.json({ results: finalResults, query: q });

  } catch (error) {
    console.error('YouTube API Error:', error.response?.data || error.message);
    const status = error.response?.status || 500;
    if (status === 403) {
      return res.status(403).json({
        error: 'YouTube API quota exceeded or invalid key',
        details: error.response?.data?.error?.message
      });
    }
    res.status(500).json({ error: 'Failed to fetch videos', details: error.message });
  }
});

// Mock results for when no API key is configured
function getMockResults(query, goal) {
  const mockVideos = [
    {
      video_id: 'dQw4w9WgXcQ',
      title: `${query} - Complete Tutorial | Abdul Bari`,
      channel_name: 'Abdul Bari',
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      duration: '18:42',
      duration_seconds: 1122,
      description: `Learn ${query} from scratch with clear explanations`
    },
    {
      video_id: 'xo1VInw-SKc',
      title: `${query} Explained | freeCodeCamp`,
      channel_name: 'freeCodeCamp.org',
      thumbnail: 'https://i.ytimg.com/vi/xo1VInw-SKc/mqdefault.jpg',
      duration: '24:15',
      duration_seconds: 1455,
      description: `Full ${query} tutorial for beginners`
    },
    {
      video_id: 'oBt53YbR9Kk',
      title: `${query} Data Structures | Neso Academy`,
      channel_name: 'Neso Academy',
      thumbnail: 'https://i.ytimg.com/vi/oBt53YbR9Kk/mqdefault.jpg',
      duration: '15:30',
      duration_seconds: 930,
      description: `Understand ${query} with examples`
    },
    {
      video_id: 'RBSGKlAvoiM',
      title: `${query} Algorithm | MIT OpenCourseWare`,
      channel_name: 'MIT OpenCourseWare',
      thumbnail: 'https://i.ytimg.com/vi/RBSGKlAvoiM/mqdefault.jpg',
      duration: '45:12',
      duration_seconds: 2712,
      description: `MIT lecture on ${query}`
    },
    {
      video_id: 'Qmt0189Q8bY',
      title: `${query} Tutorial in Hindi | CodeWithHarry`,
      channel_name: 'CodeWithHarry',
      thumbnail: 'https://i.ytimg.com/vi/Qmt0189Q8bY/mqdefault.jpg',
      duration: '20:05',
      duration_seconds: 1205,
      description: `${query} tutorial with practical examples`
    }
  ];

  return {
    results: mockVideos,
    query,
    note: 'Demo mode - Add YOUTUBE_API_KEY to .env for real results'
  };
}

module.exports = router;
