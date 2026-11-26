import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import SelectorConjuros from './SelectorConjuros'
import type { Conjuro, ConjuroOtorgado } from '../../types/conjuro'
import CampoNumero from '../../components/shared/CampoNumero'
import '../../styles/formularios/RasgosEspecie.css'

type Props = {
  vinculos: ConjuroOtorgado[]
  onChange: (vinculos: ConjuroOtorgado[]) => void
  conjuros: Conjuro[]
  onCrearConjuro: (conjuro: Conjuro) => void
  /** Si se indica, el nivel requerido es ese (el del beneficio de linaje) y no se pregunta. */
  nivelFijo?: number
  titulo?: string
}

/** Conjuros y trucos que otorga un rasgo de especie o un beneficio de linaje. */
export default function ConjurosOtorgadosEditor({ vinculos, onChange, conjuros, onCrearConjuro, nivelFijo, titulo = 'Conjuros y trucos otorgados' }: Props) {
  const [selectorAbierto, setSelectorAbierto] = useState(false)
  function vincular(conjuro: Conjuro) {
    if (vinculos.some(v => v.conjuroId === conjuro.id)) return
    onChange([...vinculos, { id: crypto.randomUUID(), conjuroId: conjuro.id, nivelRequerido: nivelFijo ?? 1, formaObtencion: 'aprendido', caracteristica: 'ninguna', reglasUso: '' }])
  }
  const actualizar = (id: string, cambios: Partial<ConjuroOtorgado>) => onChange(vinculos.map(v => v.id === id ? { ...v, ...cambios } : v))

  return <div className="rasgos-especie-conjuros">
    <h5>{titulo}</h5>
    {vinculos.map(vinculo => {
      const conjuro = conjuros.find(c => c.id === vinculo.conjuroId)
      return <div key={vinculo.id} className="rasgos-especie-conjuro">
        <div>
          <strong>{conjuro?.nombre ?? 'Conjuro no disponible en el catálogo'}</strong>
          {conjuro && <p>{conjuro.tipo === 'truco' ? 'Truco' : `Conjuro de nivel ${conjuro.nivel}`}</p>}
        </div>
        <div className="rasgos-especie-conjuro-config">
          {nivelFijo === undefined && <label>
            Nivel requerido
            <CampoNumero min={1} max={20} value={vinculo.nivelRequerido} onChange={e => actualizar(vinculo.id, { nivelRequerido: Number(e.target.value) })} />
          </label>}
          <label>
            Forma de obtención
            <select value={vinculo.formaObtencion} onChange={e => actualizar(vinculo.id, { formaObtencion: e.target.value as ConjuroOtorgado['formaObtencion'] })}>
              <option value="aprendido">Aprendido</option>
              <option value="preparado">Siempre preparado</option>
              <option value="lanzamiento_especial">Lanzamiento especial</option>
            </select>
          </label>
          <label>
            Característica mágica
            <select value={vinculo.caracteristica} onChange={e => actualizar(vinculo.id, { caracteristica: e.target.value as ConjuroOtorgado['caracteristica'] })}>
              <option value="ninguna">Ninguna</option>
              <option value="eleccion">A elección (Inteligencia, Sabiduría o Carisma)</option>
              <option value="inteligencia">Inteligencia</option>
              <option value="sabiduria">Sabiduría</option>
              <option value="carisma">Carisma</option>
              <option value="fuerza">Fuerza</option>
              <option value="destreza">Destreza</option>
              <option value="constitucion">Constitución</option>
            </select>
          </label>
          <label>
            Reglas de uso
            <textarea rows={2} value={vinculo.reglasUso} onChange={e => actualizar(vinculo.id, { reglasUso: e.target.value })} placeholder="Ej. Una vez sin gastar espacio; se recupera tras un descanso largo." />
          </label>
        </div>
        <button type="button" className="rasgos-especie-conjuro-eliminar" title="Desvincular conjuro" aria-label={`Desvincular ${conjuro?.nombre ?? 'conjuro'}`}
          onClick={() => onChange(vinculos.filter(v => v.id !== vinculo.id))}><Trash2 size={16} /></button>
      </div>
    })}
    <button type="button" className="rasgos-especie-add" onClick={() => setSelectorAbierto(true)}><Plus size={16} />Vincular conjuro</button>
    <SelectorConjuros abierto={selectorAbierto} conjuros={conjuros} idsVinculados={vinculos.map(v => v.conjuroId)} onVincular={vincular}
      onCrear={conjuro => { onCrearConjuro(conjuro); vincular(conjuro) }} onCerrar={() => setSelectorAbierto(false)} />
  </div>
}
