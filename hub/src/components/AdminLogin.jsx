import React, { useState } from 'react'
import { supabase } from '../supabase.js'
import { ChevronLeft, ShieldAlert } from 'lucide-react'

export function AdminLogin({ onLogin, onBack }) {
  const handleGoogleSignIn = () => {
    supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#060709]">
      <div className="absolute top-8 left-8 z-20">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition uppercase tracking-widest font-bold text-sm">
          <ChevronLeft className="w-5 h-5" /> Back to grid
        </button>
      </div>

      <div className="bg-[#101218] border border-gray-800 p-8 rounded-3xl w-full max-w-sm relative z-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="font-teko text-3xl font-bold text-white tracking-wide">RACE CONTROL</h2>
          <p className="text-xs text-gray-500 font-inter mt-1">Authorized Login Only</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full bg-white text-black hover:bg-gray-200 font-bold font-inter py-3 rounded-xl transition flex items-center justify-center gap-3 shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google (Admin)
        </button>
      </div>
    </div>
  )
}
