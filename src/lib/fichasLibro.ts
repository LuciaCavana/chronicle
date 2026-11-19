import { nuevoId } from '../types/capitulo'
import { TERMINO, unirRenglones, comoOracion } from './pegarDesdeLibro'

/**
 * Fichas que aparecen dentro del texto del libro (conjuros, dotes, trasfondos, especies,
 * clases, subclases, criaturas y objetos). Cada lector toma el formato con que el libro las
 * imprime y llena lo que puede; lo que el escaneo no permite leer queda vacío para completar
 * a mano. Nunca se interpreta HTML del PDF: las descripciones se arman escapando el texto.
 */
export type CategoriaFicha = 'conjuros' | 'dotes' | 'trasfondos' | 'especies' | 'criaturas' | 'clases' | 'subclases' | 'objetos'
export const TITULO_CATEGORIA: Record<CategoriaFicha, string> = {
  conjuros: 'Conjuros', dotes: 'Dotes', trasfondos: 'Trasfondos', especies: 'Especies', criaturas: 'Criaturas',
  clases: 'Clases', subclases: 'Subclases', objetos: 'Objetos y equipo',
}
export type FichaDetectada = {
  id: string
  categoria: CategoriaFicha
  nombre: string
  /** Campos leídos del libro (solo los encontrados). */
  datos: Record<string, unknown>
  /** Para una subclase: nombre de su clase. */
  clase?: string
}
export type RenglonFicha = { texto: string; sangria: number }

const CARACTERISTICAS = ['Fuerza', 'Destreza', 'Constitución', 'Inteligencia', 'Sabiduría', 'Carisma']
const sinTildes = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const caracteristicasEn = (t: string) => CARACTERISTICAS.filter(c => sinTildes(t).includes(sinTildes(c)))
const separarLista = (t: string) => t.replace(/\.$/, '').split(/\s*,\s*|\s+y\s+|\s+o\s+/).map(x => x.trim()).filter(Boolean)
const capitalizar = (t: string) => t ? t.charAt(0).toLocaleUpperCase('es') + t.slice(1) : t
const escapar = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Párrafos a HTML simple (el formato de las descripciones del editor), con **negrita**. */
export const aHtml = (parrafos: string[]) => parrafos.map(p => p.trim()).filter(Boolean)
  .map(p => `<p>${escapar(p).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</p>`).join('')

/** Agrupa renglones en párrafos: un renglón con sangría empieza otro párrafo. */
export function parrafosDe(renglones: RenglonFicha[]): string[] {
  const parrafos: string[][] = []
  // Un párrafo que empieza con "Término." lleva sangría francesa: sus renglones siguientes van hacia adentro.
  let colgante = false
  for (const r of renglones) {
    const conSangria = r.sangria >= 8 && r.sangria < 30
    const empiezaTermino = r.sangria < 8 && TERMINO.test(r.texto)
    if (!parrafos.length || empiezaTermino || (conSangria && !colgante)) {
      parrafos.push([])
      colgante = empiezaTermino
    } else if (!conSangria && colgante && r.sangria < 8) {
      // Volvió al margen después de un término: otro párrafo.
      parrafos.push([])
      colgante = false
    }
    parrafos[parrafos.length - 1].push(r.texto)
  }
  return parrafos.map(p => unirRenglones(p))
}
/** "Término. texto" al comienzo de un párrafo. */
const conTermino = (p: string) => {
  const m = p.match(TERMINO)
  return m ? { nombre: m[1].replace(/[.:]$/, '').trim(), texto: m[2] } : null
}

/** Lee campos "Etiqueta: valor" de renglones; el resto (después del último campo) es el texto. */
function camposYTexto(renglones: RenglonFicha[], etiquetas: RegExp[]): { campos: Map<number, string>; resto: RenglonFicha[] } {
  const campos = new Map<number, string>()
  let actual = -1
  let i = 0
  for (; i < renglones.length; i++) {
    const r = renglones[i]
    const indice = etiquetas.findIndex(e => e.test(r.texto))
    if (indice >= 0) {
      actual = indice
      campos.set(indice, r.texto.replace(etiquetas[indice], '').trim())
      continue
    }
    // Un campo puede seguir en el renglón de abajo (sin sangría y sin otra etiqueta).
    if (actual >= 0 && campos.size < etiquetas.length && r.sangria < 8 && !/[.)]$/.test(campos.get(actual) ?? '.')) {
      campos.set(actual, `${campos.get(actual)} ${r.texto}`.trim())
      continue
    }
    if (campos.size) break
  }
  return { campos, resto: renglones.slice(i) }
}

// ---------------------------------------------------------------------------------------------
// Conjuro: "Bola de fuego" / "Evocación de nivel 3 (hechicero, mago)" / Tiempo de lanzamiento…
// ---------------------------------------------------------------------------------------------
export const INICIO_CONJURO = /^(truco de \p{L}+|\p{L}+ de nivel \d+)\b/iu
export function leerConjuro(nombre: string, renglones: RenglonFicha[]): Record<string, unknown> {
  const datos: Record<string, unknown> = { nombre }
  const linea = renglones[0]?.texto ?? ''
  const truco = linea.match(/^truco de (\p{L}+)\s*(?:\((.+?)\))?/iu)
  const nivel = linea.match(/^(\p{L}+) de nivel (\d+)\s*(?:\((.+?)\))?/iu)
  if (truco) Object.assign(datos, { nivel: 0, tipo: 'truco', escuela: capitalizar(truco[1]), clases: separarLista(truco[2] ?? '').map(capitalizar) })
  else if (nivel) Object.assign(datos, { nivel: Number(nivel[2]), tipo: 'conjuro', escuela: capitalizar(nivel[1]), clases: separarLista(nivel[3] ?? '').map(capitalizar) })
  const { campos, resto } = camposYTexto(renglones.slice(1), [/^tiempo de lanzamiento\s*:\s*/i, /^alcance\s*:\s*/i, /^componentes\s*:\s*/i, /^duraci[óo]n\s*:\s*/i])
  const tiempo = campos.get(0)
  if (tiempo) {
    datos.ritual = /ritual/i.test(tiempo)
    datos.tiempoLanzamiento = capitalizar(tiempo.replace(/\s*o\s+ritual/i, '').trim())
  }
  if (campos.get(1)) datos.alcance = campos.get(1)
  const componentes = campos.get(2)
  if (componentes) {
    const m = componentes.match(/^([VSM,\s]+?)\s*(?:\((.+)\))?$/)
    datos.componentes = (m?.[1] ?? componentes).trim().replace(/,$/, '')
    if (m?.[2]) datos.componenteMaterial = m[2].trim()
  }
  const duracion = campos.get(3)
  if (duracion) {
    datos.concentracion = /concentraci[óo]n/i.test(duracion)
    datos.duracion = capitalizar(duracion.replace(/^concentraci[óo]n,\s*/i, '').trim())
  }
  const parrafos = parrafosDe(resto).map(p => {
    const t = conTermino(p)
    return t && /niveles superiores|mejora de truco/i.test(t.nombre) ? `**${t.nombre}.** ${t.texto}` : p
  })
  if (parrafos.length) datos.descripcion = aHtml(parrafos)
  return datos
}

// ---------------------------------------------------------------------------------------------
// Dote: "Alerta" / "Dote de origen" o "Dote general (prerrequisito: nivel 4+…)" / beneficios
// ---------------------------------------------------------------------------------------------
export const INICIO_DOTE = /^dote (de origen|general|de estilo de combate|de don [ée]pico)\b/i
export function leerDote(nombre: string, renglones: RenglonFicha[]): Record<string, unknown> {
  const datos: Record<string, unknown> = { nombre }
  const m = (renglones[0]?.texto ?? '').match(/^dote (de origen|general|de estilo de combate|de don [ée]pico)\s*(?:\((.+)\))?/i)
  if (m) {
    const tipo = sinTildes(m[1])
    datos.categoria = tipo.includes('origen') ? 'origen' : tipo.includes('estilo') ? 'estilo_combate' : tipo.includes('epico') ? 'epica' : 'general'
    if (m[2]) datos.requisitos = m[2].replace(/^prerrequisitos?\s*:\s*/i, '').split(/\s*,\s*(?=[A-ZÁÉÍÓÚÑa-z])/).map(x => x.trim()).filter(Boolean)
  }
  const parrafos = parrafosDe(renglones.slice(1))
  const beneficios: string[] = []
  const descripcion: string[] = []
  for (const p of parrafos) {
    const t = conTermino(p)
    if (t) beneficios.push(`${t.nombre}. ${t.texto}`)
    else if (!beneficios.length) descripcion.push(p)
    else beneficios[beneficios.length - 1] += ` ${p}`
  }
  if (descripcion.length) datos.descripcion = aHtml(descripcion)
  if (beneficios.length) datos.beneficios = beneficios
  return datos
}

// ---------------------------------------------------------------------------------------------
// Trasfondo: Puntuaciones de característica / Dote / Competencias / Equipo / descripción
// ---------------------------------------------------------------------------------------------
export const CAMPO_TRASFONDO = /^puntuaciones de caracter[ií]stica\s*:/i
export function leerTrasfondo(nombre: string, renglones: RenglonFicha[]): Record<string, unknown> {
  const datos: Record<string, unknown> = { nombre }
  const { campos, resto } = camposYTexto(renglones, [
    /^puntuaciones de caracter[ií]stica\s*:\s*/i, /^dote\s*:\s*/i, /^competencias? en habilidades\s*:\s*/i,
    /^competencias? con herramientas\s*:\s*/i, /^equipo\s*:\s*/i,
  ])
  if (campos.get(0)) datos.caracteristicas = caracteristicasEn(campos.get(0) ?? '')
  const extra: Record<string, unknown> = {}
  if (campos.get(1)) extra.dote = campos.get(1)!.replace(/\s*\(ver[^)]*\)\s*$/i, '').trim()
  if (campos.get(2)) datos.competenciasHabilidades = separarLista(campos.get(2) ?? '')
  if (campos.get(3)) datos.competenciasHerramientas = [campos.get(3)!.replace(/\.$/, '').trim()]
  if (campos.get(4)) extra.equipo = campos.get(4)
  if (Object.keys(extra).length) datos.datosAdicionales = extra
  const parrafos = parrafosDe(resto)
  if (parrafos.length) datos.descripcion = aHtml(parrafos)
  return datos
}

// ---------------------------------------------------------------------------------------------
// Criatura: "Caballo de monta" / "Bestia Grande, sin alineamiento" / CA, PG… / Acciones
// ---------------------------------------------------------------------------------------------
const TAMANOS = 'diminut[oa]|peque[ñn][oa]|median[oa]|grande|enorme|gargantuesc[oa]'
export const INICIO_CRIATURA = new RegExp(`^([\\p{L} ]{3,40}?)\\s+(${TAMANOS})(?:\\s+o\\s+(?:${TAMANOS}))?\\s*,\\s*(.+)$`, 'iu')
const SECCION_CRIATURA: [RegExp, string][] = [
  [/^rasgos$/i, 'rasgos'], [/^acciones$/i, 'acciones'], [/^acciones adicionales$/i, 'acciones_adicionales'],
  [/^reacciones$/i, 'reacciones'], [/^acciones legendarias$/i, 'acciones_legendarias'],
]
export function leerCriatura(nombre: string, renglones: RenglonFicha[]): Record<string, unknown> {
  const datos: Record<string, unknown> = { nombre }
  const m = (renglones[0]?.texto ?? '').match(INICIO_CRIATURA)
  if (m) Object.assign(datos, { tipo: capitalizar(m[1].trim()), tamano: capitalizar(m[2].toLowerCase()), alineamiento: m[3].trim() })
  const inicioSecciones = renglones.findIndex(r => SECCION_CRIATURA.some(([e]) => e.test(r.texto.trim())))
  const cabecera = unirRenglones(renglones.slice(1, inicioSecciones < 0 ? undefined : inicioSecciones).map(r => r.texto))
  const valor = (etiqueta: string, hasta: string) => cabecera.match(new RegExp(`\\b${etiqueta}\\s+(.+?)(?=\\s+(?:${hasta})\\b|$)`, 'i'))?.[1]?.trim()
  const corte = 'CA|Iniciativa|PG|Velocidad|FUE|DES|CON|INT|SAB|CAR|Habilidades|Salvaciones|Resistencias|Inmunidades|Vulnerabilidades|Sentidos|Idiomas|VD|Equipo'
  const ca = valor('CA', corte); if (ca) datos.ca = { valor: ca }
  const ini = valor('Iniciativa', corte); if (ini) datos.iniciativa = { valor: ini }
  const pg = valor('PG', corte); if (pg) datos.pg = { valor: pg }
  const vel = valor('Velocidad', corte); if (vel) datos.velocidades = [{ id: nuevoId(), tipo: 'caminando', valor: vel }]
  const claves: [string, string][] = [['FUE', 'fuerza'], ['DES', 'destreza'], ['CON', 'constitucion'], ['INT', 'inteligencia'], ['SAB', 'sabiduria'], ['CAR', 'carisma']]
  const caracteristicas: Record<string, { puntuacion: number; salvacion?: string }> = {}
  for (const [abrev, campo] of claves) {
    const c = cabecera.match(new RegExp(`\\b${abrev}\\s+(\\d{1,2})(?:\\s+([+−-]\\d+))?(?:\\s+([+−-]\\d+))?`))
    if (c) caracteristicas[campo] = { puntuacion: Number(c[1]), ...(c[3] ? { salvacion: c[3].replace('−', '-') } : {}) }
  }
  if (Object.keys(caracteristicas).length === 6) datos.caracteristicas = caracteristicas
  const texto = (etiqueta: string, campo: string) => { const v = valor(etiqueta, corte); if (v) datos[campo] = v }
  texto('Resistencias', 'resistencias'); texto('Vulnerabilidades', 'vulnerabilidades'); texto('Sentidos', 'sentidos'); texto('Idiomas', 'idiomas')
  const inm = valor('Inmunidades', corte); if (inm) datos.inmunidadesDano = inm
  const hab = valor('Habilidades', corte); if (hab) datos.habilidades = separarLista(hab).map(h => {
    const x = h.match(/^(.+?)\s*([+−-]\d+)$/)
    return { id: nuevoId(), nombre: x ? x[1] : h, bonificador: x ? x[2].replace('−', '-') : '' }
  })
  const vd = cabecera.match(/\bVD\s+([\d/]+)\s*\(\s*PX\s*([\d.,]+)(?:\s*[;,]\s*BC\s*\+?(\d+))?/i)
  if (vd) { datos.desafio = vd[1]; datos.experiencia = vd[2]; if (vd[3]) datos.competencia = `+${vd[3]}` }
  // Rasgos, acciones, reacciones: "Nombre. texto".
  if (inicioSecciones >= 0) {
    const secciones: Record<string, { id: string; nombre: string; descripcion: string }[]> = {}
    let seccion = 'rasgos'
    let grupo: RenglonFicha[] = []
    const volcar = () => {
      for (const p of parrafosDe(grupo)) {
        const t = conTermino(p)
        const lista = secciones[seccion] ??= []
        if (t) lista.push({ id: nuevoId(), nombre: t.nombre, descripcion: t.texto })
        else if (lista.length) lista[lista.length - 1].descripcion += ` ${p}`
      }
      grupo = []
    }
    for (const r of renglones.slice(inicioSecciones)) {
      const s = SECCION_CRIATURA.find(([e]) => e.test(r.texto.trim()))
      if (s) { volcar(); seccion = s[1]; continue }
      // En los bloques de estadísticas cada entrada empieza con su nombre en negrita.
      grupo.push(conTermino(r.texto) ? { ...r, sangria: 10 } : r)
    }
    volcar()
    if (Object.keys(secciones).length) datos.secciones = secciones
  }
  return datos
}

// ---------------------------------------------------------------------------------------------
// Especie (texto ya armado del capítulo): descripción, "Rasgos de X", tipo, tamaño, velocidad
// ---------------------------------------------------------------------------------------------
export function leerEspecie(nombre: string, antes: string[], despues: string[]): Record<string, unknown> {
  const datos: Record<string, unknown> = { nombre }
  if (antes.length) datos.descripcion = aHtml(antes)
  const texto = despues.join('\n\n').replace(/\*\*/g, '')
  const tipo = texto.match(/tipo de criatura\s*:\s*(.+?)(?=\s+tama[ñn]o\s*:|\n|$)/i)
  if (tipo) datos.tiposCriatura = [capitalizar(tipo[1].replace(/\.$/, '').trim())]
  const tam = texto.match(/tama[ñn]o\s*:\s*(.+?)(?=\s+velocidad\s*:|\n|$)/i)
  if (tam) {
    const nombres = ['Pequeño', 'Mediano', 'Grande'].filter(n => sinTildes(tam[1]).includes(sinTildes(n)))
    if (nombres.length) datos.tamanos = nombres.map(n => ({ id: n, nombre: n, alturaMinima: null, alturaMaxima: null }))
  }
  const vel = texto.match(/velocidad\s*:\s*([\d,]+\s*(?:m|metros|pies))/i)
  if (vel) datos.velocidad = vel[1]
  const rasgos: { id: string; nombre: string; descripcion: string }[] = []
  for (const p of despues) {
    const t = conTermino(p.replace(/^\*\*([^*]+)\*\*/, '$1'))
    if (t && !/^(tipo de criatura|tama[ñn]o|velocidad)/i.test(t.nombre)) rasgos.push({ id: nuevoId(), nombre: t.nombre, descripcion: t.texto })
    else if (rasgos.length && !/tipo de criatura|velocidad\s*:/i.test(p)) rasgos[rasgos.length - 1].descripcion += ` ${p.replace(/\*\*/g, '')}`
  }
  if (rasgos.length) {
    datos.rasgos = rasgos
    const vision = rasgos.find(r => /visi[óo]n en la oscuridad/i.test(r.nombre))
    if (vision) { datos.visionOscuridad = true; datos.alcanceVision = vision.descripcion.match(/(\d+(?:,\d+)?)\s*m\b/)?.[0] ?? '' }
  }
  return datos
}

// ---------------------------------------------------------------------------------------------
// Clase y subclase (texto ya armado): rasgos básicos y rasgos "Nivel N: Nombre"
// ---------------------------------------------------------------------------------------------
const ETIQUETAS_CLASE: [RegExp, string][] = [
  [/caracter[ií]sticas? principal(?:es)?/i, 'principal'], [/dado de golpe/i, 'dado'],
  [/competencias? en (?:las )?tiradas de salvaci[óo]n/i, 'salvaciones'], [/competencias? en habilidades/i, 'habilidades'],
  [/competencias? con armas/i, 'armas'], [/competencias? con herramientas/i, 'herramientas'],
  [/formaci[óo]n con armaduras?|competencias? con armaduras?/i, 'armaduras'], [/equipo inicial/i, 'equipo'],
]
export const NIVEL_RASGO = /^nivel (\d{1,2})\s*:\s*(.+)$/i
export type Rasgo = { id: string; nivel: number; nombre: string; descripcion: string }

/** Rasgos "Nivel N: Nombre" a partir de títulos y párrafos (el nombre puede venir en mayúsculas dentro del texto). */
export function rasgosPorNivel(partes: { titulo?: string; texto?: string }[]): { rasgos: Rasgo[]; sueltos: string[] } {
  const rasgos: Rasgo[] = []
  const sueltos: string[] = []
  for (const parte of partes) {
    if (parte.titulo) {
      const m = parte.titulo.match(NIVEL_RASGO)
      if (m) { rasgos.push({ id: nuevoId(), nivel: Number(m[1]), nombre: capitalizar(m[2].trim()), descripcion: '' }); continue }
    }
    const texto = parte.texto ?? parte.titulo ?? ''
    // "NIVEL 1: FURIA Puedes imbuirte…" dentro de un párrafo.
    const trozos = texto.split(/(?=\bNIVEL \d{1,2}\s*:\s*[A-ZÁÉÍÓÚÑ])/)
    for (const trozo of trozos) {
      const m = trozo.match(/^NIVEL (\d{1,2})\s*:\s*([A-ZÁÉÍÓÚÑ0-9 ,'’()-]+?)\s+(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ]|$)([\s\S]*)$/)
      if (m) { rasgos.push({ id: nuevoId(), nivel: Number(m[1]), nombre: comoOracion(m[2].trim()), descripcion: m[3].trim() }); continue }
      if (rasgos.length) rasgos[rasgos.length - 1].descripcion = `${rasgos[rasgos.length - 1].descripcion}\n\n${trozo}`.trim()
      else if (trozo.trim()) sueltos.push(trozo.trim())
    }
  }
  for (const r of rasgos) r.descripcion = aHtml(r.descripcion.split(/\n\s*\n/))
  return { rasgos, sueltos }
}

export function leerClase(nombre: string, partes: { titulo?: string; texto?: string }[]): Record<string, unknown> {
  const datos: Record<string, unknown> = {}
  // Intro hasta "Rasgos básicos"; después la tabla de rasgos básicos.
  const iBasicos = partes.findIndex(p => /rasgos b[áa]sicos/i.test(p.titulo ?? p.texto ?? ''))
  const intro = (iBasicos < 0 ? [] : partes.slice(0, iBasicos)).map(p => p.texto).filter((t): t is string => !!t)
  const { rasgos } = rasgosPorNivel(iBasicos < 0 ? partes : partes.slice(iBasicos))
  const tabla = (iBasicos < 0 ? '' : partes.slice(iBasicos, iBasicos + 3).map(p => p.texto ?? p.titulo ?? '').join(' ')).replace(/\*\*/g, '').replace(/^rasgos b[áa]sicos de \p{L}+/iu, '')
  // Cortes por cada etiqueta de la tabla de rasgos básicos.
  const marcas = ETIQUETAS_CLASE.map(([e, campo]) => ({ campo, i: tabla.search(e), largo: (tabla.match(e)?.[0] ?? '').length })).filter(m => m.i >= 0).sort((a, b) => a.i - b.i)
  const valores: Record<string, string> = {}
  marcas.forEach((m, k) => { valores[m.campo] = tabla.slice(m.i + m.largo, marcas[k + 1]?.i ?? undefined).replace(/^[\s:]+/, '').trim() })
  if (valores.principal) datos.caracteristicasPrincipales = caracteristicasEn(valores.principal)
  const dado = valores.dado?.match(/d\s?(\d{1,2})/i)
  if (dado) datos.dadoGolpe = Number(dado[1])
  if (valores.salvaciones) datos.salvaciones = caracteristicasEn(valores.salvaciones)
  if (valores.habilidades) datos.habilidades = valores.habilidades
  if (valores.armas) datos.armas = valores.armas
  if (valores.herramientas) datos.herramientas = valores.herramientas
  if (valores.armaduras) datos.armaduras = valores.armaduras
  if (valores.equipo) datos.equipoInicial = valores.equipo.split(/\s+(?=[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ (?:de|del) )/)[0]
  if (rasgos.length) datos.rasgos = rasgos
  return { nombre, ...(intro.length ? { descripcion: aHtml(intro) } : {}), datos }
}

export function leerSubclase(nombre: string, partes: { titulo?: string; texto?: string }[]): Record<string, unknown> {
  const { rasgos, sueltos } = rasgosPorNivel(partes)
  return { nombre, ...(sueltos.length ? { descripcion: aHtml(sueltos) } : {}), datos: rasgos.length ? { rasgos } : {} }
}

// ---------------------------------------------------------------------------------------------
// Objetos: equipo "Nombre (25 po). texto" y filas de la tabla de armas
// ---------------------------------------------------------------------------------------------
const MONEDA = '(po|pp|pc|pe|pl)'
export const OBJETO_CON_PRECIO = new RegExp(`^(.{2,60}?)\\s*\\(([\\d.]+(?:,\\d+)?)\\s*${MONEDA}\\)\\s*\\.?$`, 'i')
const FILA_ARMA = new RegExp(
  `([A-ZÁÉÍÓÚÑ][\\p{L} ,']{1,40}?)\\s+(\\d+d\\d+|1)\\s+(perforante|cortante|contundente)\\s+(.*?)\\s*` +
  `(Debilitar|Derribar|Empujar|Hender|Mellar|Molestar|Ralentizar|Rozar|Socavar)\\s+([\\d,]+\\s*kg|—|-)\\s+([\\d.]+)\\s*${MONEDA}`, 'giu')

export function objetoDeTermino(termino: string, texto: string): Record<string, unknown> | null {
  const m = termino.replace(/\.$/, '').match(OBJETO_CON_PRECIO)
  if (!m) return null
  return { nombre: m[1].trim(), descripcion: aHtml([texto]), datos: { tipo: 'equipo', precio: Number(m[2].replace(/\./g, '').replace(',', '.')), moneda: m[3].toLowerCase() } }
}

/** Filas de la tabla de armas dentro de un texto; devuelve las armas y el texto que sobra. */
export function armasEnTexto(texto: string): { armas: Record<string, unknown>[]; resto: string } {
  const armas: Record<string, unknown>[] = []
  const resto = texto.replace(FILA_ARMA, (_m, nombre: string, dado: string, tipoDanio: string, propiedades: string, maestria: string, peso: string, precio: string, moneda: string) => {
    const kg = Number(peso.replace(',', '.').replace(/[^\d.]/g, ''))
    armas.push({ nombre: nombre.trim(), descripcion: '', datos: {
      tipo: 'arma', dadosDanio: dado, tipoDanio: tipoDanio.toLowerCase(), propiedadesTexto: propiedades.trim().replace(/^—$/, ''),
      maestria, ...(kg ? { peso: Math.round(kg * 2 * 100) / 100 } : {}), precio: Number(precio), moneda: moneda.toLowerCase(),
    } })
    return ' '
  })
  return { armas, resto: resto.replace(/\s+/g, ' ').trim() }
}
