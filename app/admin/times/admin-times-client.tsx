// app/admin/times/admin-times-client.tsx
'use client'

import { useState } from 'react';
import { useFormStatus, useFormState } from 'react-dom'; 
import { useRouter } from 'next/navigation';
import { 
    salvarTime,
    removerTime,
} from '@/app/actions';

// Define o tipo para o objeto Time
interface Time {
    id: number;
    time_id_cartola: number;
    nome: string;
    escudo: string;
    slug: string;
}

// ======================================================================================
// COMPONENTE: Modal de Confirmação (Estilo Ultra Dark)
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
        // Overlay escuro
        <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
            {/* Modal Box */}
            <div className="bg-gray-950 p-8 rounded-xl shadow-2xl border border-red-600/50 w-full max-w-md">
                
                {/* Título de Aviso */}
                <h3 className="text-2xl font-black mb-4 text-red-500 border-b border-gray-800 pb-3 flex items-center uppercase tracking-wider">
                    <svg className="w-6 h-6 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.398 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    AÇÃO CRÍTICA
                </h3>
                
                {/* Texto Aprimorado */}
                <p className="text-gray-300 text-base mb-6 leading-relaxed">
                    Confirme a remoção do time 
                    <span className="font-extrabold text-yellow-500 underline"> {timeNome}</span>.
                </p>
                <div className="text-red-300 text-sm italic border-l-4 border-red-500 pl-3 py-2 bg-gray-900 rounded-md">
                    <p className="font-bold">CONSEQUÊNCIA:</p>
                    <p className="text-xs mt-1">Este time será permanentemente excluído do banco de dados e removido de todas as ligas e históricos de pontuação.</p>
                </div>

                {/* Botões */}
                <div className="flex justify-end space-x-4 mt-8">
                    <button
                        onClick={onCancel}
                        className="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-5 rounded-md transition-colors text-sm"
                    >
                        Manter (Cancelar)
                    </button>
                    <button
                        onClick={onConfirm}
                        // Botão de Exclusão com foco e sombra
                        className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-2 px-5 rounded-md transition-colors text-sm shadow-xl shadow-red-900/50"
                    >
                        EXCLUIR AGORA
                    </button>
                </div>
            </div>
        </div>
    );
}

// ======================================================================================
// Componente auxiliar para o formulário (Client-Side)
// ======================================================================================
function FormularioAdicionar() {
    const initialState = { success: true, msg: '' };
    const [state, formAction] = useFormState(salvarTime, initialState);

    const SubmitButton = () => {
        const { pending } = useFormStatus();
        return (
            <button
                type="submit"
                disabled={pending}
                // Botão principal Yellow-500 com efeito "brilhante" (shadow)
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-extrabold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed shadow-xl shadow-yellow-700/50"
            >
                {pending ? 'Buscando e Salvando...' : 'ADICIONAR TIME'}
            </button>
        );
    };

    return (
        <form action={formAction} className="space-y-5">
            
            <input
                type="text"
                name="termo"
                placeholder="Nome do Time ou Cartoleiro..."
                required
                // Input com foco em Yellow-500 e fundo muito escuro
                className="w-full p-3 border border-gray-700 rounded-lg bg-black/30 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
            
            <SubmitButton />

            {state.msg && (
                <p className={`text-sm font-medium p-3 rounded-lg text-center ${state.success ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                    {state.msg}
                </p>
            )}
        </form>
    );
}


// ======================================================================================
// Componente Client-Side principal
// ======================================================================================
export default function AdminTimesClient({ initialTimes }: { initialTimes: Time[] }) {
    const router = useRouter();
    const [times, setTimes] = useState(initialTimes);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    
    const [showModal, setShowModal] = useState(false);
    const [timeParaExcluir, setTimeParaExcluir] = useState<{ id: number, nome: string } | null>(null);

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
            alert(result.msg);
        } else {
            alert(`Falha ao excluir: ${result.msg}`);
        }
    }

    const handleCancelExclusao = () => {
        setShowModal(false);
        setTimeParaExcluir(null);
    }


    return (
        <>
            <div className="w-full max-w-lg">
                
                {/* Cabeçalho da Página com Botão Voltar */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => router.back()}
                        // Botão Voltar com Ícone
                        className="flex items-center text-yellow-500 hover:text-yellow-400 transition-colors font-bold text-base uppercase tracking-wider"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        VOLTAR
                    </button>
                    {/* Aqui ficaria o título principal da página, que já está na page.tsx */}
                </div>

                {/* Card de Cadastro (Painel de Alto Contraste) */}
                <div 
                    className="
                        bg-gray-950 p-6 rounded-xl w-full mb-8 
                        border border-yellow-500/30 shadow-xl shadow-black/70
                    "
                >
                    <h2 className="text-xl font-bold mb-4 text-yellow-500 border-b border-gray-800 pb-2 uppercase tracking-wider">
                        Painel de Cadastro de Times
                    </h2>
                    <FormularioAdicionar />
                </div>
                
                {/* Seção da Lista de Times */}
                <div className="mt-4 w-full">
                    <h2 className="text-xl font-bold mb-4 text-gray-300 border-b border-gray-800 pb-2 uppercase tracking-wider">
                        Times Cadastrados ({times.length})
                    </h2>
                    
                    {times.length === 0 ? (
                        <div className="bg-gray-900 p-4 rounded-lg text-center border border-gray-800">
                            <p className="text-gray-400">Nenhum time cadastrado.</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {times.map((time) => (
                                // Cartão de lista em alto contraste
                                <li key={time.id} className="flex justify-between items-center p-3 bg-gray-950 border border-gray-800 rounded-lg shadow-lg hover:bg-black/50 transition-colors duration-200">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Escudo com borda fina de destaque */}
                                        <img 
                                            src={time.escudo} 
                                            alt={time.nome} 
                                            className="w-10 h-10 object-contain rounded-full border border-yellow-500/30 p-0.5 bg-black flex-shrink-0" 
                                        />
                                        <div className="min-w-0">
                                            {/* Nome do Time em destaque */}
                                            <div className="font-semibold text-base text-white truncate">{time.nome}</div>
                                            {/* Detalhe do ID do Cartola */}
                                            <div className="text-xs text-gray-400">ID: {time.time_id_cartola}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleClickRemover(time.time_id_cartola, time.nome)}
                                        disabled={loadingId === time.time_id_cartola}
                                        // Botão de exclusão
                                        className={`bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md text-sm transition-colors disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed`}
                                    >
                                        {loadingId === time.time_id_cartola ? '...' : 'Excluir'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

            </div>

            {/* Renderiza o Modal de Confirmação */}
            <ConfirmacaoExclusaoModal 
                show={showModal}
                timeNome={timeParaExcluir?.nome || ''}
                onConfirm={handleConfirmExclusao}
                onCancel={handleCancelExclusao}
            />
        </>
    );
}