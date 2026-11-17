import { useLanguage } from '../../../i18n/useLanguage'
type Props={total:number;revisados:number;notas:number;ocupado:boolean;onAprobar:()=>void;onRechazar:()=>void}
export default function BarraAprobacion({total,revisados,notas,ocupado,onAprobar,onRechazar}:Props){
 const {t}=useLanguage()
 return <footer className="rev-barra"><div className="rev-barra__estado"><p>{t('review.reviewed')} {revisados}/{total} · {notas} {t('review.notesCount')}</p>
 <progress className="rev-barra__progreso" max={Math.max(1,total)} value={revisados} aria-label={t('review.reviewed')}/></div>
 <div className="rev__acciones"><button type="button" disabled={ocupado} onClick={onRechazar} className="rev__boton rev__boton--negativo">{t('review.reject')}</button><button type="button" disabled={ocupado||total===0} onClick={onAprobar} className="rev__boton rev__boton--positivo">{t('review.approve')}</button></div></footer>
}
