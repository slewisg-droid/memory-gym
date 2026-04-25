# MemoryGym v2.0 — Must-Have Daily Brain Training

A premium Next.js 15 memory training app with AI coaching, PWA support, and addictive progression.

## New in v2.0

- **🤖 AI Memory Coach** — Claude analyzes your accuracy per exercise and gives personalized insight
- **🎮 Simon Says** — New addictive sequence-repeat game with high score tracking
- **📤 Share Card** — Canvas-generated streak card you can download and share
- **🔔 Push Notifications** — Browser notification support with service worker
- **📱 PWA** — Installable to home screen, works offline
- **🔊 Sound Design** — Web Audio API tones for correct/wrong/levelup/Simon
- **✨ Premium Design** — Animated mesh background, Syne + DM Sans fonts, glassmorphism
- **🎊 Confetti** — Particle celebration on level-up and day complete
- **🏅 More Milestones** — 7 streak badges from 3 days to 365 days
- **🔢 Adaptive Difficulty** — Scales sequence length, grid size, and object count with level

## Deploy to Vercel (recommended, free, zero-config)

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "MemoryGym v2"
git remote add origin https://github.com/YOU/memorygym
git push -u origin main

# 2. Import at vercel.com → New Project → Deploy
# Done — live in 60 seconds
```

## Run locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Tech Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Framer Motion · shadcn/ui · Web Audio API · Canvas API · Service Worker

## Data

All user data in `localStorage` key `memoryGymV3`. No backend, no accounts, no tracking.

## Roadmap for even more engagement

- Story Recall exercise (read passage → answer questions)
- Real-time multiplayer streak leaderboard (Supabase)
- Claude-generated custom number sequences with embedded patterns
- Daily email digest of progress
- Apple Watch complication
