import { useState } from 'react'
import type { Conjuro } from '../../types/conjuro'
import ConjuroForm from './ConjuroForm'
import SeleccionConjurosDoteForm from './SeleccionConjurosDoteForm'
import type { Dote, EfectoDote, SeleccionConjurosDote } from '../../types/trasfondo'
import '../../styles/EspecieForm.css'
import '../../styles/DoteForm.css'

type Props = {
  initialData?: Dote | null
  dotes: Dote[]
  conjuros: Conjuro[]
  clasesDisponibles?: string[]
  onCrearConjuro: (conjuro: Conjuro) => void
  onSave: (dote: Dote) => void
  onCancel: () => void
}

function lineas(texto: string): string[] {
  return texto.split('\n').map(linea => linea.trim()).filter(Boolean)
}

export default function DoteForm({ initialData, dotes, conjuros, clasesDisponibles = [], onCrearConjuro, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '')
  const [categoria, setCategoria] = useState(initialData?.categoria ?? 'origen')
  const [requisitos, setRequisitos] = useState((initialData?.requisitos ?? []).join('\n'))
  const [beneficios, setBeneficios] = useState((initialData?.beneficios ?? []).join('\n'))
  const [libro, setLibro] = useState(initialData?.fuente?.libro ?? '')
  const [pagina, setPagina] = useState(initialData?.fuente?.pagina?.toString() ?? '')
  const [efectos, setEfectos] = useState<EfectoDote[]>(initialData?.efectos ?? [])
  const [conjurosIds, setConjurosIds] = useState<string[]>(initialData?.conjurosIds ?? [])
  const [seleccionConjuros, setSeleccionConjuros] = useState<SeleccionConjurosDote | null>(initialData?.seleccionConjuros ?? null)
  const [creandoConjuro, setCreandoConjuro] = useState(false)
  const [error, setError] = useState('')
  function cambiarEfecto(id: string, cambio: Partial<EfectoDote>) {
    setEfectos(actuales => actuales.map(efecto => efecto.id === id ? { ...efecto, ...cambio } : efecto))
  }

  function guardar() {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) { setError('Ingresá un nombre para la dote.'); return }
    if (dotes.some(d => d.id !== initialData?.id && d.nombre.trim().toLocaleLowerCase('es') === nombreLimpio.toLocaleLowerCase('es'))) {
      setError('Ya existe una dote con ese nombre.'); return
    }
    if (pagina.trim() && (!Number.isInteger(Number(pagina)) || Number(pagina) < 1)) { setError('La página debe ser un número entero positivo.'); return }
    if (efectos.some(e => !e.atributo.trim() || !Number.isFinite(e.valor))) { setError('Completá el atributo y el valor de cada efecto.'); return }
    if (seleccionConjuros && (seleccionConjuros.listasPermitidas.length === 0 || seleccionConjuros.selecciones.length === 0 || seleccionConjuros.selecciones.some(x => !Number.isInteger(x.nivel) || x.nivel < 0 || x.nivel > 9 || !Number.isInteger(x.cantidad) || x.cantidad < 1))) { setError('Definí al menos una lista y elecciones válidas de nivel y cantidad.'); return }
    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      nombre: nombreLimpio,
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      requisitos: lineas(requisitos),
      beneficios: lineas(beneficios),
      fuente: { libro: libro.trim(), ...(pagina.trim() ? { pagina: Number(pagina) } : {}) },
      efectos,
      conjurosIds,
      ...(seleccionConjuros ? { seleccionConjuros } : {}),
      ...(initialData?.datosAdicionales ? { datosAdicionales: initialData.datosAdicionales } : {})
    })
  }

  if (creandoConjuro) return <ConjuroForm conjuros={conjuros} onSave={conjuro => { onCrearConjuro(conjuro); setConjurosIds(actuales => [...actuales, conjuro.id]); setCreandoConjuro(false) }} onCancel={() => setCreandoConjuro(false)} />

  return <section className="nueva-propuesta-panel especie-form dote-form">
    <h3>{initialData ? 'Editar dote' : 'Agregar dote'}</h3>
    <div className="nueva-propuesta-field"><label htmlFor="dote-nombre">Nombre *</label><input id="dote-nombre" value={nombre} onChange={e => { setNombre(e.target.value); setError('') }} /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-categoria">Categoría *</label><select id="dote-categoria" value={categoria} onChange={e => setCategoria(e.target.value)}>
      <option value="origen">Dote de origen</option>
      <option value="general">Dote general</option>
      <option value="epica">Dote épica</option>
      <option value="estilo_combate">Dote de estilo de combate</option>
      {!['origen', 'general', 'epica', 'estilo_combate'].includes(categoria) && <option value={categoria}>{categoria} (categoría anterior)</option>}
    </select></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-requisitos">Requisitos (uno por línea)</label><textarea id="dote-requisitos" rows={3} value={requisitos} onChange={e => setRequisitos(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-beneficios">Beneficios (uno por línea)</label><textarea id="dote-beneficios" rows={5} value={beneficios} onChange={e => setBeneficios(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-descripcion">Descripción</label><textarea id="dote-descripcion" rows={5} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
    <fieldset className="dote-conjuros"><legend>Conjuros vinculados</legend>
      <p>Seleccioná los conjuros que otorga o referencia esta dote. La relación se guarda por ID.</p>
      {conjuros.length === 0 && <p>No hay conjuros cargados todavía.</p>}
      {conjuros.map(conjuro => <label key={conjuro.id} className="dote-conjuro-opcion">
        <input type="checkbox" checked={conjurosIds.includes(conjuro.id)} onChange={e => setConjurosIds(actuales => e.target.checked ? [...actuales, conjuro.id] : actuales.filter(id => id !== conjuro.id))} />
        {' '}{conjuro.nombre} ({conjuro.tipo === 'truco' ? 'Truco' : `Nivel ${conjuro.nivel}`})
      </label>)}
      <button type="button" className="dote-accion" onClick={() => setCreandoConjuro(true)}>Crear conjuro y vincularlo</button>
    </fieldset>
    <SeleccionConjurosDoteForm value={seleccionConjuros} onChange={setSeleccionConjuros} clasesDisponibles={clasesDisponibles}/>
    <fieldset><legend>Fuente</legend>
      <div className="nueva-propuesta-field"><label htmlFor="dote-libro">Libro</label><input id="dote-libro" value={libro} onChange={e => setLibro(e.target.value)} placeholder="Ej.: PHB 2024"/></div>
      <div className="nueva-propuesta-field"><label htmlFor="dote-pagina">Página</label><input id="dote-pagina" type="number" min={1} step={1} value={pagina} onChange={e => setPagina(e.target.value)}/></div>
    </fieldset>
    <fieldset><legend>Efectos para el motor (opcional)</legend>
      <p>Definí efectos declarativos. El motor deberá validar los atributos y eventos admitidos antes de aplicarlos.</p>
      {efectos.map(efecto => <div key={efecto.id} className="nueva-propuesta-panel">
        <div className="nueva-propuesta-field"><label>Evento</label><select value={efecto.evento} onChange={e => cambiarEfecto(efecto.id, { evento: e.target.value as EfectoDote['evento'] })}><option value="al_obtener">Al obtener la dote</option><option value="al_subir_nivel">Al subir de nivel</option><option value="pasivo">Pasivo</option></select></div>
        <div className="nueva-propuesta-field"><label>Atributo del motor</label><input value={efecto.atributo} onChange={e => cambiarEfecto(efecto.id, { atributo: e.target.value })} placeholder="Ej.: puntos_golpe_maximos"/></div>
        <div className="nueva-propuesta-field"><label>Operación</label><select value={efecto.operacion} onChange={e => cambiarEfecto(efecto.id, { operacion: e.target.value as EfectoDote['operacion'] })}><option value="sumar">Sumar</option><option value="establecer">Establecer</option></select></div>
        <div className="nueva-propuesta-field"><label>Valor</label><input type="number" value={efecto.valor} onChange={e => cambiarEfecto(efecto.id, { valor: Number(e.target.value) })}/></div>
        <div className="nueva-propuesta-field"><label>Escala</label><select value={efecto.escala ?? 'fijo'} onChange={e => cambiarEfecto(efecto.id, { escala: e.target.value as EfectoDote['escala'] })}><option value="fijo">Valor fijo</option><option value="nivel_personaje">Multiplicar por nivel del personaje</option></select></div>
        <button type="button" className="nueva-propuesta-cancel" onClick={() => setEfectos(actuales => actuales.filter(e => e.id !== efecto.id))}>Quitar efecto</button>
      </div>)}
      <button type="button" className="dote-accion" onClick={() => setEfectos(actuales => [...actuales, { id: crypto.randomUUID(), evento: 'al_obtener', atributo: '', operacion: 'sumar', valor: 0, escala: 'fijo' }])}>Agregar efecto</button>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    <div className="nueva-propuesta-actions">
      <button type="button" className="nueva-propuesta-cancel" onClick={onCancel}>Cancelar</button>
      <button type="button" className="nueva-propuesta-next" onClick={guardar}>Guardar dote</button>
    </div>
  </section>
}
