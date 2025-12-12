import Link from 'next/link'
import { listarAnosHistorico } from '@/app/actions'
import { supabase } from '@/lib/supabase'
import BotaoExcluirHistorico from '../components/BotaoExcluirHistorico'

export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HistoricoPage({ searchParams }: PageProps) {
  // 1. Pega os parâmetros da URL para saber se é Ranking ou Recordes
  const s = await searchParams
  const tipo = (typeof s.tipo === 'string' && s.tipo === 'recordes') ? 'recordes' : 'ranking'
  
  // 2. Busca os dados corretos
  const anos = await listarAnosHistorico(tipo)

  // 3. Verifica se é Admin
  const { data: { session } } = await supabase.auth.getSession()
  const isAdmin = session?.user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL

  // 4. Configura textos e links dinamicamente
  const titulo = tipo === 'recordes' ? 'Galeria de Recordes' : 'Arquivo de Rankings'
  const descricao = tipo === 'recordes' ? 'Histórico das maiores pontuações.' : 'Rankings finalizados e salvos.'
  const icone = tipo === 'recordes' ? '🏅' : '🏆'
  
  // AQUI ESTÁ A CORREÇÃO DO BOTÃO VOLTAR:
  const linkVoltar = tipo === 'recordes' ? '/recordes' : '/ranking'

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-10 animate-fadeIn font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* --- HEADER --- */}
        <div className="flex items-center gap-6 mb-12 pb-8 border-b border-white/10">
            <Link 
                href={linkVoltar} 
                className="bg-white/5 hover:bg-white/10 border border-white/5 p-3 rounded-xl text-gray-400 hover:text-white transition-all hover:scale-105 active:scale-95"
            >
                ← Voltar
            </Link>
            <div>
                <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter flex items-center gap-3">
                    <span className="text-blue-500">{icone}</span> {titulo}
                </h1>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest mt-1">{descricao}</p>
            </div>
        </div>

        {/* --- CONTEÚDO --- */}
        {anos.length === 0 ? (
            // Empty State (Bonito)
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#121212] p-12 text-center shadow-2xl">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center mb-6 border border-white/10 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]">
                        <span className="text-4xl opacity-50 grayscale">📭</span> 
                    </div>
                    
                    <h3 className="text-2xl font-bold text-white mb-3">
                        Nenhum {tipo === 'recordes' ? 'recorde' : 'ranking'} arquivado
                    </h3>
                    
                    <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed mb-8">
                        {tipo === 'recordes' 
                            ? 'A galeria de recordes está vazia. Salve as maiores pontuações da temporada para que elas apareçam aqui.' 
                            : 'O arquivo de temporadas está vazio. Ao encerrar um campeonato, salve o ranking final para consultá-lo no futuro.'}
                    </p>

                    <Link 
                        href={linkVoltar}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all hover:scale-105 shadow-lg shadow-blue-900/20 border border-blue-500/50"
                    >
                        {tipo === 'recordes' ? 'Salvar Recordes Agora' : 'Ver Ranking Atual'}
                    </Link>
                </div>
            </div>
        ) : (
            // Lista de Histórico
            <div className="grid gap-4">
                {anos.map((item: any) => (
                    <div 
                        key={item.ano} 
                        className="group flex items-stretch bg-[#121212] border border-white/5 rounded-2xl hover:border-blue-500/30 hover:bg-[#1a1a1a] transition-all shadow-lg overflow-hidden"
                    >
                        {/* Link Principal */}
                        <Link 
                            href={`/historico/${item.ano}?tipo=${tipo}`}
                            className="flex-1 flex items-center justify-between p-6 pr-4"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl flex items-center justify-center font-black text-xl group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-500 transition-all">
                                    {item.ano}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors">
                                        {item.titulo || (tipo === 'recordes' ? `Recordes ${item.ano}` : `Ranking ${item.ano}`)}
                                    </h2>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1 flex items-center gap-2">
                                        <span>📅 Salvo em {new Date(item.data_salvamento).toLocaleDateString('pt-BR')}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="text-gray-600 group-hover:text-white transition-transform group-hover:translate-x-2 font-bold text-sm uppercase tracking-widest mr-2">
                                Ver {tipo === 'recordes' ? 'Lista' : 'Tabela'} ➜
                            </div>
                        </Link>

                        {/* Botão Excluir (Lixeira) */}
                        {isAdmin && (
                            <div className="flex items-center justify-center border-l border-white/10 px-4 bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer">
                                <BotaoExcluirHistorico ano={item.ano} tipo={tipo} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  )
}