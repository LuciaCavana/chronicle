import { useState, type FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import SelectorTipoCriatura from './SelectorTipoCriatura'
import RasgosEspecie from './RasgosEspecie'
import type {
  Especie,
  RasgoEspecie,
  TamanoEspecie,
} from '../../types/especie'
import '../../styles/EspecieForm.css'
import LinajesEspecie from './LinajesEspecie'
import type { LinajeEspecie } from '../../types/especie'

type Props = {
  bookTitle: string
  bookCode: string
  initialData?: Especie | null
  onSave: (especie: Especie) => void
  onCancel: () => void
}

const tamanosDisponibles = [
  'Pequeño',
  'Mediano',
  'Grande',
] 


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
    initialData?.tamanos.find(
      (tamano) => tamano.id === 'otro'
    )?.nombre ?? ''
  )
  const [tiposCriatura, setTiposCriatura] = useState<string[]>(
    initialData?.tiposCriatura ?? ['Humanoide']
  )
  const [velocidad, setVelocidad] = useState(
    initialData?.velocidad ?? '30'
  )
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
          value.trim() === ''
            ? null
            : Number(value.replace(',', '.'))

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
      rasgos.some((rasgo) => !rasgo.nombre.trim())
    ) {
      return
    }

    onSave({
      id: initialData?.id ?? crypto.randomUUID(),
      nombre: nombre.trim(),
      descripcion,
      tamanos,
      tiposCriatura: tiposCriatura.reduce<string[]>((result, tipo) => {
        const normalizado = tipo.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es')
        const nombre = normalizado.charAt(0).toLocaleUpperCase('es') + normalizado.slice(1)
        const clave = nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')

        if (
          nombre &&
          !result.some(
            (item) =>
              item.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es') === clave
          )
        ) {
          result.push(nombre)
        }

        return result
      }, []),
      velocidad,
      visionOscuridad,
      alcanceVision: visionOscuridad ? alcanceVision : '',
      pagina,
      rasgos,
      linajes,
      transformaciones: initialData?.transformaciones ?? [],
    })
  }

  return (
    <form
      className="nueva-propuesta-panel especie-form"
      onSubmit={handleSubmit}
    >
      <h3>
        {initialData ? 'Editar especie' : 'Agregar especie'}
      </h3>

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
          {[...tamanosDisponibles, 'Otro'].map((nombre) => {
            const id = nombre === 'Otro' ? 'otro' : nombre

            return (
              <label key={id}>
                <input
                  type="checkbox"
                  checked={tamanos.some((tamano) => tamano.id === id)}
                  onChange={() => toggleTamano(id)}
                />
                {nombre}
              </label>
            )
          })}
        </div>

        {tamanos.map((tamano) => (
          <div className="especie-form-rasgo" key={tamano.id}>
            {tamano.id === 'otro' ? (
              <div className="nueva-propuesta-field">
                <label>Nombre del tamaño personalizado *</label>
                <input
                  value={nombreOtroTamano}
                  placeholder="Ej. Enorme"
                  required
                  onChange={(e) => {
                    setNombreOtroTamano(e.target.value)
                    updateTamano('otro', 'nombre', e.target.value)
                  }}
                />
              </div>
            ) : (
              <h4>{tamano.nombre}</h4>
            )}

            <div className="nueva-propuesta-fields-row">
              <div className="nueva-propuesta-field">
                <label>Altura mínima (metros)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tamano.alturaMinima ?? ''}
                  placeholder="Ej. 0.90"
                  onChange={(e) =>
                    updateTamano(
                      tamano.id,
                      'alturaMinima',
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="nueva-propuesta-field">
                <label>Altura máxima (metros)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={tamano.alturaMaxima ?? ''}
                  placeholder="Ej. 1.20"
                  onChange={(e) =>
                    updateTamano(
                      tamano.id,
                      'alturaMaxima',
                      e.target.value
                    )
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>


    <SelectorTipoCriatura
      value={tiposCriatura}
      onChange={setTiposCriatura}
    />

      <div className="nueva-propuesta-fields-row">
        <div className="nueva-propuesta-field">
          <label htmlFor="species-speed">
            Velocidad (pies)
          </label>
          <input
            id="species-speed"
            type="number"
            min="0"
            value={velocidad}
            onChange={(e) => setVelocidad(e.target.value)}
          />
        </div>

        <div className="nueva-propuesta-field">
          <label htmlFor="species-page">
            Página del libro
          </label>
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
            onChange={(e) =>
              setVisionOscuridad(e.target.checked)
            }
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
              onChange={(e) =>
                setAlcanceVision(e.target.value)
              }
              required
            />
          </div>
        )}
      </div>
        <RasgosEspecie rasgos={rasgos} onChange={setRasgos} />

        <LinajesEspecie
          linajes={linajes}
          onChange={setLinajes}
        />

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
