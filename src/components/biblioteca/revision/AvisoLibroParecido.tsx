import { useState } from 'react'
import { AlertTriangle, Link2 } from 'lucide-react'
import type { LibroParecido } from '../../../services/revision'
import { useLanguage } from '../../../i18n/useLanguage'

type Props = {
 parecidos: LibroParecido[]
 idioma: string
 ocupado: boolean
 onComparar: (versionId: string) => void
 onDistinto: () => void
}

/**
 * Un libro nuevo que se parece a uno publicado (mismo título, mismo código o elegido por el
 * autor como libro original): el administrador decide si lo compara como corrección.
 */
export default function AvisoLibroParecido({ parecidos, idioma, ocupado, onComparar, onDistinto }: Props) {
 const { t } = useLanguage()
 const comparables = parecidos.filter(p => p.idioma === idioma)
 const [elegido, setElegido] = useState(comparables[0]?.version_id ?? '')
 const motivo = (p: LibroParecido) => [
  p.vinculado && t('review.match.chosenByAuthor'),
  p.mismo_titulo && t('review.match.sameTitle'),
  p.mismo_codigo && t('review.match.sameCode'),
  p.idioma !== idioma && t('review.match.otherLanguage'),
 ].filter(Boolean).join(' · ')
 const datos = (p: LibroParecido) => [p.codigo, p.edicion, p.editorial, p.idioma.toUpperCase(), `rev. ${p.revision}`].filter(Boolean).join(' · ')
 const vinculado = parecidos.find(p => p.vinculado)

 return <section className="rev-parecido" aria-labelledby="rev-parecido-titulo">
  <AlertTriangle className="rev-parecido__icono" size={24} aria-hidden="true"/>
  <div className="rev-parecido__texto">
   <h2 id="rev-parecido-titulo">{t('review.match.title')}</h2>
   {vinculado && <p>“<em>{vinculado.titulo}</em>” · {t('review.match.linked')}</p>}
   <p className="rev__secundario">{t('review.match.help')}</p>
   <fieldset className="rev-parecido__opciones">
    <legend>{t('review.match.choose')}</legend>
    {parecidos.map(p => <label key={p.version_id} className="rev-parecido__opcion" data-deshabilitado={p.idioma !== idioma || undefined}>
     <input type="radio" name="rev-parecido" value={p.version_id} checked={elegido === p.version_id}
      disabled={p.idioma !== idioma || ocupado} onChange={() => setElegido(p.version_id)}/>
     <span><strong>{p.titulo}</strong><small>{datos(p)}</small><small className="rev-parecido__motivo">{motivo(p)}</small></span>
    </label>)}
   </fieldset>
  </div>
  <div className="rev-parecido__acciones">
   <button type="button" className="rev__boton rev__boton--primario" disabled={!elegido || ocupado} onClick={() => onComparar(elegido)}>
    <Link2 size={16} aria-hidden="true"/>{ocupado ? t('review.converting') : t('review.match.compare')}
   </button>
   <button type="button" className="rev__boton" disabled={ocupado} onClick={onDistinto}>{t('review.match.different')}</button>
  </div>
 </section>
}
