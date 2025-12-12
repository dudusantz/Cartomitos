'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { criarCampeonato, atualizarCampeonato, listarCampeonatos, excluirCampeonato, finalizarCampeonato, reabrirCampeonato } from '../../actions'
import toast from 'react-hot-toast'; 

const TIPOS_TORNEIO = {
    pontos_corridos: { icon: '🏆', label: 'Pontos Corridos', style: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    mata_mata: { icon: '🥊', label: 'Mata-Mata', style: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    copa: { icon: '🌍', label: 'Copa Mista', style: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
};

export default function AdminLigas() {
  const [ligas, setLigas] = useState<any[]>([])
  const [filtro, setFiltro] = useState('ativas') // 'ativas' | 'finalizadas'
  const [busca, setBusca] = useState('')
  
  // Form States
  const [editandoId, setEditandoId] = useState<number | null>(null)
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

  function preencherEdicao(liga: any) {
      setEditandoId(liga.id)
      setNome(liga.nome)
      setAno(liga.ano)
      setTipo(liga.tipo)
      window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
      setEditandoId(null)
      setNome('')
      setAno(String(new Date().getFullYear()))
      setTipo('pontos_corridos')
  }

  async function handleSalvar() {
    if (!nome) return toast.error("Digite um nome para a liga!")
    setLoading(true)
    
    let res;
    if (editandoId) {
        res = await atualizarCampeonato(editandoId, nome, Number(ano), tipo)
    } else {
        res = await criarCampeonato(nome, Number(ano), tipo)
    }

    if (res.success) {
      toast.success(editandoId ? 'Liga atualizada!' : 'Liga criada!');
      cancelarEdicao()
      carregarLigas()
    } else {
      toast.error('Erro: ' + res.msg);
    }
    setLoading(false)
  }

  async function handleExcluir(id: number) {
      if(!confirm("Tem certeza absoluta? Isso apagará TODOS os jogos e a tabela dessa liga.")) return;
      const res = await excluirCampeonato(id);
      if(res.success) {
          toast.success("Liga excluída.");
          carregarLigas();
      } else {
          toast.error("Erro ao excluir.");
      }
  }

  async function handleFinalizar(id: number, statusAtual: boolean) {
      if (statusAtual) {
          if(!confirm("Finalizar campeonato? O campeão será enviado para a Sala de Troféus.")) return;
          await finalizarCampeonato(id);
          toast.success("Finalizado!");
      } else {
          if(!confirm("Reabrir campeonato?")) return;
          await reabrirCampeonato(id);
          toast.success("Reaberto!");
      }
      carregarLigas();
  }

  // Filtragem
  const ligasFiltradas = ligas.filter(l => {
      const matchStatus = filtro === 'ativas' ? l.ativo !== false : l.ativo === false;
      const matchBusca = l.nome.toLowerCase().includes(busca.toLowerCase());
      return matchStatus && matchBusca;
  });

  const getLigaInfo = (t: string) => TIPOS_TORNEIO[t as keyof typeof TIPOS_TORNEIO] || TIPOS_TORNEIO.pontos_corridos;

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 p-6 md:p-10 animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        
        {/* === HEADER === */}
        <div className="flex flex-col md:flex-row justify-between mb-8 pb-6 border-b border-white/10 gap-4">
            <div>
                <Link href="/admin" className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    ← Voltar ao Painel
                </Link>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter">
                    Gerenciar <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-700">Ligas</span>
                </h1>
            </div>
            
            {/* Stats Rápidos */}
            <div className="flex gap-4">
                <div className="bg-[#1a1a1a] border border-white/5 px-4 py-2 rounded-xl text-center">
                    <span className="block text-2xl font-black text-white">{ligas.filter(l => l.ativo !== false).length}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Ativas</span>
                </div>
                <div className="bg-[#1a1a1a] border border-white/5 px-4 py-2 rounded-xl text-center">
                    <span className="block text-2xl font-black text-gray-400">{ligas.filter(l => l.ativo === false).length}</span>
                    <span className="text-[10px] text-gray-600 uppercase font-bold">Histórico</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* === ESQUERDA: FORMULÁRIO (COLUNA MENOR) === */}
            <div className="lg:col-span-4 xl:col-span-3">
                <div className={`bg-[#1a1a1a] border ${editandoId ? 'border-yellow-500/30' : 'border-white/5'} rounded-3xl p-6 sticky top-8 shadow-2xl transition-colors`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`p-2 rounded-lg ${editandoId ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                            {editandoId ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            )}
                        </div>
                        <h2 className="font-bold text-sm uppercase tracking-widest text-white">
                            {editandoId ? 'Editar Liga' : 'Nova Liga'}
                        </h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nome</label>
                            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Brasileirão" className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-green-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Ano</label>
                            <input type="number" value={ano} onChange={e => setAno(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-green-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tipo</label>
                            <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-green-500 outline-none">
                                {Object.entries(TIPOS_TORNEIO).map(([key, value]) => (
                                    <option key={key} value={key}>{value.icon} {value.label}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex gap-2 mt-4">
                            {editandoId && (
                                <button onClick={cancelarEdicao} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition text-xs uppercase">
                                    Cancelar
                                </button>
                            )}
                            <button onClick={handleSalvar} disabled={loading || !nome} className={`flex-1 ${editandoId ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'} text-white font-bold py-3 rounded-xl transition shadow-lg disabled:opacity-50 text-xs uppercase tracking-wider`}>
                                {loading ? 'Salvando...' : (editandoId ? 'Atualizar' : 'Criar')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* === DIREITA: LISTA (COLUNA MAIOR) === */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                
                {/* Controles de Filtro */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#1a1a1a] p-2 rounded-2xl border border-white/5">
                    <div className="flex bg-[#121212] rounded-xl p-1 border border-white/5 w-full sm:w-auto">
                        <button 
                            onClick={() => setFiltro('ativas')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filtro === 'ativas' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            Em Andamento
                        </button>
                        <button 
                            onClick={() => setFiltro('finalizadas')}
                            className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filtro === 'finalizadas' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            Histórico
                        </button>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <input 
                            type="text" 
                            placeholder="Buscar liga..." 
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full bg-[#121212] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-green-500 outline-none transition-all"
                        />
                        <svg className="w-4 h-4 text-gray-600 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                </div>

                {/* Lista de Cards */}
                <div className="space-y-3">
                    {ligasFiltradas.length === 0 ? (
                        <div className="text-center py-20 bg-[#1a1a1a] rounded-3xl border border-dashed border-white/10">
                            <p className="text-gray-500 font-medium text-sm">Nenhuma liga encontrada.</p>
                        </div>
                    ) : (
                        ligasFiltradas.map((liga) => {
                            const info = getLigaInfo(liga.tipo)
                            const isAtivo = liga.ativo !== false;

                            return (
                                <div key={liga.id} className={`p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${isAtivo ? 'bg-[#1a1a1a] border-white/5 hover:border-white/20' : 'bg-[#121212] border-white/5 opacity-60 hover:opacity-100'}`}>
                                    
                                    <div className="flex items-center gap-5">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/5 ${isAtivo ? 'bg-[#121212]' : 'bg-black/40 grayscale'}`}>
                                            {isAtivo ? info.icon : '🏁'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className={`text-lg font-bold ${isAtivo ? 'text-white' : 'text-gray-400'}`}>{liga.nome}</h3>
                                                <button onClick={() => preencherEdicao(liga)} className="text-gray-600 hover:text-yellow-500 transition-colors" title="Editar Nome/Ano">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="bg-black/20 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded border border-white/5">{liga.ano}</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${info.style}`}>{info.label}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-auto border-t sm:border-t-0 border-white/5 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
                                        {/* Botão Finalizar */}
                                        <button 
                                            onClick={() => handleFinalizar(liga.id, isAtivo)}
                                            title={isAtivo ? "Finalizar Campeonato" : "Reabrir Campeonato"}
                                            className={`p-2 rounded-lg border transition-all ${isAtivo 
                                                ? 'text-yellow-500/50 hover:text-yellow-500 border-yellow-500/10 hover:bg-yellow-500/10' 
                                                : 'text-green-500 border-green-500/20 hover:bg-green-500/10'}`}
                                        >
                                            {isAtivo 
                                                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            }
                                        </button>

                                        {/* Botão Excluir */}
                                        <button 
                                            onClick={() => handleExcluir(liga.id)}
                                            title="Excluir Liga"
                                            className="p-2 rounded-lg text-red-500/50 hover:text-red-500 border border-red-500/10 hover:bg-red-500/10 transition-all"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                        
                                        <div className="w-px h-6 bg-white/10 mx-1"></div>

                                        <Link 
                                            href={`/admin/ligas/${liga.id}`}
                                            className="bg-white/5 hover:bg-white/10 text-white text-xs font-bold py-2.5 px-5 rounded-lg border border-white/10 transition-all hover:border-green-500/30 flex items-center gap-2"
                                        >
                                            Gerenciar
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </Link>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  )
}