import { useEffect, useRef, useState } from 'react'
import { Baseline, Highlighter, Copy, X } from 'lucide-react'
import '../../styles/EditorDescripcion.css'

const PREDEFINIDOS = ['#FFFFFF', '#E9C46A', '#EF7777', '#7FC9F2', '#9CDBA2', '#C6A1F5', '#F3A86C', '#202020', '#E8DFCF']
type Props = { value: string; onChange: (value: string) => void }

function hsvAHex(h: number, s: number, v: number) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
  const rgb = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x]
  return '#' + rgb.map(n => Math.round((n+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase()
}
function hexAHsv(hex: string): [number, number, number] {
  const [r,g,b] = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255)
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min
  let h=0
  if(d) h = max===r ? ((g-b)/d)%6 : max===g ? (b-r)/d+2 : (r-g)/d+4
  return [((h*60)%360+360)%360,max===0?0:d/max,max]
}
const escapeHtml = (value: string) => value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const normalizar = (value: string) => /^\s*</.test(value) ? value : value.split(/\r?\n/).map(p => '<p>'+escapeHtml(p || ' ')+'</p>').join('')
const ETIQUETAS = new Set(['P','DIV','BR','STRONG','B','EM','I','U','UL','OL','LI','SPAN','FONT','H2','H3','BLOCKQUOTE'])
function limpiarHtml(html: string) {
  const doc = new DOMParser().parseFromString(html,'text/html')
  function limpiar(nodo: Element) {
    for (const hijo of Array.from(nodo.children)) {
      if (!ETIQUETAS.has(hijo.tagName)) {
        const texto = doc.createTextNode(hijo.textContent || '')
        hijo.replaceWith(texto)
        continue
      }
      const color = (hijo as HTMLElement).style.color
      const fondo = (hijo as HTMLElement).style.backgroundColor
      const fontColor = hijo.tagName === 'FONT' ? hijo.getAttribute('color') : null
      for (const atributo of Array.from(hijo.attributes)) hijo.removeAttribute(atributo.name)
      const valido = (v: string) => /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(v)
      if (valido(color || '')) (hijo as HTMLElement).style.color = color
      if (valido(fondo || '')) (hijo as HTMLElement).style.backgroundColor = fondo
      if (fontColor && valido(fontColor)) (hijo as HTMLElement).style.color = fontColor
      limpiar(hijo)
    }
  }
  limpiar(doc.body)
  return doc.body.innerHTML
}
export function EditorDescripcion({value,onChange}:Props) {
  const editable=useRef<HTMLDivElement>(null)
  const seleccion=useRef<Range|null>(null)
  const historialColor=useRef<string[]>([])
  const rehacerColor=useRef<string[]>([])
  const [tipo,setTipo]=useState<'letra'|'fondo'|null>(null)
  const [h,setH]=useState(0),[s,setS]=useState(0.8),[v,setV]=useState(0.8)
  const [hex,setHex]=useState('#CC3333')
  const [copiado,setCopiado]=useState(false)
  const color=hsvAHex(h,s,v)
  useEffect(()=>{if(editable.current && editable.current.innerHTML!==normalizar(value)) editable.current.innerHTML=limpiarHtml(normalizar(value))},[]) // solo al montar; no interrumpe el cursor
  const emitir=()=>onChange(limpiarHtml(editable.current?.innerHTML || ''))
  const guardarSeleccion=()=>{const sel=window.getSelection();if(sel?.rangeCount && editable.current?.contains(sel.anchorNode)) seleccion.current=sel.getRangeAt(0).cloneRange()}
  const restaurarSeleccion=()=>{editable.current?.focus();if(seleccion.current){const sel=window.getSelection();sel?.removeAllRanges();sel?.addRange(seleccion.current)}}
  const ejecutar=(cmd:string,arg?:string)=>{restaurarSeleccion();document.execCommand(cmd,false,arg);guardarSeleccion();emitir()}
  const aplicarColor=(valor:string)=>{
    if(!tipo || !editable.current || !seleccion.current || seleccion.current.collapsed)return
    const antes=editable.current.innerHTML
    ejecutar(tipo==='fondo'?'hiliteColor':'foreColor',valor)
    if(editable.current.innerHTML!==antes){
      historialColor.current.push(antes)
      if(historialColor.current.length>100)historialColor.current.shift()
      rehacerColor.current=[]
    }
  }
  const navegarColor=(rehacer:boolean)=>{
    const origen=rehacer?rehacerColor.current:historialColor.current
    const destino=rehacer?historialColor.current:rehacerColor.current
    const anterior=origen.pop()
    if(anterior===undefined || !editable.current)return false
    destino.push(editable.current.innerHTML)
    editable.current.innerHTML=anterior
    seleccion.current=null
    emitir()
    editable.current.focus()
    return true
  }
  const actualizarColor=(hh:number,ss:number,vv:number)=>{setH(hh);setS(ss);setV(vv);const nuevo=hsvAHex(hh,ss,vv);setHex(nuevo);aplicarColor(nuevo)}
  const cambiarHue=(e:React.PointerEvent<HTMLDivElement>)=>{const rect=e.currentTarget.getBoundingClientRect();actualizarColor(Math.min(359.99,Math.max(0,(e.clientX-rect.left)/rect.width*360)),s,v)}
  const cambiarSV=(e:React.PointerEvent<HTMLDivElement>)=>{const rect=e.currentTarget.getBoundingClientRect();actualizarColor(h,Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),1-Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height)))}
  const arrastrar=(e:React.PointerEvent<HTMLDivElement>,fn:(e:React.PointerEvent<HTMLDivElement>)=>void)=>{e.currentTarget.setPointerCapture(e.pointerId);fn(e)}
  return <div className="editor-descripcion" onKeyDown={e=>{
    if(!(e.ctrlKey||e.metaKey)||e.altKey)return
    const key=e.key.toLowerCase()
    if((key==='z' && navegarColor(e.shiftKey)) || (key==='y' && navegarColor(true))){
      e.preventDefault()
      e.stopPropagation()
    }
  }}>
    <div className="editor-descripcion__barra" onMouseDown={e=>e.preventDefault()}>
      <button type="button" title="Negrita" onClick={()=>ejecutar('bold')}><b>N</b></button>
      <button type="button" title="Cursiva" onClick={()=>ejecutar('italic')}><i>C</i></button>
      <button type="button" title="Subrayado" onClick={()=>ejecutar('underline')}><u>S</u></button>
      <button type="button" title="Lista con viñetas" onClick={()=>ejecutar('insertUnorderedList')}>• Lista</button>
      <button type="button" title="Lista numerada" onClick={()=>ejecutar('insertOrderedList')}>1. Lista</button>
      <button type="button" title="Deshacer" onClick={()=>{if(!navegarColor(false))ejecutar('undo')}}>↶</button>
      <button type="button" title="Rehacer" onClick={()=>{if(!navegarColor(true))ejecutar('redo')}}>↷</button>
      <button type="button" title="Color de letra" aria-expanded={tipo==='letra'} onClick={()=>{guardarSeleccion();setCopiado(false);setTipo(tipo==='letra'?null:'letra')}}><Baseline size={18} color={color}/></button>
      <button type="button" title="Color de fondo" aria-expanded={tipo==='fondo'} onClick={()=>{guardarSeleccion();setCopiado(false);setTipo(tipo==='fondo'?null:'fondo')}}><Highlighter size={18} color={color}/></button>
    </div>
    {tipo && <div className="editor-descripcion__selector" role="dialog" aria-label="Selector de color" onMouseDown={e=>{if(!(e.target instanceof HTMLInputElement))e.preventDefault()}}>
      <div className="editor-descripcion__selector-titulo"><strong>{tipo==='letra'?'Color de letra':'Color de fondo'}</strong><button type="button" title="Cerrar selector" onClick={()=>setTipo(null)}><X size={16}/></button></div>
      <div className="editor-descripcion__cuadro" style={{backgroundColor:`hsl(${h},100%,50%)`}} onPointerDown={e=>arrastrar(e,cambiarSV)} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))cambiarSV(e)}}>
        <div className="editor-descripcion__blanco"/><div className="editor-descripcion__negro"/>
        <div className="editor-descripcion__cursor" style={{left:`${s*100}%`,top:`${(1-v)*100}%`}}/>
      </div>
      <div className="editor-descripcion__espectro" onPointerDown={e=>arrastrar(e,cambiarHue)} onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))cambiarHue(e)}}>
        <div className="editor-descripcion__marcador" style={{left:`${h/360*100}%`}}/>
      </div>
      <div className="editor-descripcion__predefinidos">{PREDEFINIDOS.map(c=><button key={c} type="button" title={c} style={{background:c}} onClick={()=>{const [hh,ss,vv]=hexAHsv(c);actualizarColor(hh,ss,vv)}} />)}</div>
      <div className="editor-descripcion__hex"><span style={{background:color}}/><input aria-label="Color hexadecimal" value={hex} onChange={e=>{const val=e.target.value;setHex(val);if(/^#[0-9a-fA-F]{6}$/.test(val)){const [hh,ss,vv]=hexAHsv(val);actualizarColor(hh,ss,vv)}}}/><button type="button" title="Copiar color hexadecimal" onClick={()=>{void navigator.clipboard.writeText(color).then(()=>setCopiado(true)).catch(()=>setCopiado(false))}}><Copy size={15}/>{copiado?" Copiado":" Copiar color"}</button></div>

    </div>}
    <div ref={editable} className="editor-descripcion__contenido" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="Descripción de la característica" onInput={emitir} onPaste={e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));emitir()}} onKeyUp={guardarSeleccion} onMouseUp={guardarSeleccion} onBlur={guardarSeleccion}/>
  </div>
}
