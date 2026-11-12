import { useState } from 'react'
import type { Dote, OpcionEquipoInicial, Trasfondo } from '../../types/trasfondo'
import type { Elemento } from '../../services/chronicleLibros'
import '../../styles/TrasfondoForm.css'

type Props = {
  initialData?: Trasfondo
  trasfondos: Trasfondo[]
  dotes: Dote[]
  objetos: Elemento[]
  onSave: (trasfondo: Trasfondo) => void
  onCancel: () => void
  onCrearDote: () => void
  onCrearObjeto: () => void
}
const caracteristicas = ['Fuerza', 'Destreza', 'Constitución', 'Inteligencia', 'Sabiduría', 'Carisma']
const habilidades = ['Acrobacias', 'Arcanos', 'Atletismo', 'Engaño', 'Historia', 'Interpretación', 'Intimidación', 'Investigación', 'Juego de Manos', 'Medicina', 'Naturaleza', 'Percepción', 'Perspicacia', 'Persuasión', 'Religión', 'Sigilo', 'Supervivencia', 'Trato con Animales']
const nuevoEquipo = (nombre: string): OpcionEquipoInicial => ({ id: crypto.randomUUID(), nombre, objetos: [], monedas: [] })
const cambiarEnLista = (actual: string[], valor: string, activo: boolean) => activo ? [...actual, valor] : actual.filter(x => x !== valor)

export default function TrasfondoForm({ initialData, trasfondos, dotes, objetos, onSave, onCancel, onCrearDote, onCrearObjeto }: Props) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '')
  const [caracs, setCaracs] = useState(initialData?.caracteristicas ?? [])
  const [doteId, setDoteId] = useState(initialData?.doteOrigenId ?? '')
  const [listaFija, setListaFija] = useState(initialData?.listaConjurosFijada ?? '')
  const [skills, setSkills] = useState(initialData?.competenciasHabilidades ?? [])
  const [tools, setTools] = useState((initialData?.competenciasHerramientas ?? []).join(', '))
  const [opciones, setOpciones] = useState<OpcionEquipoInicial[]>(initialData?.opcionesEquipo ?? [nuevoEquipo('A'), nuevoEquipo('B')])
  const [error, setError] = useState('')
  const dote = dotes.find(d => d.id === doteId)
  const listasMagia = dote?.seleccionConjuros?.listasPermitidas ?? []

  function actualizarOpcion(id: string, cambio: Partial<OpcionEquipoInicial>) {
    setOpciones(actuales => actuales.map(o => o.id === id ? { ...o, ...cambio } : o))
  }
  function guardar() {
    if (!nombre.trim()) { setError('Ingresá el nombre del trasfondo.'); return }
    if (trasfondos.some(t => t.id !== initialData?.id && t.nombre.trim().toLowerCase() === nombre.trim().toLowerCase())) { setError('Ya existe un trasfondo con ese nombre.'); return }
    if (caracs.length !== 3) { setError('Seleccioná exactamente tres características.'); return }
    if (!doteId || !dote) { setError('Seleccioná una dote de origen válida.'); return }
    if (listaFija && !listasMagia.includes(listaFija)) { setError('La lista de magia fijada no está permitida por la dote.'); return }
    if (skills.length !== 2) { setError('Seleccioná exactamente dos habilidades.'); return }
    if (opciones.some(o => !o.nombre.trim() || o.objetos.some(x => !x.objetoId || !Number.isInteger(x.cantidad) || x.cantidad < 1) || o.monedas.some(x => !x.moneda.trim() || !Number.isInteger(x.cantidad) || x.cantidad < 0))) { setError('Revisá las opciones de equipo y sus cantidades.'); return }
    onSave({ id: initialData?.id ?? crypto.randomUUID(), nombre: nombre.trim(), descripcion: descripcion.trim(), caracteristicas: caracs, doteOrigenId: doteId, ...(listaFija ? { listaConjurosFijada: listaFija } : {}), competenciasHabilidades: skills, competenciasHerramientas: tools.split(',').map(x => x.trim()).filter(Boolean), opcionesEquipo: opciones, ...(initialData?.datosAdicionales ? { datosAdicionales: initialData.datosAdicionales } : {}) })
  }

  return <section className="nueva-propuesta-panel trasfondo-form">
    <h3>{initialData ? 'Editar trasfondo' : 'Agregar trasfondo'}</h3>
    <div className="nueva-propuesta-field"><label htmlFor="trasfondo-nombre">Nombre *</label><input id="trasfondo-nombre" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Granjero"/></div>
    <div className="nueva-propuesta-field"><label htmlFor="trasfondo-descripcion">Descripción</label><textarea id="trasfondo-descripcion" rows={4} value={descripcion} onChange={e => setDescripcion(e.target.value)}/></div>
    <fieldset><legend>Características (elegí tres)</legend><div className="trasfondo-grid">{caracteristicas.map(c => <label key={c} className="trasfondo-check"><input type="checkbox" checked={caracs.includes(c)} disabled={!caracs.includes(c) && caracs.length >= 3} onChange={e => setCaracs(actuales => cambiarEnLista(actuales, c, e.target.checked))}/>{c}</label>)}</div></fieldset>
    <fieldset><legend>Dote de origen</legend>
      <div className="nueva-propuesta-field"><label htmlFor="trasfondo-dote">Dote *</label><select id="trasfondo-dote" value={doteId} onChange={e => { setDoteId(e.target.value); setListaFija('') }}><option value="">Seleccioná una dote</option>{dotes.filter(d => d.categoria === 'origen').map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></div>
      <button className="trasfondo-add" type="button" onClick={onCrearDote}>Crear dote de origen</button>
      {listasMagia.length > 0 && <div className="nueva-propuesta-field"><label htmlFor="trasfondo-lista">Lista de conjuros fijada por este trasfondo</label><select id="trasfondo-lista" value={listaFija} onChange={e => setListaFija(e.target.value)}><option value="">El personaje elige la lista</option>{listasMagia.map(l => <option key={l} value={l}>{l}</option>)}</select><small>Si fijás una lista, el personaje solo podrá elegir conjuros de esa clase.</small></div>}
    </fieldset>
    <fieldset><legend>Competencias en habilidades (elegí dos)</legend><div className="trasfondo-grid">{habilidades.map(h => <label key={h} className="trasfondo-check"><input type="checkbox" checked={skills.includes(h)} disabled={!skills.includes(h) && skills.length >= 2} onChange={e => setSkills(actuales => cambiarEnLista(actuales, h, e.target.checked))}/>{h}</label>)}</div></fieldset>
    <fieldset><legend>Competencias en herramientas</legend><div className="nueva-propuesta-field"><label htmlFor="trasfondo-tools">Herramientas (separadas por coma)</label><input id="trasfondo-tools" value={tools} onChange={e => setTools(e.target.value)} placeholder="Ej.: Herramientas de carpintero"/></div></fieldset>
    <fieldset><legend>Equipo inicial: alternativas</legend>
      <p className="trasfondo-hint">El personaje elegirá una de estas opciones. Podés combinar objetos y monedas.</p>
      {opciones.map(op => <div className="trasfondo-equipo" key={op.id}>
        <div className="trasfondo-equipo-header"><div className="nueva-propuesta-field"><label>Nombre de opción</label><input value={op.nombre} onChange={e => actualizarOpcion(op.id, { nombre: e.target.value })}/></div><button type="button" className="trasfondo-remove" onClick={() => setOpciones(actuales => actuales.filter(x => x.id !== op.id))}>Eliminar opción</button></div>
        {op.objetos.map((obj, i) => <div className="trasfondo-equipo-row" key={i}><div className="nueva-propuesta-field"><label>Objeto</label><select value={obj.objetoId} onChange={e => actualizarOpcion(op.id, { objetos: op.objetos.map((x,j) => i === j ? { ...x, objetoId: e.target.value } : x) })}><option value="">Seleccionar objeto</option>{objetos.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></div><div className="nueva-propuesta-field"><label>Cantidad</label><input type="number" min={1} value={obj.cantidad} onChange={e => actualizarOpcion(op.id, { objetos: op.objetos.map((x,j) => i === j ? { ...x, cantidad: Number(e.target.value) } : x) })}/></div><button type="button" className="trasfondo-remove" onClick={() => actualizarOpcion(op.id, { objetos: op.objetos.filter((_,j) => i !== j) })}>Quitar</button></div>)}
        {op.monedas.map((mon, i) => <div className="trasfondo-equipo-row" key={i}><div className="nueva-propuesta-field"><label>Moneda</label><select value={mon.moneda} onChange={e => actualizarOpcion(op.id, { monedas: op.monedas.map((x,j) => i === j ? { ...x, moneda: e.target.value } : x) })}><option value="PO">PO</option><option value="PP">PP</option><option value="PC">PC</option><option value="PE">PE</option><option value="PPt">PPt</option></select></div><div className="nueva-propuesta-field"><label>Cantidad</label><input type="number" min={0} value={mon.cantidad} onChange={e => actualizarOpcion(op.id, { monedas: op.monedas.map((x,j) => i === j ? { ...x, cantidad: Number(e.target.value) } : x) })}/></div><button type="button" className="trasfondo-remove" onClick={() => actualizarOpcion(op.id, { monedas: op.monedas.filter((_,j) => i !== j) })}>Quitar</button></div>)}
        <div className="trasfondo-equipo-actions"><button type="button" className="trasfondo-add" onClick={() => actualizarOpcion(op.id, { objetos: [...op.objetos, { objetoId: '', cantidad: 1 }] })}>+ Objeto</button><button type="button" className="trasfondo-add" onClick={() => actualizarOpcion(op.id, { monedas: [...op.monedas, { moneda: 'PO', cantidad: 0 }] })}>+ Monedas</button><button type="button" className="trasfondo-add" onClick={onCrearObjeto}>Crear objeto</button></div>
      </div>)}
      <button type="button" className="trasfondo-add" onClick={() => setOpciones(actuales => [...actuales, nuevoEquipo(String.fromCharCode(65 + actuales.length))])}>+ Agregar alternativa</button>
    </fieldset>
    {error && <p role="alert" className="trasfondo-error">{error}</p>}
    <div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-cancel" onClick={onCancel}>Cancelar</button><button type="button" className="nueva-propuesta-next" onClick={guardar}>Guardar trasfondo</button></div>
  </section>
}
