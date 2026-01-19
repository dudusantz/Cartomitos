import { createClient } from '@supabase/supabase-js';

// Removemos o "!" e colocamos '|| ""' para não quebrar o site se a chave falhar
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Se as chaves não existirem, mostramos um erro claro no console (F12) em vez de tela branca
if (!supabaseUrl || !supabaseKey) {
    console.error("🚨 ERRO CRÍTICO: As variáveis do Supabase não foram carregadas! Verifique o Painel do Netlify.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);