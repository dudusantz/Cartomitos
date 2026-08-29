'use client'

import { useState } from 'react';
import { 
    buscarTimeCartola,
    salvarTimePorId, 
    removerTime,
} from '@/app/actions';
import { AlertCircle, CheckCircle, Loader2, Plus, Search, Trash2, UsersRound } from 'lucide-react';

// Tipos
interface Time {
    id: number;
    time_id_cartola: number;
    nome: string;
    escudo: string;
    slug: string;
}

interface ResultadoBusca {
    time_id: number;
    nome: string;
    nome_cartola: string;
    url_escudo_png: string;
}

// ======================================================================================
// COMPONENTE: Modal de Confirmação
// ======================================================================================
interface ModalProps {
    show: boolean;
    timeNome: string;
    onConfirm: () => void;
    onCancel: () => void;
}

function ConfirmacaoExclusaoModal({ show, timeNome, onConfirm, onCancel }: ModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-red-500/25 bg-[#141614] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)] md:p-7">
                <h3 className="flex items-center gap-3 text-xl font-black tracking-[-0.025em] text-white">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.07] text-red-400"><Trash2 className="h-5 w-5" strokeWidth={1.8} /></span>
                    Excluir time
                </h3>
                <p className="mt-5 text-sm leading-relaxed text-gray-400">
                    Tem certeza que deseja remover <strong className="font-bold text-white">{timeNome}</strong>?
                </p>
                <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/[0.045] p-4">
                    <p className="text-xs leading-relaxed text-red-300/75">O time será removido de todas as ligas e seu histórico de pontuações será apagado.</p>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onCancel} className="h-10 rounded-lg border border-white/[0.09] px-4 text-xs font-bold text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="h-10 rounded-lg bg-red-600 px-4 text-xs font-bold text-white transition-colors hover:bg-red-500 active:translate-y-px">
                        Excluir time
                    </button>
                </div>
            </div>
        </div>
    );
}

// ======================================================================================
// NOVO COMPONENTE: Painel de Busca e Adição
// ======================================================================================
function PainelBusca({ onTimeAdicionado }: { onTimeAdicionado: (time: Time) => void }) {
    const [termo, setTermo] = useState('');
    const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
    const [buscando, setBuscando] = useState(false);
    const [adicionandoId, setAdicionandoId] = useState<number | null>(null);
    const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);

    const handleBuscar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!termo.trim()) return;

        setBuscando(true);
        setMensagem(null);
        setResultados([]);

        const res = await buscarTimeCartola(termo);
        setResultados(res || []);
        setBuscando(false);

        if (!res || res.length === 0) {
            setMensagem({ tipo: 'erro', texto: 'Nenhum time encontrado.' });
        }
    };

    const handleAdicionar = async (timeId: number) => {
        setAdicionandoId(timeId);
        setMensagem(null);
        
        // Chama a nova função que salva pelo ID
        const res = await salvarTimePorId(timeId);
        
        if (res.success && res.time) {
            setMensagem({ tipo: 'sucesso', texto: res.msg });
            // Atualiza a lista principal imediatamente
            onTimeAdicionado(res.time);
            // Remove o time da lista de resultados visualmente
            setResultados(prev => prev.filter(t => t.time_id !== timeId));
        } else {
            setMensagem({ tipo: 'erro', texto: res.msg || 'Erro desconhecido' });
        }
        setAdicionandoId(null);
    };

    return (
        <div className="space-y-5">
            <form onSubmit={handleBuscar} className="group flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        {buscando ? <Loader2 className="h-4 w-4 animate-spin text-yellow-500" /> : <Search className="h-4 w-4 text-gray-600 transition-colors group-focus-within:text-yellow-500" strokeWidth={1.8} />}
                    </div>
                    <input
                        type="text"
                        value={termo}
                        onChange={(e) => setTermo(e.target.value)}
                        placeholder="Digite o nome do time"
                        className="h-11 w-full rounded-lg border border-white/[0.09] bg-[#0e100e] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-700 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10"
                    />
                </div>
                <button 
                    type="submit" 
                    disabled={buscando || !termo.trim()}
                    className="h-11 rounded-lg bg-yellow-500 px-6 text-[10px] font-black uppercase tracking-[0.1em] text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-35 active:translate-y-px"
                >
                    {buscando ? 'Buscando...' : 'Buscar time'}
                </button>
            </form>

            {/* Mensagens de Feedback */}
            {mensagem && (
                <div className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs animate-fadeIn ${mensagem.tipo === 'sucesso' ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400' : 'border-red-500/20 bg-red-500/[0.06] text-red-400'}`}>
                    {mensagem.tipo === 'sucesso' ? <CheckCircle className="h-4 w-4" strokeWidth={1.8} /> : <AlertCircle className="h-4 w-4" strokeWidth={1.8} />}
                    <span className="font-medium">{mensagem.texto}</span>
                </div>
            )}

            {/* Lista de Resultados da Busca */}
            {resultados.length > 0 && (
                <div className="animate-fadeIn">
                    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">Resultados encontrados ({resultados.length})</h3>
                    <div className="grid max-h-[20rem] gap-2 overflow-y-auto pr-1 custom-scrollbar md:grid-cols-2">
                        {resultados.map((time) => (
                            <div key={time.time_id} className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-[#0e100e] p-3 transition-colors hover:border-yellow-500/20">
                                <div className="flex min-w-0 items-center gap-3">
                                    <img src={time.url_escudo_png} alt={`Escudo do ${time.nome}`} className="h-10 w-10 shrink-0 object-contain" />
                                    <div className="min-w-0">
                                        <h4 className="truncate text-sm font-bold text-white">{time.nome}</h4>
                                        <p className="truncate text-[10px] text-gray-600">{time.nome_cartola}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAdicionar(time.time_id)}
                                    disabled={adicionandoId === time.time_id}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-yellow-500/20 bg-yellow-500/[0.06] text-yellow-500 transition-colors hover:bg-yellow-500 hover:text-black disabled:opacity-50"
                                    title="Adicionar time"
                                    aria-label={`Adicionar ${time.nome}`}
                                >
                                    {adicionandoId === time.time_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" strokeWidth={2} />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ======================================================================================
// COMPONENTE PRINCIPAL
// ======================================================================================
export default function AdminTimesClient({ initialTimes }: { initialTimes: Time[] }) {
    const [times, setTimes] = useState(initialTimes);
    const [buscaLocal, setBuscaLocal] = useState('');
    const [loadingId, setLoadingId] = useState<number | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [timeParaExcluir, setTimeParaExcluir] = useState<{ id: number, nome: string } | null>(null);

    // Função que atualiza a lista automaticamente quando um time é adicionado
    const atualizarLista = (novoTime: Time) => {
        setTimes(prev => {
            // Verifica se o time já está na lista para não duplicar visualmente
            if (prev.some(t => t.time_id_cartola === novoTime.time_id_cartola)) {
                return prev.map(t => t.time_id_cartola === novoTime.time_id_cartola ? novoTime : t);
            }
            return [novoTime, ...prev];
        });
    };

    const timesFiltrados = times.filter(time =>
        time.nome.toLowerCase().includes(buscaLocal.toLowerCase()) ||
        String(time.time_id_cartola).includes(buscaLocal)
    );

    const handleClickRemover = (timeIdCartola: number, timeNome: string) => {
        setTimeParaExcluir({ id: timeIdCartola, nome: timeNome });
        setShowModal(true);
    }
    
    const handleConfirmExclusao = async () => {
        if (!timeParaExcluir) return;
        setShowModal(false);
        setLoadingId(timeParaExcluir.id);

        const result = await removerTime(timeParaExcluir.id);
        setLoadingId(null);
        setTimeParaExcluir(null);

        if (result.success) {
            setTimes(prev => prev.filter(time => time.time_id_cartola !== timeParaExcluir.id));
        } else {
            alert(`Falha ao excluir: ${result.msg}`);
        }
    }

    return (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#141614]">
                <div className="flex items-center gap-3 border-b border-white/[0.07] bg-[#171917] px-5 py-4 md:px-6">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-yellow-500/20 bg-yellow-500/[0.07] text-yellow-500">
                        <Search className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-sm font-bold text-white">Adicionar time</h2>
                        <p className="mt-0.5 text-[11px] text-gray-600">Pesquise pelo nome cadastrado no Cartola.</p>
                    </div>
                </div>
                <div className="p-5 md:p-6">
                    <PainelBusca onTimeAdicionado={atualizarLista} />
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121412]">
                <div className="flex flex-col gap-4 border-b border-white/[0.07] bg-[#161816] p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
                    <div className="flex items-center gap-3">
                        <UsersRound className="h-5 w-5 text-yellow-500" strokeWidth={1.7} aria-hidden="true" />
                        <div>
                            <h2 className="text-sm font-bold text-white">Times cadastrados</h2>
                            <p className="mt-0.5 text-[10px] text-gray-600">{times.length} {times.length === 1 ? 'time na base' : 'times na base'}</p>
                        </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" strokeWidth={1.8} aria-hidden="true" />
                        <input
                            type="search"
                            value={buscaLocal}
                            onChange={event => setBuscaLocal(event.target.value)}
                            placeholder="Filtrar times cadastrados"
                            className="h-10 w-full rounded-lg border border-white/[0.09] bg-[#0e100e] pl-10 pr-3 text-sm text-white outline-none transition-colors placeholder:text-gray-700 focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/10"
                        />
                    </div>
                </div>
                    
                {times.length === 0 ? (
                    <div className="px-5 py-16 text-center">
                        <UsersRound className="mx-auto h-7 w-7 text-gray-700" strokeWidth={1.5} aria-hidden="true" />
                        <p className="mt-3 text-sm font-medium text-gray-500">Nenhum time cadastrado.</p>
                        <p className="mt-1 text-xs text-gray-700">Use a busca acima para adicionar o primeiro time.</p>
                    </div>
                ) : timesFiltrados.length === 0 ? (
                    <div className="px-5 py-14 text-center">
                        <p className="text-sm font-medium text-gray-500">Nenhum time corresponde à busca.</p>
                    </div>
                ) : (
                    <div className="grid max-h-[38rem] gap-px overflow-y-auto bg-white/[0.05] custom-scrollbar md:grid-cols-2">
                        {timesFiltrados.map((time) => (
                            <article key={time.id} className="group flex items-center justify-between bg-[#121412] px-4 py-3.5 transition-colors hover:bg-[#171917] md:px-5">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#0d0f0d]">
                                        <img src={time.escudo} alt={`Escudo do ${time.nome}`} className="h-8 w-8 object-contain" />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-bold text-gray-200 transition-colors group-hover:text-white">{time.nome}</p>
                                        <p className="mt-0.5 font-mono text-[10px] text-gray-600">ID {time.time_id_cartola}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleClickRemover(time.time_id_cartola, time.nome)}
                                    disabled={loadingId === time.time_id_cartola}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-red-500/[0.07] hover:text-red-400 disabled:opacity-50"
                                    title="Remover time"
                                    aria-label={`Remover ${time.nome}`}
                                >
                                    {loadingId === time.time_id_cartola ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" strokeWidth={1.8} />}
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <ConfirmacaoExclusaoModal 
                show={showModal}
                timeNome={timeParaExcluir?.nome || ''}
                onConfirm={handleConfirmExclusao}
                onCancel={() => setShowModal(false)}
            />
        </div>
    );
}
