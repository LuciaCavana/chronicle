import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import '../../styles/compartido/CampoNumero.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Campo de número con sus propias flechas para subir y bajar (las del navegador no se pueden
 * pintar y en modo oscuro se ven blancas). Se usa igual que un <input type="number">: las flechas
 * respetan min, max y step y avisan el cambio por onChange. El campo conserva su ancho: si ocupa
 * todo el renglón las flechas van al final; si es angosto, el recuadro se ajusta a él.
 */
export default function CampoNumero({ className, ...props }: Props) {
  const campo = useRef<HTMLInputElement>(null)
  const caja = useRef<HTMLSpanElement>(null)
  const [angosto, setAngosto] = useState(false)
  useLayoutEffect(() => {
    const el = campo.current, envoltorio = caja.current
    if (!el || !envoltorio || angosto) return
    // Con el recuadro a lo ancho, un campo de ancho fijo queda más angosto que él. Se vuelve a
    // mirar si cambia de tamaño (por ejemplo, si estaba en una pestaña oculta).
    const medir = () => { if (el.offsetWidth > 0 && el.offsetWidth < envoltorio.clientWidth - 2) setAngosto(true) }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(medir)
    observador.observe(envoltorio)
    return () => observador.disconnect()
  }, [angosto])
  const pasar = (sentido: 1 | -1) => {
    const el = campo.current
    if (!el || el.disabled || el.readOnly) return
    try { if (sentido > 0) el.stepUp(); else el.stepDown() } catch { return }
    // Mismo aviso que al escribir: React lo recibe como onChange.
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.focus()
  }
  const bloqueado = props.disabled || props.readOnly
  return <span ref={caja} className={`campo-numero${angosto ? ' campo-numero--angosto' : ''}${props.disabled ? ' campo-numero--deshabilitado' : ''}`}>
    <input {...props} ref={campo} type="number" className={['campo-numero__campo', className].filter(Boolean).join(' ')} />
    <span className="campo-numero__flechas">
      <button type="button" tabIndex={-1} aria-hidden="true" disabled={bloqueado} onMouseDown={e => e.preventDefault()} onClick={() => pasar(1)}><ChevronUp size={13} /></button>
      <button type="button" tabIndex={-1} aria-hidden="true" disabled={bloqueado} onMouseDown={e => e.preventDefault()} onClick={() => pasar(-1)}><ChevronDown size={13} /></button>
    </span>
  </span>
}
