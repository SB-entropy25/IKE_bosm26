import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase.js'
import { LogOut, Users, Play, StopCircle, RefreshCw, Download, Zap, Brain, Trophy } from 'lucide-react'
import { SpeedRoundAdmin } from './SpeedRoundAdmin.jsx'

export function AdminPanel({ onLogout }) {
  const [settings, setSettings] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('main')
  
  const [adminList, setAdminList] = useState([])
  const [newAdminEmail, setNewAdminEmail] = useState('')

  // Fetch initial data
  const fetchData = async () => {
    // Settings
    const { data: setts } = await supabase.from('hub_settings').select('*').single()
    if (setts) setSettings(setts)

    // Admin Users
    const { data: admins } = await supabase.from('admin_users').select('*')
    if (admins) setAdminList(admins)

    // Users and scores
    const { data: hubUsers } = await supabase.from('hub_users').select('*')
    const { data: speed } = await supabase.from('speed_scores').select('*')
    const { data: strategy } = await supabase.from('strategy_scores').select('*')

    if (hubUsers && speed && strategy && setts) {
      const combined = hubUsers.map(u => {
        const sScore = speed.find(s => s.bits_id === u.bits_id)?.score || 0
        const stScore = strategy.find(s => s.bits_id === u.bits_id)?.score || 0
        
        // Calculate Net Score based on weighting
        // e.g. Strategy Weight = 60%, Speed = 40%
        const stWeight = setts.strategy_weight / 100
        const spWeight = 1 - stWeight
        
        // Speed score is max ~1000? Assuming similar scales. If not, normalization needed.
        const netScore = Math.round((sScore * spWeight) + (stScore * stWeight))

        return { ...u, speedScore: sScore, strategyScore: stScore, netScore }
      })
      
      // Sort by net score desc
      combined.sort((a, b) => b.netScore - a.netScore)
      setUsers(combined)
    }
    setLoading(false)
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    if (!newAdminEmail.trim()) return
    await supabase.from('admin_users').insert([{ email: newAdminEmail.trim() }])
    setNewAdminEmail('')
    fetchData()
  }

  const MASTER_ADMIN = 'f20250844@pilani.bits-pilani.ac.in'

  const handleRemoveAdmin = async (email) => {
    if (email === MASTER_ADMIN) {
      alert('This is the master admin account and cannot be removed.')
      return
    }
    if (confirm(`Remove admin access for ${email}?`)) {
      await supabase.from('admin_users').delete().eq('email', email)
      fetchData()
    }
  }

  const toggleAnyEmail = async () => {
    await supabase.from('hub_settings').update({ allow_any_email: !settings.allow_any_email }).eq('id', 1)
  }

  useEffect(() => {
    fetchData()

    // Realtime listeners
    const channel = supabase.channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_settings' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'speed_scores' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'strategy_scores' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hub_users' }, fetchData)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const toggleRound = async (roundType, currentValue) => {
    const field = roundType === 'speed' ? 'speed_round_enabled' : 'strategy_round_enabled'
    await supabase.from('hub_settings').update({ [field]: !currentValue }).eq('id', 1)
  }

  const updateWeight = async (val) => {
    await supabase.from('hub_settings').update({ strategy_weight: parseInt(val) }).eq('id', 1)
  }

  const exportCSV = () => {
    const headers = ['Rank', 'Name', 'BITS_ID', 'Speed_Score', 'Strategy_Score', 'Net_Score']
    const rows = users.map((u, i) => [i + 1, u.name, u.bits_id, u.speedScore, u.strategyScore, u.netScore])
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n"
    rows.forEach(row => { csvContent += row.join(",") + "\n" })
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "ike_championship_results.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading || !settings) return <div className="text-center p-12 text-white">Loading Admin Panel...</div>

  if (view === 'speed') return <SpeedRoundAdmin onBack={() => setView('main')} />

  return (
    <div className="min-h-screen p-6 bg-slate-950 text-gray-200 font-inter">
      <nav className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
        <h1 className="font-teko text-4xl font-bold text-white tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-amber-500">Quiz Managment Dashboard</h1>
        <div className="flex gap-4">
          <button onClick={exportCSV} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold transition text-white">
            <Download className="w-4 h-4" /> Export Results
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm transition">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Controls */}
        <div className="lg:col-span-1 space-y-6">
          {/* Access Gates */}
          <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
            <h3 className="font-teko text-2xl font-bold text-white mb-4">ROUND ACCESS GATES</h3>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${settings.speed_round_enabled ? 'bg-red-500/20 text-red-400' : 'bg-slate-800 text-slate-500'}`}><Zap className="w-5 h-5"/></div>
                    <div>
                      <div className="font-semibold">Speed Round</div>
                      <div className="text-xs text-gray-500">IKE Quiz</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleRound('speed', settings.speed_round_enabled)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${settings.speed_round_enabled ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                  >
                    {settings.speed_round_enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
                <button onClick={() => setView('speed')} className="w-full mt-2 py-2 text-xs font-bold uppercase text-red-400 bg-red-950/40 hover:bg-red-900/50 border border-red-900/50 rounded-lg transition">
                  Enter Speed Round Control Room →
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${settings.strategy_round_enabled ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}><Brain className="w-5 h-5"/></div>
                  <div>
                    <div className="font-semibold">Strategy Round</div>
                    <div className="text-xs text-gray-500">F1 Sim</div>
                  </div>
                </div>
                <button 
                  onClick={() => toggleRound('strategy', settings.strategy_round_enabled)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold uppercase ${settings.strategy_round_enabled ? 'bg-cyan-600 hover:bg-cyan-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
                >
                  {settings.strategy_round_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          </div>

          {/* Scoring Weights */}
          <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
            <h3 className="font-teko text-2xl font-bold text-white mb-4">CHAMPIONSHIP WEIGHTING</h3>
            <p className="text-xs text-gray-400 mb-4">Adjust the impact of the Strategy round on the final Net Score. (Speed round will be {100 - settings.strategy_weight}%).</p>
            
            <div className="space-y-4">
              <input 
                type="range" 
                min="0" max="100" step="5"
                value={settings.strategy_weight} 
                onChange={(e) => updateWeight(e.target.value)}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-red-400">Speed: {100 - settings.strategy_weight}%</span>
                <span className="text-cyan-400">Strategy: {settings.strategy_weight}%</span>
              </div>
            </div>
          </div>

          {/* Admins Management */}
          <div className="p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
            <h3 className="font-teko text-2xl font-bold text-white mb-4">ADMIN ACCESS</h3>
            
            {/* Open Access Toggle */}
            <div className={`flex items-center justify-between p-3 rounded-xl border mb-4 ${settings.allow_any_email ? 'bg-amber-900/20 border-amber-600/50' : 'bg-slate-950 border-slate-800'}`}>
              <div>
                <div className="text-sm font-bold text-white">Open Access Mode</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {settings.allow_any_email ? '⚠️ ANY Google account can register' : '✅ BITS Pilani emails only'}
                </div>
              </div>
              <button
                onClick={toggleAnyEmail}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition ${settings.allow_any_email ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}
              >
                {settings.allow_any_email ? 'Disable' : 'Enable'}
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">Authorized Google emails for Race Control.</p>
            
            <form onSubmit={handleAddAdmin} className="flex gap-2 mb-4">
              <input 
                type="email" 
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder="New admin email..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                required
              />
              <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition">
                Add
              </button>
            </form>

            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
              {adminList.map(admin => (
                <div key={admin.id} className={`flex justify-between items-center border p-3 rounded-lg text-sm ${admin.email === MASTER_ADMIN ? 'bg-red-950/20 border-red-800/50' : 'bg-slate-950 border-slate-800'}`}>
                  <div className="flex items-center gap-2">
                    {admin.email === MASTER_ADMIN && <span className="text-red-500 text-xs" title="Master Admin - Protected">🔒</span>}
                    <span className="text-gray-300 font-mono text-xs">{admin.email}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveAdmin(admin.email)}
                    className={`transition ${admin.email === MASTER_ADMIN ? 'text-gray-700 cursor-not-allowed' : 'text-gray-600 hover:text-red-500'}`}
                    title={admin.email === MASTER_ADMIN ? 'Master admin cannot be removed' : 'Remove access'}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Leaderboard */}
        <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl flex flex-col h-[80vh]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-teko text-3xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500"/> UNIFIED LEADERBOARD
            </h3>
            <span className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold">{users.length} Drivers</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-gray-500 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Pos</th>
                  <th className="py-3 px-4">Driver</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-right">Speed Pts</th>
                  <th className="py-3 px-4 text-right">Strategy Pts</th>
                  <th className="py-3 px-4 text-right text-amber-400 font-bold">NET SCORE</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr><td colSpan="6" className="text-center py-8 text-gray-500">Grid is empty. Waiting for registrations.</td></tr>
                )}
                {users.map((u, i) => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 text-center font-bold text-gray-400">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{u.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{u.bits_id}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400 font-mono">{u.email || '—'}</td>
                    <td className="py-3 px-4 text-right text-red-300">{u.speedScore}</td>
                    <td className="py-3 px-4 text-right text-cyan-300">{u.strategyScore}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-400 text-base">{u.netScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
