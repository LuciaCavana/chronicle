/** Reemplaza un elemento por id, o lo agrega si todavía no existe. */
export function reemplazarOAgregar<T extends { id: string }>(lista: T[], elemento: T): T[] {
  return lista.some(item => item.id === elemento.id)
    ? lista.map(item => item.id === elemento.id ? elemento : item)
    : [...lista, elemento]
}

/** Elimina un elemento por id sin mutar la lista original. */
export function eliminarPorId<T extends { id: string }>(lista: T[], id: string): T[] {
  return lista.filter(item => item.id !== id)
}
