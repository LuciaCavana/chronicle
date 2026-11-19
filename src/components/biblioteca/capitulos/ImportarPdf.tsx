import { useEffect, useMemo, useRef, useState } from 'react'
import { FileUp, ListTree } from 'lucide-react'
import { analizarPaginas } from '../../../lib/analizarPdf'
import { abrirPdf, type PdfAbierto } from '../../../lib/importarPdf'
import { ajustarConIndice, analizarIndice, paginasDeCapitulos, type IndiceLibro } from '../../../lib/indicePdf'
import { unirTexto, type Correccion } from '../../../lib/pegarDesdeLibro'
import { nuevoId, type Bloque, type Capitulo } from '../../../types/capitulo'
import { extraerFichasDeBloques } from '../../../lib/fichasEnCapitulos'
import { copiarBloques, dudasDe, releerFicha, type CategoriaFicha, type FichaDetectada } from '../../../lib/fichasLibro'
import { claveNombre, conciliar, fichaFinal, idFinal, unificar, type Existentes, type Registro } from '../../../lib/conciliarFichas'
import { conCampo, eleccionVacia, type Decision, type Eleccion } from '../../../lib/revisionImportacion'
import type { Area } from '../../../lib/analizarPdf'
import RevisarImportacion from './RevisarImportacion'

/** Una ficha que se crea o se completa al importar. */
export type CambioFicha = { categoria: CategoriaFicha; ficha: Registro; nueva: boolean }
type Props = {
  /** Fichas ya cargadas en el libro, para completar en vez de duplicar. */
  existentes: Existentes
  onAgregar: (capitulos: Capitulo[], fichas: CambioFicha[]) => void
  onCancelar: () => void
}
type Resultado = { capitulos: Capitulo[]; correcciones: Correccion[]; paginas: number; faltan: Record<string, string[]>; fichas: FichaDetectada[]; areas: Record<string, Area[]> }

/** Páginas del comienzo donde se busca el índice. */
const PAGINAS_INDICE = 30

/**
 * Importar desde PDF: lee el libro escaneado en este navegador. Si encuentra el índice, se
 * importa por capítulos (cada uno con sus páginas y su nombre); si no, por rango de páginas.
 */
export default function ImportarPdf({ existentes, onAgregar, onCancelar }: Props) {
  const [pdf, setPdf] = useState<PdfAbierto | null>(null)
  const [nombre, setNombre] = useState('')
  const [indice, setIndice] = useState<IndiceLibro | null>(null)
  const [modo, setModo] = useState<'indice' | 'paginas'>('indice')
  const [elegidosIndice, setElegidosIndice] = useState<Set<string>>(new Set())
  const [desde, setDesde] = useState(1)
  const [hasta, setHasta] = useState(1)
  const [estado, setEstado] = useState<'inicio' | 'abriendo' | 'leyendo' | 'listo'>('inicio')
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0, texto: '' })
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  // Fichas únicas, a qué ficha quedó cada repetida y el texto original de cada aparición.
  const [detectadas, setDetectadas] = useState<FichaDetectada[]>([])
  const [alias, setAlias] = useState<Map<string, string>>(new Map())
  const [originales, setOriginales] = useState<Map<string, FichaDetectada['original']>>(new Map())
  const [eleccion, setEleccion] = useState<Eleccion>(eleccionVacia)
  // Pantalla de revisión (a pantalla completa) abierta.
  const [revisando, setRevisando] = useState(false)
  const cancelado = useRef(false)

  useEffect(() => () => { cancelado.current = true; void pdf?.cerrar() }, [pdf])

  async function elegirArchivo(archivo: File | undefined) {
    if (!archivo) return
    setError(''); setResultado(null); setIndice(null); setEstado('abriendo'); setNombre(archivo.name); setProgreso({ hechas: 0, total: 0, texto: '' })
    try {
      if (archivo.type && archivo.type !== 'application/pdf') throw new Error('El archivo tiene que ser un PDF.')
      await pdf?.cerrar()
      const abierto = await abrirPdf(archivo)
      setPdf(abierto); setDesde(1); setHasta(abierto.total)
      // Busca el índice en las primeras páginas.
      setProgreso({ hechas: 0, total: Math.min(PAGINAS_INDICE, abierto.total), texto: 'Buscando el índice' })
      const primeras = await abierto.leer(1, Math.min(PAGINAS_INDICE, abierto.total), (hechas, total) => setProgreso({ hechas, total, texto: 'Buscando el índice' }))
      const encontrado = analizarIndice(primeras)
      setIndice(encontrado)
      setModo(encontrado ? 'indice' : 'paginas')
      setElegidosIndice(new Set(encontrado?.capitulos.map(c => c.id) ?? []))
      setEstado('inicio')
    } catch (e) {
      setPdf(null); setEstado('inicio')
      setError(e instanceof Error && e.message ? e.message : 'No se pudo abrir el PDF.')
    }
  }

  async function importarPorIndice() {
    if (!pdf || !indice) return
    setError(''); setEstado('leyendo'); cancelado.current = false
    const rangos = paginasDeCapitulos(indice, pdf.total).filter(r => elegidosIndice.has(r.capitulo.id))
    const total = rangos.reduce((n, r) => n + r.hasta - r.desde + 1, 0)
    let hechas = 0
    const capitulos: Capitulo[] = []
    const correcciones: Correccion[] = []
    const faltan: Record<string, string[]> = {}
    const fichas: FichaDetectada[] = []
    const areas: Record<string, Area[]> = {}
    try {
      for (const r of rangos) {
        const nombreCap = [r.capitulo.etiqueta, r.capitulo.titulo].filter(Boolean).join(': ')
        const paginas = await pdf.leer(r.desde, r.hasta, n => setProgreso({ hechas: hechas + n, total, texto: nombreCap }), () => cancelado.current)
        if (cancelado.current) break
        hechas += r.hasta - r.desde + 1
        const leido = analizarPaginas(paginas)
        correcciones.push(...leido.correcciones)
        Object.assign(areas, leido.areas)
        const { capitulo, faltan: sinEncontrar } = ajustarConIndice(leido.capitulos, r.capitulo)
        fichas.push(...leido.fichas, ...extraerFichasDeBloques(capitulo))
        capitulos.push(capitulo)
        faltan[capitulo.id] = sinEncontrar
      }
      if (cancelado.current && !capitulos.length) { setEstado('inicio'); return }
      mostrar({ capitulos, correcciones: resumir(correcciones), paginas: hechas, faltan, fichas, areas })
    } catch (e) {
      setEstado('inicio')
      setError(e instanceof Error && e.message ? e.message : 'No se pudo leer el PDF.')
    }
  }

  async function importarPorPaginas() {
    if (!pdf) return
    setError(''); setEstado('leyendo'); cancelado.current = false
    setProgreso({ hechas: 0, total: hasta - desde + 1, texto: 'Leyendo' })
    try {
      const paginas = await pdf.leer(desde, hasta, (hechas, total) => setProgreso({ hechas, total, texto: 'Leyendo' }), () => cancelado.current)
      if (cancelado.current) { setEstado('inicio'); return }
      const r = analizarPaginas(paginas)
      const fichas = [...r.fichas, ...r.capitulos.flatMap(c => extraerFichasDeBloques(c))]
      mostrar({ ...r, faltan: {}, fichas })
    } catch (e) {
      setEstado('inicio')
      setError(e instanceof Error && e.message ? e.message : 'No se pudo leer el PDF.')
    }
  }

  function mostrar(r: Resultado) {
    if (!r.capitulos.some(c => c.bloques.length)) {
      setEstado('inicio')
      setError('No se encontró texto en esas páginas. Si el PDF es solo imagen (sin texto reconocido), no se puede importar.')
      return
    }
    // Las fichas repetidas en el libro se unen; cada aparición conserva su texto original.
    setOriginales(new Map(r.fichas.map(f => [f.id, copiarBloques(f.original)])))
    const { unicas, alias: aliasNuevo } = unificar(r.fichas)
    setDetectadas(unicas)
    setAlias(aliasNuevo)
    // Por defecto: las seguras se cargan; las dudosas (Pendientes de revisión) y las subclases
    // cuya clase no está ni se crea quedan como texto del capítulo.
    const lista = conciliar(unicas, existentes)
    const clases = new Set([...(existentes.clases ?? []).map(c => claveNombre(c.nombre)), ...lista.filter(p => p.ficha.categoria === 'clases' && !p.ficha.dudas.length).map(p => claveNombre(p.ficha.nombre))])
    const decision: Record<string, Decision> = {}
    for (const p of lista) {
      const sinClase = p.ficha.categoria === 'subclases' && !p.existente && !clases.has(claveNombre(p.ficha.clase))
      decision[p.ficha.id] = p.ficha.dudas.length || sinClase ? 'texto' : 'ficha'
    }
    setEleccion({ ...eleccionVacia(), decision })
    setResultado(r)
    // Lo que está antes del primer capítulo (créditos, índice) va sin marcar.
    setElegidos(new Set(r.capitulos.filter(c => c.bloques.length && (c.etiqueta || c.titulo !== 'Antes del primer capítulo')).map(c => c.id)))
    setEstado('listo')
    setRevisando(true)
  }

  // Las correcciones de categoría y nombre de «Pendientes de revisión» vuelven a leer la ficha.
  const propuestas = useMemo(() => conciliar(detectadas.map(f => {
    const a = eleccion.ajustes[f.id]
    const leida = a && (a.categoria !== f.categoria || a.nombre.trim() !== f.nombre) && (a.nombre.trim() || a.categoria !== f.categoria)
      ? releerFicha(f, a.categoria, a.nombre.trim() || f.nombre) : f
    // Los campos corregidos a mano en la revisión.
    const ediciones = eleccion.ediciones[f.id]
    if (!ediciones) return leida
    const datos = Object.entries(ediciones).reduce((d, [ruta, valor]) => conCampo(d, ruta, valor), leida.datos)
    return { ...leida, datos, dudas: dudasDe(leida.categoria, leida.nombre, datos) }
  }), existentes), [detectadas, eleccion.ajustes, eleccion.ediciones, existentes])
  const decisionDe = (id: string): Decision => eleccion.decision[id] ?? 'texto'

  const elegidosLista = resultado?.capitulos.filter(c => elegidos.has(c.id)) ?? []
  // Solo cuentan las fichas de los capítulos que se agregan.
  const idsEnElegidos = new Set(elegidosLista.flatMap(c => c.bloques.flatMap(b => b.tipo === 'fichas' ? b.ids.map(id => alias.get(id) ?? id) : [])))
  const fichasDeElegidos = propuestas.filter(p => idsEnElegidos.has(p.ficha.id))

  function agregar() {
    const aceptadas = fichasDeElegidos.filter(p => decisionDe(p.ficha.id) === 'ficha')
    const finales = aceptadas.map(p => ({ p, ficha: fichaFinal(p, eleccion.delLibro[p.ficha.id] ?? new Set()) }))
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
    // En los capítulos, cada ficha aceptada apunta a su id final. Las que quedan como texto
    // vuelven a su texto original en el mismo lugar; solo «No incluir» las saca.
    const destino = new Map(aceptadas.map(p => [p.ficha.id, { id: idFinal(p), categoria: p.ficha.categoria }]))
    const capitulos = elegidosLista.map(c => ({
      ...c,
      bloques: unirTexto(c.bloques.flatMap((b): Bloque[] => {
        if (b.tipo !== 'fichas') return [b]
        const salida: Bloque[] = []
        const vistos = new Set<string>()
        for (const id of b.ids) {
          const principal = alias.get(id) ?? id
          const final = destino.get(principal)
          if (final) {
            // La categoría puede haberse corregido en «Pendientes de revisión».
            if (vistos.has(final.id)) continue
            vistos.add(final.id)
            const ultimo = salida[salida.length - 1]
            if (ultimo?.tipo === 'fichas' && ultimo.categoria === final.categoria) ultimo.ids.push(final.id)
            else salida.push({ id: nuevoId(), tipo: 'fichas', categoria: final.categoria, ids: [final.id] })
          } else if (decisionDe(principal) !== 'quitar') {
            const texto = copiarBloques(originales.get(id) ?? [])
            // Si el nombre no estaba en el texto y se escribió en la revisión, va como subtítulo.
            const nombre = eleccion.ajustes[principal]?.nombre.trim()
            if (nombre && texto[0]?.tipo !== 'subtitulo') texto.unshift({ id: nuevoId(), tipo: 'subtitulo', texto: nombre })
            salida.push(...texto)
          }
        }
        return salida
      })),
    }))
    onAgregar(capitulos, finales.filter(f => f.p.estado !== 'igual').map(f => ({ categoria: f.p.ficha.categoria, ficha: f.ficha, nueva: !f.p.existente })))
  }
  const rangosIndice = pdf && indice ? paginasDeCapitulos(indice, pdf.total) : []
  const ocupado = estado === 'abriendo' || estado === 'leyendo'

  return <section className="capitulos__capitulo capitulos__importar" aria-labelledby="importar-titulo">
    <h3 id="importar-titulo" className="capitulos__importar-titulo"><FileUp size={18} aria-hidden="true" />Importar desde PDF</h3>
    <p className="capitulos__ayuda">El PDF se lee en este navegador y no se sube a ningún lado. Si el libro tiene índice, se usa para saber dónde empieza cada capítulo y cómo se llama cada sección. Después revisá cada capítulo: es una propuesta.</p>

    <label className="capitulos__archivo">
      <span>{nombre || 'Elegir PDF…'}</span>
      <input type="file" accept="application/pdf,.pdf" disabled={ocupado} onChange={e => void elegirArchivo(e.target.files?.[0])} />
    </label>

    {pdf && estado !== 'abriendo' && <>
      <div className="capitulos__modos" role="group" aria-label="Cómo importar">
        <button type="button" aria-pressed={modo === 'indice'} disabled={!indice || ocupado} onClick={() => setModo('indice')}><ListTree size={15} aria-hidden="true" />Por el índice</button>
        <button type="button" aria-pressed={modo === 'paginas'} disabled={ocupado} onClick={() => setModo('paginas')}>Por páginas</button>
      </div>

      {modo === 'indice' && indice && <div className="capitulos__indice">
        <p className="capitulos__ayuda">
          Índice encontrado en la página {indice.paginasPdf.join(', ')} del PDF: {indice.capitulos.length} capítulos y {indice.capitulos.reduce((n, c) => n + c.secciones.length, 0)} secciones.
          {indice.desfase === null ? ' No se pudo calcular dónde cae cada página del libro en el PDF: se toman iguales.' : indice.desfase ? ` La página 1 del libro es la ${1 + indice.desfase} del PDF.` : ''}
        </p>
        <ul className="capitulos__encontrados">
          {rangosIndice.map(({ capitulo: c, desde: d, hasta: h }) => <li key={c.id}><label className="capitulos__fila-indice">
            <input type="checkbox" checked={elegidosIndice.has(c.id)} disabled={ocupado}
              onChange={() => setElegidosIndice(s => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })} />
            <span className="capitulos__nombre">{[c.etiqueta, c.titulo].filter(Boolean).join(': ')}</span>
            <span className="capitulos__detalle">pág. {c.pagina} del libro · PDF {d}–{h} · {c.secciones.length} secciones</span>
          </label></li>)}
        </ul>
        <div className="capitulos__acciones">
          <button type="button" disabled={ocupado} onClick={() => setElegidosIndice(new Set(elegidosIndice.size ? [] : indice.capitulos.map(c => c.id)))}>{elegidosIndice.size ? 'Desmarcar todos' : 'Marcar todos'}</button>
          <button type="button" className="capitulos__primario" disabled={ocupado || !elegidosIndice.size} onClick={() => void importarPorIndice()}>Leer {elegidosIndice.size} {elegidosIndice.size === 1 ? 'capítulo' : 'capítulos'}</button>
        </div>
      </div>}

      {modo === 'paginas' && <>
        {!indice && <p className="capitulos__ayuda">No se encontró un índice en las primeras {Math.min(PAGINAS_INDICE, pdf.total)} páginas: elegí el rango a importar.</p>}
        <div className="capitulos__rango">
          <span>{pdf.total} páginas. Importar de la</span>
          <label><span className="capitulos__oculto">Desde la página</span>
            <input type="number" min={1} max={pdf.total} value={desde} disabled={ocupado} onChange={e => setDesde(Math.max(1, Math.min(pdf.total, Number(e.target.value) || 1)))} /></label>
          <span>a la</span>
          <label><span className="capitulos__oculto">Hasta la página</span>
            <input type="number" min={desde} max={pdf.total} value={hasta} disabled={ocupado} onChange={e => setHasta(Math.max(desde, Math.min(pdf.total, Number(e.target.value) || desde)))} /></label>
          <button type="button" className="capitulos__primario" disabled={ocupado} onClick={() => void importarPorPaginas()}>Analizar</button>
        </div>
        <p className="capitulos__ayuda">Los créditos y el índice se saltean solos.</p>
      </>}
    </>}

    {ocupado && <div className="capitulos__progreso" role="status">
      <span>{estado === 'abriendo' && !progreso.total ? 'Abriendo el PDF…' : `${progreso.texto}: página ${progreso.hechas} de ${progreso.total}…`}</span>
      <progress max={Math.max(1, progreso.total)} value={progreso.hechas} aria-label="Páginas leídas" />
      {estado === 'leyendo' && <button type="button" onClick={() => { cancelado.current = true }}>Detener</button>}
    </div>}
    {error && <p className="capitulos__error" role="alert">{error}</p>}

    {resultado && estado === 'listo' && !revisando && <div className="capitulos__retomar" role="status">
      <span>Ya se leyeron {resultado.capitulos.length} {resultado.capitulos.length === 1 ? 'capítulo' : 'capítulos'} de {resultado.paginas} páginas. Lo que corregiste se conserva.</span>
      <button type="button" className="capitulos__primario" onClick={() => setRevisando(true)}>Seguir revisando</button>
    </div>}

    {resultado && estado === 'listo' && revisando && pdf && <RevisarImportacion
      archivo={nombre} pdf={pdf} capitulos={resultado.capitulos} elegidos={elegidos} onElegidos={setElegidos}
      onCapitulos={capitulos => setResultado({ ...resultado, capitulos })}
      faltan={resultado.faltan} correcciones={resultado.correcciones} areas={resultado.areas}
      propuestas={fichasDeElegidos} eleccion={eleccion} onEleccion={setEleccion} existentes={existentes}
      onVolver={() => setRevisando(false)} onCancelar={() => { cancelado.current = true; onCancelar() }} onAgregar={agregar} />}

    <div className="capitulos__acciones">
      <button type="button" onClick={() => { cancelado.current = true; onCancelar() }}>Cancelar</button>
    </div>
  </section>
}

function resumir(lista: Correccion[]): Correccion[] {
  const mapa = new Map<string, Correccion>()
  for (const c of lista) {
    const clave = `${c.de}→${c.a}`
    const previo = mapa.get(clave)
    if (previo) previo.veces += c.veces
    else mapa.set(clave, { ...c })
  }
  return [...mapa.values()].sort((a, b) => b.veces - a.veces)
}
