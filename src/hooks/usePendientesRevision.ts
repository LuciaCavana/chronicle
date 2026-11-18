import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Cantidad de envíos esperando revisión: propuestas pendientes de aprobación
 * más libros en estado "pendiente". Solo se consulta para administración;
 * Supabase vuelve a validar los permisos. Se actualiza al cambiar de página.
 */
export function usePendientesRevision(habilitado: boolean, clave: string): number {
  const [cantidad, setCantidad] = useState(0)
  useEffect(() => {
    if (!habilitado) return
    let activo = true
    void (async () => {
      const [propuestas, libros] = await Promise.all([
        supabase.rpc('chronicle_listar_propuestas_pendientes'),
        supabase.from('libros').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
      ])
      if (!activo) return
      const totalPropuestas = propuestas.error || !Array.isArray(propuestas.data) ? 0 : propuestas.data.length
      const totalLibros = libros.error ? 0 : libros.count ?? 0
      setCantidad(totalPropuestas + totalLibros)
    })()
    return () => { activo = false }
  }, [habilitado, clave])
  return habilitado ? cantidad : 0
}
