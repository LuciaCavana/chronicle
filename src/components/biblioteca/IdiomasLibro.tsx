
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { VersionLibro } from '../../types/libro'

type Props = {
  versiones: VersionLibro[]
  onChange: (versiones: VersionLibro[]) => void
  idiomaPrincipal: string
  onChangePrincipal: (codigo: string) => void
}

const idiomas = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'Inglés' },
  { codigo: 'pt', nombre: 'Portugués' },
  { codigo: 'fr', nombre: 'Francés' },
  { codigo: 'de', nombre: 'Alemán' },
  { codigo: 'it', nombre: 'Italiano' },
]

export default function IdiomasLibro({
  versiones,
  onChange,
  idiomaPrincipal,
  onChangePrincipal,
}: Props) {
  const [nuevoIdioma, setNuevoIdioma] = useState('')

  function agregarIdioma() {
    const idioma = idiomas.find(
      (item) => item.codigo === nuevoIdioma
    )

    if (!idioma) return

    if (
      versiones.some(
        (version) => version.idioma.codigo === idioma.codigo
      )
    ) return

    onChange([
      ...versiones,
      {
        id: crypto.randomUUID(),
        idioma,
        titulo: '',
        descripcion: '',
        especies: [],
      },
    ])

    if (versiones.length === 0) {
      onChangePrincipal(idioma.codigo)
    }

    setNuevoIdioma('')
  }

  function actualizarVersion(
    id: string,
    campo: 'titulo' | 'descripcion',
    valor: string
  ) {
    onChange(
      versiones.map((version) =>
        version.id === id
          ? { ...version, [campo]: valor }
          : version
      )
    )
  }

  function eliminarVersion(id: string) {
    const restantes = versiones.filter(
      (version) => version.id !== id
    )

    if (restantes.length === 0) return

    onChange(restantes)

    const principalExiste = restantes.some(
      (version) => version.idioma.codigo === idiomaPrincipal
    )

    if (!principalExiste) {
      onChangePrincipal(restantes[0].idioma.codigo)
    }
  }

  return (
    <section className="nueva-propuesta-panel">
      <h3>Versiones por idioma</h3>
      <p className="nueva-propuesta-help">
        Agregá los idiomas disponibles para este libro.
        Cada versión puede tener su propio título y descripción.
      </p>

      <div className="nueva-propuesta-fields-row">
        <div className="nueva-propuesta-field">
          <label htmlFor="nuevo-idioma">Agregar idioma</label>
          <select
            id="nuevo-idioma"
            value={nuevoIdioma}
            onChange={(event) =>
              setNuevoIdioma(event.target.value)
            }
          >
            <option value="">Seleccioná un idioma</option>
            {idiomas
              .filter(
                (idioma) =>
                  !versiones.some(
                    (version) =>
                      version.idioma.codigo === idioma.codigo
                  )
              )
              .map((idioma) => (
                <option
                  key={idioma.codigo}
                  value={idioma.codigo}
                >
                  {idioma.nombre}
                </option>
              ))}
          </select>
        </div>

        <button
          type="button"
          className="nueva-propuesta-next"
          disabled={!nuevoIdioma}
          onClick={agregarIdioma}
        >
          <Plus size={16} />
          Agregar
        </button>
      </div>

      {versiones.map((version) => (
        <div
          key={version.id}
          className="nueva-propuesta-panel"
        >
          <div className="nueva-propuesta-fields-row">
            <h4>{version.idioma.nombre}</h4>

            <button
              type="button"
              className="nueva-propuesta-cancel"
              disabled={versiones.length === 1}
              onClick={() => eliminarVersion(version.id)}
            >
              <Trash2 size={16} />
              Quitar
            </button>
          </div>

          <label>
            <input
              type="radio"
              name="idioma-principal"
              checked={
                idiomaPrincipal === version.idioma.codigo
              }
              onChange={() =>
                onChangePrincipal(version.idioma.codigo)
              }
            />
            Idioma principal
          </label>

          <div className="nueva-propuesta-field">
            <label>Título en {version.idioma.nombre} *</label>
            <input
              value={version.titulo}
              onChange={(event) =>
                actualizarVersion(
                  version.id,
                  'titulo',
                  event.target.value
                )
              }
              placeholder="Título del libro"
            />
          </div>

          <div className="nueva-propuesta-field">
            <label>Descripción en {version.idioma.nombre}</label>
            <textarea
              value={version.descripcion}
              onChange={(event) =>
                actualizarVersion(
                  version.id,
                  'descripcion',
                  event.target.value
                )
              }
              rows={3}
            />
          </div>
        </div>
      ))}
    </section>
  )
}
