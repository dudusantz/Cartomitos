import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// NOVA CHAVE: Você precisa pegar essa chave no painel do Supabase (Project Settings > API > service_role)
// E adicionar nas variáveis de ambiente do seu Netlify/Vercel e no seu arquivo .env.local
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("🚨 ERRO CRÍTICO: As variáveis públicas do Supabase não foram carregadas! Verifique o Painel do Netlify.");
}

// 1. CLIENTE PÚBLICO (Frontend)
// Continua igual. Usado em Client Components para buscar dados públicos.
// O RLS vai bloquear tentativas de UPDATE feitas por este cliente.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);


// 2. CLIENTE ADMIN (Backend)
// EXCLUSIVO para uso dentro de Server Actions (app/actions.ts) ou Route Handlers (app/api/.../route.ts).
// Ele tem poder total e ignora o RLS. NUNCA exporte isso para o frontend (não use NEXT_PUBLIC nesta variável).
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;