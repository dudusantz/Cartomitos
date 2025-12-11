'use client'

import { useState, useEffect } from 'react'
import { listarTimesDoCampeonato, gerarMataMataInteligente } from '../../actions'
import toast from 'react-hot-toast'

interface Props {
  campeonatoId: number
  onSucesso: () => void
}

export default function SorteioMataMata({ campeonatoId, onSucesso }: Props) {
  const [times, setTimes] = useState<any[]>([])
  const [pote1, setPote1] = useState<any[]>([])
  const [pote2, setPote2] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function load() {
        const dados = await listarTimesDoCampeonato(campeonatoId)
        setTimes(dados)
        // Distribuição inicial automática (metade/metade)
        const metade = Math.ceil(dados.length / 2)
        setPote1(dados.slice(0, metade))
        setPote2(dados.slice(metade))
    }
    load()
  }, [campeonatoId])

  // Função para mover time de um pote para outro
  const moverTime = (time: any, origem: 'p1' | 'p2') => {
      if (origem === 'p1') {
          setPote1(pote1.filter(t => t.time_id !== time.time_id))
          setPote2([...pote2, time])
      } else {
          setPote2(pote2.filter(t => t.time_id !== time.time_id))
          setPote1([...pote1, time])
      }
  }

  async function handleSortear() {
      if (pote1.length === 0 || pote2.length === 0) return toast.error("Os potes não podem estar vazios.")
      
      setLoading(true)
      // Ordenação para garantir Pote 1 x Pote 2
      const seedsOrdenados: number[] = []
      
      // Embaralha os potes internamente para o sorteio ser real
      const p1Random = [...pote1].sort(() => Math.random() - 0.5)
      const p2Random = [...pote2].sort(() => Math.random() - 0.5)

      // Cria a lista de seeds: [Pote1-time1, Pote2-time1, Pote1-time2, Pote2-time2...]
      // A lógica do 'gerarMataMataInteligente' (1º vs último, 2º vs penúltimo)
      // vai garantir que o time 1 do Pote 1 (que é o 1º da lista) enfrente o último da lista (time 1 do Pote 2)
      const maiorTamanho = Math.max(p1Random.length, p2Random.length)
      for (let i = 0; i < maiorTamanho; i++) {
          if (p1Random[i]) seedsOrdenados.push(p1Random[i].time_id)
          if (p2Random[i]) seedsOrdenados.push(p2Random[i].time_id)
      }

      const res = await gerarMataMataInteligente(campeonatoId, seedsOrdenados, false)
      if (res.success) {
          toast.success("Mata-mata sorteado com sucesso!")
          onSucesso()
      } else {
          toast.error(res.msg)
      }
      setLoading(false)
  }

  return (
    <div className="bg-[#121212] p-6 rounded-2xl border border-gray-800">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <span className="text-yellow-500">⚡</span> Configurar Sorteio (Potes)
        </h3>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
            
            {/* POTE 1 */}
            <div className="bg-black/40 p-4 rounded-xl border border-green-900/30">
                <div className="flex justify-between mb-3">
                    <span className="text-green-500 font-bold text-xs uppercase">Pote A (Cabeças de Chave)</span>
                    <span className="text-gray-600 text-xs">{pote1.length} times</span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {pote1.map(t => (
                        <div key={t.time_id} onClick={() => moverTime(t, 'p1')} className="flex items-center gap-3 bg-[#151515] p-2 rounded cursor-pointer hover:bg-red-900/20 hover:border-red-500/50 border border-transparent transition group">
                            <img src={t.times?.escudo || '/shield-placeholder.png'} className="w-6 h-6 object-contain" />
                            <span className="text-gray-300 text-xs font-bold truncate">{t.times?.nome}</span>
                            <span className="ml-auto text-[10px] text-gray-600 group-hover:text-red-500">Mover →</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* POTE 2 */}
            <div className="bg-black/40 p-4 rounded-xl border border-blue-900/30">
                <div className="flex justify-between mb-3">
                    <span className="text-blue-500 font-bold text-xs uppercase">Pote B (Desafiantes)</span>
                    <span className="text-gray-600 text-xs">{pote2.length} times</span>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {pote2.map(t => (
                        <div key={t.time_id} onClick={() => moverTime(t, 'p2')} className="flex items-center gap-3 bg-[#151515] p-2 rounded cursor-pointer hover:bg-green-900/20 hover:border-green-500/50 border border-transparent transition group">
                            <span className="text-[10px] text-gray-600 group-hover:text-green-500">← Mover</span>
                            <img src={t.times?.escudo || '/shield-placeholder.png'} className="w-6 h-6 object-contain" />
                            <span className="text-gray-300 text-xs font-bold truncate">{t.times?.nome}</span>
                        </div>
                    ))}
                </div>
            </div>

        </div>

        <button 
            onClick={handleSortear} 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition shadow-lg shadow-green-900/20 disabled:opacity-50"
        >
            {loading ? 'Sorteando...' : 'Confirmar Potes e Sortear Confrontos'}
        </button>
    </div>
  )
}