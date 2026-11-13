import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import '../../styles/ModalBorrador.css'

type Props = { titulo: string; onClose: () => void; children: ReactNode }
export default function ModalBorrador({ titulo, onClose, children }: Props) {
 useEffect(() => {
  const cerrar = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', cerrar)
  const anterior = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  return () => { document.removeEventListener('keydown', cerrar); document.body.style.overflow = anterior }
 }, [onClose])
 return createPortal(
  <div className="chronicle-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
   <div className="chronicle-modal" role="dialog" aria-modal="true" aria-label={titulo}>
    {children}
   </div>
  </div>, document.body)
}
