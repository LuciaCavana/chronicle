import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import '../../styles/ColaboradoresBorrador.css'

type Colaborador = { usuario_id: string; email: string; rol: 'editor' | 'lector' }
type Props = { propuestaId: string; onClose: () => void }
export default function ColaboradoresBorrador({ propuestaId, onClose }: Props) {
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
  useEffect(()=>{void cargar()},[propuestaId])
  async function invitar(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(ocupado || !email.trim()) return
    setOcupado(true);setError('');setMensaje('')
    const {error:err}=await supabase.rpc('chronicle_invitar_colaborador',{p_propuesta_id:propuestaId,p_email:email.trim(),p_rol:rol})
    if(err) setError(err.message)
    else {setEmail('');setMensaje('Colaborador agregado o permiso actualizado.');await cargar()}
    setOcupado(false)
  }
  async function quitar(usuarioId:string) {
    if(ocupado || !window.confirm('¿Quitar el acceso de este colaborador?')) return
    setOcupado(true);setError('');setMensaje('')
    const {error:err}=await supabase.rpc('chronicle_quitar_colaborador',{p_propuesta_id:propuestaId,p_usuario_id:usuarioId})
    if(err) setError(err.message)
    else {setMensaje('Colaborador eliminado.');await cargar()}
    setOcupado(false)
  }
  return <section className="colaboradores-panel" aria-label="Administrar colaboradores">
    <div className="colaboradores-header"><div><h4>Compartir borrador</h4><p>Invitá a usuarios registrados en Chronicle. Solo el propietario administra los permisos.</p></div><button type="button" onClick={onClose} className="colaboradores-cerrar">Cerrar</button></div>
    <form onSubmit={e=>void invitar(e)} className="colaboradores-form">
      <label>Correo del usuario<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="usuario@ejemplo.com" /></label>
      <label>Permiso<select value={rol} onChange={e=>setRol(e.target.value as 'editor'|'lector')}><option value="editor">Editor</option><option value="lector">Lector</option></select></label>
      <button type="submit" disabled={ocupado}>{ocupado?'Guardando...':'Invitar / actualizar'}</button>
    </form>
    <p className="colaboradores-nota">Editor: podrá modificar el borrador cuando se habilite el acceso colaborativo. Lector: solo podrá consultarlo. Ninguno obtiene permisos de aprobación.</p>
    {error&&<p className="colaboradores-error" role="alert">{error}</p>}
    {mensaje&&<p className="colaboradores-ok" role="status">{mensaje}</p>}
    <h5>Colaboradores actuales</h5>
    {cargando?<p>Cargando...</p>:lista.length===0?<p>Aún no hay colaboradores.</p>:<div className="colaboradores-lista">{lista.map(item=><div className="colaboradores-persona" key={item.usuario_id}><span>{item.email}</span><strong>{item.rol==='editor'?'Editor':'Lector'}</strong><button type="button" disabled={ocupado} onClick={()=>void quitar(item.usuario_id)}>Quitar</button></div>)}</div>}
  </section>
}
