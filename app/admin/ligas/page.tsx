'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { criarCampeonato, listarCampeonatos } from '../../actions'
import toast from 'react-hot-toast'; 

// Mapeamento para nomes de exibição (melhorado para o visual)
const TIPOS_TORNEIO = {
    pontos_corridos: { icon: '🏆', label: 'Pontos Corridos', color: 'text-blue-400', border: 'border-blue-500/50' },
    mata_mata: { icon: '🥊', label: 'Mata-Mata', color: 'text-red-400', border: 'border-red-500/50' },
    copa: { icon: '🌍', label: 'Copa Mista', color: 'text-yellow-400', border: 'border-yellow-500/50' },
};

export default function AdminLigas() {
  const [ligas, setLigas] = useState<any[]>([])
  
  const [nome, setNome] = useState('')
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [tipo, setTipo] = useState('pontos_corridos')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarLigas()
  }, [])

  async function carregarLigas() {
    const dados = await listarCampeonatos()
    setLigas(dados)
  }

  async function handleCriarCampeonato() {
    if (!nome) return toast.error("Digite um nome para a liga!")
    setLoading(true)
    
    const res = await criarCampeonato(nome, Number(ano), tipo)
    
    if (res.success) {
      toast.success('Liga criada com sucesso!');
      setNome('')
      setAno(String(new Date().getFullYear()))
      setTipo('pontos_corridos')
      carregarLigas()
    } else {
      toast.error('Erro ao criar liga: ' + res.msg);
    }
    setLoading(false)
  }

  const getLigaInfo = (t: string) => TIPOS_TORNEIO[t as keyof typeof TIPOS_TORNEIO] || TIPOS_TORNEIO.pontos_corridos;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto text-white pb-20 font-sans">
      <Link href="/admin" className="text-gray-500 hover:text-white mb-4 inline-block text-sm">← Voltar ao Painel</Link>
      
      {/* TÍTULO CORRIGIDO - VISÍVEL E COM COR SÓLIDA PARA LEGIBILIDADE */}
      <h1 className="text-4xl font-extrabold mb-8 text-white">
        Meus <span className="text-transparent bg-clip-text bg-gradient-to-r from-cartola-gold to-yellow-600">Campeonatos</span>
      </h1>

      {/* --- CARD DE CRIAÇÃO --- */}
      <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-2xl shadow-xl border border-gray-800 mb-12">
        <h2 className="text-2xl font-bold mb-6 text-green-400 flex items-center gap-3">
          <span className="text-3xl">➕</span> Criar Nova Liga
        </h2>
        
        {/* GRID DE CRIAÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          
          {/* Nome */}
          <div className="md:col-span-2">
            <label htmlFor="nome" className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome da Liga</label>
            <input 
              id="nome"
              type="text" 
              value={nome} 
              onChange={e => setNome(e.target.value)} 
              placeholder="Ex: Copa do Brasil" 
              className="w-full p-3 rounded-lg bg-black border border-gray-700 text-white focus:outline-none focus:border-green-500 text-base"
            />
          </div>
          
          {/* Ano */}
          <div>
            <label htmlFor="temporada" className="block text-xs font-bold text-gray-400 uppercase mb-2">Temporada</label>
            <input 
              id="temporada"
              type="number" 
              value={ano} 
              onChange={e => setAno(e.target.value)} 
              className="w-full p-3 rounded-lg bg-black border border-gray-700 text-white focus:outline-none focus:border-green-500 text-center font-mono font-bold text-base"
            />
          </div>

          {/* Formato (Select Corrigido) */}
          <div>
            <label htmlFor="formato" className="block text-xs font-bold text-gray-400 uppercase mb-2">Formato</label>
            <div className="relative">
              <select 
                id="formato"
                value={tipo} 
                onChange={e => setTipo(e.target.value)} 
                // Estilo geral e forçado nas opções
                className="w-full p-3 rounded-lg bg-black border border-gray-700 text-white appearance-none focus:outline-none focus:border-green-500 pr-10 cursor-pointer text-base [&>option]:bg-gray-800 [&>option]:text-white"
              >
                {Object.entries(TIPOS_TORNEIO).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.icon} {value.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 pb-3">▼</div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button 
            onClick={handleCriarCampeonato} 
            disabled={loading || !nome || !ano}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-full transition shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? 'Criando...' : 'Criar Liga'}
          </button>
        </div>
      </div>

      {/* Título Ligas Ativas */}
      <h2 className="text-3xl font-bold mb-6 text-white">Ligas Ativas ({ligas.length})</h2>
      <div className="space-y-4">
        {ligas.map((liga) => {
          const info = getLigaInfo(liga.tipo)
          
          return (
            <div key={liga.id} className="bg-gray-900 p-6 rounded-xl shadow-md flex items-center justify-between border border-gray-800 hover:border-blue-600/50 transition group">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl filter drop-shadow-md">{info.icon}</span>
                  <h3 className="text-xl font-bold text-white group-hover:text-cartola-gold transition">{liga.nome}</h3>
                </div>
                
                <div className="flex gap-2">
                  <span className="bg-black/40 text-gray-400 text-xs px-2 py-1 rounded border border-gray-700 font-mono">
                    {liga.ano}
                  </span>
                  <span className={`bg-black/40 ${info.color} text-xs px-2 py-1 rounded border border-gray-700 font-bold uppercase tracking-wide`}>
                    {info.label}
                  </span>
                </div>
              </div>

              <Link 
                href={`/admin/ligas/${liga.id}`}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-lg transition shadow-lg shadow-blue-900/20 transform group-hover:translate-x-1"
              >
                Gerenciar ➜
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}