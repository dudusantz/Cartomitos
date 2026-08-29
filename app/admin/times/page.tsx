import { listarTodosTimes } from '@/app/actions';
import AdminTimesClient from './admin-times-client';
import { BotaoAtualizarTimes } from '@/app/components/BotaoAtualizarTimes';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function AdminTimesPage() {
    const initialTimes = await listarTodosTimes(); 
    
    return (
        <main className="min-h-screen px-4 py-8 animate-fadeIn md:px-10 md:py-10">
            <div className="mx-auto max-w-6xl">
                <header className="mb-7 flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 transition-colors hover:text-white">
                            <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" /> Voltar ao painel
                        </Link>
                        <h1 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">Gerenciar times</h1>
                        <p className="mt-2 text-sm text-gray-500">Cadastre clubes e mantenha os dados sincronizados com o Cartola.</p>
                    </div>
                    <BotaoAtualizarTimes />
                </header>

                <AdminTimesClient initialTimes={initialTimes} />
            </div>
        </main>
    );
}
