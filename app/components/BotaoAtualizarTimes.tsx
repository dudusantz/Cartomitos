'use client'

import { useState, useTransition, useEffect } from "react"
import { AlertCircle, CheckCircle, Loader2, RefreshCw, X } from "lucide-react"
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
            <button 
                onClick={() => setShowModal(true)}
                disabled={isPending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.07] px-4 text-[10px] font-bold uppercase tracking-[0.1em] text-yellow-500 transition-colors hover:border-yellow-500/35 hover:bg-yellow-500/[0.11] focus:outline-none focus:ring-2 focus:ring-yellow-400/60 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px"
            >
                {isPending ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} aria-hidden="true" />
                        Sincronizando...
                    </>
                ) : (
                    <>
                        <RefreshCw className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        Sincronizar times
                    </>
                )}
            </button>

            {/* MODAL */}
            <ModalConfirmacao
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={executeUpdate}
                titulo="Sincronizar todos os times?"
                descricao="O sistema buscará os nomes e escudos mais recentes de todos os times cadastrados."
                textoBotao="Sincronizar"
                corBotao="yellow"
            />

            {/* NOTIFICAÇÃO (TOAST) DARK MODE */}
            {feedback.msg && (
                <div className="fixed right-4 top-4 z-[100] animate-fadeIn sm:right-5 sm:top-5">
                    <div className={`flex w-[calc(100vw-2rem)] max-w-sm items-center gap-3 rounded-xl border bg-[#171917]/95 p-4 shadow-2xl backdrop-blur-md ${feedback.type === 'success' ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                        <div className={feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}>
                            {feedback.type === 'success' ? (
                                <CheckCircle className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                            ) : (
                                <AlertCircle className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                            )}
                        </div>

                        <div className="flex-1">
                            <h4 className={`text-xs font-bold ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {feedback.type === 'success' ? 'Sincronização concluída' : 'Erro na sincronização'}
                            </h4>
                            <p className="mt-1 text-xs leading-relaxed text-gray-400">
                                {feedback.msg}
                            </p>
                        </div>

                        <button 
                            onClick={() => setFeedback({ msg: "", type: null })}
                            className="rounded p-1 text-gray-600 transition-colors hover:text-white"
                            aria-label="Fechar notificação"
                        >
                            <X className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
