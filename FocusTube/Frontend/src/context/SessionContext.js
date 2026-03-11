import React, { createContext, useContext, useState } from 'react';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [session, setSession] = useState({
    goal: '',
    focusDuration: 25,
    sessionId: null,
    videoId: null,
    videoTitle: null,
    channelName: null,
    distractions: 0,
    focusTimeSpent: 0,
    quizScore: null,
    quizTotal: 5,
    quizResults: null,
    focusScore: null,
  });

  const updateSession = (updates) => {
    setSession(prev => ({ ...prev, ...updates }));
  };

  const resetSession = () => {
    setSession({
      goal: '',
      focusDuration: 25,
      sessionId: null,
      videoId: null,
      videoTitle: null,
      channelName: null,
      distractions: 0,
      focusTimeSpent: 0,
      quizScore: null,
      quizTotal: 5,
      quizResults: null,
      focusScore: null,
    });
  };

  return (
    <SessionContext.Provider value={{ session, updateSession, resetSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');
  return context;
}
