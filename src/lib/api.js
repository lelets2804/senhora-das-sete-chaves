// Escolhe automaticamente: se houver chaves do Supabase no .env usa o backend real,
// senão roda em MODO DEMONSTRAÇÃO (dados salvos só no navegador).
import * as demo from './api-demo'
import * as real from './api-supabase'

export const MODO_DEMO = !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY
const api = MODO_DEMO ? demo : real
export default api
export const EMAIL_ADMIN_DEMO = demo.EMAIL_ADMIN_DEMO