import { useState } from 'react'
import { useReportarBorrador } from '../../hooks/useRespaldoBorrador'
import type { Conjuro } from '../../types/conjuro'
import '../../styles/formularios/EspecieForm.css'
import '../../styles/formularios/ConjuroForm.css'
import { useLanguage } from '../../i18n/useLanguage'

type Props = {
  initialData?: Conjuro | null; conjuros: Conjuro[]; onSave: (conjuro: Conjuro) => void; onCancel: () => void
  /** Lo escrito antes de recargar, recuperado de la copia local. */
  borrador?: Conjuro | null
  onCambioBorrador?: (borrador: Conjuro | null) => void
}

export default function ConjuroForm({ initialData, conjuros, onSave, onCancel, borrador, onCambioBorrador }: Props) {
  const { t } = useLanguage()
  const fuente = borrador ?? initialData
  const [idNuevo] = useState(() => fuente?.id ?? crypto.randomUUID())
  const [nombre, setNombre] = useState(fuente?.nombre ?? '')
  const [tipo, setTipo] = useState<Conjuro['tipo']>(fuente?.tipo ?? 'truco')
  const [nivel, setNivel] = useState(fuente?.nivel || 1)
  const [escuela, setEscuela] = useState(fuente?.escuela ?? '')
  const [tiempoLanzamiento, setTiempoLanzamiento] = useState(fuente?.tiempoLanzamiento ?? '')
  const [alcance, setAlcance] = useState(fuente?.alcance ?? '')
  const [componentes, setComponentes] = useState((fuente?.componentes ?? '').split(',').map(c => c.trim()).filter(Boolean))
  const [componenteMaterial, setComponenteMaterial] = useState(fuente?.componenteMaterial ?? '')
  const [duracion, setDuracion] = useState(fuente?.duracion ?? '')
  const [concentracion, setConcentracion] = useState(fuente?.concentracion ?? false)
  const [ritual, setRitual] = useState(fuente?.ritual ?? false)
  const [clases, setClases] = useState((fuente?.clases ?? []).join(', '))
  const [descripcion, setDescripcion] = useState(fuente?.descripcion ?? '')
  const [libroOrigen, setLibroOrigen] = useState(fuente?.libroOrigen ?? '')
  const [paginaOrigen, setPaginaOrigen] = useState(fuente?.paginaOrigen?.toString() ?? '')
  const [error, setError] = useState('')
  useReportarBorrador<Conjuro>({ id: initialData?.id ?? idNuevo, nombre, tipo, nivel, escuela, tiempoLanzamiento, alcance, componentes: componentes.join(', '), componenteMaterial, duracion, concentracion, ritual, clases: clases.split(',').map(c => c.trim()).filter(Boolean), descripcion, libroOrigen, paginaOrigen: paginaOrigen ? Number(paginaOrigen) : undefined }, onCambioBorrador, Boolean(borrador))
  function guardar() {
    const limpio = nombre.trim()
    if (!limpio) { setError(t('spell.nameError')); return }
    if (conjuros.some(c => c.id !== initialData?.id && c.nombre.trim().toLocaleLowerCase('es') === limpio.toLocaleLowerCase('es'))) { setError(t('spell.duplicate')); return }
    if (paginaOrigen && (!Number.isInteger(Number(paginaOrigen)) || Number(paginaOrigen) < 1)) { setError(t('spell.pageError')); return }
    onSave({ id: initialData?.id ?? idNuevo, nombre: limpio, tipo, nivel: tipo === 'truco' ? 0 : nivel, escuela: escuela.trim(), tiempoLanzamiento: tiempoLanzamiento.trim(), alcance: alcance.trim(), componentes: componentes.join(', '), componenteMaterial: componentes.includes('M') ? componenteMaterial.trim() : '', duracion: duracion.trim(), concentracion, ritual, clases: clases.split(',').map(c => c.trim()).filter(Boolean), descripcion: descripcion.trim(), libroOrigen: libroOrigen.trim(), paginaOrigen: paginaOrigen ? Number(paginaOrigen) : undefined })
  }
  return <section className="nueva-propuesta-panel especie-form">
    <h3>{initialData ? t('spell.edit') : t('spell.add')}</h3>
    <div className="nueva-propuesta-field"><label>{t('spell.name')}</label><input value={nombre} onChange={e => setNombre(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label>{t('spell.type')}</label><select value={tipo} onChange={e => setTipo(e.target.value as Conjuro['tipo'])}><option value="truco">{t('spell.cantrip')}</option><option value="conjuro">{t('spell.spell')}</option></select></div>
    <div className="nueva-propuesta-field"><label>{t('spell.level')}</label><select value={tipo === 'truco' ? 0 : nivel} disabled={tipo === 'truco'} onChange={e => setNivel(Number(e.target.value))}>{tipo === 'truco' ? <option value={0}>{t('spell.level')} 0 — {t('spell.cantrip')}</option> : Array.from({length:9},(_,i)=>i+1).map(n=><option key={n} value={n}>{t('spell.level')} {n}</option>)}</select></div>
    <div className="nueva-propuesta-field"><label>{t('spell.school')}</label><input value={escuela} onChange={e => setEscuela(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label>{t('spell.cast')}</label><input value={tiempoLanzamiento} onChange={e => setTiempoLanzamiento(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label>{t('spell.range')}</label><input value={alcance} onChange={e => setAlcance(e.target.value)} /></div>
    <fieldset className="conjuro-form__grupo"><legend>{t('spell.components')}</legend><div className="conjuro-form__opciones">{(['V','S','M'] as const).map(c=><label key={c}><input type="checkbox" checked={componentes.includes(c)} onChange={() => setComponentes(actuales => actuales.includes(c) ? actuales.filter(x=>x!==c) : [...actuales,c])}/>{c === 'V' ? ` ${t('spell.verbal')}` : c === 'S' ? ` ${t('spell.somatic')}` : ` ${t('spell.material')}`}</label>)}</div></fieldset>
    {componentes.includes('M') && <div className="nueva-propuesta-field"><label>{t('spell.materialRequired')}</label><input value={componenteMaterial} onChange={e => setComponenteMaterial(e.target.value)}/></div>}
    <div className="nueva-propuesta-field"><label>{t('spell.duration')}</label><input value={duracion} onChange={e => setDuracion(e.target.value)} /></div>
    <fieldset className="conjuro-form__grupo"><legend>Lanzamiento</legend><div className="conjuro-form__opciones">
      <label><input type="checkbox" checked={concentracion} onChange={e => setConcentracion(e.target.checked)}/> Requiere concentración</label>
      <label><input type="checkbox" checked={ritual} onChange={e => setRitual(e.target.checked)}/> Ritual</label>
    </div></fieldset>
    <div className="nueva-propuesta-field"><label>{t('spell.classes')}</label><input value={clases} onChange={e => setClases(e.target.value)} /></div>
    <div className="nueva-propuesta-field"><label>{t('spell.source')}</label><input value={libroOrigen} onChange={e => setLibroOrigen(e.target.value)} placeholder="Ej.: GH:PG\u002724" /></div>
    <div className="nueva-propuesta-field"><label>{t('spell.page')}</label><input type="number" min="1" step="1" value={paginaOrigen} onChange={e => setPaginaOrigen(e.target.value)} placeholder="Ej.: 186" /></div>
    <div className="nueva-propuesta-field"><label>{t('spell.description')}</label><textarea rows={6} value={descripcion} onChange={e => setDescripcion(e.target.value)}/></div>
    {error && <p role="alert">{error}</p>}
    <div className="nueva-propuesta-actions"><button type="button" className="nueva-propuesta-cancel" onClick={onCancel}>{t('spell.cancel')}</button><button type="button" className="nueva-propuesta-next" onClick={guardar}>{t('spell.save')}</button></div>
  </section>
}
