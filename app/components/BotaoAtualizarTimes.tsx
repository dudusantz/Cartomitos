'use client'

import { useState, useTransition, useEffect } from "react"
import { atualizarTodosDadosTimes } from "@/app/actions"
import { ModalConfirmacao } from "./ModalConfirmacao"

export function BotaoAtualizarTimes() {
    const [isPending, startTransition] = useTransition()
    const [feedback, setFeedback] = useState<{ msg: string, type: 'success' | 'error' | null }>({ msg: "", type: null })
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (feedback.msg) {
            const timer = setTimeout(() => {
                setFeedback({ msg: "", type: null })
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [feedback.msg])

    const executeUpdate = () => {
        startTransition(async () => {
            const res = await atualizarTodosDadosTimes()
            
            setFeedback({ 
                msg: res.msg, 
                type: res.success ? 'success' : 'error' 
            })
        })
    }

    return (
        <>
            {/* BOTÃO */}
            <button 
                onClick={() => setShowModal(true)}
                disabled={isPending}
                className={`
                    group relative inline-flex items-center justify-center gap-2 px-6 py-3 
                    text-sm font-bold text-white transition-all duration-300 ease-out 
                    rounded-full shadow-lg hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${isPending 
                        ? 'bg-slate-700 cursor-not-allowed opacity-80' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                    }
                `}
            >
                {isPending ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white/90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="tracking-wide">Atualizando...</span>
                    </>
                ) : (
                    <>
                        <svg className="w-5 h-5 transition-transform group-hover:rotate-180 duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="tracking-wide">Sincronizar Tudo</span>
                    </>
                )}
            </button>

            {/* MODAL */}
            <ModalConfirmacao
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={executeUpdate}
                titulo="Atualizar Todos os Times?"
                descricao="O sistema irá buscar o nome e escudo mais recentes na API do Cartola para TODOS os times cadastrados."
                textoBotao="Sim, Sincronizar"
                corBotao="blue"
            />

            {/* NOTIFICAÇÃO (TOAST) DARK MODE */}
            {feedback.msg && (
                <div className="fixed top-5 right-5 z-[100] animate-fadeIn">
                    <div className={`
                        flex items-center gap-4 p-4 min-w-[320px] max-w-md rounded-xl shadow-2xl border-l-4 backdrop-blur-md
                        transition-all duration-300 transform translate-x-0 ring-1 ring-white/10
                        ${feedback.type === 'success' 
                            ? 'bg-slate-800/95 border-green-500 text-slate-100' 
                            : 'bg-slate-800/95 border-red-500 text-slate-100'
                        }
                    `}>
                        {/* Ícone */}
                        <div className={`p-2 rounded-full ${feedback.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {feedback.type === 'success' ? (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                        </div>

                        {/* Texto */}
                        <div className="flex-1">
                            <h4 className={`font-bold text-sm ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                {feedback.type === 'success' ? 'Sucesso!' : 'Erro'}
                            </h4>
                            <p className="text-sm text-slate-300 mt-0.5 leading-tight">
                                {feedback.msg}
                            </p>
                        </div>

                        {/* Fechar */}
                        <button 
                            onClick={() => setFeedback({ msg: "", type: null })}
                            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}