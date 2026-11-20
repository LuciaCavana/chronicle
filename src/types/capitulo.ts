/**
 * Capítulos del libro: texto corrido por bloques (como en el libro impreso) que además ubica
 * las fichas cargadas (clases, conjuros…). Se guardan en contenido.capitulos y se publican en
 * contenido_extra.capitulos; cada capítulo es un elemento con id, igual que una dote.
 *
 * En los textos se puede marcar **negrita** y _cursiva_; nunca se interpreta HTML.
 */
export type LineaLista = { termino: string; texto: string }
export type LineaDialogo = { nombre: string; texto: string }

export type Bloque =
  | { id: string; tipo: 'parrafo'; texto: string }
  | { id: string; tipo: 'titulo'; texto: string }
  | { id: string; tipo: 'subtitulo'; texto: string }
  | { id: string; tipo: 'termino'; termino: string; texto: string }
  | { id: string; tipo: 'lista'; items: LineaLista[] }
  | { id: string; tipo: 'recuadro'; titulo: string; texto: string }
  | { id: string; tipo: 'dialogo'; lineas: LineaDialogo[] }
  | { id: string; tipo: 'carta'; texto: string; firma: string }
  | { id: string; tipo: 'tabla'; titulo: string; columnas: string[]; filas: string[][] }
  /** Fichas de una categoría; ids vacío = todas las de la categoría. */
  | { id: string; tipo: 'fichas'; categoria: string; ids: string[] }

export type TipoBloque = Bloque['tipo']

export type Capitulo = {
  id: string
  /** "Capítulo 1", "Introducción", "Apéndice A"… */
  etiqueta: string
  titulo: string
  bloques: Bloque[]
}

export const TIPOS_BLOQUE: { tipo: TipoBloque; etiqueta: string }[] = [
  { tipo: 'parrafo', etiqueta: 'Párrafo' },
  { tipo: 'titulo', etiqueta: 'Título de sección' },
  { tipo: 'subtitulo', etiqueta: 'Subtítulo' },
  { tipo: 'termino', etiqueta: 'Término en negrita' },
  { tipo: 'lista', etiqueta: 'Lista numerada' },
  { tipo: 'recuadro', etiqueta: 'Recuadro' },
  { tipo: 'dialogo', etiqueta: 'Diálogo' },
  { tipo: 'carta', etiqueta: 'Carta con firma' },
  { tipo: 'tabla', etiqueta: 'Tabla' },
  { tipo: 'fichas', etiqueta: 'Fichas' },
]
export const etiquetaBloque = (tipo: TipoBloque) => TIPOS_BLOQUE.find(t => t.tipo === tipo)?.etiqueta ?? tipo

/** Categorías de fichas que se pueden ubicar en un capítulo (contenido.<id>). */
export const CATEGORIAS_FICHAS: { id: string; titulo: string }[] = [
  { id: 'especies', titulo: 'Especies' },
  { id: 'clases', titulo: 'Clases' },
  { id: 'subclases', titulo: 'Subclases' },
  { id: 'trasfondos', titulo: 'Trasfondos' },
  { id: 'dotes', titulo: 'Dotes' },
  { id: 'objetos', titulo: 'Objetos y equipo' },
  { id: 'conjuros', titulo: 'Conjuros' },
  { id: 'criaturas', titulo: 'Criaturas' },
  { id: 'caracteristicas', titulo: 'Características y reglas' },
]

export const nuevoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`)

export function nuevoBloque(tipo: TipoBloque): Bloque {
  const id = nuevoId()
  switch (tipo) {
    case 'termino': return { id, tipo, termino: '', texto: '' }
    case 'lista': return { id, tipo, items: [{ termino: '', texto: '' }] }
    case 'recuadro': return { id, tipo, titulo: '', texto: '' }
    case 'dialogo': return { id, tipo, lineas: [{ nombre: '', texto: '' }] }
    case 'carta': return { id, tipo, texto: '', firma: '' }
    case 'tabla': return { id, tipo, titulo: '', columnas: ['', ''], filas: [['', '']] }
    case 'fichas': return { id, tipo, categoria: 'clases', ids: [] }
    default: return { id, tipo, texto: '' }
  }
}

export const nuevoCapitulo = (etiqueta = '', titulo = ''): Capitulo => ({ id: nuevoId(), etiqueta, titulo, bloques: [] })

/** Texto plano de un bloque (para buscar, comparar y convertir de un tipo a otro). */
export function textoBloque(bloque: Bloque): string {
  switch (bloque.tipo) {
    case 'termino': return `${bloque.termino} ${bloque.texto}`.trim()
    case 'lista': return bloque.items.map((item, i) => `${i + 1}: ${item.termino} ${item.texto}`.trim()).join('\n')
    case 'recuadro': return [bloque.titulo, bloque.texto].filter(Boolean).join('\n')
    case 'dialogo': return bloque.lineas.map(l => `${l.nombre}: ${l.texto}`).join('\n')
    case 'carta': return [bloque.texto, bloque.firma && `—${bloque.firma}`].filter(Boolean).join('\n')
    case 'tabla': return [bloque.titulo, bloque.columnas.join(' | '), ...bloque.filas.map(f => f.join(' | '))].filter(Boolean).join('\n')
    case 'fichas': return `[Fichas: ${CATEGORIAS_FICHAS.find(c => c.id === bloque.categoria)?.titulo ?? bloque.categoria}${bloque.ids.length ? ` (${bloque.ids.length})` : ''}]`
    default: return bloque.texto
  }
}

/** Cambia el tipo de un bloque conservando el texto que se pueda. */
export function convertirBloque(bloque: Bloque, tipo: TipoBloque): Bloque {
  if (bloque.tipo === tipo) return bloque
  const texto = bloque.tipo === 'termino' ? bloque.texto : textoBloque(bloque)
  const id = bloque.id
  switch (tipo) {
    case 'termino': {
      if (bloque.tipo === 'termino') return bloque
      const m = texto.match(/^([^.:]{1,80}[.:])\s+([\s\S]*)$/)
      return { id, tipo, termino: m ? m[1] : '', texto: m ? m[2] : texto }
    }
    case 'lista': return { id, tipo, items: texto.split('\n').filter(Boolean).map(linea => ({ termino: '', texto: linea.replace(/^\d+[:.]\s*/, '') })) }
    case 'recuadro': return { id, tipo, titulo: '', texto }
    case 'dialogo': return { id, tipo, lineas: texto.split('\n').filter(Boolean).map(linea => {
      const m = linea.match(/^([^:]{1,60}):\s*(.*)$/)
      return m ? { nombre: m[1], texto: m[2] } : { nombre: '', texto: linea }
    }) }
    case 'carta': return { id, tipo, texto, firma: '' }
    case 'tabla': {
      const filas = texto.split('\n').filter(Boolean).map(linea => linea.split('|').map(c => c.trim()))
      return { id, tipo, titulo: '', columnas: filas[0] ?? [''], filas: filas.slice(1) }
    }
    case 'fichas': return { id, tipo, categoria: 'clases', ids: [] }
    default: return { id, tipo, texto: bloque.tipo === 'termino' ? `**${bloque.termino}** ${bloque.texto}`.trim() : texto }
  }
}

/** Valida y normaliza lo que viene de la base (puede venir incompleto o de una versión vieja). */
export function leerCapitulos(valor: unknown): Capitulo[] {
  if (!Array.isArray(valor)) return []
  return valor.filter((c): c is Record<string, unknown> => typeof c === 'object' && c !== null && !Array.isArray(c)).map(c => ({
    id: typeof c.id === 'string' && c.id ? c.id : nuevoId(),
    etiqueta: typeof c.etiqueta === 'string' ? c.etiqueta : '',
    titulo: typeof c.titulo === 'string' ? c.titulo : '',
    bloques: Array.isArray(c.bloques) ? c.bloques.filter((b): b is Bloque => typeof b === 'object' && b !== null && typeof (b as { tipo?: unknown }).tipo === 'string') : [],
  }))
}
