import type { ConjuroDeRasgo, ConjuroDisponible } from '../components/biblioteca/ConjurosRasgoEditor'

export type Regla = Pick<ConjuroDeRasgo, 'otorgamiento' | 'modoUso' | 'usosGratuitos' | 'recuperacion' | 'permiteEspacios'>
export type GrupoConjuros = { firma: string; regla: Regla; conjuros: ConjuroDeRasgo[] }

export const reglasRapidas: { nombre: string; descripcion: string; regla: Regla }[] = [
  { nombre: 'Siempre preparados', descripcion: 'No cuentan para tu límite de conjuros preparados. Se lanzan gastando espacios.', regla: { otorgamiento: 'siempre_preparado', modoUso: 'normal', usosGratuitos: 1, recuperacion: 'largo', permiteEspacios: false } },
  { nombre: 'Preparado + 1 gratis por descanso largo', descripcion: 'Una vez sin gastar espacio; se recupera tras un descanso largo. También se puede lanzar con espacios.', regla: { otorgamiento: 'siempre_preparado', modoUso: 'gratis', usosGratuitos: 1, recuperacion: 'largo', permiteEspacios: true } },
  { nombre: 'Aprendidos', descripcion: 'Se suman a los conocidos y cuentan como conjuros de la clase.', regla: { otorgamiento: 'aprendido', modoUso: 'normal', usosGratuitos: 1, recuperacion: 'largo', permiteEspacios: false } },
  { nombre: 'Solo con esta característica', descripcion: 'Un uso por descanso largo, sin gastar espacios.', regla: { otorgamiento: 'solo_caracteristica', modoUso: 'exclusivo', usosGratuitos: 1, recuperacion: 'largo', permiteEspacios: false } },
]

export const firmaRegla = (r: Regla): string =>
  r.modoUso === 'normal'
    ? [r.otorgamiento, r.modoUso].join('|')
    : [r.otorgamiento, r.modoUso, r.usosGratuitos, r.recuperacion, r.modoUso === 'gratis' ? r.permiteEspacios : false].join('|')

export function agruparConjuros(conjuros: ConjuroDeRasgo[]): GrupoConjuros[] {
  const grupos = new Map<string, GrupoConjuros>()
  for (const conjuro of conjuros) {
    const firma = firmaRegla(conjuro)
    const existente = grupos.get(firma)
    if (existente) existente.conjuros.push(conjuro)
    else grupos.set(firma, { firma, regla: conjuro, conjuros: [conjuro] })
  }
  return [...grupos.values()]
}

export const reglaRapida = (regla: Regla) => reglasRapidas.find(r => firmaRegla(r.regla) === firmaRegla(regla))
export const nombreRegla = (regla: Regla) => reglaRapida(regla)?.nombre ?? 'Regla personalizada'
const descanso = (r: Regla) => r.recuperacion === 'ambos' ? 'un descanso corto o largo' : `un descanso ${r.recuperacion}`
const cantidad = (n: number) => `${n} ${n === 1 ? 'vez' : 'veces'}`

export function resumenRegla(r: Regla): string {
  const base = r.otorgamiento === 'siempre_preparado'
    ? 'Siempre preparado. No cuenta para el límite de conjuros preparados.'
    : r.otorgamiento === 'aprendido' ? 'Aprendido como conjuro de la clase.' : 'Otorgado solo por esta característica.'
  if (r.modoUso === 'normal') return `${base} Se lanza gastando espacios de conjuro.`
  return `${base} Podés lanzarlo ${cantidad(r.usosGratuitos)} sin gastar un espacio de conjuro y recuperás los usos tras ${descanso(r)}.${r.modoUso === 'gratis' && r.permiteEspacios ? ' También podés lanzarlo gastando espacios.' : ''}`
}

const lista = (items: string[]) => new Intl.ListFormat('es', { type: 'conjunction' }).format(items)
export function textoLibro(grupos: GrupoConjuros[], disponibles: ConjuroDisponible[], nivel?: number): string {
  if (!grupos.length) return 'Esta característica todavía no otorga conjuros.'
  const nombres = new Map(disponibles.map(c => [c.id, c.nombre]))
  const partes = grupos.map(g => {
    const nombresGrupo = lista(g.conjuros.map(c => nombres.get(c.conjuroId) ?? 'un conjuro no disponible'))
    const r = g.regla
    const inicio = r.otorgamiento === 'siempre_preparado' ? `siempre tenés preparados ${nombresGrupo}` :
      r.otorgamiento === 'aprendido' ? `aprendés ${nombresGrupo}` : `obtenés ${nombresGrupo} mediante esta característica`
    if (r.modoUso === 'normal') return inicio + '.'
    return `${inicio}. Podés lanzar ${nombresGrupo} ${cantidad(r.usosGratuitos)} sin gastar un espacio de conjuro y recuperás ${r.usosGratuitos === 1 ? 'ese uso' : 'esos usos'} al terminar ${descanso(r)}.${r.modoUso === 'gratis' && r.permiteEspacios ? ' También podés lanzarlos gastando espacios.' : ''}`
  })
  return `${nivel !== undefined ? `Al llegar a nivel ${nivel}, ` : ''}${partes.join(' ')}`
}
