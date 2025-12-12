'use client'

import { useActionState } from 'react'
import { logar } from './actions'
import { useState } from 'react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(logar, null)
  const [senha, setSenha] = useState('')

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121212] border border-gray-800 p-8 rounded-3xl shadow-2xl">
        
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-2xl font-black text-white uppercase tracking-widest">Acesso Restrito</h1>
          <p className="text-gray-500 text-xs font-bold mt-2 uppercase tracking-wider">Área Administrativa</p>
        </div>

        <form action={formAction} className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
              Senha de Acesso
            </label>
            <input 
              type="password" 
              name="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white p-4 rounded-xl focus:border-yellow-500 outline-none transition font-mono text-center text-lg tracking-widest"
              placeholder="••••••••"
              autoFocus
            />
          </div>

          {state?.error && (
            <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs font-bold text-center uppercase tracking-wide animate-pulse">
              {state.error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isPending || !senha}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Entrando...' : 'Acessar Painel'}
          </button>
        </form>

        <div className="mt-8 text-center">
            <a href="/" className="text-gray-600 hover:text-white text-xs font-bold uppercase tracking-widest transition">
                ← Voltar ao site
            </a>
        </div>
      </div>
    </div>
  )
}