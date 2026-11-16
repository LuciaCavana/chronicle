import type { CaracteristicaLibro } from '../../types/caracteristicaLibro'
import type { Elemento } from '../../services/chronicleLibros'
import '../../styles/NuevaPropuesta.css'
import '../../styles/ObjetoForm.css'
import { useLanguage } from '../../i18n/useLanguage'

type Datos = Record<string, unknown>
type Props = { elemento: Elemento; objetos: Elemento[]; caracteristicas?: CaracteristicaLibro[]; onChange: (elemento: Elemento) => void }

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
const etiquetasObjeto: Record<string, import('../../i18n/translations').TranslationKey> = {"Datos generales": "object.0","Tipo de objeto": "object.1","Subtipo": "object.2","Clasificación específica": "object.3","Rareza": "object.4","Precio": "object.5","Moneda": "object.6","Peso (lb)": "object.7","Página de origen": "object.8","Es un objeto mágico": "object.9","Es consumible": "object.10","Imagen (URL)": "object.11","Estadísticas de arma": "object.12","Competencia": "object.13","Modalidad": "object.14","Dados de daño": "object.15","Tipo de daño": "object.16","Daño versátil": "object.17","Alcance normal (pies)": "object.18","Alcance largo (pies)": "object.19","Maestría del libro": "object.20","Bonificador al ataque": "object.21","Bonificador al daño": "object.22","Propiedades": "object.23","Estadísticas de armadura": "object.24","Clase": "object.25","CA base / bonificador": "object.26","Máximo modificador de Destreza": "object.27","Fuerza mínima": "object.28","Desventaja en Sigilo": "object.29","Tiempo para equipar": "object.30","Tiempo para quitar": "object.31","Juego y variantes": "object.32","Herramienta": "object.33","Competencia asociada": "object.34","Prueba o característica": "object.35","Variantes (una por línea)": "object.36","Contenido y almacenamiento": "object.37","Capacidad (lb)": "object.38","Cantidad de usos": "object.39","Objetos incluidos": "object.40","Objeto incluido": "object.41","Seleccioná un objeto": "object.42","Objeto sin nombre": "object.43","Cantidad": "object.44","Quitar": "object.45","Agregar objeto al contenido": "object.46","Efecto": "object.47","Duración": "object.48","Usos": "object.49","Conjuro vinculado": "object.50","Nivel del conjuro": "object.51","Requisitos de uso": "object.52","Armas compatibles": "object.53","Aplicación": "object.54","CD de salvación": "object.55","Daño": "object.56","Velocidad (pies)": "object.57","Capacidad de carga (lb)": "object.58","Estadísticas o referencia": "object.59","Medio": "object.60","Velocidad": "object.61","Capacidad": "object.62","Tripulación": "object.63","Material": "object.64","Clasificación de tesoro": "object.65","Tipo de foco": "object.66","Efectos": "object.67","Propiedades adicionales": "object.68","Propiedades mágicas": "object.69","Requiere vinculación": "object.70","Requisitos de vinculación": "object.71","Cargas máximas": "object.72","Recuperación de cargas": "object.73","Conjuros asociados": "object.74","Efectos pasivos y activables": "object.75","Resistencias e inmunidades": "object.76","Maldiciones o restricciones": "object.77","Objeto base": "object.78","Ninguno": "object.79","Reglas y notas adicionales": "object.80","Sin seleccionar": "object.81","Arma": "object.82","Armadura o escudo": "object.83","Juego": "object.84","Equipo de aventura": "object.85","Paquete de equipo": "object.86","Poción": "object.87","Pergamino": "object.88","Munición": "object.89","Veneno": "object.90","Montura": "object.91","Vehículo": "object.92","Tesoro": "object.93","Anillo": "object.94","Varita": "object.95","Bastón": "object.96","Cetro": "object.97","Objeto personalizado": "object.98","Sin rareza": "object.99","Común": "object.100","Poco común": "object.101","Raro": "object.102","Muy raro": "object.103","Legendario": "object.104","Artefacto": "object.105","Variable": "object.106","Ligera": "object.107","Pesada": "object.108","Sutil": "object.109","Arrojadiza": "object.110","Versátil": "object.111","A dos manos": "object.112","Alcance": "object.113","Carga": "object.114","Especial": "object.115","Contundente": "object.116","Cortante": "object.117","Perforante": "object.118","Ácido": "object.119","Frío": "object.120","Fuego": "object.121","Fuerza": "object.122","Relámpago": "object.123","Necrótico": "object.124","Psíquico": "object.125","Radiante": "object.126","Trueno": "object.127","Simple": "object.128","Marcial": "object.129","Otra": "object.130","Cuerpo a cuerpo": "object.131","A distancia": "object.132","Media": "object.133","Escudo": "object.134","Contacto": "object.135","Ingerido": "object.136","Inhalado": "object.137","Herida": "object.138","Terrestre": "object.139","Acuático": "object.140","Aéreo": "object.141","Espacial": "object.142"}
const texto = (v: unknown) => typeof v === 'string' ? v : v == null ? '' : String(v)
const lista = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

export default function ObjetoForm({ elemento, objetos, caracteristicas = [], onChange }: Props) {
  const { t } = useLanguage()
  const datos: Datos = elemento.datos ?? {}
  const propiedadesDisponibles = caracteristicas.filter(c => c.tipo === 'propiedad_arma')
  const maestriasDisponibles = caracteristicas.filter(c => c.tipo === 'maestria_arma')
  const tipo = texto(datos.tipo) || 'equipo'
  const actualizar = (campo: string, valor: unknown) => onChange({ ...elemento, datos: { ...datos, [campo]: valor } })
  const campo = (nombre: string, clave: string, placeholder = '') => <label className="nueva-propuesta-field">{nombre}<input value={texto(datos[clave])} placeholder={placeholder} onChange={e => actualizar(clave, e.target.value)}/></label>
  const numero = (nombre: string, clave: string, minimo = 0) => <label className="nueva-propuesta-field objeto-form__number">{nombre}<input type="number" min={minimo} step="any" value={datos[clave] == null ? '' : texto(datos[clave])} onChange={e => actualizar(clave, e.target.value === '' ? null : Number(e.target.value))}/></label>
  const seleccionar = (nombre: string, clave: string, opciones: string[]) => <label className="nueva-propuesta-field">{nombre}<select value={texto(datos[clave])} onChange={e => actualizar(clave, e.target.value)}>{opciones.map(op => <option key={op} value={op}>{op ? (etiquetasObjeto[op] ? t(etiquetasObjeto[op]) : op) : t(etiquetasObjeto['Sin seleccionar'])}</option>)}</select></label>
  const seleccionarMaestria = () => <label className="nueva-propuesta-field">{t('weapon.mastery')}<select value={texto(datos.maestria)} onChange={e => actualizar('maestria', e.target.value)}>{maestrias.map(value => <option key={value} value={value}>{value ? t(('weapon.' + value.toLowerCase()) as 'weapon.cleave') : t('weapon.none')}</option>)}</select></label>
  const marcar = (nombre: string, clave: string) => <label className="objeto-form__checkbox"><input type="checkbox" checked={datos[clave] === true} onChange={e => actualizar(clave, e.target.checked)}/>{nombre}</label>
  const relacionados = Array.isArray(datos.contenido) ? datos.contenido as {objetoId:string;cantidad:number}[] : []
  const variantes = Array.isArray(datos.variantes) ? datos.variantes as string[] : []

  return <div className="objeto-form">
    <h3>{t('object.0')}</h3>
    <div className="nueva-propuesta-field"><label>{t('object.1')}</label><select value={tipo} onChange={e => actualizar('tipo',e.target.value)}>{tipos.map(([id,nombre])=><option key={id} value={id}>{t(etiquetasObjeto[nombre])}</option>)}</select></div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
      {campo(t('object.2'),'subtipo','Clasificación específica')}
      {seleccionar(t('object.4'),'rareza',rarezas)}
      {numero(t('object.5'),'precio')}
      {seleccionar(t('object.6'),'moneda',['PC','PP','PE','PO','PPT'])}
      {numero(t('object.7'),'peso')}
      {campo(t('object.8'),'pagina')}
    </div>
    {marcar(t('object.9'),'magico')}
    {marcar(t('object.10'),'consumible')}
    {campo(t('object.11'),'imagen')}
    {tipo === 'arma' && <section className="objeto-form__section">
      <h3>{t('object.12')}</h3>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
        {seleccionar(t('object.13'),'competencia',['Simple','Marcial','Otra'])}
        {seleccionar(t('object.14'),'modalidad',['Cuerpo a cuerpo','A distancia'])}
        {campo(t('object.15'),'dadosDanio','1d6')}
        {seleccionar(t('object.16'),'tipoDanio',danos)}
        {campo(t('object.17'),'danioVersatil','1d8')}
        {numero(t('object.18'),'alcanceNormal')}
        {numero(t('object.19'),'alcanceLargo')}
        {maestriasDisponibles.length > 0 ? <label className="nueva-propuesta-field">{t('object.20')}<select value={texto(datos.maestriaCaracteristicaId)} onChange={e=>actualizar('maestriaCaracteristicaId',e.target.value)}><option value="">{t('object.81')}</option>{maestriasDisponibles.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label> : seleccionarMaestria()}
        {numero(t('object.21'),'bonoAtaque',-20)}
        {numero(t('object.22'),'bonoDanio',-20)}
      </div>
      <strong>{t('object.23')}</strong>
      <div className="objeto-form__checks">{propiedadesDisponibles.length > 0 ? propiedadesDisponibles.map(prop=><label key={prop.id} className="objeto-form__checkbox"><input type="checkbox" checked={lista(datos.propiedadCaracteristicaIds).includes(prop.id)} onChange={e=>actualizar('propiedadCaracteristicaIds',e.target.checked?[...lista(datos.propiedadCaracteristicaIds),prop.id]:lista(datos.propiedadCaracteristicaIds).filter(id=>id!==prop.id))}/>{prop.nombre}</label>) : propiedadesArma.map(prop=><label key={prop} className="objeto-form__checkbox"><input type="checkbox" checked={lista(datos.propiedades).includes(prop)} onChange={e=>actualizar('propiedades',e.target.checked?[...lista(datos.propiedades),prop]:lista(datos.propiedades).filter(p=>p!==prop))}/>{etiquetasObjeto[prop] ? t(etiquetasObjeto[prop]) : prop}</label>)}</div>
    </section>}
    {tipo === 'armadura' && <section style={{display:'grid',gap:12}}>
      <h3>{t('object.24')}</h3>
      {seleccionar(t('object.25'),'claseArmadura',['Ligera','Media','Pesada','Escudo'])}
      {numero(t('object.26'),'ca')}
      {numero(t('object.27'),'destrezaMaxima')}
      {numero(t('object.28'),'fuerzaMinima')}
      {marcar(t('object.29'),'sigiloDesventaja')}
      {campo(t('object.30'),'tiempoEquipar')}
      {campo(t('object.31'),'tiempoQuitar')}
    </section>}
    {(tipo === 'herramienta' || tipo === 'juego') && <section style={{display:'grid',gap:12}}>
      <h3>{t(etiquetasObjeto[tipo === 'juego' ? 'Juego y variantes' : 'Herramienta'])}</h3>
      {campo(t('object.34'),'competenciaAsociada')}
      {campo(t('object.35'),'prueba')}
      <label className="nueva-propuesta-field">{t('object.36')}
        <textarea rows={4} value={variantes.join('\n')} onChange={e=>actualizar('variantes',e.target.value.split('\n').map(v=>v.trim()).filter(Boolean))}/>
      </label>
    </section>}
    {(tipo === 'paquete' || tipo === 'equipo') && <section style={{display:'grid',gap:12}}>
      <h3>{t('object.37')}</h3>
      {numero(t('object.38'),'capacidad')}
      {numero(t('object.39'),'usos')}
      <strong>{t('object.40')}</strong>
      {relacionados.map((r,i)=><div key={i} className="objeto-form__included-row">
        <select className="objeto-form__included-select" aria-label={t('object.41')} value={r.objetoId} onChange={e=>actualizar('contenido',relacionados.map((x,j)=>j===i?{...x,objetoId:e.target.value}:x))}>
          <option value="">{t('object.42')}</option>{objetos.filter(o=>o.id!==elemento.id).map(o=><option key={o.id} value={o.id}>{o.nombre || 'Objeto sin nombre'}</option>)}
        </select>
        <input className="objeto-form__included-quantity" aria-label={t('object.44')} type="number" min={1} value={r.cantidad} onChange={e=>actualizar('contenido',relacionados.map((x,j)=>j===i?{...x,cantidad:Math.max(1,Number(e.target.value)||1)}:x))}/>
        <button className="objeto-form__remove" type="button" onClick={()=>actualizar('contenido',relacionados.filter((_,j)=>j!==i))}>{t('object.45')}</button>
      </div>)}
      <button className="objeto-form__add" type="button" onClick={()=>actualizar('contenido',[...relacionados,{objetoId:'',cantidad:1}])}>{t('object.46')}</button>
    </section>}
    {tipo === 'pocion' && <section>{campo(t('object.47'),'efecto')}{campo(t('object.48'),'duracion')}{numero(t('object.49'),'usos')}</section>}
    {tipo === 'pergamino' && <section>{campo(t('object.50'),'conjuro')}{numero(t('object.51'),'nivelConjuro')}{campo(t('object.52'),'requisitos')}</section>}
    {tipo === 'municion' && <section>{campo(t('object.53'),'compatibilidad')}{campo(t('object.23'),'propiedadesTexto')}</section>}
    {tipo === 'veneno' && <section>{seleccionar(t('object.54'),'aplicacion',['Contacto','Ingerido','Inhalado','Herida'])}{numero(t('object.55'),'cd')}{campo(t('object.56'),'dadosDanio')}{campo(t('object.48'),'duracion')}</section>}
    {tipo === 'montura' && <section>{numero(t('object.57'),'velocidad')}{numero(t('object.58'),'capacidad')}{campo(t('object.59'),'estadisticas')}</section>}
    {tipo === 'vehiculo' && <section>{seleccionar(t('object.60'),'medio',['Terrestre','Acuático','Aéreo','Espacial'])}{campo(t('object.61'),'velocidad')}{numero(t('object.62'),'capacidad')}{numero(t('object.63'),'tripulacion')}</section>}
    {tipo === 'tesoro' && <section>{campo(t('object.64'),'material')}{campo(t('object.65'),'clasificacionTesoro')}</section>}
    {['anillo','varita','baston','cetro'].includes(tipo) && <section>{campo(t('object.66'),'foco')}{campo(t('object.67'),'efectos')}</section>}
    {tipo === 'personalizado' && <section>{campo(t('object.68'),'propiedadesTexto')}</section>}
    {datos.magico === true && <section style={{display:'grid',gap:12}}>
      <h3>{t('object.69')}</h3>
      {marcar(t('object.70'),'vinculacion')}
      {campo(t('object.71'),'requisitosVinculacion')}
      {numero(t('object.72'),'cargasMaximas')}
      {campo(t('object.73'),'recuperacion')}
      {campo(t('object.74'),'conjurosAsociados')}
      {campo(t('object.75'),'efectosMagicos')}
      {campo(t('object.76'),'resistencias')}
      {campo(t('object.77'),'maldiciones')}
      <label className="nueva-propuesta-field">{t('object.78')}<select value={texto(datos.objetoBaseId)} onChange={e=>actualizar('objetoBaseId',e.target.value)}><option value="">{t('object.79')}</option>{objetos.filter(o=>o.id!==elemento.id).map(o=><option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
    </section>}
    <label className="nueva-propuesta-field">{t('object.80')}<textarea rows={5} value={texto(datos.reglas)} onChange={e=>actualizar('reglas',e.target.value)}/></label>
  </div>
}
