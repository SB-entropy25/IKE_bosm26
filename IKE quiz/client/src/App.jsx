import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

function UserRegistration({ onRegister, participantCount }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username.trim()) {
      setLoading(true);
      const { error } = await supabase
        .from('scorecards')
        .insert([{ username: username.trim(), score: 0 }]);
      
      if (error && error.code !== '23505') {
        alert('Error joining: ' + error.message);
      } else {
        onRegister(username.trim());
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 font-sans text-gray-100">
      <div className="mb-8 text-center max-w-lg">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-yellow-500 mb-2 uppercase tracking-widest italic drop-shadow-lg">IKE Motorsport</h1>
        <h2 className="text-2xl font-bold text-gray-300 mb-6 uppercase tracking-widest">Formula Student Speed Quiz</h2>
        <div className="bg-slate-900 p-6 rounded-xl border-l-4 border-red-600 shadow-2xl text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 font-black text-8xl -mt-4 -mr-4 italic">RACE</div>
          <p className="font-bold text-xl mb-3 text-red-500 uppercase tracking-widest">Race Rules:</p>
          <ul className="list-disc list-inside text-gray-400 space-y-2 font-medium text-lg">
            <li>Start with <span className="text-green-400 font-bold">100 points</span>.</li>
            <li>Lose <span className="text-red-500 font-bold">10 points</span> every <span className="text-white">3 seconds</span> delayed!</li>
            <li>Watch the projector for questions! Tap the correct option here.</li>
          </ul>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md relative">
        <h2 className="text-2xl font-black mb-8 text-center uppercase tracking-widest text-gray-100 border-b border-slate-700 pb-4">Driver Registration</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter Driver Alias"
          className="w-full p-4 border border-slate-700 rounded-xl mb-6 bg-slate-950 text-white placeholder-gray-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 uppercase font-bold tracking-wider text-center"
          required
        />
        <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white font-black py-4 rounded-xl text-xl hover:from-red-600 hover:to-red-500 transition-all uppercase tracking-widest shadow-lg transform hover:scale-105 duration-200">
          {loading ? 'Starting Engine...' : 'Enter Grid'}
        </button>
        <div className="mt-8 text-center flex items-center justify-center space-x-3 bg-slate-950 py-3 rounded-xl border border-slate-800">
          <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Live Drivers: <span className="text-white">{participantCount}</span></p>
        </div>
      </form>
    </div>
  );
}

function GameView({ user, gameState, currentQuestion, participantCount, onSubmitAnswer, result }) {
  const [answer, setAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (gameState === 'playing' && currentQuestion && !hasAnswered) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [gameState, currentQuestion, hasAnswered]);

  useEffect(() => {
    setHasAnswered(false);
    setAnswer('');
    setTimer(0);
  }, [currentQuestion]);

  const handleOptionClick = (opt) => {
    if (hasAnswered) return;
    setAnswer(opt);
    setHasAnswered(true);
    onSubmitAnswer(opt, timer);
  };

  const handleSubmitFill = (e) => {
    e.preventDefault();
    if (hasAnswered || !answer) return;
    setHasAnswered(true);
    onSubmitAnswer(answer, timer);
  };

  if (gameState === 'waiting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-gray-100 p-4">
        <div className="flex space-x-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-red-600 opacity-20"></div>
          <div className="w-16 h-16 rounded-full bg-yellow-500 opacity-20"></div>
          <div className="w-16 h-16 rounded-full bg-green-500 animate-pulse shadow-[0_0_30px_rgba(34,197,94,0.8)]"></div>
        </div>
        <h2 className="text-4xl md:text-5xl font-black mb-6 text-center uppercase tracking-widest text-white drop-shadow-lg">Waiting for Green Light...</h2>
        <p className="text-xl text-gray-400 mb-12 uppercase tracking-widest italic font-bold text-center">Look at the projector for instructions!</p>
        <div className="flex items-center space-x-4 bg-slate-900 px-8 py-4 rounded-full border border-slate-700 shadow-xl">
          <div className="w-4 h-4 bg-red-600 rounded-full animate-ping"></div>
          <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">Grid: <span className="text-white">{participantCount}</span> Drivers</p>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && currentQuestion) {
    const optionLabels = ['A', 'B', 'C', 'D'];
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-gray-100">
        <div className="w-full max-w-4xl bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-10 border border-slate-700 relative overflow-hidden">
          <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
            <h2 className="text-xl font-black text-gray-400 uppercase tracking-widest">Driver: <span className="text-white">{user}</span></h2>
            <div className="bg-slate-950 border-2 border-red-600 px-6 py-2 rounded-xl inline-block shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              <span className="text-2xl font-mono font-black text-red-500">{timer}s</span>
            </div>
          </div>
          
          <div className="mb-4">
            <p className="text-center text-gray-500 mb-8 uppercase tracking-widest font-bold">Select your answer based on the projector</p>
            
            {!hasAnswered ? (
              currentQuestion.type === 'mcq' ? (
                <div className="grid grid-cols-1 gap-6">
                  {currentQuestion.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleOptionClick(opt)}
                      className="flex items-center p-6 bg-slate-800 border-2 border-slate-700 rounded-2xl text-left hover:bg-red-600 hover:border-red-500 group transition-all transform active:scale-95 shadow-lg"
                    >
                      <span className="text-4xl font-black text-gray-600 group-hover:text-red-900 mr-6">{optionLabels[idx]}</span>
                      <span className="text-2xl font-bold text-gray-200 group-hover:text-white break-words">{opt}</span>
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
                    className="w-full p-6 border-2 border-slate-700 bg-slate-950 rounded-2xl mb-6 text-3xl font-bold text-white focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 text-center uppercase tracking-widest"
                    required
                  />
                  <button type="submit" className="w-full bg-gradient-to-r from-red-700 to-red-600 text-white font-black py-6 rounded-2xl text-3xl hover:from-red-600 hover:to-red-500 transition-all uppercase tracking-widest shadow-[0_0_20px_rgba(220,38,38,0.4)] transform active:scale-95 duration-200">
                    Submit
                  </button>
                </form>
              )
            ) : (
              <div className="text-center mt-12 pb-8">
                <p className="text-3xl mb-8 font-black text-gray-500 uppercase tracking-widest animate-pulse">Answer Locked In...</p>
                <p className="text-xl text-gray-400 mb-8 uppercase tracking-widest">Look at the projector for the result!</p>
                {result && (
                  <div className={`p-8 rounded-2xl border-4 shadow-2xl inline-block ${result.isCorrect ? 'bg-green-950 border-green-500 text-green-400' : 'bg-red-950 border-red-600 text-red-500'}`}>
                    <p className="font-black text-4xl uppercase tracking-widest mb-4">{result.isCorrect ? 'Clean Lap (Correct)!' : 'Engine Stall!'}</p>
                    {result.isCorrect && (
                      <p className="text-xl font-bold text-gray-300 uppercase tracking-widest">
                        Gained <span className="text-green-400 text-3xl">{result.earnedPoints}</span> pts 
                        <span className="text-gray-500 block mt-2 text-sm">(Reaction: {result.timeElapsed}s)</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4 text-gray-100">
         <h2 className="text-5xl font-black mb-8 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-yellow-500 uppercase tracking-widest italic text-center">Race Finished!</h2>
         <p className="text-2xl text-gray-400 uppercase tracking-widest font-bold text-center">Check the projector for the final podium!</p>
      </div>
    );
  }

  return null;
}

function AdminView() {
  const [gameState, setGameState] = useState('waiting');
  const [leaderboard, setLeaderboard] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  
  const qIndexRef = useRef(-1);
  const questionsRef = useRef([]);
  const channelRef = useRef(null);

  useEffect(() => {
    qIndexRef.current = currentQuestionIndex;
    questionsRef.current = questions;
  }, [currentQuestionIndex, questions]);

  useEffect(() => {
    const fetchDB = async () => {
      const { data: qData } = await supabase.from('questions').select('*').order('sort_order', { ascending: true });
      if (qData) setQuestions(qData);
      
      const { data: lData } = await supabase.from('scorecards').select('*').order('score', { ascending: false });
      if (lData) setLeaderboard(lData);
    };
    fetchDB();

    const dbSub = supabase.channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scorecards' }, async () => {
        const { data } = await supabase.from('scorecards').select('*').order('score', { ascending: false });
        if (data) setLeaderboard(data);
      })
      .subscribe();

    const channel = supabase.channel('game-room');
    channelRef.current = channel;

    channel.on('broadcast', { event: 'submit_answer' }, async ({ payload }) => {
      const qIndex = qIndexRef.current;
      const qList = questionsRef.current;
      if (qIndex < 0 || qIndex >= qList.length) return;
      
      const { username, answer, timeElapsed } = payload;
      const currentQ = qList[qIndex];
      
      let isCorrect = false;
      if (currentQ.type === 'mcq') {
        isCorrect = answer === currentQ.correct_answer;
      } else {
        isCorrect = answer.toString().trim().toLowerCase() === currentQ.correct_answer.toLowerCase();
      }

      let earnedPoints = 0;
      if (isCorrect) {
        const penalties = Math.floor(timeElapsed / 3);
        earnedPoints = Math.max(0, currentQ.max_points - (penalties * 10));
        
        const { data: userRow } = await supabase.from('scorecards').select('score').eq('username', username).single();
        if (userRow) {
          await supabase.from('scorecards').update({ score: userRow.score + earnedPoints }).eq('username', username);
        }
      }

      channel.send({
        type: 'broadcast',
        event: 'answer_result',
        payload: { username, isCorrect, earnedPoints, timeElapsed }
      });
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(dbSub);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleStartGame = () => {
    supabase.from('scorecards').update({ score: 0 }).neq('username', '').then(() => {
      setGameState('playing');
      setCurrentQuestionIndex(0);
      channelRef.current.send({ type: 'broadcast', event: 'game_started' });
      
      if (questions.length > 0) {
        const q = questions[0];
        channelRef.current.send({
          type: 'broadcast',
          event: 'new_question',
          payload: { id: q.id, type: q.type, text: q.text, options: q.options }
        });
      }
    });
  };

  const handleNextQuestion = () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx < questions.length) {
      setCurrentQuestionIndex(nextIdx);
      const q = questions[nextIdx];
      channelRef.current.send({
        type: 'broadcast',
        event: 'new_question',
        payload: { id: q.id, type: q.type, text: q.text, options: q.options }
      });
    } else {
      setGameState('ended');
      channelRef.current.send({ type: 'broadcast', event: 'game_ended' });
    }
  };

  const removeUser = async (username) => {
    if(confirm(`Kick ${username} from the grid?`)) {
       await supabase.from('scorecards').delete().eq('username', username);
    }
  };

  const downloadScorecard = () => {
    if (leaderboard.length === 0) return;
    const headers = ['Rank', 'Username', 'Score'];
    const rows = leaderboard.map((u, idx) => [idx + 1, u.username, u.score]);
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\r\n";
    rows.forEach(row => { csvContent += row.join(",") + "\r\n"; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "IKE_Motorsport_Scorecard.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 p-4 md:p-8 text-gray-100">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400 uppercase tracking-widest italic">Race Control</h1>
        <div className="flex space-x-4 mt-4 md:mt-0">
          <button onClick={downloadScorecard} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg uppercase tracking-widest text-sm flex items-center shadow-lg">
            ⬇ Download Scorecard CSV
          </button>
          <div className="flex items-center space-x-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Admin Live</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-1 flex flex-col space-y-8">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-5 font-black text-6xl -mt-4 -mr-4 italic">SYS</div>
            <h2 className="text-2xl font-black mb-6 uppercase tracking-widest text-gray-300 border-b border-slate-800 pb-2">Ignition</h2>
            <div className="space-y-4 relative z-10">
              <button 
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white font-black py-4 rounded-xl hover:from-green-500 hover:to-green-400 transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)] transform hover:scale-105"
              >
                Start Race / Reset Scores
              </button>
              <button 
                onClick={handleNextQuestion}
                className="w-full bg-slate-800 border border-red-600 text-red-500 hover:bg-red-600 hover:text-white font-black py-4 rounded-xl transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                disabled={gameState !== 'playing'}
              >
                Push Next Question
              </button>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-800 flex justify-between items-center relative z-10">
              <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">Status:</p>
              <span className={`font-black uppercase tracking-widest px-3 py-1 rounded-md text-sm ${gameState === 'playing' ? 'bg-red-900/50 text-red-400 border border-red-800' : 'bg-slate-800 text-gray-400'}`}>
                {gameState} (Q{currentQuestionIndex + 1}/{questions.length})
              </span>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-2xl flex flex-col h-[600px] relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-5 font-black text-6xl -mt-4 -mr-4 italic">GRID</div>
            <h2 className="text-xl font-black mb-6 uppercase tracking-widest text-gray-300 border-b border-slate-800 pb-2 relative z-10">Live Grid / Manage</h2>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 relative z-10 custom-scrollbar">
              {leaderboard.length === 0 && <p className="text-gray-600 font-bold uppercase tracking-widest text-center mt-10">Grid Empty</p>}
              {leaderboard.map((u, idx) => (
                <div key={u.id || idx} className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-lg group">
                  <span className="font-bold text-gray-300 uppercase truncate max-w-[120px]"><span className="text-red-600 mr-2">P{idx+1}</span>{u.username}</span>
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-black">{u.score}</span>
                    <button onClick={() => removeUser(u.username)} className="text-red-600 hover:text-red-400 font-bold hidden group-hover:block" title="Kick User">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-700 shadow-2xl flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-5 font-black text-8xl -mt-4 -mr-4 italic">PROJECTOR</div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800 pb-6 relative z-10">
            <div className="mb-4 md:mb-0">
              <h2 className="text-3xl font-black uppercase tracking-widest text-white">Projector Preview</h2>
              <p className="text-sm text-gray-400 uppercase tracking-widest mt-1">This is the question currently active</p>
            </div>
          </div>
          
          <div className="flex-1 relative z-10 flex flex-col justify-center items-center py-12">
            {gameState === 'playing' && currentQuestionIndex >= 0 ? (
               <div className="text-center w-full max-w-4xl">
                  <h3 className="text-5xl font-black mb-16 leading-tight">{questions[currentQuestionIndex].text}</h3>
                  {questions[currentQuestionIndex].type === 'mcq' && (
                    <div className="grid grid-cols-2 gap-8 text-left">
                       {questions[currentQuestionIndex].options.map((opt, i) => (
                          <div key={i} className={`p-6 border-2 rounded-2xl text-2xl font-bold flex items-center ${questions[currentQuestionIndex].correct_answer === opt ? 'border-green-500 bg-green-950/20 text-green-400' : 'border-slate-700 bg-slate-800 text-white'}`}>
                             <span className="text-4xl text-gray-500 mr-6">{'ABCD'[i]}</span> {opt}
                          </div>
                       ))}
                    </div>
                  )}
                  {questions[currentQuestionIndex].type === 'fill' && (
                    <div className="p-8 border-2 border-green-500 bg-green-950/20 rounded-2xl text-3xl font-bold text-green-400">
                      Answer: {questions[currentQuestionIndex].correct_answer}
                    </div>
                  )}
               </div>
            ) : (
               <div className="text-center text-gray-600 font-black uppercase tracking-widest text-3xl">
                  No active question
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerApp() {
  const [user, setUser] = useState(null);
  const [gameState, setGameState] = useState('waiting');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [result, setResult] = useState(null);
  const [participantCount, setParticipantCount] = useState(0);
  const channelRef = useRef(null);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const channel = supabase.channel('game-room');
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      let count = 0;
      for (const id in state) count += state[id].length;
      setParticipantCount(count);
    });

    channel.on('broadcast', { event: 'game_started' }, () => { 
      setGameState('playing'); 
      setCurrentQuestion(null); 
      setResult(null);
    });
    
    channel.on('broadcast', { event: 'new_question' }, ({ payload }) => { 
      setGameState('playing'); 
      setCurrentQuestion(payload); 
      setResult(null);
    });
    
    channel.on('broadcast', { event: 'game_ended' }, () => { 
      setGameState('ended'); 
    });

    channel.on('broadcast', { event: 'answer_result' }, ({ payload }) => {
      if (payload.username === userRef.current) {
        setResult(payload);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && userRef.current) {
        await channel.track({ user: userRef.current, online_at: new Date().toISOString() });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmitAnswer = (answer, timeElapsed) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'submit_answer',
        payload: { username: userRef.current, answer, timeElapsed }
      });
    }
  };

  if (!user) {
    return <UserRegistration onRegister={setUser} participantCount={participantCount} />;
  }

  return (
    <GameView 
      user={user} 
      gameState={gameState} 
      currentQuestion={currentQuestion}
      participantCount={participantCount}
      onSubmitAnswer={handleSubmitAnswer}
      result={result}
    />
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PlayerApp />} />
        <Route path="/admin" element={<AdminView />} />
      </Routes>
    </Router>
  );
}

export default App;
