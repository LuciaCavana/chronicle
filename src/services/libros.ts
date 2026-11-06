import { supabase } from '../lib/supabase'
import type { Especie } from '../types/especie'

const ESTADO_PENDIENTE = 'pendiente'

export type NuevoLibro = {
  codigo: string
  edicion: string
  editorial: string
  clasificacion: string
  idioma: string
  titulo: string
  descripcion: string
  categorias: string[]
  especies: Especie[]
}

export async function guardarLibro(datos: NuevoLibro) {
  const { data, error } = await supabase.rpc('crear_libro_con_version', {
    p_codigo: datos.codigo,
    p_edicion: datos.edicion,
    p_editorial: datos.editorial,
    p_clasificacion: datos.clasificacion,
    p_idioma: datos.idioma,
    p_titulo: datos.titulo,
    p_descripcion: datos.descripcion,
    p_categorias: datos.categorias,
    p_especies: datos.especies,
  })

  if (error) throw error

  return data as string
}

export async function obtenerLibros() {
  const { data, error } = await supabase
    .from('libros')
    .select(
      `
      id,
      codigo,
      edicion,
      editorial,
      clasificacion,
      libro_versiones (
        id,
        idioma,
        titulo,
        descripcion
      )
    `
    )
    .order('creado_en', { ascending: false })

  if (error) throw error

  return data ?? []
}

export async function obtenerLibroParaEditar(libroId: string) {
  const { data, error } = await supabase
    .from('libros')
    .select(
      `
      id,
      codigo,
      edicion,
      editorial,
      clasificacion,
      estado,
      libro_versiones (
        id,
        idioma,
        titulo,
        descripcion,
        categorias,
        especies
      )
    `
    )
    .eq('id', libroId)
    .single()

  if (error) throw error

  if (!data) {
    throw new Error('No se encontró la propuesta.')
  }

  if (data.estado !== ESTADO_PENDIENTE) {
    throw new Error('Esta propuesta ya no está pendiente de aprobación.')
  }

  return data
}


export async function actualizarLibro(
  libroId: string,
  versionId: string,
  datos: NuevoLibro
) {
  const { data: usuarioData, error: usuarioError } =
    await supabase.auth.getUser()

  if (usuarioError) throw usuarioError

  const usuarioId = usuarioData.user?.id

  if (!usuarioId) {
    throw new Error('Tenés que iniciar sesión.')
  }

  const { data: libro, error: errorLibro } = await supabase
    .from('libros')
    .select('id')
    .eq('id', libroId)
    .eq('creado_por', usuarioId)
    .eq('estado', 'pendiente')
    .single()

  if (errorLibro) throw errorLibro

  if (!libro) {
    throw new Error('No se encontró una propuesta editable.')
  }

  const { data: version, error: errorVersion } = await supabase
    .from('libro_versiones')
    .select('id')
    .eq('id', versionId)
    .eq('libro_id', libroId)
    .single()

  if (errorVersion) throw errorVersion

  if (!version) {
    throw new Error('No se encontró la versión del libro.')
  }

  const { error: errorActualizarLibro } = await supabase
    .from('libros')
    .update({
      codigo: datos.codigo,
      edicion: datos.edicion,
      editorial: datos.editorial,
      clasificacion: datos.clasificacion,
    })
    .eq('id', libroId)
    .eq('creado_por', usuarioId)
    .eq('estado', 'pendiente')

  if (errorActualizarLibro) throw errorActualizarLibro

  const { error: errorActualizarVersion } = await supabase
    .from('libro_versiones')
    .update({
      idioma: datos.idioma,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      categorias: datos.categorias,
      especies: datos.especies,
    })
    .eq('id', versionId)
    .eq('libro_id', libroId)

  if (errorActualizarVersion) throw errorActualizarVersion

  return libroId
}
