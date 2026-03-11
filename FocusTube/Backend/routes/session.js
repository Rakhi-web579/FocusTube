const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// In-memory session storage (falls back when MongoDB not available)
const sessions = {};

// POST /api/session/start
router.post('/start', (req, res) => {
  const { goal, focus_duration, video_id, video_title, channel_name } = req.body;

  if (!goal || !focus_duration) {
    return res.status(400).json({ error: 'goal and focus_duration are required' });
  }

  const sessionId = uuidv4();
  const session = {
    session_id: sessionId,
    goal,
    focus_duration: parseInt(focus_duration),
    video_id,
    video_title,
    channel_name,
    started_at: new Date().toISOString(),
    distractions: 0,
    status: 'active'
  };

  sessions[sessionId] = session;
  console.log(`📚 Session started: ${sessionId} - Goal: "${goal}"`);
  res.json({ session_id: sessionId, session });
});

// POST /api/session/:id/distraction
router.post('/:id/distraction', (req, res) => {
  const { id } = req.params;
  const session = sessions[id];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.distractions += 1;
  console.log(`⚠️  Distraction #${session.distractions} in session ${id}`);
  res.json({ distractions: session.distractions });
});

// POST /api/session/:id/complete
router.post('/:id/complete', (req, res) => {
  const { id } = req.params;
  const { focus_time_spent, quiz_score, quiz_total } = req.body;
  const session = sessions[id];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.status = 'completed';
  session.completed_at = new Date().toISOString();
  session.focus_time_spent = focus_time_spent || 0;
  session.quiz_score = quiz_score || 0;
  session.quiz_total = quiz_total || 5;

  // Calculate focus score
  const maxFocusTime = session.focus_duration * 60;
  const timeScore = Math.min(100, (focus_time_spent / maxFocusTime) * 100);
  const distractionPenalty = Math.min(50, session.distractions * 10);
  const quizBonus = ((quiz_score / (quiz_total || 5)) * 20);
  session.focus_score = Math.max(0, Math.round(timeScore - distractionPenalty + quizBonus));

  console.log(`✅ Session completed: ${id} - Focus Score: ${session.focus_score}%`);
  res.json({ session });
});

// GET /api/session/:id
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const session = sessions[id];

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ session });
});

module.exports = router;
