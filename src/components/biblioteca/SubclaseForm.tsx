import { useState } from 'react'
import type { Elemento } from '../../services/chronicleLibros'
import { EditorDescripcion } from '../shared/EditorDescripcion'
import '../../styles/ClaseForm.css'

type Rasgo = { id: string; nombre: string; descripcion: string; nivel: number }
type Recurso = { id: string; nombre: string; descripcion: string; recuperacion: string }
type ConjuroOtorgado = { id: string; conjuroId: string; nivelClase: number; otorgamiento: 'aprendido' | 'siempre_preparado' | 'capacidad_especial'; usos: string }
type ConjuroDisponible = { id: string; nombre: string; libro?: string }
type Datos = { claseId: string; rasgos: Rasgo[]; recursos: Recurso[]; conjurosOtorgados: ConjuroOtorgado[] }
type Props = { elemento: Elemento; clases: (Elemento & { libroOrigenTitulo?: string })[]; conjurosDisponibles: ConjuroDisponible[]; onChange: (elemento: Elemento) => void }
const idNuevo = () => crypto.randomUUID()

export default function SubclaseForm({ elemento, clases, conjurosDisponibles, onChange }: Props) {
  const datosOriginales = elemento.datos as Partial<Datos>
  const datos: Datos = {
    claseId: typeof datosOriginales.claseId === 'string' ? datosOriginales.claseId : '',
    rasgos: Array.isArray(datosOriginales.rasgos) ? datosOriginales.rasgos : [],
    recursos: Array.isArray(datosOriginales.recursos) ? datosOriginales.recursos : [],
    conjurosOtorgados: Array.isArray(datosOriginales.conjurosOtorgados) ? datosOriginales.conjurosOtorgados : [],
  }
  const [editorRasgo, setEditorRasgo] = useState<Rasgo | null>(null)
  const clasePrincipal = clases.find(c => c.id === datos.claseId)
  const niveles = Array.isArray(clasePrincipal?.datos?.nivelesSubclase) ? [...new Set((clasePrincipal.datos.nivelesSubclase as unknown[]).filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 20))].sort((a,b)=>a-b) : []
  const actualizar = (cambios: Partial<Datos>) => onChange({ ...elemento, datos: { ...elemento.datos, ...datos, ...cambios } })
  return <div className="clase-form">
    <section className="clase-form__panel">
      <h4>Clase principal *</h4>
      <p className="clase-form__hint">La subclase queda vinculada a esta clase mediante su identificador, incluso si se cambia el nombre.</p>
      <select value={datos.claseId} onChange={e => actualizar({ claseId: e.target.value })}>
        <option value="">Seleccioná una clase</option>
        {clases.map(c => <option key={c.id} value={c.id}>{c.nombre || 'Clase sin nombre'}{c.libroOrigenTitulo ? ` — ${c.libroOrigenTitulo}` : ' — Este libro'}</option>)}
      </select>
      <h4>Características de la subclase</h4>
      <p className="clase-form__hint">Los niveles disponibles se configuran en la clase principal.</p>
      {datos.claseId && niveles.length === 0 && <p className="clase-form__hint">La clase seleccionada todavía no tiene niveles de mejora de subclase configurados. Editá la clase principal y marcá sus niveles.</p>}
      {datos.rasgos.some(r => !niveles.includes(r.nivel)) && <p className="clase-form__hint">Hay características guardadas en niveles que ya no están habilitados. Podés editarlas y asignarles uno de los niveles actuales.</p>}
      {datos.rasgos.length === 0 && <p className="clase-form__hint">Todavía no hay características cargadas.</p>}
      <div className="clase-form__lista-rasgos">
        {[...datos.rasgos].sort((a,b) => a.nivel-b.nivel).map(rasgo => <div className="clase-form__resumen-rasgo" key={rasgo.id}>
          <div><strong>{rasgo.nombre || 'Sin nombre'}</strong><span>Nivel {rasgo.nivel}</span></div>
          <div className="clase-form__acciones-rasgo">
            <button type="button" onClick={() => setEditorRasgo({ ...rasgo })}>Editar</button>
            <button type="button" className="clase-form__danger" onClick={() => actualizar({ rasgos: datos.rasgos.filter(r => r.id !== rasgo.id) })}>Eliminar</button>
          </div>
        </div>)}
      </div>
      <button type="button" disabled={niveles.length === 0} onClick={() => setEditorRasgo({ id: idNuevo(), nombre: '', descripcion: '', nivel: niveles[0] })}>+ Agregar característica</button>
      <h4>Conjuros otorgados por nivel</h4>
      <p className="clase-form__hint">Se desbloquean según el nivel de esta clase, no el nivel total del personaje. Otorgar un conjuro no concede espacios de conjuro.</p>
      {datos.conjurosOtorgados.map(otorgado => <div className="clase-form__item" key={otorgado.id}>
        <label>Nivel de clase
          <input type="number" min={1} max={20} value={otorgado.nivelClase} onChange={e => actualizar({ conjurosOtorgados: datos.conjurosOtorgados.map(c => c.id === otorgado.id ? { ...c, nivelClase: Math.min(20, Math.max(1, Number(e.target.value) || 1)) } : c) })}/>
        </label>
        <label>Conjuro
          <select value={otorgado.conjuroId} onChange={e => actualizar({ conjurosOtorgados: datos.conjurosOtorgados.map(c => c.id === otorgado.id ? { ...c, conjuroId: e.target.value } : c) })}>
            <option value="">Seleccioná un conjuro</option>
            {otorgado.conjuroId && !conjurosDisponibles.some(c => c.id === otorgado.conjuroId) && <option value={otorgado.conjuroId}>Conjuro no disponible ({otorgado.conjuroId})</option>}
            {conjurosDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.libro ? ` — ${c.libro}` : ''}</option>)}
          </select>
        </label>
        <label>Tipo de otorgamiento
          <select value={otorgado.otorgamiento} onChange={e => actualizar({ conjurosOtorgados: datos.conjurosOtorgados.map(c => c.id === otorgado.id ? { ...c, otorgamiento: e.target.value as ConjuroOtorgado['otorgamiento'] } : c) })}>
            <option value="aprendido">Aprendido</option>
            <option value="siempre_preparado">Siempre preparado</option>
            <option value="capacidad_especial">Capacidad especial</option>
          </select>
        </label>
        <label>Usos o límite (opcional)
          <input value={otorgado.usos} placeholder="Ej.: 1 por descanso largo" onChange={e => actualizar({ conjurosOtorgados: datos.conjurosOtorgados.map(c => c.id === otorgado.id ? { ...c, usos: e.target.value } : c) })}/>
        </label>
        <button type="button" className="clase-form__danger" onClick={() => actualizar({ conjurosOtorgados: datos.conjurosOtorgados.filter(c => c.id !== otorgado.id) })}>Quitar conjuro</button>
      </div>)}
      <button type="button" onClick={() => actualizar({ conjurosOtorgados: [...datos.conjurosOtorgados, { id: idNuevo(), conjuroId: '', nivelClase: 3, otorgamiento: 'siempre_preparado', usos: '' }] })}>+ Agregar conjuro</button>
      <h4>Recursos internos</h4>
      <p className="clase-form__hint">Se guardan para la ficha del personaje y no aparecen en la lectura del libro.</p>
      {datos.recursos.map(recurso => <div className="clase-form__item" key={recurso.id}>
        <label>Nombre<input value={recurso.nombre} onChange={e => actualizar({ recursos: datos.recursos.map(r => r.id === recurso.id ? { ...r, nombre: e.target.value } : r) })}/></label>
        <label>Recuperación<input value={recurso.recuperacion} onChange={e => actualizar({ recursos: datos.recursos.map(r => r.id === recurso.id ? { ...r, recuperacion: e.target.value } : r) })}/></label>
        <label>Descripción<textarea value={recurso.descripcion} onChange={e => actualizar({ recursos: datos.recursos.map(r => r.id === recurso.id ? { ...r, descripcion: e.target.value } : r) })}/></label>
        <button type="button" onClick={() => actualizar({ recursos: datos.recursos.filter(r => r.id !== recurso.id) })}>Eliminar recurso</button>
      </div>)}
      <button type="button" onClick={() => actualizar({ recursos: [...datos.recursos, { id: idNuevo(), nombre: '', descripcion: '', recuperacion: '' }] })}>Agregar recurso</button>
    </section>
    {editorRasgo && <div className="clase-form__overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setEditorRasgo(null) }}>
      <form className="clase-form__modal clase-form__editor-rasgo" role="dialog" aria-modal="true" aria-label="Editar característica" onSubmit={e => {
        e.preventDefault()
        if (!editorRasgo.nombre.trim() || !niveles.includes(editorRasgo.nivel)) return
        const rasgo = { ...editorRasgo, nombre: editorRasgo.nombre.trim() }
        actualizar({ rasgos: datos.rasgos.some(r => r.id === rasgo.id) ? datos.rasgos.map(r => r.id === rasgo.id ? rasgo : r) : [...datos.rasgos, rasgo] })
        setEditorRasgo(null)
      }}>
        <div className="clase-form__heading">
          <h4>{datos.rasgos.some(r => r.id === editorRasgo.id) ? 'Editar característica' : 'Nueva característica'}</h4>
          <button type="button" onClick={() => setEditorRasgo(null)}>Cerrar</button>
        </div>
        <label>Nombre<input autoFocus required value={editorRasgo.nombre} onChange={e => setEditorRasgo({ ...editorRasgo, nombre: e.target.value })} placeholder="Nombre de la característica" /></label>
        <label>Nivel en que se obtiene
          <select value={editorRasgo.nivel} onChange={e => setEditorRasgo({ ...editorRasgo, nivel: Number(e.target.value) })}>
            {!niveles.includes(editorRasgo.nivel) && <option value={editorRasgo.nivel} disabled>Nivel {editorRasgo.nivel} (ya no habilitado)</option>}
            {niveles.map(n => <option key={n} value={n}>Nivel {n}</option>)}
          </select>
        </label>
        <label>Descripción</label>
        <EditorDescripcion key={editorRasgo.id} value={editorRasgo.descripcion} onChange={descripcion => setEditorRasgo(actual => actual ? { ...actual, descripcion } : actual)} />
        <div className="clase-form__acciones-rasgo">
          <button type="button" onClick={() => setEditorRasgo(null)}>Cancelar</button>
          <button type="submit" disabled={!editorRasgo.nombre.trim() || !niveles.includes(editorRasgo.nivel)}>Guardar característica</button>
        </div>
      </form>
    </div>}
  </div>
}
