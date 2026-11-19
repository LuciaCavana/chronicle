import type { CategoriaFicha, FichaDetectada } from './fichasLibro'

/**
 * Compara las fichas leídas del libro con las ya cargadas en el borrador:
 * - nueva: no existe una ficha con ese nombre en la categoría;
 * - completar: existe y el libro trae datos que la ficha tiene vacíos;
 * - diferencias: existe y algún dato cargado no coincide con el libro (no se cambia salvo que se elija);
 * - igual: no hay nada para agregar.
 */
export type Registro = Record<string, unknown>
export type Existentes = Partial<Record<CategoriaFicha, Registro[]>>
export type Campo = { ruta: string; etiqueta: string; actual: unknown; libro: unknown }
export type Propuesta = {
  ficha: FichaDetectada
  estado: 'nueva' | 'completar' | 'diferencias' | 'igual'
  existente?: Registro
  completar: Campo[]
  diferencias: Campo[]
}

/** Las categorías de elementos (clase, subclase, objeto) guardan sus datos en "datos". */
const CON_DATOS: CategoriaFicha[] = ['clases', 'subclases', 'objetos']
const TIPO_ELEMENTO: Partial<Record<CategoriaFicha, string>> = { clases: 'clase', subclases: 'subclase', objetos: 'objeto' }

export const claveNombre = (t: unknown) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '')
const textoPlano = (v: unknown) => typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&amp;|&lt;|&gt;/g, ' ').replace(/\s+/g, ' ').trim() : v

export function estaVacio(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return textoPlano(v) === ''
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.values(v as Registro).every(estaVacio)
  return false
}
const iguales = (a: unknown, b: unknown) => {
  const norm = (v: unknown): unknown => typeof v === 'string' ? claveNombre(textoPlano(v)) : Array.isArray(v) ? v.map(norm) : v
  const sinIds = (v: unknown) => JSON.stringify(v, (k, x) => (k === 'id' ? undefined : norm(x)))
  return sinIds(a) === sinIds(b)
}

const ETIQUETAS: Record<string, string> = {
  nivel: 'Nivel', escuela: 'Escuela', clases: 'Clases', tiempoLanzamiento: 'Tiempo de lanzamiento', ritual: 'Ritual', alcance: 'Alcance',
  componentes: 'Componentes', componenteMaterial: 'Componente material', duracion: 'Duración', concentracion: 'Concentración',
  descripcion: 'Descripción', categoria: 'Categoría', requisitos: 'Requisitos', beneficios: 'Beneficios', caracteristicas: 'Características',
  competenciasHabilidades: 'Habilidades', competenciasHerramientas: 'Herramientas', datosAdicionales: 'Dote y equipo (texto del libro)',
  tiposCriatura: 'Tipo de criatura', tamanos: 'Tamaño', velocidad: 'Velocidad', rasgos: 'Rasgos', visionOscuridad: 'Visión en la oscuridad',
  alcanceVision: 'Alcance de visión', tipo: 'Tipo', tamano: 'Tamaño', alineamiento: 'Alineamiento', ca: 'CA', iniciativa: 'Iniciativa',
  pg: 'PG', velocidades: 'Velocidad', habilidades: 'Habilidades', resistencias: 'Resistencias', vulnerabilidades: 'Vulnerabilidades',
  inmunidadesDano: 'Inmunidades', sentidos: 'Sentidos', idiomas: 'Idiomas', desafio: 'Desafío', experiencia: 'Experiencia',
  competencia: 'Bonificador por competencia', secciones: 'Rasgos y acciones', dadoGolpe: 'Dado de golpe', caracteristicasPrincipales: 'Característica principal',
  salvaciones: 'Salvaciones', armas: 'Armas', armaduras: 'Armaduras', herramientas: 'Herramientas', equipoInicial: 'Equipo inicial',
  precio: 'Precio', moneda: 'Moneda', peso: 'Peso', dadosDanio: 'Daño', tipoDanio: 'Tipo de daño', propiedadesTexto: 'Propiedades', maestria: 'Maestría',
}
const etiqueta = (ruta: string) => ETIQUETAS[ruta.replace(/^datos\./, '')] ?? ruta

/** Campos del libro como pares ruta → valor (los de "datos" van con prefijo). */
function campos(categoria: CategoriaFicha, datos: Registro): [string, unknown][] {
  const lista: [string, unknown][] = []
  for (const [k, v] of Object.entries(datos)) {
    if (k === 'nombre' || k === 'id') continue
    if (k === 'datos' && CON_DATOS.includes(categoria) && v && typeof v === 'object') {
      for (const [kd, vd] of Object.entries(v as Registro)) lista.push([`datos.${kd}`, vd])
    } else lista.push([k, v])
  }
  return lista.filter(([, v]) => !estaVacio(v))
}
const leer = (obj: Registro, ruta: string): unknown => ruta.startsWith('datos.') ? (obj.datos as Registro | undefined)?.[ruta.slice(6)] : obj[ruta]

/**
 * Dentro del mismo libro una ficha puede aparecer dos veces (p. ej. en una tabla y en su
 * descripción): se unen. Devuelve las únicas y a qué id quedó cada una de las repetidas.
 */
export function unificar(detectadas: FichaDetectada[]): { unicas: FichaDetectada[]; alias: Map<string, string> } {
  const porClave = new Map<string, FichaDetectada>()
  const alias = new Map<string, string>()
  for (const f of detectadas) {
    const k = `${f.categoria}:${claveNombre(f.nombre)}`
    const previa = porClave.get(k)
    if (previa) {
      previa.datos = { ...f.datos, ...previa.datos }
      alias.set(f.id, previa.id)
    } else { porClave.set(k, f); alias.set(f.id, f.id) }
  }
  return { unicas: [...porClave.values()], alias }
}

export function conciliar(unicas: FichaDetectada[], existentes: Existentes): Propuesta[] {
  return unicas.map(ficha => {
    const existente = (existentes[ficha.categoria] ?? []).find(e => claveNombre(e.nombre) === claveNombre(ficha.nombre))
    if (!existente) return { ficha, estado: 'nueva', completar: [], diferencias: [] }
    const completar: Campo[] = []
    const diferencias: Campo[] = []
    for (const [ruta, libro] of campos(ficha.categoria, ficha.datos)) {
      const actual = leer(existente, ruta)
      if (estaVacio(actual)) completar.push({ ruta, etiqueta: etiqueta(ruta), actual, libro })
      else if (!iguales(actual, libro)) diferencias.push({ ruta, etiqueta: etiqueta(ruta), actual, libro })
    }
    const estado = completar.length ? 'completar' : diferencias.length ? 'diferencias' : 'igual'
    return { ficha, estado, existente, completar, diferencias }
  })
}

// ---------- Fichas nuevas con todos sus campos (lo que no se leyó queda vacío) ----------
const BASE: Record<CategoriaFicha, () => Registro> = {
  conjuros: () => ({ tipo: 'conjuro', nivel: 0, escuela: '', tiempoLanzamiento: '', alcance: '', componentes: '', componenteMaterial: '', duracion: '', concentracion: false, ritual: false, clases: [], descripcion: '' }),
  dotes: () => ({ descripcion: '', categoria: 'general', requisitos: [], beneficios: [] }),
  trasfondos: () => ({ descripcion: '', caracteristicas: [], aumentoCaracteristicas: { habilitado: true, distribuciones: ['2_1', '1_1_1'] }, doteOrigenId: null, competenciasHabilidades: [], competenciasHerramientas: [], opcionesEquipo: [] }),
  especies: () => ({ descripcion: '', tamanos: [], tiposCriatura: [], velocidad: '', visionOscuridad: false, alcanceVision: '', pagina: '', rasgos: [], linajes: [], transformaciones: [] }),
  criaturas: () => ({
    tamano: '', tipo: '', alineamiento: '', invocacion: false, variantes: [], ca: { valor: '' }, iniciativa: { valor: '' }, pg: { valor: '' }, velocidades: [],
    caracteristicas: { fuerza: { puntuacion: 10 }, destreza: { puntuacion: 10 }, constitucion: { puntuacion: 10 }, inteligencia: { puntuacion: 10 }, sabiduria: { puntuacion: 10 }, carisma: { puntuacion: 10 } },
    habilidades: [], resistencias: '', inmunidadesDano: '', inmunidadesEstados: '', vulnerabilidades: '', sentidos: '', idiomas: '', desafio: '', experiencia: '', competencia: '', habitat: '', tesoro: '',
    secciones: { rasgos: [], acciones: [], acciones_adicionales: [], reacciones: [], acciones_legendarias: [], acciones_guarida: [], efectos_regionales: [] },
  }),
  clases: () => ({ descripcion: '', datos: {} }),
  subclases: () => ({ descripcion: '', datos: {} }),
  objetos: () => ({ descripcion: '', datos: {} }),
}

/**
 * Arma la ficha final: nueva con sus datos, o la existente con lo vacío completado y, de las
 * diferencias, solo las elegidas.
 */
export function fichaFinal(p: Propuesta, tomarDelLibro: Set<string>): Registro {
  const { ficha } = p
  if (!p.existente) {
    const base = BASE[ficha.categoria]()
    const datos = ficha.datos
    const final: Registro = { ...base, ...datos, id: ficha.id, nombre: ficha.nombre }
    if (TIPO_ELEMENTO[ficha.categoria]) {
      final.tipo = TIPO_ELEMENTO[ficha.categoria]
      final.datos = { ...(base.datos as Registro), ...((datos.datos as Registro | undefined) ?? {}) }
    }
    if (ficha.categoria === 'criaturas') {
      final.secciones = { ...(base.secciones as Registro), ...((datos.secciones as Registro | undefined) ?? {}) }
    }
    return final
  }
  const final: Registro = { ...p.existente, ...(p.existente.datos ? { datos: { ...(p.existente.datos as Registro) } } : {}) }
  for (const c of [...p.completar, ...p.diferencias.filter(d => tomarDelLibro.has(d.ruta))]) {
    if (c.ruta.startsWith('datos.')) (final.datos as Registro)[c.ruta.slice(6)] = c.libro
    else final[c.ruta] = c.libro
  }
  return final
}

/** Ids nuevos para lo que se crea; las existentes conservan el suyo. */
export const idFinal = (p: Propuesta) => (p.existente ? String(p.existente.id) : p.ficha.id)
