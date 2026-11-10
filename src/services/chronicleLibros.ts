import { supabase } from '../lib/supabase'

export type EstadoLibro = 'borrador' | 'pendiente' | 'rechazado' | 'publicado'
export type Capitulo = { id: string; titulo: string; texto: string }
export type Elemento = {
  id: string
  tipo: 'clase' | 'subclase' | 'especie' | 'trasfondo' | 'dote' | 'objeto' | 'conjuro' | 'regla' | 'transformacion' | 'otro'
  nombre: string
  descripcion: string
  datos: Record<string, unknown>
}
export type ContenidoLibro = { capitulos: Capitulo[]; elementos: Elemento[] }
export type LibroMotor = {
  id: string; autor_id: string; titulo: string; idioma: string
  metadatos: Record<string, unknown>; contenido: ContenidoLibro
  estado: EstadoLibro; revision: number; publicado_revision: number | null
  publicado_snapshot: Record<string, unknown> | null
}
export type LibroEntrada = Pick<LibroMotor, 'titulo' | 'idioma' | 'metadatos' | 'contenido'>

export async function listarLibrosMotor(): Promise<LibroMotor[]> {
  const { data, error } = await supabase.from('chronicle_libros').select('*').order('actualizado_en', { ascending: false })
  if (error) throw error
  return (data ?? []) as LibroMotor[]
}
export async function guardarLibroMotor(input: LibroEntrada, id: string | null = null, revision: number | null = null) {
  const { data, error } = await supabase.rpc('chronicle_guardar_libro', {
    p_id: id, p_revision: revision, p_titulo: input.titulo, p_idioma: input.idioma,
    p_metadatos: input.metadatos, p_contenido: input.contenido,
  })
  if (error) throw error
  return data as { id: string; revision: number }
}
export async function enviarLibroMotor(id: string, revision: number) {
  const { error } = await supabase.rpc('chronicle_enviar_libro', { p_id: id, p_revision: revision })
  if (error) throw error
}
export async function resolverLibroMotor(id: string, revision: number, aprobar: boolean, comentario: string) {
  const { error } = await supabase.rpc('chronicle_resolver_libro', {
    p_id: id, p_revision: revision, p_aprobar: aprobar, p_comentario: comentario,
  })
  if (error) throw error
}
export async function soyAdminMotor() {
  const { data, error } = await supabase.rpc('chronicle_es_admin')
  if (error) throw error
  return Boolean(data)
}
