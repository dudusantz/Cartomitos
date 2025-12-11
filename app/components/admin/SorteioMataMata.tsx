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
        
        // Lógica automática: metade superior no Pote 1, metade inferior no Pote 2
        const metade = Math.ceil(dados.length / 2)
        setPote1(dados.slice(0, metade))
        setPote2(dados.slice(metade))
    }
    load()
  }, [campeonatoId])

  async function handleSortear() {
      if (pote1.length === 0 || pote2.length === 0) return toast.error("Aguarde o carregamento dos times.")
      
      setLoading(true)
      
      // Lógica de embaralhamento interno (mantida)
      const seedsOrdenados: number[] = []
      const p1Random = [...pote1].sort(() => Math.random() - 0.5)
      const p2Random = [...pote2].sort(() => Math.random() - 0.5)

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
    <div className="w-full mt-4">
        {/* Visual dos Potes removido conforme solicitado */}
        
        <div className="text-center mb-4 text-xs text-gray-500">
            {times.length > 0 
                ? `${times.length} times qualificados identificados.` 
                : 'Carregando times...'}
        </div>

        <button 
            onClick={handleSortear} 
            disabled={loading || times.length === 0}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl uppercase tracking-widest text-xs transition shadow-lg shadow-green-900/20 disabled:opacity-50"
        >
            {loading ? 'Sorteando...' : 'Gerar Confrontos Automaticamente'}
        </button>
    </div>
  )
}