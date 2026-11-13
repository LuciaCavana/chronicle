import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import '../../styles/HistorialBorrador.css'

type Documento = { titulo:string|null; idioma:string|null; descripcion:string|null; categorias:string[]|null; contenido:Record<string,unknown>|null; metadatos_libro:Record<string,unknown>|null }
type Version = Documento & { id:number; numero_version:number; creado_en:string; autor_cambio_id:string|null; accion:string }
const iguales = (a:unknown,b:unknown) => JSON.stringify(a??null)===JSON.stringify(b??null)
function diferencias(actual:Documento,anterior:Documento):string[] {
 const cambios:string[]=[]
 for(const [campo,nombre] of [['titulo','Título'],['idioma','Idioma'],['descripcion','Descripción'],['categorias','Categorías']] as const)
  if(!iguales(actual[campo],anterior[campo])) cambios.push(nombre)
 for(const key of new Set([...Object.keys(actual.metadatos_libro??{}),...Object.keys(anterior.metadatos_libro??{})]))
  if(!iguales(actual.metadatos_libro?.[key],anterior.metadatos_libro?.[key])) cambios.push('Datos del libro: '+key)
 for(const key of new Set([...Object.keys(actual.contenido??{}),...Object.keys(anterior.contenido??{})])) {
  const nuevo=actual.contenido?.[key],viejo=anterior.contenido?.[key]
  if(iguales(nuevo,viejo))continue
  if(Array.isArray(nuevo)&&Array.isArray(viejo)) {
   const etiqueta=key.charAt(0).toUpperCase()+key.slice(1)
   const id=(x:unknown,i:number)=>x&&typeof x==='object'&&'id' in x?String((x as {id:unknown}).id):String(i)
   const nombre=(x:unknown,i:number)=>x&&typeof x==='object'?String((x as {nombre?:string;titulo?:string}).nombre??(x as {titulo?:string}).titulo??('#'+(i+1))):'#'+(i+1)
   const anteriores=new Map(viejo.map((x,i)=>[id(x,i),x]))
   const actuales=new Map(nuevo.map((x,i)=>[id(x,i),x]))
   nuevo.forEach((x,i)=>{const k=id(x,i);if(!anteriores.has(k))cambios.push(etiqueta+': agregado '+nombre(x,i));else if(!iguales(x,anteriores.get(k)))cambios.push(etiqueta+': modificado '+nombre(x,i))})
   viejo.forEach((x,i)=>{if(!actuales.has(id(x,i)))cambios.push(etiqueta+': eliminado '+nombre(x,i))})
  } else cambios.push('Contenido: '+key)
 }
 return cambios
}
type Props = { propuestaId:string; puedeRestaurar:boolean; onClose:()=>void; onRestaurado:()=>void }

export default function HistorialBorrador({propuestaId,puedeRestaurar,onClose,onRestaurado}:Props) {
 const [versiones,setVersiones]=useState<Version[]>([])
 const [nombres,setNombres]=useState<Record<string,string>>({})
 const [versionActual,setVersionActual]=useState<number|null>(null)
 const [documentoActual,setDocumentoActual]=useState<Documento|null>(null)
 const [comparando,setComparando]=useState<number|null>(null)
 const [cargando,setCargando]=useState(true)
 const [restaurando,setRestaurando]=useState(false)
 const [error,setError]=useState('')
 const [mensaje,setMensaje]=useState('')
 useEffect(()=>{let vivo=true;(async()=>{
  try {
   const [{data:historial,error:e1},{data:propuesta,error:e2}]=await Promise.all([
    supabase.from('propuesta_versiones').select('id,numero_version,creado_en,autor_cambio_id,accion,titulo,idioma,descripcion,categorias,contenido,metadatos_libro').eq('propuesta_id',propuestaId).order('numero_version',{ascending:false}),
    supabase.from('propuestas').select('row_version,titulo,idioma,descripcion,categorias,contenido,metadatos_libro').eq('id',propuestaId).single()
   ])
   if(e1)throw e1;if(e2)throw e2
   if(!vivo)return
   setVersiones((historial??[]) as Version[]);setVersionActual(propuesta.row_version as number);setDocumentoActual(propuesta as Documento)
   const ids=[...new Set((historial??[]).map(v=>v.autor_cambio_id).filter(Boolean))] as string[]
   if(ids.length){const {data:usuarios}=await supabase.rpc('chronicle_autores_historial',{p_propuesta_id:propuestaId})
    if(vivo)setNombres(Object.fromEntries((usuarios??[]).map(u=>[u.usuario_id,u.nombre || 'Usuario'])))}
  } catch(e){if(vivo)setError(e instanceof Error?e.message:'No se pudo cargar el historial.')}
  finally{if(vivo)setCargando(false)}
 })();return()=>{vivo=false}},[propuestaId])
 async function restaurar(numero:number){
  if(!puedeRestaurar||versionActual===null||restaurando)return
  if(!window.confirm(`¿Restaurar la versión ${numero}? La versión actual se conservará en el historial. Se reemplazará el contenido del borrador.`))return
  setRestaurando(true);setError('');setMensaje('')
  try{
   const {data,error:e}=await supabase.rpc('chronicle_restaurar_version',{p_propuesta_id:propuestaId,p_version:numero,p_version_actual:versionActual})
   if(e)throw e
   setVersionActual(data as number);setComparando(null);setMensaje('Versión restaurada. Actualizá el editor para ver los cambios.')
   const {data:historial,error:eh}=await supabase.from('propuesta_versiones').select('id,numero_version,creado_en,autor_cambio_id,accion,titulo,idioma,descripcion,categorias,contenido,metadatos_libro').eq('propuesta_id',propuestaId).order('numero_version',{ascending:false})
   if(eh)throw eh
   setVersiones((historial??[]) as Version[])
   const {data:actualizado}=await supabase.from('propuestas').select('titulo,idioma,descripcion,categorias,contenido,metadatos_libro').eq('id',propuestaId).single()
   if(actualizado)setDocumentoActual(actualizado as Documento)
   onRestaurado()
  }catch(e){setError(e instanceof Error?e.message:'No se pudo restaurar.')}finally{setRestaurando(false)}
 }
 return <section className="historial-panel" aria-label="Historial de versiones">
  <div className="historial-encabezado"><h3>Historial de versiones</h3><button type="button" onClick={onClose}>Cerrar</button></div>
  <p>Versión actual: {versionActual??'—'}. Cada guardado con cambios conserva el contenido anterior.</p>
  {cargando&&<p>Cargando historial...</p>}
  {error&&<p role="alert" className="historial-error">{error}</p>}
  {mensaje&&<p role="status">{mensaje}</p>}
  {!cargando&&versiones.length===0&&<p>Todavía no hay versiones anteriores. Se crearán al guardar cambios.</p>}
  <ul>{versiones.map(v=><li key={v.id}>
   <div><strong>Versión {v.numero_version}</strong><span>{new Date(v.creado_en).toLocaleString('es-AR')}</span><span>{v.autor_cambio_id ? nombres[v.autor_cambio_id] || `Usuario ${v.autor_cambio_id.slice(0,8)}` : 'Autor no identificado'}</span><span>{v.accion==='restauracion'?'Guardado previo a restauración':'Guardado'}</span><small>{v.titulo||'Sin título'}</small></div>
   <div className="historial-acciones"><button type="button" onClick={()=>setComparando(a=>a===v.numero_version?null:v.numero_version)}>{comparando===v.numero_version?'Ocultar diferencias':'Comparar'}</button>{puedeRestaurar&&<button type="button" disabled={restaurando} onClick={()=>restaurar(v.numero_version)}>Restaurar</button>}</div>
   {comparando===v.numero_version&&documentoActual&&<div className="historial-diferencias"><strong>Diferencias con la versión actual</strong>{diferencias(documentoActual,v).length===0?<p>No se detectaron diferencias.</p>:<ul>{diferencias(documentoActual,v).map((c,i)=><li key={i}>{c}</li>)}</ul>}<small>Comparación de campos y elementos, no palabra por palabra.</small></div>}
  </li>)}</ul>
 </section>
}
