import { Check, Minus, Pencil, Plus, Layers } from 'lucide-react'
import { diferenciasCampos, type Cambio } from '../../../lib/diferencias'
import { useLanguage } from '../../../i18n/useLanguage'
type Item = { cambio: Cambio; indice: number }
type Props = { grupos: {categoria:string;items:Item[]}[]; seleccion:number; revisados:Set<number>; onSelect:(indice:number)=>void }
export function nombreCambio(cambio: Cambio): string {
 if (cambio.categoria === 'datos_generales') return cambio.elemento_id || cambio.categoria
 const contenido = cambio.despues ?? cambio.antes
 if (contenido && typeof contenido === 'object' && !Array.isArray(contenido)) {
  const registro = contenido as Record<string,unknown>
  return String(registro.nombre ?? registro.titulo ?? cambio.elemento_id ?? cambio.categoria)
 }
 return cambio.accion.endsWith('_categoria') ? cambio.categoria : cambio.elemento_id ?? cambio.categoria
}
export function tipoCambio(cambio: Cambio) {
 if (cambio.accion === 'agregar') return 'agregar'
 if (cambio.accion === 'retirar') return 'retirar'
 if (cambio.accion.includes('categoria')) return 'categorias'
 return 'modificar'
}
export default function ListaCambios({grupos,seleccion,revisados,onSelect}:Props) {
 const {t} = useLanguage()
 return <div className="rev-lista">{grupos.map(grupo=><section key={grupo.categoria}>
 <h3>{grupo.categoria.replaceAll('_',' ')} <small>{grupo.items.length}</small></h3>
 {grupo.items.map(({cambio,indice})=><button type="button" key={indice}
 className={`rev-lista__item rev-lista__item--${tipoCambio(cambio)} ${seleccion===indice?'rev-lista__item--activo':''}`}
 aria-current={seleccion===indice?'true':undefined} onClick={()=>onSelect(indice)}>
 <span aria-hidden="true">{tipoCambio(cambio)==='agregar'?<Plus size={16}/>:tipoCambio(cambio)==='retirar'?<Minus size={16}/>:tipoCambio(cambio)==='categorias'?<Layers size={16}/>:<Pencil size={16}/>}</span>
 <span className="rev-lista__nombre">{nombreCambio(cambio)}</span>
 {tipoCambio(cambio)==='modificar' && <small>{cambio.accion==='modificar_campo'?1:diferenciasCampos(cambio.antes,cambio.despues).length} {t('review.fields')}</small>}
 {revisados.has(indice)&&<Check size={17} className="rev-lista__revisado" aria-label={t('review.reviewed')}/>}
 </button>)}
 </section>)}</div>
}
