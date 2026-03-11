import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Search from './pages/Search';
import Player from './pages/Player';
import Quiz from './pages/Quiz';
import Report from './pages/Report';
import { SessionProvider } from './context/SessionContext';
import './index.css';

function App() {
  return (
    <SessionProvider>
      <Router>
        <div className="min-h-screen bg-dark-900">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/player/:videoId" element={<Player />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/report" element={<Report />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </SessionProvider>
  );
}

export default App;
