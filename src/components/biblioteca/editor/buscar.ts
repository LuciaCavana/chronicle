/** Compara sin distinguir mayúsculas ni tildes. */
export const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es').trim()

export function coincide(busqueda: string, ...valores: (string | undefined)[]) {
  const termino = normalizar(busqueda)
  return !termino || valores.some(valor => normalizar(valor ?? '').includes(termino))
}
