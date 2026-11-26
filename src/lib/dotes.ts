import type { BeneficioDote, ConjurosBeneficio, Dote, SeleccionConjurosDote } from '../types/trasfondo'

/**
 * Dotes: los beneficios pasaron de ser líneas de texto a tarjetas (título, texto y lo que dan).
 * normalizarDote convierte las dotes guardadas con el formato anterior sin perder nada, y
 * prepararDoteParaGuardar calcula los campos resumidos que siguen usando otras pantallas
 * (trasfondos, creador de personajes): conjurosIds y seleccionConjuros.selecciones.
 */

type DoteGuardada = Omit<Dote, 'beneficios'> & { beneficios?: unknown }

const nuevoId = () => crypto.randomUUID()

/** «Dos trucos. Aprendes dos trucos…» → título «Dos trucos» y el resto como texto. */
export function separarTituloBeneficio(linea: string): { nombre: string; descripcion: string } {
  const texto = linea.trim()
  const m = texto.match(/^([\p{Lu}¿¡][^.:]{1,60}?)[.:]\s+(.+)$/su)
  if (m && m[1].trim().split(/\s+/).length <= 7) return { nombre: m[1].trim(), descripcion: m[2].trim() }
  return { nombre: '', descripcion: texto }
}

export function nuevoBeneficio(cambios: Partial<BeneficioDote> = {}): BeneficioDote {
  return { id: nuevoId(), nombre: '', descripcion: '', tipo: 'normal', ...cambios }
}

export function conjurosVacios(modo: ConjurosBeneficio['modo'] = 'eleccion'): ConjurosBeneficio {
  return { modo, selecciones: modo === 'eleccion' ? [{ nivel: 0, cantidad: 1 }] : [], conjurosIds: [] }
}

function comoBeneficio(valor: unknown): BeneficioDote | null {
  if (typeof valor === 'string') return valor.trim() ? nuevoBeneficio(separarTituloBeneficio(valor)) : null
  if (!valor || typeof valor !== 'object') return null
  const b = valor as Partial<BeneficioDote>
  return {
    id: typeof b.id === 'string' && b.id ? b.id : nuevoId(),
    nombre: typeof b.nombre === 'string' ? b.nombre : '',
    descripcion: typeof b.descripcion === 'string' ? b.descripcion : '',
    tipo: b.tipo === 'cambiar_conjuro' ? 'cambiar_conjuro' : 'normal',
    ...(b.conjuros ? { conjuros: { ...conjurosVacios(b.conjuros.modo === 'fijos' ? 'fijos' : 'eleccion'), ...b.conjuros } } : {}),
    ...(b.cambioConjuro ? { cambioConjuro: b.cambioConjuro } : {}),
  }
}

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Convierte una dote guardada (formato nuevo o anterior) al formato de tarjetas. */
export function normalizarDote(guardada: DoteGuardada): Dote {
  const crudos = Array.isArray(guardada.beneficios) ? guardada.beneficios : []
  const formatoAnterior = crudos.some(b => typeof b === 'string')
  const beneficios = crudos.map(comoBeneficio).filter((b): b is BeneficioDote => b !== null)
  const sel = guardada.seleccionConjuros
  const yaTieneConjuros = beneficios.some(b => b.conjuros)
  const dote: Dote = { ...guardada, beneficios }

  if (formatoAnterior || (!yaTieneConjuros && (sel?.selecciones?.length || guardada.conjurosIds?.length))) {
    const libre = (patron: RegExp) => beneficios.find(b => !b.conjuros && b.tipo !== 'cambiar_conjuro' && patron.test(sinTildes(b.nombre)))
    let generico: BeneficioDote | null = null
    const comodin = () => {
      if (!generico) { generico = nuevoBeneficio({ nombre: 'Conjuros' }); beneficios.push(generico) }
      return generico
    }
    for (const s of sel?.selecciones ?? []) {
      const destino = (s.nivel === 0 ? libre(/truco/) : libre(new RegExp(`nivel ${s.nivel}\\b`)) ?? libre(/conjuro/)) ?? comodin()
      const previos = destino.conjuros?.modo === 'eleccion' ? destino.conjuros.selecciones : []
      const conNivel = s.nivel >= 1
      destino.conjuros = {
        ...conjurosVacios('eleccion'),
        selecciones: [...previos, { nivel: s.nivel, cantidad: s.cantidad }],
        ...(conNivel && sel?.conjuroNivelUnoSiemprePreparado ? { siemprePreparado: true } : {}),
        ...(conNivel && sel?.lanzamientoSinEspacio ? { lanzamientoSinEspacio: sel.lanzamientoSinEspacio } : {}),
        ...(conNivel && sel?.permiteUsarEspacios ? { permiteUsarEspacios: true } : {}),
      }
    }
    if (guardada.conjurosIds?.length) {
      const destino = libre(/conjuro/) ?? comodin()
      if (destino.conjuros?.modo === 'eleccion') {
        // Ya da conjuros a elegir: los puntuales van en una tarjeta propia.
        beneficios.push(nuevoBeneficio({ nombre: 'Conjuros', conjuros: { ...conjurosVacios('fijos'), conjurosIds: [...guardada.conjurosIds] } }))
      } else {
        destino.conjuros = { ...conjurosVacios('fijos'), conjurosIds: [...guardada.conjurosIds] }
      }
    }
    if (sel?.reemplazoAlSubirNivel && !beneficios.some(b => b.tipo === 'cambiar_conjuro')) {
      const destino = beneficios.find(b => !b.conjuros && /^cambi/.test(sinTildes(b.nombre)))
      const cambio = { tipo: 'cambiar_conjuro' as const, cambioConjuro: { ...sel.reemplazoAlSubirNivel } }
      if (destino) Object.assign(destino, cambio)
      else beneficios.push(nuevoBeneficio({ nombre: 'Cambiar conjuro', ...cambio }))
    }
  }
  dote.repetible = guardada.repetible ?? sel?.repetible ?? beneficios.some(b => /^repetible/.test(sinTildes(b.nombre)))
  return dote
}

/** ¿Algún beneficio da conjuros a elegir de la lista de la dote? */
export const usaListaDeConjuros = (beneficios: BeneficioDote[]) => beneficios.some(b => b.conjuros?.modo === 'eleccion')

/** Completa los campos resumidos (para trasfondos y el creador de personajes) antes de guardar. */
export function prepararDoteParaGuardar(dote: Dote, lista: SeleccionConjurosDote | null): Dote {
  const beneficios = dote.beneficios.map(b => {
    const limpio: BeneficioDote = { id: b.id, nombre: b.nombre.trim(), descripcion: b.descripcion.trim(), tipo: b.tipo ?? 'normal' }
    if (b.tipo === 'cambiar_conjuro' && b.cambioConjuro) limpio.cambioConjuro = b.cambioConjuro
    if (b.conjuros) {
      const c = b.conjuros
      limpio.conjuros = c.modo === 'fijos'
        ? { ...c, selecciones: [] }
        : { ...c, conjurosIds: [], selecciones: c.selecciones.filter(s => s.cantidad > 0) }
    }
    return limpio
  })
  const fijos = [...new Set(beneficios.flatMap(b => b.conjuros?.modo === 'fijos' ? b.conjuros.conjurosIds : []))]
  const eleccion = beneficios.filter(b => b.conjuros?.modo === 'eleccion')
  const cambio = beneficios.find(b => b.tipo === 'cambiar_conjuro')?.cambioConjuro
  const conNivel = eleccion.filter(b => b.conjuros!.selecciones.some(s => s.nivel >= 1))
  const seleccionConjuros: SeleccionConjurosDote | undefined = eleccion.length && lista ? {
    ...lista,
    selecciones: eleccion.flatMap(b => b.conjuros!.selecciones),
    conjuroNivelUnoSiemprePreparado: conNivel.some(b => b.conjuros!.siemprePreparado),
    lanzamientoSinEspacio: conNivel.find(b => b.conjuros!.lanzamientoSinEspacio)?.conjuros!.lanzamientoSinEspacio,
    permiteUsarEspacios: conNivel.some(b => b.conjuros!.permiteUsarEspacios),
    reemplazoAlSubirNivel: cambio,
    repetible: Boolean(dote.repetible),
    listaDistintaPorRepeticion: Boolean(dote.repetible && lista.listaDistintaPorRepeticion),
  } : undefined
  const { seleccionConjuros: _anterior, ...resto } = dote
  void _anterior
  return { ...resto, beneficios, repetible: Boolean(dote.repetible), conjurosIds: fijos, ...(seleccionConjuros ? { seleccionConjuros } : {}) }
}

const NOMBRE_NIVEL = (nivel: number, cantidad: number) => nivel === 0 ? `${cantidad} ${cantidad === 1 ? 'truco' : 'trucos'}` : `${cantidad} de nivel ${nivel}`

/** Resumen corto de lo que da un beneficio, para listas y el lector («2 trucos · siempre preparado»). */
export function resumenBeneficio(b: BeneficioDote, nombreConjuro: (id: string) => string = () => ''): string {
  if (b.tipo === 'cambiar_conjuro' && b.cambioConjuro) {
    const c = b.cambioConjuro
    return `Al subir de nivel cambia ${c.cantidad} ${c.cantidad === 1 ? 'conjuro' : 'conjuros'}${c.mismoNivel ? ' del mismo nivel' : ''}${c.mismaLista ? ' de la misma lista' : ''}`
  }
  const c = b.conjuros
  if (!c) return ''
  const partes = c.modo === 'fijos'
    ? [c.conjurosIds.map(nombreConjuro).filter(Boolean).join(', ') || 'Conjuros del catálogo']
    : [c.selecciones.map(s => NOMBRE_NIVEL(s.nivel, s.cantidad)).join(' y ') + ' a elegir']
  if (c.siemprePreparado) partes.push('siempre preparado')
  if (c.lanzamientoSinEspacio) partes.push(`${c.lanzamientoSinEspacio.usos} sin espacio por ${c.lanzamientoSinEspacio.recuperacion === 'descanso_corto' ? 'descanso corto' : 'descanso largo'}`)
  if (c.permiteUsarEspacios) partes.push('también con espacios')
  return partes.join(' · ')
}
