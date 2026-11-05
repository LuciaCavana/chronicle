
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { RasgoEspecie } from '../../types/especie'
import '../../styles/RasgosEspecie.css'

type Props = {
  rasgos: RasgoEspecie[]
  onChange: (rasgos: RasgoEspecie[]) => void
}

export default function RasgosEspecie({
  rasgos,
  onChange,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  function agregar() {
    setEditingId(null)
    setNombre('')
    setDescripcion('')
    setShowForm(true)
  }

  function editar(rasgo: RasgoEspecie) {
    setEditingId(rasgo.id)
    setNombre(rasgo.nombre)
    setDescripcion(rasgo.descripcion)
    setShowForm(true)
  }

  function cancelar() {
    setShowForm(false)
    setEditingId(null)
    setNombre('')
    setDescripcion('')
  }

  function guardar() {
    if (!nombre.trim()) return

    if (editingId) {
      onChange(
        rasgos.map((rasgo) =>
          rasgo.id === editingId
            ? {
                ...rasgo,
                nombre: nombre.trim(),
                descripcion,
              }
            : rasgo
        )
      )
    } else {
      onChange([
        ...rasgos,
        {
          id: crypto.randomUUID(),
          nombre: nombre.trim(),
          descripcion,
        },
      ])
    }

    cancelar()
  }

  function eliminar(id: string) {
    onChange(rasgos.filter((rasgo) => rasgo.id !== id))
    setExpandedIds((current) =>
      current.filter((item) => item !== id)
    )
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  return (
    <div className="rasgos-especie">
      <div className="rasgos-especie-header">
        <h4>Rasgos de especie</h4>

        {!showForm && (
          <button
            type="button"
            className="rasgos-especie-add"
            onClick={agregar}
          >
            <Plus size={16} />
            Agregar rasgo
          </button>
        )}
      </div>

      {rasgos.length === 0 && !showForm && (
        <p className="rasgos-especie-empty">
          Todavía no agregaste rasgos.
        </p>
      )}

      <div className="rasgos-especie-list">
        {rasgos.map((rasgo) => {
          const expanded = expandedIds.includes(rasgo.id)
          const isLong = rasgo.descripcion.length > 140

          return (
            <div
              className="rasgos-especie-card"
              key={rasgo.id}
            >
              <div className="rasgos-especie-card-header">
                <strong>{rasgo.nombre}</strong>

                <div className="rasgos-especie-card-actions">
                  <button
                    type="button"
                    title="Editar rasgo"
                    aria-label={`Editar ${rasgo.nombre}`}
                    onClick={() => editar(rasgo)}
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    title="Eliminar rasgo"
                    aria-label={`Eliminar ${rasgo.nombre}`}
                    onClick={() => eliminar(rasgo.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p>
                {expanded || !isLong
                  ? rasgo.descripcion
                  : `${rasgo.descripcion.slice(0, 140)}...`}
              </p>

              {isLong && (
                <button
                  type="button"
                  className="rasgos-especie-expand"
                  onClick={() => toggleExpanded(rasgo.id)}
                >
                  {expanded ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="rasgos-especie-editor">
          <h5>
            {editingId ? 'Editar rasgo' : 'Nuevo rasgo'}
          </h5>

          <div className="nueva-propuesta-field">
            <label htmlFor="trait-name">
              Nombre del rasgo *
            </label>
            <input
              id="trait-name"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Visión en la oscuridad"
            />
          </div>

          <div className="nueva-propuesta-field">
            <label htmlFor="trait-description">
              Descripción
            </label>
            <textarea
              id="trait-description"
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describí el funcionamiento del rasgo..."
            />
          </div>

          <div className="rasgos-especie-editor-actions">
            <button
              type="button"
              className="nueva-propuesta-cancel"
              onClick={cancelar}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="nueva-propuesta-next"
              disabled={!nombre.trim()}
              onClick={guardar}
            >
              Guardar rasgo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
