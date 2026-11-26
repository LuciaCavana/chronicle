import type { ConjuroOtorgado, ConjurosOtorgados, OtorgamientoConjuros } from '../types/conjuro'

/**
 * Conjuros otorgados por dotes, rasgos de especie y beneficios de linaje: valores iniciales,
 * conversión del formato anterior de especies, limpieza al guardar y el resumen del lector.
 */

export const APTITUDES_HABITUALES = ['inteligencia', 'sabiduria', 'carisma']
export const NOMBRE_APTITUD: Record<string, string> = {
  fuerza: 'Fuerza', destreza: 'Destreza', constitucion: 'Constitución', inteligencia: 'Inteligencia', sabiduria: 'Sabiduría', carisma: 'Carisma',
}

export function conjurosVacios(modo: ConjurosOtorgados['modo'] = 'eleccion'): ConjurosOtorgados {
  return { modo, selecciones: modo === 'eleccion' ? [{ nivel: 0, cantidad: 1 }] : [], conjurosIds: [] }
}

export function nuevoOtorgamiento(nivelRequerido = 1, modo: ConjurosOtorgados['modo'] = 'fijos'): OtorgamientoConjuros {
  return { ...conjurosVacios(modo), id: crypto.randomUUID(), nivelRequerido, caracteristica: 'ninguna' }
}

/** Un conjuro del formato anterior de especies («aprendido», «Reglas de uso» en texto) al formato nuevo. */
export function desdeFormatoAnterior(v: ConjuroOtorgado): OtorgamientoConjuros {
  return {
    id: v.id || crypto.randomUUID(),
    modo: 'fijos', selecciones: [], conjurosIds: v.conjuroId ? [v.conjuroId] : [],
    nivelRequerido: Number(v.nivelRequerido) || 1,
    ...(v.formaObtencion === 'preparado' ? { siemprePreparado: true } : {}),
    caracteristica: v.caracteristica ?? 'ninguna',
    ...(v.reglasUso?.trim() ? { notas: v.reglasUso.trim() } : {}),
  }
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v)
}

/** Conjuros de un rasgo o beneficio de linaje, en el formato nuevo (convierte el anterior). */
export function leerConjurosDe(elemento: { conjuros?: unknown; conjurosOtorgados?: unknown }): OtorgamientoConjuros[] {
  if (Array.isArray(elemento.conjuros)) {
    return elemento.conjuros.filter(esObjeto).map(c => ({
      ...conjurosVacios((c.modo === 'eleccion' ? 'eleccion' : 'fijos')),
      ...(c as Partial<OtorgamientoConjuros>),
      id: typeof c.id === 'string' && c.id ? c.id : crypto.randomUUID(),
      nivelRequerido: Number(c.nivelRequerido) || 1,
      conjurosIds: Array.isArray(c.conjurosIds) ? c.conjurosIds.map(String) : [],
      selecciones: Array.isArray(c.selecciones) ? c.selecciones as OtorgamientoConjuros['selecciones'] : [],
    }))
  }
  if (Array.isArray(elemento.conjurosOtorgados)) return elemento.conjurosOtorgados.filter(esObjeto).map(v => desdeFormatoAnterior(v as unknown as ConjuroOtorgado))
  return []
}

/** Deja solo los datos que corresponden al modo y a las opciones elegidas. */
export function limpiarConjuros<T extends ConjurosOtorgados>(c: T): T {
  const limpio: T = c.modo === 'fijos'
    ? { ...c, selecciones: [], listas: undefined }
    : { ...c, conjurosIds: [], selecciones: c.selecciones.filter(s => s.cantidad > 0) }
  if (limpio.caracteristica !== 'eleccion') delete limpio.aptitudesAEleccion
  if (!limpio.notas?.trim()) delete limpio.notas
  if (limpio.listas === undefined) delete limpio.listas
  return limpio
}

/** Problema de datos de un otorgamiento, para avisar al guardar (o null si está bien). */
export function problemaConjuros(c: ConjurosOtorgados, conListaPropia: boolean): string | null {
  if (c.modo === 'fijos' && !c.conjurosIds.length) return 'vinculá al menos un conjuro o quitá el otorgamiento'
  if (c.modo === 'eleccion' && (!c.selecciones.length || c.selecciones.some(s => !Number.isInteger(s.cantidad) || s.cantidad < 1))) return 'indicá el nivel y una cantidad de al menos 1'
  if (c.modo === 'eleccion' && conListaPropia && !c.listas?.length) return 'elegí de qué clases es la lista'
  if (c.lanzamientoSinEspacio && !(c.lanzamientoSinEspacio.usos >= 1)) return 'los usos sin espacio tienen que ser al menos 1'
  if (c.cambio && !c.cambio.listas.length) return 'elegí de qué lista sale el conjuro por el que se cambia'
  return null
}

const MOMENTO: Record<string, string> = { descanso_largo: 'tras un descanso largo', descanso_corto: 'tras un descanso corto', subir_nivel: 'al subir de nivel' }
const nivelTexto = (nivel: number, cantidad: number) => nivel === 0 ? `${cantidad} ${cantidad === 1 ? 'truco' : 'trucos'}` : `${cantidad} de nivel ${nivel}`

/** «Prestidigitación · se puede cambiar tras un descanso largo por otro truco de Mago». */
export function resumenConjuros(c: ConjurosOtorgados, nombreConjuro: (id: string) => string = () => '', nivelDe: (id: string) => number | undefined = () => undefined): string {
  const partes = c.modo === 'fijos'
    ? [c.conjurosIds.map(nombreConjuro).filter(Boolean).join(', ') || 'Conjuros del catálogo']
    : [`${c.selecciones.map(s => nivelTexto(s.nivel, s.cantidad)).join(' y ')} a elegir${c.listas?.length ? ` de ${c.listas.join(', ')}` : ''}`]
  if (c.siemprePreparado) partes.push('siempre preparado')
  if (c.lanzamientoSinEspacio) partes.push(`${c.lanzamientoSinEspacio.usos} sin espacio por ${c.lanzamientoSinEspacio.recuperacion === 'descanso_corto' ? 'descanso corto' : 'descanso largo'}`)
  if (c.permiteUsarEspacios) partes.push('también con espacios')
  if (c.caracteristica && c.caracteristica !== 'ninguna') {
    partes.push(c.caracteristica === 'eleccion'
      ? `aptitud a elección (${(c.aptitudesAEleccion?.length ? c.aptitudesAEleccion : APTITUDES_HABITUALES).map(a => NOMBRE_APTITUD[a] ?? a).join(', ')})`
      : `aptitud: ${NOMBRE_APTITUD[c.caracteristica] ?? c.caracteristica}`)
  }
  if (c.cambio) {
    const niveles = c.modo === 'fijos' ? c.conjurosIds.map(nivelDe) : c.selecciones.map(s => s.nivel)
    const soloTrucos = niveles.length > 0 && niveles.every(n => n === 0)
    const mismo = c.cambio.mismoNivel ? (soloTrucos ? 'otro truco' : 'otro del mismo nivel') : 'otro conjuro'
    partes.push(`se puede cambiar ${MOMENTO[c.cambio.momento] ?? ''} por ${mismo}${c.cambio.listas.length ? ` de ${c.cambio.listas.join(', ')}` : ''}`)
  }
  return partes.join(' · ')
}
