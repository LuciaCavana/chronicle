import { analizarPaginas, armarRenglones, centroColumnas, type Area, type Fragmento, type Medidas, type PaginaPdf } from './analizarPdf'
import {
  aHtml, bloquesDeRenglones, CAMPO_TRASFONDO, dudasDe, INICIO_CONJURO, INICIO_CRIATURA, INICIO_DOTE, leerClase, leerConjuro, leerCriatura, leerDote, leerEspecie, leerSubclase, leerTrasfondo,
  objetoDeTermino, parrafosDe, textoOriginal, type CategoriaFicha, type FichaDetectada, type RenglonFicha,
} from './fichasLibro'
import { extraerFichasDeBloques } from './fichasEnCapitulos'
import { claveNombre, conciliar, fichaFinal, idFinal, type Existentes, type Registro } from './conciliarFichas'
import { parecido, type EntradaIndice } from './indicePdf'
import { comoOracion, esMayusculas, limpiarTextoEscaneado, TERMINO, unirRenglones, unirTexto } from './pegarDesdeLibro'
import { conCampo, repartirZonas } from './revisionImportacion'
import { nuevoId, textoBloque, type Bloque, type Capitulo } from '../types/capitulo'

/*
 * Importar marcando en la página. Cada página del PDF tiene zonas: rectángulos con un tipo
 * (título, texto, recuadro, tabla, ficha o ignorar). El motor propone las zonas y lee el texto de
 * adentro de cada una; la persona las cambia, dibuja nuevas o las borra. El capítulo se arma
 * juntando, en orden, lo leído en cada zona.
 */

export type TipoZona = 'titulo' | 'subtitulo' | 'texto' | 'recuadro' | 'tabla' | 'ficha' | 'ignorar'
export type Rect = { x0: number; y0: number; x1: number; y1: number }
export type Zona = Rect & {
  id: string
  pagina: number
  tipo: TipoZona
  /** Ficha: de qué categoría es. */
  categoria?: CategoriaFicha
  /** Sigue la zona anterior del mismo tipo (en otra columna o página): una ficha, un recuadro, una tabla o un párrafo partidos. */
  continua?: boolean
  /** Ficha: nombre escrito a mano (el escaneo no lo leyó o lo leyó mal). */
  nombre?: string
  /** Ficha: cargarla como ficha (si no, queda como texto del capítulo). Por defecto sí. */
  cargar?: boolean
  /** Ficha: campos corregidos a mano (ruta → valor). */
  ediciones?: Record<string, unknown>
  /** Tabla: dónde se corta cada columna (x en puntos del PDF). */
  cortes?: number[]
  /** Tabla: la primera fila es el encabezado. Por defecto sí. */
  sinEncabezado?: boolean
  /** Lo leído (o corregido a mano). Las fichas se leen al armar el capítulo. */
  bloques: Bloque[]
  /** El texto se corrigió a mano: «Volver a leer» lo pisa. */
  editada?: boolean
  /** Se marcó «Está bien así» en sus avisos. */
  sinAvisos?: boolean
  /** Es el título del capítulo (no se repite en el texto: el capítulo ya lo tiene). */
  tituloCapitulo?: boolean
}

export const NOMBRE_TIPO: Record<TipoZona, string> = {
  titulo: 'Título', subtitulo: 'Subtítulo', texto: 'Texto', recuadro: 'Recuadro', tabla: 'Tabla', ficha: 'Ficha', ignorar: 'Ignorar',
}
const MARGEN = 2

// ---------------------------------------------------------------------------------------------
// Texto dentro de un rectángulo
// ---------------------------------------------------------------------------------------------
/** Un fragmento está en la zona si su centro cae adentro. */
const adentro = (f: { x0: number; x1: number; base: number; h: number }, r: Rect) => {
  const cx = (f.x0 + f.x1) / 2
  const cy = f.base - f.h / 2
  return cx >= r.x0 && cx <= r.x1 && cy >= r.y0 && cy <= r.y1
}

/** La página con solo los fragmentos de la zona (y el centro de columnas de la página entera). */
export function subpagina(p: PaginaPdf, r: Rect): PaginaPdf {
  return { ...p, centro: centroColumnas(p), fragmentos: p.fragmentos.flatMap(f => (f.texto.trim() ? recortar(f, r) : [])) }
}

/**
 * La parte de un fragmento que cae en la zona. El escaneo suele dar un renglón entero en un solo
 * fragmento: si la zona toma solo unas palabras (un título pegado al párrafo), se quedan esas.
 */
function recortar(f: Fragmento, r: Rect): Fragmento[] {
  const cy = f.base - f.h / 2
  if (cy < r.y0 || cy > r.y1 || f.x1 < r.x0 || f.x0 > r.x1) return []
  if (adentro(f, r) && f.x0 >= r.x0 - 4 && f.x1 <= r.x1 + 4) return [f]
  const ancho = (f.x1 - f.x0) / Math.max(1, f.texto.length)
  const palabras = [...f.texto.matchAll(/\S+/g)].map(m => ({ desde: m.index, hasta: m.index + m[0].length }))
  const dentro = palabras.filter(w => {
    const centro = f.x0 + ((w.desde + w.hasta) / 2) * ancho
    return centro >= r.x0 && centro <= r.x1
  })
  if (!dentro.length) return []
  const desde = dentro[0].desde, hasta = dentro[dentro.length - 1].hasta
  return [{ ...f, texto: f.texto.slice(desde, hasta), x0: f.x0 + desde * ancho, x1: f.x0 + hasta * ancho }]
}

const limpiar = (t: string) => limpiarTextoEscaneado(t).texto
const comoTitulo = (t: string) => {
  const limpio = t.replace(/[,;.:]+$/, '').replace(/\s+/g, ' ').trim()
  return esMayusculas(limpio) || /\p{Ll}\p{Lu}/u.test(limpio) ? comoOracion(limpio) : limpio
}

/** Renglones de la zona en orden de lectura (columna izquierda y después la derecha, si la zona tiene las dos). */
function renglonesDe(p: PaginaPdf, r: Rect) {
  const sub = subpagina(p, r)
  const centro = sub.centro ?? p.ancho / 2
  const dosColumnas = r.x0 < centro - 20 && r.x1 > centro + 20
  return armarRenglones(sub, centro)
    .map(x => ({ ...x, texto: limpiar(x.texto), col: dosColumnas && x.x1 <= centro + 4 ? 0 : dosColumnas && x.x0 >= centro - 4 ? 1 : dosColumnas ? 2 : 0 }))
    .filter(x => x.texto.trim())
    .sort((a, b) => (a.col === 2 || b.col === 2 ? a.base - b.base : a.col - b.col || a.base - b.base))
}

/** Todo el texto de un rectángulo, en un renglón (para un título o un campo marcado en la página). */
export function textoDeRect(p: PaginaPdf, r: Rect): string {
  return unirRenglones(renglonesDe(p, r).map(x => x.texto)).replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------------------------
// Lectura de cada tipo de zona
// ---------------------------------------------------------------------------------------------
export type Contexto = { medidas?: Medidas; secciones?: EntradaIndice[] }

function leerTitulo(p: PaginaPdf, z: Zona, ctx: Contexto): Bloque[] {
  let texto = comoTitulo(textoDeRect(p, z))
  if (!texto) return []
  // Si se parece a una sección del índice, se usa como está escrita ahí.
  const seccion = ctx.secciones?.find(s => parecido(s.texto, texto) >= 0.8)
  if (seccion) texto = seccion.texto
  return [{ id: nuevoId(), tipo: z.tipo === 'subtitulo' ? 'subtitulo' : 'titulo', texto }]
}

/** Texto corrido de una zona: párrafos, términos en negrita, listas y diálogos (nunca títulos). */
function leerTexto(p: PaginaPdf, r: Rect, ctx: Contexto): Bloque[] {
  const sub = subpagina(p, r)
  if (!sub.fragmentos.length) return []
  const leido = analizarPaginas([sub], { minFragmentos: 1, medidas: ctx.medidas, omitir: false })
  const bloques: Bloque[] = []
  for (const c of leido.capitulos) {
    // Si el motor vio un título de capítulo adentro, queda como texto: la zona es de texto.
    if (c.titulo && c.titulo !== 'Antes del primer capítulo') bloques.push({ id: nuevoId(), tipo: 'parrafo', texto: [c.etiqueta, c.titulo].filter(Boolean).join(': ') })
    for (const b of c.bloques) {
      if (b.tipo === 'titulo' || b.tipo === 'subtitulo') bloques.push({ id: b.id, tipo: 'parrafo', texto: b.texto })
      else if (b.tipo === 'fichas') {
        for (const id of b.ids) bloques.push(...(leido.fichas.find(f => f.id === id)?.original ?? []).map(x => (x.tipo === 'subtitulo' ? { ...x, tipo: 'parrafo' as const } : x)))
      } else bloques.push(b)
    }
  }
  return unirTexto(bloques)
}

function leerRecuadro(p: PaginaPdf, z: Zona, ctx: Contexto): Bloque[] {
  const renglones = renglonesDe(p, z)
  // Título: los primeros renglones en mayúsculas (hasta 3).
  const titulo: string[] = []
  for (const r of renglones) {
    if (titulo.length >= 3 || !(esMayusculas(r.texto) || /\p{Ll}\p{Lu}/u.test(r.texto)) || r.texto.length > 80) break
    titulo.push(r.texto)
  }
  const limite = titulo.length ? renglones[titulo.length - 1].base + 1 : z.y0
  const cuerpo = leerTexto(p, { ...z, y0: Math.max(z.y0, limite) }, ctx)
  const texto = cuerpo.map(b => (b.tipo === 'termino' ? `**${b.termino}** ${b.texto}` : textoBloque(b))).filter(Boolean).join('\n\n')
  return [{ id: nuevoId(), tipo: 'recuadro', titulo: titulo.length ? comoTitulo(titulo.join(' ')) : '', texto }]
}

/**
 * Cortes de columna automáticos: franjas verticales donde casi ningún renglón tiene texto.
 */
export function cortesAutomaticos(p: PaginaPdf, z: Rect): number[] {
  const filas = renglonesDe(p, z)
  if (filas.length < 2) return []
  const desde = Math.floor(z.x0), hasta = Math.ceil(z.x1)
  const cuenta = new Uint16Array(hasta - desde + 1)
  for (const f of filas) for (const t of f.trozos) for (let x = Math.max(desde, Math.floor(t.x0)); x <= Math.min(hasta, Math.ceil(t.x1)); x++) cuenta[x - desde]++
  const tope = Math.max(0, Math.floor(filas.length * 0.1))
  const cortes: number[] = []
  let inicio = -1
  for (let i = 0; i <= cuenta.length; i++) {
    const libre = i < cuenta.length && cuenta[i] <= tope
    if (libre && inicio < 0) inicio = i
    if (!libre && inicio >= 0) {
      const fin = i - 1
      // Franjas de al menos 6 puntos, que no toquen los bordes de la zona.
      if (fin - inicio >= 6 && inicio > 4 && fin < cuenta.length - 5) cortes.push(desde + (inicio + fin) / 2)
      inicio = -1
    }
  }
  return cortes
}

/** Tabla: cada palabra va a la columna donde empieza; un renglón con una sola celda continúa la fila anterior. */
function leerTabla(p: PaginaPdf, z: Zona): { bloques: Bloque[]; cortes: number[] } {
  const filas = renglonesDe(p, z).sort((a, b) => a.base - b.base)
  const cortes = (z.cortes ?? cortesAutomaticos(p, z)).slice().sort((a, b) => a - b)
  const columnas = cortes.length + 1
  const columnaDe = (x: number) => cortes.filter(c => x >= c - 2).length
  let titulo = ''
  const tabla: string[][] = []
  filas.forEach((f, i) => {
    const celdas = Array.from({ length: columnas }, () => '')
    for (const t of f.trozos) { const c = columnaDe(t.x0); celdas[c] = `${celdas[c]} ${limpiar(t.texto)}`.trim() }
    const usadas = celdas.filter(Boolean).length
    // Un título arriba de la tabla: primer renglón, una sola celda, en mayúsculas.
    if (i === 0 && usadas === 1 && columnas > 1 && esMayusculas(f.texto)) { titulo = comoTitulo(f.texto); return }
    const anterior = tabla[tabla.length - 1]
    const continua = anterior && usadas === 1 && (celdas.findIndex(Boolean) > 0 || /^\p{Ll}/u.test(celdas[0]))
    if (continua) celdas.forEach((c, n) => { if (c) anterior[n] = `${anterior[n]} ${c}`.trim() })
    else tabla.push(celdas)
  })
  if (!tabla.length) return { bloques: [], cortes }
  const conEncabezado = !z.sinEncabezado && tabla.length > 1
  const encabezado = conEncabezado ? tabla[0] : tabla[0].map((_, n) => `Columna ${n + 1}`)
  return { bloques: [{ id: nuevoId(), tipo: 'tabla', titulo, columnas: encabezado, filas: conEncabezado ? tabla.slice(1) : tabla }], cortes }
}

/** Lee una zona (que no sea ficha) y devuelve sus bloques; las tablas devuelven también sus cortes. */
export function leerZona(p: PaginaPdf, z: Zona, ctx: Contexto): Pick<Zona, 'bloques' | 'cortes'> {
  switch (z.tipo) {
    case 'titulo': case 'subtitulo': return { bloques: leerTitulo(p, z, ctx) }
    case 'texto': return { bloques: leerTexto(p, z, ctx) }
    case 'recuadro': return { bloques: leerRecuadro(p, z, ctx) }
    case 'tabla': return leerTabla(p, z)
    default: return { bloques: [] }
  }
}

// ---------------------------------------------------------------------------------------------
// Fichas
// ---------------------------------------------------------------------------------------------
const ETIQUETA_CAMPO = /^[^:]{2,45}:\s/

/** Renglones de una ficha (puede ocupar varias zonas: columnas o páginas) con su sangría y su lugar. */
export function renglonesDeFicha(zonas: Zona[], paginas: Map<number, PaginaPdf>): RenglonFicha[] {
  const salida: RenglonFicha[] = []
  for (const z of zonas) {
    const p = paginas.get(z.pagina)
    if (!p) continue
    const filas = renglonesDe(p, z)
    const margen = (col: number) => Math.min(...filas.filter(f => f.col === col).map(f => f.x0))
    for (const f of filas) {
      salida.push({
        texto: f.texto, sangria: f.x0 - margen(f.col), zona: `${z.pagina}-${z.id}-${f.col}`,
        area: { pagina: z.pagina, x0: f.x0, y0: f.base - f.h, x1: f.x1, y1: f.base + f.h * 0.25, texto: f.texto } as Area,
      })
    }
  }
  return salida
}

/** El nombre de la ficha: el primer renglón si es corto y en mayúsculas (o versalitas), y no es un campo. */
function separarNombre(renglones: RenglonFicha[]): { nombre: string; resto: RenglonFicha[] } {
  const [primero, ...resto] = renglones
  // También es el nombre si el renglón de abajo es el tipo de la ficha («Dote de origen», «Evocación de nivel 3…»).
  const tipoAbajo = !!resto[0] && [INICIO_DOTE, INICIO_CONJURO, INICIO_CRIATURA, CAMPO_TRASFONDO].some(re => re.test(resto[0].texto))
  if (primero && primero.texto.length <= 50 && !ETIQUETA_CAMPO.test(primero.texto) && (tipoAbajo || esMayusculas(primero.texto) || /\p{Ll}\p{Lu}/u.test(primero.texto))) {
    return { nombre: comoTitulo(primero.texto.replace(/^[“"«‘']+/, '')), resto }
  }
  return { nombre: '', resto: renglones }
}

/** Lee una ficha a partir de sus zonas. El id de la ficha es el de su primera zona (no cambia al volver a leer). */
export function leerFicha(zonas: Zona[], paginas: Map<number, PaginaPdf>, ctx: Contexto): FichaDetectada {
  const z = zonas[0]
  const categoria = z.categoria ?? 'dotes'
  const renglones = renglonesDeFicha(zonas, paginas)
  const separado = separarNombre(renglones)
  const escrito = z.nombre?.trim()
  const nombre = escrito || separado.nombre || `Sin nombre (página ${z.pagina} del PDF)`
  // Si el nombre se escribió a mano y el primer renglón no era un nombre, se leen todos los renglones.
  const cuerpo = escrito && !separado.nombre ? renglones : separado.resto
  let datos: Record<string, unknown>
  switch (categoria) {
    case 'conjuros': datos = leerConjuro(nombre, cuerpo); break
    case 'dotes': datos = leerDote(nombre, cuerpo); break
    case 'trasfondos': datos = leerTrasfondo(nombre, cuerpo); break
    case 'criaturas': datos = leerCriatura(nombre, cuerpo); break
    default: datos = leerPorBloques(categoria, nombre, zonas, paginas, ctx, cuerpo)
  }
  for (const [ruta, valor] of Object.entries(z.ediciones ?? {})) datos = conCampo(datos, ruta, valor)
  return {
    id: z.id, categoria, nombre, datos,
    original: bloquesDeRenglones(escrito || separado.nombre, cuerpo),
    renglones: cuerpo, dudas: dudasDe(categoria, nombre, datos),
  }
}

/** Clases, subclases, especies y objetos se leen desde los bloques del texto de la zona. */
function leerPorBloques(categoria: CategoriaFicha, nombre: string, zonas: Zona[], paginas: Map<number, PaginaPdf>, ctx: Contexto, cuerpo: RenglonFicha[]): Record<string, unknown> {
  const bloques = zonas.flatMap(z => { const p = paginas.get(z.pagina); return p ? leerTexto(p, z, ctx) : [] })
  const partes = bloques.map(b => (b.tipo === 'termino' ? { texto: `**${b.termino}** ${b.texto}` } : { texto: textoBloque(b) })).filter(x => x.texto)
  switch (categoria) {
    case 'clases': return leerClase(nombre, partes)
    case 'subclases': return leerSubclase(nombre, partes)
    case 'especies': {
      const textos = partes.flatMap(x => x.texto.split(/\n\s*\n/))
      const corte = textos.findIndex(t => /tipo de criatura\s*:/i.test(t))
      return leerEspecie(nombre, corte < 0 ? textos : textos.slice(0, corte), corte < 0 ? [] : textos.slice(corte))
    }
    case 'objetos': {
      const primero = partes[0]?.texto ?? ''
      const m = primero.replace(/\*\*/g, '').match(TERMINO)
      const objeto = m ? objetoDeTermino(m[1], m[2]) : null
      return objeto ?? { nombre, descripcion: aHtml(parrafosDe(cuerpo)) }
    }
    default: return { nombre, descripcion: aHtml(parrafosDe(cuerpo)) }
  }
}

// ---------------------------------------------------------------------------------------------
// Orden de lectura y propuesta del motor
// ---------------------------------------------------------------------------------------------
/**
 * Ordena las zonas de una página como se lee: las anchas (que cruzan el centro) separan franjas;
 * en cada franja, la columna izquierda de arriba abajo y después la derecha.
 */
export function ordenarZonas(zonas: Zona[], centro: number): Zona[] {
  // En el mismo renglón (una zona marcada adentro de otra), de izquierda a derecha.
  const antes = (a: Zona, b: Zona) => (Math.abs(a.y0 - b.y0) < 4 ? a.x0 - b.x0 : a.y0 - b.y0)
  const ancha = (z: Zona) => z.x0 < centro - 20 && z.x1 > centro + 20
  const porAltura = [...zonas].sort(antes)
  const salida: Zona[] = []
  let grupo: Zona[] = []
  const volcar = () => {
    salida.push(...grupo.filter(z => (z.x0 + z.x1) / 2 < centro).sort(antes))
    salida.push(...grupo.filter(z => (z.x0 + z.x1) / 2 >= centro).sort(antes))
    grupo = []
  }
  for (const z of porAltura) {
    if (ancha(z)) { volcar(); salida.push(z) } else grupo.push(z)
  }
  volcar()
  return salida
}

const rectDe = (areas: Area[]): Rect => ({
  x0: Math.min(...areas.map(a => a.x0)) - MARGEN, y0: Math.min(...areas.map(a => a.y0)) - MARGEN,
  x1: Math.max(...areas.map(a => a.x1)) + MARGEN, y1: Math.max(...areas.map(a => a.y1)) + MARGEN,
})
/** Agrupa renglones seguidos de la misma columna de una página (para no hacer una zona por renglón). */
function grupos(areas: Area[]): Area[][] {
  // De arriba hacia abajo: un renglón se suma al grupo que tiene encima (misma columna, cerca).
  const ordenadas = [...areas].sort((a, b) => a.pagina - b.pagina || a.y0 - b.y0 || a.x0 - b.x0)
  const cerca = (r: Rect, a: Rect, alto: number) => a.x0 < r.x1 && a.x1 > r.x0 && a.y0 - r.y1 < alto * 1.6 && r.y0 - a.y1 < alto * 1.6
  let lista: { r: Rect; pagina: number; areas: Area[] }[] = []
  for (const a of ordenadas) {
    const g = lista.find(x => x.pagina === a.pagina && cerca(x.r, a, a.y1 - a.y0))
    if (g) { g.areas.push(a); g.r = { x0: Math.min(g.r.x0, a.x0), y0: Math.min(g.r.y0, a.y0), x1: Math.max(g.r.x1, a.x1), y1: Math.max(g.r.y1, a.y1) } }
    else lista.push({ r: { ...a }, pagina: a.pagina, areas: [a] })
  }
  // Grupos que quedaron pegados (un renglón más ancho los une) se juntan.
  for (let cambio = true; cambio;) {
    cambio = false
    const unidos: typeof lista = []
    for (const g of lista) {
      const h = unidos.find(x => x.pagina === g.pagina && cerca(x.r, g.r, 12))
      if (h) { h.areas.push(...g.areas); h.r = { x0: Math.min(h.r.x0, g.r.x0), y0: Math.min(h.r.y0, g.r.y0), x1: Math.max(h.r.x1, g.r.x1), y1: Math.max(h.r.y1, g.r.y1) }; cambio = true }
      else unidos.push(g)
    }
    lista = unidos
  }
  // En el orden de lectura (el de los renglones), no de arriba hacia abajo: una ficha que sigue
  // en la otra columna empieza abajo a la izquierda.
  const orden = new Map(areas.map((a, i) => [a, i]))
  const primero = (g: Area[]) => Math.min(...g.map(a => orden.get(a) ?? 0))
  return lista.map(x => x.areas).sort((a, b) => primero(a) - primero(b))
}

/**
 * Propuesta inicial: lee el capítulo entero con el motor y convierte cada bloque y cada ficha en
 * zonas de la página. Después cada zona se vuelve a leer sola (así lo que se ve es lo que hay adentro).
 */
export function proponerZonas(paginasPdf: PaginaPdf[], entrada?: { secciones: EntradaIndice[] }): { zonas: Zona[]; medidas: Medidas } {
  const leido = analizarPaginas(paginasPdf)
  const areas = leido.areas
  const bloques = leido.capitulos.flatMap(c => c.bloques)
  // Un bloque partido (título pegado a un párrafo) reparte sus renglones entre las partes.
  for (let k = 0; k < bloques.length; k++) {
    const propias = areas[bloques[k].id]
    if (!propias?.length) continue
    let fin = k + 1
    while (fin < bloques.length && !areas[bloques[fin].id]?.length) fin++
    if (fin === k + 1) continue
    const cadena = bloques.slice(k, fin)
    repartirZonas(propias, cadena.map(textoBloque)).forEach((z, n) => { areas[cadena[n].id] = z.length ? z : propias })
    k = fin - 1
  }
  const zonas: Zona[] = []
  const tipoDe = (b: Bloque): TipoZona => (b.tipo === 'titulo' || b.tipo === 'subtitulo' || b.tipo === 'recuadro' || b.tipo === 'tabla' ? b.tipo : 'texto')
  // El título del capítulo también es una zona (se usa para ubicarlo; no se repite en el texto).
  for (const c of leido.capitulos) {
    const propias = areas[`titulo:${c.id}`]
    if (propias?.length) zonas.push({ id: nuevoId(), pagina: propias[0].pagina, tipo: 'ignorar', tituloCapitulo: true, bloques: [], ...rectDe(propias) })
  }
  for (const b of bloques) {
    if (b.tipo === 'fichas') {
      for (const id of b.ids) {
        const ficha = leido.fichas.find(f => f.id === id)
        // Una zona por columna y página: la ficha que sigue en otra columna la continúa.
        grupos(areas[id] ?? []).forEach((g, n) => zonas.push({
          id: nuevoId(), pagina: g[0].pagina, tipo: 'ficha', categoria: ficha?.categoria, continua: n > 0, bloques: [], ...rectDe(g),
        }))
      }
      continue
    }
    for (const g of grupos(areas[b.id] ?? [])) zonas.push({ id: nuevoId(), pagina: g[0].pagina, tipo: tipoDe(b), bloques: [], ...rectDe(g) })
  }
  const porPagina = new Map(paginasPdf.map(p => [p.numero, p]))
  const ctx: Contexto = { medidas: leido.medidas, secciones: entrada?.secciones }
  for (const z of zonas) {
    const p = porPagina.get(z.pagina)
    if (p && z.tipo !== 'ficha') Object.assign(z, leerZona(p, z, ctx))
  }
  // Orden de lectura por página.
  const ordenadas = paginasPdf.flatMap(p => ordenarZonas(zonas.filter(z => z.pagina === p.numero), centroColumnas(p)))
  return { zonas: ordenadas, medidas: leido.medidas }
}

// ---------------------------------------------------------------------------------------------
// Armar el capítulo
// ---------------------------------------------------------------------------------------------
const TERMINA = /[.!?:»”")\]]\s*$/

/**
 * Junta, en orden, lo leído en cada zona. El texto que sigue en otra zona en medio de una oración
 * (cambio de columna o de página) se une con el anterior. Las fichas van como bloque de fichas.
 */
export function armarCapitulo(
  base: { id: string; etiqueta: string; titulo: string },
  zonas: Zona[], paginas: Map<number, PaginaPdf>, ctx: Contexto,
): { capitulo: Capitulo; fichas: FichaDetectada[]; deZona: Record<string, string> } {
  const bloques: Bloque[] = []
  const fichas: FichaDetectada[] = []
  // Qué ficha sale de cada zona (para marcarla en la página).
  const deZona: Record<string, string> = {}
  for (let i = 0; i < zonas.length; i++) {
    const z = zonas[i]
    if (z.tipo === 'ignorar') continue
    if (z.tipo === 'ficha') {
      if (deZona[z.id]) continue // ya se leyó con la ficha que continúa
      // La ficha sigue en las zonas de ficha marcadas «continúa» (salteando las ignoradas).
      const cadena = [z]
      // Lo que se marcó en el medio (una tabla de la ficha, algo para ignorar) no corta la cadena.
      for (let j = i + 1; j < zonas.length; j++) {
        if (zonas[j].tipo !== 'ficha') continue
        if (!zonas[j].continua) break
        cadena.push(zonas[j])
      }
      const ficha = leerFicha(cadena, paginas, ctx)
      fichas.push(ficha)
      cadena.forEach(x => { deZona[x.id] = ficha.id })
      // Si se carga como ficha o queda como texto se decide al agregar (finalizarCapitulo).
      const ultimo = bloques[bloques.length - 1]
      if (ultimo?.tipo === 'fichas' && ultimo.categoria === ficha.categoria) ultimo.ids.push(ficha.id)
      else bloques.push({ id: nuevoId(), tipo: 'fichas', categoria: ficha.categoria, ids: [ficha.id] })
      continue
    }
    for (const [n, b] of z.bloques.entries()) {
      const ultimo = bloques[bloques.length - 1]
      // Zona unida a la anterior («Unir con la anterior»): su comienzo sigue el último bloque.
      if (z.continua && n === 0 && ultimo) {
        const unido = continuar(ultimo, b)
        if (unido) { bloques[bloques.length - 1] = unido; continue }
      }
      // Párrafo cortado por la columna o la página: sigue en la misma oración.
      if (b.tipo === 'parrafo' && ultimo?.tipo === 'parrafo' && !TERMINA.test(ultimo.texto) && /^\p{Ll}/u.test(b.texto)) {
        bloques[bloques.length - 1] = { ...ultimo, texto: `${ultimo.texto.replace(/-$/, '')}${/-$/.test(ultimo.texto) ? '' : ' '}${b.texto}` }
        continue
      }
      // Tabla que sigue en otra zona, sin título y con las mismas columnas.
      if (b.tipo === 'tabla' && ultimo?.tipo === 'tabla' && !b.titulo && b.columnas.length === ultimo.columnas.length) {
        const repetido = b.columnas.join('|').toLowerCase() === ultimo.columnas.join('|').toLowerCase()
        bloques[bloques.length - 1] = { ...ultimo, filas: [...ultimo.filas, ...(repetido || b.columnas[0].startsWith('Columna ') ? [] : [b.columnas]), ...b.filas] }
        continue
      }
      bloques.push(JSON.parse(JSON.stringify(b)) as Bloque)
    }
  }
  const capitulo: Capitulo = { ...base, bloques: unirTexto(bloques) }
  // Clases, subclases, especies y objetos se reconocen en el texto ya armado.
  fichas.push(...extraerFichasDeBloques(capitulo))
  return { capitulo, fichas, deZona }
}

/** Un bloque que sigue al anterior (misma ficha, recuadro, tabla o párrafo partido en dos zonas). */
function continuar(ultimo: Bloque, b: Bloque): Bloque | null {
  const pegar = (a: string, c: string) => (!c ? a : !a ? c : /-$/.test(a) && /^\p{Ll}/u.test(c) ? `${a.slice(0, -1)}${c}`
    : TERMINA.test(a) ? `${a}\n\n${c}` : `${a} ${c}`)
  if (ultimo.tipo === 'parrafo' && b.tipo === 'parrafo') return { ...ultimo, texto: pegar(ultimo.texto, b.texto) }
  if (ultimo.tipo === 'recuadro' && (b.tipo === 'recuadro' || b.tipo === 'parrafo')) {
    // Lo que se tomó como título de la continuación es parte del texto.
    const texto = b.tipo === 'recuadro' ? [b.titulo, b.texto].filter(Boolean).join('\n\n') : b.texto
    return { ...ultimo, texto: pegar(ultimo.texto, texto) }
  }
  if (ultimo.tipo === 'tabla' && b.tipo === 'tabla') {
    const ancho = ultimo.columnas.length
    const ajustar = (f: string[]) => (f.length <= ancho ? [...f, ...Array(ancho - f.length).fill('')] : [...f.slice(0, ancho - 1), f.slice(ancho - 1).join(' ')])
    const repetido = b.columnas.join('|').toLowerCase() === ultimo.columnas.join('|').toLowerCase() || b.columnas[0]?.startsWith('Columna ')
    return { ...ultimo, filas: [...ultimo.filas, ...(repetido ? [] : [b.columnas]), ...b.filas].map(ajustar) }
  }
  return null
}

/** Texto plano de lo que hay en una zona (para la vista previa y los avisos). */
export const textoDeZona = (z: Zona) => textoOriginal(z.bloques)

// ---------------------------------------------------------------------------------------------
// Agregar al libro
// ---------------------------------------------------------------------------------------------
/** Una ficha que se crea o se completa al importar. */
export type CambioFicha = { categoria: CategoriaFicha; ficha: Registro; nueva: boolean }

/**
 * Concilia las fichas del capítulo con las ya cargadas y arma lo que se agrega: el capítulo (con
 * cada ficha aceptada en su lugar y el texto de las que no) y las fichas a crear o completar.
 */
export function finalizarCapitulo(
  capitulo: Capitulo, fichas: FichaDetectada[], cargar: (f: FichaDetectada) => boolean,
  delLibro: Record<string, Set<string>>, existentes: Existentes,
): { capitulo: Capitulo; cambios: CambioFicha[] } {
  const propuestas = conciliar(fichas, existentes)
  const aceptadas = propuestas.filter(p => cargar(p.ficha))
  const finales = aceptadas.map(p => ({ p, ficha: fichaFinal(p, delLibro[p.ficha.id] ?? new Set()) }))
  // Subclases: se vinculan a su clase (cargada o nueva). Trasfondos: a su dote de origen.
  const buscar = (categoria: CategoriaFicha, nombre: unknown) =>
    finales.find(f => f.p.ficha.categoria === categoria && claveNombre(f.ficha.nombre) === claveNombre(nombre))?.ficha
    ?? (existentes[categoria] ?? []).find(e => claveNombre(e.nombre) === claveNombre(nombre))
  for (const { p, ficha } of finales) {
    if (p.ficha.categoria === 'subclases' && !p.existente) {
      const clase = buscar('clases', p.ficha.clase)
      ficha.datos = { ...(ficha.datos as Registro), claseId: clase ? String(clase.id) : '' }
    }
    const doteTexto = (ficha.datosAdicionales as Registro | undefined)?.dote
    if (p.ficha.categoria === 'trasfondos' && !ficha.doteOrigenId && doteTexto) {
      const dote = buscar('dotes', doteTexto)
      if (dote) ficha.doteOrigenId = String(dote.id)
    }
  }
  const destino = new Map(aceptadas.map(p => [p.ficha.id, idFinal(p)]))
  const porId = new Map(fichas.map(f => [f.id, f]))
  const bloques = unirTexto(capitulo.bloques.flatMap((b): Bloque[] => {
    if (b.tipo !== 'fichas') return [b]
    const salida: Bloque[] = []
    for (const id of b.ids) {
      const final = destino.get(id)
      if (final) {
        const ultimo = salida[salida.length - 1]
        if (ultimo?.tipo === 'fichas' && ultimo.categoria === b.categoria) { if (!ultimo.ids.includes(final)) ultimo.ids.push(final) }
        else salida.push({ id: nuevoId(), tipo: 'fichas', categoria: b.categoria, ids: [final] })
      } else {
        // No se carga: queda su texto, con el nombre como subtítulo.
        const f = porId.get(id)
        if (!f) continue
        const texto = f.original.map(x => ({ ...x, id: nuevoId() }))
        if (texto[0]?.tipo !== 'subtitulo' && !/^Sin nombre \(/.test(f.nombre)) texto.unshift({ id: nuevoId(), tipo: 'subtitulo', texto: f.nombre })
        salida.push(...texto)
      }
    }
    return salida
  }))
  return {
    capitulo: { ...capitulo, bloques },
    cambios: finales.filter(f => f.p.estado !== 'igual').map(f => ({ categoria: f.p.ficha.categoria, ficha: f.ficha, nueva: !f.p.existente })),
  }
}
