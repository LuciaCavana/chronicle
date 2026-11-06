
import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type {
  BeneficioNivel,
  ConfiguracionUsosTransformacion,
  OpcionTransformacion,
  RecuperacionTransformacion,
  TipoUsosTransformacion,
  TransformacionEspecie,
} from '../../types/especie'
import '../../styles/LinajesEspecie.css'

type Props = {
  transformaciones: TransformacionEspecie[]
  onChange: (transformaciones: TransformacionEspecie[]) => void
}

const configuracionInicial = (): ConfiguracionUsosTransformacion => ({
  tipo: 'fijo',
  cantidad: 1,
  caracteristica: '',
  reglaEspecial: '',
  recuperacion: 'descanso_largo',
  recuperacionEspecial: '',
})

const caracteristicas = [
  'Fuerza',
  'Destreza',
  'Constitución',
  'Inteligencia',
  'Sabiduría',
  'Carisma',
]

export default function TransformacionesEspecie({
  transformaciones,
  onChange,
}: Props) {
  const [abierto, setAbierto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [nivel, setNivel] = useState(1)
  const [activacion, setActivacion] = useState('')
  const [duracion, setDuracion] = useState('')
  const [efectos, setEfectos] = useState('')
  const [config, setConfig] = useState(configuracionInicial)
  const [opciones, setOpciones] = useState<OpcionTransformacion[]>([])
  const [beneficios, setBeneficios] = useState<BeneficioNivel[]>([])
  const [error, setError] = useState('')

  function limpiar() {
    setAbierto(false)
    setEditandoId(null)
    setNombre('')
    setDescripcion('')
    setNivel(1)
    setActivacion('')
    setDuracion('')
    setEfectos('')
    setConfig(configuracionInicial())
    setOpciones([])
    setBeneficios([])
    setError('')
  }

  function editar(t: TransformacionEspecie) {
    setEditandoId(t.id)
    setNombre(t.nombre)
    setDescripcion(t.descripcion)
    setNivel(t.nivelRequerido ?? 1)
    setActivacion(t.activacion)
    setDuracion(t.duracion)
    setEfectos(t.efectosGenerales ?? '')
    setConfig(
      t.configuracionUsos ?? {
        ...configuracionInicial(),
        tipo: 'especial',
        reglaEspecial: t.usos,
        recuperacion: 'otro',
        recuperacionEspecial: '',
      }
    )
    setOpciones((t.opciones ?? []).map(o => ({ ...o })))
    setBeneficios(t.beneficios.map(b => ({ ...b })))
    setError('')
    setAbierto(true)
  }

  function actualizarConfig(
    cambios: Partial<ConfiguracionUsosTransformacion>
  ) {
    setConfig(actual => ({ ...actual, ...cambios }))
  }

  function actualizarOpcion(
    id: string,
    campo: 'nombre' | 'descripcion',
    valor: string
  ) {
    setOpciones(actuales =>
      actuales.map(o =>
        o.id === id ? { ...o, [campo]: valor } : o
      )
    )
  }

  function actualizarBeneficio(
    id: string,
    campo: 'nivel' | 'descripcion',
    valor: string
  ) {
    setBeneficios(actuales =>
      actuales.map(b =>
        b.id === id
          ? {
              ...b,
              [campo]: campo === 'nivel' ? Number(valor) : valor,
            }
          : b
      )
    )
  }

  function guardar() {
    setError('')

    if (!nombre.trim()) {
      setError('Ingresá el nombre de la transformación.')
      return
    }

    if (!Number.isInteger(nivel) || nivel < 1) {
      setError('El nivel requerido debe ser un entero mayor a cero.')
      return
    }

    if (
      transformaciones.some(
        t =>
          t.id !== editandoId &&
          t.nombre.trim().toLocaleLowerCase('es') ===
            nombre.trim().toLocaleLowerCase('es')
      )
    ) {
      setError('Ya existe una transformación con ese nombre.')
      return
    }

    if (
      config.tipo === 'fijo' &&
      (config.cantidad === null ||
        !Number.isInteger(config.cantidad) ||
        config.cantidad < 1)
    ) {
      setError('Ingresá una cantidad fija de usos válida.')
      return
    }

    if (config.tipo === 'caracteristica' && !config.caracteristica) {
      setError('Seleccioná una característica.')
      return
    }

    if (config.tipo === 'especial' && !config.reglaEspecial.trim()) {
      setError('Describí la regla especial de usos.')
      return
    }

    if (
      config.tipo !== 'ilimitado' &&
      config.recuperacion === 'otro' &&
      !config.recuperacionEspecial.trim()
    ) {
      setError('Describí cómo se recuperan los usos.')
      return
    }

    if (opciones.some(o => !o.nombre.trim())) {
      setError('Todas las opciones deben tener nombre.')
      return
    }

    if (
      beneficios.some(
        b =>
          !Number.isInteger(b.nivel) ||
          b.nivel < 1 ||
          !b.descripcion.trim()
      )
    ) {
      setError('Revisá los niveles y descripciones de los beneficios.')
      return
    }

    const nueva: TransformacionEspecie = {
      id: editandoId ?? crypto.randomUUID(),
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      nivelRequerido: nivel,
      activacion: activacion.trim(),
      duracion: duracion.trim(),
      efectosGenerales: efectos.trim(),
      configuracionUsos: {
        ...config,
        cantidad: config.tipo === 'fijo' ? config.cantidad : null,
        caracteristica:
          config.tipo === 'caracteristica' ? config.caracteristica : '',
        recuperacion:
          config.tipo === 'ilimitado' ? 'ninguna' : config.recuperacion,
        recuperacionEspecial:
          config.tipo !== 'ilimitado' && config.recuperacion === 'otro'
            ? config.recuperacionEspecial.trim()
            : '',
        reglaEspecial:
          config.tipo === 'especial' ? config.reglaEspecial.trim() : '',
      },
      usos: config.tipo === 'especial' ? config.reglaEspecial.trim() : '',
      opciones: opciones.map(o => ({
        ...o,
        nombre: o.nombre.trim(),
        descripcion: o.descripcion.trim(),
      })),
      beneficios: beneficios
        .map(b => ({ ...b, descripcion: b.descripcion.trim() }))
        .sort((a, b) => a.nivel - b.nivel),
    }

    onChange(
      editandoId
        ? transformaciones.map(t => t.id === editandoId ? nueva : t)
        : [...transformaciones, nueva]
    )
    limpiar()
  }

  function eliminar(id: string) {
    if (!window.confirm('¿Eliminar esta transformación?')) return
    onChange(transformaciones.filter(t => t.id !== id))
  }

  return (
    <section className="linajes-especie">
      <div className="linajes-especie-heading">
        <div>
          <h4>Transformaciones</h4>
          <p>Configurá transformaciones, usos y opciones disponibles.</p>
        </div>
        {!abierto && (
          <button
            type="button"
            className="linajes-especie-add"
            onClick={() => {
              limpiar()
              setAbierto(true)
            }}
          >
            <Plus size={16} /> Agregar transformación
          </button>
        )}
      </div>

      {abierto && (
        <div className="linajes-especie-form">
          <h5>{editandoId ? 'Editar transformación' : 'Nueva transformación'}</h5>

          <label>
            Nombre *
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Revelación celestial"
            />
          </label>

          <label>
            Descripción
            <textarea
              rows={4}
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
            />
          </label>

          <label>
            Nivel requerido *
            <input
              type="number"
              min={1}
              step={1}
              value={nivel}
              onChange={e => setNivel(Number(e.target.value))}
            />
          </label>

          <label>
            Activación
            <input
              value={activacion}
              onChange={e => setActivacion(e.target.value)}
              placeholder="Ej. Acción adicional"
            />
          </label>

          <label>
            Duración
            <input
              value={duracion}
              onChange={e => setDuracion(e.target.value)}
              placeholder="Ej. 1 minuto"
            />
          </label>

          <h5>Configuración de usos</h5>

          <label>
            Tipo de usos
            <select
              value={config.tipo}
              onChange={e =>
                actualizarConfig({
                  tipo: e.target.value as TipoUsosTransformacion,
                })
              }
            >
              <option value="fijo">Cantidad fija</option>
              <option value="competencia">Bonificador por competencia</option>
              <option value="nivel">Nivel del personaje</option>
              <option value="caracteristica">Modificador de característica</option>
              <option value="ilimitado">Sin límite</option>
              <option value="especial">Regla especial</option>
            </select>
          </label>

          {config.tipo === 'fijo' && (
            <label>
              Cantidad de usos *
              <input
                type="number"
                min={1}
                step={1}
                value={config.cantidad ?? ''}
                onChange={e =>
                  actualizarConfig({
                    cantidad: e.target.value === ''
                      ? null
                      : Number(e.target.value),
                  })
                }
              />
            </label>
          )}

          {config.tipo === 'caracteristica' && (
            <label>
              Característica *
              <select
                value={config.caracteristica}
                onChange={e =>
                  actualizarConfig({ caracteristica: e.target.value })
                }
              >
                <option value="">Seleccionar</option>
                {caracteristicas.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          )}

          {config.tipo === 'especial' && (
            <label>
              Regla especial *
              <textarea
                rows={3}
                value={config.reglaEspecial}
                onChange={e =>
                  actualizarConfig({ reglaEspecial: e.target.value })
                }
                placeholder="Describí cómo se calculan los usos."
              />
            </label>
          )}

          {config.tipo !== 'ilimitado' && (
            <>
              <label>
                Recuperación de usos
                <select
                  value={config.recuperacion}
                  onChange={e =>
                    actualizarConfig({
                      recuperacion:
                        e.target.value as RecuperacionTransformacion,
                    })
                  }
                >
                  <option value="descanso_corto">Descanso corto</option>
                  <option value="descanso_largo">Descanso largo</option>
                  <option value="otro">Otra condición</option>
                  <option value="ninguna">Sin recuperación</option>
                </select>
              </label>

              {config.recuperacion === 'otro' && (
                <label>
                  Condición de recuperación *
                  <textarea
                    rows={2}
                    value={config.recuperacionEspecial}
                    onChange={e =>
                      actualizarConfig({
                        recuperacionEspecial: e.target.value,
                      })
                    }
                  />
                </label>
              )}
            </>
          )}

          <h5>Efectos generales</h5>
          <label>
            Efectos compartidos por todas las opciones
            <textarea
              rows={4}
              value={efectos}
              onChange={e => setEfectos(e.target.value)}
              placeholder="Ej. Daño adicional igual al bonificador por competencia."
            />
          </label>

          <div className="linajes-especie-beneficios-heading">
            <h5>Opciones de transformación</h5>
            <button
              type="button"
              className="linajes-especie-add"
              onClick={() =>
                setOpciones(actuales => [
                  ...actuales,
                  {
                    id: crypto.randomUUID(),
                    nombre: '',
                    descripcion: '',
                  },
                ])
              }
            >
              <Plus size={15} /> Agregar opción
            </button>
          </div>

          {opciones.map(opcion => (
            <div className="linajes-especie-beneficio" key={opcion.id}>
              <label>
                Nombre de la opción *
                <input
                  value={opcion.nombre}
                  onChange={e =>
                    actualizarOpcion(opcion.id, 'nombre', e.target.value)
                  }
                  placeholder="Ej. Alas celestiales"
                />
              </label>
              <label>
                Descripción
                <textarea
                  rows={3}
                  value={opcion.descripcion}
                  onChange={e =>
                    actualizarOpcion(opcion.id, 'descripcion', e.target.value)
                  }
                />
              </label>
              <button
                type="button"
                className="linajes-especie-delete"
                onClick={() =>
                  setOpciones(actuales =>
                    actuales.filter(o => o.id !== opcion.id)
                  )
                }
              >
                <Trash2 size={16} /> Eliminar opción
              </button>
            </div>
          ))}

          <div className="linajes-especie-beneficios-heading">
            <h5>Beneficios por nivel</h5>
            <button
              type="button"
              className="linajes-especie-add"
              onClick={() =>
                setBeneficios(actuales => [
                  ...actuales,
                  {
                    id: crypto.randomUUID(),
                    nivel: 1,
                    descripcion: '',
                  },
                ])
              }
            >
              <Plus size={15} /> Agregar beneficio
            </button>
          </div>

          {beneficios.map(beneficio => (
            <div className="linajes-especie-beneficio" key={beneficio.id}>
              <label>
                Nivel *
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={beneficio.nivel}
                  onChange={e =>
                    actualizarBeneficio(
                      beneficio.id,
                      'nivel',
                      e.target.value
                    )
                  }
                />
              </label>
              <label>
                Descripción *
                <textarea
                  rows={3}
                  value={beneficio.descripcion}
                  onChange={e =>
                    actualizarBeneficio(
                      beneficio.id,
                      'descripcion',
                      e.target.value
                    )
                  }
                />
              </label>
              <button
                type="button"
                className="linajes-especie-delete"
                onClick={() =>
                  setBeneficios(actuales =>
                    actuales.filter(b => b.id !== beneficio.id)
                  )
                }
              >
                <Trash2 size={16} /> Eliminar beneficio
              </button>
            </div>
          ))}

          {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}

          <div className="linajes-especie-actions">
            <button
              type="button"
              className="linajes-especie-cancel"
              onClick={limpiar}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="linajes-especie-save"
              onClick={guardar}
            >
              {editandoId ? 'Guardar cambios' : 'Guardar transformación'}
            </button>
          </div>
        </div>
      )}

      <div className="linajes-especie-list">
        {transformaciones.length === 0 && !abierto && (
          <p className="linajes-especie-empty">
            Todavía no agregaste transformaciones.
          </p>
        )}

        {transformaciones.map(t => (
          <article className="linajes-especie-card" key={t.id}>
            <div className="linajes-especie-card-heading">
              <h5>{t.nombre}</h5>
              <div className="linajes-especie-card-actions">
                <button
                  type="button"
                  aria-label={`Editar ${t.nombre}`}
                  onClick={() => editar(t)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar ${t.nombre}`}
                  onClick={() => eliminar(t.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <p>{t.descripcion}</p>
            <p><strong>Nivel requerido:</strong> {t.nivelRequerido ?? 'No especificado'}</p>
            <p><strong>Activación:</strong> {t.activacion || '—'}</p>
            <p><strong>Duración:</strong> {t.duracion || '—'}</p>

            <p>
              <strong>Usos:</strong>{' '}
              {t.configuracionUsos
                ? ({
                    fijo: `${t.configuracionUsos.cantidad} uso(s)`,
                    competencia: 'Bonificador por competencia',
                    nivel: 'Nivel del personaje',
                    caracteristica:
                      `Modificador de ${t.configuracionUsos.caracteristica}`,
                    ilimitado: 'Sin límite',
                    especial: t.configuracionUsos.reglaEspecial,
                  }[t.configuracionUsos.tipo])
                : t.usos || 'No especificado'}
            </p>

            {t.configuracionUsos && t.configuracionUsos.tipo !== 'ilimitado' && (
              <p>
                <strong>Recuperación:</strong>{' '}
                {({
                  descanso_corto: 'Descanso corto',
                  descanso_largo: 'Descanso largo',
                  otro: t.configuracionUsos.recuperacionEspecial,
                  ninguna: 'Sin recuperación',
                })[t.configuracionUsos.recuperacion]}
              </p>
            )}

            {t.efectosGenerales && (
              <p><strong>Efectos generales:</strong> {t.efectosGenerales}</p>
            )}

            {(t.opciones ?? []).map(o => (
              <div key={o.id}>
                <strong>{o.nombre}</strong>
                <p>{o.descripcion}</p>
              </div>
            ))}

            {t.beneficios.map(b => (
              <div key={b.id}>
                <strong>Beneficio de nivel {b.nivel}</strong>
                <p>{b.descripcion}</p>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}
