/** Referencias estables a elementos del catálogo de un libro. */
export type ReferenciaCatalogo = { id: string }

/** Una opción de equipo puede combinar objetos y dinero. */
export type OpcionEquipoInicial = {
  id: string
  nombre: string
  objetos: Array<{ objetoId: string; cantidad: number }>
  monedas: Array<{ moneda: string; cantidad: number }>
}

/** Trasfondo de un libro. La distribución elegida se resuelve en el creador de personajes. */
export type Trasfondo = {
  id: string
  nombre: string
  descripcion: string
  caracteristicas: string[]
  /** Por defecto, los trasfondos nuevos admiten +2/+1 o +1/+1/+1 entre sus tres características. */
  aumentoCaracteristicas?: { habilitado: boolean; distribuciones: Array<'2_1' | '1_1_1'> }
  doteOrigenId: string | null
  /** Lista fijada por el trasfondo para dotes con elección de magia. */
  listaConjurosFijada?: string
  competenciasHabilidades: string[]
  /** Idiomas otorgados por el trasfondo; puede ser uno fijo o una elección. */
  idiomas?: Array<{ tipo: 'fijo' | 'eleccion'; idioma?: string }>
  competenciasHerramientas: string[]
  opcionesEquipo: OpcionEquipoInicial[]
  datosAdicionales?: Record<string, unknown>
}

/** Efecto declarativo: el motor valida y ejecuta operaciones admitidas. */
export type EfectoDote = {
  id: string
  evento: 'al_obtener' | 'al_subir_nivel' | 'pasivo'
  atributo: string
  operacion: 'sumar' | 'establecer'
  valor: number
  escala?: 'fijo' | 'nivel_personaje'
  descripcion?: string
}

/** Selección dinámica desde listas de clase, no referencias a cada conjuro. */
export type SeleccionConjurosDote = {
  listasPermitidas: string[]
  listaSegunOrigen: boolean
  mismaLista: boolean
  selecciones: Array<{ nivel: number; cantidad: number }>
  caracteristicasMagicas: string[]
  conjuroNivelUnoSiemprePreparado?: boolean
  lanzamientoSinEspacio?: { usos: number; recuperacion: 'descanso_largo' | 'descanso_corto' }
  permiteUsarEspacios?: boolean
  reemplazoAlSubirNivel?: { cantidad: number; mismoNivel: boolean; mismaLista: boolean }
  repetible?: boolean
  listaDistintaPorRepeticion?: boolean
}

/** Restricción de una dote al otorgarla desde un trasfondo u otra fuente. */
export type RestriccionOrigenDote = { listaConjurosFijada?: string }

/** Dote reutilizable por trasfondos y otras fuentes. */
export type Dote = {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  requisitos: string[]
  beneficios: string[]
  fuente?: { libro?: string; pagina?: number }
  efectos?: EfectoDote[]
  /** IDs de conjuros del catálogo; evita duplicar su definición. */
  conjurosIds?: string[]
  seleccionConjuros?: SeleccionConjurosDote
  datosAdicionales?: Record<string, unknown>
}
