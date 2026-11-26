import { useState } from 'react'
import { Trash2, X } from 'lucide-react'
import type { CategoriaCompetencia, EfectoEspecie, MovimientoEspecie, TipoEfectoEspecie } from '../../types/especie'
import { CATEGORIAS_COMPETENCIA, MOVIMIENTOS, TIPOS_DANO, TIPOS_EFECTO, catalogoCompetencia, nuevoEfecto, resumenEfecto } from '../../lib/efectosEspecie'
import { claveNombre } from '../../lib/listas'
import CampoNumero from '../../components/shared/CampoNumero'
import '../../styles/formularios/EfectosEspecie.css'

type Props = {
  efectos: EfectoEspecie[]
  onChange: (efectos: EfectoEspecie[]) => void
}

/** Casillas con las opciones conocidas y un campo para agregar otras (herramientas, idiomas…). */
function Opciones({ catalogo, elegidas, onChange, placeholder }: { catalogo: string[]; elegidas: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [otra, setOtra] = useState('')
  const tiene = (o: string) => elegidas.some(e => claveNombre(e) === claveNombre(o))
  const extras = elegidas.filter(e => !catalogo.some(c => claveNombre(c) === claveNombre(e)))
  const agregar = () => { const v = otra.trim(); if (v && !tiene(v)) onChange([...elegidas, v]); setOtra('') }
  return <div className="efectos-opciones">
    {catalogo.length > 0 && <div className="efectos-casillas">{catalogo.map(o => <label key={o} className="efectos-casilla">
      <input type="checkbox" checked={tiene(o)} onChange={() => onChange(tiene(o) ? elegidas.filter(e => claveNombre(e) !== claveNombre(o)) : [...elegidas, o])} /><span>{o}</span>
    </label>)}</div>}
    {extras.length > 0 && <div className="efectos-chips">{extras.map(e => <span key={e} className="efectos-chip">{e}
      <button type="button" aria-label={`Quitar ${e}`} onClick={() => onChange(elegidas.filter(x => x !== e))}><X size={12} /></button></span>)}</div>}
    <div className="efectos-otra">
      <input value={otra} onChange={e => setOtra(e.target.value)} placeholder={placeholder} aria-label={placeholder}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); agregar() } }} />
      <button type="button" onClick={agregar} disabled={!otra.trim()}>Agregar</button>
    </div>
  </div>
}

/** Efectos de un rasgo de especie o de un beneficio de linaje (visión, velocidad, competencias…). */
export default function EfectosEspecieEditor({ efectos, onChange }: Props) {
  const cambiar = (id: string, cambio: Record<string, unknown>) => onChange(efectos.map(e => e.id === id ? { ...e, ...cambio } as EfectoEspecie : e))
  const quitar = (id: string) => onChange(efectos.filter(e => e.id !== id))

  return <div className="efectos-especie">
    <h5>Lo que otorga</h5>
    {efectos.length === 0 && <p className="efectos-vacio">Sin efectos: solo el texto. Agregá lo que el creador de personajes tiene que aplicar.</p>}
    {efectos.map(e => <div className="efectos-item" key={e.id}>
      <div className="efectos-item-cabecera">
        <span>{TIPOS_EFECTO.find(([t]) => t === e.tipo)?.[1]}</span>
        <button type="button" aria-label="Quitar efecto" onClick={() => quitar(e.id)}><Trash2 size={15} /></button>
      </div>
      <div className="efectos-campos">
        {e.tipo === 'vision_oscuridad' && <>
          <label>Cómo<select value={e.modo} onChange={ev => cambiar(e.id, { modo: ev.target.value })}><option value="establecer">Tiene un alcance de</option><option value="sumar">Aumenta en</option></select></label>
          <label>Pies<CampoNumero min={5} step={5} value={e.pies} onChange={ev => cambiar(e.id, { pies: Number(ev.target.value) })} /></label>
        </>}
        {e.tipo === 'velocidad' && <>
          <label>Movimiento<select value={e.movimiento} onChange={ev => cambiar(e.id, { movimiento: ev.target.value as MovimientoEspecie, ...(ev.target.value === 'caminar' && e.modo === 'igual_caminar' ? { modo: 'sumar' } : {}) })}>{MOVIMIENTOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          <label>Cómo<select value={e.modo} onChange={ev => cambiar(e.id, { modo: ev.target.value })}>
            <option value="sumar">Aumenta en</option><option value="establecer">Es de</option>
            {e.movimiento !== 'caminar' && <option value="igual_caminar">Igual a la de caminar</option>}
          </select></label>
          {e.modo !== 'igual_caminar' && <label>Pies<CampoNumero min={5} step={5} value={e.pies} onChange={ev => cambiar(e.id, { pies: Number(ev.target.value) })} /></label>}
        </>}
        {e.tipo === 'competencia' && <>
          <label>De qué<select value={e.categoria} onChange={ev => cambiar(e.id, { categoria: ev.target.value as CategoriaCompetencia, opciones: [] })}>{CATEGORIAS_COMPETENCIA.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></label>
          <label>Cómo<select value={e.modo} onChange={ev => cambiar(e.id, { modo: ev.target.value })}><option value="fija">Da competencia en</option><option value="eleccion">Se elige entre</option></select></label>
          {e.modo === 'eleccion' && <label>Cuántas<CampoNumero min={1} value={e.cantidad} onChange={ev => cambiar(e.id, { cantidad: Number(ev.target.value) })} /></label>}
          <div className="efectos-ancho">
            {e.modo === 'eleccion' && <small>Si no marcás ninguna, se elige entre todas.</small>}
            <Opciones catalogo={catalogoCompetencia(e.categoria)} elegidas={e.opciones} onChange={opciones => cambiar(e.id, { opciones })}
              placeholder={e.categoria === 'idiomas' ? 'Ej.: Élfico' : e.categoria === 'herramientas' ? 'Ej.: Herramientas de herrero' : 'Otra…'} />
          </div>
        </>}
        {e.tipo === 'resistencia' && <>
          <label>Tipo<select value={e.grado} onChange={ev => cambiar(e.id, { grado: ev.target.value })}><option value="resistencia">Resistencia</option><option value="inmunidad">Inmunidad</option></select></label>
          <label className="efectos-check"><input type="checkbox" checked={Boolean(e.aEleccion)} onChange={ev => cambiar(e.id, { aEleccion: ev.target.checked })} /><span>Se elige uno de los marcados</span></label>
          <div className="efectos-ancho"><Opciones catalogo={TIPOS_DANO} elegidas={e.danos} onChange={danos => cambiar(e.id, { danos })} placeholder="Otro tipo de daño…" /></div>
        </>}
        {e.tipo === 'ventaja' && <label className="efectos-ancho">Contra<input value={e.contra} onChange={ev => cambiar(e.id, { contra: ev.target.value })} placeholder="Ej.: el estado hechizado" /></label>}
        {e.tipo === 'puntos_golpe' && <>
          <label>Al obtenerlo<CampoNumero min={0} value={e.alObtener} onChange={ev => cambiar(e.id, { alObtener: Number(ev.target.value) })} /></label>
          <label>Por cada nivel<CampoNumero min={0} value={e.porNivel} onChange={ev => cambiar(e.id, { porNivel: Number(ev.target.value) })} /></label>
        </>}
        {e.tipo === 'dote' && <>
          <label>Categoría<select value={e.categoria} onChange={ev => cambiar(e.id, { categoria: ev.target.value })}>
            <option value="origen">Dote de origen</option><option value="general">Dote general</option><option value="epica">Dote épica</option><option value="estilo_combate">Dote de estilo de combate</option>
          </select></label>
          <label>Cuántas<CampoNumero min={1} value={e.cantidad} onChange={ev => cambiar(e.id, { cantidad: Number(ev.target.value) })} /></label>
        </>}
      </div>
      <p className="efectos-resumen">{resumenEfecto(e)}</p>
    </div>)}
    <select className="efectos-agregar" value="" aria-label="Agregar efecto" onChange={ev => { if (ev.target.value) onChange([...efectos, nuevoEfecto(ev.target.value as TipoEfectoEspecie)]) }}>
      <option value="">+ Agregar efecto…</option>
      {TIPOS_EFECTO.map(([t, nombre]) => <option key={t} value={t}>{nombre}</option>)}
    </select>
  </div>
}
