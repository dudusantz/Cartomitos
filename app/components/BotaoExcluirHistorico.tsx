'use client'

import { excluirHistorico } from '@/app/actions'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Props {
    ano: number
    tipo: 'ranking' | 'recordes'
}

export default function BotaoExcluirHistorico({ ano, tipo }: Props) {
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false) // Controla a visibilidade do modal
    const router = useRouter()

    // 1. Abre o modal ao clicar na lixeira
    function handleOpenModal(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setShowModal(true)
    }

    // 2. Fecha o modal sem fazer nada
    function handleCancel(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setShowModal(false)
    }

    // 3. Executa a exclusão de fato
    async function handleConfirmDelete(e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()

        setLoading(true)
        // Fecha o modal imediatamente para dar feedback visual ou pode esperar
        // Optei por manter aberto com loading ou fechar. Vamos manter a UI limpa:
        setShowModal(false) 

        const res = await excluirHistorico(ano, tipo)
        setLoading(false)

        if (res.success) {
            toast.success(res.msg, {
                icon: '🗑️',
                style: {
                    borderRadius: '10px',
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid #333'
                },
            })
            router.refresh()
        } else {
            toast.error(res.msg)
        }
    }

    return (
        <>
            {/* --- BOTÃO DE ACIONAMENTO (LIXEIRA) --- */}
            <button 
                onClick={handleOpenModal}
                disabled={loading}
                className="group relative p-3 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all duration-300 ease-out hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Excluir permanentemente"
            >
                {loading ? (
                    <div className="w-5 h-5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                ) : (
                    <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                )}
            </button>

            {/* --- MODAL DE CONFIRMAÇÃO (POP-UP) --- */}
            {showModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    
                    {/* Backdrop (Fundo escuro desfocado) */}
                    <div 
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
                        onClick={handleCancel} // Clicar fora fecha
                    />

                    {/* Card do Modal */}
                    <div className="relative bg-[#151515] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Faixa de alerta no topo */}
                        <div className="h-1 w-full bg-red-600" />

                        <div className="p-6 text-center">
                            {/* Ícone de Alerta */}
                            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/10 mb-4 border border-red-500/20">
                                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">
                                Excluir Histórico?
                            </h3>
                            
                            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                                Você está prestes a apagar permanentemente o 
                                <strong className="text-white"> {tipo === 'recordes' ? 'Recorde' : 'Ranking'} de {ano}</strong>.
                                <br/>
                                <span className="text-red-400 text-xs block mt-2 font-bold uppercase tracking-wider">Essa ação é irreversível.</span>
                            </p>

                            {/* Botões de Ação */}
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-bold transition-colors w-full"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-red-900/20 w-full flex items-center justify-center gap-2"
                                >
                                    <span>🗑️</span> Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}