import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Edit3, Settings, Play, Save, Check, X, Clock, Database } from 'lucide-react'
import { supabase } from '../supabase.js'

export function SpeedRoundAdmin({ onBack }) {
  const [gameState, setGameState] = useState('waiting')
  const [leaderboard, setLeaderboard] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1)
  
  const [activeTab, setActiveTab] = useState('control') // 'control', 'questions'
  const [editingQuestion, setEditingQuestion] = useState(null)

  const qIndexRef = useRef(-1)
  const questionsRef = useRef([])
  const channelRef = useRef(null)

  useEffect(() => {
    qIndexRef.current = currentQuestionIndex
    questionsRef.current = questions
  }, [currentQuestionIndex, questions])

  const fetchQuestions = async () => {
    const { data } = await supabase.from('questions').select('*').order('sort_order', { ascending: true })
    if (data) setQuestions(data)
  }

  useEffect(() => {
    fetchQuestions()
    const fetchLB = async () => {
      const { data } = await supabase.from('speed_scores').select('*').order('score', { ascending: false })
      if (data) setLeaderboard(data)
    }
    fetchLB()

    const dbSub = supabase.channel('speed-scores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speed_scores' }, async () => {
        const { data } = await supabase.from('speed_scores').select('*').order('score', { ascending: false })
        if (data) setLeaderboard(data)
      })
      .subscribe()

    const channel = supabase.channel('game-room')
    channelRef.current = channel

    channel.on('broadcast', { event: 'submit_answer' }, async ({ payload }) => {
      const qIndex = qIndexRef.current
      const qList = questionsRef.current
      if (qIndex < 0 || qIndex >= qList.length) return
      
      const { bitsId, name, answer, timeElapsed } = payload
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
          earnedPoints = Math.max(0, currentQ.max_points - (penalties * 5)) 
        }
      }

      if (earnedPoints > 0) {
        const { data: userRow } = await supabase.from('speed_scores').select('score').eq('bits_id', bitsId).single()
        if (userRow) {
          await supabase.from('speed_scores').update({ score: userRow.score + earnedPoints }).eq('bits_id', bitsId)
        }
      }

      channel.send({
        type: 'broadcast',
        event: 'answer_result',
        payload: { bitsId, name, isCorrect, earnedPoints, timeElapsed, isSkipped }
      })
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(dbSub)
      supabase.removeChannel(channel)
    }
  }, [])

  const handleStartGame = () => {
    if(!confirm("This will reset all speed round scores to 0. Continue?")) return;
    
    supabase.from('speed_scores').update({ score: 0 }).neq('bits_id', '').then(() => {
      setGameState('playing')
      setCurrentQuestionIndex(0)
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
      supabase.from('hub_settings').update({ current_question_index: nextIdx }).eq('id', 1)
      const q = questions[nextIdx]
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_question',
        payload: { id: q.id, type: q.type, text: q.text, options: q.options, max_points: q.max_points, time_allotted: q.time_allotted }
      })
    } else {
      setGameState('ended')
      supabase.from('hub_settings').update({ speed_game_state: 'ended' }).eq('id', 1)
      channelRef.current.send({ type: 'broadcast', event: 'game_ended' })
    }
  }

  const saveQuestion = async (e) => {
    e.preventDefault()
    if (!editingQuestion) return
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
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('control')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${activeTab === 'control' ? 'bg-red-600 text-white' : 'bg-[#232730] text-gray-400 hover:text-white'}`}>
            <Play className="w-4 h-4"/> Race Control
          </button>
          <button onClick={() => setActiveTab('questions')} className={`px-4 py-2 rounded-lg font-semibold text-sm transition flex items-center gap-2 ${activeTab === 'questions' ? 'bg-cyan-600 text-white' : 'bg-[#232730] text-gray-400 hover:text-white'}`}>
            <Database className="w-4 h-4"/> Question Manager
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
                <div className="mt-5 pt-4 border-t border-[#272b35] flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-bold">Status:</span>
                  <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase tracking-wide ${gameState === 'playing' ? 'bg-green-500/20 text-green-400' : 'bg-[#272b35] text-gray-400'}`}>
                    {gameState} {gameState === 'playing' && `(Q${currentQuestionIndex + 1}/${questions.length})`}
                  </span>
                </div>
              </div>
              
              {/* Leaderboard */}
              <div className="flex-1 bg-[#1a1d24] p-5 rounded-2xl border border-[#272b35] shadow-lg flex flex-col min-h-0">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Live Grid Standings</h2>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {leaderboard.length === 0 && <p className="text-gray-600 text-center text-sm font-bold mt-4">No drivers yet</p>}
                  {leaderboard.map((u, idx) => (
                    <div key={u.id || idx} className="flex justify-between items-center p-3 bg-[#232730] rounded-xl border border-[#2b303b]">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-sm font-bold text-gray-500">P{idx+1}</span>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-200 text-sm truncate max-w-[120px]">{u.name}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{u.bits_id}</span>
                        </div>
                      </div>
                      <span className="text-cyan-400 font-bold">{u.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Projector Preview */}
            <div className="xl:col-span-3 bg-[#1a1d24] p-8 rounded-2xl border border-[#272b35] shadow-lg flex flex-col">
              <div className="flex justify-between items-end mb-8 border-b border-[#272b35] pb-4 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-wide">Projector Preview</h2>
                  <p className="text-sm text-gray-400 mt-1">What the audience sees on the main screen</p>
                </div>
                {gameState === 'playing' && currentQuestionIndex >= 0 && (
                  <div className="flex gap-4">
                    <div className="bg-[#232730] px-4 py-2 rounded-xl flex flex-col items-center border border-[#2b303b]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Time Allotted</span>
                      <span className="text-lg font-bold text-cyan-400">{questions[currentQuestionIndex].time_allotted}s</span>
                    </div>
                    <div className="bg-[#232730] px-4 py-2 rounded-xl flex flex-col items-center border border-[#2b303b]">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Max Points</span>
                      <span className="text-lg font-bold text-green-400">{questions[currentQuestionIndex].max_points}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col justify-center items-center">
                {gameState === 'playing' && currentQuestionIndex >= 0 ? (
                   <div className="text-center w-full max-w-4xl">
                      <h3 className="text-3xl md:text-4xl font-bold mb-12 text-white leading-tight">{questions[currentQuestionIndex].text}</h3>
                      {questions[currentQuestionIndex].type === 'mcq' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                           {questions[currentQuestionIndex].options.map((opt, i) => {
                             const isCorrect = questions[currentQuestionIndex].correct_answer === opt
                             return (
                               <div key={i} className={`p-5 border-2 rounded-2xl text-xl font-bold flex items-center ${isCorrect ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-[#2b303b] bg-[#232730] text-gray-300'}`}>
                                  <span className="w-8 h-8 rounded-full bg-[#161920] flex items-center justify-center text-sm text-gray-500 mr-4">{'ABCD'[i]}</span> 
                                  {opt}
                               </div>
                             )
                           })}
                        </div>
                      )}
                      {questions[currentQuestionIndex].type === 'fill' && (
                        <div className="p-6 border-2 border-green-500/50 bg-green-500/10 rounded-2xl text-2xl font-bold text-green-400 inline-block">
                          Exact Answer: {questions[currentQuestionIndex].correct_answer}
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
             QUESTION MANAGER TAB
        ============================================= */}
        {activeTab === 'questions' && (
          <div className="flex gap-6 h-full">
            
            {/* List */}
            <div className="w-1/3 bg-[#1a1d24] border border-[#272b35] rounded-2xl shadow-lg flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#272b35] bg-[#161920]">
                <h2 className="font-bold text-white">Database</h2>
                <p className="text-xs text-gray-500">Select a question to edit settings.</p>
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
                      <Edit3 className="w-5 h-5 text-cyan-500" /> Edit Question ID: {editingQuestion.id}
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
