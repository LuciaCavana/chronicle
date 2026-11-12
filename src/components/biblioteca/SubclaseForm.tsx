import { useState } from 'react'
import type { Elemento } from '../../services/chronicleLibros'
import { EditorDescripcion } from '../shared/EditorDescripcion'
import '../../styles/ClaseForm.css'

type Rasgo = { id: string; nombre: string; descripcion: string; nivel: number }
type Recurso = { id: string; nombre: string; descripcion: string; recuperacion: string }
type Datos = { claseId: string; rasgos: Rasgo[]; recursos: Recurso[] }
type Props = { elemento: Elemento; clases: Elemento[]; onChange: (elemento: Elemento) => void }
const idNuevo = () => crypto.randomUUID()

export default function SubclaseForm({ elemento, clases, onChange }: Props) {
  const datosOriginales = elemento.datos as Partial<Datos>
  const datos: Datos = {
    claseId: typeof datosOriginales.claseId === 'string' ? datosOriginales.claseId : '',
    rasgos: Array.isArray(datosOriginales.rasgos) ? datosOriginales.rasgos : [],
    recursos: Array.isArray(datosOriginales.recursos) ? datosOriginales.recursos : [],
  }
  const [editorRasgo, setEditorRasgo] = useState<Rasgo | null>(null)
  const actualizar = (cambios: Partial<Datos>) => onChange({ ...elemento, datos: { ...elemento.datos, ...datos, ...cambios } })
  return <div className="clase-form">
    <section className="clase-form__panel">
      <h4>Clase principal *</h4>
      <p className="clase-form__hint">La subclase queda vinculada a esta clase mediante su identificador, incluso si se cambia el nombre.</p>
      <select value={datos.claseId} onChange={e => actualizar({ claseId: e.target.value })}>
        <option value="">Seleccioná una clase</option>
        {clases.map(c => <option key={c.id} value={c.id}>{c.nombre || 'Clase sin nombre'}</option>)}
      </select>
      <h4>Características de la subclase</h4>
      <p className="clase-form__hint">Definí las características y el nivel de clase en que se obtienen.</p>
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
      <button type="button" onClick={() => setEditorRasgo({ id: idNuevo(), nombre: '', descripcion: '', nivel: 3 })}>+ Agregar característica</button>
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
        if (!editorRasgo.nombre.trim()) return
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
            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => <option key={n} value={n}>Nivel {n}</option>)}
          </select>
        </label>
        <label>Descripción</label>
        <EditorDescripcion key={editorRasgo.id} value={editorRasgo.descripcion} onChange={descripcion => setEditorRasgo(actual => actual ? { ...actual, descripcion } : actual)} />
        <div className="clase-form__acciones-rasgo">
          <button type="button" onClick={() => setEditorRasgo(null)}>Cancelar</button>
          <button type="submit" disabled={!editorRasgo.nombre.trim()}>Guardar característica</button>
        </div>
      </form>
    </div>}
  </div>
}
