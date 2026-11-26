/** Reemplaza un elemento por id, o lo agrega al final si todavía no existe. No modifica la lista original. */
export function reemplazarOAgregar<T extends { id: string }>(lista: T[], elemento: T): T[] {
  return lista.some(item => item.id === elemento.id)
    ? lista.map(item => item.id === elemento.id ? elemento : item)
    : [...lista, elemento]
}

/** Elimina un elemento por id sin modificar la lista original. */
export function eliminarPorId<T extends { id: string }>(lista: T[], id: string): T[] {
  return lista.filter(item => item.id !== id)
}

/** Nombre para comparar: sin mayúsculas, tildes ni espacios de más («Dracónido» = «draconido»). */
export function claveNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim()
}

/** ¿Hay otro elemento (distinto id) con el mismo nombre? */
export function nombreRepetido<T extends { id: string; nombre: string }>(lista: T[], elemento: { id?: string | null; nombre: string }): boolean {
  const clave = claveNombre(elemento.nombre)
  return Boolean(clave) && lista.some(item => item.id !== elemento.id && claveNombre(item.nombre) === clave)
}

/** El primer nombre que aparece repetido en la lista, o null. `grupo` separa los que pueden repetirse (p. ej. subclases de clases distintas). */
export function primerNombreRepetido<T extends { nombre: string }>(lista: T[], grupo: (item: T) => string = () => ''): string | null {
  const vistos = new Set<string>()
  for (const item of lista) {
    const clave = claveNombre(item.nombre)
    if (!clave) continue
    const conGrupo = `${grupo(item)}\u0000${clave}`
    if (vistos.has(conGrupo)) return item.nombre.trim()
    vistos.add(conGrupo)
  }
  return null
}
