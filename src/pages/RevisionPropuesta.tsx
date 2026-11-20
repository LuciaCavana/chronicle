import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, ChevronLeft, ChevronRight, Link2, Undo2, User } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import ListaCambios, { nombreCambio, tipoCambio } from '../components/biblioteca/revision/ListaCambios'
import DetalleCambio from '../components/biblioteca/revision/DetalleCambio'
import BarraAprobacion from '../components/biblioteca/revision/BarraAprobacion'
import AvisoLibroParecido from '../components/biblioteca/revision/AvisoLibroParecido'
import { esModificacion, useRevisionPropuesta, type FiltroRevision } from '../hooks/useRevisionPropuesta'
import { aprobarRevision, rechazarRevision, cargarActividadAutor, tratarComoCorreccion, tratarComoLibroNuevo, type ActividadAutor } from '../services/revision'
import { useLanguage } from '../i18n/useLanguage'
import '../styles/biblioteca/RevisionCambios.css'

export default function RevisionPropuesta() {
 const { propuestaId } = useParams<{ propuestaId: string }>()
 const id = propuestaId ?? ''
 const navigate = useNavigate()
 const { t } = useLanguage()
 const revision = useRevisionPropuesta(id)
 const [modo, setModo] = useState<'lado' | 'linea'>('lado')
 const [confirmacion, setConfirmacion] = useState<'aprobar' | 'rechazar' | null>(null)
 const [motivo, setMotivo] = useState('')
 const [comentario, setComentario] = useState('')
 const [ocupado, setOcupado] = useState(false)
 const [errorAccion, setErrorAccion] = useState('')
 const [convirtiendo, setConvirtiendo] = useState(false)
 const [libroDistinto, setLibroDistinto] = useState(false)
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

 const { propuesta, envio, cambios, base, parecidos } = revision
 const total = cambios.length
 const revisados = revision.revisados.size
 const notasMotivo = cambios.map((c, i) => ({ nombre: c.elemento_id ?? c.categoria, nota: revision.notas[i]?.trim() })).filter(x => x.nota).map(x => `• ${x.nombre}: ${x.nota}`).join('\n')
 const contar = (filtro: (c: typeof cambios[number]) => boolean) => cambios.filter(filtro).length
 const agregados = contar(c => c.accion === 'agregar')
 const modificados = contar(c => esModificacion(c) && c.categoria !== 'datos_generales')
 const retirados = contar(c => c.accion === 'retirar')
 const datosGenerales = contar(c => c.categoria === 'datos_generales')
 const categorias = contar(c => c.accion.includes('categoria'))
 const filtros: { id: FiltroRevision; label: string; cantidad: number }[] = [
  { id: 'todos', label: t('review.all'), cantidad: total },
  { id: 'agregar', label: t('review.type.agregar'), cantidad: agregados },
  { id: 'modificar', label: t('review.type.modificar'), cantidad: contar(esModificacion) },
  { id: 'retirar', label: t('review.type.retirar'), cantidad: retirados },
  { id: 'categorias', label: t('review.type.categorias'), cantidad: categorias },
 ]
 const esCorreccion = propuesta?.tipo === 'modificacion' || (propuesta?.tipo === 'libro_nuevo' && !!propuesta.revision_resultante_id)
 // En correcciones se elige qué cambios se aplican; libros nuevos y traducciones van completos.
 const permiteParcial = esCorreccion
 const enParte = permiteParcial && revision.decisionesParaEnviar.length > 0
 const mostrarParecidos = propuesta?.tipo === 'libro_nuevo' && !propuesta.revision_resultante_id && parecidos.length > 0 && !libroDistinto
 const decisionProps = permiteParcial ? {
  decision: revision.decisionDe(revision.seleccion),
  onDecidir: (aplicar: boolean) => revision.decidir(revision.seleccion, aplicar),
  onCampo: (campo: string) => revision.alternarCampo(revision.seleccion, campo),
 } : {}

 async function ejecutar(accion: 'aprobar' | 'rechazar') {
  setOcupado(true); setErrorAccion('')
  try {
   if (accion === 'aprobar') await aprobarRevision(id, permiteParcial ? revision.decisionesParaEnviar : [], comentario)
   else await rechazarRevision(id, motivo.trim())
   navigate('/administracion/revision')
  } catch (e) { setErrorAccion(e instanceof Error ? e.message : t('review.error')) }
  finally { setOcupado(false) }
 }
 async function convertir(accion: () => Promise<void>) {
  setConvirtiendo(true); setErrorAccion('')
  try { await accion(); revision.recargar() }
  catch (e) { setErrorAccion(e instanceof Error ? e.message : t('review.error')) }
  finally { setConvirtiendo(false) }
 }

 return <AppLayout title={t('review.pageTitle')}><main className="rev">
  <nav className="rev__migas" aria-label="Ubicación">
   <Link to="/administracion/revision"><ArrowLeft size={16} aria-hidden="true"/>{t('review.back')}</Link>
   {propuesta && <><span aria-hidden="true">/</span><span>{propuesta.titulo}</span></>}
  </nav>
  {revision.cargando ? <div className="rev__cargando" role="status">{t('review.loading')}<div/><div/><div/></div> :
  revision.error ? <div role="alert" className="rev__error">{revision.error}</div> :
  propuesta && envio ? <>
   <header className="rev__encabezado">
    <div className="rev__titulo">
     <div className="rev__chips">
      <span className="rev__chip">{t('review.pending')}</span>
      <span className="rev__chip rev__chip--neutro">
       {esCorreccion && <Link2 size={14} aria-hidden="true"/>}
       {propuesta.convertida_a_correccion ? t('review.converted') : esCorreccion ? t('review.correction') : t('review.newBook')}
      </span>
     </div>
     <h1>{propuesta.titulo}</h1>
     <p className="rev__secundario rev__autor">{t('review.sentBy')} <strong>{actividadAutor?.nombre ?? 'Cargando autor…'}</strong> · {new Date(envio.enviado_en).toLocaleString()} · {propuesta.idioma.toUpperCase()}</p>
    </div>
    <div className="rev__acciones">
     <button type="button" className="rev__boton" aria-expanded={mostrarActividad} onClick={() => setMostrarActividad(v => !v)}><User size={16} aria-hidden="true"/>Ver perfil del autor</button>
     <Link className="rev__boton" to={`/biblioteca/libros/leer-borrador/${id}?origen=revision`}><BookOpen size={16} aria-hidden="true"/>{t('review.openDraft')}</Link>
     {propuesta.convertida_a_correccion && <button type="button" className="rev__boton" disabled={convirtiendo} onClick={() => void convertir(() => tratarComoLibroNuevo(id))}>
      <Undo2 size={16} aria-hidden="true"/>{convirtiendo ? t('review.converting') : t('review.undoConvert')}</button>}
    </div>
   </header>
   {mostrarActividad && <section className="rev__historial" aria-label="Perfil y actividad del autor">
    {errorActividad ? <p role="alert">{errorActividad}</p> : !actividadAutor ? <p>Cargando actividad…</p> : <>
     <h2>{actividadAutor.nombre}</h2>
     {actividadAutor.username && <p>@{actividadAutor.username}</p>}
     <p>Publicaciones: {actividadAutor.publicaciones} · Propuestas aprobadas: {actividadAutor.aprobadas} · Rechazadas: {actividadAutor.rechazadas} · Pendientes: {actividadAutor.pendientes}</p>
     <h3>Publicaciones anteriores</h3>
     {actividadAutor.publicacionesRecientes.length ? <ul>{actividadAutor.publicacionesRecientes.map(libro => <li key={libro.id}><Link to={`/biblioteca/libros/leer/${libro.id}`}>{libro.titulo}</Link></li>)}</ul> : <p>Sin publicaciones disponibles.</p>}
     <p className="rev__secundario">Historial basado en registros de propuestas y publicaciones, no en valoraciones personales.</p>
    </>}
   </section>}

   {mostrarParecidos && <AvisoLibroParecido key={parecidos.map(p => p.version_id).join()} parecidos={parecidos} idioma={propuesta.idioma} ocupado={convirtiendo}
    onComparar={versionId => void convertir(() => tratarComoCorreccion(id, versionId))} onDistinto={() => setLibroDistinto(true)}/>}
   {libroDistinto && parecidos.length > 0 && <p className="rev__secundario rev__distinto">{t('review.match.dismissed')} <button type="button" className="rev__link" onClick={() => setLibroDistinto(false)}>{t('review.match.showAgain')}</button></p>}
   {errorAccion && <p role="alert" className="rev__error">{errorAccion}</p>}

   <div className="rev__comparacion">
    <div className="rev__versiones">
     <span className="rev__etiqueta">{t('review.comparing')}</span>
     {base ? <>
      <span className="rev__version">{t('review.publishedVersion')} · {base.titulo} · rev. {base.revision}</span>
      <ArrowRight size={16} className="rev__flecha" aria-hidden="true"/>
      <span className="rev__version rev__version--nueva">{t('review.proposalSent')}</span>
     </> : <span className="rev__version">{t('review.noBase')}</span>}
    </div>
    <div className="rev__modos" role="group" aria-label={t('review.comparing')}>
     <button type="button" aria-pressed={modo === 'lado'} onClick={() => setModo('lado')}>{t('review.sideBySide')}</button>
     <button type="button" aria-pressed={modo === 'linea'} onClick={() => setModo('linea')}>{t('review.inline')}</button>
    </div>
   </div>

   <ul className="rev__resumen" aria-label="Resumen de cambios">
    <li className="rev__dato rev__dato--agregar"><strong>{agregados}</strong>{t('review.stat.added')}</li>
    {esCorreccion && <li className="rev__dato rev__dato--modificar"><strong>{modificados}</strong>{t('review.stat.modified')}</li>}
    {esCorreccion && <li className="rev__dato rev__dato--retirar"><strong>{retirados}</strong>{t('review.stat.removed')}</li>}
    {datosGenerales > 0 && <li className="rev__dato"><strong>{datosGenerales}</strong>{t('review.stat.general')}</li>}
    {categorias > 0 && <li className="rev__dato"><strong>{categorias}</strong>{t('review.stat.categories')}</li>}
   </ul>

   <div className="rev__columnas">
    <aside className="rev__panel rev__lista">
     <label className="rev__buscador"><span className="rev__oculto">{t('review.search')}</span>
      <input type="search" placeholder={`${t('review.search')}…`} value={revision.busqueda} onChange={e => revision.setBusqueda(e.target.value)}/></label>
     <div className="rev__filtros">
      {filtros.filter(f => f.id === 'todos' || f.cantidad > 0).map(f => <button type="button" key={f.id} aria-pressed={revision.filtro === f.id} onClick={() => revision.setFiltro(f.id)}>{f.label} · {f.cantidad}</button>)}
     </div>
     <label className="rev__check"><input type="checkbox" checked={revision.ocultarRevisados} onChange={e => revision.setOcultarRevisados(e.target.checked)}/>{t('review.hideReviewed')}</label>
     <ListaCambios grupos={revision.grupos} seleccion={revision.seleccion} revisados={revision.revisados} onSelect={revision.setSeleccion} decisiones={permiteParcial ? revision.decisiones : undefined}/>
    </aside>
    {/* En el celular la lista larga se reemplaza por un selector con anterior y siguiente. */}
    <div className="rev__movil">
     <label htmlFor="rev-selector">{t('review.changeSelect')}</label>
     <select id="rev-selector" value={revision.seleccion} onChange={e => revision.setSeleccion(Number(e.target.value))}>
      {revision.filtrados.map(({ cambio, indice }) => <option key={indice} value={indice}>
       {indice + 1}/{total} · {nombreCambio(cambio)} ({t(`review.type.${tipoCambio(cambio)}` as 'review.type.agregar').toLowerCase()}){revision.decisiones[indice]?.decision === 'descartar' ? ` · ${t('review.discarded').toLowerCase()}` : revision.decisiones[indice]?.decision === 'parcial' ? ` · ${t('review.partial').toLowerCase()}` : ''}
      </option>)}
     </select>
     <div className="rev__movil-nav">
      <button type="button" onClick={() => revision.navegar(-1)}><ChevronLeft size={16} aria-hidden="true"/>{t('review.previous')}</button>
      <button type="button" onClick={() => revision.navegar(1)}>{t('review.next')}<ChevronRight size={16} aria-hidden="true"/></button>
     </div>
    </div>
    <div className="rev__panel rev__detalle">{revision.actual ? <DetalleCambio cambio={revision.actual} modo={modo} nota={revision.notas[revision.seleccion] ?? ''}
     onNota={nota => revision.setNotas(n => ({ ...n, [revision.seleccion]: nota }))} onMarcar={revision.marcar}
     onAnterior={() => revision.navegar(-1)} onSiguiente={() => revision.navegar(1)} indice={revision.seleccion} total={total} {...decisionProps}/>
     : <p className="rev__vacio">{t('review.noChanges')}</p>}</div>
   </div>
   {!permiteParcial && <p className="rev__secundario rev__nota-completa">{t('review.wholeOnly')}</p>}
   <BarraAprobacion total={total} revisados={revisados} notas={revision.totalNotas} ocupado={ocupado || convirtiendo} resumen={permiteParcial ? revision.resumenDecisiones : undefined}
    onAprobar={() => { setComentario(notasMotivo); setConfirmacion('aprobar') }} onRechazar={() => { setMotivo(notasMotivo); setConfirmacion('rechazar') }}/>
   {confirmacion && <div className="rev__overlay" role="presentation"><section className="rev__dialogo" role="dialog" aria-modal="true" aria-labelledby="rev-dialogo-titulo">
    <h2 id="rev-dialogo-titulo">{confirmacion === 'aprobar' ? (enParte ? t('review.approveAccepted') : t('review.approve')) : t('review.reject')}</h2>
    {confirmacion === 'aprobar' ? <>
     {enParte && <p>{t('review.partialConfirm')}</p>}
     {enParte && <p className="rev__secundario">{revision.resumenDecisiones.aplicados} {t('review.applied')} · {revision.resumenDecisiones.parciales} {t('review.partialCount')} · {revision.resumenDecisiones.descartados} {t('review.discardedCount')}</p>}
     <p>{total - revisados > 0 ? `${t('review.unreviewedWarning')} ${total - revisados}` : t('review.approveConfirm')}</p>
     <label htmlFor="rev-comentario">{t('review.commentForAuthor')}</label><textarea id="rev-comentario" rows={5} maxLength={4000} value={comentario} onChange={e => setComentario(e.target.value)}/>
    </> : <><label htmlFor="rev-motivo">{t('review.reason')}</label><textarea id="rev-motivo" rows={6} maxLength={2000} value={motivo} onChange={e => setMotivo(e.target.value)}/></>}
    <div className="rev__acciones"><button type="button" className="rev__boton" disabled={ocupado} onClick={() => setConfirmacion(null)}>{t('review.continue')}</button>
     <button type="button" className={`rev__boton ${confirmacion === 'aprobar' ? 'rev__boton--primario' : 'rev__boton--negativo'}`} disabled={ocupado || (confirmacion === 'rechazar' && !motivo.trim())} onClick={() => void ejecutar(confirmacion)}>{confirmacion === 'aprobar' ? t('review.approveAnyway') : t('review.confirmReject')}</button></div>
    {errorAccion && <p role="alert">{errorAccion}</p>}</section></div>}
  </> : null}
 </main></AppLayout>
}
