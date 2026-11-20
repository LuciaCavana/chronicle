import { nuevoId, type Bloque, type Capitulo, type LineaDialogo, type LineaLista } from '../types/capitulo'
import {
  bloquesDeRenglones, CAMPO_TRASFONDO, dudasDe, INICIO_CONJURO, INICIO_CRIATURA, INICIO_DOTE, leerConjuro, leerCriatura, leerDote, leerTrasfondo,
  type CategoriaFicha, type FichaDetectada, type RenglonFicha,
} from './fichasLibro'
import {
  comoOracion, DIALOGO, esMayusculas, esNombreDeDialogo, limpiarTextoEscaneado, LISTA, normalizarComienzo, TERMINO, unirRenglones, unirTexto,
  type Correccion,
} from './pegarDesdeLibro'

/**
 * Arma capítulos a partir del texto de un PDF escaneado (capa de texto del OCR) usando la
 * posición y el tamaño de cada renglón, como se ve en el libro:
 * - tamaño: título del capítulo (muy grande), títulos de sección y subtítulos;
 * - dos columnas: se leen de arriba abajo, primero la izquierda;
 * - sangría: primer renglón de un párrafo; sangría francesa en términos, listas y diálogos;
 * - recuadros: título en mayúsculas y todo el texto corrido hacia adentro.
 * Es una propuesta: el autor la revisa antes de agregarla al libro.
 */

/** Un trozo de texto del PDF, en puntos, con el origen arriba a la izquierda. */
export type Fragmento = { x0: number; x1: number; base: number; h: number; texto: string }
/** centro: dónde está el espacio entre columnas, si ya se sabe (al leer solo una zona de la página). */
export type PaginaPdf = { numero: number; ancho: number; alto: number; fragmentos: Fragmento[]; centro?: number }

/** Trozos de un renglón separados por un espacio grande (celdas de una tabla). */
type Celda = { x0: number; x1: number; texto: string }
type Renglon = { x0: number; x1: number; base: number; h: number; texto: string; celdas: Celda[]; trozos: Celda[]; pagina: number; columna: 0 | 1 | 2; sangria: number; r: number }

const mediana = (v: number[]) => {
  if (!v.length) return 0
  const o = [...v].sort((a, b) => a - b)
  return o[Math.floor(o.length / 2)]
}
const percentil = (v: number[], p: number) => {
  if (!v.length) return 0
  const o = [...v].sort((a, b) => a - b)
  return o[Math.min(o.length - 1, Math.floor(o.length * p))]
}
const letras = (t: string) => t.replace(/[^\p{L}]/gu, '').length

/**
 * Dónde está el espacio entre columnas: la franja vertical más ancha sin texto cerca del centro.
 * No siempre es la mitad exacta (márgenes espejados, fichas con texto más ancho de un lado).
 */
export function centroColumnas(p: PaginaPdf): number {
  if (p.centro !== undefined) return p.centro
  const mitad = p.ancho / 2
  const desde = Math.floor(p.ancho * 0.35)
  const hasta = Math.ceil(p.ancho * 0.65)
  const ocupado = new Uint8Array(hasta - desde + 1)
  for (const f of p.fragmentos) {
    if (!f.texto.trim() || f.x1 - f.x0 > p.ancho * 0.6) continue
    for (let x = Math.max(desde, Math.floor(f.x0)); x <= Math.min(hasta, Math.ceil(f.x1)); x++) ocupado[x - desde] = 1
  }
  let mejor = { largo: 0, centro: mitad }
  let inicio = -1
  for (let i = 0; i <= ocupado.length; i++) {
    if (i < ocupado.length && !ocupado[i]) { if (inicio < 0) inicio = i; continue }
    if (inicio >= 0) {
      const largo = i - inicio
      const centro = desde + inicio + largo / 2
      // La franja más ancha; a igual ancho, la más cercana al centro de la página.
      if (largo > mejor.largo || (largo === mejor.largo && Math.abs(centro - mitad) < Math.abs(mejor.centro - mitad))) mejor = { largo, centro }
      inicio = -1
    }
  }
  return mejor.largo >= 6 ? mejor.centro : mitad
}

/** Junta los fragmentos de una página en renglones (los escaneos suelen traer palabras sueltas). */
export function armarRenglones(p: PaginaPdf, mitad = centroColumnas(p)): Omit<Renglon, 'columna' | 'sangria' | 'r'>[] {
  const todos = p.fragmentos.filter(f => f.texto.trim() && f.h > 0)
  // Letras capitulares: una sola letra mayúscula mucho más alta que el texto y angosta, con
  // un renglón que empieza a su derecha a la altura de su parte de arriba: se pega a ese renglón.
  const hPagina = mediana(todos.map(f => f.h))
  const esCapitular = (f: Fragmento) => /^\p{Lu}$/u.test(f.texto.trim()) && f.h >= hPagina * 2 && f.x1 - f.x0 <= f.h * 1.5
  type Grupo = { x0: number; x1: number; base: number; hs: number[]; partes: Fragmento[] }
  const agrupar = (lista: Fragmento[]): Grupo[] => {
    const renglones: Grupo[] = []
    for (const f of [...lista].sort((a, b) => a.base - b.base || a.x0 - b.x0)) {
      const destino = renglones.find(r => {
        const h = Math.min(mediana(r.hs), f.h)
        // No mezclar palabras de columnas opuestas aunque compartan la misma altura: un
        // fragmento que cruza el centro es ancho y solo se une con otros anchos.
        const lado = (x0: number, x1: number) => x1 <= mitad ? 0 : x0 >= mitad ? 1 : 2
        if (lado(r.x0, r.x1) !== lado(f.x0, f.x1)) return false
        // Los escaneos vienen algo torcidos: la línea base se compara con la palabra más cercana
        // del renglón, y la palabra puede quedar a la derecha o a la izquierda de lo ya juntado.
        const cercana = r.partes.reduce((m, x) => Math.abs(x.x0 - f.x0) < Math.abs(m.x0 - f.x0) ? x : m)
        return Math.abs(cercana.base - f.base) < h * 0.5 && f.x0 - r.x1 < h * 2 && r.x0 - f.x1 < h * 2
      })
      if (destino) {
        destino.partes.push(f); destino.hs.push(f.h)
        destino.x1 = Math.max(destino.x1, f.x1); destino.x0 = Math.min(destino.x0, f.x0)
      } else renglones.push({ x0: f.x0, x1: f.x1, base: f.base, hs: [f.h], partes: [f] })
    }
    // Dos trozos del mismo renglón pueden haber empezado por separado (una palabra más baja por la
    // inclinación aparece antes): se unen si quedan pegados en la misma línea.
    const ordenados = renglones.sort((a, b) => a.x0 - b.x0)
    for (let i = 0; i < ordenados.length; i++) {
      for (let j = i + 1; j < ordenados.length; j++) {
        const a = ordenados[i], b = ordenados[j]
        const h = Math.min(mediana(a.hs), mediana(b.hs))
        const lado = (x0: number, x1: number) => x1 <= mitad ? 0 : x0 >= mitad ? 1 : 2
        const borde = a.partes.reduce((m, x) => x.x1 > m.x1 ? x : m)
        const inicio = b.partes.reduce((m, x) => x.x0 < m.x0 ? x : m)
        // Más separados (celdas de una tabla) también van juntos, si los dos tienen palabras.
        const conPalabras = (g: Grupo) => letras(g.partes.map(x => x.texto).join('')) >= 2
        const pegados = b.x0 - a.x1 < h * 2 || (conPalabras(a) && conPalabras(b))
        if (lado(a.x0, a.x1) !== lado(b.x0, b.x1) || Math.abs(borde.base - inicio.base) >= h * 0.5 || !pegados || b.x0 < a.x0) continue
        a.partes.push(...b.partes); a.hs.push(...b.hs)
        a.x1 = Math.max(a.x1, b.x1)
        ordenados.splice(j, 1); j = i
      }
    }
    return ordenados
  }
  /** El renglón más alto que empieza pegado a la derecha de la capitular, dentro de su altura. */
  const alLado = (c: Fragmento, renglones: Grupo[], ocupados: Map<object, string>) => renglones
    .filter(r => mediana(r.hs) < c.h * 0.6 && !ocupados.has(r) &&
      r.x0 >= c.x1 - hPagina * 0.5 && r.x0 - c.x1 < hPagina * 2.5 &&
      r.base >= c.base - c.h - hPagina && r.base <= c.base + hPagina * 0.5)
    .sort((a, b) => a.base - b.base)[0]

  const candidatas = todos.filter(esCapitular)
  const resto = todos.filter(f => !candidatas.includes(f))
  // Una letra grande sin renglón al lado no es capitular (p. ej. la «A» de un título): va con el resto.
  const previos = agrupar(resto)
  const capitulares = candidatas.filter(c => alLado(c, previos, new Map()))
  const renglones = agrupar([...resto, ...candidatas.filter(c => !capitulares.includes(c))])
  const conCapitular = new Map<object, string>()
  for (const c of capitulares) {
    const destino = alLado(c, renglones, conCapitular)
    if (destino) conCapitular.set(destino, c.texto.trim())
  }
  return renglones.map(r => {
    const partes = r.partes.sort((a, b) => a.x0 - b.x0)
    let texto = ''
    let fin = -Infinity
    const celdas: Celda[] = []
    const trozos: Celda[] = []
    for (const parte of partes) {
      // Una letra suelta encimada sobre otra palabra es ruido del escaneo (p. ej. la capitular).
      if (parte.x0 < fin - parte.h * 0.3 && parte.texto.trim().length <= 1 && letras(parte.texto) === 1) continue
      // Un espacio mucho más ancho que el normal entre palabras separa celdas de una tabla.
      trozos.push({ x0: parte.x0, x1: parte.x1, texto: parte.texto.trim() })
      const celda = celdas[celdas.length - 1]
      if (!celda || parte.x0 - fin > parte.h * 1.8) celdas.push({ x0: parte.x0, x1: parte.x1, texto: parte.texto.trim() })
      else { celda.texto = `${celda.texto} ${parte.texto.trim()}`.trim(); celda.x1 = parte.x1 }
      // Palabras separadas, o encimadas por el escaneo («viaje» y «y 32» se pisan): van con espacio.
      const separada = parte.x0 - fin > parte.h * 0.12 || parte.x0 < fin - parte.h * 0.3
      texto += (texto && separada && !texto.endsWith(' ') ? ' ' : '') + parte.texto
      fin = parte.x1
    }
    const letra = conCapitular.get(r) ?? ''
    if (letra && celdas[0]) celdas[0].texto = letra + celdas[0].texto
    return { x0: r.x0, x1: r.x1, base: r.base, h: mediana(r.hs), texto: letra + texto.replace(/\s+/g, ' ').trim(), celdas, trozos, pagina: p.numero }
  })
}

/** Basura del escaneo: marcas de adornos y renglones sin palabras ("pa ma", "a Cc >"). */
function esBasura(t: string): boolean {
  // Los números cuentan como contenido («50 po», «12 m»).
  const n = letras(t) + (t.match(/\d/g)?.length ?? 0)
  if (n < 3) return true
  if (n / t.length < 0.5) return true
  const palabras = t.split(' ').filter(p => letras(p) > 0)
  // «50 po», «3 m»: cantidad con unidad.
  if (/\d/.test(t) && palabras.length >= 1) return false
  return t.length < 9 && palabras.every(p => letras(p) <= 2)
}

/** Páginas que no son contenido del libro: se saltean hasta el próximo capítulo. */
const OMITIR = /^(cr[ée]ditos|[íi]ndice( de t[ée]rminos)?|contenidos?|sumario|agradecimientos|tabla de contenidos?)$/i
/** Renglones del índice: "Combate……………23". */
const LINEA_INDICE = /(\.\s?){4,}\s*\d+\s*$|…{2,}\s*\d+\s*$/
const ETIQUETA = /^(cap[ií]tulo|ap[ée]ndice|introducci[óo]n|pr[óo]logo|prefacio)\b/i
const comoTitulo = (t: string) => comoOracion(t.replace(/[,;.]+$/, '').trim())
/** Nombre en versalitas, aunque el escaneo haya leído algunas letras en minúscula («DoN DE LA HABILIDAD», «DueLo»). */
const versalitas = (t: string) => {
  const ls = t.replace(/[^\p{L}]/gu, '')
  const mayus = ls.replace(/[^\p{Lu}]/gu, '').length
  return esMayusculas(t) || (ls.length >= 3 && mayus / ls.length >= 0.6) || /\p{Ll}\p{Lu}/u.test(t)
}

/**
 * Lugar de la página donde estaba un texto (en puntos del PDF, origen arriba a la izquierda).
 * Sirve para mostrar en la revisión de qué parte de la página salió cada bloque o ficha.
 */
export type Area = { pagina: number; x0: number; y0: number; x1: number; y1: number; texto?: string }
/** Medidas del texto de un capítulo: tamaño de la letra del cuerpo y margen de cada columna. */
export type Medidas = { hCuerpo: number; bordes: Record<string, number> }
/**
 * minFragmentos: páginas con menos texto se toman como ilustraciones (por defecto 40).
 * medidas: las del capítulo, para leer una zona chica con las mismas referencias.
 * omitir: saltear créditos, índice y similares (por defecto sí).
 */
export type OpcionesAnalisis = { minFragmentos?: number; medidas?: Medidas; omitir?: boolean }
export type ResultadoPdf = {
  capitulos: Capitulo[]; correcciones: Correccion[]; paginas: number; fichas: FichaDetectada[]
  medidas: Medidas
  /** Por id de bloque o de ficha, los renglones de la página de donde salió. */
  areas: Record<string, Area[]>
}
const areaDe = (r: { pagina: number; x0: number; x1: number; base: number; h: number; texto: string }): Area =>
  ({ pagina: r.pagina, x0: r.x0, y0: r.base - r.h, x1: r.x1, y1: r.base + r.h * 0.25, texto: r.texto })

export function analizarPaginas(paginas: PaginaPdf[], opciones: OpcionesAnalisis = {}): ResultadoPdf {
  // Las páginas con casi nada de texto son ilustraciones (solo tienen el pie de imagen).
  // Corrige los errores del escaneo renglón por renglón (antes de reconocer versalitas y términos).
  const todas: Correccion[] = []
  const limpiar = (t: string) => {
    const { texto, correcciones } = limpiarTextoEscaneado(t)
    todas.push(...correcciones)
    return texto
  }
  const porPagina = paginas.filter(p => p.fragmentos.length >= (opciones.minFragmentos ?? 40)).map(p => {
    const mitad = centroColumnas(p)
    return { p, mitad, renglones: armarRenglones(p, mitad) }
  })
  const todos = porPagina.flatMap(x => x.renglones)
  // Tamaño de la letra del texto corrido: el de los renglones largos.
  const hCuerpo = opciones.medidas?.hCuerpo ?? (mediana(todos.filter(r => r.texto.length >= 25).map(r => r.h)) || 10)

  // Bordes izquierdos de cada columna, separados por páginas pares e impares (márgenes espejados).
  const bordes: Record<string, number[]> = {}
  const preparados = porPagina.map(({ p, mitad, renglones }) => {
    // Encabezados grandes partidos entre columnas ("CAPÍTULO" … "1,"): se unen.
    // Incluye palabras de una letra («A») y números («1,»): los títulos se parten en el centro de la página.
    const grandes = renglones.filter(r => {
      const n = r.texto.replace(/[^\p{L}\d]/gu, '').length
      // Una letra sola mucho más ancha que alta es un adorno mal leído por el escaneo.
      const soloLetras = /^\p{L}+$/u.test(r.texto.replace(/[^\p{L}\d]/gu, ''))
      return r.h >= hCuerpo * 1.5 && n >= 1 && !(soloLetras && n <= 2 && r.x1 - r.x0 > r.h * 1.5 * n)
    }).sort((a, b) => a.base - b.base || a.x0 - b.x0)
    const usados = new Set<object>()
    const unidos: typeof renglones = []
    for (const g of grandes) {
      if (usados.has(g)) continue
      const mismos = grandes.filter(o => !usados.has(o) && Math.abs(o.base - g.base) < g.h * 0.6)
      // Solo se unen si es una etiqueta partida ("CAPÍTULO" + "1,"), no dos títulos de columnas distintas.
      const esEtiqueta = mismos.some(o => ETIQUETA.test(o.texto.replace(/^[^\p{L}]+/u, ''))) && mismos.some(o => o.texto.replace(/[^\p{L}\d]/gu, '').length <= 3)
      // El título del capítulo (letra muy grande) sí puede cruzar el centro de la página.
      const tituloCapitulo = mismos.every(o => o.h >= hCuerpo * 2.6)
      if (mismos.length > 1 && !esEtiqueta && !tituloCapitulo) continue
      mismos.forEach(o => usados.add(o))
      let partes = [...mismos].sort((a, b) => a.x0 - b.x0)
      // En una etiqueta partida, lo que está antes de «Capítulo» es un adorno mal leído («al»).
      if (esEtiqueta) partes = partes.slice(Math.max(0, partes.findIndex(o => ETIQUETA.test(o.texto.replace(/^[^\p{L}]+/u, '')))))
      const texto = partes.map(o => o.texto).join(' ')
      const x0 = Math.min(...partes.map(o => o.x0)), x1 = Math.max(...partes.map(o => o.x1))
      unidos.push({ ...g, x0, x1, texto, celdas: [{ x0, x1, texto }], trozos: [{ x0, x1, texto }] })
    }
    const lista = [...renglones.filter(r => !usados.has(r)), ...unidos]
      // Pie de página ("8 CAPÍTULO 1 | CÓMO JUGAR") y basura.
      .filter(r => !(r.base > p.alto * 0.955 && r.h < hCuerpo * 1.3) && !esBasura(r.texto) && !LINEA_INDICE.test(r.texto))
    const conColumna = lista.map(r => {
      const ancho = r.x0 < mitad - p.ancho * 0.04 && r.x1 > mitad + p.ancho * 0.04
      return { ...r, columna: (ancho ? 2 : r.x0 < mitad ? 0 : 1) as 0 | 1 | 2 }
    })
    for (const col of [0, 1] as const) {
      const xs = conColumna.filter(r => r.columna === col && r.h < hCuerpo * 1.25 && r.texto.length > 15).map(r => r.x0)
      if (xs.length >= 3) (bordes[`${p.numero % 2}-${col}`] ??= []).push(percentil(xs, 0.1))
    }
    return { p, renglones: conColumna }
  })
  const borde = (pagina: number, col: 0 | 1 | 2, ancho: number) =>
    col === 2 ? 0 : opciones.medidas?.bordes[`${pagina % 2}-${col}`] ?? (mediana(bordes[`${pagina % 2}-${col}`] ?? []) || (col === 0 ? ancho * 0.08 : ancho * 0.52))
  const medidas: Medidas = {
    hCuerpo,
    bordes: opciones.medidas?.bordes ?? Object.fromEntries(Object.entries(bordes).map(([k, xs]) => [k, mediana(xs)])),
  }

  // Orden de lectura. La página se divide en franjas separadas por un hueco grande sin texto en
  // ninguna columna (una ilustración que ocupa todo el ancho): en las fichas de trasfondo, por
  // ejemplo, cada franja tiene los datos a la izquierda y la descripción a la derecha. Dentro de
  // cada franja: lo ancho de arriba, la columna izquierda, la derecha y lo ancho de abajo.
  const franjas = <T extends { base: number; h: number }>(renglones: T[]): T[][] => {
    const orden = [...renglones].sort((a, b) => a.base - b.base)
    const grupos: T[][] = []
    let fin = -Infinity
    for (const r of orden) {
      if (!grupos.length || r.base - r.h - fin > hCuerpo * 4) grupos.push([])
      grupos[grupos.length - 1].push(r)
      fin = Math.max(fin, r.base)
    }
    return grupos
  }
  const flujo: Renglon[] = preparados.flatMap(({ p, renglones }) => franjas(renglones).flatMap(grupo => {
    const enColumna = grupo.filter(r => r.columna !== 2)
    const primero = Math.min(...enColumna.map(r => r.base), Infinity)
    const anchos = grupo.filter(r => r.columna === 2).sort((a, b) => a.base - b.base)
    const orden = [
      ...anchos.filter(r => r.base <= primero),
      ...enColumna.filter(r => r.columna === 0).sort((a, b) => a.base - b.base),
      ...enColumna.filter(r => r.columna === 1).sort((a, b) => a.base - b.base),
      ...anchos.filter(r => r.base > primero),
    ]
    // Comilla suelta al comienzo de un nombre en versalitas («“TRITURADOR»): ruido del escaneo.
    const sinRuido = (t: string) => t.replace(/^[+|•·»«]\s+/, '').replace(/^[“"«‘'](?=[^”"»’']+$)/, m => (esMayusculas(t) && t.length <= 60 ? '' : m))
    return orden.map(r => ({ ...r, texto: limpiar(sinRuido(r.texto)), sangria: r.x0 - borde(p.numero, r.columna, p.ancho), r: r.h / hCuerpo }))
  }))

  // Letra capitular que el escaneo leyó como una letra suelta al comienzo del renglón de abajo
  // («STE CAPÍTULO…» / «E de dotes…»): vuelve al comienzo de la primera palabra.
  for (let i = 0; i < flujo.length; i++) {
    const r = flujo[i]
    if (r.sangria < 30 || !/^\p{Lu}{2,}/u.test(r.texto)) continue
    for (let j = i + 1; j <= i + 2 && j < flujo.length; j++) {
      const abajo = flujo[j]
      if (abajo.pagina !== r.pagina || abajo.columna !== r.columna) break
      const m = abajo.texto.match(/^(?:[^\p{L}\s]{1,3}\s+)?(\p{Lu})\s+(?=\p{Ll})/u)
      if (m && abajo.x0 < r.x0 - hCuerpo * 2) {
        flujo[i] = { ...r, texto: m[1] + r.texto }
        flujo[j] = { ...abajo, texto: abajo.texto.slice(m[0].length) }
        break
      }
    }
  }

  // ---------- Clasificación ----------
  const capitulos: Capitulo[] = []
  let capitulo: Capitulo | null = null
  let etiquetaPendiente = ''
  type Actual =
    | { tipo: 'parrafo'; renglones: string[] }
    | { tipo: 'colgante'; renglones: string[] }
    | { tipo: 'recuadro'; titulo: string; base: number; parrafos: string[][] }
    | { tipo: 'ficha'; categoria: CategoriaFicha; nombre: string; pagina?: number; renglones: RenglonFicha[]; tablas: Extract<Bloque, { tipo: 'tabla' }>[]; zonasTablas: Area[] }
  let actual: Actual | null = null
  const fichas: FichaDetectada[] = []
  let ultimoTitulo: { bloque: Extract<Bloque, { tipo: 'titulo' | 'subtitulo' }>; base: number; pagina: number; columna: number } | null = null

  const asegurarCapitulo = () => {
    if (!capitulo) { capitulo = { id: nuevoId(), etiqueta: '', titulo: 'Antes del primer capítulo', bloques: [] }; capitulos.push(capitulo) }
    return capitulo
  }
  // Dónde estaba cada bloque en la página: los renglones del bloque que se está armando y los
  // del renglón que se procesa ahora (más los que consumió, como las filas de una tabla).
  const areas: Record<string, Area[]> = {}
  let zonasActual: Area[] = []
  let zonasRenglon: Area[] = []
  let renglonUsado = false
  let zonasEtiqueta: Area[] = []
  const sumarZonas = (id: string, z: Area[]) => { if (z.length) (areas[id] ??= []).push(...z) }
  /** Agrega un bloque al capítulo. Sin zonas, el bloque sale del renglón que se procesa ahora. */
  const agregar = (b: Bloque, z?: Area[]) => {
    if (z) sumarZonas(b.id, z)
    else { sumarZonas(b.id, zonasRenglon); renglonUsado = true }
    asegurarCapitulo().bloques.push(b)
  }
  const cerrar = () => {
    if (!actual) return
    const a: Actual = actual
    actual = null
    const z = zonasActual
    zonasActual = []
    if (a.tipo === 'ficha') {
      const leer = { conjuros: leerConjuro, dotes: leerDote, trasfondos: leerTrasfondo, criaturas: leerCriatura }[a.categoria as 'conjuros']
      const sinNombre = !a.nombre.trim()
      const nombre = sinNombre ? `Sin nombre (página ${a.pagina ?? '?'} del PDF)` : versalitas(a.nombre) ? comoTitulo(a.nombre) : a.nombre.trim()
      const datos = leer ? leer(nombre, a.renglones) : { nombre }
      const dudas = dudasDe(a.categoria, nombre, datos)
      const ficha: FichaDetectada = {
        id: nuevoId(), categoria: a.categoria, nombre, datos,
        original: [...bloquesDeRenglones(sinNombre ? '' : nombre, a.renglones), ...a.tablas], renglones: a.renglones, dudas,
      }
      fichas.push(ficha)
      sumarZonas(ficha.id, z)
      // En el capítulo, la ficha ocupa su lugar (fichas seguidas de la misma categoría van juntas).
      const ultimo = capitulo?.bloques[capitulo.bloques.length - 1]
      if (ultimo?.tipo === 'fichas' && ultimo.categoria === a.categoria) { ultimo.ids.push(ficha.id); sumarZonas(ultimo.id, z) }
      else agregar({ id: nuevoId(), tipo: 'fichas', categoria: a.categoria, ids: [ficha.id] }, z)
      // Las tablas de la ficha (p. ej. «Fabricación rápida» de Fabricante) quedan justo después.
      a.tablas.forEach(t => agregar(t, a.zonasTablas))
      return
    }
    if (a.tipo === 'recuadro') {
      const texto = a.parrafos.map(p => normalizarComienzo(unirRenglones(p))).filter(Boolean).join('\n\n')
      if (texto || a.titulo) agregar({ id: nuevoId(), tipo: 'recuadro', titulo: a.titulo, texto }, z)
      return
    }
    const texto = normalizarComienzo(unirRenglones(a.renglones))
    if (!texto) return
    if (a.tipo === 'colgante') {
      const lista = texto.match(LISTA)
      const dialogo = texto.match(DIALOGO)
      const termino = texto.match(TERMINO)
      const ultimo = capitulo?.bloques[capitulo.bloques.length - 1]
      if (lista) {
        const tm = lista[2].match(TERMINO)
        const item: LineaLista = tm ? { termino: tm[1], texto: tm[2] } : { termino: '', texto: lista[2] }
        if (ultimo?.tipo === 'lista') { ultimo.items.push(item); sumarZonas(ultimo.id, z) }
        else agregar({ id: nuevoId(), tipo: 'lista', items: [item] }, z)
        return
      }
      const nombreValido = !!dialogo && esNombreDeDialogo(dialogo[1])
      if (dialogo && nombreValido) {
        const linea: LineaDialogo = { nombre: dialogo[1].trim(), texto: dialogo[2] }
        if (ultimo?.tipo === 'dialogo') { ultimo.lineas.push(linea); sumarZonas(ultimo.id, z) }
        else agregar({ id: nuevoId(), tipo: 'dialogo', lineas: [linea] }, z)
        return
      }
      if (termino) { agregar({ id: nuevoId(), tipo: 'termino', termino: termino[1], texto: termino[2] }, z); return }
    }
    agregar({ id: nuevoId(), tipo: 'parrafo', texto }, z)
  }
  const anchoColumna = (r: Renglon) => {
    const p = paginas.find(x => x.numero === r.pagina)
    return p ? (r.columna === 2 ? p.ancho * 0.84 : p.ancho * 0.42) : 400
  }

  const consumidos = new Set<number>()

  /**
   * Tabla que empieza en el renglón i: un título opcional (corto, en mayúsculas o más grande) y
   * al menos tres renglones con dos o más celdas alineadas en columnas. Los renglones con una sola
   * celda dentro del ancho de una columna continúan la celda de la fila anterior.
   * Devuelve la tabla y hasta qué renglón llega.
   */
  const tablaDesde = (i: number): { tabla: Extract<Bloque, { tipo: 'tabla' }>; hasta: number } | null => {
    const r = flujo[i]
    let k = i
    let titulo = ''
    if (r.celdas.length < 2) {
      if (r.texto.length > 60 || /[.,;]$/.test(r.texto) || !(esMayusculas(r.texto) || r.r >= 1.12)) return null
      titulo = comoTitulo(r.texto)
      k = i + 1
    }
    const cab = flujo[k]
    if (!cab || cab.pagina !== r.pagina || cab.columna !== r.columna || cab.r >= 1.5) return null
    // Las columnas salen del primer renglón con celdas bien separadas (el encabezado puede tenerlas
    // más juntas: «Herramientas de artesano  Equipo fabricado»).
    const modelo = [cab, flujo[k + 1], flujo[k + 2]].find(x => x && x.pagina === cab.pagina && x.columna === cab.columna && x.celdas.length >= 2)
    if (!modelo || (modelo !== cab && cab.trozos.length < 2)) return null
    const xs = modelo.celdas.map(c => c.x0)
    const tolerancia = hCuerpo * 1.5
    /** Reparte las palabras del renglón en las columnas de la tabla según dónde empiezan. */
    const enColumnas = (f: Renglon): string[] | null => {
      if (f.trozos[0].x0 < xs[0] - tolerancia) return null
      const fila = xs.map(() => '')
      for (const t of f.trozos) {
        let col = 0
        while (col + 1 < xs.length && t.x0 >= xs[col + 1] - tolerancia) col++
        // Una palabra que pisa el comienzo de la columna siguiente: no es una tabla.
        if (col + 1 < xs.length && t.x1 > xs[col + 1] + hCuerpo * 0.5 && t.x0 < xs[col + 1] - tolerancia) return null
        fila[col] = `${fila[col]} ${t.texto}`.trim()
      }
      return fila
    }
    const filas: string[][] = []
    let j = k
    for (; j < flujo.length; j++) {
      const f = flujo[j]
      const previo = flujo[j - 1]
      if (f.pagina !== cab.pagina || f.columna !== cab.columna || f.r >= 1.3 || (j > k && f.base - previo.base > hCuerpo * 2.6)) break
      const fila = enColumnas(f)
      if (!fila) break
      const usadas = fila.filter(Boolean).length
      if (usadas >= 2 || !filas.length) { filas.push(fila); continue }
      // Una sola celda: continúa la de la fila anterior (texto que no entró en un renglón).
      const col = fila.findIndex(Boolean)
      if (col < 0) continue
      // Texto corrido del ancho de toda la columna después de la tabla: termina la tabla.
      if (col === 0 && xs.length > 1 && f.x1 > xs[1] - tolerancia) break
      const ultima = filas[filas.length - 1]
      ultima[col] = `${ultima[col]} ${fila[col]}`.trim()
    }
    if (filas.length < 3) return null
    // Texto justificado con espacios grandes (o palabras que el escaneo no leyó) puede parecer una
    // tabla: en una tabla las filas empiezan en mayúscula o número, no continuando una oración.
    const enMinuscula = filas.filter(f => /^\p{Ll}/u.test(f.find(Boolean) ?? '')).length
    if (enMinuscula > filas.length / 3) return null
    if (!titulo && filas[0].some(c => /[:;,]$/.test(c) || c.split(' ').length > 6)) return null
    const [columnas, ...cuerpo] = filas
    return { tabla: { id: nuevoId(), tipo: 'tabla', titulo, columnas, filas: cuerpo }, hasta: j }
  }
  /** Una tabla que sigue en otra columna o página sin título continúa la anterior. */
  const sumarTabla = (t: Extract<Bloque, { tipo: 'tabla' }>, destino: Extract<Bloque, { tipo: 'tabla' }>[]) => {
    const ultima = destino[destino.length - 1]
    // La continuación puede repetir el encabezado: no se copia otra vez.
    const repiteEncabezado = (f: string[]) => ultima && f.join('|').toLowerCase() === ultima.columnas.join('|').toLowerCase()
    if (!t.titulo && ultima && ultima.columnas.length === t.columnas.length) ultima.filas.push(...[t.columnas, ...t.filas].filter(f => !repiteEncabezado(f)))
    else destino.push(t)
  }
  /** ¿Empieza acá una ficha? Su nombre va solo en un renglón y el siguiente tiene la forma de la categoría. */
  const inicioFicha = (i: number): CategoriaFicha | null => {
    const r = flujo[i]
    // Buscar señales dentro de la misma columna física: las páginas pueden
    // contener dos columnas de lectura y las etiquetas pueden estar separadas
    // por fragmentos decorativos del PDF.
    const siguientes = flujo.slice(i + 1, i + 9).filter(x => x.pagina === r.pagina && x.columna === r.columna)
    const sig = siguientes[0]
    if (!sig || r.texto.length > 60 || letras(r.texto) < 3 || /[.:,;]$/.test(r.texto) || !/^[¿¡]?\p{Lu}/u.test(r.texto)) return null
    if (INICIO_CONJURO.test(sig.texto) && siguientes.slice(1, 3).some(x => /^tiempo de lanzamiento/i.test(x.texto))) return 'conjuros'
    if (INICIO_DOTE.test(sig.texto)) {
      // Una entrada real lleva un nombre breve e independiente del texto explicativo.
      // Evitar que frases como «Dote. El trasfondo aporta...» se conviertan en fichas.
      const nombre = r.texto.trim()
      const palabras = nombre.split(/\s+/)
      const pareceExplicacion = /[.!?;:,]/.test(nombre) || palabras.length > 7 || /^(dote|dotes|beneficios|prerrequisitos?)\b/i.test(nombre)
      const mismoContexto = sig.pagina === r.pagina && sig.columna === r.columna
      if (!pareceExplicacion && mismoContexto) return 'dotes'
    }
    if (INICIO_CRIATURA.test(sig.texto) && siguientes.some(x => /\bCA\s+\d/.test(x.texto))) return 'criaturas'
    // El título de un trasfondo precede a una cabecera de campos. No alcanza con
    // encontrar un campo cercano: podría ser una línea del trasfondo anterior.
    // Exigir que el primer campo sea «Puntuaciones de característica» y que haya
    // al menos otro campo propio de la ficha en la misma columna.
    const cabecera = siguientes
    const campoExtra = /^(?:dote|competencias? en habilidades|competencias? con herramientas|equipo)\s*:/i
    const esNombre = !/:/.test(r.texto) && r.texto.trim().split(/\s+/).length <= 7
    if (esNombre && sig.pagina === r.pagina && sig.columna === r.columna &&
        CAMPO_TRASFONDO.test(sig.texto) && cabecera.slice(1).some(x => campoExtra.test(x.texto))) return 'trasfondos'
    return null
  }
  // Créditos, índice…: se saltean hasta el próximo capítulo.
  let omitiendo = false
  const procesar = (r: Renglon, i: number) => {
    const siguiente = flujo[i + 1]
    const anterior = flujo[i - 1]
    const mayus = esMayusculas(r.texto)

    // Título del capítulo (letra muy grande).
    if (r.r >= 2.6) {
      cerrar(); ultimoTitulo = null
      if (opciones.omitir !== false && OMITIR.test(comoTitulo(r.texto))) { omitiendo = true; etiquetaPendiente = ''; return }
      omitiendo = false
      const ultimoCap: Capitulo | null = capitulo
      if (ultimoCap && ultimoCap.bloques.length === 0 && anterior && anterior.r >= 2.6 && anterior.pagina === r.pagina) {
        ultimoCap.titulo = `${ultimoCap.titulo} ${comoTitulo(r.texto).toLocaleLowerCase('es')}`
        sumarZonas(`titulo:${ultimoCap.id}`, zonasRenglon); renglonUsado = true
        return
      }
      const nuevo: Capitulo = { id: nuevoId(), etiqueta: etiquetaPendiente, titulo: comoTitulo(r.texto), bloques: [] }
      capitulo = nuevo
      capitulos.push(nuevo)
      etiquetaPendiente = ''
      // Dónde está el título del capítulo (con su etiqueta) en la página.
      sumarZonas(`titulo:${nuevo.id}`, [...zonasEtiqueta, ...zonasRenglon]); renglonUsado = true
      zonasEtiqueta = []
      return
    }
    // "Capítulo 1", "Introducción", "Apéndice A": etiqueta del próximo capítulo.
    const sinSignos = r.texto.replace(/^[^\p{L}]+/u, '')
    if (r.r >= 1.5 && ETIQUETA.test(sinSignos) && sinSignos.length < 40) {
      cerrar()
      omitiendo = false
      zonasEtiqueta = [...zonasRenglon]; renglonUsado = true
      etiquetaPendiente = comoTitulo(sinSignos).replace(/^(\p{L}+)\s+(\p{L}{1,3}|\d+)$/u, (_m, a: string, b: string) => `${a} ${/^\d+$/.test(b) ? b : b.toUpperCase()}`)
      return
    }
    if (consumidos.has(i)) return
    // Un título "Créditos" o "Índice" empieza páginas que no son contenido.
    if (opciones.omitir !== false && r.r >= 1.22 && OMITIR.test(comoTitulo(r.texto))) { cerrar(); omitiendo = true; return }
    if (omitiendo) return
    // Fichas impresas en el texto (conjuros, dotes, trasfondos, criaturas): se leen aparte.
    // Un trasfondo cuyo nombre no está en el texto (impreso sobre una ilustración, que el escaneo
    // no lee) empieza directamente con sus campos: se crea sin nombre y va a «Pendientes de revisión».
    const abierta: Actual | null = actual
    const yaTieneCampos = abierta?.tipo === 'ficha' && abierta.categoria === 'trasfondos' && abierta.renglones.some(x => CAMPO_TRASFONDO.test(x.texto))
    const abiertaVacia = abierta?.tipo === 'ficha' && abierta.renglones.length === 0
    if (CAMPO_TRASFONDO.test(r.texto) && !abiertaVacia && (abierta?.tipo !== 'ficha' || yaTieneCampos || abierta.categoria !== 'trasfondos')) {
      const siguientes = flujo.slice(i + 1, i + 8).filter(x => x.pagina === r.pagina && x.columna === r.columna)
      if (siguientes.some(x => /^(?:dote|competencias? en habilidades|competencias? con herramientas|equipo)\s*:/i.test(x.texto))) {
        cerrar()
        actual = { tipo: 'ficha', categoria: 'trasfondos', nombre: '', pagina: r.pagina, renglones: [], tablas: [], zonasTablas: [] }
      }
    }
    const ficha = inicioFicha(i)
    if (ficha) {
      cerrar()
      actual = { tipo: 'ficha', categoria: ficha, nombre: r.texto, renglones: [], tablas: [], zonasTablas: [] }
      return
    }
    // Título en versalitas apenas más alto que el texto («DOTES DE DON ÉPICO»).
    // También uno del mismo tamaño que el texto si está solo en su renglón, entre una oración
    // terminada y un texto que empieza en mayúscula («TIRADAS DE SALVACIÓN» / «Una tirada…»): una
    // apertura de párrafo en versalitas sigue en minúscula en el renglón de abajo.
    const mismaColumna = (x?: Renglon) => !!x && x.pagina === r.pagina && x.columna === r.columna
    const encabezadoChico = mayus && r.r >= 0.9 && r.sangria < 8 && r.texto.length <= 50 && !/[.,;:]$/.test(r.texto) &&
      mismaColumna(siguiente) && /^[«“"¿¡]?\p{Lu}/u.test(siguiente.texto) && !esMayusculas(siguiente.texto) &&
      (!mismaColumna(anterior) || /[.!?:»”")]$/.test(anterior.texto) || anterior.r >= 1.22)
    const tituloVersalitas = (mayus && r.r >= 1.12 && r.sangria < 8 && r.texto.length <= 60 && !/[.,;:]$/.test(r.texto)) || encabezadoChico
    const enFicha: Actual | null = actual
    if (enFicha?.tipo === 'ficha') {
      const t = tablaDesde(i)
      if (t) {
        sumarTabla(t.tabla, enFicha.tablas)
        for (let k = i + 1; k < t.hasta; k++) { consumidos.add(k); zonasRenglon.push(areaDe(flujo[k])) }
        // La tabla tiene su propio lugar en la página (no se mezcla con el texto de la ficha).
        enFicha.zonasTablas.push(...zonasRenglon); renglonUsado = true
        return
      }
      const seccionCriatura = enFicha.categoria === 'criaturas' && /^(rasgos|acciones|acciones adicionales|reacciones|acciones legendarias)$/i.test(r.texto.trim())
      // Un renglón que continúa la ficha no la cierra aunque el escaneo lo haya leído más grande
      // («o (B) 50 po» después de «…3 po,»).
      const ultimoFicha = enFicha.renglones[enFicha.renglones.length - 1]?.texto ?? ''
      const continua = r.r < 1.6 && !tituloVersalitas && (/^[\p{Ll}(\d]/u.test(r.texto) || /[,(]$/.test(ultimoFicha))
      if ((r.r < 1.22 && !tituloVersalitas) || continua || seccionCriatura) { enFicha.renglones.push({ texto: r.texto, sangria: r.sangria, zona: `${r.pagina}-${r.columna}`, area: areaDe(r) }); return }
      cerrar()
    }
    // Tablas sueltas en el capítulo.
    const tabla = tablaDesde(i)
    if (tabla) {
      cerrar()
      // Los renglones de la tabla van a su lugar en la página (antes de agregarla).
      for (let k = i + 1; k < tabla.hasta; k++) { consumidos.add(k); zonasRenglon.push(areaDe(flujo[k])) }
      const ultimo = capitulo?.bloques[capitulo.bloques.length - 1]
      const destino = ultimo?.tipo === 'tabla' ? [ultimo] : []
      sumarTabla(tabla.tabla, destino)
      if (destino[destino.length - 1] !== ultimo) agregar(destino[destino.length - 1])
      else if (ultimo) { sumarZonas(ultimo.id, zonasRenglon); renglonUsado = true }
      return
    }
    // Recuadro: título en mayúsculas metido hacia adentro (puede ocupar varios renglones),
    // seguido de texto también metido hacia adentro.
    if (mayus && r.sangria >= 8 && r.r >= 0.6 && r.r < 1.6 && r.texto.length <= 80) {
      let j = i + 1
      const partes = [r.texto]
      while (flujo[j] && esMayusculas(flujo[j].texto) && flujo[j].sangria >= 8 && flujo[j].r < 1.6 && flujo[j].texto.length <= 80 && partes.length < 3) partes.push(flujo[j++].texto)
      const cuerpo = flujo[j]
      if (cuerpo && cuerpo.sangria >= 6 && !esMayusculas(cuerpo.texto)) {
        cerrar()
        for (let k = i + 1; k < j; k++) { consumidos.add(k); zonasRenglon.push(areaDe(flujo[k])) }
        actual = { tipo: 'recuadro', titulo: comoTitulo(partes.join(' ')), base: cuerpo.sangria, parrafos: [[]] }
        return
      }
    }
    // Títulos de sección y subtítulos (un título largo puede ocupar dos renglones). En versalitas,
    // un título puede ser apenas más alto que el texto: alcanza con que esté solo y al margen.
    // Una oración terminada en punto no es un título aunque el escaneo la haya leído grande («*Esta dote…»).
    const esOracion = /\.$/.test(r.texto) && r.texto.length > 25 && /\p{Ll}/u.test(r.texto)
    if ((r.r >= 1.22 && !esOracion) || tituloVersalitas) {
      cerrar()
      const tipo = r.r >= 1.6 ? 'titulo' : 'subtitulo'
      const previo = ultimoTitulo as { bloque: Extract<Bloque, { tipo: 'titulo' | 'subtitulo' }>; base: number; pagina: number; columna: number } | null
      if (previo && previo.bloque.tipo === tipo && previo.pagina === r.pagina && previo.columna === r.columna && r.base - previo.base < r.h * 1.8 && capitulo?.bloques[capitulo.bloques.length - 1] === previo.bloque) {
        previo.bloque.texto = `${previo.bloque.texto} ${comoTitulo(r.texto).toLocaleLowerCase('es')}`
        previo.base = r.base
        return
      }
      const bloque = { id: nuevoId(), tipo, texto: comoTitulo(r.texto) } as Extract<Bloque, { tipo: 'titulo' | 'subtitulo' }>
      agregar(bloque)
      ultimoTitulo = { bloque, base: r.base, pagina: r.pagina, columna: r.columna }
      return
    }
    const actualRecuadro: Actual | null = actual
    if (actualRecuadro?.tipo === 'recuadro') {
      const previoRecuadro = actualRecuadro.parrafos[actualRecuadro.parrafos.length - 1].at(-1) ?? ''
      const sigue = /^\p{Ll}/u.test(r.texto) && !/[.!?]$/.test(previoRecuadro) && r.r < 1.22
      if (r.sangria >= 6 || sigue) {
        const parrafos = actualRecuadro.parrafos
        // Dentro del recuadro, un renglón más adentro empieza otro párrafo.
        if (r.sangria >= actualRecuadro.base + 7 && parrafos[parrafos.length - 1].length) parrafos.push([])
        parrafos[parrafos.length - 1].push(r.texto)
        actualRecuadro.base = Math.min(actualRecuadro.base, r.sangria)
        return
      }
      cerrar()
    }
    // Pie de imagen: varios renglones seguidos en mayúsculas que no son títulos.
    if (mayus && r.r < 1.1 && siguiente && esMayusculas(siguiente.texto) && siguiente.r < 1.1) return
    if (mayus && r.r < 1.1 && anterior && esMayusculas(anterior.texto) && anterior.r < 1.1 && !(actual)) return

    const corriente: Actual | null = actual
    if (r.sangria >= 30) {
      // Renglones al lado de la letra capitular.
      if (corriente && (corriente.tipo === 'parrafo' || corriente.tipo === 'colgante')) corriente.renglones.push(r.texto)
      else actual = { tipo: 'parrafo', renglones: [r.texto] }
      return
    }
    if (r.sangria >= 8) {
      if (corriente?.tipo === 'colgante') { corriente.renglones.push(r.texto); return }
      cerrar()
      actual = { tipo: 'parrafo', renglones: [r.texto] }
      return
    }
    // Renglón al margen.
    const colgante = siguiente && siguiente.pagina === r.pagina && siguiente.columna === r.columna && siguiente.sangria >= 8 && siguiente.sangria < 30
    const empiezaColgante = LISTA.test(r.texto) ||
      (DIALOGO.test(r.texto) && esNombreDeDialogo(r.texto.match(DIALOGO)?.[1] ?? '')) ||
      (TERMINO.test(r.texto) && colgante)
    if (empiezaColgante) {
      cerrar()
      actual = { tipo: 'colgante', renglones: [r.texto] }
      return
    }
    if (corriente?.tipo === 'colgante') {
      cerrar()
      actual = { tipo: 'parrafo', renglones: [r.texto] }
      return
    }
    if (corriente?.tipo === 'parrafo') {
      const previo = corriente.renglones[corriente.renglones.length - 1] ?? ''
      // Un renglón anterior corto que cerraba una oración terminaba el párrafo.
      const termino = /[.!?:»"”]$/.test(previo) && anterior && (anterior.x1 - anterior.x0) < anchoColumna(anterior) * 0.8 && anterior.pagina === r.pagina && anterior.columna === r.columna
      if (termino) { cerrar(); actual = { tipo: 'parrafo', renglones: [r.texto] } }
      else corriente.renglones.push(r.texto)
      return
    }
    actual = { tipo: 'parrafo', renglones: [r.texto] }
  }
  flujo.forEach((r, i) => {
    if (consumidos.has(i)) return
    zonasRenglon = [areaDe(r)]
    renglonUsado = false
    procesar(r, i)
    if (renglonUsado) return
    // El renglón quedó en el bloque que se está armando, o continúa el último título.
    if (actual) zonasActual.push(...zonasRenglon)
    else if (r.r >= 1.22) { const ultimo = capitulo?.bloques[capitulo.bloques.length - 1]; if (ultimo) sumarZonas(ultimo.id, zonasRenglon) }
  })
  cerrar()

  // El texto entre títulos va en un solo bloque, con los términos en negrita adentro. Las zonas
  // de los bloques unidos pasan al bloque que queda.
  for (const c of capitulos) {
    const antes = c.bloques
    c.bloques = unirTexto(antes)
    const quedan = new Set(c.bloques.map(b => b.id))
    let destino = ''
    for (const b of antes) {
      if (quedan.has(b.id)) destino = b.id
      else if (destino && areas[b.id]) { sumarZonas(destino, areas[b.id]); delete areas[b.id] }
    }
  }
  const resumen = new Map<string, Correccion>()
  for (const c of todas) {
    const clave = `${c.de}→${c.a}`
    const previo = resumen.get(clave)
    if (previo) previo.veces += c.veces
    else resumen.set(clave, { ...c })
  }
  return { capitulos: capitulos.filter(c => c.bloques.length > 0 || c.titulo), correcciones: [...resumen.values()], paginas: paginas.length, fichas, areas, medidas }
}
