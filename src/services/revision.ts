import { supabase } from '../lib/supabase'
import type { Cambio } from '../lib/diferencias'
import { errorDeSupabase } from '../lib/erroresSupabase'
import { invalidarPendientesRevision } from '../hooks/usePendientesRevision'

export type PropuestaRevision = {
 id: string; titulo: string; idioma: string; tipo: string; autor_id: string
 revision_resultante_id: string | null; version_base_id: string | null
 pendiente_aprobacion: boolean; enviado_en: string | null
 libro_original_id: string | null; convertida_a_correccion: boolean
 metadatos_libro: { codigo?: string } | null
}
/** La versión publicada contra la que se compara (correcciones y libros ya publicados). */
export type BaseRevision = { titulo: string; revision: number; codigo: string }
/** Un libro publicado que se parece al libro nuevo que se está revisando. */
export type LibroParecido = {
 libro_id: string; version_id: string; titulo: string; codigo: string; edicion: string; editorial: string
 idioma: string; estado: string; revision: number; mismo_titulo: boolean; mismo_codigo: boolean
 /** El autor lo eligió como libro original. */
 vinculado?: boolean
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
   .select('id,titulo,idioma,tipo,autor_id,revision_resultante_id,version_base_id,pendiente_aprobacion,enviado_en,libro_original_id,convertida_a_correccion,metadatos_libro')
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
 const datos = propuesta as PropuestaRevision
 const [base, parecidos] = await Promise.all([cargarBase(datos), cargarParecidos(datos)])
 return { propuesta: datos, envio: envio as EnvioRevision, cambios, base, parecidos }
}

/** Título y revisión de la versión publicada con la que se compara la propuesta. */
async function cargarBase(propuesta: PropuestaRevision): Promise<BaseRevision | null> {
 const versionId = propuesta.tipo === 'modificacion' ? propuesta.version_base_id : propuesta.revision_resultante_id
 if (!versionId) return null
 const { data, error } = await supabase.from('libro_versiones')
   .select('titulo,revision_actual,libros(codigo)').eq('id', versionId).maybeSingle()
 if (error) throw errorDeSupabase(error, 'cargar el libro publicado')
 if (!data) return null
 const libro = (Array.isArray(data.libros) ? data.libros[0] : data.libros) as { codigo?: string } | null
 return { titulo: data.titulo, revision: data.revision_actual, codigo: libro?.codigo ?? '' }
}

/**
 * Para un libro nuevo todavía sin publicar: libros publicados con el mismo título o código,
 * más el libro original que haya elegido el autor.
 */
async function cargarParecidos(propuesta: PropuestaRevision): Promise<LibroParecido[]> {
 if (propuesta.tipo !== 'libro_nuevo' || propuesta.revision_resultante_id) return []
 const { data, error } = await supabase.rpc('chronicle_libros_parecidos', {
  p_titulo: propuesta.titulo, p_codigo: propuesta.metadatos_libro?.codigo || null, p_excluir_libro: null,
 })
 if (error) throw errorDeSupabase(error, 'buscar libros parecidos')
 const lista = (data ?? []) as LibroParecido[]
 const original = propuesta.libro_original_id
 if (original && !lista.some(l => l.libro_id === original)) {
  const { data: versiones, error: errorOriginal } = await supabase.from('libro_versiones')
    .select('id,titulo,idioma,revision_actual,libros!inner(id,codigo,edicion,editorial,estado)').eq('libro_id', original)
  if (errorOriginal) throw errorDeSupabase(errorOriginal, 'cargar el libro original')
  for (const v of versiones ?? []) {
   const libro = (Array.isArray(v.libros) ? v.libros[0] : v.libros) as { id: string; codigo: string; edicion: string; editorial: string; estado: string }
   // Un libro original que ya no está publicado (papelera) no se puede usar para comparar.
   if (libro.estado !== 'publicado' && libro.estado !== 'oculto') continue
   lista.unshift({ libro_id: libro.id, version_id: v.id, titulo: v.titulo, codigo: libro.codigo, edicion: libro.edicion, editorial: libro.editorial,
    idioma: v.idioma, estado: libro.estado, revision: v.revision_actual, mismo_titulo: false, mismo_codigo: false })
  }
 }
 // Primero el elegido por el autor y las versiones en el idioma de la propuesta.
 return lista.map(l => ({ ...l, vinculado: l.libro_id === original }))
  .sort((a, b) => Number(!!b.vinculado) - Number(!!a.vinculado) || Number(b.idioma === propuesta.idioma) - Number(a.idioma === propuesta.idioma))
}

/** El administrador trata un libro nuevo como corrección de una versión publicada. */
export async function tratarComoCorreccion(propuestaId: string, versionId: string) {
 const { error } = await supabase.rpc('chronicle_tratar_como_correccion', { p_propuesta_id: propuestaId, p_version_id: versionId })
 if (error) throw errorDeSupabase(error, 'tratar la propuesta como corrección')
}

/** Deshace la conversión: la propuesta vuelve a ser un libro nuevo. */
export async function tratarComoLibroNuevo(propuestaId: string) {
 const { error } = await supabase.rpc('chronicle_tratar_como_libro_nuevo', { p_propuesta_id: propuestaId })
 if (error) throw errorDeSupabase(error, 'volver a tratar la propuesta como libro nuevo')
}
export type DecisionEnviada = { i: number; decision: 'aceptar' | 'descartar' | 'parcial'; campos?: string[] }
/**
 * Aprueba la propuesta. Sin decisiones se aplica todo; con decisiones, solo lo aceptado
 * (lo descartado vuelve al borrador del autor). El comentario le llega al autor.
 */
export async function aprobarRevision(propuestaId: string, decisiones: DecisionEnviada[] = [], comentario = '') {
 const { error } = await supabase.rpc('chronicle_aprobar_propuesta', {
  p_propuesta_id: propuestaId,
  p_decisiones: decisiones.length ? decisiones : null,
  p_comentario: comentario.trim() || null,
 })
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
