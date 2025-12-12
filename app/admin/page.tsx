import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 md:p-10 animate-fadeIn">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-12 pb-6 border-b border-white/10">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-900 rounded-2xl flex items-center justify-center shadow-lg shadow-green-900/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Painel Admin</h1>
                <p className="text-gray-500 font-medium">Gerencie ligas, times e histórico.</p>
            </div>
        </div>

        {/* Grid de Ações */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD 1: LIGAS */}
            <Link href="/admin/ligas" className="group relative overflow-hidden bg-[#1a1a1a] border border-white/5 p-8 rounded-3xl hover:border-green-500/50 transition-all hover:-translate-y-1 shadow-xl">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-24 h-24 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5v-2h9v2zm0-4H5v-2h9v2zm0-4H5V7h9v2zm5-2v10h-2V7h2z"/></svg>
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4 text-green-500 group-hover:bg-green-500 group-hover:text-black transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Ligas</h2>
                    <p className="text-sm text-gray-500 mb-6">Criar, editar e finalizar campeonatos.</p>
                    <span className="text-xs font-bold uppercase tracking-widest text-green-500 group-hover:text-green-400">Acessar &rarr;</span>
                </div>
            </Link>

            {/* CARD 2: TIMES */}
            <Link href="/admin/times" className="group relative overflow-hidden bg-[#1a1a1a] border border-white/5 p-8 rounded-3xl hover:border-blue-500/50 transition-all hover:-translate-y-1 shadow-xl">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-24 h-24 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 text-blue-500 group-hover:bg-blue-500 group-hover:text-black transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Times</h2>
                    <p className="text-sm text-gray-500 mb-6">Cadastrar times via API Cartola.</p>
                    <span className="text-xs font-bold uppercase tracking-widest text-blue-500 group-hover:text-blue-400">Acessar &rarr;</span>
                </div>
            </Link>

            {/* CARD 3: HISTÓRICO (O que você pediu) */}
            <Link href="/admin/titulos" className="group relative overflow-hidden bg-[#1a1a1a] border border-white/5 p-8 rounded-3xl hover:border-yellow-500/50 transition-all hover:-translate-y-1 shadow-xl">
                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <svg className="w-24 h-24 text-yellow-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <div className="relative z-10">
                    <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4 text-yellow-500 group-hover:bg-yellow-500 group-hover:text-black transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Histórico</h2>
                    <p className="text-sm text-gray-500 mb-6">Adicionar campeões passados à galeria.</p>
                    <span className="text-xs font-bold uppercase tracking-widest text-yellow-500 group-hover:text-yellow-400">Acessar &rarr;</span>
                </div>
            </Link>

        </div>

        {/* Atalho para Home */}
        <div className="mt-12 text-center">
            <Link href="/" className="text-gray-600 hover:text-white text-sm transition-colors font-medium">
                Voltar para o site público
            </Link>
        </div>
      </div>
    </div>
  )
}