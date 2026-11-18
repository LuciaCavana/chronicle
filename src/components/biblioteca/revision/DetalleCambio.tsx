import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Cambio } from '../../../lib/diferencias'
import { diferenciasCampos } from '../../../lib/diferencias'
import { useLanguage } from '../../../i18n/useLanguage'
import { nombreCambio, tipoCambio } from './ListaCambios'
import TablaDiferencias from './TablaDiferencias'
import DecisionCambio from './DecisionCambio'
import type { Decision } from '../../../hooks/useRevisionPropuesta'
type Props = { cambio:Cambio; modo:'lado'|'linea'; nota:string; onNota:(nota:string)=>void; onMarcar:()=>void; onAnterior:()=>void; onSiguiente:()=>void; indice:number; total:number
 /** Solo en correcciones: los libros nuevos y las traducciones se aprueban completos. */
 decision?:Decision; onDecidir?:(aplicar:boolean)=>void; onCampo?:(campo:string)=>void }
export default function DetalleCambio({cambio,modo,nota,onNota,onMarcar,onAnterior,onSiguiente,indice,total,decision,onDecidir,onCampo}:Props) {
 const {t}=useLanguage()
 const tipo=tipoCambio(cambio)
 const diferencias=cambio.accion==='modificar_campo'?1:diferenciasCampos(cambio.antes,cambio.despues).length
 return <section className="rev-detalle">
 <header className="rev-detalle__cabecera"><div><p className="rev__secundario">{cambio.categoria} · {indice+1}/{total}</p><h2>{nombreCambio(cambio)}</h2><span className={`rev__chip rev__chip--${tipo}`}>{tipo==='agregar'?'+':tipo==='retirar'?'−':tipo==='categorias'?'◐':'✎'} {t(`review.type.${tipo}` as 'review.type.agregar')}</span>
 {tipo==='modificar'&&<p className="rev__secundario">{diferencias} {t('review.fieldsChanged')}</p>}</div>
 <div className="rev__acciones"><button type="button" onClick={onAnterior} aria-label={t('review.previous')}><ChevronLeft size={16}/>{t('review.previous')}</button><button type="button" onClick={onSiguiente}>{t('review.next')}<ChevronRight size={16}/></button></div></header>
 {decision && onDecidir && onCampo && <DecisionCambio cambio={cambio} decision={decision} onDecidir={onDecidir} onCampo={onCampo}/>}
 {tipo==='categorias'?<p className="rev-detalle__aviso">{cambio.accion==='activar_categoria'?t('review.categoryEnabled'):t('review.categoryDisabled')}</p>:
 tipo==='agregar'?<div className="rev-detalle__ficha"><h3>{t('review.after')}</h3><TablaDiferencias antes={null} despues={cambio.despues} modo={modo}/></div>:
 tipo==='retirar'?<div className="rev-detalle__ficha"><h3>{t('review.before')}</h3><p>{t('review.removalWarning')}</p><TablaDiferencias antes={cambio.antes} despues={null} modo={modo}/></div>:
 <TablaDiferencias antes={cambio.antes} despues={cambio.despues} campo={cambio.accion==='modificar_campo'?cambio.elemento_id??undefined:undefined} modo={modo}/>}
 <div className="rev-detalle__nota"><label htmlFor="nota-revision">{t('review.note')}</label><textarea id="nota-revision" value={nota} onChange={e=>onNota(e.target.value)} rows={3} maxLength={1500}/><button type="button" className="rev__boton rev__boton--positivo" onClick={onMarcar}>{t('review.markNext')}</button></div>
 </section>
}
