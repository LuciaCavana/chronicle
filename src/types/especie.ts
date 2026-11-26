import type { ConjuroOtorgado, OtorgamientoConjuros } from './conjuro'

export type CampoAdicionalEspecie = {
  id: string
  nombre: string
  tipo: 'texto' | 'numero' | 'booleano'
  valor: string | number | boolean
}

export type TamanoEspecie = {
  id: string
  nombre: string
  alturaMinima: number | null
  alturaMaxima: number | null
}


/** De qué se da competencia (o se elige): habilidades, armas, idiomas… */
export type CategoriaCompetencia = 'habilidades' | 'armas' | 'armaduras' | 'herramientas' | 'idiomas' | 'salvaciones'
export type MovimientoEspecie = 'caminar' | 'nado' | 'vuelo' | 'trepar' | 'excavar'

/**
 * Lo que un rasgo o un beneficio de linaje le da al personaje, además de su texto, para que el
 * creador de personajes lo aplique solo. Los conjuros van aparte (conjuros).
 */
export type EfectoEspecie =
  | { id: string; tipo: 'vision_oscuridad'; modo: 'establecer' | 'sumar'; pies: number }
  | { id: string; tipo: 'velocidad'; movimiento: MovimientoEspecie; modo: 'sumar' | 'establecer' | 'igual_caminar'; pies: number }
  /** modo «fija»: da todas las opciones; «eleccion»: se eligen `cantidad` entre las opciones (vacías = cualquiera). */
  | { id: string; tipo: 'competencia'; categoria: CategoriaCompetencia; modo: 'fija' | 'eleccion'; opciones: string[]; cantidad: number }
  | { id: string; tipo: 'resistencia'; grado: 'resistencia' | 'inmunidad'; danos: string[]; aEleccion?: boolean }
  /** Ventaja en tiradas de salvación (u otras) contra algo, p. ej. «el estado hechizado». */
  | { id: string; tipo: 'ventaja'; contra: string }
  | { id: string; tipo: 'puntos_golpe'; alObtener: number; porNivel: number }
  | { id: string; tipo: 'dote'; categoria: string; cantidad: number }

export type TipoEfectoEspecie = EfectoEspecie['tipo']

export type RasgoEspecie = {
  id: string
  nombre: string
  descripcion: string

  conjuros?: OtorgamientoConjuros[]
  /** Formato anterior: se convierte a `conjuros` al abrir. */
  conjurosOtorgados?: ConjuroOtorgado[]
  efectos?: EfectoEspecie[]
}

export type BeneficioNivel = {
  id: string
  nivel: number
  descripcion: string
  /** Conjuros que se obtienen a ese nivel (p. ej. Drow: Fuego feérico a nivel 3). */
  conjuros?: OtorgamientoConjuros[]
  /** Formato anterior: se convierte a `conjuros` al abrir. */
  conjurosOtorgados?: ConjuroOtorgado[]
  efectos?: EfectoEspecie[]
}

export type LinajeEspecie = {
  id: string
  nombre: string
  descripcion: string
  beneficios: BeneficioNivel[]
}


export type TipoUsosTransformacion =
  | 'fijo'
  | 'competencia'
  | 'nivel'
  | 'caracteristica'
  | 'ilimitado'
  | 'especial'

export type RecuperacionTransformacion =
  | 'descanso_corto'
  | 'descanso_largo'
  | 'otro'
  | 'ninguna'

export type ConfiguracionUsosTransformacion = {
  tipo: TipoUsosTransformacion
  cantidad: number | null
  caracteristica: string
  reglaEspecial: string
  recuperacion: RecuperacionTransformacion
  recuperacionEspecial: string
}

export type OpcionTransformacion = {
  id: string
  nombre: string
  descripcion: string
}

export type TransformacionEspecie = {
  id: string
  nombre: string
  descripcion: string

  nivelRequerido?: number

  activacion: string
  duracion: string

  // Compatibilidad con transformaciones anteriores
  usos: string

  // Nueva configuración estructurada
  configuracionUsos?: ConfiguracionUsosTransformacion

  // Efectos compartidos por todas las opciones
  efectosGenerales?: string

  // Opciones disponibles al transformarse
  opciones?: OpcionTransformacion[]

  // Mejoras o beneficios obtenidos por nivel
  beneficios: BeneficioNivel[]
}


export type Especie = {
  id: string
  nombre: string
  descripcion: string
  tamanos: TamanoEspecie[]
  tiposCriatura: string[]
  velocidad: string
  /** Velocidades además de caminar (nado, vuelo, trepar, excavar). */
  velocidadesExtra?: VelocidadesExtra
  visionOscuridad: boolean
  alcanceVision: string
  pagina: string
  rasgos: RasgoEspecie[]
  linajes: LinajeEspecie[]
  transformaciones: TransformacionEspecie[]
  camposAdicionales?: CampoAdicionalEspecie[]
}
export type TipoVelocidadExtra = 'nado' | 'vuelo' | 'trepar' | 'excavar'
/** Una velocidad extra: en pies, o igual a la velocidad de la especie. */
export type VelocidadExtra = { pies: string; igualAVelocidad?: boolean }
export type VelocidadesExtra = Partial<Record<TipoVelocidadExtra, VelocidadExtra>>
