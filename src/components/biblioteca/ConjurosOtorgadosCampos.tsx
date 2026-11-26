import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { CaracteristicaMagica, Conjuro, ConjurosOtorgados } from '../../types/conjuro'
import { APTITUDES_HABITUALES, NOMBRE_APTITUD } from '../../lib/conjurosOtorgados'
import SelectorConjuros from './SelectorConjuros'
import SelectorClases from './SelectorClases'
import CampoNumero from '../../components/shared/CampoNumero'
import '../../styles/formularios/ConjurosOtorgados.css'

type Props = {
  idBase: string
  valor: ConjurosOtorgados
  onChange: (valor: ConjurosOtorgados) => void
  conjuros: Conjuro[]
  onCrearConjuro: (conjuro: Conjuro) => void
  clasesDisponibles: string[]
  /** Pide las clases de la lista en modo «a elegir» (en las dotes la lista es la de la dote). */
  listaPropia?: boolean
  /** Pide la aptitud mágica (en las dotes es la de la dote). */
  aptitud?: boolean
  /** Ofrece «Se puede cambiar por otro» (en las dotes hay una tarjeta «Cambiar conjuro»). */
  cambio?: boolean
}

const NIVELES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const TODAS_APTITUDES = ['inteligencia', 'sabiduria', 'carisma', 'fuerza', 'destreza', 'constitucion']

/** Clases elegidas como etiquetas, con el botón que abre el popup. */
function Clases({ elegidas, disponibles, titulo, onChange }: { elegidas: string[]; disponibles: string[]; titulo: string; onChange: (v: string[]) => void }) {
  const [abierto, setAbierto] = useState(false)
  return <div className="co-clases">
    {elegidas.map(clase => <span key={clase} className="co-chip">{clase}
      <button type="button" aria-label={`Quitar ${clase}`} onClick={() => onChange(elegidas.filter(x => x !== clase))}><X size={12} /></button></span>)}
    <button type="button" className="co-boton" onClick={() => setAbierto(true)}>{elegidas.length ? 'Cambiar clases…' : 'Elegir clases…'}</button>
    {abierto && <SelectorClases abierto titulo={titulo} clases={disponibles} elegidas={elegidas} onAceptar={onChange} onCerrar={() => setAbierto(false)} />}
  </div>
}

/**
 * Qué conjuros se otorgan y cómo se usan: la misma tarjeta para dotes, rasgos de especie y
 * beneficios de linaje, así el creador de personajes lee siempre los mismos datos.
 */
export default function ConjurosOtorgadosCampos({ idBase, valor: c, onChange, conjuros, onCrearConjuro, clasesDisponibles, listaPropia, aptitud, cambio }: Props) {
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  const cambiar = (parcial: Partial<ConjurosOtorgados>) => onChange({ ...c, ...parcial })
  const vincular = (conjuro: Conjuro) => { if (!c.conjurosIds.includes(conjuro.id)) cambiar({ modo: 'fijos', conjurosIds: [...c.conjurosIds, conjuro.id] }) }
  const nombreDe = (id: string) => {
    const conjuro = conjuros.find(x => x.id === id)
    return conjuro ? `${conjuro.nombre} (${conjuro.tipo === 'truco' ? 'Truco' : `Nivel ${conjuro.nivel}`})` : 'Conjuro no disponible en el catálogo'
  }
  const aptitudesElegibles = c.aptitudesAEleccion?.length ? c.aptitudesAEleccion : APTITUDES_HABITUALES

  return <div className="co-campos">
    <div className="co-modo" role="radiogroup" aria-label="Qué conjuros otorga">
      <label className="co-casilla"><input type="radio" name={`modo-${idBase}`} checked={c.modo === 'fijos'} onChange={() => cambiar({ modo: 'fijos' })} /><span>Conjuros puntuales del catálogo</span></label>
      <label className="co-casilla"><input type="radio" name={`modo-${idBase}`} checked={c.modo === 'eleccion'} onChange={() => cambiar({ modo: 'eleccion', selecciones: c.selecciones.length ? c.selecciones : [{ nivel: 0, cantidad: 1 }] })} />
        <span>{listaPropia ? 'A elegir de una lista de clase' : 'A elegir de la lista de la dote'}</span></label>
    </div>

    {c.modo === 'fijos' ? <div className="co-fijos">
      {c.conjurosIds.length === 0 && <p className="co-ayuda">Todavía no hay conjuros vinculados.</p>}
      {c.conjurosIds.map(id => <div className="co-conjuro" key={id}>
        <span>{nombreDe(id)}</span>
        <button type="button" className="co-desvincular" onClick={() => cambiar({ conjurosIds: c.conjurosIds.filter(x => x !== id) })}>Desvincular</button>
      </div>)}
      <button type="button" className="co-enlace" onClick={() => setSelectorAbierto(true)}><Plus size={14} />Vincular conjuro</button>
    </div> : <div className="co-eleccion">
      {listaPropia && <div className="co-bloque"><span className="co-subtitulo">Lista de las clases</span>
        <Clases elegidas={c.listas ?? []} disponibles={clasesDisponibles} titulo="Clases de la lista" onChange={listas => cambiar({ listas })} /></div>}
      {c.selecciones.map((s, i) => <div className="co-fila" key={i}>
        <label>Nivel<select value={s.nivel} onChange={e => cambiar({ selecciones: c.selecciones.map((x, j) => j === i ? { ...x, nivel: Number(e.target.value) } : x) })}>
          {NIVELES.map(n => <option key={n} value={n}>{n === 0 ? 'Truco' : `Nivel ${n}`}</option>)}</select></label>
        <label>Cantidad<CampoNumero min={1} value={s.cantidad} onChange={e => cambiar({ selecciones: c.selecciones.map((x, j) => j === i ? { ...x, cantidad: Number(e.target.value) } : x) })} /></label>
        {c.selecciones.length > 1 && <button type="button" className="co-quitar" aria-label="Quitar este nivel" onClick={() => cambiar({ selecciones: c.selecciones.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>}
      </div>)}
      <button type="button" className="co-enlace" onClick={() => cambiar({ selecciones: [...c.selecciones, { nivel: 1, cantidad: 1 }] })}><Plus size={14} />Otro nivel</button>
    </div>}

    <label className="co-casilla"><input type="checkbox" checked={Boolean(c.siemprePreparado)} onChange={e => cambiar({ siemprePreparado: e.target.checked })} /><span>Siempre preparado</span></label>
    <label className="co-casilla"><input type="checkbox" checked={Boolean(c.lanzamientoSinEspacio)} onChange={e => cambiar({ lanzamientoSinEspacio: e.target.checked ? { usos: 1, recuperacion: 'descanso_largo' } : undefined })} /><span>Se puede lanzar sin gastar espacio de conjuro</span></label>
    {c.lanzamientoSinEspacio && <div className="co-fila co-sangria">
      <label>Veces<CampoNumero min={1} value={c.lanzamientoSinEspacio.usos} onChange={e => cambiar({ lanzamientoSinEspacio: { ...c.lanzamientoSinEspacio!, usos: Number(e.target.value) } })} /></label>
      <label>Se recupera tras<select value={c.lanzamientoSinEspacio.recuperacion} onChange={e => cambiar({ lanzamientoSinEspacio: { ...c.lanzamientoSinEspacio!, recuperacion: e.target.value as 'descanso_largo' | 'descanso_corto' } })}>
        <option value="descanso_largo">Descanso largo</option><option value="descanso_corto">Descanso corto</option></select></label>
    </div>}
    <label className="co-casilla"><input type="checkbox" checked={Boolean(c.permiteUsarEspacios)} onChange={e => cambiar({ permiteUsarEspacios: e.target.checked })} /><span>También se puede lanzar con espacios de conjuro</span></label>

    {aptitud && <div className="co-bloque">
      <label className="co-etiqueta">Aptitud mágica
        <select value={c.caracteristica ?? 'ninguna'} onChange={e => cambiar({ caracteristica: e.target.value as CaracteristicaMagica })}>
          <option value="ninguna">No indica</option>
          <option value="eleccion">A elección</option>
          {TODAS_APTITUDES.map(a => <option key={a} value={a}>{NOMBRE_APTITUD[a]}</option>)}
        </select></label>
      {c.caracteristica === 'eleccion' && <div className="co-aptitudes" role="group" aria-label="Aptitudes entre las que se elige">
        {TODAS_APTITUDES.map(a => <label key={a} className="co-casilla co-casilla--chica">
          <input type="checkbox" checked={aptitudesElegibles.includes(a)} onChange={e => cambiar({ aptitudesAEleccion: e.target.checked ? [...aptitudesElegibles, a] : aptitudesElegibles.filter(x => x !== a) })} />
          <span>{NOMBRE_APTITUD[a]}</span></label>)}
      </div>}
    </div>}

    {cambio && <div className="co-bloque">
      <label className="co-casilla"><input type="checkbox" checked={Boolean(c.cambio)} onChange={e => cambiar({ cambio: e.target.checked ? { momento: 'descanso_largo', listas: c.listas ?? [], mismoNivel: true, cantidad: 1 } : undefined })} />
        <span>Se puede cambiar por otro</span></label>
      {c.cambio && <div className="co-sangria">
        <div className="co-fila">
          <label>Cuándo<select value={c.cambio.momento} onChange={e => cambiar({ cambio: { ...c.cambio!, momento: e.target.value as 'descanso_largo' | 'descanso_corto' | 'subir_nivel' } })}>
            <option value="descanso_largo">Tras un descanso largo</option><option value="descanso_corto">Tras un descanso corto</option><option value="subir_nivel">Al subir de nivel</option></select></label>
          <label>Cuántos<CampoNumero min={1} value={c.cambio.cantidad} onChange={e => cambiar({ cambio: { ...c.cambio!, cantidad: Number(e.target.value) } })} /></label>
        </div>
        <label className="co-casilla"><input type="checkbox" checked={c.cambio.mismoNivel} onChange={e => cambiar({ cambio: { ...c.cambio!, mismoNivel: e.target.checked } })} /><span>Por uno del mismo nivel</span></label>
        <span className="co-subtitulo">De la lista de</span>
        <Clases elegidas={c.cambio.listas} disponibles={clasesDisponibles} titulo="Lista para el cambio" onChange={listas => cambiar({ cambio: { ...c.cambio!, listas } })} />
      </div>}
    </div>}

    {(aptitud || cambio) && <label className="co-etiqueta co-notas">Notas (solo si algo no entra en los datos de arriba)
      <textarea rows={2} value={c.notas ?? ''} onChange={e => cambiar({ notas: e.target.value })} /></label>}

    <SelectorConjuros abierto={selectorAbierto} conjuros={conjuros} idsVinculados={c.conjurosIds} onVincular={vincular}
      onCrear={conjuro => { onCrearConjuro(conjuro); vincular(conjuro) }} onCerrar={() => setSelectorAbierto(false)} />
  </div>
}
