import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AppLayout from '../components/layout/AppLayout'
import {
  enviarLibroMotor, guardarLibroMotor, listarLibrosMotor, resolverLibroMotor, soyAdminMotor,
  type LibroMotor, type Elemento, type Capitulo, type LibroEntrada,
} from '../services/chronicleLibros'
import '../styles/MotorLibros.css'
import ClaseForm from '../components/biblioteca/ClaseForm'

const tipos: Elemento['tipo'][] = ['clase','subclase','especie','trasfondo','dote','objeto','conjuro','regla','transformacion','otro']
const nuevo: LibroEntrada = { titulo:'', idioma:'es', metadatos:{}, contenido:{capitulos:[],elementos:[]} }
const uid = () => crypto.randomUUID()

export default function MotorLibros() {
  const [lista, setLista] = useState<LibroMotor[]>([])
  const [usuario, setUsuario] = useState<string | null>(null)
  const [admin, setAdmin] = useState(false)
  const [id, setId] = useState<string | null>(null)
  const [revision, setRevision] = useState<number | null>(null)
  const [form, setForm] = useState<LibroEntrada>(nuevo)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [seleccionado, setSeleccionado] = useState<LibroMotor | null>(null)

  async function refrescar() {
    const [libros, esAdmin, sesion] = await Promise.all([
      listarLibrosMotor(), soyAdminMotor(), supabase.auth.getUser(),
    ])
    if (sesion.error) throw sesion.error
    setLista(libros); setAdmin(esAdmin); setUsuario(sesion.data.user?.id ?? null)
  }
  useEffect(() => { void refrescar().catch(e => setError(String(e))) }, [])
  async function ejecutar(fn: () => Promise<void>) {
    setOcupado(true); setError(''); setMensaje('')
    try { await fn(); await refrescar(); setMensaje('Operación completada.') }
    catch (e) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setOcupado(false) }
  }
  function abrir(libro: LibroMotor) {
    setSeleccionado(libro)
    setId(libro.id); setRevision(libro.revision)
    setForm({titulo:libro.titulo,idioma:libro.idioma,metadatos:libro.metadatos,contenido:libro.contenido})
  }
  function cambiarCapitulo(i: number, value: Capitulo) {
    setForm(f=>({...f,contenido:{...f.contenido,capitulos:f.contenido.capitulos.map((c,j)=>j===i?value:c)}}))
  }
  function cambiarElemento(i: number, value: Elemento) {
    setForm(f=>({...f,contenido:{...f.contenido,elementos:f.contenido.elementos.map((c,j)=>j===i?value:c)}}))
  }
  const editable = !seleccionado || (seleccionado.autor_id===usuario && ['borrador','rechazado'].includes(seleccionado.estado))
  return <AppLayout title="Motor de libros" subtitle="Borradores, capítulos, contenido y aprobación administrativa">
    <main className="motor-libros">
      {error && <p role="alert" style={{color:'#ff8f8f'}}>{error}</p>}
      {mensaje && <p role="status">{mensaje}</p>}
      <section><h2>Biblioteca y propuestas</h2>
        <button type="button" onClick={()=>{setSeleccionado(null);setId(null);setRevision(null);setForm(nuevo)}}>Nuevo libro manual</button>
        <ul>{lista.map(l=><li key={l.id}>
          <button type="button" onClick={()=>abrir(l)}>{l.titulo} · {l.estado} · rev. {l.revision}</button>
        </li>)}</ul>
      </section>
      <section style={{display:'grid',gap:12}}><h2>{id?'Editar / revisar libro':'Crear libro'}</h2>
        {seleccionado && <p>Estado: {seleccionado.estado}. {editable?'Editable':'Solo lectura.'}</p>}
        <label>Título <input disabled={!editable||ocupado} value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))}/></label>
        <label>Idioma <input disabled={!editable||ocupado} value={form.idioma} onChange={e=>setForm(f=>({...f,idioma:e.target.value}))}/></label>
        <h3>Capítulos</h3>
        {form.contenido.capitulos.map((c,i)=><fieldset key={c.id} disabled={!editable||ocupado}>
          <label>Nombre <input value={c.titulo} onChange={e=>cambiarCapitulo(i,{...c,titulo:e.target.value})}/></label>
          <label>Texto <textarea rows={5} value={c.texto} onChange={e=>cambiarCapitulo(i,{...c,texto:e.target.value})}/></label>
          <button type="button" onClick={()=>setForm(f=>({...f,contenido:{...f.contenido,capitulos:f.contenido.capitulos.filter(x=>x.id!==c.id)}}))}>Quitar capítulo</button>
        </fieldset>)}
        {editable && <button type="button" disabled={ocupado} onClick={()=>setForm(f=>({...f,contenido:{...f.contenido,capitulos:[...f.contenido.capitulos,{id:uid(),titulo:'',texto:''}]}}))}>Agregar capítulo</button>}
        <h3>Elementos estructurados</h3>
        {form.contenido.elementos.map((e,i)=><fieldset key={e.id} disabled={!editable||ocupado}>
          <label>Tipo <select value={e.tipo} onChange={ev=>cambiarElemento(i,{...e,tipo:ev.target.value as Elemento['tipo']})}>{tipos.map(t=><option key={t}>{t}</option>)}</select></label>
          <label>Nombre <input value={e.nombre} onChange={ev=>cambiarElemento(i,{...e,nombre:ev.target.value})}/></label>
          <label>Descripción <textarea value={e.descripcion} onChange={ev=>cambiarElemento(i,{...e,descripcion:ev.target.value})}/></label>
          {e.tipo === 'clase' && (
            <ClaseForm
              elemento={e}
              onChange={valor => cambiarElemento(i, valor)}
              disabled={!editable || ocupado}
            />
          )}
          <button type="button" onClick={()=>setForm(f=>({...f,contenido:{...f.contenido,elementos:f.contenido.elementos.filter(x=>x.id!==e.id)}}))}>Quitar elemento</button>
        </fieldset>)}
        {editable && <button type="button" disabled={ocupado} onClick={()=>setForm(f=>({...f,contenido:{...f.contenido,elementos:[...f.contenido.elementos,{id:uid(),tipo:'otro',nombre:'',descripcion:'',datos:{}}]}}))}>Agregar elemento</button>}
        {editable && <button type="button" disabled={ocupado} onClick={()=>void ejecutar(async()=>{const r=await guardarLibroMotor(form,id,revision);setId(r.id);setRevision(r.revision);const actualizados=await listarLibrosMotor();setSeleccionado(actualizados.find(x=>x.id===r.id) ?? null)})}>Guardar borrador</button>}
        {id && revision!==null && seleccionado && seleccionado.autor_id===usuario && ['borrador','rechazado'].includes(seleccionado.estado) &&
          <button type="button" disabled={ocupado} onClick={()=>void ejecutar(async()=>{await enviarLibroMotor(id,revision);setSeleccionado(null)})}>Enviar a aprobación</button>}
        {admin && seleccionado?.estado==='pendiente' && <div>
          <label>Observaciones <textarea value={comentario} onChange={e=>setComentario(e.target.value)}/></label>
          <button type="button" disabled={ocupado} onClick={()=>void ejecutar(async()=>{await resolverLibroMotor(seleccionado.id,seleccionado.revision,true,comentario);setSeleccionado(null)})}>Aprobar</button>
          <button type="button" disabled={ocupado||!comentario.trim()} onClick={()=>void ejecutar(async()=>{await resolverLibroMotor(seleccionado.id,seleccionado.revision,false,comentario);setSeleccionado(null)})}>Rechazar</button>
        </div>}
      </section>
    </main>
  </AppLayout>
}
