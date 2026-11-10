
import { useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import type { Conjuro } from '../../types/conjuro'
import '../../styles/SelectorConjuros.css'

type Props = {
  abierto: boolean
  conjuros: Conjuro[]
  idsVinculados: string[]
  onVincular: (conjuro: Conjuro) => void
  onCrear: (conjuro: Conjuro) => void
  onCerrar: () => void
}

export default function SelectorConjuros({
  abierto,
  conjuros,
  idsVinculados,
  onVincular,
  onCrear,
  onCerrar,
}: Props) {
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<'truco' | 'conjuro'>('truco')
  const [nivel, setNivel] = useState(1)
  const [escuela, setEscuela] = useState('')
  const [descripcion, setDescripcion] = useState('')
  
const [tiempoLanzamiento, setTiempoLanzamiento] = useState('')
const [alcance, setAlcance] = useState('')
const [componentes, setComponentes] = useState<string[]>([])
const [componenteMaterial, setComponenteMaterial] = useState('')
const [duracion, setDuracion] = useState('')
const [concentracion, setConcentracion] = useState(false)
const [ritual, setRitual] = useState(false)
const [clases] = useState<string[]>([])


  const [error, setError] = useState('')

  if (!abierto) return null

  const filtrados = conjuros.filter(c =>
    c.nombre.toLocaleLowerCase('es').includes(
      busqueda.trim().toLocaleLowerCase('es')
    )
  )

    function alternarSeleccion(
    valor: string,
    seleccionados: string[],
    actualizar: (valores: string[]) => void
    ) {
        actualizar(
            seleccionados.includes(valor)
            ? seleccionados.filter(item => item !== valor)
            : [...seleccionados, valor]
        )
    }


  function cerrar() {
    setBusqueda('')
    setCreando(false)
    setError('')
    onCerrar()
  }

  function comenzarCreacion() {
    setNombre(busqueda.trim())
    setCreando(true)
    setError('')
  }

  function crear() {
    const nombreLimpio = nombre.trim()

    if (!nombreLimpio) {
      setError('Ingresá un nombre.')
      return
    }

    if (
      conjuros.some(c =>
        c.nombre.trim().toLocaleLowerCase('es') ===
        nombreLimpio.toLocaleLowerCase('es')
      )
    ) {
      setError('Ya existe un conjuro con ese nombre.')
      return
    }

    if (tipo === 'conjuro' && (!Number.isInteger(nivel) || nivel < 1 || nivel > 9)) {
      setError('El nivel debe estar entre 1 y 9.')
      return
    }


    const nuevo: Conjuro = {
    id: crypto.randomUUID(),
    nombre: nombreLimpio,
    tipo,
    nivel: tipo === 'truco' ? 0 : nivel,
    escuela: escuela.trim(),

    tiempoLanzamiento: tiempoLanzamiento.trim(),
    alcance: alcance.trim(),

    componentes: componentes.join(', '),
    componenteMaterial: componentes.includes('M')
        ? componenteMaterial.trim()
        : '',

    duracion: duracion.trim(),
    concentracion,
    ritual,
    clases,

    descripcion: descripcion.trim(),
    }


    onCrear(nuevo)
    cerrar()
  }

  return (
    <div className="selector-conjuros-overlay" onMouseDown={e => {
      if (e.target === e.currentTarget) cerrar()
    }}>
      <div
        className="selector-conjuros-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Vincular conjuro"
      >
        <div className="selector-conjuros-header">
          <h3>{creando ? 'Crear conjuro' : 'Vincular conjuro'}</h3>
          <button type="button" onClick={cerrar} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {!creando ? (
          <>
            <div className="selector-conjuros-busqueda">
              <Search size={18} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre..."
                autoFocus
              />
            </div>

            <div className="selector-conjuros-lista">
              {filtrados.map(conjuro => {
                const vinculado = idsVinculados.includes(conjuro.id)

                return (
                  <div className="selector-conjuros-item" key={conjuro.id}>
                    <div>
                      <strong>{conjuro.nombre}</strong>
                      <p>
                        {conjuro.tipo === 'truco'
                          ? 'Truco'
                          : `Nivel ${conjuro.nivel}`}
                        {conjuro.escuela && ` · ${conjuro.escuela}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={vinculado}
                      onClick={() => {
                        onVincular(conjuro)
                        cerrar()
                      }}
                    >
                      {vinculado ? 'Vinculado' : 'Vincular'}
                    </button>
                  </div>
                )
              })}

              {filtrados.length === 0 && (
                <p className="selector-conjuros-vacio">
                  No se encontraron conjuros con ese nombre.
                </p>
              )}
            </div>

            <button
              type="button"
              className="selector-conjuros-crear"
              onClick={comenzarCreacion}
            >
              <Plus size={16} />
              Crear conjuro nuevo
            </button>
          </>
        ) : (
          <div className="selector-conjuros-formulario">
            <label>
              Nombre *
              <input value={nombre} onChange={e => setNombre(e.target.value)} />
            </label>

            <label>
              Tipo
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as 'truco' | 'conjuro')}
              >
                <option value="truco">Truco</option>
                <option value="conjuro">Conjuro</option>
              </select>
            </label>

            <label>
            Nivel de conjuro
            <select
                value={tipo === 'truco' ? 0 : nivel}
                disabled={tipo === 'truco'}
                onChange={e => setNivel(Number(e.target.value))}
            >
                {tipo === 'truco' ? (
                <option value={0}>Nivel 0 — Truco</option>
                ) : (
                Array.from({ length: 9 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>
                    Nivel {n}
                    </option>
                ))
                )}
            </select>
            </label>

            <label>
              Escuela
              <input value={escuela} onChange={e => setEscuela(e.target.value)} />
            </label>

        <label>
        Tiempo de lanzamiento
        <input
            value={tiempoLanzamiento}
            onChange={e => setTiempoLanzamiento(e.target.value)}
            placeholder="Ej. Acción, Acción adicional, Reacción"
        />
        </label>

        <label>
        Alcance
        <input
            value={alcance}
            onChange={e => setAlcance(e.target.value)}
            placeholder="Ej. Toque, Personal, 18 m"
        />
        </label>

        <fieldset className="selector-conjuros-grupo">
        <legend>Componentes</legend>

        <div className="selector-conjuros-opciones">
            {['V', 'S', 'M'].map(componente => (
            <label key={componente}>
                <input
                type="checkbox"
                checked={componentes.includes(componente)}
                onChange={() => alternarSeleccion(
                    componente,
                    componentes,
                    setComponentes
                )}
                />
                {componente === 'V' && 'Verbal (V)'}
                {componente === 'S' && 'Somático (S)'}
                {componente === 'M' && 'Material (M)'}
            </label>
            ))}
        </div>
        </fieldset>

        {componentes.includes('M') && (
        <label>
            Material requerido
            <input
            value={componenteMaterial}
            onChange={e => setComponenteMaterial(e.target.value)}
            placeholder="Ej. Una luciérnaga o musgo fosforescente"
            />
        </label>
        )}

        <label>
        Duración
        <input
            value={duracion}
            onChange={e => setDuracion(e.target.value)}
            placeholder="Ej. Instantánea, 1 minuto, 1 hora"
        />
        </label>

        <div className="selector-conjuros-opciones">
        <label>
            <input
            type="checkbox"
            checked={concentracion}
            onChange={e => setConcentracion(e.target.checked)}
            />
            Requiere concentración
        </label>

        <label>
            <input
            type="checkbox"
            checked={ritual}
            onChange={e => setRitual(e.target.checked)}
            />
            Ritual
        </label>
        </div>



            <label>
              Descripción
              <textarea
                rows={4}
                value={descripcion}
                onChange={e => setDescripcion(e.target.value)}
              />
            </label>

            {error && <p role="alert">{error}</p>}

            <div className="selector-conjuros-acciones">
              <button type="button" onClick={() => setCreando(false)}>
                Volver
              </button>
              <button type="button" onClick={crear}>
                Crear y vincular
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
