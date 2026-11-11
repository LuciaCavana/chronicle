import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { Elemento } from '../../services/chronicleLibros'
import '../../styles/ClaseForm.css'
import { ARMADURAS_BASE, ARMAS_BASE, HABILIDADES_BASE, type GrupoEquipo, type CompetenciasClase, type ObjetoCatalogo, normalizarCatalogo, normalizarCompetencias, normalizarEquipo, normalizarCategoriaArma } from '../../lib/catalogosReglas'

type Rasgo = { id: string; nombre: string; descripcion: string; nivel: number }
type Recurso = { id: string; nombre: string; descripcion: string; recuperacion: string }
type Nivel = { nivel: number; bonificadorCompetencia: number; notas: string }
type ColumnaProgresion = { id: string; nombre: string }
type DatosClase = {
  dadoGolpe: number
  caracteristicaPrincipal: string
  caracteristicasPrincipales: string[]
  salvaciones: string[]
  armaduras: string
  armas: string
  herramientas: string
  habilidades: string
  equipoInicial: string
  competencias: CompetenciasClase
  equipoOpciones: GrupoEquipo[]
  objetosCatalogo: ObjetoCatalogo[]
  recursos: Recurso[]
  progresion: Nivel[]
  columnasProgresion: ColumnaProgresion[]
  celdasProgresion: Record<string, Record<string, string>>
  rasgos: Rasgo[]
}

type Props = {
  elemento: Elemento
  onChange: (elemento: Elemento) => void
  disabled?: boolean
}

const caracteristicas = ['Fuerza', 'Destreza', 'Constitución', 'Inteligencia', 'Sabiduría', 'Carisma']
const nuevoId = () => crypto.randomUUID()
const progresionInicial = (): Nivel[] => Array.from({ length: 20 }, (_, i) => ({
  nivel: i + 1,
  bonificadorCompetencia: 2 + Math.floor(i / 4),
  notas: '',
}))

function normalizarDatos(valor: Record<string, unknown>): DatosClase {
  return {
    dadoGolpe: typeof valor.dadoGolpe === 'number' ? valor.dadoGolpe : 8,
    caracteristicaPrincipal: typeof valor.caracteristicaPrincipal === 'string' ? valor.caracteristicaPrincipal : '',
    caracteristicasPrincipales: Array.isArray(valor.caracteristicasPrincipales)
      ? valor.caracteristicasPrincipales.filter((v): v is string => typeof v === 'string' && caracteristicas.includes(v))
      : typeof valor.caracteristicaPrincipal === 'string'
        ? caracteristicas.filter(c => String(valor.caracteristicaPrincipal).toLocaleLowerCase('es').includes(c.toLocaleLowerCase('es')))
        : [],
    salvaciones: Array.isArray(valor.salvaciones) ? valor.salvaciones.filter((v): v is string => typeof v === 'string') : [],
    armaduras: typeof valor.armaduras === 'string' ? valor.armaduras : '',
    armas: typeof valor.armas === 'string' ? valor.armas : '',
    herramientas: typeof valor.herramientas === 'string' ? valor.herramientas : '',
    habilidades: typeof valor.habilidades === 'string' ? valor.habilidades : '',
    equipoInicial: typeof valor.equipoInicial === 'string' ? valor.equipoInicial : '',
    competencias: normalizarCompetencias(valor),
    equipoOpciones: normalizarEquipo(valor.equipoOpciones),
    objetosCatalogo: normalizarCatalogo(valor.objetosCatalogo),
    recursos: Array.isArray(valor.recursos) ? valor.recursos as Recurso[] : [],
    progresion: Array.isArray(valor.progresion) && valor.progresion.length === 20 ? valor.progresion as Nivel[] : progresionInicial(),
    columnasProgresion: Array.isArray(valor.columnasProgresion)
      ? (valor.columnasProgresion as ColumnaProgresion[]).filter(c => typeof c?.id === 'string' && typeof c?.nombre === 'string')
      : [{ id: 'competencia', nombre: 'Bonificador de competencia' }, { id: 'rasgos', nombre: 'Rasgos' }, { id: 'recursos', nombre: 'Recursos' }, { id: 'notas', nombre: 'Notas' }],
    celdasProgresion: valor.celdasProgresion && typeof valor.celdasProgresion === 'object' && !Array.isArray(valor.celdasProgresion)
      ? valor.celdasProgresion as Record<string, Record<string, string>>
      : {},
    rasgos: Array.isArray(valor.rasgos) ? valor.rasgos as Rasgo[] : [],
  }
}


type CampoNumeroProps = { value: number; min: number; max?: number; onChange: (valor: number) => void }
function CampoNumero({ value, min, max, onChange }: CampoNumeroProps) {
  const [texto, setTexto] = useState(String(value))
  const [enEdicion, setEnEdicion] = useState(false)
  useEffect(() => { if (!enEdicion) setTexto(String(value)) }, [value, enEdicion])
  const ajustar = (numero: number) => Math.max(min, Math.min(max ?? Number.MAX_SAFE_INTEGER, Math.floor(numero)))
  const confirmar = () => {
    const nuevo = texto === '' ? min : ajustar(Number(texto))
    setEnEdicion(false)
    setTexto(String(nuevo))
    if (nuevo !== value) onChange(nuevo)
  }
  const paso = (incremento: number) => {
    const nuevo = ajustar((texto === '' ? value : Number(texto)) + incremento)
    setEnEdicion(false)
    setTexto(String(nuevo))
    if (nuevo !== value) onChange(nuevo)
  }
  return (
    <div className="clase-form__numero">
      <input type="text" inputMode="numeric" pattern="[0-9]*" value={texto}
        onFocus={() => setEnEdicion(true)}
        onChange={e => { if (/^\d*$/.test(e.target.value)) setTexto(e.target.value) }}
        onBlur={confirmar} />
      <div className="clase-form__numero-controles">
        <button type="button" aria-label="Aumentar" onMouseDown={e => e.preventDefault()} onClick={() => paso(1)}>+</button>
        <button type="button" aria-label="Disminuir" onMouseDown={e => e.preventDefault()} onClick={() => paso(-1)}>−</button>
      </div>
    </div>
  )
}

export default function ClaseForm({ elemento, onChange, disabled = false }: Props) {
  const datos = normalizarDatos(elemento.datos)
  const [nivelActivo, setNivelActivo] = useState(1)
  const [armaduraNueva, setArmaduraNueva] = useState('')
  const [armaNueva, setArmaNueva] = useState('')
  const [habilidadNueva, setHabilidadNueva] = useState('')
  const [selector, setSelector] = useState<{ tipo: 'arma' | 'equipo'; grupoId?: string; opcionId?: string } | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [nuevoObjeto, setNuevoObjeto] = useState(false)
  const [nombreObjeto, setNombreObjeto] = useState('')
  const [descripcionObjeto, setDescripcionObjeto] = useState('')
  const actualizar = (cambios: Partial<DatosClase>) => onChange({ ...elemento, datos: { ...elemento.datos, ...datos, ...cambios } })
  const cambiarCelda = (nivelNumero: number, columnaId: string, texto: string) => actualizar({
    celdasProgresion: {
      ...datos.celdasProgresion,
      [nivelNumero]: { ...(datos.celdasProgresion[nivelNumero] ?? {}), [columnaId]: texto },
    },
  })
  const eliminarColumna = (id: string) => actualizar({
    columnasProgresion: datos.columnasProgresion.filter(c => c.id !== id),
    celdasProgresion: Object.fromEntries(Object.entries(datos.celdasProgresion).map(([nivelNumero, celdas]) =>
      [nivelNumero, Object.fromEntries(Object.entries(celdas).filter(([clave]) => clave !== id))])),
  })
  const alternarPrincipal = (nombre: string) => {
    const actuales = datos.caracteristicasPrincipales
    const nuevas = actuales.includes(nombre) ? actuales.filter(c => c !== nombre) : [...actuales, nombre]
    actualizar({ caracteristicasPrincipales: nuevas, caracteristicaPrincipal: nuevas.join(' o ') })
  }
  const alternarSalvacion = (nombre: string) => actualizar({
    salvaciones: datos.salvaciones.includes(nombre)
      ? datos.salvaciones.filter(v => v !== nombre)
      : [...datos.salvaciones, nombre],
  })
  const actualizarRasgo = (id: string, cambios: Partial<Rasgo>) => actualizar({
    rasgos: datos.rasgos.map(r => r.id === id ? { ...r, ...cambios } : r),
  })
  const actualizarRecurso = (id: string, cambios: Partial<Recurso>) => actualizar({
    recursos: datos.recursos.map(r => r.id === id ? { ...r, ...cambios } : r),
  })
  const actualizarCompetencias = (cambios: Partial<CompetenciasClase>) => actualizar({ competencias: { ...datos.competencias, ...cambios } })
  const cambiarCompetenciaLista = (campo: 'armaduras' | 'armasCategorias', valor: string) => {
    const lista = datos.competencias[campo]
    actualizarCompetencias({ [campo]: lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor] })
  }
  const cambiarHabilidad = (valor: string) => {
    const lista = datos.competencias.habilidadesOpciones
    const nueva = lista.includes(valor) ? lista.filter(v => v !== valor) : [...lista, valor]
    actualizarCompetencias({ habilidadesOpciones: nueva, habilidadesCantidad: Math.min(datos.competencias.habilidadesCantidad, nueva.length) })
  }
  const agregarPersonalizada = (tipo: 'armaduras' | 'armas' | 'habilidades', texto: string, limpiar: (v: string) => void) => {
    const nombre = texto.trim().replace(/\\s+/g, ' ')
    if (!nombre) return
    const valor = nombre.charAt(0).toLocaleUpperCase('es') + nombre.slice(1)
    const campo = tipo === 'armaduras' ? 'armadurasPersonalizadas' : tipo === 'armas' ? 'armasPersonalizadas' : 'habilidadesPersonalizadas'
    const base = tipo === 'armaduras' ? ARMADURAS_BASE : tipo === 'armas' ? ARMAS_BASE : HABILIDADES_BASE
    const comparar = (v: string) => (tipo === 'armas' ? normalizarCategoriaArma(v) : v).toLocaleLowerCase('es')
    const canonico = tipo === 'armas' ? normalizarCategoriaArma(valor) : valor
    const existentes = datos.competencias[campo]
    if (![...base, ...existentes].some(v => comparar(v) === comparar(canonico))) {
      actualizarCompetencias({ [campo]: [...existentes, canonico] })
    }
    limpiar('')
  }
  const actualizarGrupo = (id: string, cambios: Partial<GrupoEquipo>) => actualizar({ equipoOpciones: datos.equipoOpciones.map(g => g.id === id ? { ...g, ...cambios } : g) })
  const actualizarOpcion = (grupoId: string, opcionId: string, cambios: Partial<GrupoEquipo['opciones'][number]>) => {
    const grupo = datos.equipoOpciones.find(g => g.id === grupoId)
    if (grupo) actualizarGrupo(grupoId, { opciones: grupo.opciones.map(o => o.id === opcionId ? { ...o, ...cambios } : o) })
  }
  const alternarObjeto = (objetoId: string) => {
    if (!selector) return
    if (selector.tipo === 'arma') {
      const lista = datos.competencias.armasEspecificas
      actualizarCompetencias({ armasEspecificas: lista.includes(objetoId) ? lista.filter(id => id !== objetoId) : [...lista, objetoId] })
    } else {
      const grupo = datos.equipoOpciones.find(g => g.id === selector.grupoId)
      const opcion = grupo?.opciones.find(o => o.id === selector.opcionId)
      if (!grupo || !opcion) return
      actualizarOpcion(grupo.id, opcion.id, { objetos: opcion.objetos.some(o => o.objetoId === objetoId)
        ? opcion.objetos.filter(o => o.objetoId !== objetoId)
        : [...opcion.objetos, { objetoId, cantidad: 1 }] })
    }
  }
  const crearObjeto = () => {
    if (!nombreObjeto.trim() || !selector) return
    const objeto: ObjetoCatalogo = { id: nuevoId(), nombre: nombreObjeto.trim(), descripcion: descripcionObjeto.trim(), tipo: selector.tipo === 'arma' ? 'arma' : 'objeto' }
    const catalogo = [...datos.objetosCatalogo, objeto]
    if (selector.tipo === 'arma') actualizar({ objetosCatalogo: catalogo, competencias: { ...datos.competencias, armasEspecificas: [...datos.competencias.armasEspecificas, objeto.id] } })
    else {
      const grupo = datos.equipoOpciones.find(g => g.id === selector.grupoId)
      const opcion = grupo?.opciones.find(o => o.id === selector.opcionId)
      if (grupo && opcion) actualizar({ objetosCatalogo: catalogo, equipoOpciones: datos.equipoOpciones.map(g => g.id === grupo.id ? {
        ...g, opciones: g.opciones.map(o => o.id === opcion.id ? { ...o, objetos: [...o.objetos, { objetoId: objeto.id, cantidad: 1 }] } : o),
      } : g) })
    }
    setNombreObjeto(''); setDescripcionObjeto(''); setNuevoObjeto(false)
  }
  const rasgosNivel = datos.rasgos.filter(r => r.nivel === nivelActivo)

  return (
    <div className="clase-form">
      <fieldset disabled={disabled} className="clase-form__fieldset">
        <section className="clase-form__panel">
          <h4>Datos generales</h4>
          <div className="clase-form__grid">
            <label>Dado de golpe
              <span className="clase-form__select">
                <select value={datos.dadoGolpe} onChange={e => actualizar({ dadoGolpe: Number(e.target.value) })} style={{ appearance: 'none', WebkitAppearance: 'none', backgroundImage: 'none' }}>
                  {[4, 6, 8, 10, 12].map(d => <option key={d} value={d}>d{d}</option>)}
                </select>
                <ChevronDown size={18} aria-hidden="true" />
              </span>
            </label>
            <div>
              <p className="clase-form__hint">Característica principal (podés elegir varias)</p>
              <div className="clase-form__checks">
                {caracteristicas.map(c => <label key={c}><input type="checkbox" checked={datos.caracteristicasPrincipales.includes(c)} onChange={() => alternarPrincipal(c)} />{c}</label>)}
              </div>
            </div>
          </div>
          <p className="clase-form__hint">Competencia en tiradas de salvación</p>
          <div className="clase-form__checks">
            {caracteristicas.map(c => <label key={c}><input type="checkbox" checked={datos.salvaciones.includes(c)} onChange={() => alternarSalvacion(c)} />{c}</label>)}
          </div>
          <div className="clase-form__grid">
            <label>Competencia con herramientas
              <textarea rows={2} value={datos.herramientas} onChange={e => actualizar({ herramientas: e.target.value })} />
            </label>
          </div>
          <h4>Competencia con armaduras</h4>
          <div className="clase-form__checks">
            {[...ARMADURAS_BASE, ...datos.competencias.armadurasPersonalizadas].map(a =>
              <label key={a}><input type="checkbox" checked={datos.competencias.armaduras.includes(a)} onChange={() => cambiarCompetenciaLista('armaduras', a)} />{a}</label>
            )}
          </div>
          <div className="clase-form__inline">
            <input aria-label="Nueva categoría de armadura" placeholder="Nueva categoría Homebrew" value={armaduraNueva} onChange={e => setArmaduraNueva(e.target.value)} />
            <button type="button" onClick={() => agregarPersonalizada('armaduras', armaduraNueva, setArmaduraNueva)}>Agregar</button>
          </div>
          <h4>Competencia con armas</h4>
          <p className="clase-form__hint">Elegí categorías y, si corresponde, armas específicas. El nombre de cada arma específica debe coincidir con el identificador del catálogo de objetos.</p>
          <div className="clase-form__checks">
            {[...ARMAS_BASE, ...datos.competencias.armasPersonalizadas].map(a =>
              <label key={a}><input type="checkbox" checked={datos.competencias.armasCategorias.includes(a)} onChange={() => cambiarCompetenciaLista('armasCategorias', a)} />{a}</label>
            )}
          </div>
          <div className="clase-form__inline">
            <input aria-label="Nueva categoría de armas" placeholder="Categoría de arma Homebrew" value={armaNueva} onChange={e => setArmaNueva(e.target.value)} />
            <button type="button" onClick={() => agregarPersonalizada('armas', armaNueva, setArmaNueva)}>Agregar</button>
          </div>
          <div className="clase-form__item">
            <strong>Armas específicas</strong>
            <p className="clase-form__hint">Seleccioná armas por nombre. Los identificadores se gestionan internamente.</p>
            <div className="clase-form__inline">{datos.competencias.armasEspecificas.map(id => <span key={id}>{datos.objetosCatalogo.find(o => o.id === id)?.nombre ?? `Arma anterior (${id})`}</span>)}</div>
            <button type="button" onClick={() => { setSelector({ tipo: 'arma' }); setBusqueda('') }}>Seleccionar armas</button>
          </div>
          <h4>Habilidades que puede elegir el personaje</h4>
          <label>Cantidad de elecciones
            <CampoNumero min={0} max={datos.competencias.habilidadesOpciones.length} value={datos.competencias.habilidadesCantidad} onChange={valor => actualizarCompetencias({ habilidadesCantidad: valor })} />
          </label>
          <div className="clase-form__checks">
            {[...HABILIDADES_BASE, ...datos.competencias.habilidadesPersonalizadas].map(h =>
              <label key={h}><input type="checkbox" checked={datos.competencias.habilidadesOpciones.includes(h)} onChange={() => cambiarHabilidad(h)} />{h}</label>
            )}
          </div>
          <div className="clase-form__inline">
            <input aria-label="Nueva habilidad" placeholder="Habilidad Homebrew" value={habilidadNueva} onChange={e => setHabilidadNueva(e.target.value)} />
            <button type="button" onClick={() => agregarPersonalizada('habilidades', habilidadNueva, setHabilidadNueva)}>Agregar</button>
          </div>
          <h4>Equipo inicial</h4>
          <p className="clase-form__hint">Agregá opciones de equipamiento con objetos, cantidades y/o monedas de oro. No necesitás crear grupos.</p>
          {datos.equipoOpciones.length > 0 && (
            <label>Cuántas opciones puede elegir el personaje
              <CampoNumero min={1} max={Math.max(1, datos.equipoOpciones.reduce((total, grupo) => total + grupo.opciones.length, 0))}
                value={Math.min(datos.equipoOpciones.reduce((total, grupo) => total + grupo.opciones.length, 0), datos.equipoOpciones.reduce((total, grupo) => total + grupo.elegir, 0))}
                onChange={valor => {
                  const opciones = datos.equipoOpciones.flatMap(grupo => grupo.opciones)
                  actualizar({ equipoOpciones: [{ id: datos.equipoOpciones[0].id, elegir: valor, opciones }] })
                }} />
            </label>
          )}
          {datos.equipoOpciones.flatMap(grupo => grupo.opciones.map(opcion => ({ grupo, opcion }))).map(({ grupo, opcion }, indice) => (
            <div className="clase-form__item" key={opcion.id}>
              <div className="clase-form__heading">
                <strong>Opción {String.fromCharCode(65 + indice)}</strong>
                <button type="button" className="clase-form__danger" onClick={() => {
                  const opciones = datos.equipoOpciones.flatMap(g => g.opciones).filter(o => o.id !== opcion.id)
                  const elegir = Math.max(1, Math.min(opciones.length, datos.equipoOpciones.reduce((total, g) => total + g.elegir, 0)))
                  actualizar({ equipoOpciones: opciones.length ? [{ id: datos.equipoOpciones[0].id, elegir, opciones }] : [] })
                }}>Eliminar opción</button>
              </div>
              {opcion.objetos.map(item => <div key={item.objetoId} className="clase-form__inline">
                <span>{datos.objetosCatalogo.find(o => o.id === item.objetoId)?.nombre ?? `Objeto anterior (${item.objetoId})`}</span>
                <label>Cantidad<CampoNumero min={1} value={item.cantidad} onChange={valor => actualizarOpcion(grupo.id, opcion.id, { objetos: opcion.objetos.map(o => o.objetoId === item.objetoId ? { ...o, cantidad: valor } : o) })} /></label>
                <button type="button" onClick={() => actualizarOpcion(grupo.id, opcion.id, { objetos: opcion.objetos.filter(o => o.objetoId !== item.objetoId) })}>Quitar</button>
              </div>)}
              <button type="button" onClick={() => { setSelector({ tipo: 'equipo', grupoId: grupo.id, opcionId: opcion.id }); setBusqueda('') }}>Seleccionar objetos</button>
              <label>Oro (po)<CampoNumero min={0} value={opcion.oro} onChange={valor => actualizarOpcion(grupo.id, opcion.id, { oro: valor })} /></label>
            </div>
          ))}
          <button type="button" onClick={() => {
            const opciones = datos.equipoOpciones.flatMap(grupo => grupo.opciones)
            const nueva = { id: nuevoId(), objetos: [], oro: 0 }
            actualizar({ equipoOpciones: [{ id: datos.equipoOpciones[0]?.id ?? nuevoId(), elegir: datos.equipoOpciones.length ? Math.max(1, Math.min(opciones.length + 1, datos.equipoOpciones.reduce((total, grupo) => total + grupo.elegir, 0))) : 1, opciones: [...opciones, nueva] }] })
          }}>+ Agregar opción de equipamiento</button>
        </section>

        <section className="clase-form__panel">
          <div className="clase-form__heading"><h4>Recursos de clase</h4><button type="button" onClick={() => actualizar({ recursos: [...datos.recursos, { id: nuevoId(), nombre: '', descripcion: '', recuperacion: '' }] })}>+ Recurso</button></div>
          {datos.recursos.length === 0 && <p className="clase-form__hint">Podés agregar recursos como puntos, cargas o usos por descanso.</p>}
          {datos.recursos.map(r => <div className="clase-form__item" key={r.id}>
            <div className="clase-form__grid">
              <label>Nombre<input value={r.nombre} onChange={e => actualizarRecurso(r.id, { nombre: e.target.value })} /></label>
              <label>Recuperación<input value={r.recuperacion} onChange={e => actualizarRecurso(r.id, { recuperacion: e.target.value })} placeholder="Ej. Descanso largo" /></label>
            </div>
            <label>Descripción<textarea rows={2} value={r.descripcion} onChange={e => actualizarRecurso(r.id, { descripcion: e.target.value })} /></label>
            <button type="button" className="clase-form__danger" onClick={() => actualizar({ recursos: datos.recursos.filter(x => x.id !== r.id) })}>Eliminar recurso</button>
          </div>)}
        </section>

        <section className="clase-form__panel">
          <div className="clase-form__heading">
            <h4>Tabla de progresión (niveles 1 a 20)</h4>
            <button type="button" onClick={() => actualizar({ columnasProgresion: [...datos.columnasProgresion, { id: nuevoId(), nombre: 'Nueva columna' }] })}>+ Agregar columna</button>
          </div>
          <p className="clase-form__hint">Podés cambiar los nombres, agregar o quitar columnas y escribir cualquier contenido. La columna Nivel identifica cada fila.</p>
          <div className="clase-form__tabla-scroll">
            <table className="clase-form__tabla">
              <thead><tr>
                <th scope="col">Nivel</th>
                {datos.columnasProgresion.map(columna => <th scope="col" key={columna.id}>
                  <div className="clase-form__columna-cabecera">
                    <input aria-label="Nombre de columna" value={columna.nombre} onChange={e => actualizar({ columnasProgresion: datos.columnasProgresion.map(c => c.id === columna.id ? { ...c, nombre: e.target.value } : c) })} />
                    <button type="button" className="clase-form__danger" aria-label={`Eliminar columna ${columna.nombre}`} title="Eliminar columna" onClick={() => eliminarColumna(columna.id)}>×</button>
                  </div>
                </th>)}
              </tr></thead>
              <tbody>{datos.progresion.map(fila => <tr key={fila.nivel}>
                <th scope="row">{fila.nivel}</th>
                {datos.columnasProgresion.map(columna => <td key={columna.id}>
                  <input aria-label={`Nivel ${fila.nivel}, ${columna.nombre}`}
                    value={datos.celdasProgresion[fila.nivel]?.[columna.id] ?? (columna.id === 'competencia' ? `+${fila.bonificadorCompetencia}` : columna.id === 'notas' ? fila.notas : '')}
                    onChange={e => cambiarCelda(fila.nivel, columna.id, e.target.value)} />
                </td>)}
              </tr>)}</tbody>
            </table>
          </div>
          <div className="clase-form__niveles" role="group" aria-label="Seleccionar nivel para características">
            {datos.progresion.map(n => <button key={n.nivel} type="button" className={n.nivel === nivelActivo ? 'clase-form__nivel clase-form__nivel--activo' : 'clase-form__nivel'} aria-pressed={n.nivel === nivelActivo} onClick={() => setNivelActivo(n.nivel)}>{n.nivel}</button>)}
          </div>
          <div className="clase-form__heading"><h4>Características del nivel {nivelActivo}</h4><button type="button" onClick={() => actualizar({ rasgos: [...datos.rasgos, { id: nuevoId(), nivel: nivelActivo, nombre: '', descripcion: '' }] })}>+ Característica</button></div>
          {rasgosNivel.length === 0 && <p className="clase-form__hint">No hay características cargadas para este nivel.</p>}
          {rasgosNivel.map(r => <div className="clase-form__item" key={r.id}>
            <label>Nombre<input value={r.nombre} onChange={e => actualizarRasgo(r.id, { nombre: e.target.value })} /></label>
            <label>Descripción<textarea rows={4} value={r.descripcion} onChange={e => actualizarRasgo(r.id, { descripcion: e.target.value })} /></label>
            <button type="button" className="clase-form__danger" onClick={() => actualizar({ rasgos: datos.rasgos.filter(x => x.id !== r.id) })}>Eliminar característica</button>
          </div>)}
        </section>
      </fieldset>
      {selector && <div className="clase-form__overlay" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setSelector(null) }}>
        <div className="clase-form__modal" role="dialog" aria-modal="true" aria-label={selector.tipo === 'arma' ? 'Seleccionar armas' : 'Seleccionar objetos'}>
          <div className="clase-form__heading"><h4>{selector.tipo === 'arma' ? 'Seleccionar armas' : 'Seleccionar objetos'}</h4><button type="button" onClick={() => { setSelector(null); setNuevoObjeto(false) }}>Cerrar</button></div>
          <input aria-label="Buscar objetos" placeholder="Buscar por nombre o descripción" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <div className="clase-form__resultados">
            {datos.objetosCatalogo.filter(o => (selector.tipo === 'equipo' || o.tipo === 'arma') && `${o.nombre} ${o.descripcion}`.toLowerCase().includes(busqueda.toLowerCase())).map(o => {
              const marcado = selector.tipo === 'arma' ? datos.competencias.armasEspecificas.includes(o.id) :
                datos.equipoOpciones.find(g => g.id === selector.grupoId)?.opciones.find(op => op.id === selector.opcionId)?.objetos.some(item => item.objetoId === o.id) ?? false
              return <label key={o.id} className="clase-form__resultado"><input type="checkbox" checked={marcado} onChange={() => alternarObjeto(o.id)} /><span><strong>{o.nombre}</strong><small>{o.descripcion || 'Sin descripción'}</small></span></label>
            })}
            {!datos.objetosCatalogo.some(o => (selector.tipo === 'equipo' || o.tipo === 'arma') && `${o.nombre} ${o.descripcion}`.toLowerCase().includes(busqueda.toLowerCase())) && <p className="clase-form__hint">No hay objetos que coincidan. Podés crear uno.</p>}
          </div>
          {nuevoObjeto ? <div className="clase-form__item">
            <label>Nombre<input value={nombreObjeto} onChange={e => setNombreObjeto(e.target.value)} /></label>
            <label>Descripción<textarea rows={3} value={descripcionObjeto} onChange={e => setDescripcionObjeto(e.target.value)} /></label>
            <div className="clase-form__inline"><button type="button" disabled={!nombreObjeto.trim()} onClick={crearObjeto}>Crear y seleccionar</button><button type="button" onClick={() => setNuevoObjeto(false)}>Cancelar</button></div>
          </div> : <button type="button" onClick={() => setNuevoObjeto(true)}>+ Crear {selector.tipo === 'arma' ? 'arma' : 'objeto'}</button>}
          <button type="button" onClick={() => { setSelector(null); setNuevoObjeto(false) }}>Confirmar selección</button>
        </div>
      </div>}
    </div>
  )
}

