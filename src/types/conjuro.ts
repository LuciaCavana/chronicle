
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


export type CaracteristicaMagica = 'fuerza' | 'destreza' | 'constitucion' | 'inteligencia' | 'sabiduria' | 'carisma' | 'eleccion' | 'ninguna'

/**
 * Conjuros que otorga algo (beneficio de dote, rasgo de especie, beneficio de linaje): la misma
 * forma de guardarlo en todos lados, para que el creador de personajes lo aplique solo.
 */
export type ConjurosOtorgados = {
  /** «fijos»: conjuros puntuales del catálogo; «eleccion»: se eligen de una lista de clase. */
  modo: 'eleccion' | 'fijos'
  /** Modo «eleccion»: cuántos de cada nivel (0 = truco). */
  selecciones: Array<{ nivel: number; cantidad: number }>
  /** Modo «fijos»: IDs de conjuros del catálogo. */
  conjurosIds: string[]
  siemprePreparado?: boolean
  lanzamientoSinEspacio?: { usos: number; recuperacion: 'descanso_largo' | 'descanso_corto' }
  permiteUsarEspacios?: boolean
  /** Modo «eleccion»: clases de la lista. En las dotes se usa la lista de la dote. */
  listas?: string[]
  /** Aptitud mágica. En las dotes se usa la de la dote. */
  caracteristica?: CaracteristicaMagica
  /** Si la aptitud es «eleccion»: entre cuáles (por defecto Inteligencia, Sabiduría y Carisma). */
  aptitudesAEleccion?: string[]
  /** Se puede cambiar por otro: cuándo, de qué lista y si tiene que ser del mismo nivel. */
  cambio?: { momento: 'descanso_largo' | 'descanso_corto' | 'subir_nivel'; listas: string[]; mismoNivel: boolean; cantidad: number }
  /** Para casos raros que no entran en los datos de arriba. */
  notas?: string
}

/** Un otorgamiento de un rasgo o beneficio de linaje: además, a qué nivel de personaje se obtiene. */
export type OtorgamientoConjuros = ConjurosOtorgados & { id: string; nivelRequerido: number }

/** Formato anterior (hasta el 26/11/2026) de los conjuros de rasgos de especie; se convierte al abrir. */
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
