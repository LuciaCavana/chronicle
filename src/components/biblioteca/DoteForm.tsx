import { useState } from 'react'
import type { Dote } from '../../types/trasfondo'
import '../../styles/EspecieForm.css'

type Props = {
  initialData?: Dote | null
  dotes: Dote[]
  onSave: (dote: Dote) => void
  onCancel: () => void
}

function lineas(texto: string): string[] {
  return texto.split('\n').map(linea => linea.trim()).filter(Boolean)
}

export default function DoteForm({ initialData, dotes, onSave, onCancel }: Props) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion ?? '')
  const [categoria, setCategoria] = useState(initialData?.categoria ?? 'origen')
  const [requisitos, setRequisitos] = useState((initialData?.requisitos ?? []).join('\n'))
  const [beneficios, setBeneficios] = useState((initialData?.beneficios ?? []).join('\n'))
  const [error, setError] = useState('')

  function guardar() {
    const nombreLimpio = nombre.trim()
    if (!nombreLimpio) { setError('Ingresá un nombre para la dote.'); return }
    if (dotes.some(d => d.id !== initialData?.id && d.nombre.trim().toLocaleLowerCase('es') === nombreLimpio.toLocaleLowerCase('es'))) {
      setError('Ya existe una dote con ese nombre.'); return
    }
    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      nombre: nombreLimpio,
      descripcion: descripcion.trim(),
      categoria: categoria.trim(),
      requisitos: lineas(requisitos),
      beneficios: lineas(beneficios),
      ...(initialData?.datosAdicionales ? { datosAdicionales: initialData.datosAdicionales } : {})
    })
  }

  return <section className="nueva-propuesta-panel especie-form">
    <h3>{initialData ? 'Editar dote' : 'Agregar dote'}</h3>
    <div className="nueva-propuesta-field"><label htmlFor="dote-nombre">Nombre *</label><input id="dote-nombre" value={nombre} onChange={e => { setNombre(e.target.value); setError('') }} /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-categoria">Categoría</label><input id="dote-categoria" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ej.: origen, general, épica" /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-requisitos">Requisitos (uno por línea)</label><textarea id="dote-requisitos" rows={3} value={requisitos} onChange={e => setRequisitos(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-beneficios">Beneficios (uno por línea)</label><textarea id="dote-beneficios" rows={5} value={beneficios} onChange={e => setBeneficios(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label htmlFor="dote-descripcion">Descripción</label><textarea id="dote-descripcion" rows={5} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></div>
    {error && <p role="alert">{error}</p>}
    <div className="nueva-propuesta-actions">
      <button type="button" className="nueva-propuesta-cancel" onClick={onCancel}>Cancelar</button>
      <button type="button" className="nueva-propuesta-next" onClick={guardar}>Guardar dote</button>
    </div>
  </section>
}
