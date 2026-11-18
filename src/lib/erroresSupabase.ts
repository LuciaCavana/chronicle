/**
 * Convierte los errores de Supabase/PostgREST en mensajes claros.
 *
 * Un 400 de PostgREST puede venir de una regla de negocio (RAISE EXCEPTION en una
 * función RPC) o de un fallo interno (columna o función inexistente). Sin esto, la
 * interfaz mostraba un mensaje genérico y había que abrir la pestaña Red para
 * adivinar la causa.
 */

type ErrorPostgrest = {
 message?: string
 code?: string
 details?: string | null
 hint?: string | null
}

export class ErrorSupabase extends Error {
 readonly codigo: string | null
 readonly detalle: string | null
 readonly pista: string | null
 readonly original: unknown

 constructor(mensaje: string, codigo: string | null, detalle: string | null, pista: string | null, original: unknown) {
  super(mensaje)
  this.name = 'ErrorSupabase'
  this.codigo = codigo
  this.detalle = detalle
  this.pista = pista
  this.original = original
 }
}

/** Códigos que indican que la base no coincide con lo que espera el código (no es culpa del usuario). */
const CODIGOS_ESTRUCTURA = new Set(['42703', '42P01', '42883', '42804', 'PGRST202', 'PGRST204', 'PGRST200'])

function mensajeSegunCodigo(codigo: string | null, mensaje: string): string {
 if (!codigo) return mensaje
 if (codigo === '42501') return `No tenés permiso para esta acción: ${mensaje}`
 if (codigo === '23505') return `Ya existe un registro con esos datos: ${mensaje}`
 if (codigo === '23503') return `Hay datos relacionados que impiden la operación: ${mensaje}`
 if (codigo === '23502' || codigo === '23514') return `Hay un dato inválido o faltante: ${mensaje}`
 if (codigo === '40001' || codigo === '40P01') return 'Otro usuario estaba modificando lo mismo. Probá de nuevo.'
 if (codigo === 'PGRST301' || codigo === 'PGRST303') return 'Tu sesión venció. Volvé a iniciar sesión.'
 if (CODIGOS_ESTRUCTURA.has(codigo)) return `Error interno de la base de datos (${codigo}): ${mensaje}. Avisale al administrador.`
 // P0001 y demás: el mensaje ya es el que escribimos en la función SQL.
 return mensaje
}

/**
 * Devuelve un Error con el motivo real. `accion` describe qué se intentaba hacer
 * (por ejemplo "aprobar la propuesta") y se usa en la consola y si no hay mensaje.
 */
export function errorDeSupabase(error: unknown, accion: string): ErrorSupabase {
 if (error instanceof ErrorSupabase) return error
 const e = (typeof error === 'object' && error !== null ? error : {}) as ErrorPostgrest
 const codigo = typeof e.code === 'string' && e.code ? e.code : null
 const detalle = typeof e.details === 'string' && e.details ? e.details : null
 const pista = typeof e.hint === 'string' && e.hint ? e.hint : null
 let base = typeof e.message === 'string' && e.message ? e.message : ''
 if (!base && typeof error === 'string') base = error
 if (/failed to fetch|networkerror|load failed/i.test(base)) {
  base = 'No se pudo conectar con el servidor. Revisá tu conexión.'
 }
 if (!base) base = `No se pudo ${accion}`
 const mensaje = mensajeSegunCodigo(codigo, base)
 // Deja el detalle completo en la consola para no depender de la pestaña Red.
 console.error(`[Supabase] Error al ${accion}`, { codigo, mensaje: base, detalle, pista, original: error })
 return new ErrorSupabase(mensaje, codigo, detalle, pista, error)
}
