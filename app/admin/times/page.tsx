'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { buscarTimeCartola, salvarTime, listarIdsTimesSalvos, removerTime } from '../../actions'

export default function AdminTimes() {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [idsSalvos, setIdsSalvos] = useState<number[]>([]) // Lista dos times que já temos

  // Ao abrir a tela, descobre quais times já estão salvos
  useEffect(() => {
    atualizarListaSalvos()
  }, [])

  async function atualizarListaSalvos() {
    const ids = await listarIdsTimesSalvos()
    setIdsSalvos(ids)
  }

  // Busca na API da Globo
  async function handleBuscar() {
    if (!busca) return
    setLoading(true)
    const dados = await buscarTimeCartola(busca)
    setResultados(dados || [])
    setLoading(false)
  }

  // Salva no Banco
  async function handleSalvar(time: any) {
    const resposta = await salvarTime(time)
    if (resposta.success) {
      setIdsSalvos([...idsSalvos, time.time_id]) // Atualiza visualmente na hora
    } else {
      alert(`❌ Erro: ${resposta.msg}`)
    }
  }

  // Remove do Banco
  async function handleRemover(timeId: number) {
    if(!confirm("Tem certeza que quer remover este time? Ele sairá das ligas também.")) return

    const resposta = await removerTime(timeId)
    if (resposta.success) {
      setIdsSalvos(idsSalvos.filter(id => id !== timeId)) // Remove da lista visual
    } else {
      alert("Erro ao remover.")
    }
  }

  return (
    <div className="p-10 max-w-4xl mx-auto min-h-screen text-white font-sans">
      
      <Link href="/admin" className="text-gray-500 hover:text-cartola-gold mb-6 inline-block transition">
        ← Voltar ao Painel
      </Link>

      <h1 className="text-3xl font-bold mb-8 text-white">Gerenciar Times</h1>

      {/* Área de Busca */}
      <div className="flex gap-4 mb-12">
        <input
          type="text"
          placeholder="Digite o nome do time no Cartola..."
          className="flex-1 p-4 rounded-lg bg-gray-800 text-white border border-gray-700 focus:border-cartola-gold outline-none text-lg placeholder-gray-500"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
        />
        <button 
          onClick={handleBuscar}
          disabled={loading}
          className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 font-bold transition disabled:opacity-50"
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {/* Lista de Resultados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resultados.map((time) => {
          const jaSalvo = idsSalvos.includes(time.time_id)

          return (
            <div key={time.time_id} className={`p-4 rounded-xl flex items-center justify-between transition-all border ${jaSalvo ? 'bg-green-900/20 border-green-500/50' : 'bg-gray-900 border-gray-800'}`}>
              
              <div className="flex items-center gap-4">
                <img src={time.url_escudo_png} alt={time.nome} className="w-12 h-12" />
                <div>
                  <p className={`font-bold ${jaSalvo ? 'text-green-400' : 'text-white'}`}>
                    {time.nome}
                  </p>
                  <p className="text-sm text-gray-400">{time.nome_cartola}</p>
                </div>
              </div>

              {/* Botão que muda de cor e função */}
              {jaSalvo ? (
                <button
                  onClick={() => handleRemover(time.time_id)}
                  className="bg-red-900/50 hover:bg-red-600 text-red-200 hover:text-white border border-red-800 px-4 py-2 rounded text-sm font-bold transition flex items-center gap-2"
                >
                  🗑️ Remover
                </button>
              ) : (
                <button
                  onClick={() => handleSalvar(time)}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm font-bold transition shadow-lg shadow-green-900/20"
                >
                  + Salvar
                </button>
              )}

            </div>
          )
        })}
      </div>
    </div>
  )
}