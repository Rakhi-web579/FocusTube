const express = require('express');
const axios = require('axios');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const sessionHistory = {};
const sessionGoals = {};
const MAX_HISTORY = 8;
const RABBIT_HOLE_THRESHOLD = 3;

async function analyzeWithGemini(studyGoal, currentQuery, recentHistory) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const historyText = recentHistory.length > 0
    ? recentHistory.map((h, i) =>
        `${i + 1}. Query: "${h.query}" | Topic: "${h.topic}" | Was: ${h.classification}`
      ).join('\n')
    : 'No history yet.';

  const prompt = `
You are an intelligent study session monitor. Analyze the user's search query and classify it.

STUDY GOAL: "${studyGoal || 'General learning'}"
CURRENT SEARCH QUERY: "${currentQuery}"

RECENT SEARCH HISTORY (oldest to newest):
${historyText}

Return ONLY a raw JSON object with these exact fields:
{
  "topic": "<2-4 word canonical topic label e.g. 'binary search', 'turing machine', 'react hooks'>",
  "is_educational": <true or false>,
  "classification": "<exactly one of: on_topic | related_educational | rabbit_hole | off_topic | entertainment>",
  "confidence": <0.0 to 1.0>,
  "reason": "<one sentence explaining why>"
}

Classification rules:

"on_topic"
  The query directly relates to the study goal.
  Example: goal=DSA, query=binary search → on_topic
  Example: goal=react, query=useEffect hook → on_topic

"related_educational"
  The query is educational and loosely related to goal but not exact.
  Example: goal=DSA, query=computer science history → related_educational

"rabbit_hole"
  The query LOOKS related on surface but is entertainment, not learning.
  Example: goal=DSA, query=the imitation game → rabbit_hole
  Example: goal=DSA, query=coding memes → rabbit_hole
  Example: goal=react, query=silicon valley series → rabbit_hole
  Example: goal=Theory of Computation, query=mr robot → rabbit_hole

"off_topic"
  Completely different subject with no relation to the goal.
  Example: goal=DSA, query=taylor swift → off_topic
  Example: goal=DSA, query=how to cook pasta → off_topic
  Do NOT label this rabbit_hole.

"entertainment"
  Pure entertainment regardless of topic.
  Example: gaming, music, vlogs, reactions, movies unrelated to goal.

CRITICAL DISTINCTIONS:
- off_topic ≠ rabbit_hole. Cooking when studying DSA = off_topic, not rabbit_hole.
- A movie or show that mentions the topic's subject = rabbit_hole.
- A legitimate deeper dive into a related concept = related_educational.
- If history shows repeated rabbit_hole pattern, increase confidence score.

Return ONLY raw JSON. No markdown, no code fences, no extra text.
  `.trim();

  const result = await model.generateContent(prompt);
  const raw = result.response.text();
  console.log('🧠 Gemini raw response:', raw);

  try { return JSON.parse(raw); } catch (_) {}
  try { return JSON.parse(raw.replace(/```json|```/gi, '').trim()); } catch (_) {}
  const match = raw.match(/\{[\s\S]*?\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error(`Unparseable Gemini response: ${raw.slice(0, 200)}`);
}

function checkHistoryPattern(sessionId) {
  const history = sessionHistory[sessionId] || [];
  if (history.length < RABBIT_HOLE_THRESHOLD) return false;
  const recent = history.slice(-RABBIT_HOLE_THRESHOLD);
  const badCount = recent.filter(h =>
    h.classification === 'rabbit_hole' || h.classification === 'entertainment'
  ).length;
  return badCount >= RABBIT_HOLE_THRESHOLD;
}

function saveToHistory(sessionId, entry) {
  if (!sessionHistory[sessionId]) sessionHistory[sessionId] = [];
  sessionHistory[sessionId].push({ ...entry, timestamp: Date.now() });
  if (sessionHistory[sessionId].length > MAX_HISTORY) sessionHistory[sessionId].shift();
}

function scoreVideo(video, studyGoal) {
  let score = 0;
  const title = (video.title || '');
  const titleLower = title.toLowerCase();
  const description = (video.description || '');

  if (video.category_id === '27') score += 25;

  if (video.view_count && video.published_at) {
    const daysOld = Math.max(1, (Date.now() - new Date(video.published_at)) / 86400000);
    const viewsPerDay = parseInt(video.view_count) / daysOld;
    if (viewsPerDay > 1000)     score += 20;
    else if (viewsPerDay > 500) score += 15;
    else if (viewsPerDay > 100) score += 10;
    else if (viewsPerDay > 10)  score += 5;
  }

  if (description.length > 500)      score += 15;
  else if (description.length > 200) score += 10;
  else if (description.length > 50)  score += 5;

  if (/\d+:\d{2}/.test(description)) score += 15;

  const dur = video.duration_seconds || 0;
  const isLongFormGoal = /(one.?shot|full course|complete|crash course)/i.test(studyGoal || '');
  if (dur >= 300 && dur <= 1800)      score += 15;
  else if (dur >= 180 && dur < 300)   score += 8;
  else if (dur > 1800 && dur <= 7200) score += isLongFormGoal ? 20 : 10;
  else if (dur > 7200)                score += isLongFormGoal ? 15 : 3;

  if (studyGoal) {
    const goalWords = studyGoal.toLowerCase().split(/\s+/);
    goalWords.forEach(word => {
      if (word.length > 3 && titleLower.includes(word)) score += 8;
    });
  }

  const lettersOnly = title.replace(/[^A-Za-z]/g, '');
  const capsRatio = lettersOnly.length > 0
    ? title.replace(/[^A-Z]/g, '').length / lettersOnly.length
    : 0;
  if (capsRatio > 0.5) score -= 15;
  if ((title.match(/!/g) || []).length > 1) score -= 10;

  return score;
}

function applyAlertPenalty(videos, alert, sessionId) {
  if (!alert) return videos;

  const penaltyMap = {
    rabbit_hole:   80,
    off_topic:     60,
    entertainment: 100,
  };

  const basePenalty = penaltyMap[alert.type] || 60;
  const repeatOffenses = (sessionHistory[sessionId] || [])
    .filter(h => h.classification === 'rabbit_hole' && h.topic === alert.topic)
    .length;
  const scaledPenalty = Math.min(basePenalty + (repeatOffenses * 20), 150);
  const topicWords = (alert.topic || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);

  return videos
    .map(video => {
      const titleLower = (video.title || '').toLowerCase();
      const isRelatedToFlag = topicWords.some(w => titleLower.includes(w));
      return {
        ...video,
        _score: isRelatedToFlag ? (video._score || 0) - scaledPenalty : (video._score || 0)
      };
    })
    .sort((a, b) => b._score - a._score)
    .map(({ _score, ...v }) => v);
}

function isEducational(video) {
  const titleLower = (video.title || '').toLowerCase();
  const dur = video.duration_seconds || 0;

  if (dur > 0 && dur < 180) return false;
  if (titleLower.includes('#shorts') || titleLower.includes('#short')) return false;

  const nonEduCategories = ['10', '20', '24', '17', '19', '22', '2'];
  if (video.category_id && nonEduCategories.includes(video.category_id)) return false;

  return true;
}

// Build an enhanced educational search query
function buildEducationalQuery(userQuery) {
  const cleanQuery = userQuery.trim().toLowerCase();

  const subjects = {
    cs:      ['code', 'programming', 'algorithm', 'javascript', 'python', 'react', 'binary', 'linked list', 'sorting', 'tree', 'graph'],
    math:    ['calculus', 'algebra', 'geometry', 'trigonometry', 'statistics', 'probability', 'matrix', 'integral', 'derivative'],
    science: ['physics', 'chemistry', 'biology', 'thermodynamics', 'genetics', 'quantum', 'evolution'],
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

function formatDuration(seconds) {
  if (seconds === 0) return 'Unknown';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

router.get('/', async (req, res) => {
  const { q, goal, session_id } = req.query;
  const sessionId = session_id || 'default';

  if (goal) sessionGoals[sessionId] = goal;
  const effectiveGoal = goal || sessionGoals[sessionId] || null;

  console.log(`Query: "${q}" | Goal: "${effectiveGoal}" | Session: "${sessionId}"`);

  if (!q || q.trim() === '') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const youtubeKey = process.env.YOUTUBE_API_KEY;

  if (!youtubeKey || youtubeKey === 'your_youtube_api_key_here') {
    return res.json(getMockResults(q, effectiveGoal));
  }

  try {
    // ── Step 1: Run Gemini analysis on the query immediately
    // No dependency on YouTube results — pure intent classification
    let alert = null;

    if (process.env.GEMINI_API_KEY && effectiveGoal) {
      try {
        const recentHistory = sessionHistory[sessionId] || [];
        console.log(`🤖 Analyzing query: "${q}" against goal: "${effectiveGoal}"`);

        const analysis = await analyzeWithGemini(effectiveGoal, q, recentHistory);

        console.log(`📊 ${analysis.classification} (${analysis.confidence}) — ${analysis.reason}`);

        saveToHistory(sessionId, {
          query: q,
          topic: analysis.topic,
          classification: analysis.classification
        });

        const patternDetected = checkHistoryPattern(sessionId);

        if (analysis.classification === 'rabbit_hole' || patternDetected) {
          alert = {
            type: 'rabbit_hole',
            topic: analysis.topic,
            title: '🐇 Rabbit Hole Detected',
            message: `"${analysis.topic}" looks related but won't help you learn.`,
            reason: analysis.reason,
            suggest_quiz: true
          };
        } else if (analysis.classification === 'off_topic') {
          alert = {
            type: 'off_topic',
            topic: analysis.topic,
            title: '🎯 Off Topic',
            message: `This doesn't seem related to "${effectiveGoal}".`,
            reason: analysis.reason,
            suggest_quiz: false
          };
        } else if (analysis.classification === 'entertainment') {
          alert = {
            type: 'entertainment',
            topic: analysis.topic,
            title: '🎬 Entertainment Content',
            message: `This looks like entertainment, not a learning resource.`,
            reason: analysis.reason,
            suggest_quiz: false
          };
        }

      } catch (err) {
        console.error('⚠️ Gemini analysis failed:', err.message);
      }
    }

    // ── Step 2: Search YouTube with raw query
    const searchResponse = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: q,
        type: 'video',
        videoDuration: 'any',
        maxResults: 20,
        order: 'relevance',
        videoEmbeddable: 'true',
        relevanceLanguage: 'en',
        key: youtubeKey
      }
    });

    const items = searchResponse.data.items || [];
    if (items.length === 0) {
      return res.json({ results: [], query: q, alert });
    }

    // ── Step 3: Get video details
    const videoIds = items.map(item => item.id.videoId).join(',');
    const detailsResponse = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        part: 'snippet,contentDetails,statistics',
        id: videoIds,
        key: youtubeKey
      }
    });

    const detailsMap = {};
    (detailsResponse.data.items || []).forEach(item => { detailsMap[item.id] = item; });

    // ── Step 4: Build enriched video objects
    const videos = items.map(item => {
      const videoId = item.id.videoId;
      const details = detailsMap[videoId];
      const durationSeconds = details ? parseDuration(details.contentDetails?.duration) : 0;

      return {
        video_id: videoId,
        title: item.snippet.title,
        channel_name: item.snippet.channelTitle,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        duration: formatDuration(durationSeconds),
        duration_seconds: durationSeconds,
        published_at: item.snippet.publishedAt,
        view_count: details?.statistics?.viewCount || null,
        category_id: details?.snippet?.categoryId || null,
      };
    });

    // ── Step 5: Filter non-educational
    const educationalVideos = videos.filter(isEducational);

    // ── Step 6: Score and sort
    const scoredVideos = educationalVideos
      .map(v => ({ ...v, _score: scoreVideo(v, effectiveGoal) }))
      .sort((a, b) => b._score - a._score);

    let finalResults = scoredVideos.slice(0, 20);

    // ── Step 7: Apply penalty to results if alert exists
    if (alert) {
      finalResults = applyAlertPenalty(finalResults, alert, sessionId);
    } else {
      finalResults = finalResults.map(({ _score, ...v }) => v);
    }

    console.log(`✅ ${finalResults.length} results | Alert: ${alert?.type || 'none'}`);
    res.json({ results: finalResults, query: q, alert });

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

router.get('/history', (req, res) => {
  const sessionId = req.query.session_id || 'default';
  res.json({ session_id: sessionId, history: sessionHistory[sessionId] || [] });
});

router.delete('/history', (req, res) => {
  const sessionId = req.query.session_id || 'default';
  delete sessionHistory[sessionId];
  delete sessionGoals[sessionId];
  res.json({ message: 'History cleared', session_id: sessionId });
});

function getMockResults(query, goal) {
  return {
    results: [
      {
        video_id: 'dQw4w9WgXcQ',
        title: `${query} - Complete Tutorial | Abdul Bari`,
        channel_name: 'Abdul Bari',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        duration: '18:42', duration_seconds: 1122,
        description: `Learn ${query} from scratch with clear explanations and examples. 0:00 Introduction 5:00 Core concepts 12:00 Examples`
      },
      {
        video_id: 'xo1VInw-SKc',
        title: `${query} Explained | freeCodeCamp`,
        channel_name: 'freeCodeCamp.org',
        thumbnail: 'https://i.ytimg.com/vi/xo1VInw-SKc/mqdefault.jpg',
        duration: '24:15', duration_seconds: 1455,
        description: `Full ${query} tutorial for beginners. Covers all fundamentals with practical examples.`
      },
      {
        video_id: 'oBt53YbR9Kk',
        title: `${query} | Neso Academy`,
        channel_name: 'Neso Academy',
        thumbnail: 'https://i.ytimg.com/vi/oBt53YbR9Kk/mqdefault.jpg',
        duration: '15:30', duration_seconds: 930,
        description: `Understand ${query} with step by step examples and diagrams.`
      }
    ],
    query,
    alert: null,
    note: 'Demo mode — add YOUTUBE_API_KEY to .env for real results'
  };
}

module.exports = router;