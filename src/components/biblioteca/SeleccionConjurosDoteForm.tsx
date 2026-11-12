import type { SeleccionConjurosDote } from '../../types/trasfondo'

type Props = {
  value: SeleccionConjurosDote | null
  onChange: (value: SeleccionConjurosDote | null) => void
  clasesDisponibles: string[]
}

const inicial: SeleccionConjurosDote = {
  listasPermitidas: [], listaSegunOrigen: true, mismaLista: true,
  selecciones: [{ nivel: 0, cantidad: 2 }, { nivel: 1, cantidad: 1 }],
  caracteristicasMagicas: ['inteligencia', 'sabiduria', 'carisma'],
  conjuroNivelUnoSiemprePreparado: true,
  lanzamientoSinEspacio: { usos: 1, recuperacion: 'descanso_largo' },
  permiteUsarEspacios: true,
  reemplazoAlSubirNivel: { cantidad: 1, mismoNivel: true, mismaLista: true },
  repetible: true, listaDistintaPorRepeticion: true,
}

export default function SeleccionConjurosDoteForm({ value, onChange, clasesDisponibles }: Props) {
  const actualizar = (cambio: Partial<SeleccionConjurosDote>) => value && onChange({ ...value, ...cambio })
  return <fieldset>
    <legend>Selección de conjuros por lista de clase</legend>
    <label><input type="checkbox" checked={value !== null} onChange={e => onChange(e.target.checked ? { ...inicial } : null)}/> Esta dote permite elegir conjuros de listas de clase</label>
    {value && <>
      <p>Seleccioná las listas permitidas. Los conjuros se consultan del catálogo por clase y nivel, sin vincularlos uno por uno.</p>
      {clasesDisponibles.length === 0 && <p>No hay clases cargadas. Podés escribir sus nombres separados por coma.</p>}
      <div className="nueva-propuesta-field"><label htmlFor="dote-listas">Listas permitidas (separadas por coma)</label><input id="dote-listas" value={value.listasPermitidas.join(', ')} onChange={e => actualizar({ listasPermitidas: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} placeholder="Clérigo, Druida, Mago" list="dote-listas-clases"/><datalist id="dote-listas-clases">{clasesDisponibles.map(clase => <option key={clase} value={clase}/>)}</datalist></div>
      <label><input type="checkbox" checked={value.listaSegunOrigen} onChange={e => actualizar({ listaSegunOrigen: e.target.checked })}/> La lista puede venir fijada por el origen de la dote (por ejemplo, trasfondo)</label>
      <label style={{display:'block'}}><input type="checkbox" checked={value.mismaLista} onChange={e => actualizar({ mismaLista: e.target.checked })}/> Todas las elecciones usan la misma lista</label>
      <h4>Elecciones de conjuros</h4>
      {value.selecciones.map((seleccion, indice) => <div key={indice} className="nueva-propuesta-fields-row">
        <div className="nueva-propuesta-field"><label>Nivel</label><input type="number" min={0} max={9} value={seleccion.nivel} onChange={e => actualizar({ selecciones: value.selecciones.map((s,i) => i === indice ? { ...s, nivel: Number(e.target.value) } : s) })}/></div>
        <div className="nueva-propuesta-field"><label>Cantidad</label><input type="number" min={1} value={seleccion.cantidad} onChange={e => actualizar({ selecciones: value.selecciones.map((s,i) => i === indice ? { ...s, cantidad: Number(e.target.value) } : s) })}/></div>
        <button type="button" onClick={() => actualizar({ selecciones: value.selecciones.filter((_,i) => i !== indice) })}>Quitar</button>
      </div>)}
      <button type="button" onClick={() => actualizar({ selecciones: [...value.selecciones, { nivel: 0, cantidad: 1 }] })}>Agregar elección</button>
      <div className="nueva-propuesta-field"><label htmlFor="dote-caracteristicas">Características mágicas permitidas (separadas por coma)</label><input id="dote-caracteristicas" value={value.caracteristicasMagicas.join(', ')} onChange={e => actualizar({ caracteristicasMagicas: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })}/></div>
      <label style={{display:'block'}}><input type="checkbox" checked={value.conjuroNivelUnoSiemprePreparado ?? false} onChange={e => actualizar({ conjuroNivelUnoSiemprePreparado: e.target.checked })}/> Conjuro de nivel 1 siempre preparado</label>
      <label style={{display:'block'}}><input type="checkbox" checked={value.permiteUsarEspacios ?? false} onChange={e => actualizar({ permiteUsarEspacios: e.target.checked })}/> Puede lanzarse usando espacios de conjuro</label>
      <label style={{display:'block'}}><input type="checkbox" checked={!!value.lanzamientoSinEspacio} onChange={e => actualizar({ lanzamientoSinEspacio: e.target.checked ? { usos: 1, recuperacion: 'descanso_largo' } : undefined })}/> Permite lanzamientos sin gastar espacios</label>
      {value.lanzamientoSinEspacio && <div className="nueva-propuesta-fields-row"><div className="nueva-propuesta-field"><label>Usos</label><input type="number" min={1} value={value.lanzamientoSinEspacio.usos} onChange={e => actualizar({ lanzamientoSinEspacio: { ...value.lanzamientoSinEspacio!, usos: Number(e.target.value) } })}/></div><div className="nueva-propuesta-field"><label>Recuperación</label><select value={value.lanzamientoSinEspacio.recuperacion} onChange={e => actualizar({ lanzamientoSinEspacio: { ...value.lanzamientoSinEspacio!, recuperacion: e.target.value as 'descanso_largo' | 'descanso_corto' } })}><option value="descanso_largo">Descanso largo</option><option value="descanso_corto">Descanso corto</option></select></div></div>}
      <label style={{display:'block'}}><input type="checkbox" checked={!!value.reemplazoAlSubirNivel} onChange={e => actualizar({ reemplazoAlSubirNivel: e.target.checked ? { cantidad: 1, mismoNivel: true, mismaLista: true } : undefined })}/> Permite reemplazar conjuros al subir de nivel</label>
      {value.reemplazoAlSubirNivel && <><div className="nueva-propuesta-field"><label>Cantidad reemplazable</label><input type="number" min={1} value={value.reemplazoAlSubirNivel.cantidad} onChange={e => actualizar({ reemplazoAlSubirNivel: { ...value.reemplazoAlSubirNivel!, cantidad: Number(e.target.value) } })}/></div><label><input type="checkbox" checked={value.reemplazoAlSubirNivel.mismoNivel} onChange={e => actualizar({ reemplazoAlSubirNivel: { ...value.reemplazoAlSubirNivel!, mismoNivel: e.target.checked } })}/> Mismo nivel</label><label><input type="checkbox" checked={value.reemplazoAlSubirNivel.mismaLista} onChange={e => actualizar({ reemplazoAlSubirNivel: { ...value.reemplazoAlSubirNivel!, mismaLista: e.target.checked } })}/> Misma lista</label></>}
      <label style={{display:'block'}}><input type="checkbox" checked={value.repetible ?? false} onChange={e => actualizar({ repetible: e.target.checked })}/> Dote repetible</label>
      {value.repetible && <label><input type="checkbox" checked={value.listaDistintaPorRepeticion ?? false} onChange={e => actualizar({ listaDistintaPorRepeticion: e.target.checked })}/> Exigir lista distinta en cada adquisición</label>}
    </>}
  </fieldset>
}
