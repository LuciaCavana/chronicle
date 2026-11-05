
import { useState } from 'react'

export type Especie = {
  id: string
  nombre: string
  descripcion: string
  tamano: string
  velocidad: string
  pagina: string
}

type EspecieFormProps = {
  bookTitle: string
  bookCode: string
  onSave: (especie: Especie) => void
  onCancel: () => void
}

export default function EspecieForm({
  bookTitle,
  bookCode,
  onSave,
  onCancel,
}: EspecieFormProps) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [tamano, setTamano] = useState('')
  const [velocidad, setVelocidad] = useState('')
  const [pagina, setPagina] = useState('')

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!nombre.trim()) return

    onSave({
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      descripcion,
      tamano,
      velocidad,
      pagina,
    })
  }

  return (
    <form
      className="nueva-propuesta-panel"
      onSubmit={handleSubmit}
    >
      <h3>Agregar especie</h3>

      <p className="nueva-propuesta-help">
        Libro de origen: {bookTitle}
        {bookCode && ` (${bookCode})`}
      </p>

      <div className="nueva-propuesta-field">
        <label htmlFor="species-name">Nombre *</label>
        <input
          id="species-name"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          placeholder="Ej. Elfo"
        />
      </div>

      <div className="nueva-propuesta-field">
        <label htmlFor="species-description">
          Descripción
        </label>
        <textarea
          id="species-description"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={4}
          placeholder="Descripción de la especie..."
        />
      </div>

      <div className="nueva-propuesta-fields-row">
        <div className="nueva-propuesta-field">
          <label htmlFor="species-size">Tamaño</label>
          <select
            id="species-size"
            value={tamano}
            onChange={(e) => setTamano(e.target.value)}
          >
            <option value="">Seleccionar</option>
            <option value="Pequeño">Pequeño</option>
            <option value="Mediano">Mediano</option>
            <option value="Grande">Grande</option>
          </select>
        </div>

        <div className="nueva-propuesta-field">
          <label htmlFor="species-speed">
            Velocidad
          </label>
          <input
            id="species-speed"
            value={velocidad}
            onChange={(e) => setVelocidad(e.target.value)}
            placeholder="Ej. 30 pies"
          />
        </div>
      </div>

      <div className="nueva-propuesta-field">
        <label htmlFor="species-page">
          Página de referencia
        </label>
        <input
          id="species-page"
          type="number"
          min="1"
          value={pagina}
          onChange={(e) => setPagina(e.target.value)}
          placeholder="Ej. 186"
        />
      </div>

      <div className="nueva-propuesta-actions">
        <button
          type="button"
          className="nueva-propuesta-cancel"
          onClick={onCancel}
        >
          Cancelar
        </button>

        <button
          type="submit"
          className="nueva-propuesta-next"
          disabled={!nombre.trim()}
        >
          Guardar especie
        </button>
      </div>
    </form>
  )
}
