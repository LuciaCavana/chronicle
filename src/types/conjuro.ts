
export type TipoConjuro = 'truco' | 'conjuro'


export type Conjuro = {
  id: string
  nombre: string
  tipo: TipoConjuro
  nivel: number
  escuela: string

  tiempoLanzamiento: string
  alcance: string

  componentes: string
  componenteMaterial: string

  duracion: string
  concentracion: boolean
  ritual: boolean

  clases: string[]

  descripcion: string
  libroOrigen?: string
  paginaOrigen?: number

  /** Qué hace: daño, curación u otro efecto (puede tener más de uno). */
  efectos?: EfectoConjuro[]
  /** Trucos: cómo mejoran con el nivel del personaje (niveles 5, 11 y 17). */
  mejoraTruco?: MejoraTruco
  /** Conjuros de nivel 1 o más: qué suma con un espacio de nivel superior (ej. «+1d6 por cada nivel por encima de 3»). */
  nivelSuperior?: string
}

export type TipoEfectoConjuro = 'dano' | 'curacion' | 'otro'

export type EfectoConjuro = {
  id: string
  tipo: TipoEfectoConjuro
  /** Daño o curación: los dados (ej. «8d6», «2d4»). */
  dados?: string
  /** Daño: de qué tipo (fuego, frío…). */
  tipoDano?: string
  /** Curación: la característica que se suma ('lanzamiento' = característica de lanzamiento). */
  caracteristica?: string
  /** Otro efecto: una frase corta. */
  texto?: string
}

export type MejoraTruco = { nivel5: string; nivel11: string; nivel17: string }


export type ConjuroOtorgado = {
  id: string

  // Referencia al conjuro de Biblioteca
  conjuroId: string

  // Nivel de personaje al que se obtiene
  nivelRequerido: number

  // Cómo se obtiene
  formaObtencion: 'aprendido' | 'preparado' | 'lanzamiento_especial'

  // Cómo se utiliza
  caracteristica:
    | 'fuerza'
    | 'destreza'
    | 'constitucion'
    | 'inteligencia'
    | 'sabiduria'
    | 'carisma'
    | 'eleccion'
    | 'ninguna'

  // Reglas adicionales propias del rasgo
  reglasUso: string
}
