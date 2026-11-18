import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Copia local de un borrador con cambios sin guardar.
 *
 * Mientras se edita, lo escrito se guarda en localStorage (no en una cookie: las
 * cookies admiten ~4 KB y viajan en cada petición; un libro las supera enseguida).
 * Si la pestaña se recarga, se cierra o se actualiza la app antes de guardar,
 * al volver a abrir el borrador se ofrece recuperar esa copia.
 *
 * La copia queda solo en este navegador y se borra al guardar, al descartarla,
 * al salir sin guardar o a los 14 días.
 */

const PREFIJO = 'chronicle:respaldo:'
const VERSION_FORMATO = 1
const DURACION_MS = 14 * 24 * 60 * 60 * 1000
const ESPERA_MS = 600

export type RespaldoBorrador<T> = {
  v: typeof VERSION_FORMATO
  guardadoEn: string
  /** row_version del borrador en el servidor cuando se hizo la copia. */
  version: number | null
  /** Contenido serializado, para comparar con lo que hay en el servidor. */
  firma: string
  datos: T
}

function almacen(): Storage | null {
  try { return window.localStorage } catch { return null }
}

function limpiarVencidos() {
  const s = almacen()
  if (!s) return
  const ahora = Date.now()
  for (let i = s.length - 1; i >= 0; i--) {
    const clave = s.key(i)
    if (!clave?.startsWith(PREFIJO)) continue
    try {
      const r = JSON.parse(s.getItem(clave) ?? 'null') as { v?: number; guardadoEn?: string } | null
      const edad = r?.guardadoEn ? ahora - Date.parse(r.guardadoEn) : Infinity
      if (r?.v !== VERSION_FORMATO || !(edad < DURACION_MS)) s.removeItem(clave)
    } catch { s.removeItem(clave) }
  }
}

function leerRespaldo<T>(clave: string): RespaldoBorrador<T> | null {
  limpiarVencidos()
  try {
    const r = JSON.parse(almacen()?.getItem(PREFIJO + clave) ?? 'null') as RespaldoBorrador<T> | null
    return r && r.v === VERSION_FORMATO && typeof r.firma === 'string' ? r : null
  } catch { return null }
}

function escribirRespaldo<T>(clave: string, respaldo: RespaldoBorrador<T>) {
  try { almacen()?.setItem(PREFIJO + clave, JSON.stringify(respaldo)) } catch {
    // Sin espacio o almacenamiento bloqueado: no se puede respaldar, pero la edición sigue.
  }
}

export function borrarRespaldoBorrador(clave: string | null) {
  if (!clave) return
  try { almacen()?.removeItem(PREFIJO + clave) } catch { /* nada que borrar */ }
}

type Opciones<T> = {
  /** Identifica el borrador y el usuario; null mientras no se sabe (no se respalda). */
  clave: string | null
  /** true cuando el borrador terminó de cargarse desde el servidor. */
  listo: boolean
  /** false para lectores o borradores enviados a aprobación. */
  habilitado: boolean
  /** Hay diferencias con lo guardado en el servidor. */
  conCambios: boolean
  datos: T
  /** Serialización de datos (la misma que usa el editor para detectar cambios). */
  firma: string
  /** Serialización de lo que hay en el servidor. */
  firmaServidor: string
  version: number | null
}

export function useRespaldoBorrador<T>({ clave, listo, habilitado, conCambios, datos, firma, firmaServidor, version }: Opciones<T>) {
  // Se lee una sola vez por borrador, al terminar de cargarlo.
  const respaldoGuardado = useMemo(() => (listo && clave ? leerRespaldo<T>(clave) : null), [listo, clave])
  const [decididoPara, setDecididoPara] = useState<string | null>(null)
  const pendiente = respaldoGuardado && decididoPara !== clave && respaldoGuardado.firma !== firmaServidor
    ? respaldoGuardado : null

  // Mientras la persona no decide qué hacer con la copia vieja, no se pisa.
  const activo = Boolean(clave) && listo && habilitado && conCambios && !pendiente

  const ultimo = useRef({ clave, activo, datos, firma, version })
  useEffect(() => { ultimo.current = { clave, activo, datos, firma, version } })

  // Guardado con una pequeña espera para no escribir en cada tecla.
  useEffect(() => {
    if (!activo || !clave) return
    const temporizador = window.setTimeout(() => {
      const u = ultimo.current
      escribirRespaldo(clave, { v: VERSION_FORMATO, guardadoEn: new Date().toISOString(), version: u.version, firma: u.firma, datos: u.datos })
    }, ESPERA_MS)
    return () => window.clearTimeout(temporizador)
  }, [activo, clave, firma])

  // Al recargar, cerrar o cambiar de pestaña se guarda enseguida (sin esperar).
  useEffect(() => {
    const guardarYa = () => {
      const u = ultimo.current
      if (!u.activo || !u.clave) return
      escribirRespaldo(u.clave, { v: VERSION_FORMATO, guardadoEn: new Date().toISOString(), version: u.version, firma: u.firma, datos: u.datos })
    }
    const alOcultar = () => { if (document.visibilityState === 'hidden') guardarYa() }
    window.addEventListener('pagehide', guardarYa)
    document.addEventListener('visibilitychange', alOcultar)
    return () => {
      window.removeEventListener('pagehide', guardarYa)
      document.removeEventListener('visibilitychange', alOcultar)
    }
  }, [])

  return {
    /** Copia encontrada que difiere de lo guardado en el servidor. */
    respaldo: pendiente,
    /** La copia se hizo sobre una versión del borrador que ya cambió en el servidor. */
    respaldoDesactualizado: Boolean(pendiente && pendiente.version !== null && version !== null && pendiente.version !== version),
    /** Devuelve los datos de la copia; quien llama los vuelve a poner en el editor. */
    recuperar(): T | null {
      setDecididoPara(clave)
      return pendiente?.datos ?? null
    },
    descartar() {
      borrarRespaldoBorrador(clave)
      setDecididoPara(clave)
    },
  }
}

/** Pide confirmación del navegador antes de recargar o cerrar con cambios sin guardar. */
export function useAvisoAntesDeSalir(activo: boolean) {
  useEffect(() => {
    if (!activo) return
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault()
      // Algunos navegadores todavía lo necesitan para mostrar el aviso.
      evento.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [activo])
}
