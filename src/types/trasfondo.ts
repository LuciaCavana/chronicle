/** Referencias estables a elementos del catálogo de un libro. */
export type ReferenciaCatalogo = { id: string }

/** Una opción de equipo puede combinar objetos y dinero. */
export type OpcionEquipoInicial = {
  id: string
  nombre: string
  objetos: Array<{ objetoId: string; cantidad: number }>
  monedas: Array<{ moneda: string; cantidad: number }>
}

/** Trasfondo de un libro. Las reglas de aumentos se resuelven en el motor. */
export type Trasfondo = {
  id: string
  nombre: string
  descripcion: string
  caracteristicas: string[]
  doteOrigenId: string | null
  competenciasHabilidades: string[]
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
  datosAdicionales?: Record<string, unknown>
}
