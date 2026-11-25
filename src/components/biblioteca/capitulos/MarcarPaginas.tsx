import { useEffect, useMemo, useRef, useState, type PointerEvent as EventoPuntero, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle, ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Crosshair, FileText, Heading, LayoutPanelTop, Link2, Maximize2, Minimize2, Minus, PanelLeftClose, PanelLeftOpen, PanelRight, PencilLine, Plus, RotateCcw, Table, Trash2, Type, Unlink, X,
} from 'lucide-react'
import type { Medidas, PaginaPdf } from '../../../lib/analizarPdf'
import type { PdfAbierto } from '../../../lib/importarPdf'
import { parecido, type EntradaIndice } from '../../../lib/indicePdf'
import { conciliar, type Existentes } from '../../../lib/conciliarFichas'
import type { CategoriaFicha, FichaDetectada } from '../../../lib/fichasLibro'
import { camposDeRevision, dudasDeBloque, mostrarValor, textoDeCampo, UNA, valorDeTexto, type CampoRevision } from '../../../lib/revisionImportacion'
import {
  armarCapitulo, finalizarCapitulo, leerZona, NOMBRE_TIPO, ordenarZonas, proponerZonas, textoDeRect,
  type CambioFicha, type Rect, type TipoZona, type Zona,
} from '../../../lib/zonasPdf'
import { centroColumnas } from '../../../lib/analizarPdf'
import { nuevoId, textoBloque, type Bloque, type Capitulo } from '../../../types/capitulo'
import { formatoEnLinea } from './TextoConFormato'
import '../../../styles/biblioteca/MarcarPaginas.css'
import CampoNumero from '../../../components/shared/CampoNumero'

/** Un capítulo a importar: del índice (con sus secciones) o un rango de páginas. */
export type CapituloImportar = { id: string; etiqueta: string; titulo: string; desde: number; hasta: number; secciones: EntradaIndice[] }

type Props = {
  archivo: string
  pdf: PdfAbierto
  capitulos: CapituloImportar[]
  /** Página del PDF = página del libro + desfase (si se conoce). */
  desfase: number | null
  existentes: Existentes
  /** Cerrada pero viva: se conserva lo marcado para retomar. */
  oculta?: boolean
  onAgregar: (capitulos: Capitulo[], cambios: CambioFicha[]) => void
  onCerrar: () => void
}

/** Lo trabajado en cada capítulo. */
type Estado = {
  desde: number
  hasta: number
  paginas: Map<number, PaginaPdf> | null
  zonas: Zona[]
  medidas?: Medidas
  revisadas: Set<number>
  /** Por ficha, las diferencias en las que se usa el dato del libro. */
  delLibro: Record<string, Set<string>>
  /** Fichas reconocidas en el texto (clases, especies, objetos): si se cargan. */
  cargarTexto: Record<string, boolean>
  agregado: boolean
  cargando: boolean
  error: string
}

const TIPOS: TipoZona[] = ['titulo', 'subtitulo', 'texto', 'recuadro', 'tabla', 'ficha', 'ignorar']
const CATEGORIAS: CategoriaFicha[] = ['trasfondos', 'dotes', 'conjuros', 'criaturas', 'especies', 'clases', 'subclases', 'objetos']
const ICONO: Record<TipoZona, typeof Type> = { titulo: Heading, subtitulo: Heading, texto: Type, recuadro: LayoutPanelTop, tabla: Table, ficha: FileText, ignorar: X }
/** Capítulos a la izquierda (o no) y el panel de la derecha al costado o encima de la página. */
type Vista = { capitulos: boolean; panel: 'costado' | 'encima'; ancho: number; grande?: boolean }
const CLAVE_VISTA = 'chronicle.importar.vista'
const ANCHO_MIN = 300, ANCHO_MAX = 1100
function leerVista(): Vista {
  const base: Vista = { capitulos: true, panel: 'costado', ancho: 380 }
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_VISTA) ?? 'null') as Partial<Vista> | null
    if (!v) return base
    return { capitulos: v.capitulos !== false, panel: v.panel === 'encima' ? 'encima' : 'costado', ancho: Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, Number(v.ancho) || base.ancho)), grande: v.grande === true }
  } catch { return base }
}
const claveFicha = (f: FichaDetectada) => `${f.categoria}:${f.nombre.toLowerCase()}`

/**
 * Importar marcando en la página: se trabaja de a una página. El motor propone zonas (título,
 * texto, recuadro, tabla, ficha o ignorar); se tocan para cambiarlas y se arrastra para marcar
 * nuevas. A la derecha se ve cómo queda la página en el libro.
 */
export default function MarcarPaginas({ archivo, pdf, capitulos, desfase, existentes, oculta, onAgregar, onCerrar }: Props) {
  const [capId, setCapId] = useState(capitulos[0]?.id ?? '')
  const [estados, setEstados] = useState<Record<string, Estado>>(() => Object.fromEntries(capitulos.map(c => [c.id, {
    desde: c.desde, hasta: c.hasta, paginas: null, zonas: [], revisadas: new Set(), delLibro: {}, cargarTexto: {}, agregado: false, cargando: false, error: '',
  }])))
  const [pagina, setPagina] = useState(capitulos[0]?.desde ?? 1)
  const [zonaSel, setZonaSel] = useState<string | null>(null)
  // Marcar un campo de una ficha en la página: el próximo recuadro que se dibuje da su valor.
  const [campoAMarcar, setCampoAMarcar] = useState<{ zona: string; campo: CampoRevision } | null>(null)
  const [vistaMovil, setVistaMovil] = useState<'pagina' | 'libro'>('pagina')
  const [menuFicha, setMenuFicha] = useState(false)
  // Borrar una zona desde «Así queda» pide dos toques.
  const [porBorrarZona, setPorBorrarZona] = useState<string | null>(null)
  useEffect(() => {
    if (!porBorrarZona) return
    const t = window.setTimeout(() => setPorBorrarZona(null), 4000)
    return () => window.clearTimeout(t)
  }, [porBorrarZona])
  const [rango, setRango] = useState<{ desde: string; hasta: string } | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  // Cómo se reparte la pantalla (se recuerda en este navegador).
  const [vista, setVista] = useState<Vista>(leerVista)
  const [verLibro, setVerLibro] = useState(false)
  const [angosta, setAngosta] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(max-width: 900px)')
    if (!mq) return
    const cambio = () => setAngosta(mq.matches)
    mq.addEventListener('change', cambio)
    return () => mq.removeEventListener('change', cambio)
  }, [])
  useEffect(() => { try { localStorage.setItem(CLAVE_VISTA, JSON.stringify(vista)) } catch { /* sin almacenamiento */ } }, [vista])

  const cap = capitulos.find(c => c.id === capId) ?? capitulos[0]
  const est = estados[cap.id]
  const cambiarEstado = (id: string, cambio: (e: Estado) => Estado) => setEstados(s => ({ ...s, [id]: cambio(s[id]) }))

  useEffect(() => {
    if (oculta) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    raiz.current?.focus()
    return () => { document.body.style.overflow = antes }
  }, [oculta])

  // Lee el capítulo la primera vez que se abre (o cuando se corrige su rango de páginas).
  useEffect(() => {
    if (!est || est.paginas || est.cargando || est.error) return
    const id = cap.id
    cambiarEstado(id, e => ({ ...e, cargando: true }))
    void (async () => {
      try {
        const leidas = await pdf.leer(est.desde, est.hasta)
        const { zonas, medidas } = proponerZonas(leidas, { secciones: cap.secciones })
        cambiarEstado(id, e => ({ ...e, paginas: new Map(leidas.map(p => [p.numero, p])), zonas, medidas, cargando: false }))
      } catch {
        cambiarEstado(id, e => ({ ...e, cargando: false, error: 'No se pudieron leer las páginas de este capítulo.' }))
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap.id, est?.paginas, est?.cargando, est?.error])

  const ctx = useMemo(() => ({ medidas: est.medidas, secciones: cap.secciones }), [est.medidas, cap.secciones])
  // El capítulo armado con las zonas (para la vista previa, las fichas y los avisos).
  const armado = useMemo(() => est.paginas ? armarCapitulo({ id: cap.id, etiqueta: cap.etiqueta, titulo: cap.titulo }, est.zonas, est.paginas, ctx) : null,
    [est.zonas, est.paginas, ctx, cap.id, cap.etiqueta, cap.titulo])
  const fichaPorZona = (z: Zona) => armado?.fichas.find(f => f.id === armado.deZona[z.id]) ?? null

  const zonasPagina = est.zonas.filter(z => z.pagina === pagina)
  const zona = est.zonas.find(z => z.id === zonaSel) ?? null
  const paginaPdf = est.paginas?.get(pagina) ?? null

  /** Avisos de una zona: lo que el motor no está seguro de haber leído bien. */
  const avisos = (z: Zona): string[] => {
    if (z.sinAvisos || z.tipo === 'ignorar') return []
    if (z.tipo === 'ficha') return fichaPorZona(z)?.dudas ?? []
    if (!z.bloques.length) return ['No se leyó texto en esta zona']
    return z.bloques.flatMap(dudasDeBloque)
  }
  const conAvisos = (pag: number) => est.zonas.some(z => z.pagina === pag && avisos(z).length)

  // Secciones del índice que no son un título de ninguna zona.
  const faltan = cap.secciones.filter(s => !est.zonas.some(z => (z.tipo === 'titulo' || z.tipo === 'subtitulo') && z.bloques.some(b => 'texto' in b && parecido(b.texto, s.texto) >= 0.8)))

  // ---------- Cambios en las zonas ----------
  const cambiarZonas = (cambio: (zs: Zona[]) => Zona[]) => cambiarEstado(cap.id, e => ({ ...e, zonas: cambio(e.zonas) }))
  const leer = (z: Zona): Zona => {
    const p = est.paginas?.get(z.pagina)
    return p && z.tipo !== 'ficha' ? { ...z, ...leerZona(p, z, ctx), editada: false } : { ...z, bloques: [], editada: false }
  }
  const reemplazar = (z: Zona) => cambiarZonas(zs => zs.map(x => (x.id === z.id ? z : x)))
  /** Vuelve a ordenar las zonas de la página donde cambió algo. */
  const ordenarPagina = (zs: Zona[], pag: number) => {
    const p = est.paginas?.get(pag)
    if (!p) return zs
    const propias = ordenarZonas(zs.filter(z => z.pagina === pag), centroColumnas(p))
    const primera = zs.findIndex(z => z.pagina === pag)
    const sin = zs.filter(z => z.pagina !== pag)
    // Las zonas de la página van donde estaban (o en el orden de las páginas, si no había).
    const lugar = primera >= 0 ? primera : sin.findIndex(z => z.pagina > pag)
    sin.splice(lugar < 0 ? sin.length : lugar, 0, ...propias)
    return sin
  }
  const cambiarTipo = (z: Zona, tipo: TipoZona, categoria?: CategoriaFicha) => {
    setMenuFicha(false)
    reemplazar(leer({ ...z, tipo, categoria: tipo === 'ficha' ? categoria ?? z.categoria ?? 'dotes' : undefined, cortes: undefined, sinAvisos: false }))
  }
  /** Cambia el orden de una zona con la de al lado en la misma página (así se lee el capítulo). */
  const moverZona = (z: Zona, sentido: -1 | 1) => cambiarZonas(zs => {
    const propias = zs.map((x, k) => [x, k] as const).filter(([x]) => x.pagina === z.pagina)
    const j = propias.findIndex(([x]) => x.id === z.id)
    const otra = propias[j + sentido]
    if (!otra) return zs
    const copia = [...zs]
    copia[propias[j][1]] = otra[0]; copia[otra[1]] = z
    return copia
  })
  const borrar = (z: Zona) => { cambiarZonas(zs => zs.filter(x => x.id !== z.id)); setZonaSel(null) }
  const dibujada = (r: Rect) => {
    if (campoAMarcar && paginaPdf) {
      // Valor de un campo de la ficha tomado de la página.
      const texto = textoDeRect(paginaPdf, r)
      const z = est.zonas.find(x => x.id === campoAMarcar.zona)
      if (z && texto) reemplazar({ ...z, ediciones: { ...(z.ediciones ?? {}), [campoAMarcar.campo.ruta]: valorDeTexto(campoAMarcar.campo, texto) } })
      setCampoAMarcar(null)
      return
    }
    const nueva = leer({ id: nuevoId(), pagina, tipo: 'texto', bloques: [], ...r })
    // Marcada adentro de otra zona: esa zona se parte en lo de arriba y lo de abajo (así el orden
    // de lectura queda bien y nada se lee dos veces). Lo de abajo de una ficha la continúa.
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2
    const partidas = zonasPagina.filter(z => cx > z.x0 && cx < z.x1 && cy > z.y0 && cy < z.y1).flatMap(z => {
      const con = (x: Zona) => !!paginaPdf && !!textoDeRect(paginaPdf, x).trim()
      const arriba: Zona = { ...z, y1: r.y0 }
      const resto = (rect: Rect): Zona => ({ ...z, ...rect, id: nuevoId(), bloques: [], nombre: undefined, ediciones: undefined, cargar: undefined, tituloCapitulo: undefined,
        continua: z.tipo !== 'ignorar' })
      // Lo que queda al costado, en los mismos renglones (el resto de un renglón con un título pegado).
      const izquierda = resto({ x0: z.x0, y0: r.y0, x1: r.x0, y1: r.y1 })
      const derecha = resto({ x0: r.x1, y0: r.y0, x1: z.x1, y1: r.y1 })
      const abajo = resto({ x0: z.x0, y0: r.y1, x1: z.x1, y1: z.y1 })
      const partes = [arriba, izquierda, derecha, abajo].filter(x => x.x1 - x.x0 > 6 && x.y1 - x.y0 > 4 && con(x))
      // La primera parte que queda conserva la zona (y, si es una ficha, su nombre y lo corregido).
      if (partes[0] && partes[0] !== arriba) partes[0] = { ...partes[0], id: z.id, nombre: z.nombre, ediciones: z.ediciones, cargar: z.cargar, continua: z.continua }
      return [{ de: z.id, partes: partes.map(x => leer({ ...x, cortes: undefined })) }]
    })
    const viejas = new Set(partidas.map(x => x.de))
    cambiarZonas(zs => ordenarPagina([...zs.filter(z => !viejas.has(z.id)), ...partidas.flatMap(x => x.partes), nueva], pagina))
    setZonaSel(nueva.id)
  }
  const redimensionada = (z: Zona, r: Rect) => cambiarZonas(zs => ordenarPagina(zs.map(x => (x.id === z.id ? leer({ ...z, ...r, cortes: undefined }) : x)), z.pagina))
  const cambiarCortes = (z: Zona, cortes: number[]) => reemplazar(leer({ ...z, cortes }))
  const editarBloques = (z: Zona, bloques: Bloque[]) => reemplazar({ ...z, bloques, editada: true })

  // ---------- Navegación ----------
  const irA = (id: string, pag?: number) => {
    const destino = capitulos.find(c => c.id === id)
    if (!destino) return
    setCapId(id); setZonaSel(null); setCampoAMarcar(null); setRango(null)
    setPagina(pag ?? estados[id].desde)
  }
  const irPagina = (n: number) => { setPagina(Math.max(est.desde, Math.min(est.hasta, n))); setZonaSel(null); setCampoAMarcar(null) }
  const paginaRevisada = () => {
    cambiarEstado(cap.id, e => ({ ...e, revisadas: new Set(e.revisadas).add(pagina) }))
    if (pagina < est.hasta) irPagina(pagina + 1)
  }
  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    const objetivo = e.target as HTMLElement
    if (objetivo.closest('input, textarea, select')) return
    if (e.key === 'Escape') { setZonaSel(null); setCampoAMarcar(null); setMenuFicha(false) }
    else if (e.key === 'ArrowRight' && !zonaSel) irPagina(pagina + 1)
    else if (e.key === 'ArrowLeft' && !zonaSel) irPagina(pagina - 1)
  }

  // ---------- Agregar ----------
  const cargarFicha = (f: FichaDetectada) => {
    const z = est.zonas.find(x => x.id === f.id)
    if (z) return z.cargar ?? !f.dudas.length
    return est.cargarTexto[claveFicha(f)] ?? !f.dudas.length
  }
  function agregar() {
    if (!armado) return
    // Importado por páginas: el título es el primero que se marcó.
    const primerTitulo = est.zonas.find(z => z.tipo === 'titulo')?.bloques[0]
    const titulo = armado.capitulo.titulo || (primerTitulo && 'texto' in primerTitulo ? primerTitulo.texto : '') || `Páginas ${est.desde}–${est.hasta}`
    const base = { ...armado.capitulo, id: nuevoId(), titulo, bloques: armado.capitulo.titulo ? armado.capitulo.bloques : armado.capitulo.bloques.filter(b => b !== primerTitulo && !(b.tipo === 'titulo' && primerTitulo && 'texto' in primerTitulo && b.texto === primerTitulo.texto)) }
    const { capitulo, cambios } = finalizarCapitulo(base, armado.fichas, cargarFicha, est.delLibro, existentes)
    onAgregar([capitulo], cambios)
    cambiarEstado(cap.id, e => ({ ...e, agregado: true }))
  }
  const cambiarRango = () => {
    if (!rango) return
    const desde = Math.max(1, Math.min(pdf.total, Math.round(Number(rango.desde)) || 1)), hasta = Math.max(desde, Math.min(pdf.total, Math.round(Number(rango.hasta)) || pdf.total))
    cambiarEstado(cap.id, e => ({ ...e, desde, hasta, paginas: null, zonas: [], revisadas: new Set(), error: '' }))
    setPagina(desde); setZonaSel(null); setRango(null)
  }

  const fichasCapitulo = armado?.fichas ?? []
  const cargadas = fichasCapitulo.filter(cargarFicha).length
  const nombreCap = [cap.etiqueta, cap.titulo].filter(Boolean).join(': ') || `Páginas ${est.desde}–${est.hasta}`
  const totalPaginas = est.hasta - est.desde + 1

  // En pantallas angostas el panel siempre va en su pestaña.
  // Ampliado: el panel se pone encima de la página, grande, para leer y revisar cómodo.
  const grande = !!vista.grande && !angosta
  const encima = (vista.panel === 'encima' || grande) && !angosta
  const panel = (
      <aside className={`marcar__derecha${grande ? ' marcar__derecha--grande' : ''}`} aria-label="Así queda en el libro" hidden={encima && !grande && !zona && !verLibro ? true : undefined}
        style={encima && !grande ? { width: vista.ancho } : undefined}>
        {!grande && divisor()}
        <div className="marcar__panel-barra marcar__solo-escritorio">
          <button type="button" className="marcar__boton marcar__boton--chico" aria-pressed={grande} onClick={() => setVista(v => ({ ...v, grande: !v.grande }))}>
            {grande ? <><Minimize2 size={14} aria-hidden="true" />Achicar</> : <><Maximize2 size={14} aria-hidden="true" />Ampliar para leer</>}
          </button>
          {encima && !grande && !zona && <button type="button" className="marcar__icono marcar__icono--sin-borde" aria-label="Cerrar el panel" onClick={() => setVerLibro(false)}><X size={16} aria-hidden="true" /></button>}
        </div>
        {zona ? panelZona(zona) : <p className="marcar__ayuda marcar__ayuda--caja">Tocá una zona de la página para cambiar qué es o corregir lo leído. Arrastrá sobre la página para marcar una zona nueva.</p>}
        {asiQueda()}
      </aside>
  )
  if (oculta) return null
  return createPortal(<div ref={raiz} className="marcar" role="dialog" aria-modal="true" aria-labelledby="marcar-titulo" tabIndex={-1} onKeyDown={teclas}>
    <header className="marcar__cabecera">
      <div className="marcar__titulo">
        <span className="marcar__antetitulo">Importar desde PDF · {archivo.replace(/\.pdf$/i, '')}</span>
        <h2 id="marcar-titulo">{nombreCap}</h2>
      </div>
      <span className="marcar__progreso">{est.revisadas.size} de {totalPaginas} páginas revisadas · {cargadas} {cargadas === 1 ? 'ficha' : 'fichas'}</span>
      <button type="button" className="marcar__boton" onClick={onCerrar}>Cerrar</button>
      <button type="button" className="marcar__boton marcar__boton--primario" disabled={!armado || est.agregado} onClick={agregar}>
        {est.agregado ? <><Check size={16} aria-hidden="true" />Agregado al libro</> : `Agregar ${cap.etiqueta ? cap.etiqueta.toLowerCase() : 'capítulo'} al libro`}
      </button>
    </header>

    <div className={`marcar__cuerpo marcar__cuerpo--${vistaMovil}${encima ? ' marcar__cuerpo--encima' : ''}`}
      style={{ gridTemplateColumns: `${vista.capitulos ? '250px' : '0'} minmax(0, 1fr) ${encima ? '0' : `${vista.ancho}px`}` }}>
      {navegador()}
      <div className="marcar__pestanias" role="tablist" aria-label="Vista">
        <button type="button" role="tab" aria-selected={vistaMovil === 'pagina'} onClick={() => setVistaMovil('pagina')}>Página del PDF</button>
        <button type="button" role="tab" aria-selected={vistaMovil === 'libro'} onClick={() => setVistaMovil('libro')}>Así queda</button>
      </div>
      <section className="marcar__centro" aria-label="Página del PDF">
        <div className="marcar__barra">
          <div className="marcar__grupo">
            <button type="button" className="marcar__icono marcar__solo-escritorio" aria-pressed={!vista.capitulos} aria-label={vista.capitulos ? 'Ocultar capítulos' : 'Mostrar capítulos'}
              title={vista.capitulos ? 'Ocultar capítulos' : 'Mostrar capítulos'} onClick={() => setVista(v => ({ ...v, capitulos: !v.capitulos }))}>
              {vista.capitulos ? <PanelLeftClose size={16} aria-hidden="true" /> : <PanelLeftOpen size={16} aria-hidden="true" />}
            </button>
            <button type="button" className="marcar__icono" aria-label="Página anterior" disabled={pagina <= est.desde} onClick={() => irPagina(pagina - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
            <span className="marcar__pagina">Pág. {pagina} del PDF{desfase !== null ? ` · ${pagina - desfase} del libro` : ''}</span>
            <button type="button" className="marcar__icono" aria-label="Página siguiente" disabled={pagina >= est.hasta} onClick={() => irPagina(pagina + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
          </div>
          <span className="marcar__pista"><PencilLine size={15} aria-hidden="true" />{campoAMarcar ? `Marcá en la página dónde está «${campoAMarcar.campo.etiqueta}»` : zona ? 'Arrastrá adentro de la zona elegida para marcar otra encima (un subtítulo pegado, por ejemplo)' : 'Arrastrá sobre la página para marcar una zona nueva'}</span>
          <button type="button" className="marcar__boton marcar__boton--chico marcar__solo-escritorio" aria-pressed={vista.panel === 'encima'}
            title="El panel de la derecha al costado de la página o encima (la página usa todo el ancho)"
            onClick={() => { setVista(v => ({ ...v, panel: v.panel === 'costado' ? 'encima' : 'costado' })); setVerLibro(false) }}>
            <PanelRight size={15} aria-hidden="true" />{vista.panel === 'costado' ? 'Panel encima' : 'Panel al costado'}
          </button>
          {encima && !grande && !zona && <button type="button" className="marcar__boton marcar__boton--chico marcar__solo-escritorio" aria-expanded={verLibro} onClick={() => setVerLibro(v => !v)}>Así queda</button>}
          <button type="button" className={`marcar__boton marcar__boton--chico${est.revisadas.has(pagina) ? ' marcar__boton--hecho' : ''}`} onClick={paginaRevisada}>
            <Check size={15} aria-hidden="true" />{est.revisadas.has(pagina) ? 'Revisada' : 'Página revisada'}
          </button>
        </div>
        {zona && !campoAMarcar && barraTipos(zona)}
        {campoAMarcar && <div className="marcar__aviso-campo" role="status">
          <span>Dibujá un recuadro sobre «{campoAMarcar.campo.etiqueta}» en la página.</span>
          <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => setCampoAMarcar(null)}>Cancelar</button>
        </div>}
        {est.cargando && <p className="marcar__vacio" role="status">Leyendo las páginas del capítulo…</p>}
        {est.error && <p className="marcar__vacio marcar__vacio--error" role="alert">{est.error}</p>}
        <div className="marcar__visor-caja">
        {!est.cargando && !est.error && <VisorZonas pdf={pdf} pagina={pagina} zonas={zonasPagina} seleccionada={zonaSel} avisos={avisos}
          dibujando={!!campoAMarcar} onElegir={id => { setZonaSel(id); setMenuFicha(false) }} onDibujar={dibujada}
          onRedimensionar={redimensionada} onCortes={cambiarCortes} />}
        {encima && panel}
        </div>
      </section>
      {!encima && panel}
    </div>
  </div>, document.body)

  // ===================================================================================
  /** Borde del panel de la derecha: se arrastra (o se usan las flechas) para cambiar su ancho. */
  function divisor() {
    const cambiar = (ancho: number) => setVista(v => ({ ...v, ancho: Math.round(Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, window.innerWidth - 320, ancho))) }))
    return <div className="marcar__divisor" role="separator" aria-orientation="vertical" aria-label="Ancho del panel" tabIndex={0}
      aria-valuemin={ANCHO_MIN} aria-valuemax={ANCHO_MAX} aria-valuenow={vista.ancho}
      onPointerDown={e => {
        const el = e.currentTarget
        el.setPointerCapture(e.pointerId)
        const borde = el.parentElement!.getBoundingClientRect().right
        const mover = (m: PointerEvent) => cambiar(borde - m.clientX)
        const soltar = () => { el.removeEventListener('pointermove', mover); el.removeEventListener('pointerup', soltar) }
        el.addEventListener('pointermove', mover); el.addEventListener('pointerup', soltar)
      }}
      onKeyDown={e => {
        e.stopPropagation()
        if (e.key === 'ArrowLeft') { e.preventDefault(); cambiar(vista.ancho + 40) }
        else if (e.key === 'ArrowRight') { e.preventDefault(); cambiar(vista.ancho - 40) }
      }} />
  }

  function navegador() {
    return <nav className={`marcar__nav${vista.capitulos ? '' : ' marcar__nav--oculta'}`} aria-label="Capítulos y páginas">
      <h3 className="marcar__rotulo">Capítulos</h3>
      <ul className="marcar__capitulos">
        {capitulos.map(c => {
          const e = estados[c.id]
          const abierto = c.id === cap.id
          return <li key={c.id}>
            <button type="button" className="marcar__capitulo" aria-expanded={abierto} aria-current={abierto ? 'true' : undefined} onClick={() => irA(c.id)}>
              <span className={`marcar__estado${e.agregado ? ' marcar__estado--ok' : ''}`} aria-hidden="true">{e.agregado ? <Check size={14} /> : null}</span>
              <span className="marcar__capitulo-nombre">{[c.etiqueta, c.titulo].filter(Boolean).join(': ') || 'Páginas elegidas'}</span>
              <span className="marcar__capitulo-paginas">{e.desde}–{e.hasta}</span>
            </button>
            {abierto && <div className="marcar__paginas-cap">
              <div className="marcar__paginas" role="group" aria-label="Páginas">
                {Array.from({ length: e.hasta - e.desde + 1 }, (_, i) => e.desde + i).map(n => {
                  const clase = n === pagina ? ' marcar__pag--actual' : e.revisadas.has(n) ? ' marcar__pag--ok' : conAvisos(n) ? ' marcar__pag--alerta' : ''
                  return <button key={n} type="button" className={`marcar__pag${clase}`} aria-current={n === pagina ? 'page' : undefined}
                    aria-label={`Página ${n}${e.revisadas.has(n) ? ', revisada' : conAvisos(n) ? ', con avisos' : ''}`} onClick={() => irPagina(n)}>{n}</button>
                })}
              </div>
              {rango
                ? <div className="marcar__rango">
                    <label>Desde<CampoNumero  min={1} max={pdf.total} value={rango.desde} onChange={x => setRango({ ...rango, desde: x.target.value })} /></label>
                    <label>Hasta<CampoNumero  min={1} max={pdf.total} value={rango.hasta} onChange={x => setRango({ ...rango, hasta: x.target.value })} /></label>
                    <p className="marcar__ayuda">Páginas del PDF. Se vuelven a leer y se pierden los cambios de este capítulo.</p>
                    <div className="marcar__fila">
                      <button type="button" className="marcar__boton marcar__boton--chico marcar__boton--primario" onClick={cambiarRango}>Volver a leer</button>
                      <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => setRango(null)}>Cancelar</button>
                    </div>
                  </div>
                : <button type="button" className="marcar__enlace" onClick={() => setRango({ desde: String(e.desde), hasta: String(e.hasta) })}><PencilLine size={13} aria-hidden="true" />Corregir dónde empieza y termina</button>}
              {faltan.length > 0 && <div className="marcar__faltan">
                <h4><AlertTriangle size={13} aria-hidden="true" />Del índice, sin título en el capítulo</h4>
                <ul>
                  {faltan.map(s => {
                    const destino = desfase !== null ? s.pagina + desfase : null
                    const enRango = destino !== null && destino >= e.desde && destino <= e.hasta
                    return <li key={`${s.texto}-${s.pagina}`}>
                      {enRango
                        ? <button type="button" className="marcar__enlace" onClick={() => irPagina(destino)}>«{s.texto}» · ir a la pág. {destino}</button>
                        : <span>«{s.texto}» · pág. {s.pagina} del libro{destino !== null ? ' (fuera de este capítulo)' : ''}</span>}
                    </li>
                  })}
                </ul>
                <p className="marcar__ayuda">Buscalo en esa página: marcá el título con un recuadro y elegí «Título» o «Subtítulo».</p>
              </div>}
            </div>}
          </li>
        })}
      </ul>
      <h3 className="marcar__rotulo">Colores</h3>
      <ul className="marcar__leyenda">
        {TIPOS.map(t => <li key={t}><span className={`marcar__muestra marcar__muestra--${t}`} aria-hidden="true" />{NOMBRE_TIPO[t]}</li>)}
      </ul>
    </nav>
  }

  // ===================================================================================
  function barraTipos(z: Zona) {
    return <div className="marcar__tipos" role="toolbar" aria-label="Qué es esta zona">
      <span className="marcar__tipos-rotulo">Esta zona es:</span>
      {TIPOS.map(t => {
        const Icono = ICONO[t]
        return <button key={t} type="button" className={`marcar__tipo marcar__tipo--${t}`} aria-pressed={z.tipo === t}
          onClick={() => (t === 'ficha' ? setMenuFicha(v => !v) : cambiarTipo(z, t))} aria-expanded={t === 'ficha' ? menuFicha : undefined}>
          <Icono size={14} aria-hidden="true" />{t === 'ficha' && z.tipo === 'ficha' && z.categoria ? `Ficha: ${UNA[z.categoria]}` : NOMBRE_TIPO[t]}{t === 'ficha' ? ' ▾' : ''}
        </button>
      })}
      <span className="marcar__separador" aria-hidden="true" />
      <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => reemplazar(leer(z))}><RotateCcw size={14} aria-hidden="true" />Volver a leer</button>
      <button type="button" className="marcar__boton marcar__boton--chico marcar__boton--peligro" onClick={() => borrar(z)}><Trash2 size={14} aria-hidden="true" />Borrar</button>
      {menuFicha && <ul className="marcar__menu" aria-label="Tipo de ficha">
        {CATEGORIAS.map(c => <li key={c}><button type="button" aria-pressed={z.tipo === 'ficha' && z.categoria === c} onClick={() => cambiarTipo(z, 'ficha', c)}>{UNA[c]}</button></li>)}
      </ul>}
    </div>
  }

  // ===================================================================================
  function panelZona(z: Zona) {
    const n = zonasPagina.findIndex(x => x.id === z.id) + 1
    const lista = avisos(z)
    return <section className={`marcar__zona marcar__zona--${z.tipo}`} aria-label="Zona elegida">
      <div className="marcar__zona-cabecera">
        <span className={`marcar__numero marcar__numero--${z.tipo}`}>{n}</span>
        <span>{z.tipo === 'ficha' && z.categoria ? `Ficha: ${UNA[z.categoria]}` : NOMBRE_TIPO[z.tipo]}{z.tituloCapitulo ? ' · título del capítulo' : ''}</span>
        <button type="button" className="marcar__icono marcar__icono--sin-borde" aria-label="Dejar de elegir la zona" onClick={() => setZonaSel(null)}><X size={16} aria-hidden="true" /></button>
      </div>
      {lista.length > 0 && <div className="marcar__avisos" role="status">
        {lista.map(a => <p key={a}><AlertTriangle size={15} aria-hidden="true" />{a}</p>)}
        <div className="marcar__fila">
          {z.tipo === 'texto' && <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => cambiarTipo(z, 'subtitulo')}>Es un subtítulo</button>}
          {(z.tipo === 'titulo' || z.tipo === 'subtitulo') && <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => cambiarTipo(z, 'texto')}>Es texto</button>}
          {z.tipo !== 'ficha' && <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => reemplazar({ ...z, sinAvisos: true })}>Está bien así</button>}
        </div>
      </div>}
      {unir(z)}
      {z.tipo === 'ignorar' && <p className="marcar__ayuda">{z.tituloCapitulo ? 'Es el título del capítulo: ya está arriba, no se repite en el texto.' : 'Lo que está acá no se agrega al libro (números de página, pies de imagen, adornos…).'}</p>}
      {(z.tipo === 'titulo' || z.tipo === 'subtitulo') && <TextoEditable etiqueta="Texto del título" valor={z.bloques[0] && 'texto' in z.bloques[0] ? z.bloques[0].texto : ''} filas={1}
        onCambiar={t => editarBloques(z, [{ id: z.bloques[0]?.id ?? nuevoId(), tipo: z.tipo === 'subtitulo' ? 'subtitulo' : 'titulo', texto: t }])} />}
      {z.tipo === 'texto' && <TextoEditable etiqueta="Texto" valor={z.bloques.map(b => (b.tipo === 'termino' ? `**${b.termino}** ${b.texto}` : textoBloque(b))).join('\n\n')} filas={8}
        ayuda="Una línea en blanco separa párrafos. **Así** va en negrita."
        onCambiar={t => editarBloques(z, t.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map(x => {
          const termino = /^\*\*([^*]+?)\*\*\s*(.*)$/s.exec(x)
          return termino ? { id: nuevoId(), tipo: 'termino' as const, termino: termino[1], texto: termino[2] } : { id: nuevoId(), tipo: 'parrafo' as const, texto: x }
        }))} />}
      {z.tipo === 'recuadro' && (() => {
        const b = z.bloques[0]?.tipo === 'recuadro' ? z.bloques[0] : { id: nuevoId(), tipo: 'recuadro' as const, titulo: '', texto: '' }
        return <>
          <TextoEditable etiqueta="Título del recuadro" valor={b.titulo} filas={1} ayuda="Se toma el primer renglón en mayúsculas. Si no es, corregilo acá." onCambiar={t => editarBloques(z, [{ ...b, titulo: t }])} />
          <TextoEditable etiqueta="Texto del recuadro" valor={b.texto} filas={6} onCambiar={t => editarBloques(z, [{ ...b, texto: t }])} />
        </>
      })()}
      {z.tipo === 'tabla' && panelTabla(z)}
      {z.tipo === 'ficha' && panelFicha(z)}
      {z.editada && <p className="marcar__ayuda">Corregido a mano. «Volver a leer» lo reemplaza por lo que dice la página.</p>}
    </section>
  }

  /** Unir con la zona anterior o la siguiente: lo que sigue en otra columna o página es lo mismo. */
  function unir(z: Zona) {
    if (z.tipo === 'ignorar' || z.tituloCapitulo) return null
    const i = est.zonas.findIndex(x => x.id === z.id)
    const anterior = [...est.zonas.slice(0, i)].reverse().find(x => x.tipo !== 'ignorar')
    const siguiente = est.zonas.slice(i + 1).find(x => x.tipo !== 'ignorar')
    const ubicar = (x: Zona) => {
      const n = est.zonas.filter(y => y.pagina === x.pagina).findIndex(y => y.id === x.id) + 1
      return x.pagina === z.pagina ? `zona ${n}` : `zona ${n} de la pág. ${x.pagina}`
    }
    const describir = (x: Zona) => {
      if (x.tipo !== 'ficha') return NOMBRE_TIPO[x.tipo].toLowerCase()
      const f = fichaPorZona(x)
      return f && !/^Sin nombre \(/.test(f.nombre) ? `ficha «${f.nombre}»` : 'ficha'
    }
    /** La zona b pasa a ser la continuación de a (toma su tipo). */
    const unirZonas = (a: Zona, b: Zona) => reemplazar(leer({ ...b, tipo: a.tipo, categoria: a.categoria, continua: true, cortes: b.tipo === a.tipo ? b.cortes : undefined,
      nombre: undefined, ediciones: undefined, cargar: undefined, sinAvisos: false }))
    if (z.continua && anterior) return <div className="marcar__union">
      <p><Link2 size={15} aria-hidden="true" />Sigue la {ubicar(anterior)} ({describir(anterior)}).</p>
      <div className="marcar__fila">
        <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => { setPagina(anterior.pagina); setZonaSel(anterior.id) }}>Ver la anterior</button>
        <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => reemplazar(leer({ ...z, continua: false }))}><Unlink size={14} aria-hidden="true" />Separar</button>
      </div>
    </div>
    if (!anterior && !siguiente) return null
    return <div className="marcar__fila">
      {anterior && <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => unirZonas(anterior, z)}
        title={`Esta zona sigue la ${ubicar(anterior)} y toma su tipo`}><Link2 size={14} aria-hidden="true" />Unir con la anterior ({describir(anterior)})</button>}
      {siguiente && !siguiente.continua && <button type="button" className="marcar__boton marcar__boton--chico" onClick={() => unirZonas(z, siguiente)}
        title={`La ${ubicar(siguiente)} sigue esta zona y toma su tipo`}><Link2 size={14} aria-hidden="true" />Unir con la siguiente</button>}
    </div>
  }

  function panelTabla(z: Zona) {
    const b = z.bloques[0]?.tipo === 'tabla' ? z.bloques[0] : null
    const cambiarCelda = (fila: number, col: number, valor: string) => {
      if (!b) return
      if (fila < 0) editarBloques(z, [{ ...b, columnas: b.columnas.map((c, i) => (i === col ? valor : c)) }])
      else editarBloques(z, [{ ...b, filas: b.filas.map((f, i) => (i === fila ? f.map((c, j) => (j === col ? valor : c)) : f)) }])
    }
    return <>
      <p className="marcar__ayuda">Las líneas verdes de la página son los cortes de columna: arrastralas para ajustarlas, doble clic en la tabla agrega una y la × la quita. La tabla se vuelve a leer sola.</p>
      {b && <TextoEditable etiqueta="Título de la tabla" valor={b.titulo} filas={1} onCambiar={t => editarBloques(z, [{ ...b, titulo: t }])} />}
      <label className="marcar__casilla"><input type="checkbox" checked={!z.sinEncabezado} onChange={() => reemplazar(leer({ ...z, sinEncabezado: !z.sinEncabezado }))} />La primera fila es el encabezado</label>
      {b ? <div className="marcar__tabla-caja">
        <table className="marcar__tabla">
          <thead><tr>{b.columnas.map((c, i) => <th key={i} scope="col"><Celda valor={c} etiqueta={`Encabezado ${i + 1}`} onCambiar={v => cambiarCelda(-1, i, v)} /></th>)}</tr></thead>
          <tbody>{b.filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j}><Celda valor={c} etiqueta={`Fila ${i + 1}, columna ${j + 1}`} onCambiar={v => cambiarCelda(i, j, v)} /></td>)}</tr>)}</tbody>
        </table>
      </div> : <p className="marcar__ayuda">No se leyó ninguna fila.</p>}
      <p className="marcar__ayuda">Si la tabla sigue en otra columna o página, marcala ahí también como «Tabla»: se unen solas si tienen las mismas columnas.</p>
    </>
  }

  function panelFicha(z: Zona) {
    const ficha = fichaPorZona(z)
    const esPrimera = !!ficha && ficha.id === z.id
    if (!ficha) return <p className="marcar__ayuda">Leyendo…</p>
    if (!esPrimera) return <>
      <p className="marcar__ayuda">Esta zona es la continuación de la ficha «{/^Sin nombre \(/.test(ficha.nombre) ? 'sin nombre' : ficha.nombre}»: se edita desde su primera zona.</p>
      <button type="button" className="marcar__enlace" onClick={() => { const primera = est.zonas.find(x => x.id === ficha.id); if (primera) { setPagina(primera.pagina); setZonaSel(primera.id) } }}>Ir a la primera zona de la ficha</button>
    </>
    const propuesta = conciliar([ficha], existentes)[0]
    const sinNombre = /^Sin nombre \(/.test(ficha.nombre)
    const campos = camposDeRevision(ficha.categoria, ficha.datos)
    const cargar = cargarFicha(ficha)
    const delLibro = est.delLibro[ficha.id] ?? new Set<string>()
    const elegirDiferencia = (ruta: string, usarLibro: boolean) => cambiarEstado(cap.id, e => {
      const s = new Set(e.delLibro[ficha.id] ?? [])
      if (usarLibro) s.add(ruta); else s.delete(ruta)
      return { ...e, delLibro: { ...e.delLibro, [ficha.id]: s } }
    })
    return <>
      <div className="marcar__chips">
        <span className="marcar__chip">{propuesta.existente ? (propuesta.diferencias.length ? 'Diferencias con la que tenés' : propuesta.estado === 'igual' ? 'Ya la tenés igual' : 'Completa la que tenés') : 'Nueva'}</span>
      </div>
      <TextoEditable etiqueta="Nombre" valor={sinNombre ? '' : ficha.nombre} filas={1} falta={sinNombre} placeholder="Escribí el nombre"
        onCambiar={t => reemplazar({ ...z, nombre: t })} />
      {campos.map(c => <CampoFicha key={`${z.id}:${c.ruta}:${textoDeCampo(c)}`} campo={c}
        onCambiar={v => reemplazar({ ...z, ediciones: { ...(z.ediciones ?? {}), [c.ruta]: v } })}
        onMarcar={() => { setCampoAMarcar({ zona: z.id, campo: c }); setVistaMovil('pagina') }} />)}
      {propuesta.diferencias.length > 0 && <div className="marcar__difs">
        <h4>Diferencias con la ficha que ya tenés</h4>
        {propuesta.diferencias.map(d => <fieldset key={d.ruta}>
          <legend>{d.etiqueta}</legend>
          <label className={!delLibro.has(d.ruta) ? 'marcar__elegida' : undefined}><input type="radio" name={`${ficha.id}-${d.ruta}`} checked={!delLibro.has(d.ruta)} onChange={() => elegirDiferencia(d.ruta, false)} /><b>Dejar lo cargado</b><span>{mostrarValor(d.actual)}</span></label>
          <label className={delLibro.has(d.ruta) ? 'marcar__elegida' : undefined}><input type="radio" name={`${ficha.id}-${d.ruta}`} checked={delLibro.has(d.ruta)} onChange={() => elegirDiferencia(d.ruta, true)} /><b>Usar el libro</b><span>{mostrarValor(d.libro)}</span></label>
        </fieldset>)}
      </div>}
      <label className="marcar__casilla marcar__casilla--destacada">
        <input type="checkbox" checked={cargar} onChange={() => reemplazar({ ...z, cargar: !cargar })} />
        Cargarla como ficha (si no, queda como texto del capítulo)
      </label>
    </>
  }

  // ===================================================================================
  /** La vista previa de una zona (se toca para elegirla). */
  function tarjetaPrevia(z: Zona, i: number) {
    const elegida = z.id === zonaSel
    const clase = `marcar__previa${elegida ? ' marcar__previa--elegida' : ''}${avisos(z).length ? ' marcar__previa--alerta' : ''}`
    const numero = <span className={`marcar__numero marcar__numero--${z.tipo}`}>{i + 1}</span>
    if (z.tipo === 'ignorar') return <button type="button" className={`${clase} marcar__previa--ignorar`} onClick={() => setZonaSel(z.id)}>{numero}<span>{z.tituloCapitulo ? 'Título del capítulo' : 'No se agrega'}</span></button>
    if (z.tipo === 'ficha') {
      const f = fichaPorZona(z)
      return <button type="button" className={`${clase} marcar__previa--ficha`} onClick={() => setZonaSel(z.id)}>
        {numero}<span className="marcar__previa-cuerpo">
          <span><b>{f && !/^Sin nombre \(/.test(f.nombre) ? f.nombre : 'Ficha sin nombre'}</b> · {z.categoria ? UNA[z.categoria] : 'Ficha'}{f && f.id !== z.id ? ' (continuación)' : ''}{f && f.id === z.id && !cargarFicha(f) ? ' · queda como texto' : ''}</span>
          {f && f.id === z.id && <TarjetaFicha ficha={f} />}
        </span>
      </button>
    }
    return <button type="button" className={clase} onClick={() => setZonaSel(z.id)}>
      {numero}
      <span className="marcar__previa-cuerpo">{z.continua && <span className="marcar__ayuda">↳ Sigue la zona anterior</span>}{z.bloques.length ? z.bloques.map(b => <Previa key={b.id} b={b} />) : <span className="marcar__ayuda">(vacía)</span>}</span>
    </button>
  }

  function asiQueda() {
    return <section className="marcar__libro" aria-label="Así queda esta página">
      <h3 className="marcar__rotulo">Así queda esta página</h3>
      {zonasPagina.length === 0 && <p className="marcar__ayuda">No hay zonas en esta página. Si tiene texto para el libro, marcalo arrastrando sobre la página.</p>}
      {zonasPagina.map((z, i) => <div key={z.id} className="marcar__previa-fila">
        {tarjetaPrevia(z, i)}
        <div className="marcar__previa-acciones" role="group" aria-label={`Zona ${i + 1}`}>
          <button type="button" aria-label={`Subir la zona ${i + 1}`} title="Subir" disabled={i === 0} onClick={() => moverZona(z, -1)}><ArrowUp size={14} aria-hidden="true" /></button>
          <button type="button" aria-label={`Bajar la zona ${i + 1}`} title="Bajar" disabled={i === zonasPagina.length - 1} onClick={() => moverZona(z, 1)}><ArrowDown size={14} aria-hidden="true" /></button>
          <button type="button" className={`marcar__previa-borrar${porBorrarZona === z.id ? ' marcar__previa-borrar--armado' : ''}`}
            aria-label={porBorrarZona === z.id ? `Tocá de nuevo para borrar la zona ${i + 1}` : `Borrar la zona ${i + 1}`}
            title={porBorrarZona === z.id ? 'Tocá de nuevo para borrar' : 'Borrar (no se agrega al libro)'}
            onClick={() => { if (porBorrarZona === z.id) { setPorBorrarZona(null); borrar(z) } else setPorBorrarZona(z.id) }}
            onBlur={() => { if (porBorrarZona === z.id) setPorBorrarZona(null) }}>
            <Trash2 size={14} aria-hidden="true" />{porBorrarZona === z.id && <span>¿Borrar?</span>}
          </button>
        </div>
      </div>)}
      {fichasCapitulo.length > 0 && <details className="marcar__fichas-cap">
        <summary>Fichas de todo el capítulo ({cargadas} de {fichasCapitulo.length} se cargan)</summary>
        <ul>
          {fichasCapitulo.map(f => {
            const z = est.zonas.find(x => x.id === f.id)
            return <li key={f.id}>
              <label className="marcar__casilla">
                <input type="checkbox" checked={cargarFicha(f)} onChange={() => (z ? reemplazar({ ...z, cargar: !cargarFicha(f) }) : cambiarEstado(cap.id, e => ({ ...e, cargarTexto: { ...e.cargarTexto, [claveFicha(f)]: !cargarFicha(f) } })))} />
                <span>{/^Sin nombre \(/.test(f.nombre) ? 'Sin nombre' : f.nombre} · {UNA[f.categoria]}{f.dudas.length ? ' ⚠' : ''}</span>
              </label>
              {z && <button type="button" className="marcar__enlace" onClick={() => { setPagina(z.pagina); setZonaSel(z.id) }}>Ver</button>}
            </li>
          })}
        </ul>
      </details>}
    </section>
  }
}

// =====================================================================================
/** Cómo se ve un bloque en el libro (resumido). */
function Previa({ b }: { b: Bloque }) {
  switch (b.tipo) {
    case 'titulo': return <span className="marcar__p-titulo">{b.texto}</span>
    case 'subtitulo': return <span className="marcar__p-subtitulo">{b.texto}</span>
    case 'recuadro': return <span className="marcar__p-recuadro">{b.titulo && <b>{b.titulo}</b>}{b.texto.split(/\n\s*\n/).map((t, i) => <span key={i}>{formatoEnLinea(t)}</span>)}</span>
    case 'tabla': return <span className="marcar__p-tabla">{b.titulo && <b>{b.titulo}</b>}
      <span className="marcar__p-tabla-caja"><table>
        <thead><tr>{b.columnas.map((c, i) => <th key={i} scope="col">{c}</th>)}</tr></thead>
        <tbody>{b.filas.map((f, i) => <tr key={i}>{f.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table></span></span>
    case 'termino': return <span className="marcar__p-texto"><b>{b.termino}</b> {formatoEnLinea(b.texto)}</span>
    default: {
      const texto = textoBloque(b)
      return <span className="marcar__p-texto">{texto.split(/\n\s*\n/).map((t, i) => <span key={i}>{formatoEnLinea(t)}</span>)}</span>
    }
  }
}

/** La ficha como queda: sus campos con valor, para leerla de corrido. */
function TarjetaFicha({ ficha }: { ficha: FichaDetectada }) {
  const campos = camposDeRevision(ficha.categoria, ficha.datos).filter(c => c.ruta !== 'nombre' && !['', '—'].includes(mostrarValor(c.valor).trim()))
  if (!campos.length) return null
  // Listas de textos largos (beneficios, rasgos): uno por renglón.
  const largos = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string') && v.some(x => x.length > 40)
  return <dl className="marcar__tarjeta">
    {campos.map(c => <div key={c.ruta}><dt>{c.etiqueta}</dt>
      <dd>{largos(c.valor) ? <ul>{c.valor.map((x, i) => <li key={i}>{formatoEnLinea(mostrarValor(x))}</li>)}</ul> : formatoEnLinea(mostrarValor(c.valor))}</dd></div>)}
  </dl>
}

/** Texto que se corrige y se guarda al salir del campo (o con Enter, si es de un renglón). */
function TextoEditable({ etiqueta, valor, filas, ayuda, falta, placeholder, onCambiar }: {
  etiqueta: string; valor: string; filas: number; ayuda?: string; falta?: boolean; placeholder?: string; onCambiar: (t: string) => void
}) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  const id = useRef(`marcar-${nuevoId()}`).current
  const guardar = () => { if (texto !== valor) onCambiar(texto) }
  return <div className="marcar__campo">
    <label htmlFor={id}>{etiqueta}</label>
    {filas === 1
      ? <input id={id} type="text" value={texto} placeholder={placeholder} className={falta && !texto.trim() ? 'marcar__falta' : undefined}
          onChange={e => setTexto(e.target.value)} onBlur={guardar} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardar() } }} />
      : <textarea id={id} rows={Math.min(14, Math.max(filas, Math.ceil(texto.length / 60)))} value={texto} onChange={e => setTexto(e.target.value)} onBlur={guardar} />}
    {ayuda && <p className="marcar__ayuda">{ayuda}</p>}
  </div>
}

function Celda({ valor, etiqueta, onCambiar }: { valor: string; etiqueta: string; onCambiar: (v: string) => void }) {
  const [texto, setTexto] = useState(valor)
  useEffect(() => setTexto(valor), [valor])
  return <input type="text" aria-label={etiqueta} value={texto} onChange={e => setTexto(e.target.value)} onBlur={() => { if (texto !== valor) onCambiar(texto) }} />
}

/** Un campo de la ficha: se escribe o se marca en la página. */
function CampoFicha({ campo, onCambiar, onMarcar }: { campo: CampoRevision; onCambiar: (v: unknown) => void; onMarcar: () => void }) {
  const inicial = textoDeCampo(campo)
  const [texto, setTexto] = useState(inicial)
  const id = useRef(`marcar-${nuevoId()}`).current
  const guardar = () => { if (texto !== inicial) onCambiar(valorDeTexto(campo, texto)) }
  return <div className="marcar__campo">
    <div className="marcar__campo-cabecera">
      <label htmlFor={id}>{campo.etiqueta}</label>
      {campo.editable && <button type="button" className="marcar__enlace" onClick={onMarcar}><Crosshair size={13} aria-hidden="true" />Marcar en la página</button>}
    </div>
    {!campo.editable ? <p id={id} className="marcar__solo-lectura">{mostrarValor(campo.valor)}</p>
      : campo.forma === 'linea' || campo.forma === 'lista-comas'
        ? <input id={id} type="text" value={texto} onChange={e => setTexto(e.target.value)} onBlur={guardar} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardar() } }} />
        : <textarea id={id} rows={Math.min(8, Math.max(3, Math.ceil(texto.length / 60)))} value={texto} onChange={e => setTexto(e.target.value)} onBlur={guardar} />}
  </div>
}

// =====================================================================================
type Arrastre =
  | { tipo: 'dibujar'; x0: number; y0: number; x1: number; y1: number }
  | { tipo: 'esquina'; zona: Zona; esquina: 'no' | 'ne' | 'so' | 'se'; rect: Rect }
  | { tipo: 'corte'; zona: Zona; indice: number; x: number }

/**
 * La página real con las zonas encima. Se arrastra para dibujar una zona nueva; la zona elegida
 * tiene esquinas para agrandarla o achicarla; en una tabla, los cortes de columna se arrastran.
 */
function VisorZonas({ pdf, pagina, zonas, seleccionada, avisos, dibujando, onElegir, onDibujar, onRedimensionar, onCortes }: {
  pdf: PdfAbierto; pagina: number; zonas: Zona[]; seleccionada: string | null; avisos: (z: Zona) => string[]; dibujando: boolean
  onElegir: (id: string | null) => void; onDibujar: (r: Rect) => void; onRedimensionar: (z: Zona, r: Rect) => void; onCortes: (z: Zona, cortes: number[]) => void
}) {
  const contenedor = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const capa = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [dibujo, setDibujo] = useState<{ escala: number; ancho: number; alto: number } | null>(null)
  const [arrastre, setArrastre] = useState<Arrastre | null>(null)

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const medir = () => setAncho(Math.max(260, Math.min(el.clientWidth - 40, 1500)))
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [])
  useEffect(() => {
    if (!ancho || !lienzo.current) return
    let vigente = true
    pdf.dibujar(pagina, lienzo.current, Math.round(ancho * zoom)).then(r => { if (vigente && r) setDibujo(r) }).catch(() => {})
    return () => { vigente = false }
  }, [pdf, pagina, ancho, zoom])

  const escala = dibujo?.escala ?? 1
  /** Punto del puntero en puntos del PDF. */
  const punto = (e: { clientX: number; clientY: number }) => {
    const caja = capa.current!.getBoundingClientRect()
    return { x: (e.clientX - caja.left) / escala, y: (e.clientY - caja.top) / escala }
  }
  const empezar = (e: EventoPuntero<HTMLElement>) => {
    const p = punto(e)
    capa.current!.setPointerCapture(e.pointerId)
    setArrastre({ tipo: 'dibujar', x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }
  const empezarDibujo = (e: EventoPuntero<HTMLDivElement>) => {
    if (e.target !== capa.current || e.button !== 0) return
    empezar(e)
    onElegir(null)
  }
  /** Dentro de la zona elegida (o al marcar un campo) se arrastra para marcar otra zona encima. */
  const dobleClic = (e: { clientX: number; clientY: number }) => {
    const p = punto(e)
    const z = zonas.find(x => x.id === seleccionada && x.tipo === 'tabla' && p.x > x.x0 && p.x < x.x1 && p.y > x.y0 && p.y < x.y1)
    if (z) onCortes(z, [...(z.cortes ?? []), p.x].sort((a, b) => a - b))
  }
  const mover = (e: EventoPuntero<HTMLDivElement>) => {
    if (!arrastre) return
    const p = punto(e)
    if (arrastre.tipo === 'dibujar') setArrastre({ ...arrastre, x1: p.x, y1: p.y })
    else if (arrastre.tipo === 'corte') setArrastre({ ...arrastre, x: Math.max(arrastre.zona.x0 + 4, Math.min(arrastre.zona.x1 - 4, p.x)) })
    else {
      const r = { ...arrastre.rect }
      if (arrastre.esquina.includes('n')) r.y0 = Math.min(p.y, r.y1 - 6); else r.y1 = Math.max(p.y, r.y0 + 6)
      if (arrastre.esquina.includes('o')) r.x0 = Math.min(p.x, r.x1 - 6); else r.x1 = Math.max(p.x, r.x0 + 6)
      setArrastre({ ...arrastre, rect: r })
    }
  }
  const soltar = () => {
    const a = arrastre
    setArrastre(null)
    if (!a) return
    if (a.tipo === 'dibujar') {
      const r = { x0: Math.min(a.x0, a.x1), y0: Math.min(a.y0, a.y1), x1: Math.max(a.x0, a.x1), y1: Math.max(a.y0, a.y1) }
      if (r.x1 - r.x0 > 8 && r.y1 - r.y0 > 6) onDibujar(r)
    } else if (a.tipo === 'esquina') onRedimensionar(a.zona, a.rect)
    else onCortes(a.zona, (a.zona.cortes ?? []).map((c, i) => (i === a.indice ? a.x : c)))
  }

  const estilo = (r: Rect) => ({ left: r.x0 * escala, top: r.y0 * escala, width: (r.x1 - r.x0) * escala, height: (r.y1 - r.y0) * escala })
  const dibujoActual = arrastre?.tipo === 'dibujar' ? { x0: Math.min(arrastre.x0, arrastre.x1), y0: Math.min(arrastre.y0, arrastre.y1), x1: Math.max(arrastre.x0, arrastre.x1), y1: Math.max(arrastre.y0, arrastre.y1) } : null

  return <div className="marcar__visor">
    <div className="marcar__zoom">
      <button type="button" className="marcar__icono" aria-label="Alejar" disabled={zoom <= 0.6} onClick={() => setZoom(z => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))}><Minus size={16} aria-hidden="true" /></button>
      <span aria-live="polite">{Math.round(zoom * 100)} %</span>
      <button type="button" className="marcar__icono" aria-label="Acercar" disabled={zoom >= 2.4} onClick={() => setZoom(z => Math.min(2.4, Math.round((z + 0.2) * 10) / 10))}><Plus size={16} aria-hidden="true" /></button>
    </div>
    <div ref={contenedor} className="marcar__area">
      <div className="marcar__hoja" style={dibujo ? { width: dibujo.ancho, height: dibujo.alto } : undefined}>
        <canvas ref={lienzo} role="img" aria-label={`Página ${pagina} del PDF`} />
        <div ref={capa} className={`marcar__capa${dibujando ? ' marcar__capa--campo' : ''}`} onPointerDown={empezarDibujo} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => setArrastre(null)} onDoubleClick={dobleClic}>
          {dibujo && zonas.map((z, i) => {
            const elegida = z.id === seleccionada
            const rect = arrastre?.tipo === 'esquina' && arrastre.zona.id === z.id ? arrastre.rect : z
            const hayAvisos = avisos(z).length > 0
            return <div key={z.id} className={`marcar__marco marcar__marco--${z.tipo}${elegida ? ' marcar__marco--elegido' : ''}`} style={estilo(rect)}>
              <button type="button" className="marcar__marco-boton" aria-label={`Zona ${i + 1}: ${NOMBRE_TIPO[z.tipo]}${hayAvisos ? ', con avisos' : ''}`}
                onPointerDown={e => { e.stopPropagation(); if ((elegida || dibujando) && e.button === 0) empezar(e) }} onClick={() => onElegir(z.id)} />
              <span className={`marcar__etiqueta marcar__etiqueta--${z.tipo}`}>{z.continua ? '↳ ' : ''}{i + 1}{elegida ? ` · ${NOMBRE_TIPO[z.tipo]}${z.continua ? ' (sigue la anterior)' : ''}` : ''}</span>
              {hayAvisos && <span className="marcar__alerta" aria-hidden="true">!</span>}
              {elegida && (['no', 'ne', 'so', 'se'] as const).map(esq => <span key={esq} className={`marcar__esquina marcar__esquina--${esq}`} role="presentation"
                onPointerDown={e => { e.stopPropagation(); capa.current!.setPointerCapture(e.pointerId); setArrastre({ tipo: 'esquina', zona: z, esquina: esq, rect: { x0: z.x0, y0: z.y0, x1: z.x1, y1: z.y1 } }) }} />)}
              {elegida && z.tipo === 'tabla' && (z.cortes ?? []).map((c, k) => {
                const x = arrastre?.tipo === 'corte' && arrastre.zona.id === z.id && arrastre.indice === k ? arrastre.x : c
                return <span key={k} className="marcar__corte" style={{ left: (x - rect.x0) * escala }}>
                  <span className="marcar__corte-agarre" role="presentation" onPointerDown={e => { e.stopPropagation(); capa.current!.setPointerCapture(e.pointerId); setArrastre({ tipo: 'corte', zona: z, indice: k, x: c }) }} />
                  <button type="button" className="marcar__corte-quitar" aria-label={`Quitar el corte de columna ${k + 1}`} onPointerDown={e => e.stopPropagation()}
                    onClick={() => onCortes(z, (z.cortes ?? []).filter((_, j) => j !== k))}>×</button>
                </span>
              })}
            </div>
          })}
          {dibujoActual && <div className="marcar__dibujo" style={estilo(dibujoActual)} />}
        </div>
      </div>
    </div>
  </div>
}
