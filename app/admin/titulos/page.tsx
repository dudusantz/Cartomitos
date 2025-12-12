'use client'
import { useState, useEffect } from 'react'
import { listarTodosTimes, adicionarTituloManual, listarTitulosManuais, removerTituloManual } from '@/app/actions'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AdminTitulosPage() {
  const [times, setTimes] = useState<any[]>([])
  const [historico, setHistorico] = useState<any[]>([])
  
  // Form States
  const [timeId, setTimeId] = useState('')
  const [nomeTitulo, setNomeTitulo] = useState('')
  const [ano, setAno] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const t = await listarTodosTimes()
    const h = await listarTitulosManuais()
    setTimes(t)
    setHistorico(h)
  }

  async function handleSalvar() {
    if (!timeId || !nomeTitulo || !ano) return toast.error("Preencha todos os campos!")
    
    setLoading(true)
    const res = await adicionarTituloManual(Number(timeId), nomeTitulo, Number(ano))
    setLoading(false)

    if (res.success) {
        toast.success("Título adicionado à galeria!")
        setNomeTitulo('')
        carregarDados()
    } else {
        toast.error("Erro ao salvar.")
    }
  }

  async function handleExcluir(id: number) {
      if(!confirm("Remover este título do histórico?")) return;
      await removerTituloManual(id);
      toast.success("Título removido.");
      carregarDados();
  }

  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 p-6 md:p-10 animate-fadeIn">
      <div className="max-w-6xl mx-auto">
        
        {/* === HEADER === */}
        <div className="flex items-center justify-between mb-10 pb-6 border-b border-white/10">
            <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                    Histórico de <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-700">Campeões</span>
                </h1>
                <p className="text-xs text-gray-500 font-bold tracking-widest mt-1 uppercase">
                    Adicione conquistas antigas à galeria
                </p>
            </div>
            <Link 
                href="/admin" 
                className="group flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-wider"
            >
                <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Voltar
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* === COLUNA ESQUERDA: FORMULÁRIO === */}
            <div className="lg:col-span-1">
                <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl p-6 sticky top-8 shadow-2xl">
                    <div className="flex items-center gap-3 mb-6 text-yellow-500">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        <h2 className="font-bold text-sm uppercase tracking-widest text-white">Adicionar Conquista</h2>
                    </div>

                    <div className="space-y-5">
                        {/* Seleção de Time */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Time Campeão</label>
                            <div className="relative">
                                <select 
                                    className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none appearance-none cursor-pointer"
                                    value={timeId}
                                    onChange={(e) => setTimeId(e.target.value)}
                                >
                                    <option value="" className="text-gray-500">Selecione o time...</option>
                                    {times.map(t => (
                                        <option key={t.id} value={t.id}>{t.nome}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3.5 pointer-events-none text-gray-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </div>
                            </div>
                        </div>

                        {/* Nome do Campeonato */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Nome do Campeonato</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all placeholder-gray-600"
                                placeholder="Ex: Copa do Brasil"
                                value={nomeTitulo}
                                onChange={(e) => setNomeTitulo(e.target.value)}
                            />
                        </div>

                        {/* Ano */}
                        <div>
                            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Ano da Conquista</label>
                            <input 
                                type="number" 
                                className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-sm text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                                value={ano}
                                onChange={(e) => setAno(Number(e.target.value))}
                            />
                        </div>

                        <button 
                            onClick={handleSalvar}
                            disabled={loading}
                            className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-black uppercase tracking-wider py-3.5 rounded-xl hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    Adicionar Título
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* === COLUNA DIREITA: LISTA === */}
            <div className="lg:col-span-2">
                <div className="bg-[#1a1a1a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-[#1f1f1f] flex justify-between items-center">
                        <h3 className="font-bold text-gray-200 flex items-center gap-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Histórico de Conquistas
                        </h3>
                        <span className="text-xs bg-white/5 text-gray-500 px-2 py-1 rounded border border-white/5">
                            {historico.length} registros
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#121212] text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="p-5 w-24">Ano</th>
                                    <th className="p-5">Time</th>
                                    <th className="p-5">Campeonato</th>
                                    <th className="p-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {historico.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                                <p className="text-gray-500">Nenhum título manual cadastrado.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    historico.map((h: any) => (
                                        <tr key={h.id} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="p-5 font-mono font-bold text-yellow-500/80">{h.ano}</td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center p-1">
                                                        <img src={h.times?.escudo || h.times?.url_escudo_png} className="w-full h-full object-contain" />
                                                    </div>
                                                    <span className="font-bold text-gray-300">{h.times?.nome}</span>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <span className="bg-white/5 border border-white/5 px-3 py-1 rounded-full text-xs font-medium text-gray-400">
                                                    {h.nome_campeonato}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right">
                                                <button 
                                                    onClick={() => handleExcluir(h.id)}
                                                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                    title="Remover Título"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  )
}