import type { ConjurosOtorgados } from './conjuro'
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

/** Conjuros que da un beneficio de dote (misma forma que en especies; la lista y la aptitud son las de la dote). */
export type ConjurosBeneficio = ConjurosOtorgados

/** Un beneficio de la dote: título («Dos trucos»), texto y, si corresponde, lo que otorga. */
export type BeneficioDote = {
  id: string
  nombre: string
  descripcion: string
  /** «cambiar_conjuro»: permite reemplazar conjuros de la dote al subir de nivel. */
  tipo?: 'normal' | 'cambiar_conjuro'
  conjuros?: ConjurosBeneficio
  cambioConjuro?: { cantidad: number; mismoNivel: boolean; mismaLista: boolean }
}

/** Dote reutilizable por trasfondos y otras fuentes. */
export type Dote = {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  requisitos: string[]
  /** Las dotes guardadas antes del 26/11/2026 tienen texto suelto; normalizarDote las convierte. */
  beneficios: BeneficioDote[]
  /** Se puede elegir más de una vez. */
  repetible?: boolean
  fuente?: { libro?: string; pagina?: number }
  efectos?: EfectoDote[]
  /** IDs de conjuros del catálogo (todos los «fijos» de los beneficios; se calcula al guardar). */
  conjurosIds?: string[]
  /** Lista de conjuros de la dote (clases y aptitud mágica). `selecciones` se calcula al guardar. */
  seleccionConjuros?: SeleccionConjurosDote
  datosAdicionales?: Record<string, unknown>
}
