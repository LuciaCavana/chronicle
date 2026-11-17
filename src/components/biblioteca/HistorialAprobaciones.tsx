import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Envio = {
  id: string
  enviado_en: string
  estado_revision: string
  resuelto_en: string | null
  motivo_resolucion: string | null
}

export default function HistorialAprobaciones({ propuestaId }: { propuestaId: string }) {
  const [envios, setEnvios] = useState<Envio[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let activo = true
    void (async () => {
      setCargando(true)
      const { data, error: fallo } = await supabase.from('propuesta_envios')
        .select('id,enviado_en,estado_revision,resuelto_en,motivo_resolucion')
        .eq('propuesta_id', propuestaId).order('enviado_en', { ascending: false })
      if (!activo) return
      if (fallo) setError(fallo.message)
      else setEnvios((data ?? []) as Envio[])
      setCargando(false)
    })()
    return () => { activo = false }
  }, [propuestaId])
  if (cargando) return <p>Cargando historial de aprobaciones...</p>
  if (error) return <p role="alert">{error}</p>
  if (!envios.length) return <p>Todavía no hay envíos a aprobación.</p>
  return <div className="historial-panel">
    {envios.map(envio => <article key={envio.id} className="libros-item">
      <div className="libros-item-info">
        <strong>{envio.estado_revision.replaceAll('_', ' ')}</strong>
        <p>Enviado: {new Date(envio.enviado_en).toLocaleString('es-AR')}</p>
        {envio.resuelto_en && <p>Resuelto: {new Date(envio.resuelto_en).toLocaleString('es-AR')}</p>}
        {envio.motivo_resolucion && <p>Motivo: {envio.motivo_resolucion}</p>}
      </div>
    </article>)}
  </div>
}
