import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowUp, BookOpen, ChevronRight, Feather, ScrollText, WandSparkles, X } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { supabase } from '../lib/supabase'
import { calcularFormula } from '../lib/formulasProgresion'
import '../styles/biblioteca/LectorLibro.css'
import logoPortada64 from '../assets/logo-portada-64.png'
import logoPortada128 from '../assets/logo-portada-128.png'
import logoPortada192 from '../assets/logo-portada-192.png'

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
  objetos: unknown
  contenido_extra?: unknown
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
        <button type="button" className="lector-libro__modal-cerrar" onClick={() => setRasgoAbierto(null)} aria-label="Cerrar definición"><X size={20} aria-hidden="true"/></button>
        <div className="lector-libro__modal-cabecera">
          <h3 id="lector-rasgo-titulo">{tituloElemento(rasgoAbierto, 0)}</h3>
          <span className="lector-libro__rasgo-nivel">Nivel {mostrar(rasgoAbierto.nivel)}</span>
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
              const valor=columna.tipo==='formula' ? calcularFormula(texto(columna.formula),nivel) : texto(filaCeldas[id]) || (id==='competencia' ? `+${Number(fila.bonificadorCompetencia || 0)}` : id==='notas' ? texto(fila.notas) : '')
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
        <div className="lector-libro__rasgo-encabezado"><span className="lector-libro__rasgo-nivel">Nivel {mostrar(rasgo.nivel)}</span><strong>{tituloElemento(rasgo,i)}</strong></div>
        <TextoSeguro valor={rasgo.descripcion}/>
      </article>)}</div>
    </section>}
  </>
}
function ClasesDesplegables({ seccion }: { seccion: Seccion }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>{seccion.titulo}</h2></div>
    <div className="lector-libro__clases">
      {seccion.elementos.map((clase, indice) => (
        <details className="lector-libro__clase" key={texto(clase.id) || indice}>
          <summary className="lector-libro__clase-resumen">
            <span className="lector-libro__clase-insignia"><BookOpen size={20} aria-hidden="true"/></span>
            <span className="lector-libro__clase-titulo">{tituloElemento(clase, indice)}</span>
            <ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/>
          </summary>
          <div className="lector-libro__clase-contenido"><ClaseCompleta clase={clase}/></div>
        </details>
      ))}
    </div>
  </section>
}
function SubclasesDesplegables({ seccion, clases }: { seccion: Seccion; clases: Registro[] }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>Subclases</h2></div>
    <div className="lector-libro__clases">{seccion.elementos.map((subclase,i) => {
      const datos=valorObjeto(subclase.datos)
      const clase=clases.find(c => texto(c.id)===texto(datos.claseId))
      const rasgos=lista(datos.rasgos).sort((a,b)=>Number(a.nivel||0)-Number(b.nivel||0))
      return <details className="lector-libro__clase" key={texto(subclase.id)||i}>
        <summary className="lector-libro__clase-resumen"><span className="lector-libro__clase-insignia"><BookOpen size={20} aria-hidden="true"/></span><span className="lector-libro__clase-titulo">{tituloElemento(subclase,i)} <span className="lector-libro__clase-detalle">· {clase ? tituloElemento(clase,0) : 'Clase no disponible'}</span></span><ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/></summary>
        <div className="lector-libro__clase-contenido"><TextoSeguro valor={subclase.descripcion}/>
          {rasgos.length>0 && <section className="lector-libro__clase-bloque"><h4>Características de subclase</h4><div className="lector-libro__rasgos">{rasgos.map((rasgo,j)=><article className="lector-libro__rasgo" key={texto(rasgo.id)||j}><div className="lector-libro__rasgo-encabezado"><span className="lector-libro__rasgo-nivel">Nivel {mostrar(rasgo.nivel)}</span><strong>{tituloElemento(rasgo,j)}</strong></div><TextoSeguro valor={rasgo.descripcion}/></article>)}</div></section>}
        </div>
      </details>
    })}</div>
  </section>
}
function SeccionContenido({ seccion }: { seccion: Seccion }) {
  return <section id={seccion.id} className="lector-libro__seccion">
    <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>{seccion.titulo}</h2></div>
    {seccion.elementos.length === 0
      ? <p className="lector-libro__vacio">Todavía no hay contenido publicado en esta sección.</p>
      : <div className="lector-libro__entradas">{seccion.elementos.map((elemento, i) => <article className="lector-libro__entrada" key={texto(elemento.id) || i}>
        <h3>{tituloElemento(elemento, i)}</h3>
        <TextoSeguro valor={elemento.descripcion || elemento.texto || elemento.resumen}/>
        {Array.isArray(elemento.rasgos) && elemento.rasgos.length > 0 && <div className="lector-libro__rasgos">{lista(elemento.rasgos).map((rasgo,j)=><div key={texto(rasgo.id)||j}><strong>{tituloElemento(rasgo,j)}</strong><TextoSeguro valor={rasgo.descripcion}/></div>)}</div>}
      </article>)}</div>}
  </section>
}
function ConjurosDesplegables({ seccion }: { seccion: Seccion }) {
  return <section className="lector-libro__seccion" id={seccion.id}>
    <div className="lector-libro__seccion-encabezado"><Feather size={20} aria-hidden="true"/><h2>Conjuros</h2></div>
    <div className="lector-libro__clases">{seccion.elementos.map((conjuro,i) => {
      const nivel = Number(conjuro.nivel ?? 0)
      const origen = texto(conjuro.libroOrigen)
      const pagina = Number(conjuro.paginaOrigen)
      const componentes = texto(conjuro.componentes)
      const material = texto(conjuro.componenteMaterial)
      const clases = valoresTexto(conjuro.clases)
      return <details className="lector-libro__clase" key={texto(conjuro.id)||i}>
        <summary className="lector-libro__clase-resumen"><span className="lector-libro__clase-insignia"><WandSparkles size={20} aria-hidden="true"/></span><span className="lector-libro__clase-titulo">{tituloElemento(conjuro,i)} <span className="lector-libro__clase-detalle">· {nivel===0 ? 'Truco' : `Nivel ${nivel}`}</span></span><ChevronRight className="lector-libro__clase-flecha" size={20} aria-hidden="true"/></summary>
        <article className="lector-libro__conjuro" aria-label={tituloElemento(conjuro,i)}>
          <header className="lector-libro__conjuro-cabecera">
            <p className="lector-libro__conjuro-escuela">{nivel===0 ? 'Truco' : `Conjuro de nivel ${nivel}`}{texto(conjuro.escuela) ? ` · ${texto(conjuro.escuela)}` : ''}{conjuro.ritual ? ' (ritual)' : ''}</p>
            {(origen || (Number.isInteger(pagina) && pagina>0)) && <span className="lector-libro__conjuro-fuente">{origen}{origen && pagina>0 ? ' · ' : ''}{pagina>0 ? `pág. ${pagina}` : ''}</span>}
          </header>
          <dl className="lector-libro__conjuro-datos">
            {texto(conjuro.tiempoLanzamiento) && <div className="lector-libro__conjuro-dato"><dt>Tiempo de lanzamiento</dt><dd>{texto(conjuro.tiempoLanzamiento)}</dd></div>}
            {texto(conjuro.alcance) && <div className="lector-libro__conjuro-dato"><dt>Alcance</dt><dd>{texto(conjuro.alcance)}</dd></div>}
            {componentes && <div className="lector-libro__conjuro-dato"><dt>Componentes</dt><dd>{componentes}{material ? ` (${material})` : ''}</dd></div>}
            {texto(conjuro.duracion) && <div className="lector-libro__conjuro-dato"><dt>Duración</dt><dd>{conjuro.concentracion ? 'Concentración, ' : ''}{texto(conjuro.duracion)}</dd></div>}
          </dl>
          <TextoSeguro valor={conjuro.descripcion}/>
          {clases.length>0 && <p className="lector-libro__conjuro-clases">Clases: {clases.map(c => <span key={c}>{c}</span>)}</p>}
        </article>
      </details>
    })}</div>
  </section>
}
export default function LectorLibro() {
  const { libroId, propuestaId } = useParams<{ libroId?: string; propuestaId?: string }>()
  const esBorrador = Boolean(propuestaId)
  const [parametros] = useSearchParams()
  const origen = parametros.get('origen')
  const desdeRevision = esBorrador && origen === 'revision'
  const desdeAdministracion = origen === 'administracion'
  const desdeCompartidos = esBorrador && origen === 'compartidos'
  // Vista previa abierta desde el editor: se vuelve al editor, que a su vez recuerda su pestaña de origen.
  const desdeEditor = esBorrador && origen === 'editor'
  const origenDelEditor = parametros.get('desde')
  const seccion = parametros.get('seccion')
  const seccionAdmin = seccion === 'publicados' || seccion === 'ocultos' || seccion === 'borrados' ? seccion : 'pendientes'
  const destinoVolver = desdeEditor
    ? `/biblioteca/libros/editar-borrador/${propuestaId}${origenDelEditor ? `?origen=${encodeURIComponent(origenDelEditor)}` : ''}`
    : desdeRevision
    ? `/biblioteca/libros/revision/${propuestaId}`
    : desdeAdministracion ? `/administracion/revision?seccion=${seccionAdmin}`
    : desdeCompartidos ? '/biblioteca/libros?tab=compartidos'
    : esBorrador ? '/biblioteca/libros?tab=propuestas' : '/biblioteca/libros'
  const [libro,setLibro] = useState<LibroPublicado|null>(null)
  const [cargando,setCargando] = useState(true)
  const [error,setError] = useState('')
  const [versionId,setVersionId] = useState('')
  const [mostrarVolverArriba, setMostrarVolverArriba] = useState(false)
  useEffect(() => {
    const contenedor = document.querySelector<HTMLElement>('.app-layout-content')
    if (!contenedor) return
    const comprobarScroll = () => setMostrarVolverArriba(contenedor.scrollTop > 350)
    comprobarScroll()
    contenedor.addEventListener('scroll', comprobarScroll, { passive: true })
    return () => contenedor.removeEventListener('scroll', comprobarScroll)
  }, [])
  useEffect(()=>{
    let activo=true
    async function cargar() {
      setCargando(true);setError('')
      if (propuestaId) {
        const { data, error: fallo } = await supabase.from('propuestas')
          .select('id,estado,titulo,descripcion,idioma,categorias,metadatos_libro,contenido')
          .eq('id', propuestaId).eq('estado', 'borrador').maybeSingle()
        if (!activo) return
        if (fallo) setError('No se pudo cargar el borrador.')
        else if (!data) setError('No tenés acceso a este borrador o ya no está disponible.')
        else {
          const meta = esObjeto(data.metadatos_libro) ? data.metadatos_libro : {}
          const contenido = esObjeto(data.contenido) ? data.contenido : {}
          const version: Version = {
            id: data.id, idioma: data.idioma ?? 'es', titulo: data.titulo ?? '',
            descripcion: data.descripcion ?? '', categorias: data.categorias ?? [],
            especies: contenido.especies ?? [], conjuros: contenido.conjuros ?? [],
            clases: contenido.clases ?? [], subclases: contenido.subclases ?? [],
            objetos: contenido.objetos ?? [],
            contenido_extra: { dotes: contenido.dotes ?? [], trasfondos: contenido.trasfondos ?? [], criaturas: contenido.criaturas ?? [], caracteristicas: contenido.caracteristicas ?? [] },
          }
          setLibro({ id: data.id, codigo: texto(meta.codigo) || null,
            edicion: texto(meta.edicion) || null, editorial: texto(meta.editorial) || null,
            clasificacion: texto(meta.clasificacion) || null, estado: 'borrador', libro_versiones: [version] })
          setVersionId(version.id)
        }
        setCargando(false)
        return
      }
      const {data,error:fallo}=await supabase.from('libros')
        .select('id,codigo,edicion,editorial,clasificacion,estado,libro_versiones(id,idioma,titulo,descripcion,categorias,especies,conjuros,clases,subclases,objetos,contenido_extra)')
        .eq('id',libroId ?? '').eq('estado','publicado').maybeSingle()
      if(!activo)return
      if(fallo)setError('No se pudo cargar el libro publicado.')
      else if(!data)setError('Este libro no está disponible en el catálogo.')
      else {const resultado=data as LibroPublicado;setLibro(resultado);setVersionId(resultado.libro_versiones[0]?.id || '')}
      setCargando(false)
    }
    void cargar()
    return ()=>{activo=false}
  },[libroId,propuestaId])
  const version=libro?.libro_versiones.find(v=>v.id===versionId) ?? libro?.libro_versiones[0]
  const extras = valorObjeto(version?.contenido_extra)
  const categoriasActivas = Array.isArray(version?.categorias) ? version.categorias.filter((categoria): categoria is string => typeof categoria === 'string') : []
  const secciones:Seccion[] = version ? [
    {id:'especies',titulo:'Especies',elementos:lista(version.especies)},
    {id:'clases',titulo:'Clases',elementos:lista(version.clases)},
    {id:'subclases',titulo:'Subclases',elementos:lista(version.subclases)},
    {id:'objetos',titulo:'Objetos y equipo',elementos:lista(version.objetos)},
    {id:'conjuros',titulo:'Conjuros',elementos:lista(version.conjuros)},
    {id:'dotes',titulo:'Dotes',elementos:lista(extras.dotes)},
    {id:'trasfondos',titulo:'Trasfondos',elementos:lista(extras.trasfondos)},
    {id:'criaturas',titulo:'Criaturas',elementos:lista(extras.criaturas)},
    {id:'caracteristicas',titulo:'Características y reglas',elementos:lista(extras.caracteristicas)}
  ].filter(seccion => categoriasActivas.includes(seccion.id)) : []
  const seccionesConContenido = secciones.filter(s=>s.elementos.length>0)
  const indice = [{ id: 'introduccion', titulo: 'Introducción' }, ...seccionesConContenido.map(s => ({ id: s.id, titulo: s.titulo }))]
  const idsIndice = indice.map(item => item.id).join('|')
  // Sección que se está leyendo: la última cuyo comienzo ya pasó el borde superior.
  const [seccionActiva, setSeccionActiva] = useState('introduccion')
  const indiceRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const contenedor = document.querySelector<HTMLElement>('.app-layout-content')
    if (!contenedor || !idsIndice) return
    const ids = idsIndice.split('|')
    const actualizar = () => {
      const borde = contenedor.getBoundingClientRect().top + 120
      let actual = ids[0]
      for (const id of ids) {
        const elemento = document.getElementById(id)
        if (elemento && elemento.getBoundingClientRect().top <= borde) actual = id
      }
      setSeccionActiva(actual)
    }
    contenedor.addEventListener('scroll', actualizar, { passive: true })
    return () => contenedor.removeEventListener('scroll', actualizar)
  }, [idsIndice])
  // En celular el índice es una fila desplazable: se acomoda para que se vea la sección actual.
  useEffect(() => {
    const fila = indiceRef.current
    const enlace = fila?.querySelector<HTMLElement>(`[data-seccion="${seccionActiva}"]`)
    if (!fila || !enlace || fila.scrollWidth <= fila.clientWidth) return
    fila.scrollTo({ left: enlace.offsetLeft - 8, behavior: 'smooth' })
  }, [seccionActiva])
  const categorias=Array.isArray(version?.categorias) ? version.categorias.map(c=>typeof c==='string'?c:esObjeto(c)?texto(c.label)||texto(c.nombre)||texto(c.id):'').filter(Boolean) : []
  const textoVolver = desdeEditor ? 'Editor' : desdeRevision ? 'Revisión' : desdeAdministracion ? 'Revisión de libros' : desdeCompartidos ? 'Compartidos conmigo' : esBorrador ? 'Mis propuestas' : 'Libros y propuestas'
  return <AppLayout title={version?.titulo || 'Biblioteca'} subtitle={esBorrador ? "Vista previa del borrador" : "Lectura de libros publicados"} migaAnterior={{ texto: textoVolver, ruta: destinoVolver }}>
    <main className="lector-libro">
      {desdeEditor && <div className="lector-libro__aviso-previa" role="status">
        <span>Vista previa de lo último que guardaste.</span>
        <Link to={destinoVolver} className="lector-libro__volver-editor">Volver al editor</Link>
      </div>}
      {cargando ? <div className="lector-libro__estado">Abriendo libro...</div>
      : error ? <div className="lector-libro__estado" role="alert">{error}</div>
      : libro && version ? <>
        <header className="lector-libro__portada">
          <img className="lector-libro__sello" src={logoPortada64} srcSet={`${logoPortada64} 1x, ${logoPortada128} 2x, ${logoPortada192} 3x`} alt="" width={64} height={64}/>
          <span className={`lector-libro__sobre${esBorrador ? ' lector-libro__sobre--borrador' : ''}`}>{esBorrador ? 'Vista previa · borrador sin publicar' : 'Biblioteca de Chronicle'}</span>
          <h1>{version.titulo || 'Libro sin título'}</h1>
          <p className="lector-libro__subtitulo">{libro.editorial || 'Una obra de la comunidad'}</p>
          <div className="lector-libro__metadatos">
            {libro.edicion && <span>Edición {libro.edicion}</span>}
            {libro.codigo && <span>{libro.codigo}</span>}
            {libro.clasificacion && <span>{libro.clasificacion}</span>}
          </div>
          {libro.libro_versiones.length>1 && <div className="lector-libro__idioma"><label htmlFor="lector-version">Versión / idioma</label><select id="lector-version" value={version.id} onChange={e=>setVersionId(e.target.value)}>{libro.libro_versiones.map(v=><option key={v.id} value={v.id}>{v.idioma.toUpperCase()} · {v.titulo}</option>)}</select></div>}
        </header>
        <div className="lector-libro__disposicion">
          <nav className="lector-libro__indice" aria-label="Índice del libro" ref={indiceRef}>
            <div className="lector-libro__indice-titulo"><ScrollText size={16} aria-hidden="true"/> Contenido</div>
            {indice.map((item,i)=><a key={item.id} href={`#${item.id}`} data-seccion={item.id}
              className={seccionActiva===item.id ? 'lector-libro__indice-actual' : undefined}
              aria-current={seccionActiva===item.id ? 'location' : undefined}><span>{String(i+1).padStart(2,'0')}</span>{item.titulo}</a>)}
          </nav>
          <div className="lector-libro__paginas">
            <section id="introduccion" className="lector-libro__introduccion">
              <span className="lector-libro__eyebrow">PREFACIO</span>
              <h2>Introducción</h2>
              <TextoSeguro valor={version.descripcion || 'Un nuevo mundo de aventuras te espera entre estas páginas.'}/>
              {categorias.length>0 && <div className="lector-libro__categorias">{categorias.map(c=><span key={c}>{c}</span>)}</div>}
            </section>
            {seccionesConContenido.map(s=>s.id === 'clases' ? <ClasesDesplegables key={s.id} seccion={s}/> : s.id === 'subclases' ? <SubclasesDesplegables key={s.id} seccion={s} clases={lista(version.clases)}/> : s.id === 'conjuros' ? <ConjurosDesplegables key={s.id} seccion={s}/> : <SeccionContenido key={s.id} seccion={s}/>)}
            {seccionesConContenido.length===0 && <p className="lector-libro__vacio">Este libro todavía no tiene entradas estructuradas disponibles para leer.</p>}
            <footer className="lector-libro__pie">Fin del contenido disponible</footer>
          </div>
        </div>
      </> : null}
      {mostrarVolverArriba && (
        <button type="button" className="lector-libro__volver-arriba"
          title="Volver al comienzo" aria-label="Volver al comienzo de la lectura"
          onClick={() => document.querySelector<HTMLElement>('.app-layout-content')?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <ArrowUp size={21} aria-hidden="true" />
        </button>
      )}
    </main>
  </AppLayout>
}
