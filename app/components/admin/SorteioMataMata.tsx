'use client'

import { useState, useEffect } from 'react'
import { listarTimesDoCampeonato, gerarMataMataInteligente } from '../../actions'
import toast from 'react-hot-toast'
import { ChevronUp, ChevronDown, Zap, GripVertical } from 'lucide-react'

interface Props {
  campeonatoId: number
  onSucesso?: () => void
}

export default function SorteioMataMata({ campeonatoId, onSucesso }: Props) {
  const [timesOrdenados, setTimesOrdenados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
        const dados = await listarTimesDoCampeonato(campeonatoId)
        setTimesOrdenados(dados || [])
    }
    load()
  }, [campeonatoId])

  function moverTime(index: number, direcao: 'cima' | 'baixo') {
      if (direcao === 'cima' && index === 0) return;
      if (direcao === 'baixo' && index === timesOrdenados.length - 1) return;

      const novaLista = [...timesOrdenados];
      const indexTroca = direcao === 'cima' ? index - 1 : index + 1;
      
      const temp = novaLista[index];
      novaLista[index] = novaLista[indexTroca];
      novaLista[indexTroca] = temp;

      setTimesOrdenados(novaLista);
  }

  async function handleGerarConfrontos() {
      // TRAVA 1: Se já estiver carregando, aborta imediatamente o clique extra
      if (loading) return; 
      
      if (timesOrdenados.length < 2) return toast.error("É necessário pelo menos 2 times.");
      
      setLoading(true) // Trava o botão
      
      const seeds = timesOrdenados.map(t => t.time_id)

      // Gera o mata-mata
      const res = await gerarMataMataInteligente(campeonatoId, seeds, false)
      
      if (res.success) {
          toast.success("Chaveamento criado! Atualizando...")
          
          if (onSucesso) onSucesso()

          // Mantemos o loading = true até a página recarregar para evitar cliques no limbo
          setTimeout(() => {
              window.location.reload()
          }, 1000)
          
      } else {
          toast.error(res.msg)
          setLoading(false) // Destrava apenas se der erro (ex: "Jogos já existem")
      }
  }

  return (
    <div className="w-full mt-4 bg-[#121212] border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="mb-6 text-center">
            <h3 className="text-white font-bold text-lg mb-1 flex items-center justify-center gap-2">
                <GripVertical size={20} className="text-gray-500" />
                Definição de Seeds (Ranking)
            </h3>
            <p className="text-gray-500 text-xs max-w-md mx-auto">
                Use as setas para ordenar os times. O 1º da lista será o <strong>Cabeça de Chave #1</strong>.
            </p>
        </div>

        <div className="space-y-2 mb-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 bg-black/20 p-2 rounded-xl border border-white/5">
            {timesOrdenados.map((t, idx) => (
                <div key={t.time_id} className="flex items-center justify-between bg-[#1a1a1a] p-3 rounded-lg border border-gray-800 hover:border-gray-600 transition group">
                    <div className="flex items-center gap-4">
                        <span className={`font-mono font-bold text-xs w-8 text-right ${idx < 4 ? 'text-green-500' : 'text-gray-600'}`}>
                            #{idx + 1}
                        </span>
                        <div className="flex items-center gap-3">
                            {t.times?.escudo ? (
                                <img src={t.times.escudo} className="w-8 h-8 object-contain" alt="" />
                            ) : (
                                <div className="w-8 h-8 bg-gray-700 rounded-full" />
                            )}
                            <span className="text-sm font-bold text-gray-300 group-hover:text-white transition">
                                {t.times?.nome}
                            </span>
                        </div>
                    </div>
                    
                    <div className="flex gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => moverTime(idx, 'cima')} 
                            className="p-1.5 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-md transition disabled:opacity-20"
                            disabled={idx === 0 || loading}
                        >
                            <ChevronUp size={16} />
                        </button>
                        <button 
                            onClick={() => moverTime(idx, 'baixo')} 
                            className="p-1.5 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-400 rounded-md transition disabled:opacity-20"
                            disabled={idx === timesOrdenados.length - 1 || loading}
                        >
                            <ChevronDown size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <button 
            onClick={handleGerarConfrontos} 
            disabled={loading || timesOrdenados.length < 2}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-black py-4 rounded-xl uppercase tracking-widest text-sm transition shadow-lg shadow-yellow-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
            {loading ? <Zap className="animate-spin" /> : <Zap fill="black" />}
            {loading ? 'Processando...' : '⚡ Gerar Chave Final'}
        </button>
    </div>
  )
}