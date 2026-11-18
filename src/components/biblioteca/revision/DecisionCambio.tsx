import { Check, X } from 'lucide-react'
import { camposModificados, type Cambio } from '../../../lib/diferencias'
import type { Decision } from '../../../hooks/useRevisionPropuesta'
import { useLanguage } from '../../../i18n/useLanguage'

type Props = {
 cambio: Cambio
 decision: Decision
 onDecidir: (aplicar: boolean) => void
 onCampo: (campo: string) => void
}

/** Aplicar o descartar un cambio y, si es un elemento modificado, elegir qué campos se aplican. */
export default function DecisionCambio({ cambio, decision, onDecidir, onCampo }: Props) {
 const { t } = useLanguage()
 const campos = camposModificados(cambio)
 const descartado = decision.decision === 'descartar'
 const aplicaCampo = (campo: string) => decision.decision === 'aceptar' || (decision.decision === 'parcial' && (decision.campos ?? []).includes(campo))
 return <section className="rev-decision" aria-label={t('review.decision')}>
  <div className="rev-decision__opciones" role="group" aria-label={t('review.decision')}>
   <button type="button" aria-pressed={!descartado} className="rev-decision__boton rev-decision__boton--aplicar" onClick={() => onDecidir(true)}>
    <Check size={16} aria-hidden="true"/>{decision.decision === 'parcial' ? `${t('review.apply')} · ${t('review.partial').toLowerCase()}` : t('review.apply')}
   </button>
   <button type="button" aria-pressed={descartado} className="rev-decision__boton rev-decision__boton--descartar" onClick={() => onDecidir(false)}>
    <X size={16} aria-hidden="true"/>{t('review.discard')}
   </button>
  </div>
  {campos.length > 1 && <fieldset className="rev-decision__campos">
   <legend>{t('review.fieldsToApply')}</legend>
   <div className="rev-decision__lista">
    {campos.map(campo => <label key={campo} className="rev-decision__campo">
     <input type="checkbox" checked={aplicaCampo(campo)} onChange={() => onCampo(campo)}/>
     <span>{campo}</span>
    </label>)}
   </div>
   <p className="rev__secundario">{t('review.fieldsToApplyHelp')}</p>
  </fieldset>}
  {descartado && <p className="rev-decision__aviso">{t('review.discardedHelp')}</p>}
 </section>
}
