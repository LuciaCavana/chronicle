/** Catálogos iniciales extensibles. Las entradas Homebrew se guardan en cada libro. */
export const ARMADURAS_BASE = ['Ligera', 'Media', 'Pesada', 'Escudos']
export const ARMAS_BASE = ['Sencillas', 'Marciales', 'Improvisadas']
export const HABILIDADES_BASE = ['Acrobacias', 'Arcanos', 'Atletismo', 'Engaño', 'Historia', 'Interpretación', 'Intimidación', 'Investigación', 'Juego de manos', 'Medicina', 'Naturaleza', 'Percepción', 'Perspicacia', 'Persuasión', 'Religión', 'Sigilo', 'Supervivencia', 'Trato con animales']
export type CompetenciasClase = {
  armaduras: string[]
  armadurasPersonalizadas: string[]
  armasCategorias: string[]
  armasPersonalizadas: string[]
  armasEspecificas: string[]
  habilidadesCantidad: number
  habilidadesOpciones: string[]
  habilidadesPersonalizadas: string[]
}
export type ObjetoCatalogo = { id: string; nombre: string; descripcion: string; tipo: 'arma' | 'objeto' }
export type ItemEquipo = { objetoId: string; cantidad: number }
export type OpcionEquipo = { id: string; objetos: ItemEquipo[]; oro: number }
export type GrupoEquipo = { id: string; elegir: number; opciones: OpcionEquipo[] }
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
const equivalenciasArmas: Record<string, string> = {
  simple: 'Sencillas', simples: 'Sencillas', sencilla: 'Sencillas', sencillas: 'Sencillas',
  marcial: 'Marciales', marciales: 'Marciales',
  improvisada: 'Improvisadas', improvisadas: 'Improvisadas',
}
export function normalizarCategoriaArma(valor: string): string {
  const nombre = valor.trim().replace(/\\s+/g, ' ')
  return equivalenciasArmas[nombre.toLocaleLowerCase('es')] ?? nombre
}
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
export function normalizarCompetencias(datos: Record<string, unknown>): CompetenciasClase {
  const c = record(datos.competencias)
  const opciones = strings(c.habilidadesOpciones)
  const cantidad = typeof c.habilidadesCantidad === 'number' && Number.isFinite(c.habilidadesCantidad) ? Math.floor(c.habilidadesCantidad) : 0
  return {
    armaduras: strings(c.armaduras), armadurasPersonalizadas: strings(c.armadurasPersonalizadas),
    armasCategorias: [...new Set(strings(c.armasCategorias).map(normalizarCategoriaArma))], armasPersonalizadas: [...new Set(strings(c.armasPersonalizadas).map(normalizarCategoriaArma))],
    armasEspecificas: strings(c.armasEspecificas), habilidadesCantidad: Math.max(0, Math.min(cantidad, opciones.length)),
    habilidadesOpciones: opciones, habilidadesPersonalizadas: strings(c.habilidadesPersonalizadas),
  }
}
export function normalizarCatalogo(valor: unknown): ObjetoCatalogo[] {
  if (!Array.isArray(valor)) return []
  return valor.map(record).filter(o => typeof o.id === 'string' && typeof o.nombre === 'string').map(o => ({
    id: o.id as string, nombre: o.nombre as string,
    descripcion: typeof o.descripcion === 'string' ? o.descripcion : '',
    tipo: o.tipo === 'arma' ? 'arma' as const : 'objeto' as const,
  }))
}
export function normalizarEquipo(valor: unknown): GrupoEquipo[] {
  if (!Array.isArray(valor)) return []
  return valor.map((v) => {
    const grupo = record(v)
    const opciones: OpcionEquipo[] = Array.isArray(grupo.opciones) ? grupo.opciones.map((o) => {
      const opcion = record(o)
      const objetos: ItemEquipo[] = Array.isArray(opcion.objetos) ? opcion.objetos.map(record)
        .filter(x => typeof x.objetoId === 'string')
        .map(x => ({ objetoId: x.objetoId as string, cantidad: Math.max(1, Math.floor(Number(x.cantidad) || 1)) })) : []
      return { id: typeof opcion.id === 'string' ? opcion.id : crypto.randomUUID(), objetos,
        oro: Math.max(0, Math.floor(Number(opcion.oro) || 0)) }
    }) : []
    return { id: typeof grupo.id === 'string' ? grupo.id : crypto.randomUUID(),
      elegir: Math.max(1, Math.min(opciones.length || 1, Math.floor(Number(grupo.elegir) || 1))), opciones }
  })
}
export function validarOpcionesEquipo(grupo: GrupoEquipo, ids: string[]): boolean {
  return ids.length === grupo.elegir && new Set(ids).size === ids.length &&
    ids.every(id => grupo.opciones.some(opcion => opcion.id === id))
}
export function resolverEquipo(grupo: GrupoEquipo, ids: string[]) {
  if (!validarOpcionesEquipo(grupo, ids)) throw new Error('Selección de equipamiento inválida')
  const objetos = new Map<string, number>()
  let oro = 0
  for (const opcion of grupo.opciones.filter(o => ids.includes(o.id))) {
    oro += opcion.oro
    for (const item of opcion.objetos) objetos.set(item.objetoId, (objetos.get(item.objetoId) ?? 0) + item.cantidad)
  }
  return { oro, objetos: [...objetos].map(([objetoId, cantidad]) => ({ objetoId, cantidad })) }
}
/** Para el futuro creador de personajes: validar una elección sin depender del texto visible. */
export function validarHabilidades(permitidas: string[], cantidad: number, elegidas: string[]): boolean {
  return elegidas.length === cantidad && new Set(elegidas).size === elegidas.length && elegidas.every(id => permitidas.includes(id))
}
export function tieneCompetenciaArma(competencias: CompetenciasClase, arma: { id: string; categoria: string }): boolean {
  return competencias.armasCategorias.includes(normalizarCategoriaArma(arma.categoria)) || competencias.armasEspecificas.includes(arma.id)
}
export function tieneCompetenciaArmadura(competencias: CompetenciasClase, categoria: string): boolean {
  return competencias.armaduras.includes(categoria)
}
