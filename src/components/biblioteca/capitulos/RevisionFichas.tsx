import { claveNombre, type Existentes, type Propuesta } from '../../../lib/conciliarFichas'
import { TITULO_CATEGORIA, type CategoriaFicha } from '../../../lib/fichasLibro'

export type Eleccion = {
  /** Fichas que se crean, completan o ubican. Las desmarcadas no se cargan ni aparecen en los capítulos. */
  aceptadas: Set<string>
  /** Por ficha, las diferencias en las que se usa el dato del libro. */
  delLibro: Record<string, Set<string>>
}
type Props = { propuestas: Propuesta[]; eleccion: Eleccion; onCambiar: (e: Eleccion) => void; existentes: Existentes }

const ORDEN: CategoriaFicha[] = ['clases', 'subclases', 'especies', 'trasfondos', 'dotes', 'objetos', 'conjuros', 'criaturas']
const ESTADOS: Record<Propuesta['estado'], string> = { nueva: 'Nueva', completar: 'Completa datos', diferencias: 'Diferencias', igual: 'Ya cargada' }

/** Muestra un valor del libro o de la ficha de forma corta. */
function mostrar(v: unknown): string {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (typeof v === 'string') return v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (Array.isArray(v)) return v.map(x => (x && typeof x === 'object' ? String((x as { nombre?: unknown; valor?: unknown }).nombre ?? (x as { valor?: unknown }).valor ?? '…') : String(x))).join(', ')
  if (typeof v === 'object') return Object.entries(v as Record<string, unknown>).map(([k, x]) => `${k}: ${mostrar(x && typeof x === 'object' && 'puntuacion' in x ? (x as { puntuacion: unknown }).puntuacion : x)}`).join(' · ')
  return String(v)
}
const corto = (t: string) => (t.length > 220 ? `${t.slice(0, 220)}…` : t)

/**
 * Revisión de las fichas encontradas en el libro: qué se crea, qué se completa y qué
 * diferencias hay con lo ya cargado (por defecto se conserva lo cargado).
 */
export default function RevisionFichas({ propuestas, eleccion, onCambiar, existentes }: Props) {
  const clasesDisponibles = new Set([
    ...(existentes.clases ?? []).map(c => claveNombre(c.nombre)),
    ...propuestas.filter(p => p.ficha.categoria === 'clases' && eleccion.aceptadas.has(p.ficha.id)).map(p => claveNombre(p.ficha.nombre)),
  ])
  const alternar = (id: string) => {
    const aceptadas = new Set(eleccion.aceptadas)
    if (aceptadas.has(id)) aceptadas.delete(id); else aceptadas.add(id)
    onCambiar({ ...eleccion, aceptadas })
  }
  const elegirDiferencia = (id: string, ruta: string, delLibro: boolean) => {
    const actual = new Set(eleccion.delLibro[id] ?? [])
    if (delLibro) actual.add(ruta); else actual.delete(ruta)
    onCambiar({ ...eleccion, delLibro: { ...eleccion.delLibro, [id]: actual } })
  }
  const marcarTodas = (categoria: CategoriaFicha, valor: boolean) => {
    const aceptadas = new Set(eleccion.aceptadas)
    propuestas.filter(p => p.ficha.categoria === categoria).forEach(p => (valor ? aceptadas.add(p.ficha.id) : aceptadas.delete(p.ficha.id)))
    onCambiar({ ...eleccion, aceptadas })
  }
  const cuenta = (estado: Propuesta['estado']) => propuestas.filter(p => p.estado === estado).length

  return <section className="fichas-rev" aria-labelledby="fichas-rev-titulo">
    <h4 id="fichas-rev-titulo" className="capitulos__rotulo">Fichas encontradas en el texto</h4>
    <p className="capitulos__ayuda">
      {cuenta('nueva')} nuevas · {cuenta('completar')} para completar · {cuenta('diferencias')} con diferencias · {cuenta('igual')} ya cargadas.
      Lo que desmarques no se carga y su texto tampoco queda en los capítulos. En las diferencias se conserva lo cargado, salvo que elijas el dato del libro.
    </p>
    {ORDEN.filter(c => propuestas.some(p => p.ficha.categoria === c)).map(categoria => {
      const lista = propuestas.filter(p => p.ficha.categoria === categoria)
      return <details key={categoria} className="fichas-rev__grupo" open={lista.length <= 12}>
        <summary>
          <span className="capitulos__nombre">{TITULO_CATEGORIA[categoria]}</span>
          <span className="capitulos__detalle">{lista.filter(p => eleccion.aceptadas.has(p.ficha.id)).length} de {lista.length}</span>
        </summary>
        <div className="fichas-rev__barra">
          <button type="button" onClick={() => marcarTodas(categoria, true)}>Marcar todas</button>
          <button type="button" onClick={() => marcarTodas(categoria, false)}>Desmarcar todas</button>
        </div>
        <ul className="fichas-rev__lista">
          {lista.map(p => {
            const sinClase = p.ficha.categoria === 'subclases' && !p.existente && !clasesDisponibles.has(claveNombre(p.ficha.clase))
            const leidos = Object.keys(p.ficha.datos).filter(k => k !== 'nombre').length
            return <li key={p.ficha.id}>
              <details>
                <summary>
                  <label onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={eleccion.aceptadas.has(p.ficha.id)} disabled={sinClase} onChange={() => alternar(p.ficha.id)} />
                    <span className="capitulos__oculto">Cargar {p.ficha.nombre}</span>
                  </label>
                  <span className="capitulos__nombre">{p.ficha.nombre}</span>
                  <span className={`fichas-rev__estado fichas-rev__estado--${p.estado}`}>{ESTADOS[p.estado]}{p.estado === 'completar' ? ` · ${p.completar.length}` : p.diferencias.length ? ` · ${p.diferencias.length} dif.` : ''}</span>
                </summary>
                <div className="fichas-rev__detalle">
                  {sinClase && <p className="capitulos__faltan">No se puede crear: su clase «{p.ficha.clase}» no está cargada ni se va a crear.</p>}
                  {p.estado === 'nueva' && <p className="capitulos__ayuda">Se crea con {leidos} datos leídos del libro{p.ficha.clase ? ` (subclase de ${p.ficha.clase})` : ''}. Lo que falta queda vacío para completar en la ficha.</p>}
                  {p.estado === 'igual' && <p className="capitulos__ayuda">La ficha cargada ya tiene todo: solo se ubica en el capítulo.</p>}
                  {p.completar.length > 0 && <dl className="fichas-rev__campos">
                    {p.completar.map(c => <div key={c.ruta}><dt>{c.etiqueta}</dt><dd><ins>{corto(mostrar(c.libro))}</ins></dd></div>)}
                  </dl>}
                  {p.diferencias.length > 0 && <div className="fichas-rev__difs">
                    {p.diferencias.map(d => {
                      const delLibro = eleccion.delLibro[p.ficha.id]?.has(d.ruta) ?? false
                      return <fieldset key={d.ruta}>
                        <legend>{d.etiqueta}</legend>
                        <label><input type="radio" name={`${p.ficha.id}-${d.ruta}`} checked={!delLibro} onChange={() => elegirDiferencia(p.ficha.id, d.ruta, false)} />Dejar lo cargado: <span>{corto(mostrar(d.actual))}</span></label>
                        <label><input type="radio" name={`${p.ficha.id}-${d.ruta}`} checked={delLibro} onChange={() => elegirDiferencia(p.ficha.id, d.ruta, true)} />Usar el libro: <span>{corto(mostrar(d.libro))}</span></label>
                      </fieldset>
                    })}
                  </div>}
                </div>
              </details>
            </li>
          })}
        </ul>
      </details>
    })}
  </section>
}
