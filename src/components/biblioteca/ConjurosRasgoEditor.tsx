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
export default function ConjurosRasgoEditor({ conjuros, disponibles, onChange }: Props) {
  const ordenados = [...disponibles].sort((a,b) => a.nivel-b.nivel || a.nombre.localeCompare(b.nombre,'es'))
  const cambiar = (id: string, cambios: Partial<ConjuroDeRasgo>) => onChange(conjuros.map(c => c.id === id ? { ...c, ...cambios } : c))
  return <section className="clase-form__panel">
    <h4>Conjuros otorgados por esta característica</h4>
    <p className="clase-form__hint">El nivel de obtención es el nivel de la característica. Otorgar un conjuro no concede espacios de conjuro.</p>
    {conjuros.map(c => <div key={c.id} className="clase-form__item">
      <label>Conjuro
        <select value={c.conjuroId} onChange={e => cambiar(c.id, { conjuroId: e.target.value })}>
          <option value="">Seleccioná un conjuro</option>
          {c.conjuroId && !ordenados.some(x => x.id === c.conjuroId) && <option value={c.conjuroId}>Conjuro no disponible ({c.conjuroId})</option>}
          {ordenados.map(x => <option key={x.id} value={x.id}>Nivel {x.nivel} — {x.nombre}{x.libro ? ` — ${x.libro}` : ''}</option>)}
        </select>
      </label>
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
