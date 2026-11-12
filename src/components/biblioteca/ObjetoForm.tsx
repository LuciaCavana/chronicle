import type { Elemento } from '../../services/chronicleLibros'
import '../../styles/NuevaPropuesta.css'
import '../../styles/ObjetoForm.css'

type Datos = Record<string, unknown>
type Props = { elemento: Elemento; objetos: Elemento[]; onChange: (elemento: Elemento) => void }

const tipos = [
  ['arma','Arma'],['armadura','Armadura o escudo'],['herramienta','Herramienta'],['juego','Juego'],
  ['equipo','Equipo de aventura'],['paquete','Paquete de equipo'],['pocion','Poción'],
  ['pergamino','Pergamino'],['municion','Munición'],['veneno','Veneno'],['montura','Montura'],
  ['vehiculo','Vehículo'],['tesoro','Tesoro'],['anillo','Anillo'],['varita','Varita'],
  ['baston','Bastón'],['cetro','Cetro'],['personalizado','Objeto personalizado']
] as const
const rarezas = ['Sin rareza','Común','Poco común','Raro','Muy raro','Legendario','Artefacto','Variable']
const propiedadesArma = ['Ligera','Pesada','Sutil','Arrojadiza','Versátil','A dos manos','Alcance','Munición','Carga','Especial']
const maestrias = ['','Cleave','Graze','Nick','Push','Sap','Slow','Topple','Vex']
const danos = ['','Contundente','Cortante','Perforante','Ácido','Frío','Fuego','Fuerza','Relámpago','Necrótico','Veneno','Psíquico','Radiante','Trueno']
const texto = (v: unknown) => typeof v === 'string' ? v : v == null ? '' : String(v)
const lista = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

export default function ObjetoForm({ elemento, objetos, onChange }: Props) {
  const datos: Datos = elemento.datos ?? {}
  const tipo = texto(datos.tipo) || 'equipo'
  const actualizar = (campo: string, valor: unknown) => onChange({ ...elemento, datos: { ...datos, [campo]: valor } })
  const campo = (nombre: string, clave: string, placeholder = '') => <label className="nueva-propuesta-field">{nombre}<input value={texto(datos[clave])} placeholder={placeholder} onChange={e => actualizar(clave, e.target.value)}/></label>
  const numero = (nombre: string, clave: string, minimo = 0) => <label className="nueva-propuesta-field objeto-form__number">{nombre}<input type="number" min={minimo} step="any" value={datos[clave] == null ? '' : texto(datos[clave])} onChange={e => actualizar(clave, e.target.value === '' ? null : Number(e.target.value))}/></label>
  const seleccionar = (nombre: string, clave: string, opciones: string[]) => <label className="nueva-propuesta-field">{nombre}<select value={texto(datos[clave])} onChange={e => actualizar(clave, e.target.value)}>{opciones.map(op => <option key={op} value={op}>{op || 'Sin seleccionar'}</option>)}</select></label>
  const marcar = (nombre: string, clave: string) => <label className="objeto-form__checkbox"><input type="checkbox" checked={datos[clave] === true} onChange={e => actualizar(clave, e.target.checked)}/>{nombre}</label>
  const relacionados = Array.isArray(datos.contenido) ? datos.contenido as {objetoId:string;cantidad:number}[] : []
  const variantes = Array.isArray(datos.variantes) ? datos.variantes as string[] : []

  return <div className="objeto-form">
    <h3>Datos generales</h3>
    <div className="nueva-propuesta-field"><label>Tipo de objeto</label><select value={tipo} onChange={e => actualizar('tipo',e.target.value)}>{tipos.map(([id,nombre])=><option key={id} value={id}>{nombre}</option>)}</select></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
      {campo('Subtipo','subtipo','Clasificación específica')}
      {seleccionar('Rareza','rareza',rarezas)}
      {numero('Precio','precio')}
      {seleccionar('Moneda','moneda',['PC','PP','PE','PO','PPT'])}
      {numero('Peso (lb)','peso')}
      {campo('Página de origen','pagina')}
    </div>
    {marcar('Es un objeto mágico','magico')}
    {marcar('Es consumible','consumible')}
    {campo('Imagen (URL)','imagen')}
    {tipo === 'arma' && <section className="objeto-form__section">
      <h3>Estadísticas de arma</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
        {seleccionar('Competencia','competencia',['Simple','Marcial','Otra'])}
        {seleccionar('Modalidad','modalidad',['Cuerpo a cuerpo','A distancia'])}
        {campo('Dados de daño','dadosDanio','1d6')}
        {seleccionar('Tipo de daño','tipoDanio',danos)}
        {campo('Daño versátil','danioVersatil','1d8')}
        {numero('Alcance normal (pies)','alcanceNormal')}
        {numero('Alcance largo (pies)','alcanceLargo')}
        {seleccionar('Maestría','maestria',maestrias)}
        {numero('Bonificador al ataque','bonoAtaque',-20)}
        {numero('Bonificador al daño','bonoDanio',-20)}
      </div>
      <strong>Propiedades</strong>
      <div className="objeto-form__checks">{propiedadesArma.map(prop=><label key={prop} className="objeto-form__checkbox"><input type="checkbox" checked={lista(datos.propiedades).includes(prop)} onChange={e=>actualizar('propiedades',e.target.checked?[...lista(datos.propiedades),prop]:lista(datos.propiedades).filter(p=>p!==prop))}/>{prop}</label>)}</div>
    </section>}
    {tipo === 'armadura' && <section style={{display:'grid',gap:12}}>
      <h3>Estadísticas de armadura</h3>
      {seleccionar('Clase','claseArmadura',['Ligera','Media','Pesada','Escudo'])}
      {numero('CA base / bonificador','ca')}
      {numero('Máximo modificador de Destreza','destrezaMaxima')}
      {numero('Fuerza mínima','fuerzaMinima')}
      {marcar('Desventaja en Sigilo','sigiloDesventaja')}
      {campo('Tiempo para equipar','tiempoEquipar')}
      {campo('Tiempo para quitar','tiempoQuitar')}
    </section>}
    {(tipo === 'herramienta' || tipo === 'juego') && <section style={{display:'grid',gap:12}}>
      <h3>{tipo === 'juego' ? 'Juego y variantes' : 'Herramienta'}</h3>
      {campo('Competencia asociada','competenciaAsociada')}
      {campo('Prueba o característica','prueba')}
      <label className="nueva-propuesta-field">Variantes (una por línea)
        <textarea rows={4} value={variantes.join('\n')} onChange={e=>actualizar('variantes',e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))}/>
      </label>
    </section>}
    {(tipo === 'paquete' || tipo === 'equipo') && <section style={{display:'grid',gap:12}}>
      <h3>Contenido y almacenamiento</h3>
      {numero('Capacidad (lb)','capacidad')}
      {numero('Cantidad de usos','usos')}
      <strong>Objetos incluidos</strong>
      {relacionados.map((r,i)=><div key={i} className="objeto-form__included-row">
        <select className="objeto-form__included-select" aria-label="Objeto incluido" value={r.objetoId} onChange={e=>actualizar('contenido',relacionados.map((x,j)=>j===i?{...x,objetoId:e.target.value}:x))}>
          <option value="">Seleccioná un objeto</option>{objetos.filter(o=>o.id!==elemento.id).map(o=><option key={o.id} value={o.id}>{o.nombre || 'Objeto sin nombre'}</option>)}
        </select>
        <input className="objeto-form__included-quantity" aria-label="Cantidad" type="number" min={1} value={r.cantidad} onChange={e=>actualizar('contenido',relacionados.map((x,j)=>j===i?{...x,cantidad:Math.max(1,Number(e.target.value)||1)}:x))}/>
        <button className="objeto-form__remove" type="button" onClick={()=>actualizar('contenido',relacionados.filter((_,j)=>j!==i))}>Quitar</button>
      </div>)}
      <button className="objeto-form__add" type="button" onClick={()=>actualizar('contenido',[...relacionados,{objetoId:'',cantidad:1}])}>Agregar objeto al contenido</button>
    </section>}
    {tipo === 'pocion' && <section>{campo('Efecto','efecto')}{campo('Duración','duracion')}{numero('Usos','usos')}</section>}
    {tipo === 'pergamino' && <section>{campo('Conjuro vinculado','conjuro')}{numero('Nivel del conjuro','nivelConjuro')}{campo('Requisitos de uso','requisitos')}</section>}
    {tipo === 'municion' && <section>{campo('Armas compatibles','compatibilidad')}{campo('Propiedades','propiedadesTexto')}</section>}
    {tipo === 'veneno' && <section>{seleccionar('Aplicación','aplicacion',['Contacto','Ingerido','Inhalado','Herida'])}{numero('CD de salvación','cd')}{campo('Daño','dadosDanio')}{campo('Duración','duracion')}</section>}
    {tipo === 'montura' && <section>{numero('Velocidad (pies)','velocidad')}{numero('Capacidad de carga (lb)','capacidad')}{campo('Estadísticas o referencia','estadisticas')}</section>}
    {tipo === 'vehiculo' && <section>{seleccionar('Medio','medio',['Terrestre','Acuático','Aéreo','Espacial'])}{campo('Velocidad','velocidad')}{numero('Capacidad','capacidad')}{numero('Tripulación','tripulacion')}</section>}
    {tipo === 'tesoro' && <section>{campo('Material','material')}{campo('Clasificación de tesoro','clasificacionTesoro')}</section>}
    {['anillo','varita','baston','cetro'].includes(tipo) && <section>{campo('Tipo de foco','foco')}{campo('Efectos','efectos')}</section>}
    {tipo === 'personalizado' && <section>{campo('Propiedades adicionales','propiedadesTexto')}</section>}
    {datos.magico === true && <section style={{display:'grid',gap:12}}>
      <h3>Propiedades mágicas</h3>
      {marcar('Requiere vinculación','vinculacion')}
      {campo('Requisitos de vinculación','requisitosVinculacion')}
      {numero('Cargas máximas','cargasMaximas')}
      {campo('Recuperación de cargas','recuperacion')}
      {campo('Conjuros asociados','conjurosAsociados')}
      {campo('Efectos pasivos y activables','efectosMagicos')}
      {campo('Resistencias e inmunidades','resistencias')}
      {campo('Maldiciones o restricciones','maldiciones')}
      <label className="nueva-propuesta-field">Objeto base<select value={texto(datos.objetoBaseId)} onChange={e=>actualizar('objetoBaseId',e.target.value)}><option value="">Ninguno</option>{objetos.filter(o=>o.id!==elemento.id).map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
    </section>}
    <label className="nueva-propuesta-field">Reglas y notas adicionales<textarea rows={5} value={texto(datos.reglas)} onChange={e=>actualizar('reglas',e.target.value)}/></label>
  </div>
}
