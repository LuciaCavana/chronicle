import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import ListaCambios from '../components/biblioteca/revision/ListaCambios'
import DetalleCambio from '../components/biblioteca/revision/DetalleCambio'
import BarraAprobacion from '../components/biblioteca/revision/BarraAprobacion'
import { useRevisionPropuesta, type FiltroRevision } from '../hooks/useRevisionPropuesta'
import { aprobarRevision, rechazarRevision, cargarActividadAutor, type ActividadAutor } from '../services/revision'
import { useLanguage } from '../i18n/useLanguage'
import '../styles/biblioteca/RevisionCambios.css'

export default function RevisionPropuesta() {
 const { propuestaId } = useParams<{propuestaId:string}>()
 const id = propuestaId ?? ''
 const navigate = useNavigate()
 const {t} = useLanguage()
 const revision = useRevisionPropuesta(id)
 const [modo,setModo] = useState<'lado'|'linea'>('lado')
 const [confirmacion,setConfirmacion] = useState<'aprobar'|'rechazar'|null>(null)
 const [motivo,setMotivo] = useState('')
 const [ocupado,setOcupado] = useState(false)
 const [errorAccion,setErrorAccion] = useState('')
 const [actividadAutor, setActividadAutor] = useState<ActividadAutor | null>(null)
 const [mostrarActividad, setMostrarActividad] = useState(false)
 const [errorActividad, setErrorActividad] = useState('')
 useEffect(() => {
  const autorId = revision.envio?.enviado_por ?? revision.propuesta?.autor_id
  if (!autorId) return
  let activo = true
  void cargarActividadAutor(autorId).then(actividad => {
   if (activo) setActividadAutor(actividad)
  }).catch(error => {
   if (activo) setErrorActividad(error instanceof Error ? error.message : 'No se pudo cargar el perfil')
  })
  return () => { activo = false }
 }, [revision.envio?.enviado_por, revision.propuesta?.autor_id])
 const total=revision.cambios.length
 const revisados=revision.revisados.size
 const notasMotivo=revision.cambios.map((c,i)=>({nombre:c.elemento_id??c.categoria,nota:revision.notas[i]?.trim()})).filter(x=>x.nota).map(x=>`• ${x.nombre}: ${x.nota}`).join('\n')
 const filtros: {id:FiltroRevision;label:string;cantidad:number}[]=[
  {id:'todos',label:t('review.all'),cantidad:total},
  {id:'agregar',label:t('review.type.agregar'),cantidad:revision.cambios.filter(c=>c.accion==='agregar').length},
  {id:'modificar',label:t('review.type.modificar'),cantidad:revision.cambios.filter(c=>c.accion==='modificar'||c.accion==='modificar_campo').length},
  {id:'retirar',label:t('review.type.retirar'),cantidad:revision.cambios.filter(c=>c.accion==='retirar').length},
  {id:'categorias',label:t('review.type.categorias'),cantidad:revision.cambios.filter(c=>c.accion.includes('categoria')).length}
 ]
 async function ejecutar(accion:'aprobar'|'rechazar'){
  setOcupado(true);setErrorAccion('')
  try {
   if(accion==='aprobar') await aprobarRevision(id)
   else await rechazarRevision(id,motivo.trim())
   navigate('/biblioteca/libros?tab=administracion')
  } catch(e){setErrorAccion(e instanceof Error?e.message:t('review.error'))}
  finally{setOcupado(false)}
 }
 return <AppLayout title={t('review.pageTitle')}><main className="rev">
  <nav className="rev__migas"><Link to="/biblioteca/libros?tab=administracion"><ArrowLeft size={16}/>{t('review.back')}</Link></nav>
  {revision.cargando?<div className="rev__cargando" role="status">{t('review.loading')}<div/><div/><div/></div>:
  revision.error?<div role="alert" className="rev__error">{revision.error}</div>:
  revision.propuesta&&revision.envio?<><header className="rev__encabezado">
   <div><div className="rev__chips"><span className="rev__chip">{t('review.pending')}</span><span className="rev__chip">{revision.propuesta.revision_resultante_id||revision.propuesta.tipo==='modificacion'?t('review.publishedChange'):t('review.newBook')}</span></div>
   <h1>{revision.propuesta.titulo}</h1><p className="rev__secundario rev__autor">{t('review.sentBy')} <strong>{actividadAutor?.nombre ?? 'Cargando autor…'}</strong> <button type="button" aria-expanded={mostrarActividad} onClick={() => setMostrarActividad(v=>!v)}>Ver perfil y actividad</button> · {new Date(revision.envio.enviado_en).toLocaleString()} · {revision.propuesta.idioma.toUpperCase()}</p>
   {mostrarActividad && <section className="rev__historial" aria-label="Perfil y actividad del autor">
     {errorActividad ? <p role="alert">{errorActividad}</p> : !actividadAutor ? <p>Cargando actividad…</p> : <>
       <h2>{actividadAutor.nombre}</h2>
       {actividadAutor.username && <p>@{actividadAutor.username}</p>}
       <p>Publicaciones: {actividadAutor.publicaciones} · Propuestas aprobadas: {actividadAutor.aprobadas} · Rechazadas: {actividadAutor.rechazadas} · Pendientes: {actividadAutor.pendientes}</p>
       <h3>Publicaciones anteriores</h3>
       {actividadAutor.publicacionesRecientes.length ? <ul>{actividadAutor.publicacionesRecientes.map(libro=><li key={libro.id}><Link to={`/biblioteca/libros/leer/${libro.id}`}>{libro.titulo}</Link></li>)}</ul> : <p>Sin publicaciones disponibles.</p>}
       <p className="rev__secundario">Historial basado en registros de propuestas y publicaciones, no en valoraciones personales.</p>
     </>}
   </section>}
   </div>
   <Link className="rev__boton" to={`/biblioteca/libros/leer-borrador/${id}?origen=revision`}><BookOpen size={17}/>{t('review.openDraft')}</Link></header>
   <div className="rev__comparacion"><span>{t('review.comparing')}</span><strong>{t('review.published')}</strong><span aria-hidden="true">→</span><strong>{t('review.submitted')}</strong><div className="rev__modos"><button type="button" aria-pressed={modo==='lado'} onClick={()=>setModo('lado')}>{t('review.sideBySide')}</button><button type="button" aria-pressed={modo==='linea'} onClick={()=>setModo('linea')}>{t('review.inline')}</button></div></div>
   <div className="rev__filtros">{filtros.map(f=><button type="button" key={f.id} aria-pressed={revision.filtro===f.id} onClick={()=>revision.setFiltro(f.id)}>{f.label} · {f.cantidad}</button>)}<label><input type="checkbox" checked={revision.ocultarRevisados} onChange={e=>revision.setOcultarRevisados(e.target.checked)}/>{t('review.hideReviewed')}</label></div>
   <div className="rev__columnas"><aside className="rev__panel"><label className="rev__buscador">{t('review.search')}<input type="search" value={revision.busqueda} onChange={e=>revision.setBusqueda(e.target.value)}/></label><ListaCambios grupos={revision.grupos} seleccion={revision.seleccion} revisados={revision.revisados} onSelect={revision.setSeleccion}/></aside>
   <div className="rev__panel">{revision.actual?<DetalleCambio cambio={revision.actual} modo={modo} nota={revision.notas[revision.seleccion]??''} onNota={nota=>revision.setNotas(n=>({...n,[revision.seleccion]:nota}))} onMarcar={revision.marcar} onAnterior={()=>revision.navegar(-1)} onSiguiente={()=>revision.navegar(1)} indice={revision.seleccion} total={total}/>:<p className="rev__vacio">{t('review.noChanges')}</p>}</div></div>
   {errorAccion&&<p role="alert" className="rev__error">{errorAccion}</p>}
   <BarraAprobacion total={total} revisados={revisados} notas={revision.totalNotas} ocupado={ocupado} onAprobar={()=>setConfirmacion('aprobar')} onRechazar={()=>{setMotivo(notasMotivo);setConfirmacion('rechazar')}}/>
   {confirmacion&&<div className="rev__overlay" role="presentation"><section className="rev__dialogo" role="dialog" aria-modal="true" aria-labelledby="rev-dialogo-titulo"><h2 id="rev-dialogo-titulo">{confirmacion==='aprobar'?t('review.approve'):t('review.reject')}</h2>
    {confirmacion==='aprobar'?<p>{total-revisados>0?`${t('review.unreviewedWarning')} ${total-revisados}`:t('review.approveConfirm')}</p>:<><label htmlFor="rev-motivo">{t('review.reason')}</label><textarea id="rev-motivo" rows={6} maxLength={2000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></>}
    <div className="rev__acciones"><button type="button" disabled={ocupado} onClick={()=>setConfirmacion(null)}>{t('review.continue')}</button><button type="button" disabled={ocupado||(confirmacion==='rechazar'&&!motivo.trim())} onClick={()=>void ejecutar(confirmacion)}>{confirmacion==='aprobar'?t('review.approveAnyway'):t('review.confirmReject')}</button></div>
    {errorAccion&&<p role="alert">{errorAccion}</p>}</section></div>}
  </>:null}
 </main></AppLayout>
}
