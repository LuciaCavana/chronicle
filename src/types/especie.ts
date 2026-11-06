
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

export type TransformacionEspecie = {
  id: string
  nombre: string
  descripcion: string
  activacion: string
  duracion: string
  usos: string
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