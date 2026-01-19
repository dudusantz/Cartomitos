'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    buscarTimeCartola,
    salvarTimePorId, 
    removerTime,
} from '@/app/actions';
import { Search, Plus, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-gray-950 p-8 rounded-2xl shadow-2xl border border-red-600/30 w-full max-w-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-900"></div>
                <h3 className="text-2xl font-black mb-4 text-red-500 flex items-center gap-3 uppercase tracking-wider">
                    <Trash2 className="w-6 h-6" />
                    Excluir Time?
                </h3>
                <p className="text-gray-300 text-base mb-6 leading-relaxed">
                    Você tem certeza que deseja remover o time <strong className="text-white text-lg block mt-1">{timeNome}</strong>?
                </p>
                <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 mb-8">
                    <p className="text-red-400 text-xs font-bold uppercase mb-1">Atenção</p>
                    <p className="text-red-300/80 text-sm">Isso removerá o time de todas as ligas e apagará o histórico de pontuações dele.</p>
                </div>
                <div className="flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-900/20 transition-all hover:scale-105">
                        Sim, Excluir
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
        <div className="space-y-6">
            {/* Barra de Pesquisa */}
            <form onSubmit={handleBuscar} className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    {buscando ? <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" /> : <Search className="w-5 h-5 text-gray-500 group-focus-within:text-yellow-500 transition-colors" />}
                </div>
                <input
                    type="text"
                    value={termo}
                    onChange={(e) => setTermo(e.target.value)}
                    placeholder="Digite o nome do time..."
                    className="w-full pl-12 pr-32 py-4 bg-black/40 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 outline-none transition-all text-lg"
                />
                <button 
                    type="submit" 
                    disabled={buscando || !termo.trim()}
                    className="absolute right-2 top-2 bottom-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Buscar
                </button>
            </form>

            {/* Mensagens de Feedback */}
            {mensagem && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-fadeIn ${mensagem.tipo === 'sucesso' ? 'bg-green-900/20 text-green-400 border border-green-900/50' : 'bg-red-900/20 text-red-400 border border-red-900/50'}`}>
                    {mensagem.tipo === 'sucesso' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{mensagem.texto}</span>
                </div>
            )}

            {/* Lista de Resultados da Busca */}
            {resultados.length > 0 && (
                <div className="space-y-2 animate-fadeIn">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">Resultados Encontrados ({resultados.length})</h3>
                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                        {resultados.map((time) => (
                            <div key={time.time_id} className="flex items-center justify-between p-3 bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <img src={time.url_escudo_png} alt={time.nome} className="w-12 h-12 object-contain" />
                                    <div>
                                        <h4 className="font-bold text-white text-base group-hover:text-yellow-500 transition-colors">{time.nome}</h4>
                                        <p className="text-gray-500 text-xs">{time.nome_cartola}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAdicionar(time.time_id)}
                                    disabled={adicionandoId === time.time_id}
                                    className="bg-gray-800 hover:bg-green-600 text-white p-2.5 rounded-lg transition-all disabled:opacity-50 border border-gray-700 hover:border-green-500"
                                    title="Adicionar Time"
                                >
                                    {adicionandoId === time.time_id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <Plus className="w-5 h-5" />
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
    const router = useRouter();
    const [times, setTimes] = useState(initialTimes);
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
        router.refresh(); // Garante que o servidor também saiba da atualização
    };

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
        <div className="max-w-6xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors font-medium text-sm uppercase tracking-widest">
                    ← Voltar
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* COLUNA 1: Pesquisa */}
                <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 to-yellow-400"></div>
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Search className="w-5 h-5 text-yellow-500" />
                        Pesquisar & Adicionar
                    </h2>
                    <PainelBusca onTimeAdicionado={atualizarLista} />
                </div>

                {/* COLUNA 2: Lista de Cadastrados */}
                <div className="bg-gray-950 p-6 rounded-2xl border border-gray-800 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            Times na Base
                        </h2>
                        <span className="bg-gray-800 text-gray-300 text-xs font-bold px-3 py-1 rounded-full">
                            {times.length}
                        </span>
                    </div>
                    
                    {times.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 border-2 border-dashed border-gray-800 rounded-xl">
                            Nenhum time cadastrado ainda.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                            {times.map((time) => (
                                <div key={time.id} className="flex justify-between items-center p-3 bg-black/40 border border-gray-800/50 rounded-xl hover:border-gray-700 transition-all group">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <img src={time.escudo} alt={time.nome} className="w-10 h-10 object-contain" />
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-200 truncate text-sm group-hover:text-white transition-colors">{time.nome}</p>
                                            <p className="text-xs text-gray-500">ID: {time.time_id_cartola}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleClickRemover(time.time_id_cartola, time.nome)}
                                        disabled={loadingId === time.time_id_cartola}
                                        className="text-gray-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                        title="Remover"
                                    >
                                        {loadingId === time.time_id_cartola ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmacaoExclusaoModal 
                show={showModal}
                timeNome={timeParaExcluir?.nome || ''}
                onConfirm={handleConfirmExclusao}
                onCancel={() => setShowModal(false)}
            />
        </div>
    );
}