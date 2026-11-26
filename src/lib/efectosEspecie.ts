import type { CategoriaCompetencia, EfectoEspecie, MovimientoEspecie, TipoEfectoEspecie } from '../types/especie'
import { ARMADURAS_BASE, ARMAS_BASE, HABILIDADES_BASE } from './catalogosReglas'

/** Efectos de rasgos y linajes: valores iniciales, catálogos y el resumen que se ve en el lector. */

export const TIPOS_EFECTO: [TipoEfectoEspecie, string][] = [
  ['vision_oscuridad', 'Visión en la oscuridad'],
  ['velocidad', 'Velocidad'],
  ['competencia', 'Competencia (habilidad, arma, herramienta, idioma…)'],
  ['resistencia', 'Resistencia o inmunidad a daño'],
  ['ventaja', 'Ventaja en tiradas de salvación'],
  ['puntos_golpe', 'Puntos de golpe adicionales'],
  ['dote', 'Dote adicional'],
]

export const CATEGORIAS_COMPETENCIA: [CategoriaCompetencia, string][] = [
  ['habilidades', 'Habilidades'], ['armas', 'Armas'], ['armaduras', 'Armaduras'], ['herramientas', 'Herramientas'],
  ['idiomas', 'Idiomas'], ['salvaciones', 'Tiradas de salvación'],
]

export const MOVIMIENTOS: [MovimientoEspecie, string][] = [['caminar', 'Caminar'], ['nado', 'Nado'], ['vuelo', 'Vuelo'], ['trepar', 'Trepar'], ['excavar', 'Excavar']]

export const TIPOS_DANO = ['Ácido', 'Contundente', 'Cortante', 'Frío', 'Fuego', 'Fuerza', 'Necrótico', 'Perforante', 'Psíquico', 'Radiante', 'Relámpago', 'Trueno', 'Veneno']
export const SALVACIONES = ['Fuerza', 'Destreza', 'Constitución', 'Inteligencia', 'Sabiduría', 'Carisma']

/** Opciones sugeridas para cada categoría de competencia (herramientas e idiomas se escriben). */
export function catalogoCompetencia(categoria: CategoriaCompetencia): string[] {
  switch (categoria) {
    case 'habilidades': return HABILIDADES_BASE
    case 'armas': return ARMAS_BASE
    case 'armaduras': return ARMADURAS_BASE
    case 'salvaciones': return SALVACIONES
    default: return []
  }
}

export function nuevoEfecto(tipo: TipoEfectoEspecie): EfectoEspecie {
  const id = crypto.randomUUID()
  switch (tipo) {
    case 'vision_oscuridad': return { id, tipo, modo: 'establecer', pies: 60 }
    case 'velocidad': return { id, tipo, movimiento: 'caminar', modo: 'sumar', pies: 5 }
    case 'competencia': return { id, tipo, categoria: 'habilidades', modo: 'fija', opciones: [], cantidad: 1 }
    case 'resistencia': return { id, tipo, grado: 'resistencia', danos: [] }
    case 'ventaja': return { id, tipo, contra: '' }
    case 'puntos_golpe': return { id, tipo, alObtener: 1, porNivel: 1 }
    case 'dote': return { id, tipo, categoria: 'origen', cantidad: 1 }
  }
}

const NOMBRE_DOTE: Record<string, string> = { origen: 'de origen', general: 'general', epica: 'épica', estilo_combate: 'de estilo de combate' }
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
const SINGULAR_PLURAL: Record<CategoriaCompetencia, [string, string]> = {
  habilidades: ['habilidad', 'habilidades'], armas: ['arma', 'armas'], armaduras: ['armadura', 'armaduras'],
  herramientas: ['herramienta', 'herramientas'], idiomas: ['idioma', 'idiomas'], salvaciones: ['tirada de salvación', 'tiradas de salvación'],
}
const etiquetaCategoria = (c: CategoriaCompetencia) => (CATEGORIAS_COMPETENCIA.find(([v]) => v === c)?.[1] ?? c).toLowerCase()

/** Texto corto de un efecto, p. ej. «Visión en la oscuridad: 120 pies» o «Elegí 1 habilidad: Perspicacia, Percepción o Supervivencia». */
export function resumenEfecto(e: EfectoEspecie): string {
  switch (e.tipo) {
    case 'vision_oscuridad': return e.modo === 'sumar' ? `Visión en la oscuridad: +${e.pies} pies` : `Visión en la oscuridad: ${e.pies} pies`
    case 'velocidad': {
      const mov = (MOVIMIENTOS.find(([v]) => v === e.movimiento)?.[1] ?? e.movimiento).toLowerCase()
      if (e.modo === 'igual_caminar') return `Velocidad de ${mov} igual a la de caminar`
      return e.modo === 'sumar' ? `Velocidad (${mov}): +${e.pies} pies` : `Velocidad (${mov}): ${e.pies} pies`
    }
    case 'competencia': {
      const cual = etiquetaCategoria(e.categoria)
      if (e.modo === 'fija') return e.opciones.length ? `Competencia en ${cual}: ${e.opciones.join(', ')}` : `Competencia en ${cual}`
      const entre = e.opciones.length ? `: ${e.opciones.slice(0, -1).join(', ')}${e.opciones.length > 1 ? ' o ' : ''}${e.opciones.at(-1)}` : ' a elección'
      const [uno, varios] = SINGULAR_PLURAL[e.categoria]
      return `Elegí ${plural(e.cantidad, uno, varios)}${entre}`
    }
    case 'resistencia': {
      const que = e.grado === 'inmunidad' ? 'Inmunidad' : 'Resistencia'
      if (e.aEleccion) return `${que} a un tipo de daño a elección${e.danos.length ? ` (${e.danos.join(', ')})` : ''}`
      return `${que} al daño de ${e.danos.length ? e.danos.join(', ').toLowerCase() : '—'}`
    }
    case 'ventaja': return `Ventaja en tiradas de salvación${e.contra.trim() ? ` contra ${e.contra.trim()}` : ''}`
    case 'puntos_golpe': {
      const partes = [e.alObtener ? `+${e.alObtener} al obtenerlo` : '', e.porNivel ? `+${e.porNivel} por nivel` : ''].filter(Boolean)
      return `Puntos de golpe máximos: ${partes.join(' y ') || 'sin cambios'}`
    }
    case 'dote': return `${plural(e.cantidad, 'dote', 'dotes')} ${NOMBRE_DOTE[e.categoria] ?? e.categoria} a elección`
  }
}

/** Efectos guardados (pueden venir de datos viejos o incompletos): se descartan los que no se entienden. */
export function leerEfectos(valor: unknown): EfectoEspecie[] {
  if (!Array.isArray(valor)) return []
  const tipos = new Set(TIPOS_EFECTO.map(([t]) => t))
  return valor.filter((e): e is EfectoEspecie => Boolean(e) && typeof e === 'object' && tipos.has((e as { tipo: TipoEfectoEspecie }).tipo))
}
