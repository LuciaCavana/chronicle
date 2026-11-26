import { useEffect, useRef, useState } from 'react'
import { FileUp, ListTree } from 'lucide-react'
import { abrirPdf, type PdfAbierto } from '../../../lib/importarPdf'
import { analizarIndice, paginasDeCapitulos, type IndiceLibro } from '../../../lib/indicePdf'
import { nuevoId, type Capitulo } from '../../../types/capitulo'
import type { Existentes } from '../../../lib/conciliarFichas'
import type { CambioFicha } from '../../../lib/zonasPdf'
import MarcarPaginas, { type CapituloImportar } from './MarcarPaginas'
import CampoNumero from '../../../components/shared/CampoNumero'

export type { CambioFicha } from '../../../lib/zonasPdf'
type Props = {
  /** Fichas ya cargadas en el libro, para completar en vez de duplicar. */
  existentes: Existentes
  onAgregar: (capitulos: Capitulo[], fichas: CambioFicha[]) => void
  onCancelar: () => void
}

/** Un rango de páginas a partir de lo escrito: dentro del PDF y con «hasta» no menor que «desde». */
function rango(desdeTxt: string, hastaTxt: string, total: number) {
  const acotar = (t: string, porDefecto: number) => Math.max(1, Math.min(total, Math.round(Number(t)) || porDefecto))
  const desde = acotar(desdeTxt, 1)
  return { desde, hasta: Math.max(desde, acotar(hastaTxt, total)) }
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
  // Los números de página se guardan como se escriben (así se puede borrar y tipear «199»
  // sin que se corrija a cada tecla) y se acomodan al usarlos o al salir del campo.
  const [desdeTxt, setDesdeTxt] = useState('1')
  const [hastaTxt, setHastaTxt] = useState('1')
  const [estado, setEstado] = useState<'inicio' | 'abriendo'>('inicio')
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 })
  const [error, setError] = useState('')
  // Índice indicado a mano (cuando no se encuentra solo en las primeras páginas).
  const [indiceDesdeTxt, setIndiceDesdeTxt] = useState('1')
  const [indiceHastaTxt, setIndiceHastaTxt] = useState('1')
  const total = pdf?.total ?? 1
  const { desde, hasta } = rango(desdeTxt, hastaTxt, total)
  const { desde: indiceDesde, hasta: indiceHasta } = rango(indiceDesdeTxt, indiceHastaTxt, total)
  const [avisoIndice, setAvisoIndice] = useState('')
  const [sinTexto, setSinTexto] = useState(false)
  // Los capítulos que se están marcando (la herramienta sigue viva aunque se cierre, para retomar).
  const [marcando, setMarcando] = useState<{ clave: string; capitulos: CapituloImportar[] } | null>(null)
  const [abierta, setAbierta] = useState(false)
  const cerrado = useRef(false)

  // Al cerrar la importación se corta lo que se esté leyendo y se libera el PDF. (Ojo: esto va
  // solo al desmontar; si dependiera de `pdf`, al abrir un PDF nuevo cortaba su propia lectura.)
  const pdfActual = useRef<PdfAbierto | null>(null)
  useEffect(() => { pdfActual.current = pdf }, [pdf])
  useEffect(() => () => { cerrado.current = true; void pdfActual.current?.cerrar() }, [])

  async function elegirArchivo(archivo: File | undefined) {
    if (!archivo) return
    setError(''); setIndice(null); setMarcando(null); setAbierta(false); setEstado('abriendo'); setNombre(archivo.name); setProgreso({ hechas: 0, total: 0 })
    try {
      if (archivo.type && archivo.type !== 'application/pdf') throw new Error('El archivo tiene que ser un PDF.')
      await pdf?.cerrar()
      const abierto = await abrirPdf(archivo)
      setPdf(abierto); setDesdeTxt('1'); setHastaTxt(String(abierto.total))
      // Busca el índice en las primeras páginas.
      const primeras = await abierto.leer(1, Math.min(PAGINAS_INDICE, abierto.total), (hechas, total) => setProgreso({ hechas, total }), () => cerrado.current)
      const encontrado = analizarIndice(primeras)
      // Un escaneo sin texto (solo imágenes) no se puede leer: hay que pasarle OCR antes.
      setSinTexto(primeras.reduce((n, p) => n + p.fragmentos.length, 0) < primeras.length * 3)
      setAvisoIndice('')
      setIndice(encontrado)
      setModo(encontrado ? 'indice' : 'paginas')
      setElegidosIndice(new Set(encontrado?.capitulos.map(c => c.id) ?? []))
      setEstado('inicio')
    } catch (e) {
      setPdf(null); setEstado('inicio')
      setError(e instanceof Error && e.message ? e.message : 'No se pudo abrir el PDF.')
    }
  }

  /** Busca el índice en las páginas que dice la usuaria (y las siguientes, para ubicar los capítulos). */
  async function buscarIndice() {
    if (!pdf) return
    setAvisoIndice(''); setEstado('abriendo'); setProgreso({ hechas: 0, total: 0 })
    try {
      const desdeI = indiceDesde, hastaI = indiceHasta
      setIndiceDesdeTxt(String(desdeI)); setIndiceHastaTxt(String(hastaI))
      const leidas = await pdf.leer(desdeI, Math.min(pdf.total, hastaI + PAGINAS_INDICE), (hechas, total) => setProgreso({ hechas, total }), () => cerrado.current)
      const indicadas = leidas.filter(p => p.numero <= hastaI)
      const encontrado = analizarIndice(leidas, { desde: desdeI, hasta: hastaI })
      if (encontrado && encontrado.paginasPdf.some(n => n <= hastaI)) {
        setIndice(encontrado); setModo('indice'); setElegidosIndice(new Set(encontrado.capitulos.map(c => c.id)))
      } else if (indicadas.reduce((n, p) => n + p.fragmentos.length, 0) < indicadas.length * 3) {
        setAvisoIndice(`Las páginas ${desdeI} a ${hastaI} no tienen texto: son imágenes. Hay que pasarle OCR al PDF (por ejemplo, con «Reconocer texto» de Adobe o con ocrmypdf) y volver a subirlo.`)
      } else {
        setAvisoIndice(`No reconocí un índice en las páginas ${desdeI} a ${hastaI}. Probá con otras páginas o importá por rango.`)
      }
    } catch {
      setAvisoIndice('No se pudieron leer esas páginas.')
    } finally {
      setEstado('inicio')
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
    setDesdeTxt(String(desde)); setHastaTxt(String(hasta))
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
        <button type="button" aria-pressed={modo === 'indice'} disabled={ocupado} onClick={() => setModo('indice')}><ListTree size={15} aria-hidden="true" />Por el índice</button>
        <button type="button" aria-pressed={modo === 'paginas'} disabled={ocupado} onClick={() => setModo('paginas')}>Por páginas</button>
      </div>

      {sinTexto && <p className="capitulos__error" role="alert">Este PDF casi no tiene texto en sus primeras páginas: parece un escaneo de imágenes. Para importarlo hay que pasarle OCR (por ejemplo, «Reconocer texto» en Adobe o ocrmypdf) y volver a subirlo.</p>}
      {modo === 'indice' && !indice && <div className="capitulos__indice">
        <p className="capitulos__ayuda">No encontré el índice solo en las primeras {Math.min(PAGINAS_INDICE, pdf.total)} páginas. Decime en qué páginas del PDF está y lo leo desde ahí.</p>
        <div className="capitulos__rango">
          <span>El índice está de la página</span>
          <label><span className="capitulos__oculto">Índice desde la página</span>
            <CampoNumero min={1} max={pdf.total} value={indiceDesdeTxt} disabled={ocupado} onChange={e => setIndiceDesdeTxt(e.target.value)} onBlur={() => { setIndiceDesdeTxt(String(indiceDesde)); setIndiceHastaTxt(String(indiceHasta)) }} /></label>
          <span>a la</span>
          <label><span className="capitulos__oculto">Índice hasta la página</span>
            <CampoNumero min={1} max={pdf.total} value={indiceHastaTxt} disabled={ocupado} onChange={e => setIndiceHastaTxt(e.target.value)} onBlur={() => setIndiceHastaTxt(String(indiceHasta))} /></label>
          <button type="button" className="capitulos__primario" disabled={ocupado} onClick={() => void buscarIndice()}>Buscar índice</button>
        </div>
        {avisoIndice && <p className="capitulos__error" role="alert">{avisoIndice}</p>}
      </div>}
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
        {!indice && <p className="capitulos__ayuda">No se encontró un índice en las primeras {Math.min(PAGINAS_INDICE, pdf.total)} páginas: elegí el rango a importar o indicá dónde está el índice en «Por el índice».</p>}
        <div className="capitulos__rango">
          <span>{pdf.total} páginas. Importar de la</span>
          <label><span className="capitulos__oculto">Desde la página</span>
            <CampoNumero min={1} max={pdf.total} value={desdeTxt} disabled={ocupado} onChange={e => setDesdeTxt(e.target.value)} onBlur={() => { setDesdeTxt(String(desde)); setHastaTxt(String(hasta)) }} /></label>
          <span>a la</span>
          <label><span className="capitulos__oculto">Hasta la página</span>
            <CampoNumero min={1} max={pdf.total} value={hastaTxt} disabled={ocupado} onChange={e => setHastaTxt(e.target.value)} onBlur={() => setHastaTxt(String(hasta))} /></label>
          <button type="button" className="capitulos__primario" disabled={ocupado} onClick={porPaginas}>Revisar</button>
        </div>
        <p className="capitulos__ayuda">Los créditos y el índice se saltean solos.</p>
      </>}
    </>}

    {ocupado && <div className="capitulos__progreso" role="status">
      <span>{progreso.total ? `Leyendo: página ${progreso.hechas} de ${progreso.total}…` : 'Abriendo el PDF…'}</span>
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
