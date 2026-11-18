import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from '../lib/supabase'
import { EVENTO_AVATAR, urlAvatar, type AvatarPerfil } from '../services/avatar'

/**
 * Nombre y foto del usuario conectado, compartidos por toda la app.
 * Se piden a Supabase una sola vez por sesión y se guardan en sessionStorage,
 * así la cabecera no vuelve a consultarlos (ni parpadea) al cambiar de página.
 * Se actualizan solos al cambiar la foto o el nombre, y se borran al cerrar sesión.
 */
export type PerfilSesion = { userId: string; nombre: string; avatar: string | null }

const CLAVE = 'chronicle.perfilSesion'
const oyentes = new Set<() => void>()
let actual: PerfilSesion | null = leer()
let cargandoPara: string | null = null

function leer(): PerfilSesion | null {
  try {
    const texto = sessionStorage.getItem(CLAVE)
    return texto ? JSON.parse(texto) as PerfilSesion : null
  } catch {
    return null
  }
}

function guardar(perfil: PerfilSesion | null) {
  actual = perfil
  try {
    if (perfil) sessionStorage.setItem(CLAVE, JSON.stringify(perfil))
    else sessionStorage.removeItem(CLAVE)
  } catch { /* Almacenamiento no disponible: queda solo en memoria */ }
  oyentes.forEach(avisar => avisar())
}

/** Para avisar cambios hechos desde la pantalla de perfil. */
export function actualizarPerfilSesion(cambios: Partial<Omit<PerfilSesion, 'userId'>>) {
  if (actual) guardar({ ...actual, ...cambios })
}

async function cargar(userId: string) {
  if (cargandoPara === userId) return
  cargandoPara = userId
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name,username,avatar_url,avatar_source')
      .eq('id', userId)
      .maybeSingle()
    if (error) return
    const nombre = (data?.display_name as string | null | undefined)?.trim() || (data?.username as string | null | undefined) || ''
    guardar({ userId, nombre, avatar: urlAvatar(data as AvatarPerfil | null) })
  } finally {
    cargandoPara = null
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener(EVENTO_AVATAR, evento => actualizarPerfilSesion({ avatar: urlAvatar((evento as CustomEvent<AvatarPerfil>).detail) }))
  supabase.auth.onAuthStateChange(evento => { if (evento === 'SIGNED_OUT') guardar(null) })
}

const suscribir = (oyente: () => void) => { oyentes.add(oyente); return () => { oyentes.delete(oyente) } }
const obtener = () => actual

export function usePerfilSesion(userId: string | undefined): PerfilSesion | null {
  const perfil = useSyncExternalStore(suscribir, obtener, obtener)
  const vigente = Boolean(userId) && perfil?.userId === userId
  useEffect(() => {
    if (userId && !vigente) void cargar(userId)
  }, [userId, vigente])
  return vigente ? perfil : null
}
