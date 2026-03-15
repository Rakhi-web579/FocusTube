import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Search educational YouTube videos changed for rabbit hole
export const searchVideos = async (query, goal = '') => {
  if (!localStorage.getItem('session_id')) {
    localStorage.setItem('session_id', crypto.randomUUID());
  }
  const session_id = localStorage.getItem('session_id');
  const response = await api.get('/search', {
    params: { q: query, goal, session_id }
  });
  return response.data;
};

// Start a study session
export const startSession = async ({ goal, focus_duration, video_id, video_title, channel_name }) => {
  const response = await api.post('/session/start', {
    goal, focus_duration, video_id, video_title, channel_name
  });
  return response.data;
};

// Record a distraction
export const recordDistraction = async (sessionId) => {
  try {
    const response = await api.post(`/session/${sessionId}/distraction`);
    return response.data;
  } catch (err) {
    console.error('Failed to record distraction:', err);
  }
};

// Complete a session
export const completeSession = async (sessionId, { focus_time_spent, quiz_score, quiz_total }) => {
  const response = await api.post(`/session/${sessionId}/complete`, {
    focus_time_spent, quiz_score, quiz_total
  });
  return response.data;
};

// Generate quiz for a topic
export const generateQuiz = async (topic, videoTitle = '') => {
  const response = await api.get('/quiz/generate', {
    params: { topic, video_title: videoTitle }
  });
  return response.data;
};

// Submit quiz answers
export const submitQuiz = async (answers, quiz) => {
  const response = await api.post('/quiz/submit', { answers, quiz });
  return response.data;
};

export default api;
