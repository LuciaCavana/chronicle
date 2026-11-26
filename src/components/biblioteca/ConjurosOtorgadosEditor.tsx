import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Conjuro, OtorgamientoConjuros } from '../../types/conjuro'
import { nuevoOtorgamiento, resumenConjuros } from '../../lib/conjurosOtorgados'
import ConjurosOtorgadosCampos from './ConjurosOtorgadosCampos'
import CampoNumero from '../../components/shared/CampoNumero'
import '../../styles/formularios/ConjurosOtorgados.css'

type Props = {
  otorgamientos: OtorgamientoConjuros[]
  onChange: (otorgamientos: OtorgamientoConjuros[]) => void
  conjuros: Conjuro[]
  onCrearConjuro: (conjuro: Conjuro) => void
  clasesDisponibles: string[]
  /** Si se indica, el nivel requerido es ese (el del beneficio de linaje) y no se pregunta. */
  nivelFijo?: number
  titulo?: string
}

/** Conjuros que otorga un rasgo de especie o un beneficio de linaje: una tarjeta por otorgamiento. */
export default function ConjurosOtorgadosEditor({ otorgamientos, onChange, conjuros, onCrearConjuro, clasesDisponibles, nivelFijo, titulo = 'Conjuros y trucos otorgados' }: Props) {
  // Los ya cargados se ven cerrados (resumen); los nuevos, abiertos.
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set())
  const alternar = (id: string, abrir: boolean) => setAbiertos(a => { const n = new Set(a); if (abrir) n.add(id); else n.delete(id); return n })
  const actualizar = (id: string, cambio: Partial<OtorgamientoConjuros>) => onChange(otorgamientos.map(o => o.id === id ? { ...o, ...cambio } : o))
  const nombreDe = (id: string) => conjuros.find(c => c.id === id)?.nombre ?? ''
  const nivelDe = (id: string) => conjuros.find(c => c.id === id)?.nivel

  return <div className="co-editor">
    <h5>{titulo}</h5>
    {otorgamientos.map(o => {
      const abierto = abiertos.has(o.id)
      return <div className="co-tarjeta" key={o.id}>
        <div className="co-tarjeta-cabecera">
          <button type="button" className="co-tarjeta-resumen" onClick={() => alternar(o.id, !abierto)} aria-expanded={abierto}>
            {nivelFijo === undefined && <span className="co-nivel">Nivel {o.nivelRequerido}</span>}
            <span>{resumenConjuros(o, nombreDe, nivelDe)}</span>
          </button>
          <div className="co-tarjeta-botones">
            {!abierto && <button type="button" aria-label="Editar" onClick={() => alternar(o.id, true)}><Pencil size={15} /></button>}
            <button type="button" aria-label="Quitar" className="co-quitar" onClick={() => onChange(otorgamientos.filter(x => x.id !== o.id))}><Trash2 size={15} /></button>
          </div>
        </div>
        {abierto && <>
          {nivelFijo === undefined && <div className="co-fila"><label>Se obtiene a nivel de personaje
            <CampoNumero min={1} max={20} value={o.nivelRequerido} onChange={e => actualizar(o.id, { nivelRequerido: Number(e.target.value) })} /></label></div>}
          <ConjurosOtorgadosCampos idBase={o.id} valor={o} onChange={v => actualizar(o.id, v)} conjuros={conjuros} onCrearConjuro={onCrearConjuro}
            clasesDisponibles={clasesDisponibles} listaPropia aptitud cambio />
          <div className="co-tarjeta-pie"><button type="button" className="co-boton" onClick={() => alternar(o.id, false)}>Listo</button></div>
        </>}
      </div>
    })}
    <button type="button" className="co-enlace" onClick={() => { const nuevo = nuevoOtorgamiento(nivelFijo ?? 1); onChange([...otorgamientos, nuevo]); alternar(nuevo.id, true) }}>
      <Plus size={15} />Agregar conjuros otorgados</button>
  </div>
}
