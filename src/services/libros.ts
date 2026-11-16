import type { CaracteristicaLibro } from '../types/caracteristicaLibro'
import { supabase } from '../lib/supabase'
import type { Especie } from '../types/especie'
import type { Trasfondo } from '../types/trasfondo'
import type { Criatura } from '../types/criatura'
import type { Dote } from '../types/trasfondo'
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
  dotes: Dote[]
  trasfondos: Trasfondo[]
  criaturas: Criatura[]
  clases: Elemento[]
  subclases: Elemento[]
  objetos: Elemento[]
  caracteristicas?: CaracteristicaLibro[]
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

export type OrigenTraduccion = {
  libroId: string
  versionId: string
}

export async function listarVersionesPublicadas() {
  const { data, error } = await supabase.from('libros')
    .select('id, codigo, edicion, editorial, clasificacion, libro_versiones(id, idioma, titulo, descripcion, categorias, especies, conjuros, clases, subclases, objetos)')
    .eq('estado', 'publicado')
    .order('creado_en', { ascending: false })
  if (error) throw error
  return (data ?? []).flatMap(libro => (libro.libro_versiones ?? []).map(version => ({
    libroId: libro.id, codigo: libro.codigo, edicion: libro.edicion,
    editorial: libro.editorial, clasificacion: libro.clasificacion, ...version,
  })))
}

export async function guardarPropuesta(datos: NuevoLibro, origen?: OrigenTraduccion) {
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
      tipo: origen ? 'traduccion' : 'libro_nuevo',
      libro_id: origen?.libroId ?? null,
      version_traduccion_origen_id: origen?.versionId ?? null,
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
        dotes: datos.dotes,
        trasfondos: datos.trasfondos,
        criaturas: datos.criaturas,
        clases: datos.clases,
        subclases: datos.subclases,
        objetos: datos.objetos,
        caracteristicas: datos.caracteristicas ?? [],
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


/**
 * Actualiza un libro propio pendiente de aprobación.
 * Libro y versión se guardan en una sola transacción en el servidor
 * (RPC chronicle_actualizar_libro_pendiente): o se guarda todo o nada.
 */
export async function actualizarLibro(
  libroId: string,
  versionId: string,
  datos: NuevoLibro
) {
  const { data, error } = await supabase.rpc(
    'chronicle_actualizar_libro_pendiente',
    {
      p_libro_id: libroId,
      p_version_id: versionId,
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
      p_clases: datos.clases,
      p_subclases: datos.subclases,
      p_objetos: datos.objetos,
    }
  )

  if (error) throw error

  return (data as string | null) ?? libroId
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
      libro_id,
      version_traduccion_origen_id,
      estado,
      autor_id,
      idioma,
      titulo,
      descripcion,
      categorias,
      contenido,
      metadatos_libro,
      row_version,
      pendiente_aprobacion
    `)
    .eq('id', propuestaId)
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

  const { data: permiso, error: errorPermiso } = await supabase.from('propuestas').select('autor_id').eq('id', propuestaId).single()
  if (errorPermiso) throw errorPermiso
  if (permiso.autor_id !== usuarioId) {
    const { data: version, error: errorCompartido } = await supabase.rpc('chronicle_guardar_borrador_compartido', {
      p_propuesta_id: propuestaId, p_version: versionActual,
      p_idioma: datos.idioma, p_titulo: datos.titulo, p_descripcion: datos.descripcion,
      p_categorias: datos.categorias,
      p_contenido: { especies: datos.especies, conjuros: datos.conjuros, dotes: datos.dotes, trasfondos: datos.trasfondos, criaturas: datos.criaturas, clases: datos.clases, subclases: datos.subclases, objetos: datos.objetos, caracteristicas: datos.caracteristicas ?? [] },
      p_metadatos: { codigo: datos.codigo, edicion: datos.edicion, editorial: datos.editorial, clasificacion: datos.clasificacion },
    })
    if (errorCompartido) throw errorCompartido
    return { id: propuestaId, row_version: version as number }
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
        dotes: datos.dotes,
        trasfondos: datos.trasfondos,
        criaturas: datos.criaturas,
        clases: datos.clases,
        subclases: datos.subclases,
        objetos: datos.objetos,
        caracteristicas: datos.caracteristicas ?? [],
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


/** Guarda únicamente los elementos modificados respecto de la copia inicial.
 * El servidor fusiona cambios ajenos por ID y rechaza conflictos del mismo elemento.
 */
export async function guardarElementosCompartidos(propuestaId: string, base: Record<string, unknown>, nuevo: Record<string, unknown>) {
  const { data, error } = await supabase.rpc('chronicle_guardar_borrador_elementos', {
    p_propuesta_id: propuestaId, p_base: base, p_nuevo: nuevo,
  })
  if (error) throw error
  return data as number
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

/** Retira un borrador de la cola de aprobación para poder volver a editarlo.
 * Lo pueden hacer la autora o un colaborador con rol editor.
 */
export async function retirarDeAprobacion(propuestaId: string) {
  const { error } = await supabase.rpc('chronicle_retirar_aprobacion', {
    p_propuesta_id: propuestaId,
  })
  if (error) throw error
}

export async function crearPropuestaCorreccion(libroId: string, versionId: string): Promise<string> {
  const { data, error } = await supabase.rpc('chronicle_crear_propuesta_correccion', {
    p_libro_id: libroId,
    p_version_id: versionId,
  })
  if (error) throw error
  if (typeof data !== 'string') throw new Error('No se pudo crear la propuesta de corrección.')
  return data
}
