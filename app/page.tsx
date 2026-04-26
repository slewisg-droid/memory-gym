"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Brain, Flame, CheckCircle2, Circle, Calendar, Trophy, Clock,
  Eye, Hash, Link2, Wind, MapPin, ChevronRight, Star, Zap,
  TrendingUp, BarChart2, ArrowLeft, Share2, Bell, BellOff,
  Sparkles, Download, Gamepad2, RefreshCw
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Exercise { id: string; type: string; title: string; description: string; duration: number; icon: React.ReactNode; xpReward: number; color: string }
interface AttemptRecord { exerciseId: string; correct: boolean; timestamp: number }
interface CompletionData { date: string; completedExercises: string[]; timestamp: number }
interface UserStats { xp: number; level: number; attempts: AttemptRecord[]; history: CompletionData[]; name?: string }
interface ExerciseState { phase: 'instructions' | 'active' | 'input' | 'feedback'; data?: any; userAnswer?: any; isCorrect?: boolean }

// ─── Constants ────────────────────────────────────────────────────────────────
const XP_PER_LEVEL = 120

const EXERCISES: Exercise[] = [
  { id: 'number-sequence', type: 'number-sequence', title: 'Number Sequence', description: 'Memorize and recall a sequence of digits', duration: 3, icon: <Hash className="w-5 h-5" />, xpReward: 20, color: 'blue' },
  { id: 'word-association', type: 'word-association', title: 'Word Chain', description: 'Build a chain of connected associations', duration: 4, icon: <Link2 className="w-5 h-5" />, xpReward: 15, color: 'green' },
  { id: 'visual-pattern', type: 'visual-pattern', title: 'Pattern Recognition', description: 'Remember and identify color patterns', duration: 3, icon: <Eye className="w-5 h-5" />, xpReward: 20, color: 'purple' },
  { id: 'simon-says', type: 'simon-says', title: 'Simon Says', description: 'Repeat the growing sequence of flashes', duration: 3, icon: <Gamepad2 className="w-5 h-5" />, xpReward: 30, color: 'pink' },
  { id: 'breathing', type: 'breathing', title: 'Focused Breathing', description: 'Guided breathing for mental clarity', duration: 2, icon: <Wind className="w-5 h-5" />, xpReward: 10, color: 'cyan' },
  { id: 'object-location', type: 'object-location', title: 'Spatial Memory', description: 'Remember positions of objects in a grid', duration: 3, icon: <MapPin className="w-5 h-5" />, xpReward: 25, color: 'orange' },
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  blue:   { bg: 'bg-blue-500/15',   border: 'border-blue-500/25',   text: 'text-blue-400',   glow: 'rgba(59,130,246,0.3)' },
  green:  { bg: 'bg-green-500/15',  border: 'border-green-500/25',  text: 'text-green-400',  glow: 'rgba(34,197,94,0.3)' },
  purple: { bg: 'bg-purple-500/15', border: 'border-purple-500/25', text: 'text-purple-400', glow: 'rgba(168,85,247,0.3)' },
  pink:   { bg: 'bg-pink-500/15',   border: 'border-pink-500/25',   text: 'text-pink-400',   glow: 'rgba(236,72,153,0.3)' },
  cyan:   { bg: 'bg-cyan-500/15',   border: 'border-cyan-500/25',   text: 'text-cyan-400',   glow: 'rgba(6,182,212,0.3)' },
  orange: { bg: 'bg-orange-500/15', border: 'border-orange-500/25', text: 'text-orange-400', glow: 'rgba(249,115,22,0.3)' },
}

const QUOTES = [
  "Every rep makes your mind stronger.",
  "Consistency is the compound interest of the mind.",
  "Your brain grows with every challenge.",
  "Small daily habits create extraordinary minds.",
  "Memory is a muscle — train it daily.",
  "Focus is the gateway to all thinking.",
  "The disciplined mind is the free mind.",
]
const MILESTONES = [
  { days: 3,   label: 'First Steps',       icon: '👣', xp: 0 },
  { days: 7,   label: 'Week Warrior',      icon: '🔥', xp: 50 },
  { days: 14,  label: 'Fortnight Force',   icon: '⚡', xp: 100 },
  { days: 30,  label: 'Month Master',      icon: '⭐', xp: 200 },
  { days: 60,  label: 'Diamond Mind',      icon: '💎', xp: 400 },
  { days: 100, label: 'Century Champion',  icon: '🏆', xp: 800 },
  { days: 365, label: 'Year Legend',       icon: '👑', xp: 2000 },
]
const LEVEL_TITLES = ['Novice', 'Apprentice', 'Practitioner', 'Adept', 'Expert', 'Master', 'Grandmaster', 'Legend', 'Mythic', 'Transcendent']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getLevel = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1
const getLevelProgress = (xp: number) => xp % XP_PER_LEVEL
const getLevelTitle = (level: number) => LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)]
const getAccuracy = (attempts: AttemptRecord[], id?: string) => {
  const f = id ? attempts.filter(a => a.exerciseId === id) : attempts
  return f.length === 0 ? null : Math.round(f.filter(a => a.correct).length / f.length * 100)
}
const getSeqLen = (level: number) => Math.min(4 + Math.floor(level / 2), 10)
const getGridSize = (level: number) => level >= 5 ? 25 : 16
const getObjCount = (level: number) => Math.min(4 + Math.floor(level / 3), 8)
const getSimonLen = (level: number) => Math.min(3 + Math.floor(level / 2), 12)

// ─── Sound Engine ─────────────────────────────────────────────────────────────
const useSound = () => {
  const ctx = useRef<AudioContext | null>(null)
  const getCtx = () => {
    if (!ctx.current) ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    return ctx.current
  }
  const play = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.3) => {
    try {
      const ac = getCtx()
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.connect(gain); gain.connect(ac.destination)
      osc.frequency.value = freq; osc.type = type
      gain.gain.setValueAtTime(vol, ac.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
      osc.start(); osc.stop(ac.currentTime + duration)
    } catch {}
  }, [])
  return {
    correct: () => { play(523, 0.1); setTimeout(() => play(659, 0.1), 100); setTimeout(() => play(784, 0.2), 200) },
    wrong:   () => { play(220, 0.15, 'sawtooth', 0.2); setTimeout(() => play(196, 0.2, 'sawtooth', 0.15), 150) },
    click:   () => play(440, 0.05, 'sine', 0.15),
    levelUp: () => { [523,659,784,1047].forEach((f,i) => setTimeout(() => play(f, 0.25), i*120)) },
    simonTone: (n: number) => { const freqs = [261, 329, 392, 523]; play(freqs[n % 4], 0.35, 'sine', 0.35) },
    xpGain:  () => play(880, 0.08, 'sine', 0.2),
  }
}

// ─── Confetti ────────────────────────────────────────────────────────────────
const spawnConfetti = (count = 60) => {
  const colors = ['#3b82f6','#8b5cf6','#ec4899','#10b981','#f59e0b','#06b6d4']
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div')
    el.className = 'particle'
    el.style.cssText = `left:${Math.random()*100}vw;top:-20px;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;background:${colors[Math.floor(Math.random()*colors.length)]};animation-duration:${1.5+Math.random()*2}s;animation-delay:${Math.random()*0.5}s;`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 4000)
  }
}

// ─── AI Coach Hook ────────────────────────────────────────────────────────────
const useAICoach = () => {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const getInsight = async (stats: UserStats, streak: number) => {
    setLoading(true); setInsight(null)
    const accuracy = getAccuracy(stats.attempts)
    const weakest = EXERCISES.reduce((w, ex) => {
      const acc = getAccuracy(stats.attempts, ex.id)
      if (acc === null) return w
      if (!w || acc < (getAccuracy(stats.attempts, w) ?? 101)) return ex.id
      return w
    }, null as string | null)

    const prompt = `You are a concise memory coach AI. Based on this user's stats, give ONE sharp, actionable insight (2-3 sentences max, no fluff):
- Level: ${getLevel(stats.xp)}, XP: ${stats.xp}
- Streak: ${streak} days
- Overall accuracy: ${accuracy ?? 'no data'}%
- Total exercises: ${stats.attempts.length}
- Weakest area: ${weakest ? EXERCISES.find(e=>e.id===weakest)?.title : 'not enough data'}
- Per-exercise accuracy: ${EXERCISES.map(e => `${e.title}: ${getAccuracy(stats.attempts, e.id) ?? 'n/a'}%`).join(', ')}

Be direct, specific, and motivating. Reference their actual weak area. Start with a sharp observation.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.find((c: any) => c.type === 'text')?.text
      setInsight(text || 'Keep training daily — your brain adapts fastest with consistent practice.')
    } catch {
      setInsight('Keep training daily — your brain adapts fastest with consistent practice.')
    }
    setLoading(false)
  }

  return { insight, loading, getInsight }
}

// ─── Share Card ───────────────────────────────────────────────────────────────
const generateShareCard = (stats: UserStats, streak: number): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080; canvas.height = 1080
    const ctx = canvas.getContext('2d')!

    // Background
    const bg = ctx.createLinearGradient(0, 0, 1080, 1080)
    bg.addColorStop(0, '#050a14'); bg.addColorStop(0.5, '#0d1930'); bg.addColorStop(1, '#050a14')
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1080, 1080)

    // Grid pattern
    ctx.strokeStyle = 'rgba(59,130,246,0.06)'; ctx.lineWidth = 1
    for (let x = 0; x < 1080; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1080); ctx.stroke() }
    for (let y = 0; y < 1080; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke() }

    // Glow orbs
    const glow1 = ctx.createRadialGradient(200, 200, 0, 200, 200, 400)
    glow1.addColorStop(0, 'rgba(59,130,246,0.15)'); glow1.addColorStop(1, 'transparent')
    ctx.fillStyle = glow1; ctx.fillRect(0, 0, 1080, 1080)

    const glow2 = ctx.createRadialGradient(900, 900, 0, 900, 900, 350)
    glow2.addColorStop(0, 'rgba(139,92,246,0.12)'); glow2.addColorStop(1, 'transparent')
    ctx.fillStyle = glow2; ctx.fillRect(0, 0, 1080, 1080)

    // Card bg
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5
    roundRect(ctx, 80, 80, 920, 920, 32); ctx.fill(); ctx.stroke()

    // App name
    ctx.font = 'bold 52px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.textAlign = 'center'
    ctx.fillText('MemoryGym', 540, 180)

    // Brain emoji area  
    ctx.font = '120px sans-serif'; ctx.fillText('🧠', 540, 370)

    // Streak
    ctx.font = 'bold 140px sans-serif'
    const streakGrad = ctx.createLinearGradient(300, 400, 780, 560)
    streakGrad.addColorStop(0, '#f97316'); streakGrad.addColorStop(1, '#fbbf24')
    ctx.fillStyle = streakGrad
    ctx.fillText(`${streak}`, 540, 560)

    ctx.font = '42px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillText('day streak 🔥', 540, 630)

    // Level badge
    const level = getLevel(stats.xp)
    ctx.fillStyle = 'rgba(59,130,246,0.25)'; ctx.strokeStyle = 'rgba(59,130,246,0.5)'; ctx.lineWidth = 2
    roundRect(ctx, 290, 680, 500, 80, 40); ctx.fill(); ctx.stroke()
    ctx.font = 'bold 34px sans-serif'; ctx.fillStyle = '#60a5fa'
    ctx.fillText(`Level ${level} · ${getLevelTitle(level)} · ${stats.xp} XP`, 540, 730)

    // Accuracy
    const acc = getAccuracy(stats.attempts)
    if (acc !== null) {
      ctx.font = '30px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText(`${acc}% accuracy · ${stats.attempts.length} exercises completed`, 540, 820)
    }

    ctx.font = '26px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillText('Train your mind daily', 540, 920)

    resolve(canvas.toDataURL('image/png'))
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h)
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

// ─── Notification Hook ────────────────────────────────────────────────────────
const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  useEffect(() => { if ('Notification' in window) setPermission(Notification.permission) }, [])

  const request = async () => {
    if (!('Notification' in window)) return
    const p = await Notification.requestPermission()
    setPermission(p)
    if (p === 'granted') scheduleDaily()
  }

  const scheduleDaily = () => {
    // Store that user enabled — actual scheduling needs service worker
    localStorage.setItem('notifEnabled', 'true')
  }

  const send = (title: string, body: string) => {
    if (permission === 'granted') new Notification(title, { body, icon: '/icon-192.png' })
  }

  return { permission, request, send }
}

// ─── PWA Install Hook ─────────────────────────────────────────────────────────
const usePWAInstall = () => {
  const [prompt, setPrompt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  const install = async () => { if (!prompt) return; prompt.prompt(); const { outcome } = await prompt.userChoice; if (outcome === 'accepted') setInstalled(true) }
  return { canInstall: !!prompt && !installed, install, installed }
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function MemoryApp() {
  const [stats, setStats] = useState<UserStats>({ xp: 0, level: 1, attempts: [], history: [] })
  const [completedToday, setCompletedToday] = useState<string[]>([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [activeExercise, setActiveExercise] = useState<Exercise | null>(null)
  const [exerciseState, setExerciseState] = useState<ExerciseState>({ phase: 'instructions' })
  const [view, setView] = useState<'home' | 'progress' | 'coach'>('home')
  const [xpGain, setXpGain] = useState<{ amount: number; levelUp: boolean } | null>(null)
  const [celebrate, setCelebrate] = useState(false)
  const [shareImg, setShareImg] = useState<string | null>(null)
  const sound = useSound()
  const { insight, loading: coachLoading, getInsight } = useAICoach()
  const { permission: notifPerm, request: requestNotif } = useNotifications()
  const { canInstall, install } = usePWAInstall()

  useEffect(() => {
    const stored = localStorage.getItem('memoryGymV3')
    if (stored) {
      const data: UserStats = JSON.parse(stored)
      setStats(data)
      const today = new Date().toDateString()
      const todayData = data.history?.find(d => d.date === today)
      if (todayData) setCompletedToday(todayData.completedExercises)
      calcStreaks(data.history || [])
    }
  }, [])

  const calcStreaks = (history: CompletionData[]) => {
    if (!history.length) { setCurrentStreak(0); setLongestStreak(0); return }
    const sorted = [...history].sort((a, b) => b.timestamp - a.timestamp)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    let current = 0, temp = 0
    for (let i = 0; i < sorted.length; i++) {
      const d = new Date(sorted[i].date)
      const exp = new Date(today); exp.setDate(exp.getDate() - i)
      if (d.toDateString() === exp.toDateString()) { temp++; if (i === 0 || current > 0) current = temp }
      else break
    }
    let run = 1, longest = 0
    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = Math.floor((new Date(sorted[i].date).getTime() - new Date(sorted[i + 1].date).getTime()) / 86400000)
      if (diff === 1) run++; else { longest = Math.max(longest, run); run = 1 }
    }
    setCurrentStreak(current); setLongestStreak(Math.max(longest, run, current))
  }

  const completeExercise = useCallback((exerciseId: string, isCorrect: boolean) => {
    const ex = EXERCISES.find(e => e.id === exerciseId)!
    const xpEarned = isCorrect ? ex.xpReward : Math.floor(ex.xpReward * 0.4)
    const today = new Date().toDateString()
    const newCompleted = [...completedToday, exerciseId]
    setCompletedToday(newCompleted)
    const newAttempts = [...stats.attempts, { exerciseId, correct: isCorrect, timestamp: Date.now() }]
    const newXp = stats.xp + xpEarned
    const oldLevel = getLevel(stats.xp)
    const newLevel = getLevel(newXp)
    const didLevelUp = newLevel > oldLevel
    const idx = stats.history.findIndex(d => d.date === today)
    const newHistory = idx >= 0
      ? stats.history.map((d, i) => i === idx ? { ...d, completedExercises: newCompleted } : d)
      : [...stats.history, { date: today, completedExercises: newCompleted, timestamp: Date.now() }]
    const newStats = { ...stats, xp: newXp, level: newLevel, attempts: newAttempts, history: newHistory }
    localStorage.setItem('memoryGymV3', JSON.stringify(newStats))
    setStats(newStats); calcStreaks(newHistory)
    setXpGain({ amount: xpEarned, levelUp: didLevelUp })
    if (didLevelUp) { sound.levelUp(); setTimeout(() => spawnConfetti(40), 200) }
    else if (isCorrect) sound.xpGain()
    setTimeout(() => setXpGain(null), 2500)
    setActiveExercise(null); setExerciseState({ phase: 'instructions' })
    if (newCompleted.length === EXERCISES.length) setTimeout(() => { setCelebrate(true); spawnConfetti(80); sound.levelUp() }, 400)
  }, [stats, completedToday, sound])

  const handleShare = async () => {
    sound.click()
    const img = await generateShareCard(stats, currentStreak)
    setShareImg(img)
  }

  const pct = completedToday.length / EXERCISES.length * 100
  const level = getLevel(stats.xp)

  if (view === 'progress') return <ProgressView stats={stats} currentStreak={currentStreak} longestStreak={longestStreak} onBack={() => setView('home')} sound={sound} />
  if (view === 'coach') return <CoachView stats={stats} streak={currentStreak} insight={insight} loading={coachLoading} onFetch={() => getInsight(stats, currentStreak)} onBack={() => setView('home')} />
  if (activeExercise) return <ExerciseView exercise={activeExercise} exerciseState={exerciseState} setExerciseState={setExerciseState} onComplete={(c: boolean) => completeExercise(activeExercise.id, c)} onClose={() => { setActiveExercise(null); setExerciseState({ phase: 'instructions' }) }} level={level} sound={sound} />

  return (
    <div className="min-h-screen relative" style={{ background: '#050a14' }}>
      <div className="mesh-bg" />
      <div className="relative z-10">

        {/* XP Float Notification */}
        <AnimatePresence>
          {xpGain && (
            <motion.div initial={{ opacity: 0, y: 20, x: '-50%' }} animate={{ opacity: 1, y: -10, x: '-50%' }} exit={{ opacity: 0, y: -40, x: '-50%' }}
              className="fixed top-24 left-1/2 z-50 pointer-events-none text-center"
            >
              <div className={`font-display font-bold text-xl px-5 py-2 rounded-full shadow-xl ${xpGain.levelUp ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900' : 'bg-blue-500/90 text-white'}`}>
                {xpGain.levelUp ? `🎉 LEVEL UP! +${xpGain.amount} XP` : `+${xpGain.amount} XP`}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ rotate: 15 }} className="w-11 h-11 glass rounded-2xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-400" />
              </motion.div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white tracking-tight">MemoryGym</h1>
                <p className="text-blue-300/50 text-xs mt-0.5">{QUOTES[new Date().getDate() % QUOTES.length]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canInstall && (
                <button onClick={install} className="glass rounded-xl px-3 py-2 text-xs text-blue-300/70 hover:text-white flex items-center gap-1.5 transition-colors">
                  <Download className="w-3.5 h-3.5" /> Install
                </button>
              )}
              <button onClick={() => setView('progress')} className="glass rounded-xl p-2.5 text-blue-300/60 hover:text-white transition-colors">
                <BarChart2 className="w-4 h-4" />
              </button>
              <button onClick={() => { setView('coach'); if (!insight) getInsight(stats, currentStreak) }}
                className="glass rounded-xl p-2.5 text-purple-300/60 hover:text-purple-300 transition-colors">
                <Sparkles className="w-4 h-4" />
              </button>
              <button onClick={() => notifPerm !== 'granted' ? requestNotif() : null}
                className={`glass rounded-xl p-2.5 transition-colors ${notifPerm === 'granted' ? 'text-green-400' : 'text-blue-300/60 hover:text-white'}`}>
                {notifPerm === 'granted' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </button>
            </div>
          </motion.div>

          {/* Level + XP Bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
            <div className="glass rounded-2xl p-4">
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-display font-semibold text-white text-sm">Level {level}</span>
                  <span className="text-blue-300/40 text-xs">· {getLevelTitle(level)}</span>
                </div>
                <span className="text-blue-300/40 text-xs">{stats.xp} XP total</span>
              </div>
              <div className="w-full bg-white/8 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${getLevelProgress(stats.xp) / XP_PER_LEVEL * 100}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }} className="h-2 rounded-full xp-bar-fill"
                />
              </div>
              <div className="flex justify-between text-xs mt-1.5 text-blue-300/30">
                <span>{getLevelProgress(stats.xp)} / {XP_PER_LEVEL} XP</span>
                <span>{getAccuracy(stats.attempts) !== null ? `${getAccuracy(stats.attempts)}% accuracy` : 'Start training'}</span>
              </div>
            </div>
          </motion.div>

          {/* Stats Row */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="grid grid-cols-3 gap-3">
            <div className="glass rounded-2xl p-4 text-center">
              <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${currentStreak > 0 ? 'bg-orange-500/20 streak-pulse' : 'bg-white/5'}`}>
                <Flame className={`w-5 h-5 ${currentStreak > 0 ? 'text-orange-400' : 'text-white/20'}`} />
              </div>
              <p className="font-display font-bold text-2xl text-white">{currentStreak}</p>
              <p className="text-xs text-blue-300/40 mt-0.5">day streak</p>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-green-500/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <p className="font-display font-bold text-2xl text-white">{completedToday.length}<span className="text-sm font-normal text-blue-300/40">/{EXERCISES.length}</span></p>
              <p className="text-xs text-blue-300/40 mt-0.5">today</p>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="font-display font-bold text-2xl text-white">{longestStreak}</p>
              <p className="text-xs text-blue-300/40 mt-0.5">best streak</p>
            </div>
          </motion.div>

          {/* Today Progress Bar */}
          {pct > 0 && pct < 100 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl px-4 py-3">
              <div className="flex justify-between text-xs text-blue-300/50 mb-2">
                <span>Today's progress</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div className="w-full bg-white/8 rounded-full h-1.5">
                <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} className="h-1.5 bg-green-400 rounded-full" />
              </div>
            </motion.div>
          )}

          {/* Exercise Grid */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-display font-semibold text-white text-base">Today's Training</h2>
              <span className="text-xs text-blue-300/30">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EXERCISES.map((ex, i) => {
                const done = completedToday.includes(ex.id)
                const acc = getAccuracy(stats.attempts, ex.id)
                const c = COLOR_MAP[ex.color]
                return (
                  <motion.div key={ex.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 + i * 0.05 }}>
                    <div
                      className={`exercise-card glass rounded-2xl p-4 cursor-pointer border ${done ? 'done bg-green-500/8 border-green-500/20' : `border-white/8 hover:border-white/15`}`}
                      onClick={() => { if (!done) { sound.click(); setActiveExercise(ex) } }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl ${done ? 'bg-green-500/20 text-green-400' : `${c.bg} ${c.text}`}`}>
                            {ex.icon}
                          </div>
                          <div>
                            <p className="font-display font-semibold text-white text-sm">{ex.title}</p>
                            <p className="text-xs text-blue-300/40 mt-0.5 leading-tight">{ex.description}</p>
                          </div>
                        </div>
                        {done
                          ? <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                          : <Circle className="w-5 h-5 text-white/12 flex-shrink-0" />
                        }
                      </div>
                      <div className="flex justify-between items-center text-xs text-blue-300/35">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{ex.duration}m</span>
                        <span className={`font-medium ${done ? 'text-green-400/60' : 'text-yellow-400/70'}`}>+{ex.xpReward} XP</span>
                        {acc !== null ? <span>{acc}%</span> : <span className="opacity-0">0%</span>}
                        {!done && <span className={`flex items-center gap-0.5 ${c.text}`}>Start <ChevronRight className="w-3 h-3" /></span>}
                        {done && <span className="text-green-400/50">Done ✓</span>}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Week Strip + Share */}
          <div className="glass rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-blue-300/50">This week</span>
              <button onClick={handleShare} className="flex items-center gap-1.5 text-xs text-blue-300/50 hover:text-blue-300 transition-colors">
                <Share2 className="w-3.5 h-3.5" /> Share streak
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(); d.setDate(d.getDate() - (6 - i))
                const done = stats.history.some(h => h.date === d.toDateString())
                const isToday = d.toDateString() === new Date().toDateString()
                return (
                  <div key={i} className="text-center">
                    <p className="text-xs text-blue-300/25 mb-1.5">{d.toLocaleDateString('en-US', { weekday: 'short' })}</p>
                    <div className={`aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition-all ${done ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25' : isToday ? 'border-2 border-blue-400/60 text-blue-300 bg-blue-500/8' : 'bg-white/4 text-blue-300/20'}`}>
                      {done ? <CheckCircle2 className="w-4 h-4" /> : d.getDate()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* AI Coach Preview Teaser */}
          {!insight && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              onClick={() => { setView('coach'); getInsight(stats, currentStreak) }}
              className="glass rounded-2xl p-4 cursor-pointer hover:border-purple-500/30 border border-white/8 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">AI Memory Coach</p>
                  <p className="text-xs text-blue-300/40 mt-0.5">Get personalized insights on your weak areas</p>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-300/30 group-hover:text-purple-400 transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          )}

          {/* Install Banner (if applicable) */}
          {canInstall && (
            <div className="install-banner rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Install MemoryGym</p>
                <p className="text-xs text-blue-300/60">Add to home screen for daily reminders</p>
              </div>
              <Button onClick={install} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-2 h-auto rounded-xl">Install</Button>
            </div>
          )}

        </div>
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {shareImg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShareImg(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}
              className="glass-strong rounded-3xl p-6 max-w-sm w-full space-y-4">
              <h3 className="font-display font-bold text-white text-lg text-center">Your Streak Card</h3>
              <img src={shareImg} alt="Share card" className="w-full rounded-2xl" />
              <div className="grid grid-cols-2 gap-3">
                <a href={shareImg} download="memorygym-streak.png"
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-3 rounded-xl transition-colors">
                  <Download className="w-4 h-4" /> Download
                </a>
                <button onClick={() => setShareImg(null)}
                  className="glass rounded-xl text-blue-300/70 hover:text-white text-sm transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Complete Celebration */}
      <AnimatePresence>
        {celebrate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}>
              <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center space-y-5">
                <motion.div animate={{ rotate: [0, -10, 10, -10, 10, 0] }} transition={{ delay: 0.3 }}>
                  <div className="text-6xl">🏆</div>
                </motion.div>
                <div>
                  <h2 className="font-display text-2xl font-bold text-white">Day Complete!</h2>
                  <p className="text-blue-300/60 text-sm mt-1">All {EXERCISES.length} exercises crushed.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3">
                    <p className="text-xs text-orange-300/60">Streak</p>
                    <p className="font-display font-bold text-2xl text-orange-400">{currentStreak}🔥</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3">
                    <p className="text-xs text-blue-300/60">Level</p>
                    <p className="font-display font-bold text-2xl text-blue-400">{level}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleShare} className="border border-white/15 text-blue-300 hover:text-white hover:bg-white/10 rounded-xl">
                    <Share2 className="w-4 h-4 mr-2" /> Share
                  </Button>
                  <Button onClick={() => setCelebrate(false)} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                    Awesome! 🎉
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Exercise Router ──────────────────────────────────────────────────────────
function ExerciseView({ exercise, exerciseState, setExerciseState, onComplete, onClose, level, sound }: any) {
  const p = { exerciseState, setExerciseState, onComplete, onClose, level, sound }
  switch (exercise.type) {
    case 'number-sequence': return <NumberSeqEx {...p} />
    case 'word-association': return <WordAssocEx {...p} />
    case 'visual-pattern':  return <VisualPatEx {...p} />
    case 'simon-says':      return <SimonSaysEx {...p} />
    case 'breathing':       return <BreathEx onComplete={() => onComplete(true)} onClose={onClose} sound={sound} />
    case 'object-location': return <ObjLocEx {...p} />
    default: return null
  }
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function ExWrap({ title, children, onClose, color = 'blue' }: any) {
  const c = COLOR_MAP[color] || COLOR_MAP.blue
  return (
    <div className="min-h-screen relative" style={{ background: '#050a14' }}>
      <div className="mesh-bg" />
      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="flex items-center gap-1.5 text-blue-300/50 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />Back
          </button>
          <h2 className={`font-display font-semibold text-base ${c.text}`}>{title}</h2>
          <div className="w-16" />
        </div>
        {children}
      </div>
    </div>
  )
}

function ExCard({ children }: any) {
  return <div className="glass rounded-2xl p-6">{children}</div>
}

function FeedbackBlock({ isCorrect, detail, customMessage, onComplete, sound }: any) {
  useEffect(() => { if (isCorrect) sound?.correct(); else sound?.wrong() }, [])
  return (
    <div className="space-y-5 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 250, damping: 15 }}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isCorrect ? 'bg-green-500/20 border border-green-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
          {isCorrect
            ? <CheckCircle2 className="w-8 h-8 text-green-400" />
            : <span className="text-2xl">💪</span>
          }
        </div>
      </motion.div>
      <div>
        <h3 className="font-display text-xl font-bold text-white">{isCorrect ? '✨ Excellent!' : '🎯 Good Try!'}</h3>
        <p className="text-blue-300/50 text-sm mt-1">{customMessage || (isCorrect ? 'Perfect. Your brain is stronger.' : 'Every attempt strengthens your memory.')}</p>
      </div>
      {detail && <div className="glass rounded-xl p-4">{detail}</div>}
      <Button onClick={onComplete} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-display font-semibold">
        Complete Exercise
      </Button>
    </div>
  )
}

// ─── Simon Says ───────────────────────────────────────────────────────────────
function SimonSaysEx({ exerciseState, setExerciseState, onComplete, onClose, level, sound }: any) {
  const [sequence, setSequence] = useState<number[]>([])
  const [playerSeq, setPlayerSeq] = useState<number[]>([])
  const [activeBtn, setActiveBtn] = useState<number | null>(null)
  const [phase, setPhase] = useState<'instructions' | 'showing' | 'input' | 'feedback'>('instructions')
  const [isCorrect, setIsCorrect] = useState(false)
  const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('simonHigh') || '0'))
  const targetLen = getSimonLen(level)

  const COLORS = [
    { bg: 'bg-red-500', activeBg: 'bg-red-300', border: 'border-red-400' },
    { bg: 'bg-blue-500', activeBg: 'bg-blue-300', border: 'border-blue-400' },
    { bg: 'bg-green-500', activeBg: 'bg-green-300', border: 'border-green-400' },
    { bg: 'bg-yellow-500', activeBg: 'bg-yellow-300', border: 'border-yellow-400' },
  ]

  const showSequence = async (seq: number[]) => {
    setPhase('showing'); setPlayerSeq([])
    await new Promise(r => setTimeout(r, 500))
    for (let i = 0; i < seq.length; i++) {
      setActiveBtn(seq[i]); sound?.simonTone(seq[i])
      await new Promise(r => setTimeout(r, 600))
      setActiveBtn(null)
      await new Promise(r => setTimeout(r, 250))
    }
    setPhase('input')
  }

  const start = () => {
    const seq = Array.from({ length: targetLen }, () => Math.floor(Math.random() * 4))
    setSequence(seq); showSequence(seq)
  }

  const handlePress = (btn: number) => {
    if (phase !== 'input') return
    setActiveBtn(btn); sound?.simonTone(btn)
    setTimeout(() => setActiveBtn(null), 200)
    const newPlayerSeq = [...playerSeq, btn]
    setPlayerSeq(newPlayerSeq)
    if (btn !== sequence[newPlayerSeq.length - 1]) {
      setIsCorrect(false); setPhase('feedback'); return
    }
    if (newPlayerSeq.length === sequence.length) {
      const correct = true
      setIsCorrect(correct); setPhase('feedback')
      if (sequence.length > highScore) {
        setHighScore(sequence.length)
        localStorage.setItem('simonHigh', String(sequence.length))
      }
    }
  }

  const SimonButtons = () => (
    <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
      {COLORS.map((c, i) => (
        <button key={i} onClick={() => handlePress(i)}
          className={`simon-btn aspect-square rounded-2xl border-2 ${activeBtn === i ? `${c.activeBg} ${c.border} active` : `${c.bg} ${c.border} opacity-80`} ${phase !== 'input' ? 'cursor-default' : 'hover:opacity-100'}`}
          disabled={phase !== 'input'}
        />
      ))}
    </div>
  )

  return (
    <ExWrap title="Simon Says" onClose={onClose} color="pink">
      <ExCard>
        {phase === 'instructions' && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-pink-500/20 rounded-2xl flex items-center justify-center mx-auto border border-pink-500/30">
              <Gamepad2 className="w-7 h-7 text-pink-400" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Simon Says</h3>
              <p className="text-blue-300/50 text-sm">Watch the sequence of colored flashes, then repeat it in order. Length: <span className="text-white font-medium">{targetLen}</span></p>
              {highScore > 0 && <p className="text-pink-400/60 text-xs mt-2">Your best: {highScore} steps</p>}
            </div>
            <SimonButtons />
            <Button onClick={start} className="w-full bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-display font-semibold">Start</Button>
          </div>
        )}

        {(phase === 'showing' || phase === 'input') && (
          <div className="space-y-6 text-center">
            <div>
              <p className="text-blue-300/50 text-sm mb-1">
                {phase === 'showing' ? '👀 Watch carefully...' : `🎯 Your turn! (${playerSeq.length}/${sequence.length})`}
              </p>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {sequence.map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < playerSeq.length ? 'bg-green-400' : i === playerSeq.length && phase === 'input' ? 'bg-blue-400 animate-pulse' : 'bg-white/15'}`} />
                ))}
              </div>
            </div>
            <SimonButtons />
            {phase === 'showing' && <p className="text-xs text-blue-300/25 animate-pulse">Watch the sequence…</p>}
          </div>
        )}

        {phase === 'feedback' && (
          <FeedbackBlock isCorrect={isCorrect} sound={sound} onComplete={() => onComplete(isCorrect)}
            customMessage={isCorrect ? `Flawless! ${sequence.length} steps memorized.` : `You got ${playerSeq.length - 1} of ${sequence.length} steps.`}
            detail={
              <div className="space-y-2 text-sm text-center">
                <p className="text-blue-300/40 text-xs">Correct sequence:</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {sequence.map((s, i) => (
                    <div key={i} className={`w-7 h-7 rounded-lg ${COLORS[s].bg} ${i < playerSeq.length - 1 ? 'opacity-100' : i === playerSeq.length - 1 && !isCorrect ? 'opacity-100 ring-2 ring-red-400' : 'opacity-60'}`} />
                  ))}
                </div>
                {highScore > 0 && <p className="text-yellow-400/50 text-xs">Best: {highScore} steps</p>}
              </div>
            }
          />
        )}
      </ExCard>
    </ExWrap>
  )
}

// ─── Number Sequence ──────────────────────────────────────────────────────────
function NumberSeqEx({ exerciseState, setExerciseState, onComplete, onClose, level, sound }: any) {
  const [input, setInput] = useState('')
  const seqLen = getSeqLen(level)
  const ref = useRef(exerciseState); ref.current = exerciseState

  useEffect(() => {
    const seq = Array.from({ length: seqLen }, () => Math.floor(Math.random() * 9))
    setExerciseState({ phase: 'instructions', data: { sequence: seq } })
  }, [])

  const start = () => {
    const seq = ref.current.data.sequence
    setExerciseState({ phase: 'active', data: { sequence: seq } })
    setTimeout(() => setExerciseState({ phase: 'input', data: { sequence: seq } }), 5000)
  }

  const check = () => {
    const seq = ref.current.data.sequence
    const correct = input === seq.join('')
    setExerciseState({ ...ref.current, phase: 'feedback', userAnswer: input, isCorrect: correct })
  }

  return (
    <ExWrap title="Number Sequence" onClose={onClose} color="blue">
      <ExCard>
        {exerciseState.phase === 'instructions' && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30"><Hash className="w-7 h-7 text-blue-400" /></div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Number Sequence</h3>
              <p className="text-blue-300/50 text-sm"><span className="text-white font-medium">{seqLen} digits</span> appear for 5 seconds. Memorize them, then type them back.</p>
              {level >= 3 && <p className="text-yellow-400/50 text-xs mt-2">Level {level} — {seqLen}-digit challenge!</p>}
            </div>
            <Button onClick={start} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-display font-semibold">Start</Button>
          </div>
        )}
        {exerciseState.phase === 'active' && (
          <div className="text-center space-y-5 py-8">
            <p className="text-blue-300/40 text-sm">Memorize this sequence:</p>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="font-display text-5xl font-bold text-white tracking-[0.15em]">
              {exerciseState.data.sequence.join(' ')}
            </motion.div>
            <p className="text-xs text-blue-300/25">Disappears in 5 seconds…</p>
          </div>
        )}
        {exerciseState.phase === 'input' && (
          <div className="space-y-5">
            <p className="text-center text-blue-300/50 text-sm">What was the sequence?</p>
            <Input value={input} onChange={e => setInput(e.target.value.replace(/\D/g, ''))}
              placeholder={`${seqLen} digits`}
              className="text-center text-2xl tracking-[0.2em] bg-white/8 border-white/15 text-white placeholder:text-white/15 rounded-xl h-14"
              maxLength={seqLen} autoFocus onKeyDown={e => e.key === 'Enter' && input.length === seqLen && check()} />
            <Button onClick={check} className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-display font-semibold" disabled={input.length !== seqLen}>Check Answer</Button>
          </div>
        )}
        {exerciseState.phase === 'feedback' && (
          <FeedbackBlock isCorrect={exerciseState.isCorrect} sound={sound} onComplete={() => onComplete(exerciseState.isCorrect)}
            detail={<>
              <p className="text-xs text-blue-300/35 mb-1.5">Correct sequence:</p>
              <p className="font-display text-2xl font-bold text-white tracking-[0.15em]">{exerciseState.data.sequence.join(' ')}</p>
              {!exerciseState.isCorrect && <>
                <p className="text-xs text-blue-300/35 mt-3 mb-1.5">Your answer:</p>
                <p className="font-display text-2xl font-bold text-red-400 tracking-[0.15em]">{exerciseState.userAnswer.split('').join(' ')}</p>
              </>}
            </>}
          />
        )}
      </ExCard>
    </ExWrap>
  )
}

// ─── Word Association ─────────────────────────────────────────────────────────
function WordAssocEx({ exerciseState, setExerciseState, onComplete, onClose, sound }: any) {
  const [words, setWords] = useState<string[]>([])
  const [input, setInput] = useState('')
  const ref = useRef(exerciseState); ref.current = exerciseState
  const starters = ['Ocean', 'Mountain', 'Forest', 'City', 'Desert', 'River', 'Storm', 'Mirror', 'Silence', 'Lightning']

  useEffect(() => {
    setExerciseState({ phase: 'instructions', data: { startWord: starters[Math.floor(Math.random() * starters.length)] } })
  }, [])

  const start = () => { setWords([ref.current.data.startWord]); setExerciseState({ ...ref.current, phase: 'active' }) }
  const addWord = () => {
    if (!input.trim()) return
    const nw = [...words, input.trim()]; setWords(nw); setInput('')
    sound?.click()
    if (nw.length >= 6) setExerciseState({ ...ref.current, phase: 'feedback', data: { ...ref.current.data, words: nw } })
  }

  return (
    <ExWrap title="Word Chain" onClose={onClose} color="green">
      <ExCard>
        {exerciseState.phase === 'instructions' && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-green-500/20 rounded-2xl flex items-center justify-center mx-auto border border-green-500/30"><Link2 className="w-7 h-7 text-green-400" /></div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Word Chain</h3>
              <p className="text-blue-300/50 text-sm">Build a chain of 5 words, each associated with the previous one. Strengthen semantic memory.</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
              <p className="text-xs text-green-300/40 mb-1">Starting word:</p>
              <p className="font-display text-3xl font-bold text-white">{exerciseState.data?.startWord}</p>
            </div>
            <Button onClick={start} className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl font-display font-semibold">Start</Button>
          </div>
        )}
        {exerciseState.phase === 'active' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {words.map((w, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-display font-semibold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-white font-medium text-sm">{w}</div>
                </motion.div>
              ))}
            </div>
            {words.length < 6 && (
              <div className="flex gap-2 pt-1">
                <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addWord()}
                  placeholder="Next associated word…" className="bg-white/8 border-white/15 text-gray-900 placeholder:text-gray-400/20 rounded-xl" autoFocus />
                <Button onClick={addWord} disabled={!input.trim()} className="bg-green-600 hover:bg-green-500 text-white rounded-xl">Add</Button>
              </div>
            )}
            <p className="text-xs text-blue-300/25">{Math.max(0, 6 - words.length)} more needed</p>
          </div>
        )}
        {exerciseState.phase === 'feedback' && (
          <FeedbackBlock isCorrect={true} sound={sound} onComplete={() => onComplete(true)}
            detail={<div className="space-y-1.5 text-left">{exerciseState.data?.words?.map((w: string, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <ChevronRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="text-white">{w}</span>
              </div>
            ))}</div>}
          />
        )}
      </ExCard>
    </ExWrap>
  )
}

// ─── Visual Pattern ───────────────────────────────────────────────────────────
function VisualPatEx({ exerciseState, setExerciseState, onComplete, onClose, sound }: any) {
  const [selected, setSelected] = useState<number | null>(null)
  const ref = useRef(exerciseState); ref.current = exerciseState
  const colors = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500']

  useEffect(() => {
    const pat = Array.from({ length: 9 }, () => Math.floor(Math.random() * 5))
    const opts = [pat]
    for (let i = 0; i < 3; i++) {
      const w = [...pat]; w[Math.floor(Math.random() * 9)] = (w[Math.floor(Math.random() * 9)] + 1 + Math.floor(Math.random() * 4)) % 5
      opts.push(w)
    }
    const shuffled = opts.sort(() => Math.random() - 0.5)
    const ci = shuffled.findIndex(o => JSON.stringify(o) === JSON.stringify(pat))
    setExerciseState({ phase: 'instructions', data: { pattern: pat, options: shuffled, correctIndex: ci } })
  }, [])

  const start = () => {
    const d = ref.current.data
    setExerciseState({ phase: 'active', data: d })
    setTimeout(() => setExerciseState({ phase: 'input', data: d }), 4000)
  }

  const renderGrid = (pat: number[], sz = 'w-8 h-8') => (
    <div className="grid grid-cols-3 gap-1.5">{pat.map((c, i) => <div key={i} className={`${colors[c]} ${sz} rounded`} />)}</div>
  )

  return (
    <ExWrap title="Pattern Recognition" onClose={onClose} color="purple">
      <ExCard>
        {exerciseState.phase === 'instructions' && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto border border-purple-500/30"><Eye className="w-7 h-7 text-purple-400" /></div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Pattern Recognition</h3>
              <p className="text-blue-300/50 text-sm">A color grid appears for 4 seconds. Memorize it, then find the match from 4 options.</p>
            </div>
            <Button onClick={start} className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-display font-semibold">Start</Button>
          </div>
        )}
        {exerciseState.phase === 'active' && (
          <div className="text-center space-y-5 py-8">
            <p className="text-blue-300/40 text-sm">Memorize this pattern:</p>
            <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex justify-center">
              {renderGrid(exerciseState.data.pattern, 'w-16 h-16')}
            </motion.div>
            <p className="text-xs text-blue-300/25">Disappears in 4 seconds…</p>
          </div>
        )}
        {exerciseState.phase === 'input' && (
          <div className="space-y-4">
            <p className="text-center text-blue-300/50 text-sm">Which pattern did you see?</p>
            <div className="grid grid-cols-2 gap-3">
              {exerciseState.data.options.map((p: number[], i: number) => (
                <div key={i} onClick={() => { setSelected(i); sound?.click() }}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex justify-center ${selected === i ? 'border-purple-500 bg-purple-500/15' : 'border-white/8 bg-white/4 hover:border-purple-400/30'}`}>
                  {renderGrid(p)}
                </div>
              ))}
            </div>
            <Button onClick={() => {
              const correct = selected === ref.current.data.correctIndex
              setExerciseState({ ...ref.current, phase: 'feedback', isCorrect: correct })
            }} className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-display font-semibold" disabled={selected === null}>Check Answer</Button>
          </div>
        )}
        {exerciseState.phase === 'feedback' && (
          <FeedbackBlock isCorrect={exerciseState.isCorrect} sound={sound} onComplete={() => onComplete(exerciseState.isCorrect)}
            detail={<><p className="text-xs text-blue-300/35 mb-2">Correct pattern:</p><div className="flex justify-center">{renderGrid(exerciseState.data.pattern, 'w-10 h-10')}</div></>}
          />
        )}
      </ExCard>
    </ExWrap>
  )
}

// ─── Breathing ────────────────────────────────────────────────────────────────
function BreathEx({ onComplete, onClose, sound }: any) {
  const [phase, setPhase] = useState<'instructions' | 'active' | 'done'>('instructions')
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale')
  const [cycle, setCycle] = useState(0)

  const start = () => {
    setPhase('active')
    let c = 0
    const run = () => {
      if (c >= 5) { setPhase('done'); return }
      setBreathPhase('inhale')
      setTimeout(() => { setBreathPhase('hold'); setTimeout(() => { setBreathPhase('exhale'); setTimeout(() => { c++; setCycle(c); run() }, 4000) }, 4000) }, 4000)
    }
    run()
  }

  const label = { inhale: 'Breathe In', hold: 'Hold', exhale: 'Breathe Out' }
  const isExpanding = breathPhase !== 'exhale'

  return (
    <ExWrap title="Focused Breathing" onClose={onClose} color="cyan">
      <ExCard>
        {phase === 'instructions' && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto border border-cyan-500/30"><Wind className="w-7 h-7 text-cyan-400" /></div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">4-4-4 Breathing</h3>
              <p className="text-blue-300/50 text-sm">Box breathing: inhale 4s · hold 4s · exhale 4s. 5 cycles. Proven to reduce stress and sharpen focus.</p>
            </div>
            <Button onClick={start} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-display font-semibold">Start</Button>
          </div>
        )}
        {phase === 'active' && (
          <div className="text-center space-y-8 py-6">
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <motion.div animate={{ scale: isExpanding ? 1.6 : 1 }} transition={{ duration: 4, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-cyan-500/10 border border-cyan-500/20" />
              <motion.div animate={{ scale: isExpanding ? 1.2 : 0.85 }} transition={{ duration: 4, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-full bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center">
                <Wind className="w-7 h-7 text-cyan-300" />
              </motion.div>
            </div>
            <div>
              <motion.p key={breathPhase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="font-display text-3xl font-bold text-white">{label[breathPhase]}</motion.p>
              <div className="flex justify-center gap-1.5 mt-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < cycle ? 'bg-cyan-400' : 'bg-white/15'}`} />
                ))}
              </div>
            </div>
          </div>
        )}
        {phase === 'done' && <FeedbackBlock isCorrect={true} sound={sound} customMessage="Your mind is clearer and more focused." onComplete={onComplete} />}
      </ExCard>
    </ExWrap>
  )
}

// ─── Object Location ──────────────────────────────────────────────────────────
function ObjLocEx({ exerciseState, setExerciseState, onComplete, onClose, level, sound }: any) {
  const [selected, setSelected] = useState<number[]>([])
  const ref = useRef(exerciseState); ref.current = exerciseState
  const gridSize = getGridSize(level); const cols = Math.sqrt(gridSize); const objCount = getObjCount(level)
  const objects = ['🌟', '🎯', '🎨', '🎭', '🎪', '🔮', '🎸', '🌙']

  useEffect(() => {
    const positions: number[] = []
    while (positions.length < objCount) { const p = Math.floor(Math.random() * gridSize); if (!positions.includes(p)) positions.push(p) }
    setExerciseState({ phase: 'instructions', data: { positions } })
  }, [])

  const start = () => {
    const d = ref.current.data
    setExerciseState({ phase: 'active', data: d })
    setTimeout(() => setExerciseState({ phase: 'input', data: d }), 5000)
  }

  const toggle = (i: number) => {
    sound?.click()
    if (selected.includes(i)) setSelected(selected.filter(x => x !== i))
    else if (selected.length < objCount) setSelected([...selected, i])
  }

  const check = () => {
    const d = ref.current.data
    const correct = d.positions.every((p: number) => selected.includes(p)) && selected.length === objCount
    setExerciseState({ ...ref.current, phase: 'feedback', isCorrect: correct, userAnswer: selected })
  }

  return (
    <ExWrap title="Spatial Memory" onClose={onClose} color="orange">
      <ExCard>
        {exerciseState.phase === 'instructions' && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto border border-orange-500/30"><MapPin className="w-7 h-7 text-orange-400" /></div>
            <div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Spatial Memory</h3>
              <p className="text-blue-300/50 text-sm"><span className="text-white font-medium">{objCount} objects</span> in a {cols}×{cols} grid. 5 seconds to memorize, then mark their positions.</p>
              {level >= 5 && <p className="text-yellow-400/50 text-xs mt-2">Level {level} — 5×5 grid!</p>}
            </div>
            <Button onClick={start} className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-display font-semibold">Start</Button>
          </div>
        )}
        {exerciseState.phase === 'active' && (
          <div className="text-center space-y-4">
            <p className="text-blue-300/40 text-sm">Memorize the positions:</p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-2 mx-auto"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: `${cols * 58}px` }}>
              {Array.from({ length: gridSize }).map((_, i) => {
                const oi = exerciseState.data.positions.indexOf(i)
                return <div key={i} className="aspect-square bg-white/5 border border-white/8 rounded-xl flex items-center justify-center text-2xl">{oi >= 0 ? objects[oi] : ''}</div>
              })}
            </motion.div>
            <p className="text-xs text-blue-300/25">Disappears in 5 seconds…</p>
          </div>
        )}
        {exerciseState.phase === 'input' && (
          <div className="space-y-4">
            <p className="text-center text-blue-300/50 text-sm">Tap where the objects were:</p>
            <div className="grid gap-2 mx-auto" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: `${cols * 58}px` }}>
              {Array.from({ length: gridSize }).map((_, i) => (
                <button key={i} onClick={() => toggle(i)}
                  className={`aspect-square rounded-xl border-2 transition-all ${selected.includes(i) ? 'bg-orange-500 border-orange-400 shadow-lg shadow-orange-500/30' : 'bg-white/5 border-white/8 hover:border-orange-400/30'}`}>
                  {selected.includes(i) && <CheckCircle2 className="w-5 h-5 mx-auto text-white" />}
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-blue-300/30">{selected.length} of {objCount} selected</p>
            <Button onClick={check} className="w-full bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-display font-semibold" disabled={selected.length !== objCount}>Check Answer</Button>
          </div>
        )}
        {exerciseState.phase === 'feedback' && (
          <FeedbackBlock isCorrect={exerciseState.isCorrect} sound={sound} onComplete={() => onComplete(exerciseState.isCorrect)}
            detail={<>
              <p className="text-xs text-blue-300/35 mb-2">Correct positions:</p>
              <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: `${cols * 46}px` }}>
                {Array.from({ length: gridSize }).map((_, i) => {
                  const oi = exerciseState.data.positions.indexOf(i); const ws = exerciseState.userAnswer?.includes(i)
                  return <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-lg ${oi >= 0 && ws ? 'bg-green-500/30' : oi >= 0 ? 'bg-orange-500/30 ring-1 ring-orange-500' : ws ? 'bg-red-500/20' : 'bg-white/4'}`}>{oi >= 0 ? objects[oi] : ''}</div>
                })}
              </div>
            </>}
          />
        )}
      </ExCard>
    </ExWrap>
  )
}

// ─── AI Coach View ────────────────────────────────────────────────────────────
function CoachView({ stats, streak, insight, loading, onFetch, onBack }: any) {
  const level = getLevel(stats.xp)
  const weakest = EXERCISES.reduce((w, ex) => {
    const acc = getAccuracy(stats.attempts, ex.id)
    if (acc === null) return w
    if (!w || acc < (getAccuracy(stats.attempts, w) ?? 101)) return ex.id
    return w
  }, null as string | null)

  return (
    <div className="min-h-screen relative" style={{ background: '#050a14' }}>
      <div className="mesh-bg" />
      <div className="relative z-10 max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-blue-300/50 hover:text-white text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back</button>
          <h1 className="font-display text-xl font-bold text-white">AI Memory Coach</h1>
        </div>

        {/* Coach Insight */}
        <div className="glass rounded-2xl p-5 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/25 flex items-center justify-center"><Sparkles className="w-5 h-5 text-purple-400" /></div>
            <div>
              <p className="font-display font-semibold text-white text-sm">Personal Insight</p>
              <p className="text-xs text-blue-300/40">Powered by Claude AI</p>
            </div>
            <button onClick={onFetch} disabled={loading} className="ml-auto text-blue-300/40 hover:text-blue-300 transition-colors">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading && (
            <div className="space-y-2">
              <div className="h-3 bg-white/8 rounded-full animate-pulse w-full" />
              <div className="h-3 bg-white/8 rounded-full animate-pulse w-4/5" />
              <div className="h-3 bg-white/8 rounded-full animate-pulse w-3/5" />
            </div>
          )}

          {!loading && insight && (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-blue-100/80 text-sm leading-relaxed">
              {insight}
            </motion.p>
          )}

          {!loading && !insight && (
            <div className="text-center py-4">
              <p className="text-blue-300/40 text-sm mb-3">Get a personalized analysis of your training</p>
              <Button onClick={onFetch} className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm">
                <Sparkles className="w-4 h-4 mr-2" />Get Insight
              </Button>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-400" />Your Performance</h3>
          <div className="space-y-3">
            {EXERCISES.map(ex => {
              const acc = getAccuracy(stats.attempts, ex.id)
              const count = stats.attempts.filter((a: AttemptRecord) => a.exerciseId === ex.id).length
              const c = COLOR_MAP[ex.color]
              const isWeak = weakest === ex.id && count > 0
              return (
                <div key={ex.id} className={`rounded-xl p-3 ${isWeak ? 'bg-orange-500/8 border border-orange-500/20' : 'bg-white/4'}`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={c.text}>{ex.icon}</span>
                      <span className="text-sm text-white">{ex.title}</span>
                      {isWeak && <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">Focus here</span>}
                    </div>
                    <span className="text-white text-sm font-medium">{acc !== null ? `${acc}%` : '—'}</span>
                  </div>
                  <div className="w-full bg-white/8 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${isWeak ? 'bg-orange-400' : 'bg-blue-400'}`} style={{ width: `${acc ?? 0}%` }} />
                  </div>
                  <p className="text-xs text-blue-300/25 mt-1">{count} attempt{count !== 1 ? 's' : ''}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Level Journey */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400" />Level Journey</h3>
          <div className="space-y-2">
            {LEVEL_TITLES.slice(0, Math.min(level + 1, LEVEL_TITLES.length)).map((title, i) => {
              const lv = i + 1; const achieved = level >= lv
              return (
                <div key={lv} className={`flex items-center gap-3 rounded-xl p-2.5 ${lv === level ? 'bg-blue-500/15 border border-blue-500/25' : achieved ? 'bg-white/4' : 'opacity-40'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold ${lv === level ? 'bg-blue-500 text-white' : achieved ? 'bg-white/15 text-white' : 'bg-white/8 text-white/40'}`}>{lv}</div>
                  <span className={`text-sm ${lv === level ? 'text-white font-medium' : 'text-blue-300/60'}`}>{title}</span>
                  {lv === level && <span className="ml-auto text-xs text-blue-400/70">Current</span>}
                  {achieved && lv < level && <CheckCircle2 className="ml-auto w-4 h-4 text-green-400/60" />}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Progress View ────────────────────────────────────────────────────────────
function ProgressView({ stats, currentStreak, longestStreak, onBack, sound }: any) {
  const total = stats.history.reduce((s: number, d: CompletionData) => s + d.completedExercises.length, 0)
  const level = getLevel(stats.xp)

  const getMonthDates = () => {
    const today = new Date()
    const first = new Date(today.getFullYear(), today.getMonth(), 1)
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const dates: (Date | null)[] = Array(first.getDay()).fill(null)
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) dates.push(new Date(d))
    return dates
  }

  return (
    <div className="min-h-screen relative" style={{ background: '#050a14' }}>
      <div className="mesh-bg" />
      <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-blue-300/50 hover:text-white text-sm transition-colors"><ArrowLeft className="w-4 h-4" />Back</button>
          <h1 className="font-display text-xl font-bold text-white">Progress</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Level', value: level, icon: <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />, sub: getLevelTitle(level) },
            { label: 'Streak', value: `${currentStreak}d`, icon: <Flame className="w-5 h-5 text-orange-400" />, sub: 'current' },
            { label: 'Best streak', value: `${longestStreak}d`, icon: <Trophy className="w-5 h-5 text-yellow-400" />, sub: 'all-time' },
            { label: 'Done', value: total, icon: <CheckCircle2 className="w-5 h-5 text-green-400" />, sub: 'exercises' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-1.5">{s.icon}</div>
              <p className="font-display font-bold text-2xl text-white">{s.value}</p>
              <p className="text-xs text-blue-300/35 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" />{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} className="text-center text-xs text-blue-300/25">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {getMonthDates().map((date, i) => {
              if (!date) return <div key={i} />
              const done = stats.history.some((h: CompletionData) => h.date === date.toDateString())
              const isToday = date.toDateString() === new Date().toDateString()
              return <div key={i} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium ${done ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' : isToday ? 'border-2 border-blue-400/60 text-blue-300' : 'bg-white/4 text-blue-300/25'}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : date.getDate()}
              </div>
            })}
          </div>
        </div>

        {/* Milestones */}
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2"><Trophy className="w-4 h-4" />Milestones</h3>
          <div className="grid grid-cols-1 gap-2">
            {MILESTONES.map(m => {
              const done = longestStreak >= m.days
              return (
                <div key={m.days} className={`flex items-center justify-between rounded-xl p-3 border ${done ? 'bg-green-500/8 border-green-500/20' : 'bg-white/4 border-white/8'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{m.icon}</span>
                    <div>
                      <p className={`font-semibold text-sm ${done ? 'text-white' : 'text-blue-300/35'}`}>{m.label}</p>
                      <p className="text-xs text-blue-300/25">{m.days}-day streak</p>
                    </div>
                  </div>
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                    : <span className="text-xs text-blue-300/25">{m.days - longestStreak} more days</span>
                  }
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
