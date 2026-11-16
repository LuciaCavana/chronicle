import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Falta configurar Supabase')
}

/**
 * Se lee ANTES de crear el cliente, porque supabase-js limpia la URL al
 * procesar el enlace. Así la recuperación no depende de llegar a escuchar
 * el evento PASSWORD_RECOVERY a tiempo.
 */
const parametrosUrl = new URLSearchParams(
  `${window.location.search.slice(1)}&${window.location.hash.slice(1)}`
)

export const recuperacionDetectadaEnUrl =
  parametrosUrl.get('type') === 'recovery'

export const errorEnlaceAuth = parametrosUrl.get('error_code')

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
})
