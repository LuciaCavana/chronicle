import type { NuevoLibro } from '../services/libros'

/**
 * Arma el «contenido» de un libro tal como se guarda en propuestas.
 * Mantiene el mismo orden de campos y los mismos valores por defecto que antes
 * (características y capítulos vacíos si no vienen).
 */
export function contenidoDeLibro(datos: NuevoLibro) {
  return {
    especies: datos.especies,
    conjuros: datos.conjuros,
    dotes: datos.dotes,
    trasfondos: datos.trasfondos,
    criaturas: datos.criaturas,
    clases: datos.clases,
    subclases: datos.subclases,
    objetos: datos.objetos,
    caracteristicas: datos.caracteristicas ?? [],
    capitulos: datos.capitulos ?? [],
  }
}

/** Arma los metadatos del libro (código, edición, editorial y clasificación). */
export function metadatosDeLibro(datos: Pick<NuevoLibro, 'codigo' | 'edicion' | 'editorial' | 'clasificacion'>) {
  return {
    codigo: datos.codigo,
    edicion: datos.edicion,
    editorial: datos.editorial,
    clasificacion: datos.clasificacion,
  }
}
