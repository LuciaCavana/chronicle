
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { EfectoEspecie, RasgoEspecie } from '../../types/especie'
import '../../styles/formularios/RasgosEspecie.css'
import ConjurosOtorgadosEditor from './ConjurosOtorgadosEditor'
import EfectosEspecieEditor from './EfectosEspecieEditor'
import { leerEfectos, resumenEfecto } from '../../lib/efectosEspecie'
import type { Conjuro, OtorgamientoConjuros } from '../../types/conjuro'
import { leerConjurosDe, limpiarConjuros, problemaConjuros, resumenConjuros } from '../../lib/conjurosOtorgados'

type Props = {
  rasgos: RasgoEspecie[]
  onChange: (rasgos: RasgoEspecie[]) => void
  conjuros: Conjuro[]
  onCrearConjuro: (conjuro: Conjuro) => void
  /** Nombres de clase para las listas de conjuros (popup). */
  clasesDisponibles?: string[]
}

/** Quita el campo del formato anterior (ya convertido a `conjuros`). */
function sinFormatoAnterior(rasgo: RasgoEspecie): RasgoEspecie {
  const copia = { ...rasgo }
  delete copia.conjurosOtorgados
  return copia
}

export default function RasgosEspecie({ 
  rasgos,
  onChange,
  conjuros,
  onCrearConjuro,
  clasesDisponibles = [],
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [conjurosOtorgados, setConjurosOtorgados] =
    useState<OtorgamientoConjuros[]>([])
  const [error, setError] = useState('')
  const [efectos, setEfectos] = useState<EfectoEspecie[]>([])

  function agregar() {
    setEditingId(null)
    setNombre('')
    setDescripcion('')
    setShowForm(true)
    setConjurosOtorgados([])
    setEfectos([])
  }

  function editar(rasgo: RasgoEspecie) {
    setEditingId(rasgo.id)
    setNombre(rasgo.nombre)
    setDescripcion(rasgo.descripcion)
    setShowForm(true)
    setConjurosOtorgados(leerConjurosDe(rasgo))
    setEfectos(leerEfectos(rasgo.efectos))
  }

  function cancelar() {
    setShowForm(false)
    setEditingId(null)
    setNombre('')
    setDescripcion('')
    setConjurosOtorgados([])
    setEfectos([])
    setError('')
  }

  function guardar() {
    if (!nombre.trim()) return
    for (const o of conjurosOtorgados) {
      const problema = problemaConjuros(o, true)
      if (problema) { setError(`Conjuros otorgados: ${problema}.`); return }
    }
    const conjurosRasgo = conjurosOtorgados.map(limpiarConjuros)

    if (editingId) {
      onChange(
        rasgos.map((rasgo) =>
          rasgo.id === editingId
            ? {
                ...sinFormatoAnterior(rasgo),
                nombre: nombre.trim(),
                descripcion,
                conjuros: conjurosRasgo,
                efectos,
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
          conjuros: conjurosRasgo,
          efectos,
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

  /** «Visión en la oscuridad: 60 pies · Conjuros: Luz» para la tarjeta del rasgo. */
  function resumenRasgo(rasgo: RasgoEspecie): string {
    const nombreDe = (id: string) => conjuros.find(c => c.id === id)?.nombre ?? ''
    return [...leerEfectos(rasgo.efectos).map(resumenEfecto), ...leerConjurosDe(rasgo).map(o => `Conjuros: ${resumenConjuros(o, nombreDe, id => conjuros.find(c => c.id === id)?.nivel)}`)].filter(Boolean).join(' · ')
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

              {resumenRasgo(rasgo) && <p className="rasgos-especie-otorga">{resumenRasgo(rasgo)}</p>}
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
<ConjurosOtorgadosEditor otorgamientos={conjurosOtorgados} onChange={o => { setConjurosOtorgados(o); setError('') }} conjuros={conjuros} onCrearConjuro={onCrearConjuro} clasesDisponibles={clasesDisponibles} />
          <EfectosEspecieEditor efectos={efectos} onChange={setEfectos} />
          {error && <p role="alert" className="linajes-especie-error">{error}</p>}
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
