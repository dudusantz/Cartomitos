'use client'

import { finalizarCampeonato } from '@/app/actions'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti' // Se não tiver, pode remover a chamada do confetti ou instalar: npm i canvas-confetti + npm i -D @types/canvas-confetti

interface Props {
    campeonatoId: number
}

export default function BotaoFinalizarCampeonato({ campeonatoId }: Props) {
    const [loading, setLoading] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [showPodium, setShowPodium] = useState(false)
    const [podiumData, setPodiumData] = useState<any[]>([])
    const router = useRouter()

    async function handleFinalizar() {
        setLoading(true)
        setShowConfirm(false)

        const res = await finalizarCampeonato(campeonatoId)
        setLoading(false)

        if (res.success) {
            toast.success(res.msg)
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

    function dispararConfete() {
        // Efeito simples de confete (se não tiver a lib instalada, essa função pode ser vazia)
        try {
            const duration = 3000;
            const end = Date.now() + duration;

            (function frame() {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    colors: ['#FFD700', '#C0C0C0', '#CD7F32'] 
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    colors: ['#FFD700', '#C0C0C0', '#CD7F32']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            }());
        } catch (e) {
            console.log("Confetti não instalado ou erro na animação");
        }
    }

    return (
        <>
            {/* BOTÃO PRINCIPAL */}
            <button 
                onClick={() => setShowConfirm(true)}
                disabled={loading}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 hover:scale-105 border border-red-500/50"
            >
                🏁 Encerrar Campeonato
            </button>

            {/* MODAL DE CONFIRMAÇÃO */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-[#151515] border border-white/10 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl border border-red-500/20">
                            ⚠️
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Encerrar Temporada?</h3>
                        <p className="text-sm text-gray-400 mb-6">
                            Isso irá finalizar o campeonato, arquivar a tabela atual e consagrar o campeão. <br/>
                            <span className="font-bold text-red-400 mt-2 block">Essa ação não pode ser desfeita.</span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-gray-300">Cancelar</button>
                            <button onClick={handleFinalizar} disabled={loading} className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-sm text-white shadow-lg">
                                {loading ? 'Encerrando...' : 'Sim, Encerrar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE PÓDIO (CELEBRAÇÃO) */}
            {showPodium && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in-95 duration-300">
                    <div className="relative max-w-2xl w-full bg-gradient-to-b from-[#1a1a1a] to-black border border-yellow-500/30 rounded-3xl p-8 text-center shadow-[0_0_50px_rgba(234,179,8,0.2)] overflow-hidden">
                        
                        {/* Raios de luz de fundo */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-yellow-500/10 blur-3xl rounded-full"></div>

                        <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-1 relative z-10">
                            Campeonato Finalizado!
                        </h2>
                        <p className="text-yellow-500 text-xs font-bold uppercase tracking-[0.4em] mb-10 relative z-10">
                            Hall da Fama Atualizado
                        </p>

                        <div className="flex flex-col md:flex-row items-end justify-center gap-6 relative z-10 mb-8">
                            
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
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-5xl drop-shadow-lg animate-bounce">👑</div>
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

                        <button 
                            onClick={() => setShowPodium(false)}
                            className="bg-white text-black hover:bg-gray-200 px-8 py-3 rounded-full font-bold uppercase tracking-widest text-sm transition-colors shadow-xl"
                        >
                            Fechar e Continuar
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}