// app/admin/times/page.tsx
// Este arquivo é um Server Component - SEM 'use client'

import { listarTodosTimes } from '@/app/actions';
import AdminTimesClient from './admin-times-client'; // Importa o novo componente cliente

export default async function AdminTimesPage() {
    // Busca a lista de times no servidor.
    const initialTimes = await listarTodosTimes(); 
    
    return (
        // Corrigido para o layout de margem automática e padding padrão do site (max-w-7xl mx-auto)
        <div className="max-w-7xl mx-auto p-6 md:p-10 animate-fadeIn min-h-screen">
            {/* Título centralizado no topo da página */}
            <h1 className="text-4xl font-extrabold mb-10 text-white text-center">ADMINISTRAR TIMES</h1>

            {/* Renderiza o componente cliente, passando os dados do servidor. */}
            {/* O componente cliente lida com o Botão Voltar e a largura máxima de 500px */}
            <div className="flex justify-center"> 
                 <AdminTimesClient initialTimes={initialTimes} />
            </div>
        </div>
    );
}