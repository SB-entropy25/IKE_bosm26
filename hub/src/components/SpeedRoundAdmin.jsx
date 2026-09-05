import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Edit3, Settings, Play, Save, Check, X, Clock, Database, Users, Monitor, UserX, Plus, Minus, List } from 'lucide-react'
import { supabase } from '../supabase.js'

export function SpeedRoundAdmin({ onBack }) {
  const [gameState, setGameState] = useState('waiting')
  const [leaderboard, setLeaderboard] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
  
  const [activeTab, setActiveTab] = useState('control') // 'control', 'questions', 'roster'
  const [editingQuestion, setEditingQuestion] = useState(null)
  
  const [showPlayerLeaderboard, setShowPlayerLeaderboard] = useState(false)
  const [projectorView, setProjectorView] = useState('question') // 'question', 'q_leaderboard', 'overall'

  const [activeTimer, setActiveTimer] = useState(0)
  const [qLeaderboard, setQLeaderboard] = useState([])
  const [flaggedPlayers, setFlaggedPlayers] = useState([]) // anti-cheat
  const [pausedPlayers, setPausedPlayers] = useState(new Set()) // tracking paused state
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false)

  const qIndexRef = useRef(-1)
  const questionsRef = useRef([])
  const channelRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    qIndexRef.current = currentQuestionIndex
    questionsRef.current = questions
  }, [currentQuestionIndex, questions])

  const fetchQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('sort_order', { ascending: true })
    if (data) setQuestions(data)
  }

  const fetchLB = async () => {
    const { data } = await supabase.from('speed_scores').select('*').order('score', { ascending: false })
    if (data) setLeaderboard(data)
  }

  useEffect(() => {
    fetchQuestions()
    fetchLB()

    supabase.from('hub_settings').select('show_speed_leaderboard').single().then(({ data }) => {
      if (data && data.show_speed_leaderboard !== undefined) {
        setShowPlayerLeaderboard(data.show_speed_leaderboard)
      }
    })

    const dbSub = supabase.channel('speed-scores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speed_scores' }, async () => {
        fetchLB()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_settings' }, (payload) => {
        if (payload.new && payload.new.show_speed_leaderboard !== undefined) {
          setShowPlayerLeaderboard(payload.new.show_speed_leaderboard)
        }
      })
      .subscribe()

    const channel = supabase.channel('game-room')
    channelRef.current = channel

    channel.on('broadcast', { event: 'submit_answer' }, async ({ payload }) => {
      const qIndex = qIndexRef.current
      const qList = questionsRef.current
      if (qIndex < 0 || qIndex >= qList.length) return
      
      const { bitsId, name, avatarName, answer, timeElapsed } = payload
      const currentQ = qList[qIndex]
      
      let isCorrect = false
      let earnedPoints = 0
      let isSkipped = answer === '__SKIP__'

      if (isSkipped) {
        if (timeElapsed <= 10) earnedPoints = 5
        else earnedPoints = 0
      } else {
        if (currentQ.type === 'mcq') {
          isCorrect = answer === currentQ.correct_answer
        } else {
          isCorrect = answer.toString().trim().toLowerCase() === currentQ.correct_answer.toLowerCase()
        }

        if (isCorrect) {
          const penalties = Math.floor(timeElapsed / 5) 
          earnedPoints = Math.max(10, currentQ.max_points - (penalties * 5)) 
        }
      }

      if (earnedPoints > 0) {
        const { data: userRow } = await supabase.from('speed_scores').select('score').eq('bits_id', bitsId).single()
        if (userRow) {
          await supabase.from('speed_scores').update({ score: userRow.score + earnedPoints }).eq('bits_id', bitsId)
        }
      }

      const resultPayload = { bitsId, name, avatarName, isCorrect, earnedPoints, timeElapsed, isSkipped }
      
      setQLeaderboard(prev => {
        const next = [...prev, resultPayload]
        return next.sort((a,b) => b.earnedPoints - a.earnedPoints || a.timeElapsed - b.timeElapsed)
      })

      channel.send({
        type: 'broadcast',
        event: 'answer_result',
        payload: resultPayload
      })
    })

    // Anti-cheat: receive flags from players
    channel.on('broadcast', { event: 'cheat_flag' }, ({ payload }) => {
      setFlaggedPlayers(prev => {
        const exists = prev.find(p => p.bitsId === payload.bitsId)
        if (exists) {
          return prev.map(p => p.bitsId === payload.bitsId ? { ...p, ...payload } : p)
        }
        return [...prev, payload]
      })
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(dbSub)
      supabase.removeChannel(channel)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (gameState === 'playing' && currentQuestionIndex >= 0) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setActiveTimer(prev => {
          const next = prev + 1
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'sync_timer',
              payload: { activeTimer: next }
            }).catch(() => {})
          }
          return next
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [gameState, currentQuestionIndex])

  const handleStartGame = () => {
    if(!confirm("This will reset all speed round scores to 0. Continue?")) return;
    
    supabase.from('speed_scores').update({ score: 0 }).neq('bits_id', '').then(() => {
      setGameState('playing')
      setCurrentQuestionIndex(0)
      setActiveTimer(0)
      setQLeaderboard([])
      setFlaggedPlayers(prev => prev.map(p => ({ ...p, qSwitchCount: 0 })))
      setProjectorView('question')
      supabase.from('hub_settings').update({ speed_game_state: 'playing', current_question_index: 0 }).eq('id', 1)
      channelRef.current.send({ type: 'broadcast', event: 'game_started' })
      
      if (questions.length > 0) {
        const q = questions[0]
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_question',
          payload: { id: q.id, type: q.type, text: q.text, options: q.options, max_points: q.max_points, time_allotted: q.time_allotted }
        })
      }
    })
  }

  const handleNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1
    if (nextIdx < questions.length) {
      setCurrentQuestionIndex(nextIdx)
      setActiveTimer(0)
      setQLeaderboard([])
      setFlaggedPlayers(prev => prev.map(p => ({ 
        ...p, 
        history: [...(p.history || []), p.qSwitchCount || 0].slice(-3),
        qSwitchCount: 0 
      })))
      setProjectorView('question')
      supabase.from('hub_settings').update({ current_question_index: nextIdx }).eq('id', 1)
      const q = questions[nextIdx]
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_question',
        payload: { id: q.id, type: q.type, text: q.text, options: q.options, max_points: q.max_points, time_allotted: q.time_allotted }
      })
    } else {
      setGameState('ended')
      setProjectorView('overall')
      supabase.from('hub_settings').update({ speed_game_state: 'ended' }).eq('id', 1)
      channelRef.current.send({ type: 'broadcast', event: 'game_ended' })
    }
  }

  const togglePlayerLeaderboard = async () => {
    const newVal = !showPlayerLeaderboard
    setShowPlayerLeaderboard(newVal)
    await supabase.from('hub_settings').update({ show_speed_leaderboard: newVal }).eq('id', 1)
  }

  const adjustTime = (delta) => {
    if (currentQuestionIndex < 0) return
    const newQs = [...questions]
    newQs[currentQuestionIndex].time_allotted = Math.max(5, newQs[currentQuestionIndex].time_allotted + delta)
    setQuestions(newQs)
    channelRef.current.send({
      type: 'broadcast',
      event: 'adjust_time',
      payload: { delta }
    })
  }

  const deleteDriver = async (bitsId) => {
    if (confirm(`Remove driver ${bitsId}? This will delete their registration and scores.`)) {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'admin_action',
          payload: { targetId: bitsId, action: 'kick' }
        })
      }
      await supabase.from('speed_scores').delete().eq('bits_id', bitsId)
      await supabase.from('hub_users').delete().eq('bits_id', bitsId)
      fetchLB()
    }
  }

  const togglePausePlayer = (bitsId) => {
    const isCurrentlyPaused = pausedPlayers.has(bitsId)
    setPausedPlayers(prev => {
      const next = new Set(prev)
      if (isCurrentlyPaused) next.delete(bitsId)
      else next.add(bitsId)
      return next
    })

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_action',
        payload: {
          targetId: bitsId,
          action: isCurrentlyPaused ? 'resume' : 'pause'
        }
      })
    }
  }

  const resetTabCount = (bitsId) => {
    setFlaggedPlayers(prev => prev.filter(p => p.bitsId !== bitsId))
    if (pausedPlayers.has(bitsId)) {
      togglePausePlayer(bitsId) // auto-resume if paused
    }
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_action',
        payload: {
          targetId: bitsId,
          action: 'reset_tabs'
        }
      })
    }
  }

  const deductScore = async (bitsId, currentScore, amount = 10) => {
    const newScore = Math.max(0, currentScore - amount)
    await supabase.from('speed_scores').update({ score: newScore }).eq('bits_id', bitsId)
    fetchLB()
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'admin_action',
        payload: { targetId: bitsId, action: 'deduct', amount }
      })
    }
  }

  const handleSendMessage = (bitsId) => {
    const msg = window.prompt(`Enter message to send to driver ${bitsId}:`)
    if (msg) {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'admin_action',
          payload: { targetId: bitsId, action: 'message', message: msg }
        })
      }
    }
  }

  const saveQuestion = async (e) => {
    e.preventDefault()
    if (!editingQuestion) return
    
    if (editingQuestion.id) {
      const { error } = await supabase.from('questions').update({
        text: editingQuestion.text,
        time_allotted: editingQuestion.time_allotted,
        max_points: editingQuestion.max_points,
        options: editingQuestion.options,
        correct_answer: editingQuestion.correct_answer
      }).eq('id', editingQuestion.id)

      if (!error) {
        await fetchQuestions()
        setEditingQuestion(null)
      } else {
        alert('Error updating question')
      }
    } else {
      const { error } = await supabase.from('questions').insert({
        type: editingQuestion.type,
        text: editingQuestion.text,
        time_allotted: editingQuestion.time_allotted,
        max_points: editingQuestion.max_points,
        options: editingQuestion.options,
        correct_answer: editingQuestion.correct_answer
      })

      if (!error) {
        await fetchQuestions()
        setEditingQuestion(null)
      } else {
        alert('Error creating question')
      }
    }
  }

  const createNewQuestion = () => {
    setEditingQuestion({
      id: null,
      type: 'mcq',
      text: 'New Question Text',
      time_allotted: 15,
      max_points: 100,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_answer: 'Option A'
    })
  }

  const currentQ = questions[currentQuestionIndex]
  const timeRemaining = currentQ ? Math.max(0, currentQ.time_allotted - activeTimer) : 0
  const enhancedLeaderboard = leaderboard.map(user => {
    const flagData = flaggedPlayers.find(p => p.bitsId === user.bits_id)
    const qStats = qLeaderboard.find(q => q.bitsId === user.bits_id)
    return {
      ...user,
      switchCount: flagData?.switchCount || 0,
      isFlagged: flagData?.flagged || false,
      reason: flagData?.reason || '',
      history: flagData?.history || [],
      qSwitchCount: flagData?.qSwitchCount || qStats?.qSwitchCount || 0,
      qEarnedPoints: qStats?.earnedPoints || 0
    }
  }).sort((a, b) => {
    if (a.isFlagged && !b.isFlagged) return -1
    if (!a.isFlagged && b.isFlagged) return 1
    return b.switchCount - a.switchCount || b.score - a.score
  }).filter(u => showOnlyFlagged ? u.switchCount > 0 : true)

  const handleCustomDeduct = (bitsId, currentScore) => {
    const amtStr = window.prompt("Enter points to deduct for this user:", "10")
    if (amtStr === null) return
    const amt = parseInt(amtStr)
    if (!isNaN(amt) && amt > 0) {
      deductScore(bitsId, currentScore, amt)
    }
  }

  return (
    <div className="fixed inset-0 bg-[#0f1115] flex flex-col z-50 font-inter text-gray-100 h-screen overflow-hidden">
      
      {/* ── Navbar ── */}
      <div className="flex justify-between items-center px-6 py-4 bg-[#161920] border-b border-[#232730] shadow-sm shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-[#232730] hover:bg-[#2b303b] rounded-lg text-gray-300 transition">
                <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
              F1 QUIZ <span className="px-2 py-1 bg-red-600/10 text-red-500 rounded-md text-sm border border-red-900/30">ADMIN PORTAL</span>
            </h1>
        </div>
        <div className="flex gap-2 lg:gap-4 overflow-x-auto">
          <button onClick={() => setActiveTab('control')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${activeTab === 'control' ? 'bg-red-600 text-white' : 'bg-[#232730] text-gray-400 hover:text-white'}`}>
            <Play className="w-4 h-4"/> Race Control
          </button>
          <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${activeTab === 'questions' ? 'bg-cyan-600 text-white' : 'bg-[#232730] text-gray-400 hover:text-white'}`}>
            <Database className="w-4 h-4"/> Question Manager
          </button>
          <button onClick={() => setActiveTab('roster')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${activeTab === 'roster' ? 'bg-purple-600 text-white' : 'bg-[#232730] text-gray-400 hover:text-white'}`}>
            <Users className="w-4 h-4"/> Grid Roster
          </button>
        </div>
      </div>
      
      {/* ── Main Workspace ── */}
      <div className="flex-1 overflow-auto p-6">
        
        {/* =========================================
             RACE CONTROL TAB
        ============================================= */}
        {activeTab === 'control' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full">
            
            {/* Left Col: Controls & Grid */}
            <div className="xl:col-span-1 flex flex-col gap-6 h-full">
              
              {/* Ignition Panel */}
              <div className="bg-[#1a1d24] p-5 rounded-2xl border border-[#272b35] shadow-lg shrink-0">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Ignition Sequence</h2>
                <div className="space-y-3">
                  <button onClick={handleStartGame} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                    Start Race (Reset Scores)
                  </button>
                  <button 
                    onClick={handleNextQuestion}
                    disabled={gameState !== 'playing'}
                    className="w-full bg-[#272b35] hover:bg-[#323844] text-white font-bold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Push Next Question
                  </button>
                </div>
                
                {gameState === 'playing' && currentQ && (
                  <>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-6 mb-3">Live Timer Control</h2>
                    <div className="flex items-center gap-3">
                      <button onClick={() => adjustTime(-5)} className="p-3 bg-[#232730] hover:bg-red-900/50 text-red-400 rounded-xl transition"><Minus className="w-5 h-5"/></button>
                      <div className={`flex-1 text-center border py-2 rounded-xl font-mono font-bold ${timeRemaining === 0 ? 'bg-red-900/50 border-red-500 text-red-500 animate-pulse text-lg' : 'bg-[#0f1115] border-[#272b35] text-cyan-400 text-xl'}`}>
                        {timeRemaining === 0 ? "TIME'S UP!" : `${timeRemaining}s`}
                      </div>
                      <button onClick={() => adjustTime(5)} className="p-3 bg-[#232730] hover:bg-green-900/50 text-green-400 rounded-xl transition"><Plus className="w-5 h-5"/></button>
                    </div>
                    <div className="mt-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[#0f1115] border border-[#272b35] py-1.5 rounded-lg">
                      Current Points Worth: <span className="text-yellow-400 text-sm ml-1">{Math.max(10, currentQ.max_points - (Math.floor(activeTimer / 5) * 5))}</span>
                    </div>
                  </>
                )}

                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-6 mb-4">Display Controls</h2>
                <div className="space-y-3">
                  {/* Players DB Toggle */}
                  <div className="bg-[#0f1115] border border-[#272b35] rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center justify-between">
                      Players See After Submit:
                    </p>
                    <button 
                      onClick={togglePlayerLeaderboard}
                      className={`w-full py-2 px-3 rounded-lg text-sm font-bold transition ${showPlayerLeaderboard ? 'bg-cyan-600 text-white shadow-lg' : 'bg-[#232730] text-gray-400'}`}
                    >
                      {showPlayerLeaderboard ? 'OVERALL Leaderboard' : 'QUESTION Leaderboard'}
                    </button>
                  </div>
                  
                  {/* Projector Toggle */}
                  <div className="bg-[#0f1115] border border-[#272b35] rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2">Projector Shows:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setProjectorView('question')} className={`py-2 rounded-lg text-xs font-bold transition ${projectorView === 'question' ? 'bg-red-600 text-white' : 'bg-[#232730] text-gray-400'}`}>Q. Text</button>
                      <button onClick={() => setProjectorView('q_leaderboard')} className={`py-2 rounded-lg text-xs font-bold transition ${projectorView === 'q_leaderboard' ? 'bg-purple-600 text-white' : 'bg-[#232730] text-gray-400'}`}>Q. LB</button>
                      <button onClick={() => setProjectorView('overall')} className={`py-2 rounded-lg text-xs font-bold transition ${projectorView === 'overall' ? 'bg-cyan-600 text-white' : 'bg-[#232730] text-gray-400'}`}>Overall</button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#272b35] flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold">Status:</span>
                  <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wide ${gameState === 'playing' ? 'bg-green-500/20 text-green-400' : 'bg-[#272b35] text-gray-400'}`}>
                    {gameState} {gameState === 'playing' && `(Q${currentQuestionIndex + 1}/${questions.length})`}
                  </span>
                </div>
              </div>
              
              {/* Upcoming Questions Mini List */}
              <div className="flex-1 bg-[#1a1d24] p-5 rounded-2xl border border-[#272b35] shadow-lg flex flex-col min-h-0">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><List className="w-4 h-4"/> Upcoming</h2>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {questions.slice(currentQuestionIndex + 1).map((q, idx) => (
                    <div key={q.id} className="p-3 bg-[#232730] rounded-xl border border-[#2b303b] opacity-80">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-bold text-gray-500">Q{currentQuestionIndex + 2 + idx}</span>
                        <span className="text-[10px] font-mono text-cyan-600">{q.time_allotted}s</span>
                      </div>
                      <p className="text-xs text-gray-300 font-semibold line-clamp-2">{q.text}</p>
                    </div>
                  ))}
                  {questions.length > 0 && currentQuestionIndex >= questions.length - 1 && (
                    <p className="text-gray-600 text-center text-xs font-bold mt-4">No more questions.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: Projector Preview */}
            <div className="xl:col-span-3 bg-[#1a1d24] p-8 rounded-2xl border border-[#272b35] shadow-lg flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-end mb-8 border-b border-[#272b35] pb-4 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-wide">Projector Preview</h2>
                  <p className="text-sm text-gray-400 mt-1">What the audience sees on the main screen</p>
                </div>
                {gameState === 'playing' && currentQuestionIndex >= 0 && (
                  <div className="flex gap-4">
                    <div className="bg-[#232730] px-4 py-2 rounded-xl flex flex-col items-center border border-[#2b303b]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Time Remaining</span>
                      <span className={`font-bold font-mono ${timeRemaining === 0 ? 'text-red-500 animate-pulse text-sm' : timeRemaining <= 10 ? 'text-red-500 animate-pulse text-lg' : 'text-cyan-400 text-lg'}`}>
                        {timeRemaining === 0 ? "TIME'S UP" : `${timeRemaining}s`}
                      </span>
                    </div>
                    <div className="bg-[#232730] px-4 py-2 rounded-xl flex flex-col items-center border border-[#2b303b]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Submissions</span>
                      <span className="text-lg font-bold text-purple-400">{qLeaderboard.length}/{leaderboard.length}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 flex flex-col justify-start pt-12 items-center w-full overflow-y-auto">
                
                {projectorView === 'overall' ? (
                  <div className="w-full max-w-4xl h-full flex flex-col fade-in">
                     <h3 className="text-4xl md:text-5xl font-teko font-black mb-8 text-white uppercase tracking-widest text-center italic">Overall Standings</h3>
                     <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                       {leaderboard.length === 0 && <p className="text-gray-600 font-bold uppercase tracking-widest text-center mt-10 text-2xl">Grid Empty</p>}
                       {leaderboard.map((u, idx) => (
                         <div key={u.id || idx} className="flex justify-between items-center p-5 bg-[#232730] rounded-2xl border border-[#2b303b] shadow-xl">
                           <div className="flex items-center gap-6">
                             <span className={`text-4xl font-teko font-black w-12 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-500'}`}>P{idx+1}</span>
                             <div className="flex flex-col">
                               <span className="font-black text-2xl text-white uppercase tracking-wider">{u.avatar_name || u.name}</span>
                             </div>
                           </div>
                           <span className="text-cyan-400 font-black text-5xl font-teko">{u.score}</span>
                         </div>
                       ))}
                     </div>
                  </div>
                ) : projectorView === 'q_leaderboard' ? (
                  <div className="w-full max-w-4xl h-full flex flex-col fade-in">
                     <h3 className="text-4xl md:text-5xl font-teko font-black mb-2 text-purple-400 uppercase tracking-widest text-center italic">Question {currentQuestionIndex + 1} Results</h3>
                     <p className="text-center text-gray-400 mb-8 font-bold">{currentQ?.text}</p>
                     <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                       {qLeaderboard.length === 0 && <p className="text-gray-600 font-bold uppercase tracking-widest text-center mt-10 text-2xl">Waiting for answers...</p>}
                       {qLeaderboard.map((u, idx) => (
                         <div key={u.bitsId || idx} className={`flex justify-between items-center p-5 rounded-2xl border shadow-xl ${u.isCorrect ? 'bg-green-900/20 border-green-800' : u.isSkipped ? 'bg-cyan-900/20 border-cyan-800' : 'bg-red-900/20 border-red-900'}`}>
                           <div className="flex items-center gap-6">
                             <span className={`text-3xl font-teko font-black w-12 text-center ${u.isCorrect ? 'text-green-500' : u.isSkipped ? 'text-cyan-500' : 'text-red-500'}`}>
                               {u.isSkipped ? 'SKIP' : idx+1}
                             </span>
                             <div className="flex flex-col">
                               <span className="font-black text-2xl text-white uppercase tracking-wider">{u.avatarName || u.name}</span>
                               <span className="text-sm text-gray-400">{u.timeElapsed}s reaction</span>
                             </div>
                           </div>
                           <span className={`font-black text-4xl font-teko ${u.isCorrect ? 'text-green-400' : u.isSkipped ? 'text-cyan-400' : 'text-red-600'}`}>+{u.earnedPoints}</span>
                         </div>
                       ))}
                     </div>
                  </div>
                ) : gameState === 'playing' && currentQuestionIndex >= 0 ? (
                   <div className="text-center w-full max-w-4xl">
                      <h3 className="text-3xl md:text-4xl font-bold mb-12 text-white leading-tight">{currentQ.text}</h3>
                      {currentQ.type === 'mcq' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                           {currentQ.options.map((opt, i) => {
                             const isCorrect = currentQ.correct_answer === opt
                             return (
                               <div key={i} className={`p-5 border-2 rounded-2xl text-xl font-bold flex items-center ${isCorrect ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-[#2b303b] bg-[#232730] text-gray-300'}`}>
                                  <span className="w-8 h-8 rounded-full bg-[#161920] flex items-center justify-center text-sm text-gray-500 mr-4">{'ABCD'[i]}</span> 
                                  {opt}
                               </div>
                             )
                           })}
                        </div>
                      )}
                      {currentQ.type === 'fill' && (
                        <div className="p-6 border-2 border-green-500/50 bg-green-500/10 rounded-2xl text-2xl font-bold text-green-400 inline-block">
                          Exact Answer: {currentQ.correct_answer}
                        </div>
                      )}
                   </div>
                ) : (
                   <div className="text-gray-600 font-bold text-xl uppercase tracking-widest flex flex-col items-center">
                      <Database className="w-16 h-16 mb-4 opacity-20" />
                      No active question
                   </div>
                )}
              </div>
            </div>
            
          </div>
        )}

        {/* =========================================
             ROSTER TAB
        ============================================= */}
        {activeTab === 'roster' && (
           <div className="h-full bg-[#1a1d24] border border-[#272b35] rounded-2xl shadow-lg flex flex-col">
             <div className="p-6 border-b border-[#272b35] bg-[#161920] flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-white text-lg">Grid Roster</h2>
                  <p className="text-sm text-gray-400">Manage all registered drivers.</p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setShowOnlyFlagged(!showOnlyFlagged)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition ${showOnlyFlagged ? 'bg-red-600 text-white' : 'bg-[#232730] text-gray-400 hover:text-white border border-[#2b303b]'}`}
                  >
                    {showOnlyFlagged ? 'Showing Flagged' : 'Show Flagged'}
                  </button>
                  <div className="bg-[#232730] px-4 py-2 rounded-xl border border-[#2b303b]">
                    <span className="text-xs text-gray-500 font-bold uppercase">Total Drivers:</span>
                    <span className="ml-2 font-bold text-white">{leaderboard.length}</span>
                  </div>
                </div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {enhancedLeaderboard.map((u) => {
                    const isPaused = pausedPlayers.has(u.bits_id)
                    return (
                    <div key={u.id} className={`bg-[#232730] border ${u.isFlagged ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : isPaused ? 'border-amber-500' : 'border-[#2b303b]'} rounded-xl p-4 flex flex-col`}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-2">
                            {u.name}
                            {u.isFlagged && <span className="text-[10px] bg-red-600 px-1.5 py-0.5 rounded text-white uppercase font-bold tracking-wider">Flagged</span>}
                            {isPaused && <span className="text-[10px] bg-amber-600 px-1.5 py-0.5 rounded text-white uppercase font-bold tracking-wider">Paused</span>}
                          </span>
                          <span className="text-xs text-gray-500 font-mono">{u.bits_id}</span>
                        </div>
                        <button 
                          onClick={() => deleteDriver(u.bits_id)}
                          className="p-1.5 bg-red-900/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition"
                          title="Remove Driver"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Alias:</span> <span className="text-cyan-400 font-bold">{u.avatar_name || 'Not set'}</span>
                      </div>
                      <div className="text-sm mt-1 flex justify-between items-center">
                        <div>
                          <span className="text-gray-500 font-bold uppercase text-[10px]">Score:</span> <span className="text-green-400 font-bold">{u.score}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-bold uppercase text-[10px]">Switches:</span> <span className={`font-bold ${u.switchCount >= 3 ? 'text-red-500' : u.switchCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{u.switchCount}</span>
                        </div>
                      </div>

                      {currentQuestionIndex >= 0 && (
                        <div className="text-sm mt-1 flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5">
                          <div>
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Q{currentQuestionIndex+1} Pts:</span> <span className="text-purple-400 font-bold">+{u.qEarnedPoints}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Q{currentQuestionIndex+1} Flags:</span> <span className={`font-bold ${u.qSwitchCount > 0 ? 'text-amber-500' : 'text-gray-400'}`}>{u.qSwitchCount}</span>
                          </div>
                        </div>
                      )}
                      
                      {u.history && u.history.length > 0 && (
                        <div className="text-[10px] text-gray-500 font-bold uppercase mt-2 flex justify-between items-center bg-black/20 px-2 py-1 rounded">
                          <span>Past Q Flags:</span>
                          <span className="flex gap-1">{u.history.map((h, i) => <span key={i} className={`px-1.5 py-0.5 rounded ${h > 0 ? 'bg-amber-900/50 text-amber-500' : 'bg-[#1a1d24]'}`}>{h}</span>)}</span>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="mt-3 pt-3 border-t border-[#2b303b] grid grid-cols-2 gap-2">
                        <button 
                          onClick={() => togglePausePlayer(u.bits_id)}
                          className={`text-xs py-1.5 rounded font-bold uppercase tracking-wider transition ${isPaused ? 'bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white' : 'bg-[#2b303b] text-gray-400 hover:bg-amber-600 hover:text-white'}`}
                        >
                          {isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button 
                          onClick={() => handleCustomDeduct(u.bits_id, u.score)}
                          className="text-xs py-1.5 bg-[#2b303b] text-gray-400 hover:bg-orange-600 hover:text-white rounded font-bold uppercase tracking-wider transition"
                        >
                          Deduct
                        </button>
                        <button 
                          onClick={() => handleSendMessage(u.bits_id)}
                          className="text-xs py-1.5 bg-[#2b303b] text-gray-400 hover:bg-cyan-600 hover:text-white rounded font-bold uppercase tracking-wider transition"
                        >
                          Message
                        </button>
                        <button 
                          onClick={() => resetTabCount(u.bits_id)}
                          disabled={u.switchCount === 0}
                          className="text-xs py-1.5 bg-[#2b303b] text-gray-400 hover:bg-blue-600 hover:text-white disabled:opacity-50 disabled:hover:bg-[#2b303b] disabled:hover:text-gray-400 rounded font-bold uppercase tracking-wider transition"
                        >
                          Reset Tab
                        </button>
                      </div>
                    </div>
                  )})}
                  {enhancedLeaderboard.length === 0 && <p className="text-gray-500 col-span-full text-center py-10 font-bold">No drivers registered yet.</p>}
                </div>
             </div>
           </div>
        )}

        {/* =========================================
             QUESTION MANAGER TAB
        ============================================= */}
        {activeTab === 'questions' && (
          <div className="flex gap-6 h-full">
            
            {/* List */}
            <div className="w-1/3 bg-[#1a1d24] border border-[#272b35] rounded-2xl shadow-lg flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#272b35] bg-[#161920] flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-white">Database</h2>
                  <p className="text-xs text-gray-500">Select a question to edit settings.</p>
                </div>
                <button 
                  onClick={createNewQuestion}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded-lg text-xs font-bold text-white transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {questions.map((q, i) => (
                  <button 
                    key={q.id}
                    onClick={() => setEditingQuestion(JSON.parse(JSON.stringify(q)))}
                    className={`w-full text-left p-4 rounded-xl border transition ${editingQuestion?.id === q.id ? 'bg-cyan-900/20 border-cyan-700' : 'bg-[#232730] border-[#2b303b] hover:border-[#404655]'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-gray-500">Q{i + 1} • {q.type.toUpperCase()}</span>
                      <span className="text-xs font-mono text-cyan-500">{q.time_allotted}s</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-200 line-clamp-2">{q.text}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 bg-[#1a1d24] border border-[#272b35] rounded-2xl shadow-lg flex flex-col overflow-hidden">
              {editingQuestion ? (
                <form onSubmit={saveQuestion} className="flex flex-col h-full">
                  <div className="p-6 border-b border-[#272b35] flex justify-between items-center bg-[#161920]">
                    <h2 className="font-bold text-white text-lg flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-cyan-500" /> {editingQuestion.id ? `Edit Question ID: ${editingQuestion.id}` : 'Create New Question'}
                    </h2>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setEditingQuestion(null)} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:bg-[#272b35]">Cancel</button>
                      <button type="submit" className="px-4 py-2 rounded-lg text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-2">
                        <Save className="w-4 h-4"/> Save Changes
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-8 flex-1 overflow-y-auto space-y-8">
                    {/* Question Text */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Question Text</label>
                      <textarea 
                        value={editingQuestion.text}
                        onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})}
                        className="w-full bg-[#0f1115] border border-[#272b35] rounded-xl p-4 text-white focus:border-cyan-500 focus:outline-none min-h-[100px]"
                        required
                      />
                    </div>

                    {/* Settings Row */}
                    <div className="flex gap-6">
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Time Allotted (sec)</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                          <input 
                            type="number"
                            value={editingQuestion.time_allotted}
                            onChange={e => setEditingQuestion({...editingQuestion, time_allotted: parseInt(e.target.value) || 0})}
                            className="w-full bg-[#0f1115] border border-[#272b35] rounded-xl py-3 pl-10 pr-4 text-white focus:border-cyan-500 focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Max Points</label>
                        <input 
                          type="number"
                          value={editingQuestion.max_points}
                          onChange={e => setEditingQuestion({...editingQuestion, max_points: parseInt(e.target.value) || 0})}
                          className="w-full bg-[#0f1115] border border-[#272b35] rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* MCQ Options */}
                    {editingQuestion.type === 'mcq' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Options & Correct Answer</label>
                        <div className="space-y-3">
                          {editingQuestion.options.map((opt, idx) => (
                            <div key={idx} className="flex gap-3 items-center">
                              <button 
                                type="button"
                                onClick={() => setEditingQuestion({...editingQuestion, correct_answer: opt})}
                                className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center border-2 transition ${editingQuestion.correct_answer === opt ? 'bg-green-500 border-green-500 text-black' : 'border-[#272b35] text-gray-500 hover:border-gray-400'}`}
                              >
                                {editingQuestion.correct_answer === opt ? <Check className="w-5 h-5" /> : 'ABCD'[idx]}
                              </button>
                              <input 
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...editingQuestion.options]
                                  newOpts[idx] = e.target.value
                                  // Auto-update correct_answer if the changed option WAS the correct one
                                  const newCorrect = editingQuestion.correct_answer === opt ? e.target.value : editingQuestion.correct_answer
                                  setEditingQuestion({...editingQuestion, options: newOpts, correct_answer: newCorrect})
                                }}
                                className={`flex-1 bg-[#0f1115] border rounded-xl p-3 text-white focus:outline-none ${editingQuestion.correct_answer === opt ? 'border-green-500/50' : 'border-[#272b35] focus:border-cyan-500'}`}
                                required
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fill Options */}
                    {editingQuestion.type === 'fill' && (
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Exact Correct Answer</label>
                        <input 
                          type="text"
                          value={editingQuestion.correct_answer}
                          onChange={e => setEditingQuestion({...editingQuestion, correct_answer: e.target.value})}
                          className="w-full bg-[#0f1115] border border-green-500/50 rounded-xl p-4 text-green-400 font-bold focus:border-green-400 focus:outline-none"
                          required
                        />
                      </div>
                    )}
                  </div>
                </form>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <Database className="w-16 h-16 mb-4 opacity-20" />
                  <p className="font-bold">Select a question from the database to edit</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
