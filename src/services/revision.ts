import { supabase } from '../lib/supabase'
import type { Cambio } from '../lib/diferencias'
import { errorDeSupabase } from '../lib/erroresSupabase'
import { invalidarPendientesRevision } from '../hooks/usePendientesRevision'

export type PropuestaRevision = {
 id: string; titulo: string; idioma: string; tipo: string; autor_id: string
 revision_resultante_id: string | null; version_base_id: string | null
 pendiente_aprobacion: boolean; enviado_en: string | null
}
export type EnvioRevision = { enviado_en: string; enviado_por: string | null; operaciones_snapshot: unknown; contenido_snapshot: unknown }
export async function cargarRevision(propuestaId: string) {
 const { data: usuario, error: errorUsuario } = await supabase.auth.getUser()
 if (errorUsuario) throw errorDeSupabase(errorUsuario, 'verificar tu sesión')
 if (!usuario.user) throw new Error('Sesión requerida')
 const { data: administrador, error: errorRol } = await supabase.rpc('chronicle_es_admin')
 if (errorRol) throw errorDeSupabase(errorRol, 'verificar tus permisos')
 if (!administrador) {
   const { data: rol, error: errorPermiso } = await supabase.from('user_roles').select('role').eq('user_id', usuario.user.id).maybeSingle()
   if (errorPermiso) throw errorDeSupabase(errorPermiso, 'verificar tus permisos')
   if (rol?.role !== 'admin' && rol?.role !== 'creator') throw new Error('No tenés permiso para revisar propuestas')
 }
 const { data: propuesta, error: errorPropuesta } = await supabase.from('propuestas')
   .select('id,titulo,idioma,tipo,autor_id,revision_resultante_id,version_base_id,pendiente_aprobacion,enviado_en')
   .eq('id', propuestaId).single()
 if (errorPropuesta) throw errorDeSupabase(errorPropuesta, 'cargar la propuesta')
 if (!propuesta.pendiente_aprobacion) throw new Error('La propuesta ya no está pendiente de aprobación')
 const { data: envio, error: errorEnvio } = await supabase.from('propuesta_envios')
   .select('enviado_en,enviado_por,operaciones_snapshot,contenido_snapshot')
   .eq('propuesta_id', propuestaId).order('enviado_en', { ascending: false }).limit(1).maybeSingle()
 if (errorEnvio) throw errorDeSupabase(errorEnvio, 'cargar el envío de la propuesta')
 if (!envio) throw new Error('No se encontró la instantánea del envío')
 // La revisión debe reflejar lo enviado, no un borrador que pudiera modificarse después.
 const cambios = Array.isArray(envio.operaciones_snapshot) ? envio.operaciones_snapshot as Cambio[] : []
 return { propuesta: propuesta as PropuestaRevision, envio: envio as EnvioRevision, cambios }
}
export async function aprobarRevision(propuestaId: string) {
 const { error } = await supabase.rpc('chronicle_aprobar_propuesta', { p_propuesta_id: propuestaId })
 if (error) throw errorDeSupabase(error, 'aprobar la propuesta')
 invalidarPendientesRevision()
}
export async function rechazarRevision(propuestaId: string, motivo: string) {
 const { error } = await supabase.rpc('chronicle_rechazar_propuesta', { p_propuesta_id: propuestaId, p_motivo: motivo })
 if (error) throw errorDeSupabase(error, 'rechazar la propuesta')
 invalidarPendientesRevision()
}

export type ActividadAutor = {
 nombre: string
 username: string | null
 publicaciones: number
 aprobadas: number
 rechazadas: number
 pendientes: number
 publicacionesRecientes: { id: string; titulo: string }[]
}
export async function cargarActividadAutor(autorId: string): Promise<ActividadAutor> {
 const [{ data: perfil, error: errorPerfil }, { data: libros, error: errorLibros }, { data: propuestas, error: errorPropuestas }] = await Promise.all([
  supabase.from('profiles').select('display_name,username').eq('id', autorId).maybeSingle(),
  supabase.from('libros').select('id,libro_versiones(titulo)').eq('creado_por', autorId).eq('estado','publicado'),
  supabase.from('propuestas').select('id,estado,pendiente_aprobacion,revision_resultante_id,resuelto_en').eq('autor_id',autorId),
 ])
 if(errorPerfil) throw errorDeSupabase(errorPerfil, 'cargar la actividad del autor')
 if(errorLibros) throw errorDeSupabase(errorLibros, 'cargar la actividad del autor')
 if(errorPropuestas) throw errorDeSupabase(errorPropuestas, 'cargar la actividad del autor')
 const publicacionesRecientes=(libros??[]).slice(0,10).map(libro=>{
  const versiones=libro.libro_versiones as unknown as {titulo:string}[] | null
  return {id:libro.id,titulo:versiones?.[0]?.titulo??'Libro publicado'}
 })
 return {
  nombre: perfil?.display_name?.trim() || perfil?.username || 'Usuario sin nombre público',
  username: perfil?.username ?? null,
  publicaciones: libros?.length??0,
  aprobadas: (propuestas??[]).filter(p=>p.resuelto_en && p.revision_resultante_id).length,
  rechazadas: (propuestas??[]).filter(p=>p.estado==='rechazado').length,
  pendientes: (propuestas??[]).filter(p=>p.pendiente_aprobacion).length,
  publicacionesRecientes,
 }
}
