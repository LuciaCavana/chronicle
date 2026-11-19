import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle, BookOpen, Check, ChevronLeft, ChevronRight, Circle, Crosshair, FileText, Keyboard, Merge, Minus, Plus, Scissors, Trash2,
} from 'lucide-react'
import type { Area } from '../../../lib/analizarPdf'
import type { PdfAbierto } from '../../../lib/importarPdf'
import type { Correccion } from '../../../lib/pegarDesdeLibro'
import { claveNombre, type Existentes, type Propuesta } from '../../../lib/conciliarFichas'
import { textoOriginal, TITULO_CATEGORIA, type CategoriaFicha, type FichaDetectada } from '../../../lib/fichasLibro'
import {
  agruparZonas, camposDeRevision, dudasDeBloque, mostrarValor, nombreVisible, textoDeCampo, UNA, valorDeTexto, zonasDeCampo,
  type Ajuste, type CampoRevision, type Decision, type Eleccion,
} from '../../../lib/revisionImportacion'
import { convertirBloque, nuevoId, textoBloque, TIPOS_BLOQUE, type Bloque, type Capitulo, type TipoBloque } from '../../../types/capitulo'
import '../../../styles/biblioteca/RevisarImportacion.css'

type Props = {
  archivo: string
  pdf: PdfAbierto
  capitulos: Capitulo[]
  elegidos: Set<string>
  onElegidos: (s: Set<string>) => void
  onCapitulos: (c: Capitulo[]) => void
  faltan: Record<string, string[]>
  correcciones: Correccion[]
  areas: Record<string, Area[]>
  /** Fichas de los capítulos elegidos, ya con las correcciones aplicadas. */
  propuestas: Propuesta[]
  eleccion: Eleccion
  onEleccion: (e: Eleccion) => void
  existentes: Existentes
  onVolver: () => void
  onCancelar: () => void
  onAgregar: () => void
}

type Seleccion = { tipo: 'ficha'; id: string } | { tipo: 'capitulo'; id: string } | { tipo: 'correcciones' }
type Item = { clave: string; sel: Seleccion; nombre: string; detalle: string; problema: boolean; grupo: string }
/** Un marco sobre la página. La etiqueta es un número (bloque) o un nombre (ficha, solo en su primer marco). */
type Marca = { area: Area; tono: 'ficha' | 'foco' | 'tenue' | 'alerta'; etiqueta?: string; numero?: boolean; onElegir?: () => void }

const ORDEN: CategoriaFicha[] = ['clases', 'subclases', 'especies', 'trasfondos', 'dotes', 'objetos', 'conjuros', 'criaturas']
const DECISIONES: { valor: Decision; texto: string; ayuda: string }[] = [
  { valor: 'ficha', texto: 'Cargar como ficha', ayuda: 'Se crea o se completa la ficha y el capítulo la muestra' },
  { valor: 'texto', texto: 'Dejar como texto', ayuda: 'El texto queda en el capítulo, sin ficha' },
  { valor: 'quitar', texto: 'No incluir', ayuda: 'No se carga ni queda en el capítulo' },
]
const ESTADOS: Record<Propuesta['estado'], string> = { nueva: 'Nueva', completar: 'Completa datos', diferencias: 'Diferencias con lo cargado', igual: 'Ya cargada' }
const primeraPagina = (lista: Area[]) => lista.reduce((m, a) => Math.min(m, a.pagina), Infinity)
/** Motivo corto para la lista («falta el nombre», «Sin equipo»). */
const motivoCorto = (duda: string) => (/^No se encontró el nombre/.test(duda) ? 'falta el nombre' : duda)
const claveDe = (s: Seleccion) => (s.tipo === 'correcciones' ? 'correcciones' : `${s.tipo}:${s.id}`)

/**
 * Revisar lo que se leyó del PDF al lado de la página real: a la izquierda la lista de lo que
 * hay que mirar (primero lo dudoso), en el centro la página con marcos sobre lo leído y a la
 * derecha lo leído para corregir. Al final, un resumen antes de agregar al libro.
 */
export default function RevisarImportacion(props: Props) {
  const { pdf, capitulos, elegidos, faltan, correcciones, propuestas, eleccion, onEleccion, existentes } = props
  const [paso, setPaso] = useState<'revisar' | 'resumen'>('revisar')
  const [filtro, setFiltro] = useState<'problemas' | 'pendientes' | 'todo'>('problemas')
  const [revisados, setRevisados] = useState<Set<string>>(new Set())
  const [vistaMovil, setVistaMovil] = useState<'pagina' | 'datos'>('datos')
  const [foco, setFoco] = useState<Area[]>([])
  const [bloqueSel, setBloqueSel] = useState<string | null>(null)
  const [areasExtra, setAreasExtra] = useState<Record<string, Area[]>>({})
  const raiz = useRef<HTMLDivElement>(null)

  // Mientras está abierta, la página de atrás no se desplaza.
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    raiz.current?.focus()
    return () => { document.body.style.overflow = antes }
  }, [])

  const zonas = (id: string) => [...(props.areas[id] ?? []), ...(areasExtra[id] ?? [])]
  const zonasFicha = (f: FichaDetectada) => {
    const propias = zonas(f.id)
    return propias.length ? propias : f.original.flatMap(b => zonas(b.id))
  }
  const decisionDe = (id: string): Decision => eleccion.decision[id] ?? 'texto'

  // ---------- Lista de lo que hay que revisar ----------
  const elegidosLista = capitulos.filter(c => elegidos.has(c.id))
  const items = useMemo<Item[]>(() => {
    const lista: Item[] = []
    for (const p of propuestas) {
      const f = p.ficha
      // Dudoso: el motor no está seguro, o el libro dice algo distinto de la ficha que ya tenés.
      const problema = f.dudas.length > 0 || p.diferencias.length > 0
      const pag = primeraPagina(zonasFicha(f))
      const motivo = f.dudas[0] ? motivoCorto(f.dudas[0]) : p.diferencias.length ? `${p.diferencias.length === 1 ? '1 diferencia' : `${p.diferencias.length} diferencias`} con lo cargado` : ESTADOS[p.estado]
      const detalle = `${Number.isFinite(pag) ? `Pág. ${pag} · ` : ''}${motivo}`
      lista.push({ clave: `ficha:${f.id}`, sel: { tipo: 'ficha', id: f.id }, nombre: nombreVisible(f, eleccion.ajustes[f.id]?.nombre), detalle, problema, grupo: f.categoria })
    }
    for (const c of capitulos) {
      const sospechosos = c.bloques.filter(b => dudasDeBloque(b).length).length
      const sinEncontrar = faltan[c.id]?.length ?? 0
      const detalle = sinEncontrar ? `Faltan ${sinEncontrar} secciones del índice` : sospechosos ? `${sospechosos} bloques para mirar` : c.bloques.length === 1 ? '1 bloque' : `${c.bloques.length} bloques`
      lista.push({ clave: `capitulo:${c.id}`, sel: { tipo: 'capitulo', id: c.id }, nombre: [c.etiqueta, c.titulo].filter(Boolean).join(': ') || 'Capítulo', detalle, problema: !!(sinEncontrar || sospechosos), grupo: 'capitulos' })
    }
    if (correcciones.length) {
      const veces = correcciones.reduce((n, c) => n + c.veces, 0)
      lista.push({ clave: 'correcciones', sel: { tipo: 'correcciones' }, nombre: 'Correcciones del escaneo', detalle: `${veces} cambios automáticos`, problema: true, grupo: 'escaneo' })
    }
    return lista
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propuestas, capitulos, faltan, correcciones, eleccion.ajustes, props.areas, areasExtra])

  // Lo que empezó dudoso sigue en «Para revisar» aunque ya se haya corregido (con su marca de revisado).
  const [dudososAlEmpezar] = useState(() => new Set(items.filter(i => i.problema).map(i => i.clave)))
  const esProblema = (i: Item) => i.problema || dudososAlEmpezar.has(i.clave)
  const problemas = items.filter(esProblema)
  const pendientes = items.filter(i => !revisados.has(i.clave))
  // Orden de recorrido: primero lo dudoso, después el resto en el orden del libro.
  const recorrido = [...problemas, ...items.filter(i => !esProblema(i))]
  const visibles = filtro === 'problemas' ? problemas : filtro === 'pendientes' ? pendientes : recorrido

  const [sel, setSel] = useState<Seleccion | null>(() => (recorrido[0]?.sel ?? null))
  const actual = sel ? items.find(i => i.clave === claveDe(sel)) ?? null : null
  useEffect(() => { if (!actual && recorrido[0]) setSel(recorrido[0].sel) }, [actual, recorrido])

  const propuesta = sel?.tipo === 'ficha' ? propuestas.find(p => p.ficha.id === sel.id) ?? null : null
  const capitulo = sel?.tipo === 'capitulo' ? capitulos.find(c => c.id === sel.id) ?? null : null

  // ---------- Página que se muestra ----------
  const zonasActuales = useMemo<Area[]>(() => {
    if (propuesta) return zonasFicha(propuesta.ficha)
    if (capitulo) return capitulo.bloques.flatMap(b => b.tipo === 'fichas'
      ? propuestas.filter(p => b.ids.includes(p.ficha.id)).flatMap(p => zonasFicha(p.ficha)).concat(zonas(b.id))
      : zonas(b.id))
    return []
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propuesta, capitulo, propuestas, props.areas, areasExtra])
  const [pagina, setPagina] = useState(() => { const p = primeraPagina(zonasActuales); return Number.isFinite(p) ? p : 1 })
  useEffect(() => {
    const p = primeraPagina(zonasActuales)
    if (Number.isFinite(p)) setPagina(p)
    setFoco([]); setBloqueSel(null)
  // Solo al cambiar de elemento.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel && claveDe(sel)])

  const mirar = (lista: Area[]) => {
    setFoco(lista)
    const p = primeraPagina(lista)
    if (Number.isFinite(p)) setPagina(p)
    setVistaMovil('pagina')
  }

  const marcas: Marca[] = []
  if (propuesta) {
    const tono = propuesta.ficha.dudas.length ? 'alerta' : 'ficha'
    agruparZonas(zonasFicha(propuesta.ficha)).forEach((a, n) => marcas.push({ area: a, tono, etiqueta: n ? undefined : nombreVisible(propuesta.ficha, eleccion.ajustes[propuesta.ficha.id]?.nombre) }))
  } else if (capitulo) {
    capitulo.bloques.forEach((b, i) => {
      if (b.tipo === 'fichas') {
        // Cada ficha del bloque con su nombre; al tocarla se abre para revisarla.
        for (const p of propuestas.filter(x => b.ids.includes(x.ficha.id))) {
          agruparZonas(zonasFicha(p.ficha)).forEach((a, n) => marcas.push({
            area: a, tono: p.ficha.dudas.length ? 'alerta' : 'tenue', etiqueta: n ? undefined : nombreVisible(p.ficha, eleccion.ajustes[p.ficha.id]?.nombre),
            onElegir: () => elegir({ tipo: 'ficha', id: p.ficha.id }),
          }))
        }
        return
      }
      const tono = b.id === bloqueSel ? 'foco' : dudasDeBloque(b).length ? 'alerta' : 'tenue'
      agruparZonas(zonas(b.id)).forEach((a, n) => marcas.push({ area: a, tono, etiqueta: n ? undefined : String(i + 1), numero: true, onElegir: () => elegirBloque(b.id) }))
    })
  }
  for (const a of agruparZonas(foco)) marcas.push({ area: a, tono: 'foco' })

  // ---------- Navegación ----------
  function elegir(s: Seleccion) { setSel(s); setVistaMovil('datos') }
  function mover(delta: number) {
    const lista = visibles.length ? visibles : recorrido
    const i = lista.findIndex(x => sel && x.clave === claveDe(sel))
    const destino = lista[Math.max(0, Math.min(lista.length - 1, i + delta))]
    if (destino) elegir(destino.sel)
  }
  function confirmarYSeguir() {
    if (!sel) return
    const hechos = new Set(revisados).add(claveDe(sel))
    setRevisados(hechos)
    // Primero el próximo dudoso sin revisar; si no queda ninguno, el próximo sin revisar.
    const i = recorrido.findIndex(x => x.clave === claveDe(sel))
    const resto = [...recorrido.slice(i + 1), ...recorrido.slice(0, i)].filter(x => !hechos.has(x.clave))
    const siguiente = resto.find(esProblema) ?? resto[0]
    if (siguiente) elegir(siguiente.sel)
    else setPaso('resumen')
  }
  function teclas(e: KeyboardEvent<HTMLDivElement>) {
    const objetivo = e.target as HTMLElement
    if (paso !== 'revisar' || e.ctrlKey || e.metaKey || e.altKey || objetivo.closest('input, textarea, select, button, a, summary, [contenteditable]')) return
    if (e.key === 'j' || e.key === 'J') { e.preventDefault(); mover(1) }
    else if (e.key === 'k' || e.key === 'K') { e.preventDefault(); mover(-1) }
    else if (e.key === 'Enter') { e.preventDefault(); confirmarYSeguir() }
  }

  // ---------- Cambios en fichas ----------
  const cambiar = (e: Partial<Eleccion>) => onEleccion({ ...eleccion, ...e })
  const decidir = (id: string, d: Decision) => cambiar({ decision: { ...eleccion.decision, [id]: d } })
  const ajustar = (f: FichaDetectada, a: Partial<Ajuste>) => {
    const previo = eleccion.ajustes[f.id] ?? { categoria: f.categoria, nombre: /^Sin nombre \(/.test(f.nombre) ? '' : f.nombre }
    cambiar({ ajustes: { ...eleccion.ajustes, [f.id]: { ...previo, ...a } } })
  }
  const editar = (id: string, ruta: string, valor: unknown) => cambiar({ ediciones: { ...eleccion.ediciones, [id]: { ...(eleccion.ediciones[id] ?? {}), [ruta]: valor } } })
  const elegirDiferencia = (id: string, ruta: string, delLibro: boolean) => {
    const conjunto = new Set(eleccion.delLibro[id] ?? [])
    if (delLibro) conjunto.add(ruta); else conjunto.delete(ruta)
    cambiar({ delLibro: { ...eleccion.delLibro, [id]: conjunto } })
  }

  // ---------- Cambios en capítulos ----------
  const conCapitulo = (id: string, cambio: (c: Capitulo) => Capitulo) => props.onCapitulos(capitulos.map(c => (c.id === id ? cambio(c) : c)))
  const conBloques = (id: string, cambio: (b: Bloque[]) => Bloque[]) => conCapitulo(id, c => ({ ...c, bloques: cambio(c.bloques) }))
  function elegirBloque(id: string) {
    setBloqueSel(id)
    const b = capitulo?.bloques.find(x => x.id === id)
    const lista = b?.tipo === 'fichas' ? propuestas.filter(p => b.ids.includes(p.ficha.id)).flatMap(p => zonasFicha(p.ficha)) : zonas(id)
    const p = primeraPagina(lista)
    if (Number.isFinite(p)) setPagina(p)
    document.getElementById(`revimp-bloque-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  // ---------- Resumen ----------
  const fichasCargadas = propuestas.filter(p => decisionDe(p.ficha.id) === 'ficha')
  const cuenta = {
    nuevas: fichasCargadas.filter(p => !p.existente).length,
    completan: fichasCargadas.filter(p => p.existente && p.estado !== 'igual').length,
    texto: propuestas.filter(p => decisionDe(p.ficha.id) === 'texto').length,
    quitar: propuestas.filter(p => decisionDe(p.ficha.id) === 'quitar').length,
  }
  const sinRevisar = problemas.filter(i => !revisados.has(i.clave))

  const nombreArchivo = props.archivo.replace(/\.pdf$/i, '')
  // Se dibuja directamente en <body>: así no hereda los estilos de botones y campos del editor.
  return createPortal(<div ref={raiz} className="revimp" role="dialog" aria-modal="true" aria-labelledby="revimp-titulo" tabIndex={-1} onKeyDown={teclas}>
    <header className="revimp__cabecera">
      <div className="revimp__titulo">
        <span className="revimp__antetitulo">Importar desde PDF</span>
        <h2 id="revimp-titulo">{nombreArchivo}</h2>
      </div>
      <ol className="revimp__pasos" aria-label="Pasos">
        <li className="revimp__paso revimp__paso--hecho"><button type="button" onClick={props.onVolver}><span aria-hidden="true"><Check size={13} /></span>Elegir PDF</button></li>
        <li className={`revimp__paso${paso === 'revisar' ? ' revimp__paso--actual' : ' revimp__paso--hecho'}`} aria-current={paso === 'revisar' ? 'step' : undefined}>
          <button type="button" onClick={() => setPaso('revisar')}><span aria-hidden="true">{paso === 'resumen' ? <Check size={13} /> : 2}</span>Revisar</button>
        </li>
        <li className={`revimp__paso${paso === 'resumen' ? ' revimp__paso--actual' : ''}`} aria-current={paso === 'resumen' ? 'step' : undefined}>
          <button type="button" onClick={() => setPaso('resumen')}><span aria-hidden="true">3</span>Agregar al libro</button>
        </li>
      </ol>
      <div className="revimp__acciones">
        <button type="button" className="revimp__boton" onClick={props.onCancelar}>Cancelar</button>
        {paso === 'revisar'
          ? <button type="button" className="revimp__boton revimp__boton--primario" onClick={() => setPaso('resumen')}>Agregar al libro</button>
          : <button type="button" className="revimp__boton revimp__boton--primario" disabled={!elegidosLista.length} onClick={props.onAgregar}>Agregar {elegidosLista.length} {elegidosLista.length === 1 ? 'capítulo' : 'capítulos'} y {fichasCargadas.length} fichas</button>}
      </div>
    </header>

    {paso === 'resumen' ? resumen() : <div className={`revimp__cuerpo revimp__cuerpo--${vistaMovil}`}>
      {cola()}
      <div className="revimp__pestanias" role="tablist" aria-label="Vista">
        <button type="button" role="tab" aria-selected={vistaMovil === 'datos'} onClick={() => setVistaMovil('datos')}>Lo que se leyó</button>
        <button type="button" role="tab" aria-selected={vistaMovil === 'pagina'} onClick={() => setVistaMovil('pagina')}>Página del PDF</button>
      </div>
      <VisorPdf pdf={pdf} pagina={pagina} onPagina={setPagina} marcas={marcas} />
      <section className="revimp__panel" aria-label="Lo que se leyó">
        {propuesta ? panelFicha(propuesta)
          : capitulo ? panelCapitulo(capitulo)
          : sel?.tipo === 'correcciones' ? panelCorrecciones()
          : <p className="revimp__vacio">No hay nada para revisar.</p>}
        <div className="revimp__pie">
          <button type="button" className="revimp__boton" onClick={() => mover(-1)}><ChevronLeft size={16} aria-hidden="true" />Anterior</button>
          <button type="button" className="revimp__boton revimp__boton--primario revimp__boton--ancho" onClick={confirmarYSeguir}>Confirmar y seguir</button>
        </div>
      </section>
    </div>}
  </div>, document.body)

  // ===================================================================================
  // Las partes de la pantalla se arman con funciones (no componentes) para que escribir en un
  // campo no vuelva a montar el panel y se pierda el foco.
  function cola() {
    const grupos: { id: string; titulo: string; items: Item[] }[] = filtro === 'todo'
      ? [
          { id: 'problemas', titulo: 'Para revisar', items: problemas },
          ...ORDEN.map(c => ({ id: c, titulo: TITULO_CATEGORIA[c], items: items.filter(i => i.grupo === c && !esProblema(i)) })),
          { id: 'capitulos', titulo: 'Capítulos', items: items.filter(i => i.grupo === 'capitulos' && !esProblema(i)) },
        ].filter(g => g.items.length)
      : [{ id: filtro, titulo: filtro === 'problemas' ? 'Para revisar' : 'Sin revisar', items: visibles }]
    const hechos = items.filter(i => revisados.has(i.clave)).length
    return <aside className="revimp__cola" aria-label="Qué revisar">
      <div className="revimp__filtros" role="group" aria-label="Mostrar">
        {([['problemas', 'Dudosos', problemas.length], ['pendientes', 'Pendientes', pendientes.length], ['todo', 'Todo', items.length]] as const).map(([valor, texto, n]) =>
          <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>{texto}<span className="revimp__cuenta">{n}</span></button>)}
      </div>
      <div className="revimp__progreso">
        <div><span>Revisado</span><span>{hechos} de {items.length}</span></div>
        <progress max={Math.max(1, items.length)} value={hechos} aria-label="Elementos revisados" />
      </div>
      <div className="revimp__lista">
        {grupos.map(g => <section key={g.id} aria-label={g.titulo}>
          <h3 className="revimp__grupo"><span>{g.titulo}</span><span>{g.items.length}</span></h3>
          {!g.items.length && <p className="revimp__vacio">{filtro === 'problemas' ? 'Nada dudoso: el motor está seguro de todo.' : 'Todo revisado.'}</p>}
          <ul>
            {g.items.map(i => {
              const elegido = !!sel && i.clave === claveDe(sel)
              const hecho = revisados.has(i.clave)
              return <li key={i.clave}>
                <button type="button" className="revimp__item" aria-current={elegido ? 'true' : undefined} onClick={() => elegir(i.sel)}>
                  <span className={`revimp__estado${hecho ? ' revimp__estado--ok' : esProblema(i) ? ' revimp__estado--alerta' : ''}`} aria-hidden="true">
                    {hecho ? <Check size={15} /> : esProblema(i) ? <AlertTriangle size={15} /> : <Circle size={15} />}
                  </span>
                  <span className="revimp__item-texto">
                    <span className="revimp__item-nombre">{i.nombre}</span>
                    <span className="revimp__item-detalle">{hecho ? 'Revisado · ' : ''}{esProblema(i) && i.grupo in TITULO_CATEGORIA ? `${UNA[i.grupo as CategoriaFicha]} · ` : ''}{i.detalle}</span>
                  </span>
                </button>
              </li>
            })}
          </ul>
        </section>)}
      </div>
      <p className="revimp__atajos"><Keyboard size={15} aria-hidden="true" /><span><kbd>J</kbd> / <kbd>K</kbd> anterior y siguiente · <kbd>Enter</kbd> confirmar</span></p>
    </aside>
  }

  // ===================================================================================
  function panelFicha(p: Propuesta) {
    const f = p.ficha
    const id = f.id
    const ajuste = eleccion.ajustes[id]
    const sinNombre = /^Sin nombre \(/.test(f.nombre) && !ajuste?.nombre.trim()
    const clases = new Set([
      ...(existentes.clases ?? []).map(c => claveNombre(c.nombre)),
      ...propuestas.filter(x => x.ficha.categoria === 'clases' && decisionDe(x.ficha.id) === 'ficha').map(x => claveNombre(x.ficha.nombre)),
    ])
    const sinClase = f.categoria === 'subclases' && !p.existente && !clases.has(claveNombre(f.clase))
    const lista = camposDeRevision(f.categoria, f.datos)
    const original = textoOriginal(f.original)
    const dudasDeCampos = f.dudas.filter(d => !/nombre/i.test(d))
    return <div className="revimp__contenido">
      <div className="revimp__chips">
        <span className="revimp__chip revimp__chip--oro"><FileText size={13} aria-hidden="true" />{UNA[f.categoria]}</span>
        <span className="revimp__chip">{p.diferencias.length ? ESTADOS.diferencias : ESTADOS[p.estado]}</span>
        {f.dudas.length > 0 && <span className="revimp__chip revimp__chip--alerta"><AlertTriangle size={13} aria-hidden="true" />{f.dudas.length === 1 ? '1 problema' : `${f.dudas.length} problemas`}</span>}
      </div>
      <div className="revimp__campo">
        <label htmlFor={`revimp-nombre-${id}`}>Nombre</label>
        <input id={`revimp-nombre-${id}`} className={`revimp__nombre${sinNombre ? ' revimp__nombre--falta' : ''}`} type="text" maxLength={120}
          value={ajuste?.nombre ?? (sinNombre ? '' : f.nombre)} placeholder="Escribí el nombre"
          onChange={e => ajustar(f, { nombre: e.target.value })} />
        {sinNombre && <p className="revimp__nota revimp__nota--alerta"><AlertTriangle size={14} aria-hidden="true" />No está en el texto del PDF (puede estar sobre una ilustración). Miralo en la página y escribilo.</p>}
      </div>
      <div className="revimp__campo">
        <label htmlFor={`revimp-categoria-${id}`}>Categoría</label>
        <select id={`revimp-categoria-${id}`} value={ajuste?.categoria ?? f.categoria} onChange={e => ajustar(f, { categoria: e.target.value as CategoriaFicha })}>
          {ORDEN.map(c => <option key={c} value={c}>{UNA[c]}</option>)}
        </select>
        {f.clase && <p className="revimp__nota">Subclase de {f.clase}.</p>}
      </div>
      {dudasDeCampos.length > 0 && <ul className="revimp__dudas">{dudasDeCampos.map(d => <li key={d}><AlertTriangle size={14} aria-hidden="true" />{d}</li>)}</ul>}

      {lista.map(c => <CampoEditable key={`${id}:${c.ruta}`} ficha={f} campo={c} onCambiar={v => editar(id, c.ruta, v)} onMirar={() => mirar(zonasDeCampo(f, c.valor))} />)}
      {!lista.length && <p className="revimp__nota">No se leyeron datos: se crea con el nombre y lo demás se completa en la ficha.</p>}

      {p.completar.length > 0 && <div className="revimp__bloque-info">
        <h4>Datos que se completan en la ficha que ya tenés</h4>
        <ul>{p.completar.map(c => <li key={c.ruta}><b>{c.etiqueta}:</b> {mostrarValor(c.libro)}</li>)}</ul>
      </div>}
      {p.diferencias.length > 0 && <div className="revimp__bloque-info">
        <h4>Diferencias con la ficha que ya tenés</h4>
        {p.diferencias.map(d => {
          const delLibro = eleccion.delLibro[id]?.has(d.ruta) ?? false
          return <fieldset key={d.ruta} className="revimp__diferencia">
            <legend>{d.etiqueta}</legend>
            <label className={!delLibro ? 'revimp__elegida' : undefined}><input type="radio" name={`${id}-${d.ruta}`} checked={!delLibro} onChange={() => elegirDiferencia(id, d.ruta, false)} /><b>Dejar lo cargado</b><span>{mostrarValor(d.actual)}</span></label>
            <label className={delLibro ? 'revimp__elegida' : undefined}><input type="radio" name={`${id}-${d.ruta}`} checked={delLibro} onChange={() => elegirDiferencia(id, d.ruta, true)} /><b>Usar el libro</b><span>{mostrarValor(d.libro)}</span></label>
          </fieldset>
        })}
      </div>}

      <fieldset className="revimp__decision">
        <legend>Qué hacer con esto</legend>
        {DECISIONES.map(d => <label key={d.valor} className={decisionDe(id) === d.valor ? 'revimp__opcion revimp__opcion--elegida' : 'revimp__opcion'}>
          <input type="radio" name={`decision-${id}`} checked={decisionDe(id) === d.valor} disabled={d.valor === 'ficha' && sinClase} onChange={() => decidir(id, d.valor)} />
          <span><span>{d.texto}</span><span className="revimp__ayuda">{d.ayuda}</span></span>
        </label>)}
        {sinClase && <p className="revimp__nota revimp__nota--alerta">No se puede crear: su clase «{f.clase}» no está cargada ni se va a crear.</p>}
      </fieldset>
      {original && <details className="revimp__original">
        <summary>Texto original del libro</summary>
        <p>{original}</p>
      </details>}
    </div>
  }

  // ===================================================================================
  function panelCapitulo(c: Capitulo) {
    const sinEncontrar = faltan[c.id] ?? []
    const incluido = elegidos.has(c.id)
    const tipos = TIPOS_BLOQUE.filter(t => t.tipo !== 'fichas')
    const cambiarTipo = (b: Bloque, tipo: TipoBloque) => conBloques(c.id, bs => bs.map(x => (x.id === b.id ? convertirBloque(x, tipo) : x)))
    const unir = (i: number) => {
      const previo = c.bloques[i - 1]
      const actualB = c.bloques[i]
      if (!previo || !('texto' in previo) || actualB.tipo === 'fichas') return
      const unido = { ...previo, texto: `${previo.texto}\n\n${actualB.tipo === 'termino' ? `**${actualB.termino}** ${actualB.texto}` : textoBloque(actualB)}`.trim() } as Bloque
      setAreasExtra(a => ({ ...a, [previo.id]: [...(a[previo.id] ?? []), ...zonas(actualB.id)] }))
      conBloques(c.id, bs => bs.filter(x => x.id !== actualB.id).map(x => (x.id === previo.id ? unido : x)))
    }
    const separar = (b: Bloque) => {
      if (b.tipo !== 'parrafo') return
      const partes = b.texto.split(/\n\s*\n/).map(t => t.trim()).filter(Boolean)
      if (partes.length < 2) return
      const nuevos: Bloque[] = partes.map((t, n) => ({ id: n ? nuevoId() : b.id, tipo: 'parrafo', texto: t }))
      setAreasExtra(a => ({ ...a, ...Object.fromEntries(nuevos.slice(1).map(x => [x.id, zonas(b.id)])) }))
      conBloques(c.id, bs => bs.flatMap(x => (x.id === b.id ? nuevos : [x])))
    }
    // Un título pegado al párrafo: lo seleccionado pasa a ser título y el resto queda antes y después.
    const separarSeleccion = (b: Bloque, texto: string, inicio: number, fin: number, tipo: 'titulo' | 'subtitulo') => {
      const elegido = texto.slice(inicio, fin).trim()
      if (!elegido) return
      const antes = texto.slice(0, inicio).trim()
      const despues = texto.slice(fin).replace(/^[.:]\s*/, '').trim()
      const nuevos: Bloque[] = []
      if (antes) nuevos.push({ id: b.id, tipo: 'parrafo', texto: antes })
      const tituloB: Bloque = { id: antes ? nuevoId() : b.id, tipo, texto: elegido.replace(/[.:]$/, '') }
      nuevos.push(tituloB)
      if (despues) nuevos.push({ id: nuevoId(), tipo: 'parrafo', texto: despues })
      setAreasExtra(a => ({ ...a, ...Object.fromEntries(nuevos.filter(x => x.id !== b.id).map(x => [x.id, zonas(b.id)])) }))
      conBloques(c.id, bs => bs.flatMap(x => (x.id === b.id ? nuevos : [x])))
      setBloqueSel(tituloB.id)
    }
    const editarTexto = (b: Bloque, texto: string) => conBloques(c.id, bs => bs.map(x => (x.id === b.id && 'texto' in x ? { ...x, texto } as Bloque : x)))
    const quitar = (b: Bloque) => conBloques(c.id, bs => bs.filter(x => x.id !== b.id))
    return <div className="revimp__contenido">
      <div className="revimp__chips">
        <span className="revimp__chip revimp__chip--oro"><BookOpen size={13} aria-hidden="true" />{c.etiqueta || 'Capítulo'}</span>
        <span className="revimp__chip">{c.bloques.length === 1 ? '1 bloque' : `${c.bloques.length} bloques`}</span>
      </div>
      <div className="revimp__fila-campos">
        <div className="revimp__campo">
          <label htmlFor={`revimp-etiqueta-${c.id}`}>Etiqueta</label>
          <input id={`revimp-etiqueta-${c.id}`} type="text" value={c.etiqueta} maxLength={60} placeholder="Capítulo 1" onChange={e => conCapitulo(c.id, x => ({ ...x, etiqueta: e.target.value }))} />
        </div>
        <div className="revimp__campo revimp__campo--ancho">
          <label htmlFor={`revimp-cap-${c.id}`}>Título</label>
          <input id={`revimp-cap-${c.id}`} type="text" value={c.titulo} maxLength={120} onChange={e => conCapitulo(c.id, x => ({ ...x, titulo: e.target.value }))} />
        </div>
      </div>
      <label className="revimp__incluir">
        <input type="checkbox" checked={incluido} onChange={() => { const s = new Set(elegidos); if (s.has(c.id)) s.delete(c.id); else s.add(c.id); props.onElegidos(s) }} />
        Agregar este capítulo al libro
      </label>
      {sinEncontrar.length > 0 && <div className="revimp__bloque-info revimp__bloque-info--alerta">
        <h4><AlertTriangle size={14} aria-hidden="true" />Secciones del índice que no se encontraron como títulos</h4>
        <p>{sinEncontrar.join(' · ')}. Pueden haber quedado dentro de un párrafo: buscá el texto, seleccioná el título y tocá «Hacer título».</p>
      </div>}
      <ol className="revimp__bloques">
        {c.bloques.map((b, i) => {
          const dudas = dudasDeBloque(b)
          const elegido = b.id === bloqueSel
          if (b.tipo === 'fichas') {
            const delBloque = propuestas.filter(p => b.ids.includes(p.ficha.id))
            return <li key={b.id} id={`revimp-bloque-${b.id}`} className="revimp__bloque revimp__bloque--fichas">
              <span className="revimp__numero">{i + 1}</span>
              <span>{delBloque.length} {delBloque.length === 1 ? 'ficha' : 'fichas'} de {TITULO_CATEGORIA[b.categoria as CategoriaFicha]?.toLowerCase() ?? b.categoria}{delBloque.length ? `: ${delBloque.slice(0, 3).map(p => nombreVisible(p.ficha, eleccion.ajustes[p.ficha.id]?.nombre)).join(', ')}${delBloque.length > 3 ? '…' : ''}` : ''}</span>
              {delBloque[0] && <button type="button" className="revimp__enlace" onClick={() => elegir({ tipo: 'ficha', id: delBloque[0].ficha.id })}>Revisar</button>}
            </li>
          }
          return <li key={b.id} id={`revimp-bloque-${b.id}`} className={`revimp__bloque${elegido ? ' revimp__bloque--elegido' : ''}${dudas.length ? ' revimp__bloque--alerta' : ''}`}>
            <div className="revimp__bloque-cabecera">
              <span className="revimp__numero">{i + 1}</span>
              <label className="revimp__oculto" htmlFor={`revimp-tipo-${b.id}`}>Tipo del bloque {i + 1}</label>
              <select id={`revimp-tipo-${b.id}`} value={b.tipo} onChange={e => cambiarTipo(b, e.target.value as TipoBloque)}>
                {tipos.map(t => <option key={t.tipo} value={t.tipo}>{t.etiqueta}</option>)}
              </select>
              <span className="revimp__espacio" />
              <button type="button" className="revimp__icono" aria-label={`Ver el bloque ${i + 1} en la página`} onClick={() => { elegirBloque(b.id); setVistaMovil('pagina') }}><Crosshair size={16} aria-hidden="true" /></button>
            </div>
            {'texto' in b && b.tipo !== 'recuadro' && b.tipo !== 'carta'
              ? <TextoEditable key={`${b.id}:${b.texto.length}`} valor={b.tipo === 'termino' ? b.texto : b.texto} etiqueta={`Texto del bloque ${i + 1}`} filas={b.tipo === 'titulo' || b.tipo === 'subtitulo' ? 1 : 4} onCambiar={t => editarTexto(b, t)} onFoco={() => elegirBloque(b.id)} prefijo={b.tipo === 'termino' ? b.termino : ''}
                  onSeparar={b.tipo === 'parrafo' ? (t, ini, fin, tipo) => separarSeleccion(b, t, ini, fin, tipo) : undefined} />
              : <p className="revimp__bloque-texto">{textoBloque(b).replace(/\*\*|_/g, '').slice(0, 600)}</p>}
            {dudas.map(d => <p key={d} className="revimp__nota revimp__nota--alerta"><AlertTriangle size={14} aria-hidden="true" />{d}</p>)}
            <div className="revimp__bloque-acciones">
              {i > 0 && 'texto' in c.bloques[i - 1] && <button type="button" className="revimp__boton revimp__boton--chico" onClick={() => unir(i)}><Merge size={14} aria-hidden="true" />Unir con el anterior</button>}
              {b.tipo === 'parrafo' && /\n\s*\n/.test(b.texto) && <button type="button" className="revimp__boton revimp__boton--chico" onClick={() => separar(b)}><Scissors size={14} aria-hidden="true" />Separar párrafos</button>}
              <button type="button" className="revimp__boton revimp__boton--chico revimp__boton--peligro" onClick={() => quitar(b)}><Trash2 size={14} aria-hidden="true" />Quitar</button>
            </div>
          </li>
        })}
      </ol>
    </div>
  }

  // ===================================================================================
  function panelCorrecciones() {
    return <div className="revimp__contenido">
      <div className="revimp__chips"><span className="revimp__chip revimp__chip--oro">Escaneo</span></div>
      <h3 className="revimp__subtitulo">Correcciones automáticas del escaneo</h3>
      <p className="revimp__nota">Ya están aplicadas en el texto. Si alguna está mal, corregí ese texto en el capítulo o en la ficha.</p>
      <ul className="revimp__correcciones">
        {correcciones.map(c => <li key={`${c.de}→${c.a}`}><span>{c.de}</span><span aria-hidden="true">→</span><span>{c.a}</span>{c.veces > 1 && <span className="revimp__veces">×{c.veces}</span>}</li>)}
      </ul>
    </div>
  }

  // ===================================================================================
  function resumen() {
    const decididas = propuestas.filter(p => p.ficha.dudas.length || eleccion.ajustes[p.ficha.id] || eleccion.ediciones[p.ficha.id] || p.estado === 'diferencias')
    const etiquetaDecision = (p: Propuesta) => {
      const d = decisionDe(p.ficha.id)
      if (d === 'texto') return <span className="revimp__chip">Queda como texto</span>
      if (d === 'quitar') return <span className="revimp__chip revimp__chip--alerta">No se incluye</span>
      return <span className="revimp__chip revimp__chip--ok">{p.existente ? 'Completa la ficha' : 'Ficha nueva'}</span>
    }
    const ir = (s: Seleccion) => { setPaso('revisar'); elegir(s) }
    return <main className="revimp__resumen">
      <div>
        <h3>Antes de agregar al libro</h3>
        <p className="revimp__nota">Esto es lo que se va a hacer. Nada se guarda hasta que confirmes, y después todo sigue siendo editable en el borrador.</p>
      </div>
      {sinRevisar.length > 0 && <div className="revimp__aviso" role="status">
        <AlertTriangle size={20} aria-hidden="true" />
        <span><b>{sinRevisar.length === 1 ? 'Queda 1 cosa para revisar.' : `Quedan ${sinRevisar.length} cosas para revisar.`}</b> Podés agregar igual: lo que no revisaste queda como lo propuso el motor (lo dudoso, como texto del capítulo).</span>
        <button type="button" className="revimp__boton revimp__boton--chico" onClick={() => ir(sinRevisar[0].sel)}>Ir al primero<ChevronRight size={14} aria-hidden="true" /></button>
      </div>}
      <div className="revimp__cuentas">
        <div><span>{elegidosLista.length}</span><span>Capítulos</span><span>{elegidosLista.map(c => c.titulo).join(', ') || 'Ninguno elegido'}</span></div>
        <div><span>{cuenta.nuevas}</span><span>Fichas nuevas</span><span>Se crean con lo leído</span></div>
        <div><span>{cuenta.completan}</span><span>Completan datos</span><span>Fichas que ya tenías</span></div>
        <div><span>{cuenta.texto + cuenta.quitar}</span><span>Sin ficha</span><span>{cuenta.texto} quedan como texto · {cuenta.quitar} no se incluyen</span></div>
      </div>
      {decididas.length > 0 && <div className="revimp__tabla">
        <table>
          <caption>Lo dudoso y lo que corregiste</caption>
          <thead><tr><th scope="col">Qué</th><th scope="col">Dónde</th><th scope="col">Decisión</th><th scope="col"><span className="revimp__oculto">Acción</span></th></tr></thead>
          <tbody>
            {decididas.map(p => {
              const pag = primeraPagina(zonasFicha(p.ficha))
              return <tr key={p.ficha.id}>
                <td>{nombreVisible(p.ficha, eleccion.ajustes[p.ficha.id]?.nombre)}{eleccion.ediciones[p.ficha.id] ? ' (corregida)' : ''}</td>
                <td>{TITULO_CATEGORIA[p.ficha.categoria]}{Number.isFinite(pag) ? ` · pág. ${pag}` : ''}</td>
                <td>{etiquetaDecision(p)}</td>
                <td><button type="button" className="revimp__enlace" onClick={() => ir({ tipo: 'ficha', id: p.ficha.id })}>Ver</button></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>}
      <div className="revimp__final">
        <button type="button" className="revimp__boton" onClick={() => setPaso('revisar')}>Volver a revisar</button>
        <button type="button" className="revimp__boton revimp__boton--primario" disabled={!elegidosLista.length} onClick={props.onAgregar}>Agregar {elegidosLista.length} {elegidosLista.length === 1 ? 'capítulo' : 'capítulos'} y {fichasCargadas.length} fichas</button>
      </div>
    </main>
  }
}

// =====================================================================================
/** Un campo de la ficha: se escribe libre y se guarda al salir del campo (o con Enter en un renglón). */
function CampoEditable({ ficha, campo, onCambiar, onMirar }: { ficha: FichaDetectada; campo: CampoRevision; onCambiar: (v: unknown) => void; onMirar: () => void }) {
  const inicial = textoDeCampo(campo)
  const [texto, setTexto] = useState(inicial)
  const id = `revimp-campo-${ficha.id}-${campo.ruta}`
  const vacio = !inicial.trim()
  const guardar = () => { if (texto !== inicial) onCambiar(valorDeTexto(campo, texto)) }
  const hayZonas = !!ficha.renglones?.length
  return <div className="revimp__campo">
    <div className="revimp__campo-cabecera">
      <label htmlFor={id}>{campo.etiqueta}</label>
      {hayZonas && <button type="button" className="revimp__enlace" onClick={onMirar}><Crosshair size={13} aria-hidden="true" />Ver en la página</button>}
    </div>
    {!campo.editable ? <p id={id} className="revimp__solo-lectura">{mostrarValor(campo.valor)}</p>
      : campo.forma === 'linea' || campo.forma === 'lista-comas'
        ? <input id={id} type="text" value={texto} className={vacio ? 'revimp__falta' : undefined}
            onChange={e => setTexto(e.target.value)} onBlur={guardar} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardar() } }} />
        : <textarea id={id} rows={Math.min(8, Math.max(3, Math.ceil(texto.length / 60)))} value={texto} className={vacio ? 'revimp__falta' : undefined}
            onChange={e => setTexto(e.target.value)} onBlur={guardar} />}
    {campo.forma === 'lista-comas' && <p className="revimp__ayuda">Separados por comas.</p>}
    {campo.forma === 'lista-renglones' && <p className="revimp__ayuda">Uno por renglón.</p>}
  </div>
}

/**
 * Texto de un bloque del capítulo: se guarda al salir del campo. En un párrafo, lo que se
 * selecciona se puede convertir en título o subtítulo (para títulos que quedaron pegados al texto).
 */
function TextoEditable({ valor, etiqueta, filas, prefijo, onCambiar, onFoco, onSeparar }: {
  valor: string; etiqueta: string; filas: number; prefijo: string; onCambiar: (t: string) => void; onFoco: () => void
  onSeparar?: (texto: string, inicio: number, fin: number, tipo: 'titulo' | 'subtitulo') => void
}) {
  const [texto, setTexto] = useState(valor)
  const [seleccion, setSeleccion] = useState<[number, number] | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const leerSeleccion = () => {
    const el = area.current
    if (!el) return
    const [ini, fin] = [el.selectionStart, el.selectionEnd]
    setSeleccion(fin > ini && texto.slice(ini, fin).trim() ? [ini, fin] : null)
  }
  const separar = (tipo: 'titulo' | 'subtitulo') => { if (seleccion && onSeparar) onSeparar(texto, seleccion[0], seleccion[1], tipo) }
  return <div className="revimp__texto-bloque">
    {prefijo && <span className="revimp__prefijo">{prefijo.replace(/\*\*/g, '')}</span>}
    <textarea ref={area} aria-label={etiqueta} rows={filas === 1 ? 1 : Math.min(10, Math.max(filas, Math.ceil(texto.length / 70)))} value={texto}
      onFocus={onFoco} onChange={e => setTexto(e.target.value)} onSelect={leerSeleccion} onKeyUp={leerSeleccion} onMouseUp={leerSeleccion}
      onBlur={() => { if (texto !== valor) onCambiar(texto) }} />
    {onSeparar && <div className="revimp__seleccion" aria-live="polite">
      {seleccion
        ? <>
            <span>«{texto.slice(seleccion[0], seleccion[1]).trim().slice(0, 40)}{seleccion[1] - seleccion[0] > 40 ? '…' : ''}» →</span>
            {/* onMouseDown evita que el clic saque la selección del texto antes de usarla. */}
            <button type="button" className="revimp__boton revimp__boton--chico" onMouseDown={e => e.preventDefault()} onClick={() => separar('titulo')}>Hacer título</button>
            <button type="button" className="revimp__boton revimp__boton--chico" onMouseDown={e => e.preventDefault()} onClick={() => separar('subtitulo')}>Hacer subtítulo</button>
          </>
        : <span className="revimp__ayuda">¿Un título quedó pegado al texto? Seleccionalo para separarlo.</span>}
    </div>}
  </div>
}

// =====================================================================================
/**
 * La página real del PDF con marcos encima de lo que se leyó. Se dibuja al ancho del espacio
 * disponible (con zoom) y se vuelve a dibujar al cambiar de página o de tamaño.
 */
function VisorPdf({ pdf, pagina, onPagina, marcas }: { pdf: PdfAbierto; pagina: number; onPagina: (n: number) => void; marcas: Marca[] }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [ancho, setAncho] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [mostrar, setMostrar] = useState(true)
  const [dibujo, setDibujo] = useState<{ escala: number; ancho: number; alto: number } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = contenedor.current
    if (!el) return
    const medir = () => setAncho(Math.max(240, Math.min(el.clientWidth - 32, 900)))
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  useEffect(() => {
    if (!ancho || !lienzo.current) return
    let vigente = true
    setError(false)
    pdf.dibujar(pagina, lienzo.current, Math.round(ancho * zoom))
      .then(r => { if (vigente && r) setDibujo(r) })
      .catch(() => { if (vigente) setError(true) })
    return () => { vigente = false }
  }, [pdf, pagina, ancho, zoom])

  // Lleva a la vista el primer marco destacado.
  const primerFoco = marcas.find(m => m.tono === 'foco' && m.area.pagina === pagina)
  const claveFoco = primerFoco ? `${pagina}:${Math.round(primerFoco.area.x0)}:${Math.round(primerFoco.area.y0)}` : ''
  useEffect(() => {
    if (!claveFoco || !dibujo) return
    document.getElementById('revimp-foco')?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [claveFoco, dibujo])

  const enPagina = marcas.filter(m => m.area.pagina === pagina)
  const otras = [...new Set(marcas.map(m => m.area.pagina).filter(p => p !== pagina))].sort((a, b) => a - b)
  const margen = 3
  return <section className="revimp__visor" aria-label="Página del PDF">
    <div className="revimp__visor-barra">
      <div className="revimp__visor-grupo">
        <button type="button" className="revimp__icono revimp__icono--borde" aria-label="Página anterior" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
        <span className="revimp__visor-pagina">Página {pagina} de {pdf.total} del PDF</span>
        <button type="button" className="revimp__icono revimp__icono--borde" aria-label="Página siguiente" disabled={pagina >= pdf.total} onClick={() => onPagina(pagina + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
      <div className="revimp__visor-grupo">
        <label className="revimp__marcar"><input type="checkbox" checked={mostrar} onChange={e => setMostrar(e.target.checked)} />Mostrar lo que se leyó</label>
        <button type="button" className="revimp__icono revimp__icono--borde" aria-label="Alejar" disabled={zoom <= 0.6} onClick={() => setZoom(z => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))}><Minus size={16} aria-hidden="true" /></button>
        <span className="revimp__zoom" aria-live="polite">{Math.round(zoom * 100)} %</span>
        <button type="button" className="revimp__icono revimp__icono--borde" aria-label="Acercar" disabled={zoom >= 2.4} onClick={() => setZoom(z => Math.min(2.4, Math.round((z + 0.2) * 10) / 10))}><Plus size={16} aria-hidden="true" /></button>
      </div>
    </div>
    {otras.length > 0 && <p className="revimp__otras">También en {otras.length === 1 ? 'la página' : 'las páginas'} {otras.map((p, i) => <span key={p}>{i ? ', ' : ''}<button type="button" className="revimp__enlace" onClick={() => onPagina(p)}>{p}</button></span>)}</p>}
    <div ref={contenedor} className="revimp__visor-area">
      <div className="revimp__hoja" style={dibujo ? { width: dibujo.ancho, height: dibujo.alto } : undefined}>
        <canvas ref={lienzo} aria-label={`Página ${pagina} del PDF`} role="img" />
        {error && <p className="revimp__vacio">No se pudo dibujar esta página.</p>}
        {mostrar && dibujo && enPagina.map((m, i) => {
          const estilo = {
            left: m.area.x0 * dibujo.escala - margen, top: m.area.y0 * dibujo.escala - margen,
            width: (m.area.x1 - m.area.x0) * dibujo.escala + margen * 2, height: (m.area.y1 - m.area.y0) * dibujo.escala + margen * 2,
          }
          const esFoco = m === primerFoco
          const cuerpo = m.etiqueta ? <span className={m.numero ? 'revimp__marca-numero' : 'revimp__marca-etiqueta'}>{m.etiqueta}</span> : null
          return m.onElegir
            ? <button key={i} type="button" id={esFoco ? 'revimp-foco' : undefined} className={`revimp__marca revimp__marca--${m.tono}`} style={estilo} aria-label={m.numero ? `Bloque ${m.etiqueta ?? ''}` : `Revisar ${m.etiqueta ?? 'esta ficha'}`} onClick={m.onElegir}>{cuerpo}</button>
            : <span key={i} id={esFoco ? 'revimp-foco' : undefined} className={`revimp__marca revimp__marca--${m.tono}`} style={estilo} aria-hidden="true">{cuerpo}</span>
        })}
      </div>
    </div>
  </section>
}
