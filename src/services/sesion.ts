import { supabase } from '../lib/supabase'

/** Devuelve el ID del usuario autenticado o informa que debe iniciar sesión. */
export async function requerirUsuarioId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Tenés que iniciar sesión.')
  return data.user.id
}
