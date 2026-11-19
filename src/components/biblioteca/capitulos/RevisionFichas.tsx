import { campos, claveNombre, etiqueta, type Existentes, type Propuesta } from '../../../lib/conciliarFichas'
import { textoOriginal, TITULO_CATEGORIA, type CategoriaFicha } from '../../../lib/fichasLibro'

/**
 * Qué se hace con cada fragmento reconocido como ficha:
 * - ficha: se crea o se completa la ficha y el capítulo la muestra en su lugar;
 * - texto: no se carga; el texto original queda en el capítulo, tal como estaba;
 * - quitar: no se carga ni queda en el capítulo (solo por decisión explícita).
 */
export type Decision = 'ficha' | 'texto' | 'quitar'
export type Ajuste = { categoria: CategoriaFicha; nombre: string }
export type Eleccion = {
  decision: Record<string, Decision>
  /** Por ficha, las diferencias en las que se usa el dato del libro. */
  delLibro: Record<string, Set<string>>
  /** Correcciones de categoría y nombre hechas en «Pendientes de revisión». */
  ajustes: Record<string, Ajuste>
}
type Props = { propuestas: Propuesta[]; eleccion: Eleccion; onCambiar: (e: Eleccion) => void; existentes: Existentes }

export const ORDEN_CATEGORIAS: CategoriaFicha[] = ['clases', 'subclases', 'especies', 'trasfondos', 'dotes', 'objetos', 'conjuros', 'criaturas']
const ESTADOS: Record<Propuesta['estado'], string> = { nueva: 'Nueva', completar: 'Completa datos', diferencias: 'Diferencias', igual: 'Ya cargada' }
const DECISIONES: { valor: Decision; texto: string }[] = [
  { valor: 'ficha', texto: 'Cargar como ficha' },
  { valor: 'texto', texto: 'Dejar como texto del capítulo' },
  { valor: 'quitar', texto: 'No incluir en el capítulo' },
]

/** Muestra un valor del libro o de la ficha de forma corta. */
function mostrar(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'string') return v.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
  if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object' ? String((x as { nombre?: unknown; valor?: unknown }).nombre ?? (x as { valor?: unknown }).valor ?? '…') : String(x))).join(', ')
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${mostrar(x && typeof x === 'object' && 'puntuacion' in x ? (x as { puntuacion: unknown }).puntuacion : x)}`).join(' · ')
  return String(v)
}
const corto = (t: string, n = 220) => (t.length > n ? `${t.slice(0, n)}…` : t)

/**
 * Revisión de las fichas encontradas en el libro. Primero, «Pendientes de revisión»: lo que el
 * motor no pudo clasificar con seguridad (por defecto queda como texto). Después, las fichas
 * seguras: qué se crea, qué se completa y qué diferencias hay con lo ya cargado.
 * Lo que no se carga como ficha conserva su texto en el capítulo.
 */
export default function RevisionFichas({ propuestas, eleccion, onCambiar, existentes }: Props) {
  const decisionDe = (id: string): Decision => eleccion.decision[id] ?? 'texto'
  const clasesDisponibles = new Set([
    ...(existentes.clases ?? []).map(c => claveNombre(c.nombre)),
    ...propuestas.filter(p => p.ficha.categoria === 'clases' && decisionDe(p.ficha.id) === 'ficha').map(p => claveNombre(p.ficha.nombre)),
  ])
  const decidir = (id: string, d: Decision) => onCambiar({ ...eleccion, decision: { ...eleccion.decision, [id]: d } })
  const ajustar = (id: string, a: Ajuste) => onCambiar({ ...eleccion, ajustes: { ...eleccion.ajustes, [id]: a } })
  const elegirDiferencia = (id: string, ruta: string, delLibro: boolean) => {
    const actual = new Set(eleccion.delLibro[id] ?? [])
    if (delLibro) actual.add(ruta); else actual.delete(ruta)
    onCambiar({ ...eleccion, delLibro: { ...eleccion.delLibro, [id]: actual } })
  }
  const marcarTodas = (lista: Propuesta[], d: Decision) => {
    const decision = { ...eleccion.decision }
    lista.forEach(p => { decision[p.ficha.id] = d })
    onCambiar({ ...eleccion, decision })
  }

  const pendientes = propuestas.filter(p => p.ficha.dudas.length > 0)
  const seguras = propuestas.filter(p => p.ficha.dudas.length === 0)
  const cuenta = (estado: Propuesta['estado']) => seguras.filter(p => p.estado === estado).length

  /** Opciones y detalle comunes a una ficha. */
  const detalle = (p: Propuesta) => {
    const id = p.ficha.id
    const sinClase = p.ficha.categoria === 'subclases' && !p.existente && !clasesDisponibles.has(claveNombre(p.ficha.clase))
    const leidos = campos(p.ficha.categoria, p.ficha.datos)
    const original = textoOriginal(p.ficha.original)
    return <div className="fichas-rev__detalle">
      <fieldset className="fichas-rev__decision">
        <legend className="capitulos__oculto">Qué hacer con «{p.ficha.nombre}»</legend>
        {DECISIONES.map(d => <label key={d.valor}>
          <input type="radio" name={`decision-${id}`} checked={decisionDe(id) === d.valor} disabled={d.valor === 'ficha' && sinClase} onChange={() => decidir(id, d.valor)} />
          {d.texto}
        </label>)}
      </fieldset>
      {sinClase && <p className="capitulos__faltan">No se puede crear: su clase «{p.ficha.clase}» no está cargada ni se va a crear.</p>}
      {p.estado === 'nueva' && <>
        <p className="capitulos__ayuda">Se crea con {leidos.length} datos leídos del libro{p.ficha.clase ? ` (subclase de ${p.ficha.clase})` : ''}. Lo que falta queda vacío para completar en la ficha.</p>
        {leidos.length > 0 && <dl className="fichas-rev__campos">
          {leidos.map(([ruta, v]) => <div key={ruta}><dt>{etiqueta(ruta)}</dt><dd>{corto(mostrar(v))}</dd></div>)}
        </dl>}
      </>}
      {p.estado === 'igual' && <p className="capitulos__ayuda">La ficha cargada ya tiene todo: solo se ubica en el capítulo.</p>}
      {p.completar.length > 0 && <dl className="fichas-rev__campos">
        {p.completar.map(c => <div key={c.ruta}><dt>{c.etiqueta}</dt><dd><ins>{corto(mostrar(c.libro))}</ins></dd></div>)}
      </dl>}
      {p.diferencias.length > 0 && <div className="fichas-rev__difs">
        {p.diferencias.map(d => {
          const delLibro = eleccion.delLibro[id]?.has(d.ruta) ?? false
          return <fieldset key={d.ruta}>
            <legend>{d.etiqueta}</legend>
            <label><input type="radio" name={`${id}-${d.ruta}`} checked={!delLibro} onChange={() => elegirDiferencia(id, d.ruta, false)} />Dejar lo cargado: <span>{corto(mostrar(d.actual))}</span></label>
            <label><input type="radio" name={`${id}-${d.ruta}`} checked={delLibro} onChange={() => elegirDiferencia(id, d.ruta, true)} />Usar el libro: <span>{corto(mostrar(d.libro))}</span></label>
          </fieldset>
        })}
      </div>}
      {original && <details className="fichas-rev__original">
        <summary>Texto original del libro</summary>
        <p>{corto(original, 1500)}</p>
      </details>}
    </div>
  }

  return <section className="fichas-rev" aria-labelledby="fichas-rev-titulo">
    {pendientes.length > 0 && <div className="fichas-rev__pendientes" aria-labelledby="pendientes-titulo">
      <h4 id="pendientes-titulo" className="capitulos__rotulo">Pendientes de revisión ({pendientes.length})</h4>
      <p className="capitulos__ayuda">
        Fragmentos que parecen fichas pero el motor no está seguro. Por defecto quedan como texto del capítulo.
        Si son fichas, corregí la categoría o el nombre si hace falta y elegí «Cargar como ficha».
      </p>
      <ul className="fichas-rev__lista">
        {pendientes.map(p => {
          const id = p.ficha.id
          const ajuste = eleccion.ajustes[id] ?? { categoria: p.ficha.categoria, nombre: p.ficha.nombre }
          return <li key={id}>
            <details open={pendientes.length <= 6}>
              <summary>
                <span className="capitulos__nombre">{p.ficha.nombre}</span>
                <span className="fichas-rev__estado">{TITULO_CATEGORIA[p.ficha.categoria]}</span>
                <span className={`fichas-rev__estado fichas-rev__estado--${decisionDe(id)}`}>{DECISIONES.find(d => d.valor === decisionDe(id))?.texto}</span>
              </summary>
              <ul className="fichas-rev__dudas">{p.ficha.dudas.map(d => <li key={d}>{d}</li>)}</ul>
              <div className="fichas-rev__ajuste">
                <label>Categoría
                  <select value={ajuste.categoria} onChange={e => ajustar(id, { ...ajuste, categoria: e.target.value as CategoriaFicha })}>
                    {ORDEN_CATEGORIAS.map(c => <option key={c} value={c}>{TITULO_CATEGORIA[c]}</option>)}
                  </select>
                </label>
                <label>Nombre
                  <input type="text" value={ajuste.nombre} maxLength={120} onChange={e => ajustar(id, { ...ajuste, nombre: e.target.value })} />
                </label>
              </div>
              {detalle(p)}
            </details>
          </li>
        })}
      </ul>
    </div>}

    {seguras.length > 0 && <>
      <h4 id="fichas-rev-titulo" className="capitulos__rotulo">Fichas encontradas en el texto</h4>
      <p className="capitulos__ayuda">
        {cuenta('nueva')} nuevas · {cuenta('completar')} para completar · {cuenta('diferencias')} con diferencias · {cuenta('igual')} ya cargadas.
        Lo que desmarques no se carga y su texto queda en el capítulo. En las diferencias se conserva lo cargado, salvo que elijas el dato del libro.
      </p>
      {ORDEN_CATEGORIAS.filter(c => seguras.some(p => p.ficha.categoria === c)).map(categoria => {
        const lista = seguras.filter(p => p.ficha.categoria === categoria)
        return <details key={categoria} className="fichas-rev__grupo" open={lista.length <= 12}>
          <summary>
            <span className="capitulos__nombre">{TITULO_CATEGORIA[categoria]}</span>
            <span className="capitulos__detalle">{lista.filter(p => decisionDe(p.ficha.id) === 'ficha').length} de {lista.length}</span>
          </summary>
          <div className="fichas-rev__barra">
            <button type="button" onClick={() => marcarTodas(lista, 'ficha')}>Marcar todas</button>
            <button type="button" onClick={() => marcarTodas(lista, 'texto')}>Dejar todas como texto</button>
          </div>
          <ul className="fichas-rev__lista">
            {lista.map(p => {
              const sinClase = p.ficha.categoria === 'subclases' && !p.existente && !clasesDisponibles.has(claveNombre(p.ficha.clase))
              const d = decisionDe(p.ficha.id)
              return <li key={p.ficha.id}>
                <details>
                  <summary>
                    <label onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={d === 'ficha'} disabled={sinClase} onChange={() => decidir(p.ficha.id, d === 'ficha' ? 'texto' : 'ficha')} />
                      <span className="capitulos__oculto">Cargar {p.ficha.nombre}</span>
                    </label>
                    <span className="capitulos__nombre">{p.ficha.nombre}</span>
                    {d === 'ficha'
                      ? <span className={`fichas-rev__estado fichas-rev__estado--${p.estado}`}>{ESTADOS[p.estado]}{p.estado === 'completar' ? ` · ${p.completar.length}` : p.diferencias.length ? ` · ${p.diferencias.length} dif.` : ''}</span>
                      : <span className={`fichas-rev__estado fichas-rev__estado--${d}`}>{d === 'texto' ? 'Queda como texto' : 'No se incluye'}</span>}
                  </summary>
                  {detalle(p)}
                </details>
              </li>
            })}
          </ul>
        </details>
      })}
    </>}
  </section>
}
