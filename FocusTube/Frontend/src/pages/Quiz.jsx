import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext';
import { generateQuiz, submitQuiz } from '../services/api';

export default function Quiz() {
  const navigate = useNavigate();
  const { session, updateSession } = useSession();

  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    if (!session.goal) {
      navigate('/');
      return;
    }
    loadQuiz();
  }, []);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const data = await generateQuiz(session.goal, session.videoTitle);
      setQuiz(data.quiz || []);
    } catch (err) {
      setError('Failed to load quiz. Please check your backend connection.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (questionIndex, optionIndex) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.length) {
      alert('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const answersArray = quiz.map((_, i) => answers[i]);
      const data = await submitQuiz(answersArray, quiz);

      setResults(data);
      setSubmitted(true);
      updateSession({
        quizScore: data.score,
        quizTotal: data.total,
        quizResults: data.results,
      });
    } catch (err) {
      setError('Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewReport = () => {
    navigate('/report');
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === quiz.length && quiz.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-10 h-10 animate-spin text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <p className="text-gray-400">Generating your quiz...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadQuiz} className="bg-green-500 text-black font-bold px-6 py-2 rounded-lg">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-dark-800 border border-dark-500 rounded-full px-4 py-1.5 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-sm text-gray-400">Knowledge Check</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Quiz Time!</h1>
          <p className="text-gray-400 text-sm">
            Test your understanding of <span className="text-green-400">{session.goal}</span>
          </p>
        </div>

        {/* Progress */}
        {!submitted && (
          <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
            <span>{answeredCount} of {quiz.length} answered</span>
            <div className="flex gap-1.5">
              {quiz.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    answers[i] !== undefined
                      ? 'bg-green-500'
                      : i === currentQ
                      ? 'bg-green-500/50'
                      : 'bg-dark-500'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quiz results summary */}
        {submitted && results && (
          <div className="bg-dark-800 border border-dark-500 rounded-2xl p-6 mb-6 text-center animate-slide-up">
            <div className="text-5xl mb-3">
              {results.percentage >= 80 ? '🏆' : results.percentage >= 60 ? '👍' : '📖'}
            </div>
            <div className="text-4xl font-bold text-white mb-1 timer-display">
              {results.score}/{results.total}
            </div>
            <div className={`text-xl font-bold mb-2 ${results.percentage >= 80 ? 'text-green-400' : results.percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
              {results.percentage}%
            </div>
            <p className="text-gray-400 text-sm">
              {results.percentage >= 80 ? 'Excellent! You really understood the material.' :
               results.percentage >= 60 ? 'Good work! Review the topics you missed.' :
               'Keep studying — you\'ll get it with more practice.'}
            </p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-4">
          {quiz.map((question, qIndex) => {
            const userAnswer = answers[qIndex];
            const isAnswered = userAnswer !== undefined;
            const result = submitted && results?.results[qIndex];

            return (
              <div
                key={qIndex}
                className={`bg-dark-800 border rounded-xl p-5 transition-all animate-slide-up ${
                  submitted
                    ? result?.is_correct
                      ? 'border-green-500/40'
                      : 'border-red-500/30'
                    : isAnswered
                    ? 'border-green-500/20'
                    : 'border-dark-500'
                }`}
                style={{ animationDelay: `${qIndex * 0.1}s` }}
                onClick={() => setCurrentQ(qIndex)}
              >
                {/* Question header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    submitted
                      ? result?.is_correct
                        ? 'bg-green-500 text-black'
                        : 'bg-red-500 text-white'
                      : isAnswered
                      ? 'bg-green-500 text-black'
                      : 'bg-dark-600 text-gray-400'
                  }`}>
                    {submitted ? (result?.is_correct ? '✓' : '✗') : qIndex + 1}
                  </div>
                  <p className="text-white text-sm font-medium leading-snug">{question.question}</p>
                </div>

                {/* Options */}
                <div className="space-y-2 ml-9">
                  {question.options.map((option, oIndex) => {
                    const isSelected = userAnswer === oIndex;
                    const isCorrect = oIndex === question.correct;

                    let optionClass = 'bg-dark-700 border-dark-500 text-gray-300';
                    if (submitted) {
                      if (isCorrect) optionClass = 'bg-green-500/10 border-green-500/50 text-green-400';
                      else if (isSelected && !isCorrect) optionClass = 'bg-red-500/10 border-red-500/40 text-red-400';
                      else optionClass = 'bg-dark-700 border-dark-600 text-gray-600';
                    } else if (isSelected) {
                      optionClass = 'bg-green-500/10 border-green-500 text-green-400';
                    } else {
                      optionClass = 'bg-dark-700 border-dark-500 text-gray-300 hover:border-dark-300 hover:text-white cursor-pointer';
                    }

                    return (
                      <button
                        key={oIndex}
                        onClick={() => handleAnswer(qIndex, oIndex)}
                        disabled={submitted}
                        className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${optionClass}`}
                      >
                        <span className="font-mono font-bold mr-2 opacity-50">
                          {String.fromCharCode(65 + oIndex)}.
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation after submit */}
                {submitted && question.explanation && (
                  <div className="mt-3 ml-9 bg-dark-700 rounded-lg px-4 py-2.5">
                    <p className="text-xs text-gray-400">
                      <span className="text-blue-400 font-medium">Explanation: </span>
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit / Continue */}
        <div className="mt-6">
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className={`w-full py-4 rounded-xl font-bold text-sm transition-all ${
                allAnswered
                  ? 'bg-green-500 hover:bg-green-400 text-black hover:shadow-lg hover:shadow-green-500/20'
                  : 'bg-dark-700 text-gray-600 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Submitting...
                </span>
              ) : allAnswered
                ? 'Submit Quiz'
                : `Answer ${quiz.length - answeredCount} more question${quiz.length - answeredCount !== 1 ? 's' : ''}`
              }
            </button>
          ) : (
            <button
              onClick={handleViewReport}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-xl text-sm transition-all hover:shadow-lg hover:shadow-green-500/20"
            >
              View Study Report →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
