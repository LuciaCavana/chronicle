import { useState, type FormEvent } from 'react'
import { useReportarBorrador } from '../../hooks/useRespaldoBorrador'
import { Bird, Footprints, Mountain, Plus, Shovel, Trash2, Waves } from 'lucide-react'

import LinajesEspecie from './LinajesEspecie'
import TransformacionesEspecie from './TransformacionesEspecie'
import RasgosEspecie from './RasgosEspecie'
import SelectorTipoCriatura from './SelectorTipoCriatura'
import type { Conjuro } from '../../types/conjuro'
import type {
  CampoAdicionalEspecie,
  Especie,
  LinajeEspecie,
  RasgoEspecie,
  TamanoEspecie,
  TransformacionEspecie,
} from '../../types/especie'
import '../../styles/formularios/EspecieForm.css'
import type { TipoVelocidadExtra, VelocidadExtra, VelocidadesExtra } from '../../types/especie'
import CampoNumero from '../../components/shared/CampoNumero'

const VELOCIDADES: { tipo: TipoVelocidadExtra; nombre: string; Icono: typeof Waves }[] = [
  { tipo: 'nado', nombre: 'Nado', Icono: Waves }, { tipo: 'vuelo', nombre: 'Vuelo', Icono: Bird },
  { tipo: 'trepar', nombre: 'Trepar', Icono: Mountain }, { tipo: 'excavar', nombre: 'Excavar', Icono: Shovel },
]
/** Solo las velocidades con un valor (igual a la velocidad o en pies). */
function limpiarVelocidades(v: VelocidadesExtra): VelocidadesExtra | undefined {
  const salida: VelocidadesExtra = {}
  for (const { tipo } of VELOCIDADES) {
    const x = v[tipo]
    if (x?.igualAVelocidad) salida[tipo] = { pies: '', igualAVelocidad: true }
    else if (x?.pies.trim()) salida[tipo] = { pies: x.pies.trim() }
  }
  return Object.keys(salida).length ? salida : undefined
}

type Props = {
  bookTitle: string
  bookCode: string
  initialData?: Especie | null
  onSave: (especie: Especie) => void
  onCancel: () => void
  conjuros: Conjuro[]
  onCrearConjuro: (conjuro: Conjuro) => void
  /** Lo escrito antes de recargar, recuperado de la copia local. */
  borrador?: Especie | null
  onCambioBorrador?: (borrador: Especie | null) => void
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
  conjuros,
  onCrearConjuro,
  borrador,
  onCambioBorrador,
}: Props) {
  const fuente = borrador ?? initialData
  const [idNuevo] = useState(() => fuente?.id ?? crypto.randomUUID())
  const [nombre, setNombre] = useState(fuente?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(
    fuente?.descripcion ?? ''
  )
  const [tamanos, setTamanos] = useState<TamanoEspecie[]>(
    fuente?.tamanos ?? []
  )
  const [nombreOtroTamano, setNombreOtroTamano] = useState(
    fuente?.tamanos.find((tamano) => tamano.id === 'otro')?.nombre ?? ''
  )
  const [tiposCriatura, setTiposCriatura] = useState<string[]>(
    fuente?.tiposCriatura ?? ['Humanoide']
  )
  const [velocidad, setVelocidad] = useState(fuente?.velocidad ?? '30')
  const [velocidadesExtra, setVelocidadesExtra] = useState<VelocidadesExtra>(fuente?.velocidadesExtra ?? {})
  const cambiarVelocidad = (tipo: TipoVelocidadExtra, cambio: Partial<VelocidadExtra> | null) => setVelocidadesExtra(actuales => {
    const nuevas = { ...actuales }
    if (cambio === null) delete nuevas[tipo]
    else nuevas[tipo] = { pies: '', ...actuales[tipo], ...cambio }
    return nuevas
  })
  const [visionOscuridad, setVisionOscuridad] = useState(
    fuente?.visionOscuridad ?? false
  )
  const [alcanceVision, setAlcanceVision] = useState(
    fuente?.alcanceVision ?? '60'
  )
  const [pagina, setPagina] = useState(fuente?.pagina ?? '')
  const [rasgos, setRasgos] = useState<RasgoEspecie[]>(
    fuente?.rasgos ?? []
  )
  const [linajes, setLinajes] = useState<LinajeEspecie[]>(
    fuente?.linajes ?? []
  )
  const [transformaciones, setTransformaciones] =
    useState<TransformacionEspecie[]>(
      fuente?.transformaciones ?? []
    )
  const [camposAdicionales, setCamposAdicionales] = useState<
    CampoAdicionalEspecie[]
  >(fuente?.camposAdicionales ?? [])
  useReportarBorrador<Especie>({
    id: initialData?.id ?? idNuevo, nombre, descripcion, tamanos, tiposCriatura, velocidad, velocidadesExtra,
    visionOscuridad, alcanceVision, pagina, rasgos, linajes, camposAdicionales, transformaciones,
  }, onCambioBorrador, Boolean(borrador))

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
      id: initialData?.id ?? idNuevo,
      nombre: nombre.trim(),
      descripcion,
      tamanos,
      tiposCriatura: normalizarTiposCriatura(tiposCriatura),
      velocidad,
      velocidadesExtra: limpiarVelocidades(velocidadesExtra),
      visionOscuridad,
      alcanceVision: visionOscuridad ? alcanceVision : '',
      pagina,
      rasgos,
      linajes,
      camposAdicionales: camposAdicionales.map((campo) => ({
        ...campo,
        nombre: campo.nombre.trim(),
      })),
      transformaciones,
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
                <CampoNumero
                  
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
                <CampoNumero
                  
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
          <label htmlFor="species-page">Página del libro</label>
          <CampoNumero
            id="species-page"
            
            min="1"
            value={pagina}
            onChange={(e) => setPagina(e.target.value)}
          />
        </div>
      </div>

      <fieldset className="especie-form-section especie-vel">
        <legend>Velocidades</legend>
        <p className="especie-form__ayuda">Caminar la tiene siempre. Tocá las otras para sumarlas.</p>
        <div className="especie-vel__grilla">
          <div className="especie-vel__tarjeta especie-vel__tarjeta--activa">
            <div className="especie-vel__cabecera"><Footprints size={18} aria-hidden="true" /><span>Caminar</span></div>
            <div className="especie-vel__valor">
              <CampoNumero id="species-speed" aria-label="Velocidad caminando (pies)" min="0" step="5" value={velocidad} onChange={(e) => setVelocidad(e.target.value)} />
              <span>pies</span>
            </div>
          </div>
          {VELOCIDADES.map(({ tipo, nombre, Icono }) => {
            const v = velocidadesExtra[tipo]
            return <div key={tipo} className={`especie-vel__tarjeta${v ? ' especie-vel__tarjeta--activa' : ''}`}>
              <label className="especie-vel__cabecera especie-vel__cabecera--interruptor">
                <Icono size={18} aria-hidden="true" /><span>{nombre}</span>
                <input type="checkbox" className="especie-vel__interruptor" role="switch" aria-checked={!!v} checked={!!v}
                  onChange={(e) => cambiarVelocidad(tipo, e.target.checked ? { pies: '', igualAVelocidad: tipo === 'nado' || tipo === 'trepar' } : null)} />
              </label>
              {v ? <>
                <div className="especie-vel__modo" role="group" aria-label={`${nombre}: cuánto`}>
                  <button type="button" aria-pressed={!!v.igualAVelocidad} onClick={() => cambiarVelocidad(tipo, { igualAVelocidad: true })} title="Igual a la velocidad caminando">Igual</button>
                  <button type="button" aria-pressed={!v.igualAVelocidad} onClick={() => cambiarVelocidad(tipo, { igualAVelocidad: false })}>Otra</button>
                </div>
                {v.igualAVelocidad
                  ? <p className="especie-vel__igual">{velocidad || '—'} pies<small>como caminar</small></p>
                  : <div className="especie-vel__valor">
                      <CampoNumero id={`species-speed-${tipo}`} aria-label={`${nombre} (pies)`} min="0" step="5" value={v.pies} onChange={(e) => cambiarVelocidad(tipo, { pies: e.target.value })} />
                      <span>pies</span>
                    </div>}
              </> : <p className="especie-vel__nada">No tiene</p>}
            </div>
          })}
        </div>
      </fieldset>

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
            <CampoNumero
              id="species-darkvision"
              
              min="1"
              value={alcanceVision}
              onChange={(e) => setAlcanceVision(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      <RasgosEspecie
        rasgos={rasgos}
        onChange={setRasgos}
        conjuros={conjuros}
        onCrearConjuro={onCrearConjuro}
      />

      <LinajesEspecie linajes={linajes} onChange={setLinajes} />
      <TransformacionesEspecie
        transformaciones={transformaciones}
        onChange={setTransformaciones}
      />

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
