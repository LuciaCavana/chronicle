import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import '../../styles/HistorialBorrador.css'

type Version = { id:number; numero_version:number; creado_en:string; autor_cambio_id:string|null; accion:string; titulo:string|null }
type Props = { propuestaId:string; puedeRestaurar:boolean; onClose:()=>void; onRestaurado:()=>void }

export default function HistorialBorrador({propuestaId,puedeRestaurar,onClose,onRestaurado}:Props) {
 const [versiones,setVersiones]=useState<Version[]>([])
 const [nombres,setNombres]=useState<Record<string,string>>({})
 const [versionActual,setVersionActual]=useState<number|null>(null)
 const [cargando,setCargando]=useState(true)
 const [restaurando,setRestaurando]=useState(false)
 const [error,setError]=useState('')
 const [mensaje,setMensaje]=useState('')
 useEffect(()=>{let vivo=true;(async()=>{
  try {
   const [{data:historial,error:e1},{data:propuesta,error:e2}]=await Promise.all([
    supabase.from('propuesta_versiones').select('id,numero_version,creado_en,autor_cambio_id,accion,titulo').eq('propuesta_id',propuestaId).order('numero_version',{ascending:false}),
    supabase.from('propuestas').select('row_version').eq('id',propuestaId).single()
   ])
   if(e1)throw e1;if(e2)throw e2
   if(!vivo)return
   setVersiones((historial??[]) as Version[]);setVersionActual(propuesta.row_version as number)
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
   setVersionActual(data as number);setMensaje('Versión restaurada. Actualizá el editor para ver los cambios.')
   const {data:historial,error:eh}=await supabase.from('propuesta_versiones').select('id,numero_version,creado_en,autor_cambio_id,accion,titulo').eq('propuesta_id',propuestaId).order('numero_version',{ascending:false})
   if(eh)throw eh
   setVersiones((historial??[]) as Version[]);onRestaurado()
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
   {puedeRestaurar&&<button type="button" disabled={restaurando} onClick={()=>restaurar(v.numero_version)}>Restaurar</button>}
  </li>)}</ul>
 </section>
}
