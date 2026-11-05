
import { useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
import '../../styles/SelectorTipoCriatura.css'

type Props = {
  value: string[]
  onChange: (value: string[]) => void
  availableTypes?: string[]
}

function claveTipo(valor: string): string {
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
}

function normalizarTipo(valor: string): string {
  const texto = valor
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')

  if (!texto) return ''

  return texto.charAt(0).toLocaleUpperCase('es') + texto.slice(1)
}

export default function SelectorTipoCriatura({
  value,
  onChange,
  availableTypes = [],
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [localTypes, setLocalTypes] = useState<string[]>([])
  const [error, setError] = useState('')

  const catalog = ['Humanoide', ...availableTypes, ...localTypes]

  const uniqueCatalog = catalog.reduce<string[]>((result, type) => {
    const normalized = normalizarTipo(type)

    if (
      normalized &&
      !result.some((item) => claveTipo(item) === claveTipo(normalized))
    ) {
      result.push(normalized)
    }

    return result
  }, [])

  const filteredTypes = uniqueCatalog.filter((type) =>
    claveTipo(type).includes(claveTipo(search))
  )

  function agregarSeleccion(nombre: string) {
    const normalized = normalizarTipo(nombre)

    if (!normalized) return

    const exists = value.some(
      (type) => claveTipo(type) === claveTipo(normalized)
    )

    if (!exists) {
      onChange([...value, normalized])
    }
  }

  function quitarSeleccion(nombre: string) {
    onChange(
      value.filter((type) => claveTipo(type) !== claveTipo(nombre))
    )
  }

  function crearTipo() {
    const normalized = normalizarTipo(customName)

    if (!normalized) {
      setError('Ingresá un nombre.')
      return
    }

    const existing = uniqueCatalog.find(
      (type) => claveTipo(type) === claveTipo(normalized)
    )

    if (existing) {
      setError(`El tipo «${existing}» ya existe.`)
      return
    }

    setLocalTypes((current) => [...current, normalized])
    agregarSeleccion(normalized)
    setCustomName('')
    setShowCustom(false)
    setError('')
    setSearch('')
  }

  return (
    <div className="selector-tipo">
      <label className="selector-tipo-label">
        Tipos de criatura *
      </label>

      <div className="selector-tipo-selected">
        {value.map((type) => (
          <span className="selector-tipo-tag" key={claveTipo(type)}>
            {normalizarTipo(type)}

            <button
              type="button"
              aria-label={`Quitar ${type}`}
              onClick={() => quitarSeleccion(type)}
            >
              <X size={13} />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        className="selector-tipo-trigger"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        Buscar o seleccionar tipo
        <ChevronDown size={17} />
      </button>

      {open && (
        <div className="selector-tipo-dropdown">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar tipo de criatura..."
            aria-label="Buscar tipo de criatura"
          />

          <div className="selector-tipo-results">
            {filteredTypes.length === 0 && (
              <p>No se encontraron tipos.</p>
            )}

            {filteredTypes.map((type) => {
              const selected = value.some(
                (item) => claveTipo(item) === claveTipo(type)
              )

              return (
                <button
                  type="button"
                  key={claveTipo(type)}
                  className="selector-tipo-option"
                  onClick={() => {
                    if (selected) {
                      quitarSeleccion(type)
                    } else {
                      agregarSeleccion(type)
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    readOnly
                    tabIndex={-1}
                  />
                  {type}
                </button>
              )
            })}
          </div>

          {!showCustom ? (
            <button
              type="button"
              className="selector-tipo-create"
              onClick={() => {
                setCustomName(search)
                setError('')
                setShowCustom(true)
              }}
            >
              <Plus size={16} />
              Crear otro tipo
            </button>
          ) : (
            <div className="selector-tipo-custom">
              <label htmlFor="custom-creature-type">
                Nombre del nuevo tipo
              </label>

              <input
                id="custom-creature-type"
                value={customName}
                onChange={(event) => {
                  setCustomName(event.target.value)
                  setError('')
                }}
                placeholder="Ej. Feérico"
              />

              {error && (
                <p className="selector-tipo-error">{error}</p>
              )}

              <div className="selector-tipo-custom-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false)
                    setError('')
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={!customName.trim()}
                  onClick={crearTipo}
                >
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
