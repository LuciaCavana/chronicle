import { useState } from 'react'
import '../../styles/SelectorConjuro.css'

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

type Props = { conjuros: ConjuroDeRasgo[]; disponibles: ConjuroDisponible[]; onChange: (conjuros: ConjuroDeRasgo[]) => void }
const nuevo = (): ConjuroDeRasgo => ({ id: crypto.randomUUID(), conjuroId: '', otorgamiento: 'solo_caracteristica', modoUso: 'gratis', usosGratuitos: 1, recuperacion: 'largo', permiteEspacios: false })
function SelectorConjuro({ seleccionado, disponibles, onChange }: { seleccionado: string; disponibles: ConjuroDisponible[]; onChange: (id: string) => void }) {
  const [busqueda, setBusqueda] = useState('')
  const [nivel, setNivel] = useState<number | null>(null)
  const [abierto, setAbierto] = useState(!seleccionado)
  const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
  const actual = disponibles.find(c => c.id === seleccionado)
  const niveles = [...new Set(disponibles.map(c => c.nivel))].sort((a, b) => a - b)
  const resultados = disponibles.filter(c => (nivel === null || c.nivel === nivel) && normalizar(c.nombre).includes(normalizar(busqueda)))
  const elegir = (id: string) => { onChange(id); setAbierto(false); setBusqueda(''); setNivel(null) }
  return <div className="selector-conjuro">
    {!abierto && <div className="selector-conjuro__elegido">
      <div>
        <strong>{actual?.nombre ?? (seleccionado ? 'Conjuro no disponible' : 'Ningún conjuro seleccionado')}</strong>
        {actual && <p className="clase-form__hint">Nivel {actual.nivel}{actual.libro ? ` · ${actual.libro}` : ''}</p>}
      </div>
      <button type="button" onClick={() => setAbierto(true)}>{seleccionado ? 'Cambiar' : 'Elegir conjuro'}</button>
    </div>}
    {abierto && <div className="selector-conjuro__buscador">
      <div className="selector-conjuro__encabezado">
        <strong>Elegí un conjuro</strong>
        {seleccionado && <button type="button" onClick={() => { setAbierto(false); setBusqueda(''); setNivel(null) }}>Cancelar</button>}
      </div>
      <input type="search" aria-label="Buscar conjuro por nombre" autoFocus placeholder="Buscar por nombre, por ejemplo: Escudo" value={busqueda} onChange={e => setBusqueda(e.target.value)}/>
      <div className="selector-conjuro__filtros" role="group" aria-label="Filtrar por nivel de conjuro">
        <button type="button" className={nivel === null ? 'activo' : ''} aria-pressed={nivel === null} onClick={() => setNivel(null)}>Todos</button>
        {niveles.map(n => <button type="button" key={n} className={nivel === n ? 'activo' : ''} aria-pressed={nivel === n} onClick={() => setNivel(n)}>{n === 0 ? 'Trucos' : `Nivel ${n}`}</button>)}
      </div>
      <p className="clase-form__hint">{resultados.length} {resultados.length === 1 ? 'conjuro encontrado' : 'conjuros encontrados'} · Ordenados por nivel y nombre</p>
      <div className="selector-conjuro__resultados" role="list" aria-label="Resultados de conjuros">
        {resultados.map(c => <button type="button" role="listitem" key={c.id} className={c.id === seleccionado ? 'selector-conjuro__resultado seleccionado' : 'selector-conjuro__resultado'} onClick={() => elegir(c.id)}>
          <span><strong>{c.nombre}</strong>{c.libro && <small>{c.libro}</small>}</span>
          <span className="selector-conjuro__nivel">{c.nivel === 0 ? 'Truco' : `Nivel ${c.nivel}`}{c.id === seleccionado ? ' · Actual' : ''}</span>
        </button>)}
        {resultados.length === 0 && <p className="clase-form__hint">No hay conjuros que coincidan. Probá con otro nombre o nivel.</p>}
      </div>
    </div>}
  </div>
}

export default function ConjurosRasgoEditor({ conjuros, disponibles, onChange }: Props) {
  const ordenados = [...disponibles].sort((a,b) => a.nivel-b.nivel || a.nombre.localeCompare(b.nombre,'es'))
  const cambiar = (id: string, cambios: Partial<ConjuroDeRasgo>) => onChange(conjuros.map(c => c.id === id ? { ...c, ...cambios } : c))
  return <section className="clase-form__panel">
    <h4>Conjuros otorgados por esta característica</h4>
    <p className="clase-form__hint">El nivel de obtención es el nivel de la característica. Otorgar un conjuro no concede espacios de conjuro.</p>
    {conjuros.map(c => <div key={c.id} className="clase-form__item">
      <SelectorConjuro seleccionado={c.conjuroId} disponibles={ordenados} onChange={conjuroId => cambiar(c.id, { conjuroId })}/>
      <label>Cómo se obtiene
        <select value={c.otorgamiento} onChange={e => cambiar(c.id, { otorgamiento: e.target.value as ConjuroDeRasgo['otorgamiento'] })}>
          <option value="aprendido">Aprendido</option>
          <option value="siempre_preparado">Siempre preparado</option>
          <option value="solo_caracteristica">Solo otorgado por característica</option>
        </select>
      </label>
      <label>Cómo se lanza
        <select value={c.modoUso} onChange={e => cambiar(c.id, { modoUso: e.target.value as ConjuroDeRasgo['modoUso'] })}>
          <option value="normal">Gastando espacios de conjuro</option>
          <option value="gratis">Usos gratuitos sin gastar espacios</option>
          <option value="exclusivo">Solo mediante usos de esta característica</option>
        </select>
      </label>
      {c.modoUso !== 'normal' && <>
        <label>Usos gratuitos
          <input type="number" min={1} max={999} value={c.usosGratuitos} onChange={e => cambiar(c.id, { usosGratuitos: Math.max(1, Math.min(999, Number(e.target.value) || 1)) })}/>
        </label>
        <label>Se recuperan tras
          <select value={c.recuperacion} onChange={e => cambiar(c.id, { recuperacion: e.target.value as ConjuroDeRasgo['recuperacion'] })}>
            <option value="corto">Descanso corto</option>
            <option value="largo">Descanso largo</option>
            <option value="ambos">Descanso corto o largo</option>
          </select>
        </label>
      </>}
      {c.modoUso === 'gratis' && <label><input type="checkbox" checked={c.permiteEspacios} onChange={e => cambiar(c.id, { permiteEspacios: e.target.checked })}/> También se puede lanzar gastando espacios</label>}
      <button type="button" className="clase-form__danger" onClick={() => onChange(conjuros.filter(x => x.id !== c.id))}>Quitar conjuro</button>
    </div>)}
    <button type="button" onClick={() => onChange([...conjuros, nuevo()])}>+ Agregar conjuro</button>
  </section>
}
