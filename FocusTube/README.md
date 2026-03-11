# FocusTube
FocusTube — Study Without Distractions

FocusTube is a web app that helps students watch educational YouTube videos without distractions. It filters videos, tracks focus, and generates quick quizzes to make study sessions productive.

Project Structure
focustube/
├── backend/      # APIs: search, session, quiz
├── frontend/     # React app: Home, Search, Player, Quiz, Report
└── package.json
Quick Start

Install Dependencies

cd backend && npm install
cd ../frontend && npm install

Configure .env

PORT=5000
YOUTUBE_API_KEY=your_key
FRONTEND_URL=http://localhost:3000
MONGODB_URI=optional

Run

# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm start
Key Features

Set study goals & session time

Search filtered educational videos

Distraction-free video player

Focus timer & tab monitoring

Auto-generated quizzes

Session report with focus score

Tech Stack

Frontend: React, TailwindCSS, Axios, YouTube IFrame Player

Backend: Node.js, Express, Axios, MongoDB (optional)