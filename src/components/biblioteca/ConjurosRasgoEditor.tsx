import { useState } from 'react'

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
  const [abierto, setAbierto] = useState(!seleccionado)
  const normalizar = (valor: string) => valor.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('es').trim()
  const resultados = disponibles.filter(c => normalizar(c.nombre).includes(normalizar(busqueda)))
  const actual = disponibles.find(c => c.id === seleccionado)
  return <div>
    {seleccionado && !abierto && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <strong>{actual ? `Nivel ${actual.nivel} — ${actual.nombre}` : `Conjuro no disponible (${seleccionado})`}</strong>
      <button type="button" onClick={() => setAbierto(true)}>Cambiar conjuro</button>
    </div>}
    {abierto && <>
      <label>Buscar conjuro por nombre
        <input type="search" value={busqueda} placeholder="Ej.: Bola de fuego" onChange={e => setBusqueda(e.target.value)} autoComplete="off"/>
      </label>
      <label>Resultados ({resultados.length})
        <select size={Math.min(7, Math.max(2, resultados.length + 1))} value={seleccionado} onChange={e => { onChange(e.target.value); setAbierto(false); setBusqueda('') }}>
          <option value="" disabled>Seleccioná un conjuro</option>
          {seleccionado && !resultados.some(c => c.id === seleccionado) && <option value={seleccionado}>{actual ? `Nivel ${actual.nivel} — ${actual.nombre} (seleccionado)` : 'Conjuro seleccionado no disponible'}</option>}
          {resultados.map(c => <option key={c.id} value={c.id}>Nivel {c.nivel} — {c.nombre}{c.libro ? ` — ${c.libro}` : ''}</option>)}
        </select>
      </label>
      {resultados.length === 0 && <p className="clase-form__hint">No se encontraron conjuros con ese nombre.</p>}
      {seleccionado && <button type="button" onClick={() => { setAbierto(false); setBusqueda('') }}>Cancelar cambio</button>}
    </>}
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
