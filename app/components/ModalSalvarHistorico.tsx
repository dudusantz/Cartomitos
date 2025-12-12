'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: (ano: number) => void
  campeao: string
  totalTimes: number
}

export default function ModalSalvarHistorico({ isOpen, onClose, onConfirm, campeao, totalTimes }: Props) {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (isOpen) { document.body.style.overflow = 'hidden' } 
    else { document.body.style.overflow = 'unset' }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative bg-[#121212] border border-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 animate-fadeIn">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-blue-900/20 to-transparent p-6 border-b border-gray-800 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl mb-3 shadow-[0_0_15px_rgba(37,99,235,0.4)] animate-pulse text-white">
                💾
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">
                Salvar Ranking
            </h3>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">
                Arquivar Classificação Final
            </p>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-6">
            <div className="bg-[#0a0a0a] rounded-xl p-4 border border-gray-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold uppercase">Líder Atual</span>
                    <span className="text-white font-black uppercase tracking-wider text-right">{campeao}</span>
                </div>
                <div className="w-full h-px bg-gray-800"></div>
                <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold uppercase">Total de Times</span>
                    <span className="text-white font-mono font-bold">{totalTimes}</span>
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">
                    Definir Ano do Ranking
                </label>
                <div className="relative">
                    <input 
                        type="number" 
                        value={ano}
                        onChange={(e) => setAno(Number(e.target.value))}
                        className="w-full bg-[#0a0a0a] border border-gray-700 text-white text-center font-black text-3xl p-4 rounded-xl focus:border-blue-500 outline-none transition-colors placeholder-gray-800"
                    />
                </div>
                <p className="text-[10px] text-center mt-3 text-gray-400 font-medium">
                    O histórico será salvo como <span className="text-white font-bold">"Ranking {ano}"</span>.
                </p>
            </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 bg-[#0a0a0a] border-t border-gray-800 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
                Cancelar
            </button>
            <button onClick={() => onConfirm(ano)} className="flex-1 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all active:scale-95">
                Confirmar
            </button>
        </div>

      </div>
    </div>,
    document.body
  )
}