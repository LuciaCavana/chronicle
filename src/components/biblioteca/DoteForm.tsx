import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useReportarBorrador } from '../../hooks/useRespaldoBorrador'
import type { Conjuro } from '../../types/conjuro'
import SelectorConjuros from './SelectorConjuros'
import SelectorClases from './SelectorClases'
import type { BeneficioDote, ConjurosBeneficio, Dote, EfectoDote, SeleccionConjurosDote } from '../../types/trasfondo'
import { conjurosVacios, normalizarDote, nuevoBeneficio, prepararDoteParaGuardar, resumenBeneficio, usaListaDeConjuros } from '../../lib/dotes'
import { nombreRepetido } from '../../lib/listas'
import '../../styles/formularios/EspecieForm.css'
import '../../styles/formularios/DoteForm.css'
import CampoNumero from '../../components/shared/CampoNumero'

type Props = {
  initialData?: Dote | null
  dotes: Dote[]
  conjuros: Conjuro[]
  /** Nombres de clase para armar la lista de conjuros de la dote. */
  clasesDisponibles?: string[]
  onCrearConjuro: (conjuro: Conjuro) => void
  onSave: (dote: Dote) => void
  onCancel: () => void
  /** Lo escrito antes de recargar, recuperado de la copia local. */
  borrador?: Dote | null
  onCambioBorrador?: (borrador: Dote | null) => void
}

const APTITUDES: [string, string][] = [['inteligencia', 'Inteligencia'], ['sabiduria', 'Sabiduría'], ['carisma', 'Carisma']]
const NIVELES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

const listaInicial: SeleccionConjurosDote = {
  listasPermitidas: [], listaSegunOrigen: true, mismaLista: true, selecciones: [],
  caracteristicasMagicas: ['inteligencia', 'sabiduria', 'carisma'], listaDistintaPorRepeticion: true,
}

function lineas(texto: string): string[] {
  return texto.split('\n').map(linea => linea.trim()).filter(Boolean)
}

export default function DoteForm({ initialData, dotes, conjuros, clasesDisponibles = [], onCrearConjuro, onSave, onCancel, borrador, onCambioBorrador }: Props) {
  const [fuente] = useState(() => { const f = borrador ?? initialData; return f ? normalizarDote(f) : null })
  const [idNuevo] = useState(() => fuente?.id ?? crypto.randomUUID())
  const [nombre, setNombre] = useState(fuente?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(fuente?.descripcion ?? '')
  const [categoria, setCategoria] = useState(fuente?.categoria ?? 'origen')
  const [repetible, setRepetible] = useState(Boolean(fuente?.repetible))
  const [requisitos, setRequisitos] = useState((fuente?.requisitos ?? []).join('\n'))
  const [beneficios, setBeneficios] = useState<BeneficioDote[]>(() => fuente?.beneficios.length ? fuente.beneficios : [nuevoBeneficio()])
  // Tarjetas abiertas para editar: los beneficios ya cargados se muestran cerrados (título y resumen).
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set(fuente?.beneficios.length ? [] : beneficios.map(b => b.id)))
  const abrir = (beneficioId: string) => setAbiertos(a => new Set(a).add(beneficioId))
  const cerrar = (beneficioId: string) => setAbiertos(a => { const n = new Set(a); n.delete(beneficioId); return n })
  const [lista, setLista] = useState<SeleccionConjurosDote>(() => ({ ...listaInicial, ...(fuente?.seleccionConjuros ?? {}) }))
  const [libro, setLibro] = useState(fuente?.fuente?.libro ?? '')
  const [pagina, setPagina] = useState(fuente?.fuente?.pagina?.toString() ?? '')
  const [efectos, setEfectos] = useState<EfectoDote[]>(fuente?.efectos ?? [])
  const [selectorClasesAbierto, setSelectorClasesAbierto] = useState(false)
  // Beneficio al que se le vincula un conjuro con el selector del catálogo.
  const [vinculandoEn, setVinculandoEn] = useState<string | null>(null)
  const [error, setError] = useState('')

  const id = initialData?.id ?? idNuevo
  const conLista = usaListaDeConjuros(beneficios)
  const armarDote = (): Dote => prepararDoteParaGuardar({
    id, nombre, descripcion, categoria, repetible,
    requisitos: lineas(requisitos), beneficios,
    fuente: { libro: libro.trim(), ...(pagina.trim() ? { pagina: Number(pagina) } : {}) },
    efectos,
    ...(initialData?.datosAdicionales ? { datosAdicionales: initialData.datosAdicionales } : {}),
  }, lista)
  useReportarBorrador<Dote>(armarDote(), onCambioBorrador, Boolean(borrador))

  const nombreDeConjuro = (conjuroId: string) => {
    const c = conjuros.find(x => x.id === conjuroId)
    return c ? `${c.nombre} (${c.tipo === 'truco' ? 'Truco' : `Nivel ${c.nivel}`})` : 'Conjuro no disponible en el catálogo'
  }
  function cambiarBeneficio(beneficioId: string, cambio: Partial<BeneficioDote>) {
    setBeneficios(actuales => actuales.map(b => b.id === beneficioId ? { ...b, ...cambio } : b))
    setError('')
  }
  function cambiarConjuros(b: BeneficioDote, cambio: Partial<ConjurosBeneficio>) {
    cambiarBeneficio(b.id, { conjuros: { ...(b.conjuros ?? conjurosVacios()), ...cambio } })
  }
  function mover(beneficioId: string, paso: -1 | 1) {
    setBeneficios(actuales => {
      const i = actuales.findIndex(b => b.id === beneficioId)
      const j = i + paso
      if (i < 0 || j < 0 || j >= actuales.length) return actuales
      const copia = [...actuales]
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }
  function cambiarEfecto(efectoId: string, cambio: Partial<EfectoDote>) {
    setEfectos(actuales => actuales.map(efecto => efecto.id === efectoId ? { ...efecto, ...cambio } : efecto))
  }

  function guardar() {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) { setError('Ingresá un nombre para la dote.'); return }
    if (nombreRepetido(dotes, { id, nombre: nombreLimpio })) { setError('Ya existe una dote con ese nombre.'); return }
    if (pagina.trim() && (!Number.isInteger(Number(pagina)) || Number(pagina) < 1)) { setError('La página debe ser un número entero positivo.'); return }
    if (efectos.some(e => !e.atributo.trim() || !Number.isFinite(e.valor))) { setError('Completá el atributo y el valor de cada efecto.'); return }
    // Las tarjetas vacías (sin título, texto ni conjuros) no se guardan.
    const conContenido = beneficios.filter(b => b.nombre.trim() || b.descripcion.trim() || b.conjuros || b.tipo === 'cambiar_conjuro')
    for (const b of conContenido) {
      const nombreB = b.nombre.trim() || 'Un beneficio'
      const fallo = (mensaje: string) => { abrir(b.id); setError(mensaje) }
      if (b.conjuros?.modo === 'eleccion' && (!b.conjuros.selecciones.length || b.conjuros.selecciones.some(s => !Number.isInteger(s.cantidad) || s.cantidad < 1))) {
        fallo(`«${nombreB}» da conjuros: indicá el nivel y una cantidad de al menos 1.`); return
      }
      if (b.conjuros?.modo === 'fijos' && !b.conjuros.conjurosIds.length) { fallo(`«${nombreB}» da conjuros: vinculá al menos uno o desmarcá la opción.`); return }
      if (b.conjuros?.lanzamientoSinEspacio && !(b.conjuros.lanzamientoSinEspacio.usos >= 1)) { fallo(`«${nombreB}»: los usos sin espacio tienen que ser al menos 1.`); return }
      if (b.tipo === 'cambiar_conjuro' && !(b.cambioConjuro && b.cambioConjuro.cantidad >= 1)) { fallo(`«${nombreB}»: indicá cuántos conjuros se pueden cambiar.`); return }
    }
    if (usaListaDeConjuros(conContenido) && !lista.listasPermitidas.length) { setError('Elegí al menos una clase para la lista de conjuros de la dote.'); return }
    if (usaListaDeConjuros(conContenido) && !lista.caracteristicasMagicas.length) { setError('Elegí al menos una aptitud mágica.'); return }
    onSave(prepararDoteParaGuardar({
      id, nombre: nombreLimpio, descripcion: descripcion.trim(), categoria: categoria.trim(), repetible,
      requisitos: lineas(requisitos), beneficios: conContenido,
      fuente: { libro: libro.trim(), ...(pagina.trim() ? { pagina: Number(pagina) } : {}) },
      efectos,
      ...(initialData?.datosAdicionales ? { datosAdicionales: initialData.datosAdicionales } : {}),
    }, lista))
  }

  const beneficioVinculando = beneficios.find(b => b.id === vinculandoEn)
  const idsVinculando = beneficioVinculando?.conjuros?.conjurosIds ?? []
  const vincular = (conjuroId: string) => {
    if (!beneficioVinculando) return
    const actuales = beneficioVinculando.conjuros?.conjurosIds ?? []
    if (!actuales.includes(conjuroId)) cambiarConjuros(beneficioVinculando, { modo: 'fijos', conjurosIds: [...actuales, conjuroId] })
  }
  const hayCambioConjuro = beneficios.some(b => b.tipo === 'cambiar_conjuro')

  return <section className="nueva-propuesta-panel especie-form dote-form">
    <h3>{initialData ? 'Editar dote' : 'Agregar dote'}</h3>

    <div className="nueva-propuesta-field"><label htmlFor="dote-nombre">Nombre *</label><input id="dote-nombre" value={nombre} onChange={e => { setNombre(e.target.value); setError('') }} placeholder="Ej.: Iniciado en la magia" /></div>
    <div className="dote-fila-categoria">
      <div className="nueva-propuesta-field"><label htmlFor="dote-categoria">Categoría *</label><select id="dote-categoria" value={categoria} onChange={e => setCategoria(e.target.value)}>
        <option value="origen">Dote de origen</option>
        <option value="general">Dote general</option>
        <option value="epica">Dote épica</option>
        <option value="estilo_combate">Dote de estilo de combate</option>
        {!['origen', 'general', 'epica', 'estilo_combate'].includes(categoria) && <option value={categoria}>{categoria} (categoría anterior)</option>}
      </select></div>
      <label className="dote-casilla dote-repetible"><input type="checkbox" checked={repetible} onChange={e => setRepetible(e.target.checked)} />
        <span><strong>Repetible</strong><small>Se puede elegir más de una vez</small></span></label>
    </div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-requisitos">Prerrequisitos (uno por línea, opcional)</label><textarea id="dote-requisitos" rows={2} value={requisitos} onChange={e => setRequisitos(e.target.value)} placeholder="Ej.: Nivel 4+" /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-descripcion">Descripción (opcional)</label>
      <textarea id="dote-descripcion" rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Texto de ambientación antes de los beneficios" />
      <small className="dote-ayuda">Las dotes de origen no suelen tener descripción: los beneficios van abajo.</small></div>

    {conLista && <fieldset className="dote-lista">
      <legend>Lista de conjuros de la dote</legend>
      <p>Vale para todos los beneficios que dan conjuros a elegir: si se eligen los trucos de Druida, el conjuro de nivel 1 también sale de Druida.</p>
      <div className="dote-clases">
        {lista.listasPermitidas.map(clase => <span key={clase} className="dote-chip">{clase}
          <button type="button" aria-label={`Quitar ${clase}`} onClick={() => setLista(l => ({ ...l, listasPermitidas: l.listasPermitidas.filter(x => x !== clase) }))}><X size={13} /></button></span>)}
        <button type="button" className="dote-accion" onClick={() => setSelectorClasesAbierto(true)}>{lista.listasPermitidas.length ? 'Cambiar clases…' : 'Elegir clases…'}</button>
      </div>
      <label className="dote-casilla"><input type="checkbox" checked={lista.listaSegunOrigen} onChange={e => setLista(l => ({ ...l, listaSegunOrigen: e.target.checked }))} />
        <span>Un trasfondo u otro origen puede fijar una de estas listas</span></label>
      {repetible && <label className="dote-casilla"><input type="checkbox" checked={Boolean(lista.listaDistintaPorRepeticion)} onChange={e => setLista(l => ({ ...l, listaDistintaPorRepeticion: e.target.checked }))} />
        <span>Cada vez que se elige la dote, la lista tiene que ser distinta</span></label>}
      <div className="dote-aptitud" role="group" aria-labelledby="dote-aptitud-titulo">
        <span id="dote-aptitud-titulo" className="dote-subtitulo">Aptitud mágica (se elige una al tomar la dote)</span>
        <div>{APTITUDES.map(([valor, etiqueta]) => <label key={valor} className="dote-casilla dote-casilla--chica">
          <input type="checkbox" checked={lista.caracteristicasMagicas.includes(valor)} onChange={e => setLista(l => ({ ...l, caracteristicasMagicas: e.target.checked ? [...l.caracteristicasMagicas, valor] : l.caracteristicasMagicas.filter(x => x !== valor) }))} />
          <span>{etiqueta}</span></label>)}</div>
      </div>
    </fieldset>}

    <div className="dote-beneficios">
      <h4 className="dote-titulo-seccion">Beneficios</h4>
      {beneficios.map((b, indice) => {
        const esCambio = b.tipo === 'cambiar_conjuro'
        const c = b.conjuros
        const abierto = abiertos.has(b.id)
        const botones = <>
              <button type="button" aria-label="Subir" disabled={indice === 0} onClick={() => mover(b.id, -1)}><ArrowUp size={15} /></button>
              <button type="button" aria-label="Bajar" disabled={indice === beneficios.length - 1} onClick={() => mover(b.id, 1)}><ArrowDown size={15} /></button>
              <button type="button" aria-label="Quitar beneficio" className="dote-quitar" onClick={() => setBeneficios(actuales => actuales.filter(x => x.id !== b.id))}><Trash2 size={15} /></button>
        </>
        if (!abierto) {
          const resumen = resumenBeneficio(b, nombreDeConjuro)
          return <article className={`dote-beneficio dote-beneficio--cerrado${esCambio ? ' dote-beneficio--cambio' : ''}`} key={b.id}>
            <div className="dote-beneficio-cerrado-cuerpo" role="button" tabIndex={0} aria-label={`Editar ${b.nombre || `beneficio ${indice + 1}`}`}
              onClick={() => abrir(b.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(b.id) } }}>
              <strong>{b.nombre.trim() || (esCambio ? 'Cambiar conjuro' : 'Sin título')}</strong>
              {b.descripcion.trim() && <p className="dote-beneficio-texto">{b.descripcion}</p>}
              {resumen && <p className="dote-beneficio-resumen">{resumen}</p>}
            </div>
            <div className="dote-beneficio-botones">
              <button type="button" aria-label="Editar beneficio" onClick={() => abrir(b.id)}><Pencil size={15} /></button>
              {botones}
            </div>
          </article>
        }
        return <article className={`dote-beneficio${esCambio ? ' dote-beneficio--cambio' : ''}`} key={b.id}>
          <header className="dote-beneficio-cabecera">
            <span className="dote-beneficio-etiqueta">{esCambio ? 'Cambiar conjuro' : `Beneficio ${indice + 1}`}</span>
            <div className="dote-beneficio-botones">
              {botones}
            </div>
          </header>
          <div className="nueva-propuesta-field"><label htmlFor={`ben-nombre-${b.id}`}>Título</label>
            <input id={`ben-nombre-${b.id}`} value={b.nombre} onChange={e => cambiarBeneficio(b.id, { nombre: e.target.value })} placeholder={esCambio ? 'Cambiar conjuro' : 'Ej.: Dos trucos'} /></div>
          <div className="nueva-propuesta-field"><label htmlFor={`ben-texto-${b.id}`}>Texto</label>
            <textarea id={`ben-texto-${b.id}`} rows={3} value={b.descripcion} onChange={e => cambiarBeneficio(b.id, { descripcion: e.target.value })} placeholder="Lo que dice el libro sobre este beneficio" /></div>

          {esCambio ? <div className="dote-opciones">
            <div className="nueva-propuesta-field dote-campo-corto"><label>Conjuros que se pueden cambiar por nivel</label>
              <CampoNumero min={1} value={b.cambioConjuro?.cantidad ?? 1} onChange={e => cambiarBeneficio(b.id, { cambioConjuro: { mismoNivel: true, mismaLista: true, ...b.cambioConjuro, cantidad: Number(e.target.value) } })} /></div>
            <label className="dote-casilla"><input type="checkbox" checked={b.cambioConjuro?.mismoNivel ?? true} onChange={e => cambiarBeneficio(b.id, { cambioConjuro: { cantidad: 1, mismaLista: true, ...b.cambioConjuro, mismoNivel: e.target.checked } })} /><span>Por uno del mismo nivel</span></label>
            <label className="dote-casilla"><input type="checkbox" checked={b.cambioConjuro?.mismaLista ?? true} onChange={e => cambiarBeneficio(b.id, { cambioConjuro: { cantidad: 1, mismoNivel: true, ...b.cambioConjuro, mismaLista: e.target.checked } })} /><span>De la misma lista</span></label>
          </div> : <>
            <label className="dote-casilla dote-da-conjuros"><input type="checkbox" checked={Boolean(c)} onChange={e => cambiarBeneficio(b.id, { conjuros: e.target.checked ? conjurosVacios() : undefined })} />
              <span>Este beneficio da conjuros</span></label>
            {c && <div className="dote-opciones">
              <div className="dote-modo" role="radiogroup" aria-label="De dónde salen los conjuros">
                <label className="dote-casilla dote-casilla--chica"><input type="radio" name={`modo-${b.id}`} checked={c.modo === 'eleccion'} onChange={() => cambiarConjuros(b, { modo: 'eleccion', selecciones: c.selecciones.length ? c.selecciones : [{ nivel: 0, cantidad: 1 }] })} /><span>A elegir de la lista de la dote</span></label>
                <label className="dote-casilla dote-casilla--chica"><input type="radio" name={`modo-${b.id}`} checked={c.modo === 'fijos'} onChange={() => cambiarConjuros(b, { modo: 'fijos' })} /><span>Conjuros puntuales del catálogo</span></label>
              </div>
              {c.modo === 'eleccion' ? <div className="dote-selecciones">
                {c.selecciones.map((s, i) => <div className="dote-seleccion" key={i}>
                  <div className="nueva-propuesta-field"><label htmlFor={`ben-nivel-${b.id}-${i}`}>Nivel</label>
                    <select id={`ben-nivel-${b.id}-${i}`} value={s.nivel} onChange={e => cambiarConjuros(b, { selecciones: c.selecciones.map((x, j) => j === i ? { ...x, nivel: Number(e.target.value) } : x) })}>
                      {NIVELES.map(n => <option key={n} value={n}>{n === 0 ? 'Truco' : `Nivel ${n}`}</option>)}
                    </select></div>
                  <div className="nueva-propuesta-field"><label htmlFor={`ben-cantidad-${b.id}-${i}`}>Cantidad</label>
                    <CampoNumero id={`ben-cantidad-${b.id}-${i}`} min={1} value={s.cantidad} onChange={e => cambiarConjuros(b, { selecciones: c.selecciones.map((x, j) => j === i ? { ...x, cantidad: Number(e.target.value) } : x) })} /></div>
                  {c.selecciones.length > 1 && <button type="button" className="dote-quitar" aria-label="Quitar este nivel" onClick={() => cambiarConjuros(b, { selecciones: c.selecciones.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>}
                </div>)}
                <button type="button" className="dote-enlace" onClick={() => cambiarConjuros(b, { selecciones: [...c.selecciones, { nivel: 1, cantidad: 1 }] })}><Plus size={14} />Otro nivel</button>
              </div> : <div className="dote-fijos">
                {c.conjurosIds.length === 0 && <p className="dote-ayuda">Todavía no hay conjuros vinculados.</p>}
                {c.conjurosIds.map(conjuroId => <div className="dote-conjuro-opcion" key={conjuroId}>
                  <span>{nombreDeConjuro(conjuroId)}</span>
                  <button type="button" className="dote-desvincular" onClick={() => cambiarConjuros(b, { conjurosIds: c.conjurosIds.filter(x => x !== conjuroId) })}>Desvincular</button>
                </div>)}
                <button type="button" className="dote-enlace" onClick={() => setVinculandoEn(b.id)}><Plus size={14} />Vincular conjuro</button>
              </div>}
              <label className="dote-casilla"><input type="checkbox" checked={Boolean(c.siemprePreparado)} onChange={e => cambiarConjuros(b, { siemprePreparado: e.target.checked })} /><span>Siempre preparado</span></label>
              <label className="dote-casilla"><input type="checkbox" checked={Boolean(c.lanzamientoSinEspacio)} onChange={e => cambiarConjuros(b, { lanzamientoSinEspacio: e.target.checked ? { usos: 1, recuperacion: 'descanso_largo' } : undefined })} /><span>Se puede lanzar sin gastar espacio de conjuro</span></label>
              {c.lanzamientoSinEspacio && <div className="dote-seleccion dote-sangria">
                <div className="nueva-propuesta-field"><label htmlFor={`ben-usos-${b.id}`}>Veces</label>
                  <CampoNumero id={`ben-usos-${b.id}`} min={1} value={c.lanzamientoSinEspacio.usos} onChange={e => cambiarConjuros(b, { lanzamientoSinEspacio: { ...c.lanzamientoSinEspacio!, usos: Number(e.target.value) } })} /></div>
                <div className="nueva-propuesta-field"><label htmlFor={`ben-recupera-${b.id}`}>Se recupera tras</label>
                  <select id={`ben-recupera-${b.id}`} value={c.lanzamientoSinEspacio.recuperacion} onChange={e => cambiarConjuros(b, { lanzamientoSinEspacio: { ...c.lanzamientoSinEspacio!, recuperacion: e.target.value as 'descanso_largo' | 'descanso_corto' } })}>
                    <option value="descanso_largo">Descanso largo</option><option value="descanso_corto">Descanso corto</option></select></div>
              </div>}
              <label className="dote-casilla"><input type="checkbox" checked={Boolean(c.permiteUsarEspacios)} onChange={e => cambiarConjuros(b, { permiteUsarEspacios: e.target.checked })} /><span>También se puede lanzar con espacios de conjuro</span></label>
            </div>}
          </>}
          <div className="dote-beneficio-pie"><button type="button" className="dote-accion dote-accion--suave" onClick={() => cerrar(b.id)}>Listo</button></div>
        </article>
      })}
      <div className="dote-agregar">
        <button type="button" className="dote-accion" onClick={() => { const nuevo = nuevoBeneficio(); setBeneficios(actuales => [...actuales, nuevo]); abrir(nuevo.id) }}><Plus size={15} />Agregar beneficio</button>
        {!hayCambioConjuro && <button type="button" className="dote-accion dote-accion--suave" onClick={() => { const nuevo = nuevoBeneficio({ nombre: 'Cambiar conjuro', tipo: 'cambiar_conjuro', cambioConjuro: { cantidad: 1, mismoNivel: true, mismaLista: true } }); setBeneficios(actuales => [...actuales, nuevo]); abrir(nuevo.id) }}><Plus size={15} />Cambiar conjuro al subir de nivel</button>}
      </div>
    </div>

    <fieldset><legend>Fuente</legend>
      <div className="nueva-propuesta-fields-row">
        <div className="nueva-propuesta-field"><label htmlFor="dote-libro">Libro</label><input id="dote-libro" value={libro} onChange={e => setLibro(e.target.value)} placeholder="Ej.: PHB 2024"/></div>
        <div className="nueva-propuesta-field"><label htmlFor="dote-pagina">Página</label><CampoNumero id="dote-pagina" min={1} step={1} value={pagina} onChange={e => setPagina(e.target.value)}/></div>
      </div>
    </fieldset>

    <details className="dote-avanzado">
      <summary>Efectos para el motor (opcional{efectos.length ? `, ${efectos.length}` : ''})</summary>
      <p>Efectos declarativos que el creador de personajes aplica solo. El motor valida los atributos y eventos admitidos.</p>
      {efectos.map(efecto => <div key={efecto.id} className="nueva-propuesta-panel">
        <div className="nueva-propuesta-field"><label>Evento</label><select value={efecto.evento} onChange={e => cambiarEfecto(efecto.id, { evento: e.target.value as EfectoDote['evento'] })}><option value="al_obtener">Al obtener la dote</option><option value="al_subir_nivel">Al subir de nivel</option><option value="pasivo">Pasivo</option></select></div>
        <div className="nueva-propuesta-field"><label>Atributo del motor</label><input value={efecto.atributo} onChange={e => cambiarEfecto(efecto.id, { atributo: e.target.value })} placeholder="Ej.: puntos_golpe_maximos"/></div>
        <div className="nueva-propuesta-field"><label>Operación</label><select value={efecto.operacion} onChange={e => cambiarEfecto(efecto.id, { operacion: e.target.value as EfectoDote['operacion'] })}><option value="sumar">Sumar</option><option value="establecer">Establecer</option></select></div>
        <div className="nueva-propuesta-field"><label>Valor</label><CampoNumero value={efecto.valor} onChange={e => cambiarEfecto(efecto.id, { valor: Number(e.target.value) })}/></div>
        <div className="nueva-propuesta-field"><label>Escala</label><select value={efecto.escala ?? 'fijo'} onChange={e => cambiarEfecto(efecto.id, { escala: e.target.value as EfectoDote['escala'] })}><option value="fijo">Valor fijo</option><option value="nivel_personaje">Multiplicar por nivel del personaje</option></select></div>
        <button type="button" className="nueva-propuesta-cancel" onClick={() => setEfectos(actuales => actuales.filter(e => e.id !== efecto.id))}>Quitar efecto</button>
      </div>)}
      <button type="button" className="dote-accion" onClick={() => setEfectos(actuales => [...actuales, { id: crypto.randomUUID(), evento: 'al_obtener', atributo: '', operacion: 'sumar', valor: 0, escala: 'fijo' }])}>Agregar efecto</button>
    </details>

    {selectorClasesAbierto && <SelectorClases abierto titulo="Clases de la lista de conjuros" clases={clasesDisponibles} elegidas={lista.listasPermitidas}
      onAceptar={elegidas => { setLista(l => ({ ...l, listasPermitidas: elegidas })); setError('') }} onCerrar={() => setSelectorClasesAbierto(false)} />}
    <SelectorConjuros
      abierto={vinculandoEn !== null}
      conjuros={conjuros}
      idsVinculados={idsVinculando}
      onVincular={conjuro => vincular(conjuro.id)}
      onCrear={conjuro => { onCrearConjuro(conjuro); vincular(conjuro.id) }}
      onCerrar={() => setVinculandoEn(null)}
    />

    {error && <p role="alert" className="dote-error">{error}</p>}
    <div className="nueva-propuesta-actions">
      <button type="button" className="nueva-propuesta-cancel" onClick={onCancel}>Cancelar</button>
      <button type="button" className="nueva-propuesta-next" onClick={guardar}>Guardar dote</button>
    </div>
  </section>
}
