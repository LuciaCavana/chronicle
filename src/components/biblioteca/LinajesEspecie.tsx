
import { useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import type {
  LinajeEspecie,
  BeneficioNivel,
} from '../../types/especie'
import '../../styles/LinajesEspecie.css'

type Props = {
  linajes: LinajeEspecie[]
  onChange: (linajes: LinajeEspecie[]) => void
}

function nuevoBeneficio(): BeneficioNivel {
  return {
    id: crypto.randomUUID(),
    nivel: 1,
    descripcion: '',
  }
}

export default function LinajesEspecie({
  linajes,
  onChange,
}: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [formularioAbierto, setFormularioAbierto] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [beneficios, setBeneficios] = useState<BeneficioNivel[]>([])
  const [expandidos, setExpandidos] = useState<string[]>([])

  function limpiarFormulario() {
    setEditandoId(null)
    setFormularioAbierto(false)
    setNombre('')
    setDescripcion('')
    setBeneficios([])
  }

  function agregarLinaje() {
    limpiarFormulario()
    setFormularioAbierto(true)
  }

  function editarLinaje(linaje: LinajeEspecie) {
    setEditandoId(linaje.id)
    setNombre(linaje.nombre)
    setDescripcion(linaje.descripcion)
    setBeneficios(linaje.beneficios.map((beneficio) => ({ ...beneficio })))
    setFormularioAbierto(true)
  }

  function agregarBeneficio() {
    setBeneficios((actuales) => [...actuales, nuevoBeneficio()])
  }

  function actualizarBeneficio(
    id: string,
    campo: 'nivel' | 'descripcion',
    valor: string
  ) {
    setBeneficios((actuales) =>
      actuales.map((beneficio) => {
        if (beneficio.id !== id) return beneficio

        if (campo === 'nivel') {
          return { ...beneficio, nivel: Number(valor) }
        }

        return { ...beneficio, descripcion: valor }
      })
    )
  }

  function eliminarBeneficio(id: string) {
    setBeneficios((actuales) =>
      actuales.filter((beneficio) => beneficio.id !== id)
    )
  }

  function guardarLinaje() {
    const nombreLimpio = nombre.trim()

    if (!nombreLimpio) return

    const nombreRepetido = linajes.some(
      (linaje) =>
        linaje.id !== editandoId &&
        linaje.nombre.trim().toLocaleLowerCase('es') ===
          nombreLimpio.toLocaleLowerCase('es')
    )

    if (nombreRepetido) {
      alert('Ya existe un linaje con ese nombre.')
      return
    }

    if (
      beneficios.some(
        (beneficio) =>
          !Number.isInteger(beneficio.nivel) ||
          beneficio.nivel < 1 ||
          !beneficio.descripcion.trim()
      )
    ) {
      alert('Cada beneficio debe tener un nivel válido y una descripción.')
      return
    }

    const linajeGuardado: LinajeEspecie = {
      id: editandoId ?? crypto.randomUUID(),
      nombre: nombreLimpio,
      descripcion: descripcion.trim(),
      beneficios: beneficios
        .map((beneficio) => ({
          ...beneficio,
          descripcion: beneficio.descripcion.trim(),
        }))
        .sort((a, b) => a.nivel - b.nivel),
    }

    if (editandoId) {
      onChange(
        linajes.map((linaje) =>
          linaje.id === editandoId ? linajeGuardado : linaje
        )
      )
    } else {
      onChange([...linajes, linajeGuardado])
    }

    limpiarFormulario()
  }

  function eliminarLinaje(id: string) {
    if (!window.confirm('¿Eliminar este linaje?')) return

    onChange(linajes.filter((linaje) => linaje.id !== id))
  }

  function alternarExpandido(id: string) {
    setExpandidos((actuales) =>
      actuales.includes(id)
        ? actuales.filter((actual) => actual !== id)
        : [...actuales, id]
    )
  }

  return (
    <section className="linajes-especie">
      <div className="linajes-especie-heading">
        <div>
          <h4>Linajes</h4>
          <p>Agregá variantes de la especie y sus beneficios por nivel.</p>
        </div>

        {!formularioAbierto && (
          <button
            type="button"
            className="linajes-especie-add"
            onClick={agregarLinaje}
          >
            <Plus size={16} />
            Agregar linaje
          </button>
        )}
      </div>

      {formularioAbierto && (
        <div className="linajes-especie-form">
          <div className="linajes-especie-form-heading">
            <h5>
              {editandoId ? 'Editar linaje' : 'Nuevo linaje'}
            </h5>

            <button
              type="button"
              className="linajes-especie-icon"
              aria-label="Cerrar formulario"
              onClick={limpiarFormulario}
            >
              <X size={18} />
            </button>
          </div>

          <label>
            Nombre del linaje *
            <input
              type="text"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Ej. Alto elfo"
            />
          </label>

          <label>
            Descripción
            <textarea
              value={descripcion}
              onChange={(event) => setDescripcion(event.target.value)}
              placeholder="Descripción general del linaje..."
              rows={4}
            />
          </label>

          <div className="linajes-especie-beneficios-heading">
            <h5>Beneficios por nivel</h5>

            <button
              type="button"
              className="linajes-especie-add"
              onClick={agregarBeneficio}
            >
              <Plus size={15} />
              Agregar beneficio
            </button>
          </div>

          {beneficios.length === 0 && (
            <p className="linajes-especie-empty">
              Todavía no agregaste beneficios.
            </p>
          )}

          {beneficios.map((beneficio) => (
            <div
              className="linajes-especie-beneficio"
              key={beneficio.id}
            >
              <div className="linajes-especie-beneficio-heading">
                <label>
                  Nivel *
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={beneficio.nivel}
                    onChange={(event) =>
                      actualizarBeneficio(
                        beneficio.id,
                        'nivel',
                        event.target.value
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  className="linajes-especie-delete"
                  aria-label="Eliminar beneficio"
                  onClick={() => eliminarBeneficio(beneficio.id)}
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <label>
                Descripción del beneficio *
                <textarea
                  value={beneficio.descripcion}
                  onChange={(event) =>
                    actualizarBeneficio(
                      beneficio.id,
                      'descripcion',
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Describí el beneficio obtenido..."
                />
              </label>
            </div>
          ))}

          <div className="linajes-especie-actions">
            <button
              type="button"
              className="linajes-especie-cancel"
              onClick={limpiarFormulario}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="linajes-especie-save"
              onClick={guardarLinaje}
              disabled={!nombre.trim()}
            >
              {editandoId ? 'Guardar cambios' : 'Guardar linaje'}
            </button>
          </div>
        </div>
      )}

      <div className="linajes-especie-list">
        {linajes.length === 0 && !formularioAbierto && (
          <p className="linajes-especie-empty">
            Todavía no agregaste linajes.
          </p>
        )}

        {linajes.map((linaje) => {
          const expandido = expandidos.includes(linaje.id)

          return (
            <article
              className="linajes-especie-card"
              key={linaje.id}
            >
              <div className="linajes-especie-card-heading">
                <h5>{linaje.nombre}</h5>

                <div className="linajes-especie-card-actions">
                  <button
                    type="button"
                    aria-label={`Editar ${linaje.nombre}`}
                    onClick={() => editarLinaje(linaje)}
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    aria-label={`Eliminar ${linaje.nombre}`}
                    onClick={() => eliminarLinaje(linaje.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {linaje.descripcion && (
                <p>
                  {expandido
                    ? linaje.descripcion
                    : linaje.descripcion.length > 180
                      ? `${linaje.descripcion.slice(0, 180)}...`
                      : linaje.descripcion}
                </p>
              )}

              <span className="linajes-especie-count">
                {linaje.beneficios.length} beneficio(s) por nivel
              </span>

              {expandido && (
                <div className="linajes-especie-card-beneficios">
                  {linaje.beneficios.map((beneficio) => (
                    <div key={beneficio.id}>
                      <strong>Nivel {beneficio.nivel}</strong>
                      <p>{beneficio.descripcion}</p>
                    </div>
                  ))}
                </div>
              )}

              {(linaje.descripcion.length > 180 ||
                linaje.beneficios.length > 0) && (
                <button
                  type="button"
                  className="linajes-especie-expand"
                  onClick={() => alternarExpandido(linaje.id)}
                >
                  {expandido ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
