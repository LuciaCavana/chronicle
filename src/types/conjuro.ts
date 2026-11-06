
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
  duracion: string
  concentracion: boolean
  ritual: boolean
  descripcion: string
}

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
