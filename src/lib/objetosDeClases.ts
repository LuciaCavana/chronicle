import type { Elemento } from '../services/chronicleLibros'

/**
 * Objetos creados dentro de una clase (Seleccionar objetos › Crear y seleccionar).
 * La clase los guarda en datos.objetosCatalogo; también tienen que figurar en la
 * categoría "Objetos y equipo" del libro, con el mismo id, para que las opciones
 * de equipo y las armas de la clase sigan apuntando al mismo objeto.
 */
type ObjetoDeClase = { id?: unknown; nombre?: unknown; descripcion?: unknown; tipo?: unknown }

const texto = (valor: unknown) => typeof valor === 'string' ? valor : ''

function catalogoDe(clase: Elemento): ObjetoDeClase[] {
  const datos = clase.datos && typeof clase.datos === 'object' ? clase.datos as { objetosCatalogo?: unknown } : {}
  return Array.isArray(datos.objetosCatalogo) ? datos.objetosCatalogo.filter(o => o && typeof o === 'object') as ObjetoDeClase[] : []
}

/** Devuelve los objetos del libro más los de las clases que todavía no estén. Si no falta ninguno, devuelve el mismo arreglo. */
export function sumarObjetosDeClases(objetos: Elemento[], clases: Elemento[]): Elemento[] {
  const existentes = new Set(objetos.map(o => o.id))
  const nuevos: Elemento[] = []
  for (const clase of clases) {
    for (const o of catalogoDe(clase)) {
      const id = texto(o.id), nombre = texto(o.nombre).trim()
      if (!id || !nombre || existentes.has(id)) continue
      existentes.add(id)
      nuevos.push({
        id, tipo: 'objeto', nombre, descripcion: texto(o.descripcion),
        datos: { tipo: o.tipo === 'arma' ? 'arma' : 'equipo', rareza: 'Sin rareza', moneda: 'PO', magico: false },
      } as Elemento)
    }
  }
  return nuevos.length ? [...objetos, ...nuevos] : objetos
}

/** Si el libro tiene objetos, la categoría "objetos" tiene que estar activa para que se vean. */
export function categoriasConObjetos(categorias: string[], hayObjetos: boolean): string[] {
  return hayObjetos && !categorias.includes('objetos') ? [...categorias, 'objetos'] : categorias
}
