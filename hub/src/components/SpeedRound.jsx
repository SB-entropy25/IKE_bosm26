import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Info, FastForward, Clock, Shield, Trophy } from 'lucide-react'
import { supabase } from '../supabase.js'

export function SpeedRound({ user, soundEnabled, onBack, onLogout }) {
  const [gameState, setGameState] = useState('waiting')
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [result, setResult] = useState(null)
  const [participantCount, setParticipantCount] = useState(0)
  
  const [timer, setTimer] = useState(0)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answer, setAnswer] = useState('')
  const [showInstructions, setShowInstructions] = useState(false)
  
  // New features
  const [avatarName, setAvatarName] = useState(user.name)
  const [isAvatarSet, setIsAvatarSet] = useState(false)
  const [showPlayerLeaderboard, setShowPlayerLeaderboard] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [qLeaderboard, setQLeaderboard] = useState([])

  // Anti-cheat: tab switch tracking
  const [tabSwitchCount, setTabSwitchCount] = useState(0)
  const [isFlagged, setIsFlagged] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const TAB_SWITCH_LIMIT = 3
  const gameStateRef = useRef('waiting')
  const tabSwitchCountRef = useRef(0)
  const qSwitchCountRef = useRef(0)

  const channelRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    // 1. Fetch initial settings and leaderboard
    const fetchInit = async () => {
      const { data: st } = await supabase.from('hub_settings').select('*').eq('id', 1).single()
      if (st) {
        setGameState(st.speed_game_state)
        setShowPlayerLeaderboard(st.show_speed_leaderboard || false)
        if (st.speed_game_state === 'playing' && st.current_question_index >= 0) {
          const { data: q } = await supabase.from('questions').select('*').order('sort_order', { ascending: true })
          if (q && q[st.current_question_index]) {
            setCurrentQuestion(q[st.current_question_index])
            setTimer(0) 
            setHasAnswered(false)
            setResult(null)
          }
        }
      }

      const { data: lb } = await supabase.from('speed_scores').select('*').order('score', { ascending: false })
      if (lb) setLeaderboard(lb)
        
      const { data: usRow } = await supabase.from('speed_scores').select('avatar_name').eq('bits_id', user.bitsId).single()
      if (usRow && usRow.avatar_name) {
          setAvatarName(usRow.avatar_name)
          setIsAvatarSet(true)
      }
    }
    fetchInit()

    // 2. Realtime Subscriptions for DB changes (Settings & Scores)
    const dbSub = supabase.channel('speed-player-db')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speed_scores' }, async () => {
        const { data } = await supabase.from('speed_scores').select('*').order('score', { ascending: false })
        if (data) setLeaderboard(data)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_settings' }, (payload) => {
        if (payload.new && payload.new.show_speed_leaderboard !== undefined) {
          setShowPlayerLeaderboard(payload.new.show_speed_leaderboard)
        }
      })
      .subscribe()

    // 3. Game Room Channel for events
    const channel = supabase.channel('game-room', {
      config: { presence: { key: user.bitsId } }
    })
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setParticipantCount(Object.keys(state).length)
    })

    channel.on('broadcast', { event: 'game_started' }, () => {
      setGameState('playing')
    })
    
    channel.on('broadcast', { event: 'new_question' }, ({ payload }) => {
      setCurrentQuestion(payload)
      setTimer(0)
      setHasAnswered(false)
      setResult(null)
      setAnswer('')
      setQLeaderboard([])
      qSwitchCountRef.current = 0
    })

    channel.on('broadcast', { event: 'answer_result' }, ({ payload }) => {
      if (payload.bitsId === user.bitsId) {
        setResult(payload)
      }
      setQLeaderboard(prev => {
        const next = [...prev, payload]
        return next.sort((a,b) => b.earnedPoints - a.earnedPoints || a.timeElapsed - b.timeElapsed)
      })
    })

    channel.on('broadcast', { event: 'adjust_time' }, ({ payload }) => {
      setCurrentQuestion(prev => {
        if (!prev) return prev
        return { ...prev, time_allotted: Math.max(5, prev.time_allotted + payload.delta) }
      })
    })

    channel.on('broadcast', { event: 'sync_timer' }, ({ payload }) => {
      setTimer(prev => Math.abs(prev - payload.activeTimer) > 1 ? payload.activeTimer : prev)
    })
    
    channel.on('broadcast', { event: 'game_ended' }, () => {
      setGameState('ended')
    })

    channel.on('broadcast', { event: 'admin_action' }, ({ payload }) => {
      if (payload.targetId === user.bitsId) {
        if (payload.action === 'pause') setIsPaused(true)
        else if (payload.action === 'resume') setIsPaused(false)
        else if (payload.action === 'reset_tabs') {
          tabSwitchCountRef.current = 0
          setTabSwitchCount(0)
          setIsFlagged(false)
        } else if (payload.action === 'kick') {
          alert("You have been kicked by the admin.")
          if (onLogout) onLogout()
        } else if (payload.action === 'deduct') {
          alert(`WARNING: The admin has deducted ${payload.amount} points from your score due to multiple tab changes.`)
        } else if (payload.action === 'message') {
          alert(`MESSAGE FROM RACE CONTROL:\n\n${payload.message}`)
        }
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() })
      }
    })

    return () => {
      supabase.removeChannel(dbSub)
      supabase.removeChannel(channel)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [user.bitsId])

  useEffect(() => {
    if (gameState === 'playing' && currentQuestion && !hasAnswered) {
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [gameState, currentQuestion, hasAnswered])

  // Keep gameStateRef in sync so the visibility listener can read it without stale closure
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // Anti-cheat: detect tab/window switching during active game
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && gameStateRef.current === 'playing') {
        tabSwitchCountRef.current += 1
        qSwitchCountRef.current += 1
        const newCount = tabSwitchCountRef.current
        setTabSwitchCount(newCount)
        if (newCount >= TAB_SWITCH_LIMIT) setIsFlagged(true)

        // Broadcast EVERY switch so admin sees live count
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'cheat_flag',
            payload: {
              bitsId: user.bitsId,
              name: user.name,
              avatarName: avatarName,
              switchCount: newCount,
              qSwitchCount: qSwitchCountRef.current,
              flagged: newCount >= TAB_SWITCH_LIMIT,
              reason: `Tab switched ${newCount} time${newCount !== 1 ? 's' : ''} during Speed Round`
            }
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user.bitsId, user.name, avatarName])

  const saveAvatarName = async (e) => {
    e.preventDefault()
    if (!avatarName.trim()) return
    await supabase.from('speed_scores').update({ avatar_name: avatarName.trim() }).eq('bits_id', user.bitsId)
    setIsAvatarSet(true)
  }

  const handleOptionClick = (opt) => {
    if (hasAnswered) return
    setAnswer(opt)
    setHasAnswered(true)
    submitAnswerToAdmin(opt)
  }

  const handleSubmitFill = (e) => {
    e.preventDefault()
    if (hasAnswered || !answer.trim()) return
    setHasAnswered(true)
    submitAnswerToAdmin(answer.trim())
  }

  const handleSkip = () => {
    if (hasAnswered) return
    setAnswer('__SKIP__')
    setHasAnswered(true)
    submitAnswerToAdmin('__SKIP__')
  }

  const submitAnswerToAdmin = (finalAnswer) => {
    channelRef.current.send({
      type: 'broadcast',
      event: 'submit_answer',
      payload: {
        bitsId: user.bitsId,
        name: user.name,
        avatarName: avatarName,
        answer: finalAnswer,
        timeElapsed: timer,
        qSwitchCount: qSwitchCountRef.current
      }
    })
  }

  const optionLabels = ['A', 'B', 'C', 'D']

  const timeRemaining = currentQuestion ? Math.max(0, currentQuestion.time_allotted - timer) : 0
  const isTimeUp = timeRemaining === 0
  const currentPotential = currentQuestion ? Math.max(10, currentQuestion.max_points - (Math.floor(timer / 5) * 5)) : 0

  const getFeedbackText = () => {
    if (!currentQuestion) return ""
    if (isTimeUp && !hasAnswered) return "TIME'S UP!"
    if (answer === '__SKIP__') return "Tactical Skip Active"
    
    const pct = timer / currentQuestion.time_allotted
    if (pct < 0.2) return "Lightning Fast! ⚡"
    if (pct < 0.4) return "Great Speed! 🏁"
    if (pct < 0.7) return "Good Pace! 🏎️"
    return "Answer Locked In!"
  }

  return (
    <div className="fixed inset-0 bg-[#0f1115] flex flex-col z-50 text-gray-100 font-inter h-screen overflow-hidden">
      
      {isPaused && (
        <div className="absolute inset-0 bg-black/90 z-[999] flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <div className="w-10 h-10 bg-red-600 rounded-sm"></div>
          </div>
          <h2 className="text-4xl font-teko font-bold italic tracking-wider text-red-500 mb-4">RACE SUSPENDED</h2>
          <p className="text-xl text-gray-300 max-w-md">
            Your session has been paused by Race Control due to suspicious activity (tab switching). 
          </p>
          <p className="text-gray-500 mt-4">Please wait for admin instructions.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161920] border-b border-[#232730] shadow-sm z-10 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition font-inter font-semibold uppercase tracking-wider">
          <ChevronLeft className="w-4 h-4" /> Exit Speed Round
        </button>
        <div className="text-white font-teko text-2xl tracking-widest font-bold flex items-center gap-3 italic">
          <span className="text-red-600">F1 QUIZ</span> SPEED ROUND
          <button onClick={() => setShowInstructions(true)} className="text-gray-500 hover:text-white transition">
            <Info className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          {participantCount} GRID
        </div>
      </div>

      {/* Anti-cheat warning banner */}
      {gameState === 'playing' && tabSwitchCount > 0 && (
        <div className={`px-4 py-2 text-center text-xs font-bold uppercase tracking-widest shrink-0 ${isFlagged ? 'bg-red-900/80 text-red-200 animate-pulse' : 'bg-amber-900/50 text-amber-300'}`}>
          {isFlagged
            ? `⛔ You have been flagged for suspicious activity (${tabSwitchCount} tab switches). Admin has been notified.`
            : `⚠️ Tab switch detected: ${tabSwitchCount}/${TAB_SWITCH_LIMIT} — Flagged after ${TAB_SWITCH_LIMIT}`}
        </div>
      )}

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1a1d24] border border-[#272b35] rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-3xl font-teko font-bold text-white mb-6 uppercase tracking-widest border-b border-[#272b35] pb-2">Race Rules</h2>
            <ul className="space-y-4 text-gray-400 font-inter text-sm mb-8">
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-red-500 shrink-0" />
                <span><strong className="text-gray-200">Time is Points:</strong> Every 5 seconds, the maximum points for the question drops by 5. Answer quickly!</span>
              </li>
              <li className="flex items-start gap-3">
                <FastForward className="w-5 h-5 text-cyan-500 shrink-0" />
                <span><strong className="text-gray-200">Tactical Skip:</strong> Skip a question within the first 10 seconds to guarantee +5 points and save your streak.</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-500 shrink-0" />
                <span><strong className="text-gray-200">Lock In:</strong> Submit your answer and wait for the grid to finish. The projector reveals the answer.</span>
              </li>
            </ul>
            <button onClick={() => setShowInstructions(false)} className="w-full py-3 bg-[#272b35] hover:bg-[#323844] text-white font-bold rounded-xl uppercase tracking-widest transition">Understood</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center p-4 relative custom-scrollbar">
        
        {gameState === 'waiting' && (
          <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto text-center">
            <div className="flex space-x-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-red-600 opacity-20"></div>
              <div className="w-12 h-12 rounded-full bg-yellow-500 opacity-20"></div>
              <div className="w-12 h-12 rounded-full bg-green-500 animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.3)]"></div>
            </div>
            <h2 className="text-4xl md:text-5xl font-teko font-bold mb-4 text-white uppercase tracking-widest drop-shadow-lg">Waiting for Green Light...</h2>
            
            <div className="bg-amber-900/20 border border-amber-600/50 p-4 rounded-xl mt-4 w-full text-sm font-bold text-amber-400">
              ⚠️ PLEASE DO NOT SWITCH TABS OR MINIMIZE THE WINDOW DURING THE QUIZ. 
              <div className="text-amber-500 font-normal mt-1 text-xs">It will be logged and may result in point deductions or disqualification.</div>
            </div>
            
            <div className="bg-[#1a1d24] w-full mt-6 p-6 rounded-2xl border border-[#272b35] shadow-xl">
              <h3 className="text-gray-300 font-bold uppercase tracking-widest text-sm mb-4">Set Racing Alias (Optional)</h3>
              <p className="text-xs text-gray-500 mb-4">If you want to see your anonymous name on the leaderboard (Be creative in making one!)</p>
              <form onSubmit={saveAvatarName} className="flex gap-2">
                <input 
                  type="text" 
                  maxLength={15}
                  value={avatarName} 
                  onChange={(e) => setAvatarName(e.target.value)}
                  className="flex-1 bg-[#0f1115] border border-[#272b35] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-500 text-sm font-bold tracking-wide"
                  placeholder="e.g. MaxV_1"
                />
                <button 
                  type="submit" 
                  disabled={isAvatarSet && avatarName === user.name}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded-xl text-sm uppercase tracking-wider transition disabled:opacity-50"
                >
                  {isAvatarSet ? 'Saved' : 'Save'}
                </button>
              </form>
            </div>
          </div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="w-full max-w-5xl flex flex-col md:flex-row gap-6 mt-4 md:mt-10">
            
            {/* Action / Result Panel */}
            <div className={`flex-1 bg-[#1a1d24] rounded-3xl shadow-xl p-6 md:p-8 border border-[#272b35] relative flex flex-col ${hasAnswered || isTimeUp ? '' : 'mx-auto max-w-3xl'}`}>
              
              <div className="flex justify-between items-center mb-8 border-b border-[#272b35] pb-4 shrink-0">
                <h2 className="text-lg font-black text-gray-500 uppercase tracking-widest font-teko">Driver: <span className="text-gray-200">{avatarName}</span></h2>
                
                <div className="flex items-center gap-4">
                  {!(hasAnswered || isTimeUp) && (
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest text-right">
                      Max Points:<br/>
                      <span className="text-green-500 text-lg font-teko">{currentPotential} pts</span>
                    </div>
                  )}
                  <div className={`bg-[#0f1115] border-2 px-5 py-1.5 rounded-xl inline-block shadow-sm ${timeRemaining <= 10 ? 'border-red-600/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'border-[#272b35]'}`}>
                    <span className={`text-xl font-mono font-black ${timeRemaining <= 10 ? 'text-red-500' : 'text-cyan-400'}`}>{timeRemaining}s</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-center">
                {(!hasAnswered && !isTimeUp) ? (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <p className="text-gray-400 uppercase tracking-widest font-bold text-xs">Select your answer based on the projector</p>
                      {timer <= 10 && (
                        <button onClick={handleSkip} className="flex items-center gap-2 bg-[#232730] hover:bg-[#2b303b] text-cyan-400 px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-widest border border-[#2b303b] transition shadow-md">
                           <FastForward className="w-3 h-3"/> Skip (+5 pts)
                        </button>
                      )}
                    </div>
                    {currentQuestion.type === 'mcq' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentQuestion.options.map((opt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleOptionClick(opt)}
                            className="flex items-center p-5 bg-[#232730] border-2 border-[#2b303b] rounded-2xl text-left hover:border-red-600/50 group transition-all transform active:scale-[0.98] shadow-md"
                          >
                            <span className="text-2xl font-black text-gray-600 group-hover:text-red-500 mr-4 font-teko">{optionLabels[idx]}</span>
                            <span className="text-lg font-bold text-gray-300 group-hover:text-white break-words">{opt}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitFill} className="flex flex-col items-center w-full">
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Enter exact answer..."
                          className="w-full p-5 border-2 border-[#272b35] bg-[#0f1115] rounded-2xl mb-6 text-xl font-bold text-white focus:outline-none focus:border-red-600/50 text-center uppercase tracking-widest shadow-inner"
                          required
                        />
                        <button type="submit" className="w-full bg-red-600 text-white font-black py-4 rounded-2xl text-xl font-teko hover:bg-red-500 transition-all uppercase tracking-widest transform active:scale-[0.98] shadow-lg">
                          Submit Answer
                        </button>
                      </form>
                    )}
                  </>
                ) : (
                  <div className="text-center pb-4 fade-in flex flex-col items-center justify-center h-full">
                    <p className="text-2xl mb-2 font-bold text-white uppercase tracking-widest font-teko text-gray-300">{getFeedbackText()}</p>
                    
                    {!result ? (
                      <div className="flex flex-col items-center justify-center mt-6">
                         <div className="w-8 h-8 border-4 border-[#272b35] border-t-red-500 rounded-full animate-spin mb-4"></div>
                         <p className="text-gray-500 uppercase tracking-widest font-bold text-xs">Waiting for reveal...</p>
                      </div>
                    ) : (
                      <div className={`mt-6 p-6 rounded-2xl border-2 shadow-xl inline-block w-full max-w-sm ${
                          result.isSkipped ? 'bg-cyan-900/10 border-cyan-500/50 text-cyan-400' :
                          result.isCorrect ? 'bg-green-900/10 border-green-500/50 text-green-400' : 
                          'bg-red-900/10 border-red-600/50 text-red-500'
                      }`}>
                        <p className="font-black text-3xl uppercase tracking-widest mb-1 font-teko">
                          {result.isSkipped ? 'Tactical Skip' : result.isCorrect ? 'Clean Lap!' : 'Engine Stall!'}
                        </p>
                        
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-3 flex flex-col items-center">
                          Scored <span className={`text-4xl my-1 font-teko ${result.isSkipped ? 'text-cyan-400' : result.isCorrect ? 'text-green-400' : 'text-red-500'}`}>{result.earnedPoints}</span> pts 
                          <span className="text-gray-600 mt-2 text-[10px] font-mono">(Reaction: {result.timeElapsed}s)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Live Leaderboard Panel (Conditional) */}
            {(hasAnswered || isTimeUp) && (
              <div className="w-full md:w-80 bg-[#1a1d24] rounded-3xl shadow-xl border border-[#272b35] flex flex-col overflow-hidden fade-in h-[500px] md:h-auto shrink-0">
                <div className="p-5 border-b border-[#272b35] bg-[#161920] flex items-center justify-between">
                  <h3 className="font-teko text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" /> {showPlayerLeaderboard ? 'Overall Standings' : 'Question Results'}
                  </h3>
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                   
                   {showPlayerLeaderboard ? (
                     <>
                       {leaderboard.length === 0 && <p className="text-center text-gray-600 font-bold text-sm mt-4">No drivers</p>}
                       {leaderboard.map((u, idx) => (
                         <div key={u.id || idx} className={`flex justify-between items-center p-3 rounded-xl border ${u.bits_id === user.bitsId ? 'bg-cyan-900/20 border-cyan-800' : 'bg-[#232730] border-[#2b303b]'}`}>
                           <div className="flex items-center gap-3">
                             <span className={`w-5 text-center text-sm font-bold ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-600'}`}>P{idx+1}</span>
                             <span className={`font-bold text-sm truncate max-w-[120px] ${u.bits_id === user.bitsId ? 'text-cyan-400' : 'text-gray-200'}`}>
                               {u.avatar_name || u.name}
                             </span>
                           </div>
                           <span className={`font-black font-teko text-lg ${u.bits_id === user.bitsId ? 'text-cyan-400' : 'text-gray-400'}`}>{u.score}</span>
                         </div>
                       ))}
                     </>
                   ) : (
                     <>
                       {qLeaderboard.length === 0 && <p className="text-center text-gray-600 font-bold text-sm mt-4">Waiting for others...</p>}
                       {qLeaderboard.map((u, idx) => (
                         <div key={u.bitsId || idx} className={`flex flex-col p-3 rounded-xl border ${u.bitsId === user.bitsId ? 'bg-cyan-900/20 border-cyan-800' : 'bg-[#232730] border-[#2b303b]'}`}>
                           <div className="flex justify-between items-center mb-1">
                             <div className="flex items-center gap-2">
                               <span className={`w-5 text-center text-sm font-bold ${u.isCorrect ? 'text-green-500' : u.isSkipped ? 'text-cyan-500' : 'text-red-500'}`}>{u.isSkipped ? '-' : idx+1}</span>
                               <span className={`font-bold text-sm truncate max-w-[100px] ${u.bitsId === user.bitsId ? 'text-cyan-400' : 'text-gray-200'}`}>
                                 {u.avatarName || u.name}
                               </span>
                             </div>
                             <span className={`font-black font-teko text-lg ${u.isCorrect ? 'text-green-400' : u.isSkipped ? 'text-cyan-400' : 'text-red-600'}`}>+{u.earnedPoints}</span>
                           </div>
                           <div className="text-[10px] text-gray-500 text-right font-mono">{u.timeElapsed}s</div>
                         </div>
                       ))}
                     </>
                   )}
                </div>
              </div>
            )}

          </div>
        )}

        {gameState === 'ended' && (
          <div className="flex flex-col items-center justify-center h-full text-center fade-in">
             <h2 className="text-6xl font-teko font-black mb-4 text-white uppercase tracking-widest italic">Race Finished!</h2>
             <p className="text-xl text-gray-500 uppercase tracking-widest font-bold">Check the projector for the final podium!</p>
          </div>
        )}

      </div>
    </div>
  )
}
