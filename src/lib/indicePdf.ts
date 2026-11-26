import type { Fragmento, PaginaPdf } from './analizarPdf'
import { comoOracion } from './pegarDesdeLibro'
import { nuevoId, type Bloque, type Capitulo } from '../types/capitulo'

/**
 * El índice del libro: qué capítulos y secciones tiene y en qué página empieza cada uno.
 * Con eso el importador sabe dónde corta cada capítulo, cómo se llama de verdad cada título
 * (el escaneo los trae en mayúsculas) y qué secciones faltan.
 */
export type EntradaIndice = { texto: string; pagina: number; nivel: 0 | 1 | 2 }
export type CapituloIndice = {
  id: string
  etiqueta: string
  titulo: string
  /** Página del libro (la impresa) donde empieza. */
  pagina: number
  secciones: EntradaIndice[]
}
export type IndiceLibro = {
  /** Páginas del PDF donde está el índice. */
  paginasPdf: number[]
  capitulos: CapituloIndice[]
  /** Página del PDF = página del libro + desfase (por la tapa, créditos…). */
  desfase: number | null
}

const ENTRADA = /^(.*?\p{L}.*?)[\s.…·,_-]{2,}\s*(\d{1,4})$/u
const CAPITULO = /^(cap(?:[íi]tulo)?\.?\s*(\d+)|ap(?:[ée]ndice)?\.?\s*([a-z]))\s*[:.-]\s*(.+)$/iu
const NO_ES_CONTENIDO = /^([íi]ndice|cr[ée]ditos|glosario de t[ée]rminos)/i

/** Sin mayúsculas, tildes ni signos, para comparar títulos. */
export const clave = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')

function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0]
    fila[0] = i
    for (let j = 1; j <= b.length; j++) {
      const temporal = fila[j]
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1))
      previo = temporal
    }
  }
  return fila[b.length]
}
/** Parecido entre dos títulos (1 = iguales), tolerando errores del escaneo. */
export function parecido(a: string, b: string): number {
  const x = clave(a), y = clave(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (Math.max(x.length, y.length) > 90) return 0
  return 1 - distancia(x, y) / Math.max(x.length, y.length)
}

type Renglon = { x0: number; x1: number; base: number; h: number; texto: string }

/** Renglones de una página de índice: palabras muy juntas (las columnas del índice están cerca). */
function renglonesIndice(p: PaginaPdf): Renglon[] {
  const frs = p.fragmentos.filter(f => f.texto.trim()).sort((a, b) => a.base - b.base || a.x0 - b.x0)
  const grupos: { x0: number; x1: number; base: number; h: number; partes: Fragmento[] }[] = []
  for (const f of frs) {
    const g = grupos.find(r => Math.abs(r.base - f.base) < Math.min(r.h, f.h) * 0.5 && f.x0 - r.x1 < Math.min(r.h, f.h) * 0.8 && f.x0 >= r.x0)
    if (g) { g.partes.push(f); g.x1 = Math.max(g.x1, f.x1) }
    else grupos.push({ x0: f.x0, x1: f.x1, base: f.base, h: f.h, partes: [f] })
  }
  const renglones: Renglon[] = grupos.map(g => ({ x0: g.x0, x1: g.x1, base: g.base, h: g.h, texto: g.partes.sort((a, b) => a.x0 - b.x0).map(f => f.texto).join(' ').replace(/\s+/g, ' ').trim() }))
  return unirNumerosSueltos(renglones, p.ancho)
}

/**
 * En muchos índices el número de página está alineado a la derecha, lejos del título y sin
 * puntos que los unan («Cómo jugar          8»): se lee como dos renglones separados. Cada número
 * suelto se pega al título de su misma altura que tenga más cerca a la izquierda, con dos
 * espacios en el medio para que se reconozca como entrada.
 */
function unirNumerosSueltos(renglones: Renglon[], ancho: number): Renglon[] {
  const usados = new Set<Renglon>()
  const unidos = new Map<Renglon, Renglon>()
  const numeros = renglones.filter(r => /^\d{1,4}$/.test(r.texto))
  for (const n of numeros) {
    const titulo = renglones
      .filter(r => r !== n && !usados.has(r) && !/^\d{1,4}$/.test(r.texto) && !ENTRADA.test((unidos.get(r) ?? r).texto)
        && Math.abs(r.base - n.base) < Math.min(r.h, n.h) * 0.5 && r.x1 <= n.x0 && n.x0 - r.x1 < ancho * 0.6)
      .sort((a, b) => (n.x0 - a.x1) - (n.x0 - b.x1))[0]
    if (!titulo) continue
    const actual = unidos.get(titulo) ?? titulo
    unidos.set(titulo, { ...actual, x1: n.x1, texto: `${actual.texto}  ${n.texto}` })
    usados.add(n)
  }
  return renglones.filter(r => !usados.has(r)).map(r => unidos.get(r) ?? r)
}

/** Lee las entradas de una página; devuelve null si la página no parece un índice. */
function entradasDePagina(p: PaginaPdf, minimo = 12): (EntradaIndice & { columna: number; x0: number })[] | null {
  const renglones = renglonesIndice(p).filter(r => /\p{L}|\d/u.test(r.texto))
  const conNumero = renglones.filter(r => ENTRADA.test(r.texto))
  if (conNumero.length < minimo || conNumero.length < renglones.length * 0.45) return null
  // Columnas del índice: se agrupan los comienzos de renglón separados por más de 12% del ancho.
  const xs = [...new Set(renglones.map(r => Math.round(r.x0)))].sort((a, b) => a - b)
  const inicios: number[] = []
  for (const x of xs) if (!inicios.length || x - inicios[inicios.length - 1] > p.ancho * 0.12) inicios.push(x)
  const columnaDe = (x: number) => inicios.reduce((mejor, inicio, i) => (x >= inicio - p.ancho * 0.02 ? i : mejor), 0)
  const porColumna = inicios.map((_, c) => renglones.filter(r => columnaDe(r.x0) === c).sort((a, b) => a.base - b.base))
  const entradas: (EntradaIndice & { columna: number; x0: number })[] = []
  porColumna.forEach((lista, columna) => {
    const borde = Math.min(...lista.map(r => r.x0))
    let pendiente: Renglon | null = null
    for (const r of lista) {
      const m = r.texto.match(ENTRADA)
      if (!m) {
        // Un título largo puede seguir en el renglón de abajo ("Opciones de invocación / Sobrenatural…71").
        const anterior = pendiente as Renglon | null
        if (r.h < 2 * (lista[0]?.h ?? r.h) && !/^[íi]ndice$/i.test(r.texto)) pendiente = anterior ? { x0: anterior.x0, x1: r.x1, base: anterior.base, h: anterior.h, texto: `${anterior.texto} ${r.texto}` } : r
        continue
      }
      const desdeArriba: Renglon | null = pendiente
      pendiente = null
      const texto = (desdeArriba ? `${desdeArriba.texto} ${m[1]}` : m[1]).replace(/[\s.…·,_-]+$/, '').trim()
      const x0 = desdeArriba ? desdeArriba.x0 : r.x0
      const nivel: 0 | 1 | 2 = CAPITULO.test(texto) ? 0 : x0 - borde >= 8 ? 2 : 1
      entradas.push({ texto, pagina: Number(m[2]), nivel, columna, x0 })
    }
  })
  return entradas
}

/**
 * Busca el índice en las primeras páginas y calcula el desfase entre páginas del libro y del PDF.
 * `indicadas`: páginas del PDF donde la usuaria dijo que está el índice; ahí alcanza con menos
 * entradas por página. La última página del índice suele tener pocas, así que después de la
 * primera también se aceptan páginas más cortas.
 */
export function analizarIndice(paginas: PaginaPdf[], indicadas?: { desde: number; hasta: number }): IndiceLibro | null {
  const paginasIndice: number[] = []
  const entradas: EntradaIndice[] = []
  for (const p of paginas) {
    const indicada = indicadas && p.numero >= indicadas.desde && p.numero <= indicadas.hasta
    const e = entradasDePagina(p, indicada ? 4 : paginasIndice.length ? 6 : 12)
    if (e) { paginasIndice.push(p.numero); entradas.push(...e) }
    else if (paginasIndice.length) break // el índice ocupa páginas seguidas
  }
  if (!entradas.length) return null

  const capitulos: CapituloIndice[] = []
  for (const e of entradas) {
    if (NO_ES_CONTENIDO.test(e.texto)) continue
    const m = e.texto.match(CAPITULO)
    if (m) {
      const etiqueta = m[2] ? `Capítulo ${m[2]}` : `Apéndice ${(m[3] ?? '').toUpperCase()}`
      capitulos.push({ id: `${e.pagina}-${capitulos.length}`, etiqueta, titulo: m[4].trim(), pagina: e.pagina, secciones: [] })
    } else if (!capitulos.length) {
      // Lo que va antes del capítulo 1 (introducción): la primera entrada es su título.
      capitulos.push({ id: `${e.pagina}-0`, etiqueta: '', titulo: e.texto, pagina: e.pagina, secciones: [] })
    } else {
      capitulos[capitulos.length - 1].secciones.push(e)
    }
  }
  return { paginasPdf: paginasIndice, capitulos, desfase: calcularDesfase(paginas) ?? desfasePorTitulos(paginas, capitulos) }
}

/**
 * Si el escaneo no leyó los números de página, se busca en qué página del PDF aparece el
 * título grande de cada capítulo. Como un capítulo puede abrir con una ilustración antes del
 * título, se toma el menor desfase encontrado.
 */
function desfasePorTitulos(paginas: PaginaPdf[], capitulos: CapituloIndice[]): number | null {
  const candidatos: number[] = []
  for (const p of paginas) {
    const alturas = p.fragmentos.map(f => f.h).sort((a, b) => a - b)
    const tipica = alturas[Math.floor(alturas.length / 2)] ?? 0
    if (!tipica) continue
    const grande = p.fragmentos.filter(f => f.h >= tipica * 2.6).sort((a, b) => Math.round(a.base / tipica) - Math.round(b.base / tipica) || a.x0 - b.x0).map(f => f.texto).join(' ')
    if (!grande) continue
    for (const c of capitulos) {
      if (parecido(grande, c.titulo) >= 0.8 || clave(grande).includes(clave(c.titulo))) {
        const d = p.numero - c.pagina
        if (d >= 0) candidatos.push(d)
      }
    }
  }
  return candidatos.length ? Math.min(...candidatos) : null
}

/**
 * Desfase entre la página del PDF y la impresa, leyendo el número del pie de página
 * ("8 CAPÍTULO 1 | CÓMO JUGAR" o "CAPÍTULO 1 | CÓMO JUGAR 7").
 */
export function calcularDesfase(paginas: PaginaPdf[]): number | null {
  const votos = new Map<number, number>()
  for (const p of paginas) {
    const pie = p.fragmentos.filter(f => f.base > p.alto * 0.94)
    if (!pie.length) continue
    const ordenados = [...pie].sort((a, b) => a.x0 - b.x0)
    const textoPie = ordenados.map(f => f.texto).join(' ')
    if (!/\|/.test(textoPie) && !/cap[ií]tulo|introducci|ap[ée]ndice/i.test(textoPie)) continue
    // El número puede venir suelto o pegado al texto del pie («8 CAPÍTULO 1 | CÓMO JUGAR»).
    const numero = [ordenados[0], ordenados[ordenados.length - 1]].map(f => f.texto.match(/^\d{1,4}$/)?.[0]).find(Boolean)
      ?? textoPie.trim().match(/^(\d{1,4})\s/)?.[1] ?? textoPie.trim().match(/\s(\d{1,4})$/)?.[1]
    if (!numero) continue
    const desfase = p.numero - Number(numero)
    votos.set(desfase, (votos.get(desfase) ?? 0) + 1)
  }
  const mejor = [...votos.entries()].sort((a, b) => b[1] - a[1])[0]
  return mejor ? mejor[0] : null
}

/** Páginas del PDF de cada capítulo del índice. */
export function paginasDeCapitulos(indice: IndiceLibro, totalPdf: number): { capitulo: CapituloIndice; desde: number; hasta: number }[] {
  const desfase = indice.desfase ?? 0
  return indice.capitulos.map((c, i) => {
    const siguiente = indice.capitulos[i + 1]
    const desde = Math.min(totalPdf, Math.max(1, c.pagina + desfase))
    const hasta = Math.min(totalPdf, Math.max(desde, (siguiente ? siguiente.pagina + desfase - 1 : totalPdf)))
    return { capitulo: c, desde, hasta }
  })
}

/**
 * Arma un capítulo importado según su entrada del índice: le da el nombre del índice, une
 * todo lo leído en esas páginas y corrige los títulos con el texto del índice (que tiene
 * mayúsculas y tildes correctas). Devuelve también las secciones del índice que no aparecieron.
 */
export function ajustarConIndice(leidos: Capitulo[], entrada: CapituloIndice): { capitulo: Capitulo; faltan: string[] } {
  const etiquetaLeida = leidos.find(c => c.etiqueta)?.etiqueta ?? ''
  const bloques: Bloque[] = leidos.flatMap(c => c.bloques)
  const encontradas = new Set<number>()
  for (const b of bloques) {
    if (b.tipo !== 'titulo' && b.tipo !== 'subtitulo') continue
    let mejor = -1, puntaje = 0
    entrada.secciones.forEach((s, i) => {
      const p = parecido(b.texto, s.texto)
      if (p > puntaje) { puntaje = p; mejor = i }
    })
    if (mejor >= 0 && puntaje >= 0.8) {
      const s = entrada.secciones[mejor]
      b.texto = s.texto
      ;(b as { tipo: string }).tipo = s.nivel === 2 ? 'subtitulo' : 'titulo'
      encontradas.add(mejor)
    }
  }
  // Una sección que no apareció como título puede haber quedado pegada al comienzo de un
  // párrafo («Tiradas de salvación Una tirada de salvación…»): se separa y pasa a ser título.
  let conSecciones = bloques
  entrada.secciones.forEach((s, i) => {
    if (encontradas.has(i)) return
    const separado = separarTitulo(conSecciones, s.texto, s.nivel === 2 ? 'subtitulo' : 'titulo')
    if (separado) { conSecciones = separado; encontradas.add(i) }
  })
  // El título del capítulo leído en la página no debe repetirse como bloque.
  const sinTituloRepetido = conSecciones.filter(b => !((b.tipo === 'titulo' || b.tipo === 'subtitulo') && parecido(b.texto, entrada.titulo) >= 0.85))
  return {
    capitulo: {
      id: leidos[0]?.id ?? entrada.id,
      etiqueta: entrada.etiqueta || etiquetaLeida,
      titulo: entrada.titulo || comoOracion(leidos[0]?.titulo ?? ''),
      bloques: sinTituloRepetido,
    },
    faltan: entrada.secciones.filter((_, i) => !encontradas.has(i)).map(s => s.texto),
  }
}

/** Para comparar sin mayúsculas ni tildes, conservando la posición de cada letra. */
const plano = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/**
 * Busca el título al comienzo de un párrafo (o después de un punto) seguido de texto que empieza
 * en mayúscula, y parte ese bloque en: lo de antes, el título y lo de después.
 * Devuelve los bloques nuevos, o null si no lo encontró.
 */
export function separarTitulo(bloques: Bloque[], titulo: string, tipo: 'titulo' | 'subtitulo'): Bloque[] | null {
  const buscado = plano(titulo.trim())
  if (buscado.length < 4) return null
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i]
    if (b.tipo !== 'parrafo') continue
    const texto = b.texto
    const enPlano = plano(texto)
    let desde = 0
    while (desde < enPlano.length) {
      const pos = enPlano.indexOf(buscado, desde)
      if (pos < 0) break
      desde = pos + 1
      const antes = texto.slice(0, pos)
      const comienzo = !antes.trim() || /\n\s*\n\s*$/.test(antes) || /[.!?:»”"]\s+$/.test(antes)
      const resto = texto.slice(pos + titulo.trim().length)
      // Después del título: espacio (o punto) y una mayúscula; si no, es parte de una oración.
      if (!comienzo || !/^[.:]?\s+[¿¡«“"]?\p{Lu}/u.test(resto)) continue
      const nuevos: Bloque[] = []
      if (antes.trim()) nuevos.push({ id: b.id, tipo: 'parrafo', texto: antes.trim() })
      nuevos.push({ id: antes.trim() ? nuevoId() : b.id, tipo, texto: titulo.trim() })
      const despues = resto.replace(/^[.:]?\s+/, '').trim()
      if (despues) nuevos.push({ id: nuevoId(), tipo: 'parrafo', texto: despues })
      return [...bloques.slice(0, i), ...nuevos, ...bloques.slice(i + 1)]
    }
  }
  return null
}
