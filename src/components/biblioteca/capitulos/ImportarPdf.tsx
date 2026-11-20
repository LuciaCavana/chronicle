import { useEffect, useRef, useState } from 'react'
import { FileUp, ListTree } from 'lucide-react'
import { abrirPdf, type PdfAbierto } from '../../../lib/importarPdf'
import { analizarIndice, paginasDeCapitulos, type IndiceLibro } from '../../../lib/indicePdf'
import { nuevoId, type Capitulo } from '../../../types/capitulo'
import type { Existentes } from '../../../lib/conciliarFichas'
import type { CambioFicha } from '../../../lib/zonasPdf'
import MarcarPaginas, { type CapituloImportar } from './MarcarPaginas'

export type { CambioFicha } from '../../../lib/zonasPdf'
type Props = {
  /** Fichas ya cargadas en el libro, para completar en vez de duplicar. */
  existentes: Existentes
  onAgregar: (capitulos: Capitulo[], fichas: CambioFicha[]) => void
  onCancelar: () => void
}

/** Páginas del comienzo donde se busca el índice. */
const PAGINAS_INDICE = 30

/**
 * Importar desde PDF: lee el libro escaneado en este navegador. Si encuentra el índice, se
 * importa por capítulos (cada uno con sus páginas y su nombre); si no, por rango de páginas.
 * Cada capítulo se revisa marcando en la página (MarcarPaginas).
 */
export default function ImportarPdf({ existentes, onAgregar, onCancelar }: Props) {
  const [pdf, setPdf] = useState<PdfAbierto | null>(null)
  const [nombre, setNombre] = useState('')
  const [indice, setIndice] = useState<IndiceLibro | null>(null)
  const [modo, setModo] = useState<'indice' | 'paginas'>('indice')
  const [elegidosIndice, setElegidosIndice] = useState<Set<string>>(new Set())
  const [desde, setDesde] = useState(1)
  const [hasta, setHasta] = useState(1)
  const [estado, setEstado] = useState<'inicio' | 'abriendo'>('inicio')
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 })
  const [error, setError] = useState('')
  // Los capítulos que se están marcando (la herramienta sigue viva aunque se cierre, para retomar).
  const [marcando, setMarcando] = useState<{ clave: string; capitulos: CapituloImportar[] } | null>(null)
  const [abierta, setAbierta] = useState(false)
  const cerrado = useRef(false)

  useEffect(() => () => { cerrado.current = true; void pdf?.cerrar() }, [pdf])

  async function elegirArchivo(archivo: File | undefined) {
    if (!archivo) return
    setError(''); setIndice(null); setMarcando(null); setAbierta(false); setEstado('abriendo'); setNombre(archivo.name); setProgreso({ hechas: 0, total: 0 })
    try {
      if (archivo.type && archivo.type !== 'application/pdf') throw new Error('El archivo tiene que ser un PDF.')
      await pdf?.cerrar()
      const abierto = await abrirPdf(archivo)
      setPdf(abierto); setDesde(1); setHasta(abierto.total)
      // Busca el índice en las primeras páginas.
      const primeras = await abierto.leer(1, Math.min(PAGINAS_INDICE, abierto.total), (hechas, total) => setProgreso({ hechas, total }), () => cerrado.current)
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

  function abrir(capitulos: CapituloImportar[]) {
    const clave = capitulos.map(c => `${c.id}:${c.desde}-${c.hasta}`).join('|')
    // Si son los mismos capítulos, se retoma lo marcado.
    if (marcando?.clave !== clave) setMarcando({ clave, capitulos })
    setAbierta(true)
  }
  function porIndice() {
    if (!pdf || !indice) return
    abrir(paginasDeCapitulos(indice, pdf.total).filter(r => elegidosIndice.has(r.capitulo.id)).map(r => ({
      id: r.capitulo.id, etiqueta: r.capitulo.etiqueta, titulo: r.capitulo.titulo, desde: r.desde, hasta: r.hasta, secciones: r.capitulo.secciones,
    })))
  }
  function porPaginas() {
    if (!pdf) return
    abrir([{ id: `paginas-${desde}-${hasta}-${nuevoId()}`, etiqueta: '', titulo: '', desde, hasta, secciones: [] }])
  }

  const rangosIndice = pdf && indice ? paginasDeCapitulos(indice, pdf.total) : []
  const ocupado = estado === 'abriendo'

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
          <button type="button" className="capitulos__primario" disabled={ocupado || !elegidosIndice.size} onClick={porIndice}>Revisar {elegidosIndice.size} {elegidosIndice.size === 1 ? 'capítulo' : 'capítulos'}</button>
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
          <button type="button" className="capitulos__primario" disabled={ocupado} onClick={porPaginas}>Revisar</button>
        </div>
        <p className="capitulos__ayuda">Los créditos y el índice se saltean solos.</p>
      </>}
    </>}

    {ocupado && <div className="capitulos__progreso" role="status">
      <span>{progreso.total ? `Buscando el índice: página ${progreso.hechas} de ${progreso.total}…` : 'Abriendo el PDF…'}</span>
      <progress max={Math.max(1, progreso.total)} value={progreso.hechas} aria-label="Páginas leídas" />
    </div>}
    {error && <p className="capitulos__error" role="alert">{error}</p>}

    {marcando && !abierta && <div className="capitulos__retomar" role="status">
      <span>Lo que marcaste se conserva mientras no cierres la importación.</span>
      <button type="button" className="capitulos__primario" onClick={() => setAbierta(true)}>Seguir revisando</button>
    </div>}

    {marcando && pdf && <MarcarPaginas key={marcando.clave} oculta={!abierta} archivo={nombre} pdf={pdf} capitulos={marcando.capitulos}
      desfase={indice?.desfase ?? null} existentes={existentes} onAgregar={onAgregar} onCerrar={() => setAbierta(false)} />}

    <div className="capitulos__acciones">
      <button type="button" onClick={onCancelar}>Cerrar la importación</button>
    </div>
  </section>
}
