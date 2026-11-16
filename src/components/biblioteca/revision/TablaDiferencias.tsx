import { useState } from 'react'
import { diferenciasCampos, type DiferenciaCampo } from '../../../lib/diferencias'
import TextoDiff from './TextoDiff'
import { useLanguage } from '../../../i18n/useLanguage'
type Props = { antes: unknown; despues: unknown; modo: 'lado' | 'linea'; campo?: string }
function valor(valor: unknown): string {
 if (valor == null) return '—'
 if (typeof valor === 'string') return valor.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&') || '—'
 if (typeof valor === 'object') return Array.isArray(valor) ? valor.map(v => typeof v === 'object' && v !== null && 'nombre' in v ? String(v.nombre) : String(v)).join(', ') : JSON.stringify(valor)
 return String(valor)
}
function Fila({diferencia,modo}: {diferencia:DiferenciaCampo;modo:'lado'|'linea'}) {
 const {t} = useLanguage()
 const largo = typeof diferencia.antes === 'string' && typeof diferencia.despues === 'string' && (diferencia.antes.length > 75 || diferencia.despues.length > 75)
 return <tr><th scope="row">{diferencia.ruta}{diferencia.tipo === 'reordenado' && <span className="rev-diff__tipo"> ⇅ {t('review.reordered')}</span>}</th>
 {modo === 'linea' && largo ? <td colSpan={2}><TextoDiff antes={String(diferencia.antes)} despues={String(diferencia.despues)}/></td> : <>
 <td>{valor(diferencia.antes)}</td><td>{valor(diferencia.despues)}</td>
 </>}</tr>
}
export default function TablaDiferencias({antes,despues,modo,campo}:Props) {
 const {t} = useLanguage()
 const [mostrarIguales,setMostrarIguales] = useState(false)
 const diferencias = campo ? [{ruta:campo,antes,despues,tipo:'valor' as const}] : antes == null && despues && typeof despues === 'object' && !Array.isArray(despues)
  ? Object.entries(despues).map(([ruta,valor])=>({ruta,antes:undefined,despues:valor,tipo:'agregado' as const}))
  : despues == null && antes && typeof antes === 'object' && !Array.isArray(antes)
  ? Object.entries(antes).map(([ruta,valor])=>({ruta,antes:valor,despues:undefined,tipo:'retirado' as const}))
  : diferenciasCampos(antes,despues)
 const sinCambios = typeof antes === 'object' && antes !== null && !Array.isArray(antes) ? Object.keys(antes).filter(k => despues && typeof despues === 'object' && !Array.isArray(despues) && JSON.stringify((antes as Record<string,unknown>)[k]) === JSON.stringify((despues as Record<string,unknown>)[k])) : []
 return <div className="rev-diff__scroll"><table className="rev-diff__tabla"><thead><tr><th>{t('review.field')}</th><th>{t('review.before')}</th><th>{t('review.after')}</th></tr></thead><tbody>
 {diferencias.map((d,i)=><Fila key={i} diferencia={d} modo={modo}/>)}
 {mostrarIguales && sinCambios.map(k=><tr key={k} className="rev-diff__igual"><th>{k}</th><td>{valor((antes as Record<string,unknown>)[k])}</td><td>=</td></tr>)}
 </tbody></table>
 {sinCambios.length > 0 && <button type="button" className="rev__link" onClick={()=>setMostrarIguales(!mostrarIguales)}>{mostrarIguales?t('review.hideUnchanged'):t('review.showUnchanged')} ({sinCambios.length})</button>}
 </div>
}
