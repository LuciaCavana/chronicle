/** Estadísticas de monstruos y criaturas, incluidas invocaciones escalables. */
export type ValorCriatura = { valor: string; notas?: string }
export type CaracteristicaCriatura = { puntuacion: number; salvacion?: string }
export type RasgoCriatura = { id: string; nombre: string; descripcion: string }
export type SeccionCriatura = 'rasgos' | 'acciones' | 'acciones_adicionales' | 'reacciones' | 'acciones_legendarias' | 'acciones_guarida' | 'efectos_regionales'
export type Criatura = {
  id: string
  nombre: string
  fuente?: { libro: string; pagina?: number }
  tamano: string
  tipo: string
  subtipo?: string
  alineamiento: string
  invocacion: boolean
  /** IDs de todos los conjuros capaces de invocar esta criatura. */
  conjurosInvocacionIds?: string[]
  /** Compatibilidad con borradores anteriores; se migra al editar. */
  conjuroInvocacionId?: string
  nivelConjuroBase?: number
  variantes: string[]
  ca: ValorCriatura
  iniciativa: ValorCriatura
  pg: ValorCriatura
  velocidades: Array<{ id: string; tipo: string; valor: string; condicion?: string }>
  caracteristicas: Record<'fuerza' | 'destreza' | 'constitucion' | 'inteligencia' | 'sabiduria' | 'carisma', CaracteristicaCriatura>
  habilidades: Array<{ id: string; nombre: string; bonificador: string }>
  resistencias: string
  inmunidadesDano: string
  inmunidadesEstados: string
  vulnerabilidades: string
  sentidos: string
  idiomas: string
  desafio: string
  experiencia: string
  competencia: string
  habitat: string
  tesoro: string
  secciones: Record<SeccionCriatura, RasgoCriatura[]>
  notas?: string
}
