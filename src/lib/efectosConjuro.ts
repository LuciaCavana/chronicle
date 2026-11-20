import type { EfectoConjuro, MejoraTruco } from '../types/conjuro'

export const TIPOS_DANO = ['Ácido', 'Contundente', 'Cortante', 'Frío', 'Fuego', 'Fuerza', 'Necrótico', 'Perforante', 'Psíquico', 'Radiante', 'Relámpago', 'Trueno', 'Veneno'] as const

/** Lo que se suma a una curación. */
export const CARACTERISTICAS_CURACION: { valor: string; nombre: string }[] = [
  { valor: '', nombre: 'Nada' },
  { valor: 'lanzamiento', nombre: 'Característica de lanzamiento' },
  { valor: 'Fuerza', nombre: 'Fuerza' }, { valor: 'Destreza', nombre: 'Destreza' }, { valor: 'Constitución', nombre: 'Constitución' },
  { valor: 'Inteligencia', nombre: 'Inteligencia' }, { valor: 'Sabiduría', nombre: 'Sabiduría' }, { valor: 'Carisma', nombre: 'Carisma' },
]

/** «2d4» → «4d4» con el doble de dados (lo demás queda igual). Si no son dados, null. */
export function multiplicarDados(dados: string, veces: number): string | null {
  const m = /^\s*(\d*)d(\d+)(.*)$/i.exec(dados ?? '')
  if (!m) return null
  return `${(Number(m[1] || 1)) * veces}d${m[2]}${m[3]}`.trim()
}

/** La mejora de un truco que sale de los dados de su primer efecto: 1d10 → 2d10, 3d10, 4d10. */
export function mejoraSugerida(efectos: EfectoConjuro[] | undefined): MejoraTruco | null {
  const base = efectos?.find(e => e.tipo !== 'otro' && e.dados?.trim())?.dados
  if (!base) return null
  const [a, b, c] = [2, 3, 4].map(n => multiplicarDados(base, n))
  return a && b && c ? { nivel5: a, nivel11: b, nivel17: c } : null
}

/** Un efecto en una frase: «8d6 de fuego», «2d4 + Constitución», «Aturde al objetivo». */
export function describirEfecto(e: EfectoConjuro): string {
  if (e.tipo === 'dano') return [e.dados?.trim(), e.tipoDano ? `de ${e.tipoDano.toLocaleLowerCase('es')}` : ''].filter(Boolean).join(' ')
  if (e.tipo === 'curacion') {
    const mas = e.caracteristica === 'lanzamiento' ? 'mod. de característica de lanzamiento' : e.caracteristica ? `mod. de ${e.caracteristica}` : ''
    return [e.dados?.trim(), mas].filter(Boolean).join(' + ')
  }
  return e.texto?.trim() ?? ''
}

export const NOMBRE_EFECTO: Record<EfectoConjuro['tipo'], string> = { dano: 'Daño', curacion: 'Curación', otro: 'Efecto' }

/** Efectos con algo escrito (los vacíos no se guardan). */
export const efectosCompletos = (efectos: EfectoConjuro[] | undefined) => (efectos ?? []).filter(e => describirEfecto(e))

/**
 * Lo que se muestra de los efectos, la mejora de truco y el nivel superior, listo para una ficha
 * («Daño: 8d6 de fuego»). Acepta datos de cualquier forma (vienen de la base) y saltea lo que no sirve.
 */
export function datosDeEfecto(conjuro: Record<string, unknown>): { etiqueta: string; valor: string }[] {
  const salida: { etiqueta: string; valor: string }[] = []
  const efectos = Array.isArray(conjuro.efectos) ? conjuro.efectos.filter((e): e is EfectoConjuro => !!e && typeof e === 'object' && ['dano', 'curacion', 'otro'].includes((e as EfectoConjuro).tipo)) : []
  for (const e of efectos) {
    const valor = describirEfecto(e)
    if (valor) salida.push({ etiqueta: NOMBRE_EFECTO[e.tipo], valor })
  }
  const m = conjuro.mejoraTruco as Partial<MejoraTruco> | undefined
  if (m && typeof m === 'object') {
    const partes = ([['nivel5', 5], ['nivel11', 11], ['nivel17', 17]] as const)
      .filter(([k]) => typeof m[k] === 'string' && m[k]!.trim()).map(([k, n]) => `nivel ${n}: ${m[k]!.trim()}`)
    if (partes.length) salida.push({ etiqueta: 'Mejora de truco', valor: partes.join(' · ') })
  }
  if (typeof conjuro.nivelSuperior === 'string' && conjuro.nivelSuperior.trim()) salida.push({ etiqueta: 'Con un espacio de nivel superior', valor: conjuro.nivelSuperior.trim() })
  return salida
}
