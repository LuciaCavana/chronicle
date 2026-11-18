import { useEffect, useMemo, useRef, useState } from 'react'
import { agruparConjuros, firmaRegla, nombreRegla, reglaRapida, reglasRapidas, resumenRegla, textoLibro, type Regla } from '../../lib/conjurosRasgo'
import '../../styles/ConjurosRasgo.css'

export type ConjuroDisponible = { id: string; nombre: string; nivel: number; libro?: string }
export type ConjuroDeRasgo = {
  id: string
  conjuroId: string
  otorgamiento: 'aprendido' | 'siempre_preparado' | 'solo_caracteristica'
  modoUso: 'normal' | 'gratis' | 'exclusivo'
  usosGratuitos: number
  recuperacion: 'corto' | 'largo' | 'ambos'
  permiteEspacios: boolean
}
type Props = { conjuros: ConjuroDeRasgo[]; disponibles: ConjuroDisponible[]; onChange: (conjuros: ConjuroDeRasgo[]) => void; nivel?: number }
type Vista = 'lista' | 'otorgar' | 'personalizada'
const normalizar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
const limpiar = (r: Regla): Regla => r.modoUso === 'normal'
  ? { ...r, usosGratuitos: 1, recuperacion: 'largo', permiteEspacios: false }
  : { ...r, usosGratuitos: Math.max(1, Math.min(999, r.usosGratuitos)), permiteEspacios: r.modoUso === 'gratis' && r.permiteEspacios }

export default function ConjurosRasgoEditor({ conjuros, disponibles, onChange, nivel }: Props) {
  const [vista, setVista] = useState<Vista>('lista')
  const [origen, setOrigen] = useState<'otorgar' | 'lista'>('otorgar')
  const [firmaEditada, setFirmaEditada] = useState<string | null>(null)
  const [regla, setRegla] = useState<Regla>(reglasRapidas[0].regla)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<number | null>(null)
  const [seleccion, setSeleccion] = useState<string[]>([])
  const buscador = useRef<HTMLInputElement>(null)
  const grupos = useMemo(() => agruparConjuros(conjuros), [conjuros])
  const nombres = useMemo(() => new Map(disponibles.map(c => [c.id, c])), [disponibles])
  const otorgados = useMemo(() => new Map(grupos.flatMap(g => g.conjuros.map(c => [c.conjuroId, nombreRegla(g.regla)] as const))), [grupos])
  const ordenados = useMemo(() => [...disponibles].sort((a, b) => a.nivel - b.nivel || a.nombre.localeCompare(b.nombre, 'es')), [disponibles])
  const niveles = useMemo(() => [...new Set(ordenados.map(c => c.nivel))].sort((a, b) => a - b), [ordenados])
  const resultados = ordenados.filter(c => (filtro === null || c.nivel === filtro) && normalizar(c.nombre).includes(normalizar(busqueda)))
  useEffect(() => { if (vista === 'otorgar') buscador.current?.focus() }, [vista])
  useEffect(() => {
    if (vista === 'lista') return
    const escape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      if (vista === 'personalizada') setVista(origen)
      else setVista('lista')
    }
    document.addEventListener('keydown', escape, true)
    return () => document.removeEventListener('keydown', escape, true)
  }, [vista, origen])
  const abrirOtorgar = (r: Regla = reglasRapidas[0].regla) => {
    setRegla(r); setSeleccion([]); setBusqueda(''); setFiltro(null); setFirmaEditada(null); setVista('otorgar')
  }
  const abrirPersonalizada = (desde: 'lista' | 'otorgar', r: Regla, firma: string | null = null) => {
    setOrigen(desde); setRegla({ ...r }); setFirmaEditada(firma); setVista('personalizada')
  }
  const confirmarRegla = () => {
    const siguiente = limpiar(regla)
    if (firmaEditada !== null) onChange(conjuros.map(c => firmaRegla(c) === firmaEditada ? { ...c, ...siguiente } : c))
    setRegla(siguiente)
    setFirmaEditada(null)
    setVista(origen)
  }
  const agregar = () => {
    const ids = seleccion.filter(id => !otorgados.has(id))
    if (!ids.length) return
    const r = limpiar(regla)
    onChange([...conjuros, ...ids.map(conjuroId => ({ id: crypto.randomUUID(), conjuroId, ...r }))])
    setSeleccion([])
    setVista('lista')
  }
  const actualizarRegla = (cambios: Partial<Regla>) => setRegla(actual => limpiar({ ...actual, ...cambios }))
  const titulo = vista === 'lista' ? 'Conjuros que otorga' : vista === 'otorgar' ? 'Otorgar conjuros' : 'Regla personalizada'
  return <section className="conjuros-rasgo" aria-label="Conjuros que otorga la característica">
    <header className="conjuros-rasgo__encabezado">
      <h4>{titulo}</h4>
      {vista === 'lista'
        ? <span className="conjuros-rasgo__contador">{conjuros.length} conjuros{nivel !== undefined ? ` · se obtienen en nivel ${nivel}` : ''}</span>
        : <button type="button" className="conjuros-rasgo__boton" onClick={() => setVista(vista === 'personalizada' ? origen : 'lista')}>Volver</button>}
    </header>
    {vista === 'lista' && <>
      {!grupos.length && <p className="conjuros-rasgo__vacio">Esta característica todavía no otorga conjuros.</p>}
      {grupos.map(g => <article className="conjuros-rasgo__grupo" key={g.firma}>
        <div className="conjuros-rasgo__grupo-cabecera">
          <div className="conjuros-rasgo__grupo-titulo"><strong>{nombreRegla(g.regla)}</strong><span>{resumenRegla(g.regla)}</span></div>
          <div className="conjuros-rasgo__grupo-acciones"><button type="button" className="conjuros-rasgo__boton" onClick={() => abrirPersonalizada('lista', g.regla, g.firma)}>Cambiar regla</button></div>
        </div>
        <ul className="conjuros-rasgo__chips">
          {g.conjuros.map(c => {
            const d = nombres.get(c.conjuroId)
            const nombre = d?.nombre ?? 'Conjuro no disponible'
            return <li className={`conjuros-rasgo__chip${d ? '' : ' conjuros-rasgo__chip--no-disponible'}`} key={c.id}>
              <span>{nombre}</span>{d && <small>Nv {d.nivel}</small>}
              <button type="button" className="conjuros-rasgo__chip-quitar" aria-label={`Quitar ${nombre}`} onClick={() => onChange(conjuros.filter(x => x.id !== c.id))}>×</button>
            </li>
          })}
          <li><button type="button" className="conjuros-rasgo__chip-agregar" onClick={() => abrirOtorgar(g.regla)}>+ Agregar a este grupo</button></li>
        </ul>
      </article>)}
      <div><button type="button" className="conjuros-rasgo__boton--primario" onClick={() => abrirOtorgar()}>+ Otorgar conjuros{grupos.length ? ' con otra regla' : ''}</button></div>
      <div className="conjuros-rasgo__previa"><span className="conjuros-rasgo__previa-etiqueta">Así se lee en el libro</span><p>{textoLibro(grupos, disponibles, nivel)}</p></div>
    </>}
    {vista === 'otorgar' && <div className="conjuros-rasgo__panel">
      <fieldset className="conjuros-rasgo__paso">
        <legend><span className="conjuros-rasgo__paso-numero">1.</span> ¿Cómo los obtiene el personaje?</legend>
        <div className="conjuros-rasgo__reglas">
          {reglasRapidas.map(r => <label key={r.nombre} className="conjuros-rasgo__regla">
            <input type="radio" name="regla-rapida" checked={firmaRegla(regla) === firmaRegla(r.regla)} onChange={() => setRegla(r.regla)}/>
            <span><strong>{r.nombre}</strong><span>{r.descripcion}</span></span>
          </label>)}
        </div>
        <button type="button" className="conjuros-rasgo__enlace" onClick={() => abrirPersonalizada('otorgar', regla)}>Otra combinación… (regla personalizada)</button>
        {!reglaRapida(regla) && <p className="conjuros-rasgo__aviso">Regla personalizada: {resumenRegla(regla)}</p>}
      </fieldset>
      <fieldset className="conjuros-rasgo__paso">
        <legend><span className="conjuros-rasgo__paso-numero">2.</span> Elegí los conjuros · podés marcar varios</legend>
        <label htmlFor="conjuros-rasgo-buscar">Buscar</label>
        <input ref={buscador} id="conjuros-rasgo-buscar" className="conjuros-rasgo__buscar" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Nombre del conjuro, por ejemplo: Escudo"/>
        <div className="conjuros-rasgo__filtros" role="group" aria-label="Filtrar por nivel">
          <button type="button" className="conjuros-rasgo__filtro" aria-pressed={filtro === null} onClick={() => setFiltro(null)}>Todos</button>
          {niveles.map(n => <button key={n} type="button" className="conjuros-rasgo__filtro" aria-pressed={filtro === n} onClick={() => setFiltro(n)}>{n === 0 ? 'Trucos' : `Nivel ${n}`}</button>)}
        </div>
        <div className="conjuros-rasgo__resultados">
          {resultados.map(c => {
            const ya = otorgados.get(c.id)
            return <label className="conjuros-rasgo__resultado" key={c.id}>
              <input type="checkbox" checked={Boolean(ya) || seleccion.includes(c.id)} disabled={Boolean(ya)} onChange={e => setSeleccion(actual => e.target.checked ? [...actual, c.id] : actual.filter(id => id !== c.id))}/>
              <span className="conjuros-rasgo__resultado-nombre"><strong>{c.nombre}</strong><small>{ya ? `Ya otorgado en «${ya}»` : c.libro ?? 'Conjuro disponible'}</small></span>
              <span className="conjuros-rasgo__resultado-nivel">{c.nivel === 0 ? 'Truco' : `Nivel ${c.nivel}`}</span>
            </label>
          })}
          {!resultados.length && <p className="conjuros-rasgo__vacio">No encontramos conjuros. Probá otra búsqueda.</p>}
        </div>
      </fieldset>
      <div className="conjuros-rasgo__seleccion">
        <div className="conjuros-rasgo__seleccion-chips"><span>{seleccion.length} seleccionados:</span>{seleccion.map(id => <span className="conjuros-rasgo__chip" key={id}>{nombres.get(id)?.nombre}<button type="button" className="conjuros-rasgo__chip-quitar" aria-label={`Quitar ${nombres.get(id)?.nombre} de la selección`} onClick={() => setSeleccion(s => s.filter(x => x !== id))}>×</button></span>)}</div>
        <div className="conjuros-rasgo__seleccion-pie"><span>Se agregan como <strong>{nombreRegla(regla)}</strong></span><div className="conjuros-rasgo__pie"><button type="button" className="conjuros-rasgo__boton" onClick={() => setVista('lista')}>Volver</button><button type="button" className="conjuros-rasgo__boton--primario" disabled={!seleccion.length} onClick={agregar}>Agregar {seleccion.length} conjuros</button></div></div>
      </div>
    </div>}
    {vista === 'personalizada' && <div className="conjuros-rasgo__panel">
      <fieldset className="conjuros-rasgo__paso"><legend>¿Cómo lo tiene el personaje?</legend>
        <div className="conjuros-rasgo__segmentado">{([
          ['aprendido', 'Aprendido'], ['siempre_preparado', 'Siempre preparado'], ['solo_caracteristica', 'Solo por la característica']
        ] as const).map(([valor, texto]) => <label className="conjuros-rasgo__segmento" key={valor}><input type="radio" name="otorgamiento" checked={regla.otorgamiento === valor} onChange={() => actualizarRegla({ otorgamiento: valor })}/>{texto}</label>)}</div>
      </fieldset>
      <fieldset className="conjuros-rasgo__paso"><legend>¿Cómo lo lanza?</legend>
        <div className="conjuros-rasgo__segmentado">{([
          ['normal', 'Con espacios'], ['gratis', 'Con usos gratis'], ['exclusivo', 'Solo con usos']
        ] as const).map(([valor, texto]) => <label className="conjuros-rasgo__segmento" key={valor}><input type="radio" name="modo-uso" checked={regla.modoUso === valor} onChange={() => actualizarRegla({ modoUso: valor })}/>{texto}</label>)}</div>
      </fieldset>
      {regla.modoUso !== 'normal' && <div className="conjuros-rasgo__usos">
        <div className="conjuros-rasgo__frase"><span>Puede lanzarlo</span><div className="conjuros-rasgo__contador-usos"><button type="button" aria-label="Reducir usos" disabled={regla.usosGratuitos <= 1} onClick={() => actualizarRegla({ usosGratuitos: regla.usosGratuitos - 1 })}>−</button><input type="number" min={1} max={999} aria-label="Cantidad de usos" value={regla.usosGratuitos} onChange={e => actualizarRegla({ usosGratuitos: Number(e.target.value) || 1 })}/><button type="button" aria-label="Aumentar usos" disabled={regla.usosGratuitos >= 999} onClick={() => actualizarRegla({ usosGratuitos: regla.usosGratuitos + 1 })}>+</button></div><span>{regla.usosGratuitos === 1 ? 'vez' : 'veces'} sin gastar espacio</span></div>
        <fieldset className="conjuros-rasgo__paso"><legend>Se recupera tras</legend><div className="conjuros-rasgo__filtros">{([
          ['corto', 'descanso corto'], ['largo', 'descanso largo'], ['ambos', 'cualquiera']
        ] as const).map(([valor, texto]) => <label className="conjuros-rasgo__pildora" key={valor}><input type="radio" name="recuperacion" checked={regla.recuperacion === valor} onChange={() => actualizarRegla({ recuperacion: valor })}/>{texto}</label>)}</div></fieldset>
        {regla.modoUso === 'gratis' && <label className="conjuros-rasgo__casilla"><input type="checkbox" checked={regla.permiteEspacios} onChange={e => actualizarRegla({ permiteEspacios: e.target.checked })}/>Además puede lanzarlo gastando espacios de conjuro</label>}
      </div>}
      <div className="conjuros-rasgo__previa"><span className="conjuros-rasgo__previa-etiqueta">Resumen de la regla</span><p>{resumenRegla(regla)}</p></div>
      {reglaRapida(regla) && <div className="conjuros-rasgo__aviso">Esta combinación coincide con «{nombreRegla(regla)}». Se va a agrupar con ella.</div>}
      <div className="conjuros-rasgo__pie"><button type="button" className="conjuros-rasgo__boton" onClick={() => setVista(origen)}>Cancelar</button><button type="button" className="conjuros-rasgo__boton--primario" onClick={confirmarRegla}>Usar esta regla</button></div>
    </div>}
    <p className="conjuros-rasgo__vacio">Otorgar un conjuro no concede espacios de conjuro.</p>
  </section>
}
