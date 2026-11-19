import { nuevoId, type Bloque, type Capitulo, type LineaDialogo, type LineaLista } from '../types/capitulo'
import {
  comoOracion, DIALOGO, esMayusculas, limpiarTextoEscaneado, LISTA, normalizarComienzo, TERMINO, unirRenglones, unirTexto,
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
export type PaginaPdf = { numero: number; ancho: number; alto: number; fragmentos: Fragmento[] }

type Renglon = { x0: number; x1: number; base: number; h: number; texto: string; pagina: number; columna: 0 | 1 | 2; sangria: number; r: number }

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

/** Junta los fragmentos de una página en renglones (los escaneos suelen traer palabras sueltas). */
function armarRenglones(p: PaginaPdf): Omit<Renglon, 'columna' | 'sangria' | 'r'>[] {
  const mitad = p.ancho / 2
  const frs = p.fragmentos.filter(f => f.texto.trim() && f.h > 0).sort((a, b) => a.base - b.base || a.x0 - b.x0)
  const renglones: { x0: number; x1: number; base: number; hs: number[]; partes: Fragmento[] }[] = []
  for (const f of frs) {
    const destino = renglones.find(r => {
      const h = Math.min(mediana(r.hs), f.h)
      // Nunca se une a través del espacio entre columnas.
      const cruza = (r.x1 <= mitad) !== (f.x0 <= mitad) && f.x0 - r.x1 > h * 0.6
      return !cruza && Math.abs(r.base - f.base) < h * 0.5 && f.x0 - r.x1 < h * 2 && f.x0 > r.x0 - h
    })
    if (destino) {
      destino.partes.push(f); destino.hs.push(f.h)
      destino.x1 = Math.max(destino.x1, f.x1); destino.x0 = Math.min(destino.x0, f.x0)
    } else renglones.push({ x0: f.x0, x1: f.x1, base: f.base, hs: [f.h], partes: [f] })
  }
  return renglones.map(r => {
    const partes = r.partes.sort((a, b) => a.x0 - b.x0)
    let texto = ''
    let fin = -Infinity
    for (const parte of partes) {
      // Una letra suelta encimada sobre otra palabra es ruido del escaneo (p. ej. la capitular).
      if (parte.x0 < fin - parte.h * 0.3 && letras(parte.texto) <= 1) continue
      texto += (texto && parte.x0 - fin > parte.h * 0.12 && !texto.endsWith(' ') ? ' ' : '') + parte.texto
      fin = parte.x1
    }
    return { x0: r.x0, x1: r.x1, base: r.base, h: mediana(r.hs), texto: texto.replace(/\s+/g, ' ').trim(), pagina: p.numero }
  })
}

/** Basura del escaneo: marcas de adornos y renglones sin palabras ("pa ma", "a Cc >"). */
function esBasura(t: string): boolean {
  const n = letras(t)
  if (n < 3) return true
  if (n / t.length < 0.5) return true
  const palabras = t.split(' ').filter(p => letras(p) > 0)
  return t.length < 9 && palabras.every(p => letras(p) <= 2)
}

const ETIQUETA = /^(cap[ií]tulo|ap[ée]ndice|introducci[óo]n|pr[óo]logo|prefacio)\b/i
const comoTitulo = (t: string) => comoOracion(t.replace(/[,;.]+$/, '').trim())

export type ResultadoPdf = { capitulos: Capitulo[]; correcciones: Correccion[]; paginas: number }

export function analizarPaginas(paginas: PaginaPdf[]): ResultadoPdf {
  // Las páginas con casi nada de texto son ilustraciones (solo tienen el pie de imagen).
  // Corrige los errores del escaneo renglón por renglón (antes de reconocer versalitas y términos).
  const todas: Correccion[] = []
  const limpiar = (t: string) => {
    const { texto, correcciones } = limpiarTextoEscaneado(t)
    todas.push(...correcciones)
    return texto
  }
  const porPagina = paginas.filter(p => p.fragmentos.length >= 40).map(p => ({ p, renglones: armarRenglones(p) }))
  const todos = porPagina.flatMap(x => x.renglones)
  // Tamaño de la letra del texto corrido: el de los renglones largos.
  const hCuerpo = mediana(todos.filter(r => r.texto.length >= 25).map(r => r.h)) || 10

  // Bordes izquierdos de cada columna, separados por páginas pares e impares (márgenes espejados).
  const bordes: Record<string, number[]> = {}
  const preparados = porPagina.map(({ p, renglones }) => {
    const mitad = p.ancho / 2
    // Encabezados grandes partidos entre columnas ("CAPÍTULO" … "1,"): se unen.
    const grandes = renglones.filter(r => r.h >= hCuerpo * 1.5 && letras(r.texto) >= 2).sort((a, b) => a.base - b.base || a.x0 - b.x0)
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
      unidos.push({ ...g, x0: Math.min(...mismos.map(o => o.x0)), x1: Math.max(...mismos.map(o => o.x1)), texto: mismos.sort((a, b) => a.x0 - b.x0).map(o => o.texto).join(' ') })
    }
    const lista = [...renglones.filter(r => !usados.has(r)), ...unidos]
      // Pie de página ("8 CAPÍTULO 1 | CÓMO JUGAR") y basura.
      .filter(r => !(r.base > p.alto * 0.955 && r.h < hCuerpo * 1.3) && !esBasura(r.texto))
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
    col === 2 ? 0 : mediana(bordes[`${pagina % 2}-${col}`] ?? []) || (col === 0 ? ancho * 0.08 : ancho * 0.52)

  // Orden de lectura: lo ancho de arriba, la columna izquierda, la derecha y lo ancho de abajo.
  const flujo: Renglon[] = preparados.flatMap(({ p, renglones }) => {
    const enColumna = renglones.filter(r => r.columna !== 2)
    const primero = Math.min(...enColumna.map(r => r.base), Infinity)
    const anchos = renglones.filter(r => r.columna === 2).sort((a, b) => a.base - b.base)
    const orden = [
      ...anchos.filter(r => r.base <= primero),
      ...enColumna.filter(r => r.columna === 0).sort((a, b) => a.base - b.base),
      ...enColumna.filter(r => r.columna === 1).sort((a, b) => a.base - b.base),
      ...anchos.filter(r => r.base > primero),
    ]
    return orden.map(r => ({ ...r, texto: limpiar(r.texto.replace(/^[+|•·»«]\s+/, '')), sangria: r.x0 - borde(p.numero, r.columna, p.ancho), r: r.h / hCuerpo }))
  })

  // ---------- Clasificación ----------
  const capitulos: Capitulo[] = []
  let capitulo: Capitulo | null = null
  let etiquetaPendiente = ''
  type Actual =
    | { tipo: 'parrafo'; renglones: string[] }
    | { tipo: 'colgante'; renglones: string[] }
    | { tipo: 'recuadro'; titulo: string; base: number; parrafos: string[][] }
  let actual: Actual | null = null
  let ultimoTitulo: { bloque: Extract<Bloque, { tipo: 'titulo' | 'subtitulo' }>; base: number; pagina: number; columna: number } | null = null

  const asegurarCapitulo = () => {
    if (!capitulo) { capitulo = { id: nuevoId(), etiqueta: '', titulo: 'Antes del primer capítulo', bloques: [] }; capitulos.push(capitulo) }
    return capitulo
  }
  const agregar = (b: Bloque) => asegurarCapitulo().bloques.push(b)
  const cerrar = () => {
    if (!actual) return
    const a: Actual = actual
    actual = null
    if (a.tipo === 'recuadro') {
      const texto = a.parrafos.map(p => normalizarComienzo(unirRenglones(p))).filter(Boolean).join('\n\n')
      if (texto || a.titulo) agregar({ id: nuevoId(), tipo: 'recuadro', titulo: a.titulo, texto })
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
        if (ultimo?.tipo === 'lista') ultimo.items.push(item)
        else agregar({ id: nuevoId(), tipo: 'lista', items: [item] })
        return
      }
      const nombreValido = !!dialogo && (dialogo[1].includes('(') || dialogo[1].trim().split(' ').length <= 3)
      if (dialogo && nombreValido) {
        const linea: LineaDialogo = { nombre: dialogo[1].trim(), texto: dialogo[2] }
        if (ultimo?.tipo === 'dialogo') ultimo.lineas.push(linea)
        else agregar({ id: nuevoId(), tipo: 'dialogo', lineas: [linea] })
        return
      }
      if (termino) { agregar({ id: nuevoId(), tipo: 'termino', termino: termino[1], texto: termino[2] }); return }
    }
    agregar({ id: nuevoId(), tipo: 'parrafo', texto })
  }
  const anchoColumna = (r: Renglon) => {
    const p = paginas.find(x => x.numero === r.pagina)
    return p ? (r.columna === 2 ? p.ancho * 0.84 : p.ancho * 0.42) : 400
  }

  const consumidos = new Set<number>()
  flujo.forEach((r, i) => {
    const siguiente = flujo[i + 1]
    const anterior = flujo[i - 1]
    const mayus = esMayusculas(r.texto)

    // Título del capítulo (letra muy grande).
    if (r.r >= 2.6) {
      cerrar(); ultimoTitulo = null
      const ultimoCap: Capitulo | null = capitulo
      if (ultimoCap && ultimoCap.bloques.length === 0 && anterior && anterior.r >= 2.6 && anterior.pagina === r.pagina) {
        ultimoCap.titulo = `${ultimoCap.titulo} ${comoTitulo(r.texto).toLocaleLowerCase('es')}`
        return
      }
      const nuevo: Capitulo = { id: nuevoId(), etiqueta: etiquetaPendiente, titulo: comoTitulo(r.texto), bloques: [] }
      capitulo = nuevo
      capitulos.push(nuevo)
      etiquetaPendiente = ''
      return
    }
    // "Capítulo 1", "Introducción", "Apéndice A": etiqueta del próximo capítulo.
    const sinSignos = r.texto.replace(/^[^\p{L}]+/u, '')
    if (r.r >= 1.5 && ETIQUETA.test(sinSignos) && sinSignos.length < 40) {
      cerrar()
      etiquetaPendiente = comoTitulo(sinSignos).replace(/^(\p{L}+)\s+(\p{L}{1,3}|\d+)$/u, (_m, a: string, b: string) => `${a} ${/^\d+$/.test(b) ? b : b.toUpperCase()}`)
      return
    }
    if (consumidos.has(i)) return
    // Recuadro: título en mayúsculas metido hacia adentro (puede ocupar varios renglones),
    // seguido de texto también metido hacia adentro.
    if (mayus && r.sangria >= 8 && r.r >= 0.6 && r.r < 1.6 && r.texto.length <= 80) {
      let j = i + 1
      const partes = [r.texto]
      while (flujo[j] && esMayusculas(flujo[j].texto) && flujo[j].sangria >= 8 && flujo[j].r < 1.6 && flujo[j].texto.length <= 80 && partes.length < 3) partes.push(flujo[j++].texto)
      const cuerpo = flujo[j]
      if (cuerpo && cuerpo.sangria >= 6 && !esMayusculas(cuerpo.texto)) {
        cerrar()
        for (let k = i + 1; k < j; k++) consumidos.add(k)
        actual = { tipo: 'recuadro', titulo: comoTitulo(partes.join(' ')), base: cuerpo.sangria, parrafos: [[]] }
        return
      }
    }
    // Títulos de sección y subtítulos (un título largo puede ocupar dos renglones).
    if (r.r >= 1.22) {
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
      if (corriente && corriente.tipo !== 'recuadro') corriente.renglones.push(r.texto)
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
      (DIALOGO.test(r.texto) && (() => { const n = r.texto.match(DIALOGO)?.[1] ?? ''; return n.includes('(') || n.trim().split(' ').length <= 3 })()) ||
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
  })
  cerrar()

  // El texto entre títulos va en un solo bloque, con los términos en negrita adentro.
  for (const c of capitulos) c.bloques = unirTexto(c.bloques)
  const resumen = new Map<string, Correccion>()
  for (const c of todas) {
    const clave = `${c.de}→${c.a}`
    const previo = resumen.get(clave)
    if (previo) previo.veces += c.veces
    else resumen.set(clave, { ...c })
  }
  return { capitulos: capitulos.filter(c => c.bloques.length > 0 || c.titulo), correcciones: [...resumen.values()], paginas: paginas.length }
}
