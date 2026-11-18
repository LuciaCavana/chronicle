/** Un elemento del libro tal como se muestra en el índice y en la vista de categoría. */
export type ElementoIndice = { id: string; nombre: string; detalle?: string; incompleto?: boolean }

/** Una categoría activa del libro con sus elementos y acciones. */
export type SeccionLibro = {
  id: string
  titulo: string
  /** Nombre en singular para los botones ("Agregar clase"). */
  singular: string
  elementos: ElementoIndice[]
  /** Categorías sin editor todavía (por ejemplo, Reglas). */
  sinEditor?: boolean
  agregar?: () => void
  editar: (id: string) => void
  eliminar: (id: string) => void
  /** Acciones extra de la categoría (por ejemplo, cargar las maestrías de armas). */
  extras?: { etiqueta: string; accion: () => void }[]
}

export type ElementoActivo = { categoria: string; id: string | null } | null
