import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import LinajesEspecie from './LinajesEspecie'
import RasgosEspecie from './RasgosEspecie'
import SelectorTipoCriatura from './SelectorTipoCriatura'
import type {
  CampoAdicionalEspecie,
  Especie,
  LinajeEspecie,
  RasgoEspecie,
  TamanoEspecie,
} from '../../types/especie'
import '../../styles/EspecieForm.css'

type Props = {
  bookTitle: string
  bookCode: string
  initialData?: Especie | null
  onSave: (especie: Especie) => void
  onCancel: () => void
}

const tamanosDisponibles = ['Pequeño', 'Mediano', 'Grande']

function quitarAcentos(texto: string) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function normalizarTiposCriatura(tipos: string[]) {
  return tipos.reduce<string[]>((result, tipo) => {
    const normalizado = tipo
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleLowerCase('es')
    const nombreTipo =
      normalizado.charAt(0).toLocaleUpperCase('es') + normalizado.slice(1)
    const clave = quitarAcentos(nombreTipo).toLocaleLowerCase('es')

    if (
      nombreTipo &&
      !result.some(
        (item) => quitarAcentos(item).toLocaleLowerCase('es') === clave
      )
    ) {
      result.push(nombreTipo)
    }

    return result
  }, [])
}

export default function EspecieForm({
  bookTitle,
  bookCode,
  initialData,
  onSave,
  onCancel,
}: Props) {
  const [nombre, setNombre] = useState(initialData?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(
    initialData?.descripcion ?? ''
  )
  const [tamanos, setTamanos] = useState<TamanoEspecie[]>(
    initialData?.tamanos ?? []
  )
  const [nombreOtroTamano, setNombreOtroTamano] = useState(
    initialData?.tamanos.find((tamano) => tamano.id === 'otro')?.nombre ?? ''
  )
  const [tiposCriatura, setTiposCriatura] = useState<string[]>(
    initialData?.tiposCriatura ?? ['Humanoide']
  )
  const [velocidad, setVelocidad] = useState(initialData?.velocidad ?? '30')
  const [visionOscuridad, setVisionOscuridad] = useState(
    initialData?.visionOscuridad ?? false
  )
  const [alcanceVision, setAlcanceVision] = useState(
    initialData?.alcanceVision ?? '60'
  )
  const [pagina, setPagina] = useState(initialData?.pagina ?? '')
  const [rasgos, setRasgos] = useState<RasgoEspecie[]>(
    initialData?.rasgos ?? []
  )
  const [linajes, setLinajes] = useState<LinajeEspecie[]>(
    initialData?.linajes ?? []
  )
  const [camposAdicionales, setCamposAdicionales] = useState<
    CampoAdicionalEspecie[]
  >(initialData?.camposAdicionales ?? [])

  function toggleTamano(id: string) {
    setTamanos((current) => {
      if (current.some((tamano) => tamano.id === id)) {
        return current.filter((tamano) => tamano.id !== id)
      }

      return [
        ...current,
        {
          id,
          nombre: id === 'otro' ? nombreOtroTamano : id,
          alturaMinima: null,
          alturaMaxima: null,
        },
      ]
    })
  }

  function updateTamano(
    id: string,
    field: 'nombre' | 'alturaMinima' | 'alturaMaxima',
    value: string
  ) {
    setTamanos((current) =>
      current.map((tamano) => {
        if (tamano.id !== id) return tamano

        if (field === 'nombre') {
          return { ...tamano, nombre: value }
        }

        const parsedValue =
          value.trim() === '' ? null : Number(value.replace(',', '.'))

        return {
          ...tamano,
          [field]: parsedValue,
        }
      })
    )
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (
      !nombre.trim() ||
      tamanos.length === 0 ||
      tiposCriatura.length === 0 ||
      rasgos.some((rasgo) => !rasgo.nombre.trim()) ||
      camposAdicionales.some((campo) => !campo.nombre.trim())
    ) {
      return
    }

    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      nombre: nombre.trim(),
      descripcion,
      tamanos,
      tiposCriatura: normalizarTiposCriatura(tiposCriatura),
      velocidad,
      visionOscuridad,
      alcanceVision: visionOscuridad ? alcanceVision : '',
      pagina,
      rasgos,
      linajes,
      camposAdicionales: camposAdicionales.map((campo) => ({
        ...campo,
        nombre: campo.nombre.trim(),
      })),
      transformaciones: initialData?.transformaciones ?? [],
    })
  }

  return (
    <form
      className="nueva-propuesta-panel especie-form"
      onSubmit={handleSubmit}
    >
      <h3>{initialData ? 'Editar especie' : 'Agregar especie'}</h3>

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
          placeholder="Ej. Elfo"
          required
        />
      </div>

      <div className="nueva-propuesta-field">
        <label htmlFor="species-description">Descripción</label>
        <textarea
          id="species-description"
          rows={4}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div className="especie-form-section">
        <h4>Tamaños permitidos *</h4>

        <div className="especie-form-options">
          {[...tamanosDisponibles, 'Otro'].map((etiqueta) => {
            const id = etiqueta === 'Otro' ? 'otro' : etiqueta

            return (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={tamanos.some((tamano) => tamano.id === id)}
                  onChange={() => toggleTamano(id)}
                />
                {etiqueta}
              </label>
            )
          })}
        </div>

        <div className="especie-tamanos-lista">
          {tamanos.map((tamano) => (
            <div className="especie-tamano-fila" key={tamano.id}>
              <div className="especie-tamano-nombre">
                {tamano.id === 'otro' ? (
                  <input
                    type="text"
                    value={nombreOtroTamano}
                    placeholder="Nombre del tamaño"
                    aria-label="Nombre del tamaño personalizado"
                    required
                    onChange={(e) => {
                      setNombreOtroTamano(e.target.value)
                      updateTamano('otro', 'nombre', e.target.value)
                    }}
                  />
                ) : (
                  <strong>{tamano.nombre}</strong>
                )}
              </div>

              <label className="especie-tamano-altura">
                <span>Altura mín. (m)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tamano.alturaMinima ?? ''}
                  placeholder="Opcional"
                  onChange={(e) =>
                    updateTamano(tamano.id, 'alturaMinima', e.target.value)
                  }
                />
              </label>

              <label className="especie-tamano-altura">
                <span>Altura máx. (m)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tamano.alturaMaxima ?? ''}
                  placeholder="Opcional"
                  onChange={(e) =>
                    updateTamano(tamano.id, 'alturaMaxima', e.target.value)
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </div>

      <SelectorTipoCriatura value={tiposCriatura} onChange={setTiposCriatura} />

      <div className="nueva-propuesta-fields-row">
        <div className="nueva-propuesta-field">
          <label htmlFor="species-speed">Velocidad (pies)</label>
          <input
            id="species-speed"
            type="number"
            min="0"
            value={velocidad}
            onChange={(e) => setVelocidad(e.target.value)}
          />
        </div>

        <div className="nueva-propuesta-field">
          <label htmlFor="species-page">Página del libro</label>
          <input
            id="species-page"
            type="number"
            min="1"
            value={pagina}
            onChange={(e) => setPagina(e.target.value)}
          />
        </div>
      </div>

      <div className="especie-form-section">
        <label className="especie-form-checkbox">
          <input
            type="checkbox"
            checked={visionOscuridad}
            onChange={(e) => setVisionOscuridad(e.target.checked)}
          />
          Tiene visión en la oscuridad
        </label>

        {visionOscuridad && (
          <div className="nueva-propuesta-field">
            <label htmlFor="species-darkvision">
              Alcance de visión (pies)
            </label>
            <input
              id="species-darkvision"
              type="number"
              min="1"
              value={alcanceVision}
              onChange={(e) => setAlcanceVision(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      <RasgosEspecie rasgos={rasgos} onChange={setRasgos} />

      <LinajesEspecie linajes={linajes} onChange={setLinajes} />

      <details className="especie-campos-adicionales">
        <summary>Campos adicionales ({camposAdicionales.length})</summary>

        <p className="especie-form-hint">
          Agregá información especial que no esté contemplada en el
          formulario.
        </p>

        {camposAdicionales.map((campo) => (
          <div className="especie-campo-extra" key={campo.id}>
            <div className="nueva-propuesta-field">
              <label>Nombre del campo *</label>
              <input
                type="text"
                value={campo.nombre}
                placeholder="Ej. Afinidad elemental"
                onChange={(e) =>
                  setCamposAdicionales((actuales) =>
                    actuales.map((item) =>
                      item.id === campo.id
                        ? { ...item, nombre: e.target.value }
                        : item
                    )
                  )
                }
              />
            </div>

            <div className="nueva-propuesta-field">
              <label>Tipo de dato</label>
              <select
                value={campo.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as CampoAdicionalEspecie['tipo']

                  setCamposAdicionales((actuales) =>
                    actuales.map((item) =>
                      item.id === campo.id
                        ? {
                            ...item,
                            tipo,
                            valor: tipo === 'booleano' ? false : '',
                          }
                        : item
                    )
                  )
                }}
              >
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="booleano">Sí / No</option>
              </select>
            </div>

            <div className="nueva-propuesta-field">
              <label>Valor</label>

              {campo.tipo === 'booleano' ? (
                <label className="especie-campo-checkbox">
                  <input
                    type="checkbox"
                    checked={campo.valor === true}
                    onChange={(e) =>
                      setCamposAdicionales((actuales) =>
                        actuales.map((item) =>
                          item.id === campo.id
                            ? { ...item, valor: e.target.checked }
                            : item
                        )
                      )
                    }
                  />
                  Sí
                </label>
              ) : (
                <input
                  type={campo.tipo === 'numero' ? 'number' : 'text'}
                  step={campo.tipo === 'numero' ? 'any' : undefined}
                  value={String(campo.valor)}
                  placeholder="Ingresá el valor"
                  onChange={(e) =>
                    setCamposAdicionales((actuales) =>
                      actuales.map((item) =>
                        item.id === campo.id
                          ? {
                              ...item,
                              valor:
                                campo.tipo === 'numero'
                                  ? e.target.value === ''
                                    ? ''
                                    : Number(e.target.value)
                                  : e.target.value,
                            }
                          : item
                      )
                    )
                  }
                />
              )}
            </div>

            <button
              type="button"
              className="especie-form-delete"
              aria-label={`Eliminar campo ${campo.nombre || 'sin nombre'}`}
              onClick={() =>
                setCamposAdicionales((actuales) =>
                  actuales.filter((item) => item.id !== campo.id)
                )
              }
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}

        <button
          type="button"
          className="especie-form-add"
          onClick={() =>
            setCamposAdicionales((actuales) => [
              ...actuales,
              {
                id: crypto.randomUUID(),
                nombre: '',
                tipo: 'texto',
                valor: '',
              },
            ])
          }
        >
          <Plus size={16} />
          Agregar campo
        </button>
      </details>

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
          disabled={
            !nombre.trim() ||
            tamanos.length === 0 ||
            tamanos.some(
              (tamano) =>
                !tamano.nombre.trim() ||
                (tamano.alturaMinima !== null &&
                  tamano.alturaMaxima !== null &&
                  tamano.alturaMinima > tamano.alturaMaxima)
            ) ||
            tiposCriatura.length === 0 ||
            rasgos.some((rasgo) => !rasgo.nombre.trim())
          }
        >
          {initialData ? 'Guardar cambios' : 'Guardar especie'}
        </button>
      </div>
    </form>
  )
}
