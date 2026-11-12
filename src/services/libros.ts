import { supabase } from '../lib/supabase'
import type { Especie } from '../types/especie'
import type { Conjuro } from '../types/conjuro'
import type { Elemento } from './chronicleLibros'

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
  conjuros: Conjuro[]
  clases: Elemento[]
  subclases: Elemento[]
  objetos: Elemento[]
}

export async function guardarLibro(datos: NuevoLibro) {
  const { data, error } = await supabase.rpc('crear_libro_con_conjuros', {
    p_codigo: datos.codigo,
    p_edicion: datos.edicion,
    p_editorial: datos.editorial,
    p_clasificacion: datos.clasificacion,
    p_idioma: datos.idioma,
    p_titulo: datos.titulo,
    p_descripcion: datos.descripcion,
    p_categorias: datos.categorias,
    p_especies: datos.especies,
    p_conjuros: datos.conjuros,
  })

  if (error) throw error

  return data as string
}

export async function guardarPropuesta(datos: NuevoLibro) {
  const { data: usuarioData, error: usuarioError } =
    await supabase.auth.getUser()

  if (usuarioError) throw usuarioError

  const usuarioId = usuarioData.user?.id

  if (!usuarioId) {
    throw new Error('Tenés que iniciar sesión.')
  }

  const { data, error } = await supabase
    .from('propuestas')
    .insert({
      tipo: 'libro_nuevo',
      estado: 'borrador',
      pendiente_aprobacion: false,
      autor_id: usuarioId,
      idioma: datos.idioma,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      categorias: datos.categorias,
      contenido: {
        especies: datos.especies,
        conjuros: datos.conjuros,
        clases: datos.clases,
        subclases: datos.subclases,
       objetos: datos.objetos,
      },
      metadatos_libro: {
        codigo: datos.codigo,
        edicion: datos.edicion,
        editorial: datos.editorial,
        clasificacion: datos.clasificacion,
      },
    })
    .select('id')
    .single()

  if (error) throw error

  return data.id as string
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
        descripcion,
        categorias,
        especies,
        conjuros,
        clases,
        subclases,
       objetos
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
        especies,
        conjuros,
        clases,
        subclases,
       objetos
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
      conjuros: datos.conjuros,
      clases: datos.clases,
      subclases: datos.subclases,
    })
    .eq('id', versionId)
    .eq('libro_id', libroId)

  if (errorActualizarVersion) throw errorActualizarVersion

  return libroId
}


export async function obtenerPropuestaParaEditar(
  propuestaId: string
) {
  const { data: usuarioData, error: usuarioError } =
    await supabase.auth.getUser()

  if (usuarioError) throw usuarioError

  const usuarioId = usuarioData.user?.id

  if (!usuarioId) {
    throw new Error('Tenés que iniciar sesión.')
  }

  const { data, error } = await supabase
    .from('propuestas')
    .select(`
      id,
      tipo,
      estado,
      autor_id,
      idioma,
      titulo,
      descripcion,
      categorias,
      contenido,
      metadatos_libro,
      row_version
    `)
    .eq('id', propuestaId)
    .eq('autor_id', usuarioId)
    .eq('estado', 'borrador')
    .single()

  if (error) throw error

  return data
}


export async function actualizarPropuesta(
  propuestaId: string,
  datos: NuevoLibro,
  versionActual: number
) {
  const { data: usuarioData, error: usuarioError } =
    await supabase.auth.getUser()

  if (usuarioError) throw usuarioError

  const usuarioId = usuarioData.user?.id

  if (!usuarioId) {
    throw new Error('Tenés que iniciar sesión.')
  }

  const { data, error } = await supabase
    .from('propuestas')
    .update({
      idioma: datos.idioma,
      titulo: datos.titulo,
      descripcion: datos.descripcion,
      categorias: datos.categorias,
      contenido: {
        especies: datos.especies,
        conjuros: datos.conjuros,
        clases: datos.clases,
        subclases: datos.subclases,
       objetos: datos.objetos,
      },
      metadatos_libro: {
        codigo: datos.codigo,
        edicion: datos.edicion,
        editorial: datos.editorial,
        clasificacion: datos.clasificacion,
      },
      pendiente_aprobacion: false,
      row_version: versionActual + 1,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', propuestaId)
    .eq('autor_id', usuarioId)
    .eq('estado', 'borrador')
    .eq('row_version', versionActual)
    .select('id, row_version')
    .maybeSingle()

  if (error) throw error

  if (!data) {
    throw new Error(
      'No se pudo actualizar el borrador. Es posible que haya cambiado en otra sesión.'
    )
  }

  return data
}


/** Envía la versión guardada del borrador a revisión administrativa. */
export async function enviarBorradorAprobacion(propuestaId: string) {
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!auth.user) throw new Error('Tenés que iniciar sesión.')
  const { data, error } = await supabase.from('propuestas')
    .update({ pendiente_aprobacion: true })
    .eq('id', propuestaId)
    .eq('autor_id', auth.user.id)
    .eq('estado', 'borrador')
    .eq('pendiente_aprobacion', false)
    .select('id').maybeSingle()
  if (error) throw error
  if (!data) throw new Error('El borrador ya fue enviado o no está disponible.')
}
