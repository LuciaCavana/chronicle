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
  const [rasgoAbierto, setRasgoAbierto] = useState<string | null>(null)
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
      {datos.rasgos.map(rasgo => <div className="clase-form__item" key={rasgo.id}>
        <div className="clase-form__heading">
          <strong>Nivel {rasgo.nivel}: {rasgo.nombre || 'Nueva característica'}</strong>
          <button type="button" onClick={() => actualizar({ rasgos: datos.rasgos.filter(r => r.id !== rasgo.id) })}>Eliminar</button>
        </div>
        <label>Nombre<input value={rasgo.nombre} onChange={e => actualizar({ rasgos: datos.rasgos.map(r => r.id === rasgo.id ? { ...r, nombre: e.target.value } : r) })}/></label>
        <label>Nivel<input type="number" min={1} max={20} value={rasgo.nivel} onChange={e => actualizar({ rasgos: datos.rasgos.map(r => r.id === rasgo.id ? { ...r, nivel: Number(e.target.value) } : r) })}/></label>
        <button type="button" onClick={() => setRasgoAbierto(rasgoAbierto === rasgo.id ? null : rasgo.id)}>{rasgoAbierto === rasgo.id ? 'Cerrar descripción' : 'Editar descripción'}</button>
        {rasgoAbierto === rasgo.id && <EditorDescripcion value={rasgo.descripcion} onChange={descripcion => actualizar({ rasgos: datos.rasgos.map(r => r.id === rasgo.id ? { ...r, descripcion } : r) })}/>}
      </div>)}
      <button type="button" onClick={() => actualizar({ rasgos: [...datos.rasgos, { id: idNuevo(), nombre: '', descripcion: '', nivel: 3 }] })}>Agregar característica</button>
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
  </div>
}
