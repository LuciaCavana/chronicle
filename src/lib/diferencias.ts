/** Comparación pura para la revisión de propuestas de Chronicle. */
export type AccionCambio = 'agregar' | 'modificar' | 'retirar' | 'modificar_campo' | 'activar_categoria' | 'desactivar_categoria'
export type Cambio = {
  categoria: string
  accion: AccionCambio
  elemento_id: string | null
  antes: unknown
  despues: unknown
}
export type DiferenciaCampo = { ruta: string; antes: unknown; despues: unknown; tipo: 'valor' | 'agregado' | 'retirado' | 'reordenado' }
export type ParteTexto = { texto: string; tipo: 'igual' | 'agregado' | 'retirado' }
export type DocumentoVersion = {
  titulo?: string | null
  idioma?: string | null
  descripcion?: string | null
  categorias?: string[] | null
  contenido?: Record<string, unknown> | null
  metadatos_libro?: Record<string, unknown> | null
}
export const ORDEN_CATEGORIAS = ['datos_generales', 'especies', 'conjuros', 'clases', 'subclases', 'dotes', 'trasfondos', 'criaturas', 'objetos', 'caracteristicas', 'categorias'] as const

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}
function iguales(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => iguales(x, b[i]))
  if (esObjeto(a) && esObjeto(b)) {
    const ka = Object.keys(a), kb = Object.keys(b)
    return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && iguales(a[k], b[k]))
  }
  return false
}
function idElemento(valor: unknown): string | null {
  if (!esObjeto(valor)) return null
  const id = valor.id
  return typeof id === 'string' && id.trim() ? id : typeof id === 'number' && Number.isFinite(id) ? String(id) : null
}
function rutaHija(ruta: string, clave: string): string {
  return ruta ? `${ruta} › ${clave}` : clave
}

/** Compara listas por id. Si faltan IDs o están duplicados, usa índices para no perder elementos. */
export function diferenciasLista(antes: unknown[], despues: unknown[], ruta = ''): DiferenciaCampo[] {
  const idsAntes = antes.map(idElemento), idsDespues = despues.map(idElemento)
  const ids = [...idsAntes, ...idsDespues].filter((id): id is string => id !== null)
  const usarIds = ids.length === antes.length + despues.length &&
    new Set(idsAntes.filter((id): id is string => id !== null)).size === antes.length &&
    new Set(idsDespues.filter((id): id is string => id !== null)).size === despues.length
  if (!usarIds) {
    return Array.from({ length: Math.max(antes.length, despues.length) }, (_, i) =>
      diferenciasCampos(antes[i], despues[i], rutaHija(ruta, `#${i + 1}`))).flat()
  }
  const previos = new Map(antes.map((valor, i) => [idsAntes[i], { valor, indice: i }]))
  const actuales = new Map(despues.map((valor, i) => [idsDespues[i], { valor, indice: i }]))
  const cambios: DiferenciaCampo[] = []
  for (const [id, previo] of previos) {
    const actual = actuales.get(id)
    const rutaElemento = rutaHija(ruta, String(id))
    if (!actual) {
      cambios.push({ ruta: rutaElemento, antes: previo.valor, despues: undefined, tipo: 'retirado' })
    } else {
      cambios.push(...diferenciasCampos(previo.valor, actual.valor, rutaElemento))
    }
  }
  for (const [id, actual] of actuales) {
    if (!previos.has(id)) cambios.push({ ruta: rutaHija(ruta, String(id)), antes: undefined, despues: actual.valor, tipo: 'agregado' })
  }
  // Un cambio de orden puro se informa una sola vez, sin marcar los objetos como modificados.
  const comunesAntes = idsAntes.filter(id => actuales.has(id))
  const comunesDespues = idsDespues.filter(id => previos.has(id))
  if (!iguales(comunesAntes, comunesDespues)) {
    cambios.push({ ruta: rutaHija(ruta, 'orden'), antes: comunesAntes, despues: comunesDespues, tipo: 'reordenado' })
  }
  return cambios
}

/** Devuelve únicamente diferencias; las listas con IDs se comparan por identidad, no por posición. */
export function diferenciasCampos(antes: unknown, despues: unknown, ruta = ''): DiferenciaCampo[] {
  if (iguales(antes, despues)) return []
  if (Array.isArray(antes) && Array.isArray(despues)) return diferenciasLista(antes, despues, ruta)
  if (esObjeto(antes) && esObjeto(despues)) {
    return [...new Set([...Object.keys(antes), ...Object.keys(despues)])]
      .flatMap(clave => diferenciasCampos(antes[clave], despues[clave], rutaHija(ruta, clave)))
  }
  return [{ ruta: ruta || 'valor', antes, despues, tipo: antes === undefined ? 'agregado' : despues === undefined ? 'retirado' : 'valor' }]
}

/** LCS sobre palabras; nunca interpreta el contenido como HTML. */
export function diferenciasTexto(antes: string, despues: string): ParteTexto[] {
  const tokenizar = (texto: string): string[] => texto.match(/\s+|[^\s]+/gu) ?? []
  const a = tokenizar(antes), b = tokenizar(despues)
  // Limita el costo cuadrático en textos extraordinariamente extensos.
  if (a.length * b.length > 250000) return [
    ...(antes ? [{ texto: antes, tipo: 'retirado' as const }] : []),
    ...(despues ? [{ texto: despues, tipo: 'agregado' as const }] : []),
  ]
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const partes: ParteTexto[] = []
  const agregar = (texto: string, tipo: ParteTexto['tipo']) => {
    if (partes.length && partes[partes.length - 1].tipo === tipo) partes[partes.length - 1].texto += texto
    else partes.push({ texto, tipo })
  }
  let i = 0, j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { agregar(a[i], 'igual'); i++; j++ }
    else if (j < b.length && (i === a.length || dp[i][j + 1] >= dp[i + 1][j])) { agregar(b[j++], 'agregado') }
    else { agregar(a[i++], 'retirado') }
  }
  return partes
}

export function agruparCambios(cambios: readonly Cambio[]): { categoria: string; cambios: Cambio[] }[] {
  const grupos = new Map<string, Cambio[]>()
  for (const cambio of cambios) {
    const categoria = cambio.accion === 'activar_categoria' || cambio.accion === 'desactivar_categoria' ? 'categorias' : cambio.categoria
    grupos.set(categoria, [...(grupos.get(categoria) ?? []), cambio])
  }
  return [...grupos].sort(([a], [b]) => {
    const ia = ORDEN_CATEGORIAS.indexOf(a as typeof ORDEN_CATEGORIAS[number])
    const ib = ORDEN_CATEGORIAS.indexOf(b as typeof ORDEN_CATEGORIAS[number])
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b)
  }).map(([categoria, lista]) => ({ categoria, cambios: lista }))
}
export function resumenCambio(cambio: Cambio): string {
  if (cambio.accion === 'activar_categoria') return `Categoría activada: ${cambio.categoria}`
  if (cambio.accion === 'desactivar_categoria') return `Categoría desactivada: ${cambio.categoria}`
  const nombre = (valor: unknown) => esObjeto(valor) ? String(valor.nombre ?? valor.titulo ?? '') : ''
  const etiqueta = nombre(cambio.despues) || nombre(cambio.antes) || cambio.elemento_id || cambio.categoria
  if (cambio.accion === 'agregar') return `Agregado: ${etiqueta}`
  if (cambio.accion === 'retirar') return `Retirado: ${etiqueta}`
  const diferencias = diferenciasCampos(cambio.antes, cambio.despues)
  return `${etiqueta}: ${diferencias.length} campo(s) modificado(s)`
}

/** Calcula cambios entre dos instantáneas del historial en el formato del RPC. */
export function compararVersiones(antes: DocumentoVersion, despues: DocumentoVersion): Cambio[] {
  const cambios: Cambio[] = []
  for (const campo of ['titulo', 'idioma', 'descripcion'] as const) {
    if (!iguales(antes[campo], despues[campo]))
      cambios.push({ categoria: 'datos_generales', accion: 'modificar_campo', elemento_id: campo, antes: antes[campo] ?? null, despues: despues[campo] ?? null })
  }
  const metaAntes = antes.metadatos_libro ?? {}, metaDespues = despues.metadatos_libro ?? {}
  for (const campo of new Set([...Object.keys(metaAntes), ...Object.keys(metaDespues)])) {
    if (!iguales(metaAntes[campo], metaDespues[campo]))
      cambios.push({ categoria: 'datos_generales', accion: 'modificar_campo', elemento_id: campo, antes: metaAntes[campo] ?? null, despues: metaDespues[campo] ?? null })
  }
  const categoriasAntes = new Set(antes.categorias ?? []), categoriasDespues = new Set(despues.categorias ?? [])
  for (const categoria of new Set([...categoriasAntes, ...categoriasDespues])) {
    if (categoriasAntes.has(categoria) !== categoriasDespues.has(categoria))
      cambios.push({ categoria, accion: categoriasDespues.has(categoria) ? 'activar_categoria' : 'desactivar_categoria', elemento_id: null, antes: null, despues: null })
  }
  const contenidoAntes = antes.contenido ?? {}, contenidoDespues = despues.contenido ?? {}
  for (const categoria of new Set([...Object.keys(contenidoAntes), ...Object.keys(contenidoDespues)])) {
    if (categoriasAntes.has(categoria) && !categoriasDespues.has(categoria)) continue
    const previos = categoriasAntes.has(categoria) && Array.isArray(contenidoAntes[categoria]) ? contenidoAntes[categoria] as unknown[] : []
    const actuales = categoriasDespues.has(categoria) && Array.isArray(contenidoDespues[categoria]) ? contenidoDespues[categoria] as unknown[] : []
    const idsPrevios = previos.map(idElemento), idsActuales = actuales.map(idElemento)
    const clave = (id: string | null, i: number) => id ?? `pos:${i + 1}`
    const mapaPrevios = new Map(previos.map((valor, i) => [clave(idsPrevios[i], i), valor]))
    const mapaActuales = new Map(actuales.map((valor, i) => [clave(idsActuales[i], i), valor]))
    for (const [id, valor] of mapaPrevios) {
      if (!mapaActuales.has(id)) cambios.push({ categoria, accion: 'retirar', elemento_id: id, antes: valor, despues: null })
      else if (!iguales(valor, mapaActuales.get(id))) cambios.push({ categoria, accion: 'modificar', elemento_id: id, antes: valor, despues: mapaActuales.get(id) })
    }
    for (const [id, valor] of mapaActuales) if (!mapaPrevios.has(id))
      cambios.push({ categoria, accion: 'agregar', elemento_id: id, antes: null, despues: valor })
  }
  return agruparCambios(cambios).flatMap(grupo => grupo.cambios)
}
