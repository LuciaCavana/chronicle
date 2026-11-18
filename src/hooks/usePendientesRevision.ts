import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Cantidad de envíos esperando revisión: propuestas pendientes de aprobación
 * más libros en estado "pendiente". Solo se consulta para administración;
 * Supabase vuelve a validar los permisos.
 * El valor se comparte en toda la app y se vuelve a pedir como mucho una vez
 * por minuto, o enseguida si se llama a invalidarPendientesRevision().
 */
const VIGENCIA_MS = 60_000
const oyentes = new Set<() => void>()
let cantidad = 0
let consultadoEn = 0
let consultando = false

function publicar(valor: number) {
  cantidad = valor
  oyentes.forEach(avisar => avisar())
}

async function consultar() {
  if (consultando) return
  consultando = true
  try {
    const [propuestas, libros] = await Promise.all([
      supabase.rpc('chronicle_listar_propuestas_pendientes'),
      supabase.from('libros').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
    ])
    const totalPropuestas = propuestas.error || !Array.isArray(propuestas.data) ? 0 : propuestas.data.length
    const totalLibros = libros.error ? 0 : libros.count ?? 0
    consultadoEn = Date.now()
    publicar(totalPropuestas + totalLibros)
  } finally {
    consultando = false
  }
}

/** Marca el contador como desactualizado y lo vuelve a pedir (por ejemplo, después de aprobar o rechazar). */
export function invalidarPendientesRevision() {
  consultadoEn = 0
  void consultar()
}

const suscribir = (oyente: () => void) => { oyentes.add(oyente); return () => { oyentes.delete(oyente) } }
const obtener = () => cantidad

export function usePendientesRevision(habilitado: boolean): number {
  const valor = useSyncExternalStore(suscribir, obtener, obtener)
  useEffect(() => {
    if (habilitado && Date.now() - consultadoEn > VIGENCIA_MS) void consultar()
  }, [habilitado])
  return habilitado ? valor : 0
}
