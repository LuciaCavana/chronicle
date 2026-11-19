import { useEffect, useRef, useState } from 'react'
import { FileUp } from 'lucide-react'
import { analizarPaginas, type ResultadoPdf } from '../../../lib/analizarPdf'
import { abrirPdf, type PdfAbierto } from '../../../lib/importarPdf'
import { etiquetaBloque, textoBloque, type Capitulo } from '../../../types/capitulo'

type Props = { onAgregar: (capitulos: Capitulo[]) => void; onCancelar: () => void }

/**
 * Importar desde PDF: lee el libro escaneado en este navegador, reconoce capítulos, títulos,
 * párrafos, recuadros, diálogos y listas, y muestra el resultado para elegir qué agregar.
 */
export default function ImportarPdf({ onAgregar, onCancelar }: Props) {
  const [pdf, setPdf] = useState<PdfAbierto | null>(null)
  const [nombre, setNombre] = useState('')
  const [desde, setDesde] = useState(1)
  const [hasta, setHasta] = useState(1)
  const [estado, setEstado] = useState<'inicio' | 'abriendo' | 'leyendo' | 'listo'>('inicio')
  const [progreso, setProgreso] = useState({ hechas: 0, total: 0 })
  const [resultado, setResultado] = useState<ResultadoPdf | null>(null)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const cancelado = useRef(false)

  useEffect(() => () => { cancelado.current = true; void pdf?.cerrar() }, [pdf])

  async function elegirArchivo(archivo: File | undefined) {
    if (!archivo) return
    setError(''); setResultado(null); setEstado('abriendo'); setNombre(archivo.name)
    try {
      if (archivo.type && archivo.type !== 'application/pdf') throw new Error('El archivo tiene que ser un PDF.')
      await pdf?.cerrar()
      const abierto = await abrirPdf(archivo)
      setPdf(abierto); setDesde(1); setHasta(abierto.total); setEstado('inicio')
    } catch (e) {
      setPdf(null); setEstado('inicio')
      setError(e instanceof Error && e.message ? e.message : 'No se pudo abrir el PDF.')
    }
  }

  async function analizar() {
    if (!pdf) return
    setError(''); setEstado('leyendo'); cancelado.current = false
    setProgreso({ hechas: 0, total: hasta - desde + 1 })
    try {
      const paginas = await pdf.leer(desde, hasta, (hechas, total) => setProgreso({ hechas, total }), () => cancelado.current)
      if (cancelado.current) { setEstado('inicio'); return }
      const r = analizarPaginas(paginas)
      if (!r.capitulos.length) throw new Error('No se encontró texto en esas páginas. Si el PDF es solo imagen (sin texto reconocido), no se puede importar.')
      setResultado(r)
      // Lo que está antes del primer capítulo (créditos, índice) va sin marcar.
      setElegidos(new Set(r.capitulos.filter(c => c.etiqueta || c.titulo !== 'Antes del primer capítulo').map(c => c.id)))
      setEstado('listo')
    } catch (e) {
      setEstado('inicio')
      setError(e instanceof Error && e.message ? e.message : 'No se pudo leer el PDF.')
    }
  }

  const elegidosLista = resultado?.capitulos.filter(c => elegidos.has(c.id)) ?? []
  const totalBloques = elegidosLista.reduce((n, c) => n + c.bloques.length, 0)

  return <section className="capitulos__capitulo capitulos__importar" aria-labelledby="importar-titulo">
    <h3 id="importar-titulo" className="capitulos__importar-titulo"><FileUp size={18} aria-hidden="true" />Importar desde PDF</h3>
    <p className="capitulos__ayuda">El PDF se lee en este navegador y no se sube a ningún lado. Se reconocen los capítulos, títulos, párrafos, recuadros, diálogos y listas por el tamaño y la posición del texto, y se corrigen los errores típicos del escaneo. Después revisá cada capítulo: es una propuesta.</p>

    <label className="capitulos__archivo">
      <span>{nombre || 'Elegir PDF…'}</span>
      <input type="file" accept="application/pdf,.pdf" disabled={estado === 'abriendo' || estado === 'leyendo'} onChange={e => void elegirArchivo(e.target.files?.[0])} />
    </label>
    {estado === 'abriendo' && <p className="capitulos__ayuda" role="status">Abriendo el PDF…</p>}

    {pdf && estado !== 'abriendo' && <div className="capitulos__rango">
      <span>{pdf.total} páginas. Importar de la</span>
      <label><span className="capitulos__oculto">Desde la página</span>
        <input type="number" min={1} max={pdf.total} value={desde} disabled={estado === 'leyendo'} onChange={e => setDesde(Math.max(1, Math.min(pdf.total, Number(e.target.value) || 1)))} /></label>
      <span>a la</span>
      <label><span className="capitulos__oculto">Hasta la página</span>
        <input type="number" min={desde} max={pdf.total} value={hasta} disabled={estado === 'leyendo'} onChange={e => setHasta(Math.max(desde, Math.min(pdf.total, Number(e.target.value) || desde)))} /></label>
      <button type="button" className="capitulos__primario" disabled={estado === 'leyendo'} onClick={() => void analizar()}>Analizar</button>
    </div>}
    <p className="capitulos__ayuda">Conviene saltear la tapa, los créditos y el índice: empezá en la primera página de texto.</p>

    {estado === 'leyendo' && <div className="capitulos__progreso" role="status">
      <span>Leyendo página {progreso.hechas} de {progreso.total}…</span>
      <progress max={Math.max(1, progreso.total)} value={progreso.hechas} aria-label="Páginas leídas" />
      <button type="button" onClick={() => { cancelado.current = true }}>Detener</button>
    </div>}
    {error && <p className="capitulos__error" role="alert">{error}</p>}

    {resultado && estado === 'listo' && <>
      {resultado.correcciones.length > 0 && <ul className="capitulos__correcciones" aria-label="Correcciones del escaneo">
        {resultado.correcciones.slice(0, 24).map(c => <li key={`${c.de}${c.a}`}>{c.de} → {c.a}{c.veces > 1 ? ` (×${c.veces})` : ''}</li>)}
      </ul>}
      <h4 className="capitulos__rotulo">Se encontraron {resultado.capitulos.length} capítulos en {resultado.paginas} páginas</h4>
      <ul className="capitulos__encontrados">
        {resultado.capitulos.map(c => <li key={c.id}>
          <details>
            <summary>
              <label onClick={e => e.stopPropagation()}><input type="checkbox" checked={elegidos.has(c.id)}
                onChange={() => setElegidos(s => { const n = new Set(s); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); return n })} />
                <span className="capitulos__oculto">Agregar {c.titulo}</span></label>
              <span className="capitulos__nombre">{[c.etiqueta, c.titulo].filter(Boolean).join(': ')}</span>
              <span className="capitulos__detalle">{c.bloques.length} bloques · {c.bloques.filter(b => b.tipo === 'recuadro').length} recuadros</span>
            </summary>
            <ol className="capitulos__vista">
              {c.bloques.slice(0, 40).map(b => <li key={b.id}><span>{etiquetaBloque(b.tipo)}</span><p>{textoBloque(b).replace(/\*\*/g, '').slice(0, 280)}{textoBloque(b).length > 280 ? '…' : ''}</p></li>)}
              {c.bloques.length > 40 && <li><span /><p>… y {c.bloques.length - 40} bloques más.</p></li>}
            </ol>
          </details>
        </li>)}
      </ul>
    </>}

    <div className="capitulos__acciones">
      <button type="button" onClick={() => { cancelado.current = true; onCancelar() }}>Cancelar</button>
      {resultado && estado === 'listo' && <button type="button" className="capitulos__primario" disabled={!elegidosLista.length}
        onClick={() => onAgregar(elegidosLista)}>Agregar {elegidosLista.length} {elegidosLista.length === 1 ? 'capítulo' : 'capítulos'} ({totalBloques} bloques)</button>}
    </div>
  </section>
}
