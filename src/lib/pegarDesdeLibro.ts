import { nuevoId, type Bloque, type LineaDialogo, type LineaLista } from '../types/capitulo'

/**
 * "Pegar desde el libro": corrige los errores típicos del texto escaneado (OCR) y propone
 * bloques (párrafo, título, término en negrita, lista, diálogo). El autor revisa el tipo de
 * cada bloque antes de insertarlo, porque el escaneo pierde negritas y versalitas.
 */

export type Correccion = { de: string; a: string; veces: number }

type Regla = { patron: RegExp; reemplazo: string | ((...m: string[]) => string); a: string }

const REGLAS: Regla[] = [
  // "Dungeons & Dragons" escaneado: DUNGEONS €: DRAGONS, DUNGEONS LG DRAGONS, DUNGEONS 8 DRAGONS…
  { patron: /\bDUNGEONS\s+(?!&\s)\S{1,3}\s+DRAGONS\b/g, reemplazo: 'DUNGEONS & DRAGONS', a: 'Dungeons & Dragons' },
  // "D&D" escaneado: D8D, D£D, DÉ-D, D€:D, Dé:D, D«D, D8-D, DárD, DE<D, D8LD, DD…
  { patron: /\bD(?:8L|EL|ár|á r|[8£€«ÉéÈ$&]|E(?=[-<:]))[-:<]?D\b|\bD-D\b|\bDD\b|\bDg\b/g, reemplazo: 'D&D', a: 'D&D' },
  // "D&D" leído como "DE" en medio de una oración en minúsculas: "En DE, la acción…".
  { patron: /(?<=[a-záéíóúñ,] )DE(?=[,.;:]| [a-záéíóúñ])/g, reemplazo: 'D&D', a: 'D&D' },
  // "y" leída como "J" al comienzo del renglón: "J tú estás leyendo".
  { patron: /(^|\n)J (?=[a-záéíóúñ])/g, reemplazo: (_m: string, inicio: string) => `${inicio}y `, a: 'y' },
  // "y" pegada a un nombre: "yDave".
  { patron: /(?<![\p{L}])y(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ])/gu, reemplazo: 'y ', a: 'y ' },
  // Comillas y espacios raros del escaneo.
  { patron: /[   ]/g, reemplazo: ' ', a: 'espacio' },
]

/** Corrige el texto y devuelve qué se cambió (para mostrarlo antes de insertar). */
export function limpiarTextoEscaneado(entrada: string): { texto: string; correcciones: Correccion[] } {
  const correcciones = new Map<string, Correccion>()
  const anotar = (de: string, a: string) => {
    if (de === a || a === 'espacio') return
    const clave = `${de}→${a}`
    const actual = correcciones.get(clave)
    if (actual) actual.veces++
    else correcciones.set(clave, { de, a, veces: 1 })
  }
  let texto = entrada.replace(/\r\n?/g, '\n')
  for (const regla of REGLAS) {
    texto = texto.replace(regla.patron, (...args: unknown[]) => {
      const coincidencia = String(args[0])
      const resultado = typeof regla.reemplazo === 'string' ? regla.reemplazo : regla.reemplazo(...(args as string[]))
      anotar(coincidencia.trim() || coincidencia, regla.a)
      return resultado
    })
  }
  // Palabras cortadas al final del renglón: "compleji-\ndad".
  texto = texto.replace(/(\p{Ll})-\n(\p{Ll})/gu, (_m, a: string, b: string) => {
    anotar('palabras cortadas', 'unidas')
    return a + b
  })
  return { texto, correcciones: [...correcciones.values()] }
}

export const esMayusculas = (linea: string) => {
  const letras = linea.replace(/[^\p{L}]/gu, '')
  return letras.length >= 3 && letras === letras.toLocaleUpperCase('es') && letras !== letras.toLocaleLowerCase('es')
}
/** "¿QUÉ NECESITAS?" → "¿Qué necesitas?" (los nombres propios se corrigen a mano). */
export const SIGLAS = /\b(dm|pnj|cd|pg|pj|d&d)\b/giu
export const comoOracion = (linea: string) => {
  const minus = linea.toLocaleLowerCase('es')
  return minus.replace(/\p{L}/u, letra => letra.toLocaleUpperCase('es'))
    .replace(SIGLAS, sigla => sigla.toUpperCase())
    .replace(/\bdungeon master\b/gi, 'Dungeon Master')
    .replace(/\bdungeons & dragons\b/gi, 'Dungeons & Dragons')
}
// "Término." al comienzo del párrafo (puede tener dos puntos adentro: "Capítulo 1: Cómo jugar.").
export const TERMINO = /^([¿¡]?[A-ZÁÉÍÓÚÑ][^.!?]{0,70}?\.)\s+([A-ZÁÉÍÓÚÑ¿¡"“(].*)$/
export const LISTA = /^(\d{1,2})\s*[:.)]\s+(.+)$/
/**
 * Quién habla en un diálogo: nombres propios ("Héctor", "Sara (como Mirabella)"), hasta tres
 * palabras con mayúscula. Así "Dirección de arte: …" de los créditos no se toma como diálogo.
 */
export function esNombreDeDialogo(nombre: string): boolean {
  const sinAclaracion = nombre.replace(/\([^)]*\)/g, '').trim()
  if (/^(cap[ií]tulo|ap[ée]ndice|parte|secci[óo]n|tabla)\b/i.test(sinAclaracion)) return false
  const palabras = sinAclaracion.split(/\s+/).filter(Boolean)
  return palabras.length >= 1 && palabras.length <= 3 && palabras.every(p => /^\p{Lu}/u.test(p))
}
export const DIALOGO = /^([A-ZÁÉÍÓÚÑ][\p{L} ]{0,30}(?:\s*\([^)]{1,40}\))?)\s*:\s+(.+)$/u

/** Letra capitular separada ("L A IMAGINACIÓN…") y versalitas del comienzo de un párrafo. */
export function normalizarComienzo(texto: string): string {
  return texto
    .replace(/^([A-ZÁÉÍÓÚÑ]) (?=[A-ZÁÉÍÓÚÑ]+[ ,])/, '$1')
    .replace(/^((?:[A-ZÁÉÍÓÚÑ&\d]+[ ,]+){2,})(?=[A-ZÁÉÍÓÚÑ]?[a-záéíóúñ])/, m => comoOracion(m))
}

/** Une renglones: quita el guion de las palabras cortadas al final de un renglón. */
export function unirRenglones(renglones: string[]): string {
  return renglones.reduce((acc, r) => {
    const linea = r.trim()
    if (!acc) return linea
    if (/\p{Ll}-$/u.test(acc) && /^\p{Ll}/u.test(linea)) return acc.slice(0, -1) + linea
    return `${acc} ${linea}`
  }, '').replace(/\s+/g, ' ').trim()
}

/** Une renglones en párrafos y propone el tipo de cada bloque. */
export function detectarBloques(texto: string): Bloque[] {
  const lineas = texto.split('\n').map(l => l.replace(/\s+/g, ' ').trim())
  const largos = lineas.filter(l => l.length > 20).map(l => l.length).sort((a, b) => a - b)
  const largoTipico = largos.length ? largos[Math.floor(largos.length * 0.75)] : 60
  const bloques: Bloque[] = []
  let parrafo: string[] = []
  let anterior = ''

  const cerrarParrafo = () => {
    if (!parrafo.length) return
    const t = normalizarComienzo(parrafo.join(' ').replace(/\s+/g, ' ').trim())
    parrafo = []
    const lista = t.match(LISTA)
    const dialogo = t.match(DIALOGO)
    const termino = t.match(TERMINO)
    const ultimo = bloques[bloques.length - 1]
    if (lista) {
      const [, , resto] = lista
      const tm = resto.match(TERMINO)
      const item: LineaLista = tm ? { termino: tm[1], texto: tm[2] } : { termino: '', texto: resto }
      if (ultimo?.tipo === 'lista') ultimo.items.push(item)
      else bloques.push({ id: nuevoId(), tipo: 'lista', items: [item] })
    } else if (dialogo && esNombreDeDialogo(dialogo[1])) {
      const linea: LineaDialogo = { nombre: dialogo[1].trim(), texto: dialogo[2] }
      if (ultimo?.tipo === 'dialogo') ultimo.lineas.push(linea)
      else bloques.push({ id: nuevoId(), tipo: 'dialogo', lineas: [linea] })
    } else if (termino && termino[1].split(' ').length <= 8) {
      bloques.push({ id: nuevoId(), tipo: 'termino', termino: termino[1], texto: termino[2] })
    } else {
      bloques.push({ id: nuevoId(), tipo: 'parrafo', texto: t })
    }
  }

  lineas.forEach((linea, i) => {
    if (!linea) { cerrarParrafo(); anterior = ''; return }
    // Si el renglón siguiente sigue en minúscula, las mayúsculas son las versalitas del comienzo
    // de un párrafo ("ESTA HISTORIA COMENZÓ… / de ella."), no un título.
    const siguiente = lineas.slice(i + 1).find(Boolean) ?? ''
    const sigueEnMinuscula = /^[a-záéíóúñ]/.test(siguiente)
    if (esMayusculas(linea) && linea.length <= 70 && !sigueEnMinuscula && !/^[A-ZÁÉÍÓÚÑ] [A-ZÁÉÍÓÚÑ]/.test(linea) && (!parrafo.length || /[.!?:»"”]$/.test(anterior))) {
      // Un título suelto en mayúsculas.
      cerrarParrafo()
      bloques.push({ id: nuevoId(), tipo: 'titulo', texto: comoOracion(linea).replace(/[,;]$/, '') })
      anterior = ''
      return
    }
    // Empieza otro párrafo si el renglón anterior terminó una oración y era corto (fin de párrafo),
    // o si este renglón arranca una lista, un diálogo o un término.
    const finAnterior = /[.!?:»"”]$/.test(anterior)
    const nuevo = parrafo.length > 0 && (
      (finAnterior && anterior.length < largoTipico * 0.85) ||
      LISTA.test(linea) || (finAnterior && (DIALOGO.test(linea) || TERMINO.test(linea)))
    )
    if (nuevo) cerrarParrafo()
    parrafo.push(linea)
    anterior = linea
  })
  cerrarParrafo()
  return unirTexto(bloques)
}

/**
 * Todo el texto entre un título y el siguiente va en un solo bloque, como en el libro:
 * los párrafos se separan con una línea en blanco y los términos van en **negrita** dentro.
 */
export function unirTexto(bloques: Bloque[]): Bloque[] {
  const resultado: Bloque[] = []
  for (const bloque of bloques) {
    const texto = bloque.tipo === 'parrafo' ? bloque.texto
      : bloque.tipo === 'termino' ? `**${bloque.termino.trim()}** ${bloque.texto}`.trim() : null
    const ultimo = resultado[resultado.length - 1]
    if (texto === null) resultado.push(bloque)
    else if (ultimo?.tipo === 'parrafo') ultimo.texto = `${ultimo.texto}\n\n${texto}`
    else resultado.push({ id: bloque.id, tipo: 'parrafo', texto })
  }
  return resultado
}

/** Para pegar un recuadro: el primer título es el del recuadro y el resto, su texto. */
export function comoRecuadro(bloques: Bloque[]): Bloque[] {
  if (!bloques.length) return bloques
  const [primero, ...resto] = bloques
  const titulo = primero.tipo === 'titulo' || primero.tipo === 'subtitulo' ? primero.texto : ''
  const cuerpo = (titulo ? resto : bloques).map(b => b.tipo === 'parrafo' ? b.texto
    : b.tipo === 'termino' ? `**${b.termino}** ${b.texto}` : textoPlano(b)).join('\n\n')
  return [{ id: nuevoId(), tipo: 'recuadro', titulo, texto: cuerpo }]
}
const textoPlano = (b: Bloque) => b.tipo === 'lista' ? b.items.map((it, i) => `${i + 1}: ${it.termino ? `**${it.termino}** ` : ''}${it.texto}`).join('\n\n')
  : b.tipo === 'dialogo' ? b.lineas.map(l => `**${l.nombre}:** ${l.texto}`).join('\n\n')
  : 'texto' in b ? String(b.texto) : ''
