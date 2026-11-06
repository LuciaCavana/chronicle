
import { supabase } from '../lib/supabase'
import type { Especie } from '../types/especie'

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
  const { data, error } = await supabase.rpc(
    'crear_libro_con_version',
    {
      p_codigo: datos.codigo,
      p_edicion: datos.edicion,
      p_editorial: datos.editorial,
      p_clasificacion: datos.clasificacion,
      p_idioma: datos.idioma,
      p_titulo: datos.titulo,
      p_descripcion: datos.descripcion,
      p_categorias: datos.categorias,
      p_especies: datos.especies,
    }
  )

  if (error) throw error

  return data as string
}

export async function obtenerLibros() {
  const { data, error } = await supabase
    .from('libros')
    .select(`
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
    `)
    .order('creado_en', { ascending: false })

  if (error) throw error

  return data ?? []
}
