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

/** Dote reutilizable por trasfondos y otras fuentes. */
export type Dote = {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  requisitos: string[]
  beneficios: string[]
  datosAdicionales?: Record<string, unknown>
}
