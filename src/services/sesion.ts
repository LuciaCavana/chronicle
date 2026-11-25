import { supabase } from '../lib/supabase'
import { errorDeSupabase } from '../lib/erroresSupabase'

/**
 * Devuelve el ID del usuario con sesión iniciada.
 * Si falla, muestra el error de Supabase con la acción indicada (p. ej. «guardar el borrador»);
 * si no hay sesión, avisa que hay que iniciarla.
 */
export async function requerirUsuarioId(accion: string): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw errorDeSupabase(error, accion)
  const usuarioId = data.user?.id
  if (!usuarioId) throw new Error('Tenés que iniciar sesión.')
  return usuarioId
}
