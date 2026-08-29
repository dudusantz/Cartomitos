import Link from 'next/link'
import { ArrowRight, ExternalLink, LogOut, Medal, Trophy, UsersRound } from 'lucide-react'
import { deslogar } from '../login/actions'

export default function AdminDashboard() {
  return (
    <main className="min-h-screen px-4 py-8 text-white animate-fadeIn md:px-10 md:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-5 border-b border-white/[0.07] pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">Painel administrativo</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">Gerencie os campeonatos e conteúdos publicados no Cartomitos.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/[0.08] px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 transition-colors hover:border-white/15 hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 active:translate-y-px"
            >
              Ver site <ExternalLink size={14} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <form action={deslogar}>
              <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-500/20 px-3.5 text-[10px] font-bold uppercase tracking-[0.12em] text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60 active:translate-y-px">
                Sair <LogOut size={14} strokeWidth={1.8} aria-hidden="true" />
              </button>
            </form>
          </div>
        </header>

        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#121412] shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="border-b border-white/[0.07] bg-[#161816] px-5 py-4 md:px-7">
            <h2 className="text-sm font-bold text-white">O que você deseja gerenciar?</h2>
            <p className="mt-1 text-xs text-gray-600">Selecione uma área para continuar.</p>
          </div>

          <nav aria-label="Áreas administrativas" className="divide-y divide-white/[0.06]">
            <Link
              href="/admin/ligas"
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-6 transition-colors duration-200 hover:bg-yellow-500/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-400/70 active:bg-yellow-500/[0.07] md:gap-6 md:px-7 md:py-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-500/20 bg-yellow-500/[0.07] text-yellow-500 md:h-14 md:w-14">
                <Trophy size={25} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-black tracking-[-0.025em] text-white md:text-xl">Ligas e campeonatos</span>
                <span className="mt-1 block max-w-2xl text-xs leading-relaxed text-gray-500 md:text-sm">Crie competições, organize participantes, configure sorteios e acompanhe as fases.</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-gray-500 transition-all group-hover:border-yellow-500/25 group-hover:bg-yellow-500/[0.07] group-hover:text-yellow-500 md:h-10 md:w-10">
                <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/admin/times"
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-6 transition-colors duration-200 hover:bg-yellow-500/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-400/70 active:bg-yellow-500/[0.07] md:gap-6 md:px-7 md:py-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-gray-400 transition-colors group-hover:border-yellow-500/20 group-hover:text-yellow-500 md:h-14 md:w-14">
                <UsersRound size={25} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-black tracking-[-0.025em] text-white md:text-xl">Times</span>
                <span className="mt-1 block max-w-2xl text-xs leading-relaxed text-gray-500 md:text-sm">Cadastre novos times e mantenha os dados dos clubes atualizados.</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-gray-500 transition-all group-hover:border-yellow-500/25 group-hover:bg-yellow-500/[0.07] group-hover:text-yellow-500 md:h-10 md:w-10">
                <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </Link>

            <Link
              href="/admin/titulos"
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-6 transition-colors duration-200 hover:bg-yellow-500/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-yellow-400/70 active:bg-yellow-500/[0.07] md:gap-6 md:px-7 md:py-7"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-gray-400 transition-colors group-hover:border-yellow-500/20 group-hover:text-yellow-500 md:h-14 md:w-14">
                <Medal size={25} strokeWidth={1.7} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-black tracking-[-0.025em] text-white md:text-xl">Galeria de títulos</span>
                <span className="mt-1 block max-w-2xl text-xs leading-relaxed text-gray-500 md:text-sm">Registre os campeões e mantenha o histórico de conquistas do site.</span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] text-gray-500 transition-all group-hover:border-yellow-500/25 group-hover:bg-yellow-500/[0.07] group-hover:text-yellow-500 md:h-10 md:w-10">
                <ArrowRight size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </Link>
          </nav>
        </section>

        <p className="mt-5 text-center text-[10px] font-medium text-gray-700">As alterações feitas aqui aparecem no site público.</p>
      </div>
    </main>
  )
}
