'use client'

import { finalizarCampeonato, reabrirCampeonato, checarStatusLiga } from '@/app/actions' //
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Trophy, X, RotateCcw, Lock } from 'lucide-react'

interface Props {
    campeonatoId: number
}

export default function BotaoFinalizarCampeonato({ campeonatoId }: Props) {
    const [loading, setLoading] = useState(false)
    const [ativo, setAtivo] = useState(true) // Controla qual botão aparece
    const [verificando, setVerificando] = useState(true)
    
    // Modais
    const [showConfirm, setShowConfirm] = useState(false)
    const [showReabrir, setShowReabrir] = useState(false)
    const [showPodium, setShowPodium] = useState(false)
    const [podiumData, setPodiumData] = useState<any[]>([])
    
    const router = useRouter()

    // Verifica status ao carregar o componente
    useEffect(() => {
        verificarStatus()
    }, [campeonatoId])

    async function verificarStatus() {
        const isAtivo = await checarStatusLiga(campeonatoId)
        setAtivo(isAtivo)
        setVerificando(false)
    }

    // --- AÇÃO: FINALIZAR ---
    async function handleFinalizar() {
        setLoading(true)
        setShowConfirm(false)

        const res = await finalizarCampeonato(campeonatoId)
        setLoading(false)

        if (res.success) {
            toast.success(res.msg)
            setAtivo(false) // Muda o botão para "Reabrir"
            if (res.podium && res.podium.length > 0) {
                setPodiumData(res.podium)
                setShowPodium(true)
                dispararConfete()
            }
            router.refresh()
        } else {
            toast.error(res.msg)
        }
    }

    // --- AÇÃO: REABRIR ---
    async function handleReabrir() {
        setLoading(true)
        setShowReabrir(false)

        const res = await reabrirCampeonato(campeonatoId)
        setLoading(false)

        if (res.success) {
            toast.success("Campeonato reaberto! Os jogos podem ser editados novamente.")
            setAtivo(true) // Muda o botão para "Encerrar"
            router.refresh()
        } else {
            toast.error(res.msg)
        }
    }

    function dispararConfete() {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#FFD700', '#C0C0C0', '#CD7F32'],
                zIndex: 9999
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#FFD700', '#C0C0C0', '#CD7F32'],
                zIndex: 9999
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    const fecharPodium = () => {
        setShowPodium(false)
        router.refresh()
    }

    if (verificando) return null; // Não mostra nada enquanto carrega

    return (
        <>
            {/* --- BOTÃO DE AÇÃO (ALTERNÁVEL) --- */}
            {ativo ? (
                // MODO: ENCERRAR (Vermelho)
                <button 
                    onClick={() => setShowConfirm(true)}
                    disabled={loading}
                    className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2"
                >
                    <Trophy size={14} /> Encerrar
                </button>
            ) : (
                // MODO: REABRIR (Verde)
                <button 
                    onClick={() => setShowReabrir(true)}
                    disabled={loading}
                    className="bg-green-600/10 hover:bg-green-600 text-green-500 hover:text-white border border-green-600/20 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition flex items-center gap-2"
                >
                    <RotateCcw size={14} /> Reabrir Liga
                </button>
            )}

            {/* --- MODAL CONFIRMAR ENCERRAMENTO --- */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#151515] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-red-500/20">
                            ⚠️
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Encerrar Temporada?</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Isso finalizará o campeonato e consagrará o campeão. <br/>
                            <span className="font-bold text-red-400 mt-2 block">Você poderá reabrir depois se precisar.</span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-gray-300">Cancelar</button>
                            <button onClick={handleFinalizar} disabled={loading} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-sm text-white shadow-lg">
                                {loading ? '...' : 'Sim, Encerrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL CONFIRMAR REABERTURA --- */}
            {showReabrir && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#151515] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-green-500/20">
                            🔓
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Reabrir Campeonato?</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            A liga voltará para o status "Em Andamento". <br/>
                            Você poderá editar placares e adicionar rodadas novamente.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowReabrir(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-gray-300">Cancelar</button>
                            <button onClick={handleReabrir} disabled={loading} className="flex-1 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-sm text-white shadow-lg">
                                {loading ? '...' : 'Sim, Reabrir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE PÓDIO --- */}
            {showPodium && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in zoom-in-95 duration-300">
                    <div className="relative max-w-2xl w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-yellow-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden">
                        
                        <div className="absolute top-4 right-4 z-50">
                            <button onClick={fecharPodium} className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-1 relative z-10 flex items-center justify-center gap-3">
                           <Trophy className="text-yellow-500 w-8 h-8 md:w-10 md:h-10" /> Campeões
                        </h2>
                        <p className="text-yellow-500 text-xs font-bold uppercase tracking-[0.4em] mb-10 relative z-10">
                            Hall da Fama Atualizado
                        </p>

                        <div className="flex flex-col md:flex-row items-end justify-center gap-6 relative z-10 mb-12">
                            {/* 2º LUGAR */}
                            {podiumData[1] && (
                                <div className="order-2 md:order-1 flex flex-col items-center">
                                    <div className="relative mb-3">
                                        <div className="w-20 h-20 rounded-full bg-gray-800 border-4 border-gray-400 flex items-center justify-center shadow-lg shadow-gray-500/20">
                                            <img src={podiumData[1].escudo || podiumData[1].url_escudo_png} className="w-14 h-14 object-contain" />
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gray-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full border border-white">2º</div>
                                    </div>
                                    <span className="text-gray-300 font-bold text-sm max-w-[100px] truncate">{podiumData[1].nome}</span>
                                </div>
                            )}

                            {/* 1º LUGAR */}
                            {podiumData[0] && (
                                <div className="order-1 md:order-2 flex flex-col items-center -mt-8">
                                    <div className="relative mb-4">
                                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-600 to-yellow-800 border-4 border-yellow-400 flex items-center justify-center shadow-[0_0_30px_rgba(234,179,8,0.4)]">
                                            <img src={podiumData[0].escudo || podiumData[0].url_escudo_png} className="w-20 h-20 object-contain drop-shadow-md" />
                                        </div>
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full border-2 border-white shadow-lg">CAMPEÃO</div>
                                    </div>
                                    <span className="text-white font-black text-lg md:text-xl uppercase tracking-wider">{podiumData[0].nome}</span>
                                </div>
                            )}

                            {/* 3º LUGAR */}
                            {podiumData[2] && (
                                <div className="order-3 flex flex-col items-center">
                                    <div className="relative mb-3">
                                        <div className="w-20 h-20 rounded-full bg-orange-900 border-4 border-orange-700 flex items-center justify-center shadow-lg shadow-orange-700/20">
                                            <img src={podiumData[2].escudo || podiumData[2].url_escudo_png} className="w-14 h-14 object-contain" />
                                        </div>
                                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-orange-700 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-orange-400">3º</div>
                                    </div>
                                    <span className="text-orange-200 font-bold text-sm max-w-[100px] truncate">{podiumData[2].nome}</span>
                                </div>
                            )}
                        </div>

                        <div className="relative z-50">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    fecharPodium();
                                }}
                                className="bg-white hover:bg-gray-200 text-black px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-transform hover:scale-105 shadow-2xl cursor-pointer"
                            >
                                Fechar e Continuar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}