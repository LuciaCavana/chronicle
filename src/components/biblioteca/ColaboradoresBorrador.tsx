import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import '../../styles/biblioteca/ColaboradoresBorrador.css'
import { useLanguage } from '../../i18n/useLanguage'

type Colaborador = { usuario_id: string; email: string; rol: 'editor' | 'lector' }
type Props = { propuestaId: string; onClose: () => void }
export default function ColaboradoresBorrador({ propuestaId, onClose }: Props) {
  const { t } = useLanguage()
  const [lista, setLista] = useState<Colaborador[]>([])
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<'editor' | 'lector'>('editor')
  const [cargando, setCargando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  async function cargar() {
    setCargando(true)
    setError('')
    const {data,error:err} = await supabase.rpc('chronicle_listar_colaboradores',{p_propuesta_id:propuestaId})
    if(err) setError(err.message)
    else setLista((data??[]) as Colaborador[])
    setCargando(false)
  }
  useEffect(() => {
    let activo = true
    void supabase.rpc('chronicle_listar_colaboradores', { p_propuesta_id: propuestaId })
      .then(({ data, error: err }) => {
        if (!activo) return
        if (err) setError(err.message)
        else setLista((data ?? []) as Colaborador[])
        setCargando(false)
      })
    return () => { activo = false }
  }, [propuestaId])
  async function invitar(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(ocupado || !email.trim()) return
    setOcupado(true);setError('');setMensaje('')
    const {error:err}=await supabase.rpc('chronicle_invitar_colaborador',{p_propuesta_id:propuestaId,p_email:email.trim(),p_rol:rol})
    if(err) setError(err.message)
    else {setEmail('');setMensaje(t('draft.added'));await cargar()}
    setOcupado(false)
  }
  async function quitar(usuarioId:string) {
    if(ocupado || !window.confirm(t('draft.removeConfirm'))) return
    setOcupado(true);setError('');setMensaje('')
    const {error:err}=await supabase.rpc('chronicle_quitar_colaborador',{p_propuesta_id:propuestaId,p_usuario_id:usuarioId})
    if(err) setError(err.message)
    else {setMensaje(t('draft.removed'));await cargar()}
    setOcupado(false)
  }
  return <section className="colaboradores-panel" aria-label={t('draft.manage')}>
    <div className="colaboradores-header"><div><h4>{t('draft.shareTitle')}</h4><p>{t('draft.shareInfo')}</p></div><button type="button" onClick={onClose} className="colaboradores-cerrar">{t('draft.close')}</button></div>
    <form onSubmit={e=>void invitar(e)} className="colaboradores-form">
      <label>{t('draft.email')}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@ejemplo.com" /></label>
      <label>{t('draft.permission')}<select value={rol} onChange={e=>setRol(e.target.value as 'editor'|'lector')}><option value="editor">{t('draft.editor')}</option><option value="lector">{t('draft.reader')}</option></select></label>
      <button type="submit" disabled={ocupado}>{ocupado?t('draft.saving'):t('draft.invite')}</button>
    </form>
    <p className="colaboradores-nota">{t('draft.permissionInfo')}</p>
    {error&&<p className="colaboradores-error" role="alert">{error}</p>}
    {mensaje&&<p className="colaboradores-ok" role="status">{mensaje}</p>}
    <h5>{t('draft.collaborators')}</h5>
    {cargando?<p>{t('draft.loading')}</p>:lista.length===0?<p>{t('draft.none')}</p>:<div className="colaboradores-lista">{lista.map(item=><div className="colaboradores-persona" key={item.usuario_id}><span>{item.email}</span><strong>{item.rol==='editor'?t('draft.editor'):t('draft.reader')}</strong><button type="button" disabled={ocupado} onClick={()=>void quitar(item.usuario_id)}>{t('draft.remove')}</button></div>)}</div>}
  </section>
}
