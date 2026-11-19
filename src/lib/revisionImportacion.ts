import type { Area } from './analizarPdf'
import { campos, etiqueta, type Registro } from './conciliarFichas'
import { aHtml, type CategoriaFicha, type FichaDetectada } from './fichasLibro'
import type { Bloque } from '../types/capitulo'

/**
 * Qué se hace con cada fragmento reconocido como ficha:
 * - ficha: se crea o se completa la ficha y el capítulo la muestra en su lugar;
 * - texto: no se carga; el texto original queda en el capítulo, tal como estaba;
 * - quitar: no se carga ni queda en el capítulo (solo por decisión explícita).
 */
export type Decision = 'ficha' | 'texto' | 'quitar'
export type Ajuste = { categoria: CategoriaFicha; nombre: string }
export type Eleccion = {
  decision: Record<string, Decision>
  /** Por ficha, las diferencias en las que se usa el dato del libro. */
  delLibro: Record<string, Set<string>>
  /** Correcciones de categoría y nombre. */
  ajustes: Record<string, Ajuste>
  /** Por ficha, campos corregidos a mano (ruta → valor). */
  ediciones: Record<string, Record<string, unknown>>
}
export const eleccionVacia = (): Eleccion => ({ decision: {}, delLibro: {}, ajustes: {}, ediciones: {} })

/*
 * Funciones de la pantalla «Revisar importación» que no dependen de React: qué campos de una
 * ficha se pueden corregir a mano, cómo se pasan a texto y de vuelta, en qué renglones de la
 * página está cada campo y qué bloques de un capítulo conviene mirar.
 */

/** Un campo de una ficha tal como se muestra en la revisión. */
export type CampoRevision = {
  ruta: string
  etiqueta: string
  valor: unknown
  /** Se puede corregir escribiendo (texto, número o lista de textos). */
  editable: boolean
  /** Cómo se escribe: un renglón, varios párrafos, o una lista (separada por comas o renglones). */
  forma: 'linea' | 'parrafos' | 'lista-comas' | 'lista-renglones' | 'otro'
}

const esObjeto = (v: unknown): v is Registro => !!v && typeof v === 'object' && !Array.isArray(v)
const esHtml = (t: string) => /<\/?(p|br|ul|li|strong|em)\b/i.test(t)
const sinHtml = (t: string) => t.replace(/<\/p>\s*<p>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()

function formaDe(v: unknown): CampoRevision['forma'] {
  if (typeof v === 'number') return 'linea'
  if (typeof v === 'string') return esHtml(v) || v.length > 70 || v.includes('\n') ? 'parrafos' : 'linea'
  if (Array.isArray(v) && v.every(x => typeof x === 'string')) {
    return v.some(x => (x as string).length > 50 || (x as string).includes(',')) ? 'lista-renglones' : 'lista-comas'
  }
  return 'otro'
}

/**
 * Campos de la ficha para revisar. Los objetos simples (p. ej. «datosAdicionales» de un
 * trasfondo, con la dote y el equipo) se abren en un campo por cada dato.
 */
export function camposDeRevision(categoria: CategoriaFicha, datos: Registro): CampoRevision[] {
  const lista: CampoRevision[] = []
  for (const [ruta, valor] of campos(categoria, datos)) {
    if (esObjeto(valor) && Object.values(valor).every(x => formaDe(x) !== 'otro')) {
      for (const [k, v] of Object.entries(valor)) {
        if (v === undefined || v === null || v === '') continue
        lista.push({ ruta: `${ruta}.${k}`, etiqueta: etiqueta(k), valor: v, editable: true, forma: formaDe(v) })
      }
      continue
    }
    const forma = formaDe(valor)
    lista.push({ ruta, etiqueta: etiqueta(ruta), valor, editable: forma !== 'otro', forma })
  }
  return lista
}

/** Valor de un campo como texto para escribir encima. */
export function textoDeCampo(campo: Pick<CampoRevision, 'valor' | 'forma'>): string {
  const v = campo.valor
  switch (campo.forma) {
    case 'lista-comas': return (v as string[]).join(', ')
    case 'lista-renglones': return (v as string[]).join('\n')
    case 'parrafos': return sinHtml(String(v ?? ''))
    case 'linea': return typeof v === 'string' ? sinHtml(v) : String(v ?? '')
    default: return mostrarValor(v)
  }
}

/** Lo escrito, de vuelta al tipo del campo original. */
export function valorDeTexto(campo: Pick<CampoRevision, 'valor' | 'forma'>, texto: string): unknown {
  const original = campo.valor
  switch (campo.forma) {
    case 'lista-comas': return texto.split(',').map(x => x.trim()).filter(Boolean)
    case 'lista-renglones': return texto.split('\n').map(x => x.trim()).filter(Boolean)
    case 'parrafos': return typeof original === 'string' && esHtml(original) ? aHtml(texto.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)) : texto.trim()
    case 'linea':
      if (typeof original === 'number') { const n = Number(texto.replace(',', '.')); return Number.isFinite(n) ? n : original }
      return typeof original === 'string' && esHtml(original) ? aHtml([texto.trim()]) : texto.trim()
    default: return original
  }
}

/** Pone un valor en una ruta con puntos («datosAdicionales.equipo»), sin tocar el original. */
export function conCampo(datos: Registro, ruta: string, valor: unknown): Registro {
  const [primera, ...resto] = ruta.split('.')
  if (!resto.length) return { ...datos, [primera]: valor }
  const interno = esObjeto(datos[primera]) ? datos[primera] as Registro : {}
  return { ...datos, [primera]: conCampo(interno, resto.join('.'), valor) }
}

/** Valor de una ruta con puntos. */
export function leerCampo(datos: Registro, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((o, k) => (esObjeto(o) ? o[k] : undefined), datos)
}

/** Un valor cualquiera de una ficha, corto y legible (para lo que no se escribe a mano). */
export function mostrarValor(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'string') return sinHtml(v).replace(/\s+/g, ' ')
  if (Array.isArray(v)) return v.map(x => (esObjeto(x) ? String(x.nombre ?? x.valor ?? x.titulo ?? '…') : String(x))).join(', ')
  if (esObjeto(v)) return Object.entries(v).map(([k, x]) => `${k}: ${mostrarValor(esObjeto(x) && 'puntuacion' in x ? x.puntuacion : x)}`).join(' · ')
  return String(v)
}


/**
 * Renglones de la página de donde salió un campo. Los renglones de la ficha se agrupan por
 * etiqueta («Equipo: …» y los renglones que lo siguen en su columna) y se elige el grupo cuyas
 * palabras más coinciden con el valor. Solo para fichas leídas renglón por renglón.
 */
export function zonasDeCampo(ficha: FichaDetectada, valor: unknown): Area[] {
  const palabras = (t: string) => new Set(mostrarValor(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(w => w.length >= 3))
  const buscadas = palabras(mostrarValor(valor))
  if (!buscadas.size || !ficha.renglones?.length) return []
  type Grupo = { etiqueta: boolean; zona?: string; texto: string; areas: Area[] }
  const grupos: Grupo[] = []
  for (const r of ficha.renglones) {
    const conEtiqueta = /^[^:]{1,45}:\s/.test(r.texto)
    const ultimo = grupos[grupos.length - 1]
    if (!conEtiqueta && ultimo && ultimo.zona === r.zona) { ultimo.texto += ` ${r.texto}`; if (r.area) ultimo.areas.push(r.area); continue }
    grupos.push({ etiqueta: conEtiqueta, zona: r.zona, texto: conEtiqueta ? r.texto.replace(/^[^:]{1,45}:\s*/, '') : r.texto, areas: r.area ? [r.area] : [] })
  }
  const puntaje = (g: Grupo) => {
    const propias = palabras(g.texto)
    let comunes = 0
    for (const w of buscadas) if (propias.has(w)) comunes++
    return comunes / buscadas.size
  }
  const puntuados = grupos.map(g => ({ g, p: puntaje(g) })).filter(x => x.p >= 0.5)
  if (!puntuados.length) return []
  // Un campo con etiqueta sale de un solo grupo; un texto largo (descripción) puede ocupar varios.
  const mejor = puntuados.reduce((m, x) => (x.p > m.p ? x : m))
  const elegidos = mejor.g.etiqueta ? [mejor] : puntuados.filter(x => !x.g.etiqueta)
  return elegidos.flatMap(x => x.g.areas)
}

/** Junta renglones seguidos de la misma columna en un solo recuadro (para no dibujar uno por renglón). */
export function agruparZonas(zonas: Area[]): Area[] {
  const ordenadas = [...zonas].sort((a, b) => a.pagina - b.pagina || a.x0 - b.x0 || a.y0 - b.y0)
  const grupos: Area[] = []
  for (const z of ordenadas) {
    const alto = z.y1 - z.y0
    const g = grupos.find(x => x.pagina === z.pagina && z.x0 < x.x1 && z.x1 > x.x0 && z.y0 - x.y1 < alto * 1.6 && x.y0 - z.y1 < alto * 1.6)
    if (g) { g.x0 = Math.min(g.x0, z.x0); g.x1 = Math.max(g.x1, z.x1); g.y0 = Math.min(g.y0, z.y0); g.y1 = Math.max(g.y1, z.y1) }
    else grupos.push({ ...z })
  }
  // Una segunda pasada une los grupos que quedaron pegados al crecer.
  for (let i = 0; i < grupos.length; i++) {
    for (let j = i + 1; j < grupos.length; j++) {
      const a = grupos[i], b = grupos[j]
      if (a.pagina === b.pagina && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0) {
        a.x0 = Math.min(a.x0, b.x0); a.x1 = Math.max(a.x1, b.x1); a.y0 = Math.min(a.y0, b.y0); a.y1 = Math.max(a.y1, b.y1)
        grupos.splice(j, 1); j = i
      }
    }
  }
  return grupos
}

/** Cosas de un bloque que conviene mirar (el motor pudo haberse equivocado de tipo). */
export function dudasDeBloque(b: Bloque): string[] {
  const dudas: string[] = []
  if (b.tipo === 'titulo' || b.tipo === 'subtitulo') {
    if (/\.$/.test(b.texto.trim()) && b.texto.length > 25) dudas.push('Termina en punto: parece una oración, no un título')
    else if (b.texto.length > 90) dudas.push('Es muy largo para ser un título')
    if (/^\p{Ll}/u.test(b.texto.trim())) dudas.push('Empieza en minúscula: puede ser la continuación de un párrafo')
  }
  if (b.tipo === 'parrafo') {
    const t = b.texto.trim()
    if (t.length < 40 && !/\n/.test(t) && t === t.toLocaleUpperCase('es') && /\p{L}{3}/u.test(t)) dudas.push('Corto y en mayúsculas: ¿es un título?')
  }
  if (b.tipo === 'tabla') {
    const celdas = b.filas.flat()
    const vacias = celdas.filter(c => !c.trim()).length
    if (celdas.length && vacias / celdas.length > 0.4) dudas.push('Muchas celdas vacías: revisá las columnas')
    if (b.columnas.length < 2) dudas.push('Tiene una sola columna')
  }
  return dudas
}

/** Nombre para mostrar en la lista: las que no tienen nombre dicen de qué son. */
export function nombreVisible(ficha: FichaDetectada, ajuste?: string): string {
  const escrito = ajuste?.trim()
  if (escrito) return escrito
  if (/^Sin nombre \(/.test(ficha.nombre)) return `${UNA[ficha.categoria]} sin nombre`
  return ficha.nombre
}
/** Nombre de la categoría en singular. */
export const UNA: Record<CategoriaFicha, string> = {
  conjuros: 'Conjuro', dotes: 'Dote', trasfondos: 'Trasfondo', especies: 'Especie', criaturas: 'Criatura',
  clases: 'Clase', subclases: 'Subclase', objetos: 'Objeto',
}

const letrasDe = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '')

/**
 * Reparte los renglones de un bloque entre las partes en que se dividió (lo de antes, el título,
 * lo de después…), en orden: cada renglón va a la parte cuyo texto lo contiene. Así cada parte
 * se marca en su lugar de la página.
 */
export function repartirZonas(zonas: Area[], textos: string[]): Area[][] {
  const partes = textos.map(t => letrasDe(t.replace(/\*\*|_/g, '')))
  const salida: Area[][] = textos.map(() => [])
  let k = 0
  for (const z of zonas) {
    const propio = letrasDe(z.texto ?? '')
    const trozo = propio.slice(0, 14)
    // Avanza a la parte que contiene este renglón (sin volver atrás).
    let destino = k
    if (trozo.length >= 3 && !partes[k]?.includes(trozo)) {
      const siguiente = partes.findIndex((p, i) => i > k && p.includes(trozo))
      if (siguiente >= 0) destino = siguiente
    }
    k = destino
    salida[k].push(z)
  }
  // Una parte sin renglón propio (un título pegado que comparte renglón con el texto que sigue)
  // se marca en el renglón donde está: el primero de la parte siguiente o el último de la anterior.
  salida.forEach((zs, n) => {
    if (zs.length) return
    const siguiente = salida.slice(n + 1).find(x => x.length)?.[0]
    const anterior = salida.slice(0, n).reverse().find(x => x.length)?.at(-1)
    const empieza = (z?: Area) => !!z && letrasDe(z.texto ?? '').startsWith(partes[n].slice(0, 8))
    const elegido = empieza(siguiente) ? siguiente : empieza(anterior) ? anterior : siguiente ?? anterior
    if (elegido) zs.push(elegido)
  })
  return salida
}

/**
 * Una sección del índice buscada en el texto: en qué bloque está. Prefiere donde aparece al
 * comienzo de un párrafo o de una oración (donde estaría un título pegado) a una mención suelta.
 */
export function buscarEnBloques(bloques: Bloque[], texto: string): { indice: number; alComienzo: boolean } | null {
  const buscado = letrasDe(texto)
  if (buscado.length < 4) return null
  let mencion: number | null = null
  for (let i = 0; i < bloques.length; i++) {
    const b = bloques[i]
    if (b.tipo === 'fichas') continue
    const propio = 'texto' in b ? b.texto : b.tipo === 'termino' ? `${b.termino} ${b.texto}` : ''
    if (!letrasDe(propio).includes(buscado)) continue
    const comienzos = propio.split(/\n\s*\n|(?<=[.!?:])\s+/)
    if (b.tipo === 'parrafo' && comienzos.some(t => letrasDe(t).startsWith(buscado))) return { indice: i, alComienzo: true }
    mencion ??= i
  }
  return mencion === null ? null : { indice: mencion, alComienzo: false }
}

/**
 * Dónde empieza y termina un título dentro del texto de un párrafo: al comienzo del texto, de un
 * párrafo o de una oración. Compara sin tildes ni mayúsculas. null si no está en un comienzo.
 */
export function posicionTitulo(texto: string, titulo: string): [number, number] | null {
  const buscado = letrasDe(titulo)
  if (!buscado) return null
  const comienzos = [0]
  for (const m of texto.matchAll(/\n\s*\n|[.!?:]\s+/g)) comienzos.push((m.index ?? 0) + m[0].length)
  for (const inicio of comienzos) {
    if (!letrasDe(texto.slice(inicio, inicio + titulo.length + 12)).startsWith(buscado)) continue
    // Avanza hasta cubrir todas las letras del título.
    let fin = inicio
    while (fin < texto.length && letrasDe(texto.slice(inicio, fin)).length < buscado.length) fin++
    return [inicio, fin]
  }
  return null
}
