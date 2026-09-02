import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Info, FastForward, Clock } from 'lucide-react'
import { supabase } from '../supabase.js'

export function SpeedRound({ user, soundEnabled, onBack }) {
  const [gameState, setGameState] = useState('waiting')
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [result, setResult] = useState(null)
  const [participantCount, setParticipantCount] = useState(0)
  
  const [answer, setAnswer] = useState('')
  const [hasAnswered, setHasAnswered] = useState(false)
  const [timer, setTimer] = useState(0)
  const [showInstructions, setShowInstructions] = useState(false)

  const channelRef = useRef(null)
  const userRef = useRef(user)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    const channel = supabase.channel('game-room')
    channelRef.current = channel

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      let count = 0
      for (const id in state) count += state[id].length
      setParticipantCount(count)
    })

    channel.on('broadcast', { event: 'game_started' }, () => { 
      setGameState('playing')
      setCurrentQuestion(null)
      setResult(null)
    })
    
    channel.on('broadcast', { event: 'new_question' }, ({ payload }) => { 
      setGameState('playing')
      setCurrentQuestion(payload) // Has time_allotted and max_points
      setResult(null)
      setHasAnswered(false)
      setAnswer('')
      setTimer(0)
    })
    
    channel.on('broadcast', { event: 'game_ended' }, () => { 
      setGameState('ended')
    })

    channel.on('broadcast', { event: 'answer_result' }, ({ payload }) => {
      if (payload.bitsId === userRef.current.bitsId) {
        setResult(payload)
      }
    })

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && userRef.current) {
        await channel.track({ user: userRef.current.name, bitsId: userRef.current.bitsId, online_at: new Date().toISOString() })
      }
    })

    supabase.from('hub_settings').select('speed_game_state').single().then(({ data }) => {
      if (data && data.speed_game_state === 'playing') setGameState('playing')
    })

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    let interval = null
    if (gameState === 'playing' && currentQuestion && !hasAnswered) {
      interval = setInterval(() => setTimer((prev) => prev + 1), 1000)
    } else {
      clearInterval(interval)
    }
    return () => clearInterval(interval)
  }, [gameState, currentQuestion, hasAnswered])

  const handleSubmitAnswer = (ans) => {
    if (channelRef.current && userRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'submit_answer',
        payload: { 
          bitsId: userRef.current.bitsId, 
          name: userRef.current.name, 
          answer: ans, 
          timeElapsed: timer 
        }
      })
    }
  }

  const handleOptionClick = (opt) => {
    if (hasAnswered) return
    setAnswer(opt)
    setHasAnswered(true)
    handleSubmitAnswer(opt)
  }

  const handleSubmitFill = (e) => {
    e.preventDefault()
    if (hasAnswered || !answer) return
    setHasAnswered(true)
    handleSubmitAnswer(answer)
  }

  const handleSkip = () => {
    if (hasAnswered || timer > 10) return
    setAnswer('__SKIP__')
    setHasAnswered(true)
    handleSubmitAnswer('__SKIP__')
  }

  const optionLabels = ['A', 'B', 'C', 'D']

  // Determine feedback text based on speed
  const getFeedbackText = () => {
    if (result && result.isSkipped) return "Tactical Skip!"
    if (!currentQuestion || !currentQuestion.time_allotted) return "Answer Locked In!"
    
    const pct = timer / currentQuestion.time_allotted
    if (pct < 0.2) return "Lightning Fast! ⚡"
    if (pct < 0.4) return "Great Speed! 🏎️"
    if (pct < 0.7) return "Good Pace! 🏁"
    return "Answer Locked In!"
  }

  // Calculate current potential points for display
  const currentPotential = currentQuestion ? Math.max(0, currentQuestion.max_points - (Math.floor(timer / 5) * 5)) : 0

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50 text-gray-100 font-inter">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-red-900/50 shadow-md z-10 shrink-0">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition font-inter font-semibold uppercase">
          <ChevronLeft className="w-4 h-4" /> Exit Speed Round
        </button>
        <div className="text-red-500 font-teko text-2xl tracking-widest font-bold flex items-center gap-3">
          F1 QUIZ SPEED ROUND
          <button onClick={() => setShowInstructions(true)} className="text-gray-400 hover:text-white transition">
            <Info className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          {participantCount} GRID
        </div>
      </div>
      
      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h2 className="text-3xl font-teko font-bold text-white mb-6 uppercase tracking-widest border-b border-slate-700 pb-2">Race Rules</h2>
            <ul className="space-y-4 text-gray-300 font-inter text-sm mb-8">
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-red-500 shrink-0" />
                <span><strong className="text-white">Time is Points:</strong> Every 5 seconds, the maximum points for the question drops by 5. Answer quickly!</span>
              </li>
              <li className="flex items-start gap-3">
                <FastForward className="w-5 h-5 text-cyan-400 shrink-0" />
                <span><strong className="text-white">Tactical Skip:</strong> Skip a question within the first 10 seconds to guarantee +5 points and save your streak.</span>
              </li>
              <li className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-500 shrink-0" />
                <span><strong className="text-white">Lock In:</strong> Submit your answer and wait for the grid to finish. The projector reveals the answer.</span>
              </li>
            </ul>
            <button onClick={() => setShowInstructions(false)} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl uppercase tracking-widest transition">Understood</button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 relative">
        
        {gameState === 'waiting' && (
          <div className="flex flex-col items-center text-center">
            <div className="flex space-x-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-red-600 opacity-20"></div>
              <div className="w-12 h-12 rounded-full bg-yellow-500 opacity-20"></div>
              <div className="w-12 h-12 rounded-full bg-green-500 animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.8)]"></div>
            </div>
            <h2 className="text-4xl md:text-5xl font-teko font-bold mb-4 text-white uppercase tracking-widest drop-shadow-lg">Waiting for Green Light...</h2>
            <p className="text-lg text-gray-400 uppercase tracking-widest font-bold mb-8">Look at the projector for instructions!</p>
          </div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-10 border border-slate-700 relative overflow-hidden slide-in-r">
            
            <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
              <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest font-teko">Driver: <span className="text-white">{user.name}</span></h2>
              
              <div className="flex items-center gap-4">
                {/* Dynamic points tracker */}
                {!hasAnswered && (
                  <div className="text-sm font-bold text-gray-400 uppercase tracking-widest text-right">
                    Current Max:<br/>
                    <span className="text-green-400 text-xl font-teko">{currentPotential} pts</span>
                  </div>
                )}
                <div className="bg-slate-950 border-2 border-red-600 px-6 py-2 rounded-xl inline-block shadow-[0_0_15px_rgba(220,38,38,0.3)]">
                  <span className="text-2xl font-mono font-black text-red-500">{timer}s</span>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              {!hasAnswered && (
                 <div className="flex justify-between items-center mb-6">
                    <p className="text-gray-500 uppercase tracking-widest font-bold text-sm">Select your answer based on the projector</p>
                    {timer <= 10 && (
                      <button onClick={handleSkip} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 px-4 py-2 rounded-lg font-bold text-sm uppercase tracking-widest border border-slate-700 transition">
                         <FastForward className="w-4 h-4"/> Skip (+5 pts)
                      </button>
                    )}
                 </div>
              )}
              
              {!hasAnswered ? (
                currentQuestion.type === 'mcq' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt)}
                        className="flex items-center p-6 bg-slate-800 border-2 border-slate-700 rounded-2xl text-left hover:bg-red-600 hover:border-red-500 group transition-all transform active:scale-95 shadow-lg"
                      >
                        <span className="text-3xl font-black text-gray-600 group-hover:text-red-900 mr-4 font-teko">{optionLabels[idx]}</span>
                        <span className="text-xl font-bold text-gray-200 group-hover:text-white break-words">{opt}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleSubmitFill} className="flex flex-col items-center w-full max-w-lg mx-auto">
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Enter exact answer..."
                      className="w-full p-6 border-2 border-slate-700 bg-slate-950 rounded-2xl mb-6 text-2xl font-bold text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-center uppercase tracking-widest"
                      required
                    />
                    <button type="submit" className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white font-black py-4 rounded-2xl text-2xl font-teko hover:from-red-600 hover:to-red-500 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transform active:scale-95 duration-200">
                      Submit Answer
                    </button>
                  </form>
                )
              ) : (
                <div className="text-center mt-8 pb-8 float-up">
                  <p className="text-3xl mb-2 font-bold text-white uppercase tracking-widest font-teko">{getFeedbackText()}</p>
                  
                  {!result && (
                    <div className="flex flex-col items-center justify-center mt-8">
                       <div className="w-10 h-10 border-4 border-slate-700 border-t-red-500 rounded-full animate-spin mb-4"></div>
                       <p className="text-gray-400 uppercase tracking-widest font-bold">Waiting for reveal of answer...</p>
                    </div>
                  )}
                  
                  {result && (
                    <div className={`mt-8 p-8 rounded-2xl border-2 shadow-2xl inline-block float-up ${
                        result.isSkipped ? 'bg-cyan-950/40 border-cyan-500 text-cyan-400' :
                        result.isCorrect ? 'bg-green-950/40 border-green-500 text-green-400' : 
                        'bg-red-950/40 border-red-600 text-red-500'
                    }`}>
                      <p className="font-black text-4xl uppercase tracking-widest mb-2 font-teko">
                        {result.isSkipped ? 'Skipped' : result.isCorrect ? 'Clean Lap (Correct)!' : 'Engine Stall!'}
                      </p>
                      
                      <div className="text-lg font-bold text-gray-300 uppercase tracking-widest mt-4">
                        Scored <span className={`text-3xl mx-2 font-teko ${result.isSkipped ? 'text-cyan-400' : result.isCorrect ? 'text-green-400' : 'text-red-500'}`}>{result.earnedPoints}</span> pts 
                        <div className="text-gray-500 mt-1 text-xs">(Reaction: {result.timeElapsed}s)</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'ended' && (
          <div className="flex flex-col items-center text-center float-up">
             <h2 className="text-6xl font-teko font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-yellow-500 uppercase tracking-widest italic">Race Finished!</h2>
             <p className="text-xl text-gray-400 uppercase tracking-widest font-bold">Check the projector for the final podium!</p>
          </div>
        )}

      </div>
    </div>
  )
}
