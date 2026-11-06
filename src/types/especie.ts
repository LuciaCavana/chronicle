import type { ConjuroOtorgado } from './conjuro'

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


export type RasgoEspecie = {
  id: string
  nombre: string
  descripcion: string

  conjurosOtorgados?: ConjuroOtorgado[]
}

export type BeneficioNivel = {
  id: string
  nivel: number
  descripcion: string
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
  visionOscuridad: boolean
  alcanceVision: string
  pagina: string
  rasgos: RasgoEspecie[]
  linajes: LinajeEspecie[]
  transformaciones: TransformacionEspecie[]
  camposAdicionales?: CampoAdicionalEspecie[]
}