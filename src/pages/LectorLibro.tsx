import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, ChevronRight, Feather, ScrollText, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import '../styles/LectorLibro.css'

type Registro = Record<string, unknown>
type Version = {
  id: string
  idioma: string
  titulo: string
  descripcion: string
  categorias: unknown
  especies: unknown
  conjuros: unknown
  clases: unknown
  subclases: unknown
}
type LibroPublicado = {
  id: string
  codigo: string | null
  edicion: string | null
  editorial: string | null
  clasificacion: string | null
  estado: string
  libro_versiones: Version[]
}
type Seccion = { id: string; titulo: string; elementos: Registro[] }
const esObjeto = (valor: unknown): valor is Registro => typeof valor === 'object' && valor !== null && !Array.isArray(valor)
const lista = (valor: unknown): Registro[] => Array.isArray(valor) ? valor.filter(esObjeto) : []
const texto = (valor: unknown): string => typeof valor === 'string' ? valor : typeof valor === 'number' ? String(valor) : ''
const tituloElemento = (valor: Registro, indice: number) => texto(valor.nombre) || texto(valor.titulo) || `Entrada ${indice + 1}`
function TextoSeguro({ valor }: { valor: unknown }) {
  const contenido = texto(valor)
  if (!contenido) return null
  // El contenido enriquecido se presenta como texto hasta disponer de un renderizador HTML seguro.
  const limpio = contenido.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  return <p className="lector-libro__texto">{limpio}</p>
}
const valoresTexto = (valor: unknown): string[] => Array.isArray(valor) ? valor.map(texto).filter(Boolean) : []
const valorObjeto = (valor: unknown): Registro => esObjeto(valor) ? valor : {}
const mostrar = (valor: unknown): string => texto(valor) || 'No especificado'

function DatoClase({ etiqueta, valor }: { etiqueta: string; valor: unknown }) {
  const contenido = Array.isArray(valor) ? valoresTexto(valor).join(', ') : texto(valor)
  return <div className="lector-libro__dato"><dt>{etiqueta}</dt><dd>{contenido || 'No especificado'}</dd></div>
}

function ClaseCompleta({ clase }: { clase: Registro }) {
  const [rasgoAbierto, setRasgoAbierto] = useState<Registro | null>(null)
  useEffect(() => {
    if (!rasgoAbierto) return
    const cerrar = (evento: KeyboardEvent) => { if (evento.key === 'Escape') setRasgoAbierto(null) }
    document.addEventListener('keydown', cerrar)
    return () => document.removeEventListener('keydown', cerrar)
  }, [rasgoAbierto])
  // El editor guarda el contenido específico en elemento.datos.
  const datos = valorObjeto(clase.datos)
  const competencias = valorObjeto(datos.competencias)
  const catalogo = lista(datos.objetosCatalogo)
  const nombreObjeto = (id: unknown) => {
    const objeto = catalogo.find(item => texto(item.id) === texto(id))
    return objeto ? mostrar(objeto.nombre) : `Objeto no disponible (${texto(id)})`
  }
  const equipo = lista(datos.equipoOpciones)
  const rasgos = lista(datos.rasgos).sort((a,b) => Number(a.nivel || 0)-Number(b.nivel || 0))
  const progresion = lista(datos.progresion)
  const columnas = lista(datos.columnasProgresion)
  const celdas = valorObjeto(datos.celdasProgresion)
  const ocultas = valorObjeto(datos.caracteristicasOcultas)
  const principales = valoresTexto(datos.caracteristicasPrincipales)
  const categoriasArmas = valoresTexto(competencias.armasCategorias)
  const armaduras = valoresTexto(competencias.armaduras)
  const habilidades = valoresTexto(competencias.habilidadesOpciones)
  const armasEspecificas = valoresTexto(competencias.armasEspecificas).map(nombreObjeto)
  const gruposEquipo = equipo.flatMap(grupo => lista(grupo.opciones).map(opcion => ({grupo, opcion})))
  return <>
    {rasgoAbierto && <div className="lector-libro__modal-capa" role="presentation" onMouseDown={evento => { if (evento.target === evento.currentTarget) setRasgoAbierto(null) }}>
      <div className="lector-libro__modal-rasgo" role="dialog" aria-modal="true" aria-labelledby="lector-rasgo-titulo">
        <button type="button" className="lector-libro__modal-cerrar" onClick={() => setRasgoAbierto(null)} aria-label="Cerrar definición"><X size={20}/></button>
        <div className="lector-libro__modal-cabecera">
          <h3 id="lector-rasgo-titulo">{tituloElemento(rasgoAbierto, 0)}</h3>
          <span>Nivel {mostrar(rasgoAbierto.nivel)}</span>
        </div>
        <div className="lector-libro__modal-cuerpo">
          <TextoSeguro valor={rasgoAbierto.descripcion}/>
          {!texto(rasgoAbierto.descripcion) && <p className="lector-libro__vacio">Esta característica todavía no tiene descripción.</p>}
        </div>
      </div>
    </div>}
    <TextoSeguro valor={clase.descripcion || clase.texto || clase.resumen}/>
    <section className="lector-libro__clase-bloque">
      <h4>Datos generales</h4>
      <dl className="lector-libro__datos-grid">
        <DatoClase etiqueta="Dado de golpe" valor={datos.dadoGolpe ? `d${datos.dadoGolpe}` : ''}/>
        <DatoClase etiqueta="Características principales" valor={principales.length ? principales : datos.caracteristicaPrincipal}/>
        <DatoClase etiqueta="Salvaciones" valor={datos.salvaciones}/>
        <DatoClase etiqueta="Herramientas" valor={datos.herramientas}/>
        <DatoClase etiqueta="Armaduras" valor={armaduras.length ? armaduras : datos.armaduras}/>
        <DatoClase etiqueta="Armas" valor={[...categoriasArmas,...armasEspecificas].length ? [...categoriasArmas,...armasEspecificas] : datos.armas}/>
        <DatoClase etiqueta="Habilidades disponibles" valor={habilidades.length ? habilidades : datos.habilidades}/>
        <DatoClase etiqueta="Habilidades a elegir" valor={competencias.habilidadesCantidad}/>
      </dl>
    </section>
    <section className="lector-libro__clase-bloque">
      <h4>Equipo inicial</h4>
      {gruposEquipo.length ? <>
        <p className="lector-libro__nota">Opciones de equipamiento. Cantidad de elecciones: {equipo.reduce((n,g)=>n+Number(g.elegir || 0),0)}.</p>
        <div className="lector-libro__opciones">{gruposEquipo.map(({opcion},i) => <div className="lector-libro__opcion" key={texto(opcion.id)||i}>
          <strong>Opción {String.fromCharCode(65+i)}</strong>
          <ul>{lista(opcion.objetos).map((item,j)=><li key={j}>{Number(item.cantidad || 1)} × {nombreObjeto(item.objetoId)}</li>)}
            {Number(opcion.oro || 0)>0 && <li>{Number(opcion.oro)} po</li>}
          </ul>
        </div>)}</div>
      </> : <TextoSeguro valor={datos.equipoInicial || 'No se especificó equipamiento inicial.'}/>}
    </section>
    {progresion.length>0 && <section className="lector-libro__clase-bloque">
      <h4>Tabla de progresión</h4>
      <div className="lector-libro__tabla-scroll"><table className="lector-libro__tabla">
        <thead><tr><th scope="col">Nivel</th>{columnas.map((columna,i)=><th scope="col" key={texto(columna.id)||i}>{mostrar(columna.nombre)}</th>)}</tr></thead>
        <tbody>{progresion.map((fila,i)=>{
          const nivel=Number(fila.nivel || 0)
          const filaCeldas=valorObjeto(celdas[String(nivel)])
          const filaOcultas=valorObjeto(ocultas[String(nivel)])
          return <tr key={texto(fila.nivel)||i}><th scope="row">{nivel}</th>
            {columnas.map((columna,j)=>{
              const id=texto(columna.id)
              const rasgosVisibles=rasgos.filter(r=>Number(r.nivel)===nivel && !valoresTexto(filaOcultas[id]).includes(texto(r.id)))
              const valor=texto(filaCeldas[id]) || (id==='competencia' ? `+${Number(fila.bonificadorCompetencia || 0)}` : id==='notas' ? texto(fila.notas) : '')
              return <td key={id||j}>{columna.tipo==='caracteristicas'
                ? <div className="lector-libro__etiquetas">{rasgosVisibles.map((rasgo,k)=><button type="button" className="lector-libro__rasgo-enlace" key={texto(rasgo.id)||k} onClick={() => setRasgoAbierto(rasgo)} title={`Leer ${tituloElemento(rasgo,k)}`}>{tituloElemento(rasgo,k)}</button>)}</div>
                : valor || '—'}</td>
            })}</tr>
        })}</tbody>
      </table></div>
    </section>}
    {rasgos.length>0 && <section className="lector-libro__clase-bloque">
      <h4>Características de clase</h4>
      <div className="lector-libro__rasgos">{rasgos.map((rasgo,i)=><article className="lector-libro__rasgo" key={texto(rasgo.id)||i}>
        <div className="lector-libro__rasgo-encabezado"><strong>Nivel {mostrar(rasgo.nivel)}: {tituloElemento(rasgo,i)}.</strong></div>
        <TextoSeguro valor={rasgo.descripcion}/>
      </article>)}</div>
    </section>}
  </>
}
function ClasesDesplegables({ seccion }: { seccion: Seccion }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    <div className="lector-libro__seccion-encabezado"><Feather size={20}/><h2>{seccion.titulo}</h2></div>
    <div className="lector-libro__clases">
      {seccion.elementos.map((clase, indice) => (
        <details className="lector-libro__clase" key={texto(clase.id) || indice}>
          <summary className="lector-libro__clase-resumen">
            <span className="lector-libro__clase-insignia"><BookOpen size={20}/></span>
            <span className="lector-libro__clase-titulo">{tituloElemento(clase, indice)}</span>
            <ChevronRight className="lector-libro__clase-flecha" size={20}/>
          </summary>
          <div className="lector-libro__clase-contenido"><ClaseCompleta clase={clase}/></div>
        </details>
      ))}
    </div>
  </section>
}
function SubclasesDesplegables({ seccion, clases }: { seccion: Seccion; clases: Registro[] }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    <div className="lector-libro__seccion-encabezado"><Feather size={20}/><h2>Subclases</h2></div>
    <div className="lector-libro__clases">{seccion.elementos.map((subclase,i) => {
      const datos=valorObjeto(subclase.datos)
      const clase=clases.find(c => texto(c.id)===texto(datos.claseId))
      const rasgos=lista(datos.rasgos).sort((a,b)=>Number(a.nivel||0)-Number(b.nivel||0))
      return <details className="lector-libro__clase" key={texto(subclase.id)||i}>
        <summary className="lector-libro__clase-resumen"><span className="lector-libro__clase-insignia"><BookOpen size={20}/></span><span className="lector-libro__clase-titulo">{tituloElemento(subclase,i)} · {clase ? tituloElemento(clase,0) : 'Clase no disponible'}</span><ChevronRight className="lector-libro__clase-flecha" size={20}/></summary>
        <div className="lector-libro__clase-contenido"><TextoSeguro valor={subclase.descripcion}/>
          {rasgos.length>0 && <section className="lector-libro__clase-bloque"><h4>Características de subclase</h4><div className="lector-libro__rasgos">{rasgos.map((rasgo,j)=><article className="lector-libro__rasgo" key={texto(rasgo.id)||j}><div className="lector-libro__rasgo-encabezado"><strong>Nivel {mostrar(rasgo.nivel)}: {tituloElemento(rasgo,j)}</strong></div><TextoSeguro valor={rasgo.descripcion}/></article>)}</div></section>}
        </div>
      </details>
    })}</div>
  </section>
}
function SeccionContenido({ seccion }: { seccion: Seccion }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    <div className="lector-libro__seccion-encabezado"><Feather size={20}/><h2>{seccion.titulo}</h2></div>
    {seccion.elementos.length === 0
      ? <p className="lector-libro__vacio">Todavía no hay contenido publicado en esta sección.</p>
      : <div className="lector-libro__entradas">{seccion.elementos.map((elemento, i) => <article className="lector-libro__entrada" key={texto(elemento.id) || i}>
        <h3>{tituloElemento(elemento, i)}</h3>
        <TextoSeguro valor={elemento.descripcion || elemento.texto || elemento.resumen}/>
        {Array.isArray(elemento.rasgos) && elemento.rasgos.length > 0 && <div className="lector-libro__rasgos">{lista(elemento.rasgos).map((rasgo,j)=><div key={texto(rasgo.id)||j}><strong>{tituloElemento(rasgo,j)}</strong><TextoSeguro valor={rasgo.descripcion}/></div>)}</div>}
      </article>)}</div>}
  </section>
}
export default function LectorLibro() {
  const { libroId } = useParams<{ libroId: string }>()
  const [libro,setLibro] = useState<LibroPublicado|null>(null)
  const [cargando,setCargando] = useState(true)
  const [error,setError] = useState('')
  const [versionId,setVersionId] = useState('')
  useEffect(()=>{
    let activo=true
    async function cargar() {
      setCargando(true);setError('')
      const {data,error:fallo}=await supabase.from('libros')
        .select('id,codigo,edicion,editorial,clasificacion,estado,libro_versiones(id,idioma,titulo,descripcion,categorias,especies,conjuros,clases,subclases)')
        .eq('id',libroId ?? '').eq('estado','publicado').maybeSingle()
      if(!activo)return
      if(fallo)setError('No se pudo cargar el libro publicado.')
      else if(!data)setError('Este libro no está disponible en el catálogo.')
      else {const resultado=data as LibroPublicado;setLibro(resultado);setVersionId(resultado.libro_versiones[0]?.id || '')}
      setCargando(false)
    }
    void cargar()
    return ()=>{activo=false}
  },[libroId])
  const version=libro?.libro_versiones.find(v=>v.id===versionId) ?? libro?.libro_versiones[0]
  const secciones:Seccion[] = version ? [
    {id:'especies',titulo:'Especies',elementos:lista(version.especies)},
    {id:'clases',titulo:'Clases',elementos:lista(version.clases)},
    {id:'subclases',titulo:'Subclases',elementos:lista(version.subclases)},
    {id:'conjuros',titulo:'Conjuros',elementos:lista(version.conjuros)}
  ] : []
  const categorias=Array.isArray(version?.categorias) ? version.categorias.map(c=>typeof c==='string'?c:esObjeto(c)?texto(c.label)||texto(c.nombre)||texto(c.id):'').filter(Boolean) : []
  return <AppLayout title="Biblioteca" subtitle="Lectura de libros publicados">
    <main className="lector-libro">
      <Link className="lector-libro__volver" to="/biblioteca/libros"><ArrowLeft size={17}/> Volver al catálogo</Link>
      {cargando ? <div className="lector-libro__estado">Abriendo libro...</div>
      : error ? <div className="lector-libro__estado" role="alert">{error}</div>
      : libro && version ? <>
        <header className="lector-libro__portada">
          <div className="lector-libro__sello"><BookOpen size={30} strokeWidth={1.5}/></div>
          <span className="lector-libro__sobre">CHRONICLE · BIBLIOTECA</span>
          <h1>{version.titulo || 'Libro sin título'}</h1>
          <div className="lector-libro__ornamento"><span/>✦<span/></div>
          <p className="lector-libro__subtitulo">{libro.editorial || 'Una obra de la comunidad'}</p>
          <div className="lector-libro__metadatos">
            {libro.edicion && <span>Edición {libro.edicion}</span>}
            {libro.codigo && <span>{libro.codigo}</span>}
            {libro.clasificacion && <span>{libro.clasificacion}</span>}
          </div>
        </header>
        <div className="lector-libro__disposicion">
          <aside className="lector-libro__indice" aria-label="Índice del libro">
            <div className="lector-libro__indice-titulo"><ScrollText size={18}/> CONTENIDO</div>
            <a href="#introduccion"><span>01</span> Introducción <ChevronRight size={14}/></a>
            {secciones.filter(s=>s.elementos.length>0).map((seccion,i)=><a key={seccion.id} href={`#${seccion.id}`}><span>{String(i+2).padStart(2,'0')}</span>{seccion.titulo}<ChevronRight size={14}/></a>)}
            {libro.libro_versiones.length>1 && <div className="lector-libro__idioma"><label htmlFor="lector-version">Versión / idioma</label><select id="lector-version" value={version.id} onChange={e=>setVersionId(e.target.value)}>{libro.libro_versiones.map(v=><option key={v.id} value={v.id}>{v.idioma.toUpperCase()} · {v.titulo}</option>)}</select></div>}
          </aside>
          <div className="lector-libro__paginas">
            <section id="introduccion" className="lector-libro__introduccion">
              <span className="lector-libro__eyebrow">PREFACIO</span>
              <h2>Introducción</h2>
              <TextoSeguro valor={version.descripcion || 'Un nuevo mundo de aventuras te espera entre estas páginas.'}/>
              {categorias.length>0 && <div className="lector-libro__categorias">{categorias.map(c=><span key={c}>{c}</span>)}</div>}
            </section>
            {secciones.filter(s=>s.elementos.length>0).map(s=>s.id === 'clases' ? <ClasesDesplegables key={s.id} seccion={s}/> : s.id === 'subclases' ? <SubclasesDesplegables key={s.id} seccion={s} clases={lista(version.clases)}/> : <SeccionContenido key={s.id} seccion={s}/>)}
            {secciones.every(s=>s.elementos.length===0) && <p className="lector-libro__vacio">Este libro todavía no tiene entradas estructuradas disponibles para leer.</p>}
            <footer className="lector-libro__pie">✦ <span>Chronicle · Fin del contenido disponible</span> ✦</footer>
          </div>
        </div>
      </> : null}
    </main>
  </AppLayout>
}
