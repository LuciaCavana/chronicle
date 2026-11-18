import { useLanguage } from '../../../i18n/useLanguage'
type Resumen = { aplicados: number; parciales: number; descartados: number }
type Props = { total:number; revisados:number; notas:number; ocupado:boolean; onAprobar:()=>void; onRechazar:()=>void
 /** Solo en correcciones, donde se puede aprobar en parte. */
 resumen?:Resumen }
export default function BarraAprobacion({total,revisados,notas,ocupado,onAprobar,onRechazar,resumen}:Props){
 const {t} = useLanguage()
 const enParte = !!resumen && (resumen.parciales > 0 || resumen.descartados > 0)
 const nadaParaAplicar = !!resumen && total > 0 && resumen.aplicados + resumen.parciales === 0
 return <footer className="rev-barra"><div className="rev-barra__estado"><p>{t('review.reviewed')} {revisados}/{total} · {notas} {t('review.notesCount')}</p>
 {enParte && resumen && <p className="rev-barra__resumen">{resumen.aplicados} {t('review.applied')} · {resumen.parciales} {t('review.partialCount')} · {resumen.descartados} {t('review.discardedCount')}</p>}
 <progress className="rev-barra__progreso" max={Math.max(1,total)} value={revisados} aria-label={t('review.reviewed')}/></div>
 {nadaParaAplicar && <p className="rev-barra__aviso" role="status">{t('review.allDiscarded')}</p>}
 <div className="rev__acciones"><button type="button" disabled={ocupado} onClick={onRechazar} className="rev__boton rev__boton--negativo">{t('review.reject')}</button><button type="button" disabled={ocupado||total===0||nadaParaAplicar} onClick={onAprobar} className="rev__boton rev__boton--positivo">{enParte?t('review.approveAccepted'):t('review.approve')}</button></div></footer>
}
