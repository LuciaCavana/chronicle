
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { RasgoEspecie } from '../../types/especie'
import '../../styles/RasgosEspecie.css'
import SelectorConjuros from './SelectorConjuros'
import type { Conjuro, ConjuroOtorgado } from '../../types/conjuro'

type Props = {
  rasgos: RasgoEspecie[]
  onChange: (rasgos: RasgoEspecie[]) => void
  conjuros: Conjuro[]
  onCrearConjuro: (conjuro: Conjuro) => void
}

export default function RasgosEspecie({ 
  rasgos,
  onChange,
  conjuros,
  onCrearConjuro,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const [conjurosOtorgados, setConjurosOtorgados] =
    useState<ConjuroOtorgado[]>([])

  function agregar() {
    setEditingId(null)
    setNombre('')
    setDescripcion('')
    setShowForm(true)
    setConjurosOtorgados([])
  }

  function editar(rasgo: RasgoEspecie) {
    setEditingId(rasgo.id)
    setNombre(rasgo.nombre)
    setDescripcion(rasgo.descripcion)
    setShowForm(true)
    setConjurosOtorgados(rasgo.conjurosOtorgados ?? [])
  }

  function cancelar() {
    setShowForm(false)
    setEditingId(null)
    setNombre('')
    setDescripcion('')
    setSelectorAbierto(false)
    setConjurosOtorgados([])
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
                conjurosOtorgados,
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
          conjurosOtorgados,
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
function vincularConjuro(conjuro: Conjuro) {
  if (
    conjurosOtorgados.some(
      vinculo => vinculo.conjuroId === conjuro.id
    )
  ) {
    return
  }

  setConjurosOtorgados(actuales => [
    ...actuales,
    {
      id: crypto.randomUUID(),
      conjuroId: conjuro.id,
      nivelRequerido: 1,
      formaObtencion: 'aprendido',
      caracteristica: 'ninguna',
      reglasUso: '',
    },
  ])
}
  function actualizarVinculo(
    id: string,
    cambios: Partial<ConjuroOtorgado>
  ) {
    setConjurosOtorgados(actuales =>
      actuales.map(vinculo =>
        vinculo.id === id
          ? { ...vinculo, ...cambios }
          : vinculo
      )
    )
  }
function desvincularConjuro(conjuroId: string) {
  setConjurosOtorgados(actuales =>
    actuales.filter(v => v.conjuroId !== conjuroId)
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
<div className="rasgos-especie-conjuros">
  <h5>Conjuros y trucos otorgados</h5>

  {conjurosOtorgados.map(vinculo => {
    const conjuro = conjuros.find(
      c => c.id === vinculo.conjuroId
    )

    if (!conjuro) return null

    return (
      <div key={vinculo.id} className="rasgos-especie-conjuro"> 
        <div>
          <strong>{conjuro.nombre}</strong>
          <p>
            {conjuro.tipo === 'truco'
              ? 'Truco'
              : `Conjuro de nivel ${conjuro.nivel}`}
          </p>
        </div>

        <div className="rasgos-especie-conjuro-config">
          <label>
            Nivel requerido
            <input
              type="number"
              min={1}
              max={20}
              value={vinculo.nivelRequerido}
              onChange={e => actualizarVinculo(vinculo.id, {
                nivelRequerido: Number(e.target.value),
              })}
            />
          </label>

  <label>
    Forma de obtención
    <select
      value={vinculo.formaObtencion}
      onChange={e => actualizarVinculo(vinculo.id, {
        formaObtencion: e.target.value as ConjuroOtorgado['formaObtencion'],
      })}
    >
      <option value="aprendido">Aprendido</option>
      <option value="preparado">Preparado</option>
      <option value="lanzamiento_especial">Lanzamiento especial</option>
    </select>
  </label>

  <label>
    Característica mágica
    <select
      value={vinculo.caracteristica}
      onChange={e => actualizarVinculo(vinculo.id, {
        caracteristica: e.target.value as ConjuroOtorgado['caracteristica'],
      })}
    >
      <option value="ninguna">Ninguna</option>
      <option value="eleccion">A elección</option>
      <option value="inteligencia">Inteligencia</option>
      <option value="sabiduria">Sabiduría</option>
      <option value="carisma">Carisma</option>
      <option value="fuerza">Fuerza</option>
      <option value="destreza">Destreza</option>
      <option value="constitucion">Constitución</option>
    </select>
  </label>

  <label>
    Reglas de uso
    <textarea
      rows={3}
      value={vinculo.reglasUso}
      onChange={e => actualizarVinculo(vinculo.id, {
        reglasUso: e.target.value,
      })}
      placeholder="Ej. Podés lanzar este conjuro sin gastar un espacio..."
    />
  </label>
</div>

  <button
    type="button"
    className="rasgos-especie-conjuro-eliminar"
    title="Desvincular conjuro"
    aria-label={`Desvincular ${conjuro.nombre}`}
    onClick={() => desvincularConjuro(conjuro.id)}
  >
    <Trash2 size={16} />
  </button>
      </div>
    )
  })}

  <button
    type="button"
    className="rasgos-especie-add"
    onClick={() => setSelectorAbierto(true)}
  >
    <Plus size={16} />
    Vincular conjuro
  </button>
</div>

<SelectorConjuros
  abierto={selectorAbierto}
  conjuros={conjuros}
  idsVinculados={conjurosOtorgados.map(v => v.conjuroId)}
  onVincular={vincularConjuro}
  onCrear={conjuro => {
    onCrearConjuro(conjuro)
    vincularConjuro(conjuro)
  }}
  onCerrar={() => setSelectorAbierto(false)}
/>
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
