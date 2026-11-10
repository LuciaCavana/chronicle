import { useState } from 'react'
import type { Elemento } from '../../services/chronicleLibros'
import '../../styles/ClaseForm.css'

type Rasgo = { id: string; nombre: string; descripcion: string; nivel: number }
type Recurso = { id: string; nombre: string; descripcion: string; recuperacion: string }
type Nivel = { nivel: number; bonificadorCompetencia: number; notas: string }
type DatosClase = {
  dadoGolpe: number
  caracteristicaPrincipal: string
  salvaciones: string[]
  armaduras: string
  armas: string
  herramientas: string
  habilidades: string
  equipoInicial: string
  recursos: Recurso[]
  progresion: Nivel[]
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
    salvaciones: Array.isArray(valor.salvaciones) ? valor.salvaciones.filter((v): v is string => typeof v === 'string') : [],
    armaduras: typeof valor.armaduras === 'string' ? valor.armaduras : '',
    armas: typeof valor.armas === 'string' ? valor.armas : '',
    herramientas: typeof valor.herramientas === 'string' ? valor.herramientas : '',
    habilidades: typeof valor.habilidades === 'string' ? valor.habilidades : '',
    equipoInicial: typeof valor.equipoInicial === 'string' ? valor.equipoInicial : '',
    recursos: Array.isArray(valor.recursos) ? valor.recursos as Recurso[] : [],
    progresion: Array.isArray(valor.progresion) && valor.progresion.length === 20 ? valor.progresion as Nivel[] : progresionInicial(),
    rasgos: Array.isArray(valor.rasgos) ? valor.rasgos as Rasgo[] : [],
  }
}

export default function ClaseForm({ elemento, onChange, disabled = false }: Props) {
  const datos = normalizarDatos(elemento.datos)
  const [nivelActivo, setNivelActivo] = useState(1)
  const actualizar = (cambios: Partial<DatosClase>) => onChange({ ...elemento, datos: { ...elemento.datos, ...datos, ...cambios } })
  const actualizarNivel = (notas: string) => actualizar({
    progresion: datos.progresion.map(n => n.nivel === nivelActivo ? { ...n, notas } : n),
  })
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
  const rasgosNivel = datos.rasgos.filter(r => r.nivel === nivelActivo)
  const nivel = datos.progresion.find(n => n.nivel === nivelActivo)

  return (
    <div className="clase-form">
      <fieldset disabled={disabled} className="clase-form__fieldset">
        <section className="clase-form__panel">
          <h4>Datos generales</h4>
          <div className="clase-form__grid">
            <label>Dado de golpe
              <select value={datos.dadoGolpe} onChange={e => actualizar({ dadoGolpe: Number(e.target.value) })}>
                {[4, 6, 8, 10, 12].map(d => <option key={d} value={d}>d{d}</option>)}
              </select>
            </label>
            <label>Característica principal
              <input value={datos.caracteristicaPrincipal} onChange={e => actualizar({ caracteristicaPrincipal: e.target.value })} placeholder="Ej. Fuerza o Destreza" />
            </label>
          </div>
          <p className="clase-form__hint">Competencias en tiradas de salvación</p>
          <div className="clase-form__checks">
            {caracteristicas.map(c => <label key={c}><input type="checkbox" checked={datos.salvaciones.includes(c)} onChange={() => alternarSalvacion(c)} />{c}</label>)}
          </div>
          <div className="clase-form__grid">
            {([
              ['armaduras', 'Armaduras'], ['armas', 'Armas'], ['herramientas', 'Herramientas'],
              ['habilidades', 'Habilidades'], ['equipoInicial', 'Equipo inicial'],
            ] as const).map(([clave, titulo]) => <label key={clave}>{titulo}
              <textarea rows={2} value={datos[clave]} onChange={e => actualizar({ [clave]: e.target.value })} />
            </label>)}
          </div>
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
          <h4>Progresión de nivel 1 a 20</h4>
          <div className="clase-form__niveles" role="group" aria-label="Seleccionar nivel">
            {datos.progresion.map(n => <button key={n.nivel} type="button" className={n.nivel === nivelActivo ? 'clase-form__nivel clase-form__nivel--activo' : 'clase-form__nivel'} aria-pressed={n.nivel === nivelActivo} onClick={() => setNivelActivo(n.nivel)}>{n.nivel}</button>)}
          </div>
          <div className="clase-form__nivel-info">
            <strong>Nivel {nivelActivo}</strong><span>Bonificador de competencia: +{nivel?.bonificadorCompetencia ?? 2}</span>
          </div>
          <label>Notas de progresión<textarea rows={3} value={nivel?.notas ?? ''} onChange={e => actualizarNivel(e.target.value)} placeholder="Ej. Mejora de característica, espacios de conjuro, dados adicionales..." /></label>
          <div className="clase-form__heading"><h4>Características del nivel {nivelActivo}</h4><button type="button" onClick={() => actualizar({ rasgos: [...datos.rasgos, { id: nuevoId(), nivel: nivelActivo, nombre: '', descripcion: '' }] })}>+ Característica</button></div>
          {rasgosNivel.length === 0 && <p className="clase-form__hint">No hay características cargadas para este nivel.</p>}
          {rasgosNivel.map(r => <div className="clase-form__item" key={r.id}>
            <label>Nombre<input value={r.nombre} onChange={e => actualizarRasgo(r.id, { nombre: e.target.value })} /></label>
            <label>Descripción<textarea rows={4} value={r.descripcion} onChange={e => actualizarRasgo(r.id, { descripcion: e.target.value })} /></label>
            <button type="button" className="clase-form__danger" onClick={() => actualizar({ rasgos: datos.rasgos.filter(x => x.id !== r.id) })}>Eliminar característica</button>
          </div>)}
        </section>
      </fieldset>
    </div>
  )
}
