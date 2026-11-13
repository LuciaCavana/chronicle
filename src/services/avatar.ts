import { supabase } from '../lib/supabase'

const BUCKET = 'avatares'
const LADO = 512
const MAXIMO_ORIGINAL = 10 * 1024 * 1024
const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export const EVENTO_AVATAR = 'chronicle:avatar-actualizado'

export type AvatarPerfil = { avatar_url: string | null; avatar_source: string | null }

/** Devuelve la URL para mostrar el avatar: las fotos subidas se guardan como ruta dentro del bucket. */
export function urlAvatar(perfil: AvatarPerfil | null): string | null {
  if (!perfil?.avatar_url) return null
  if (perfil.avatar_source === 'upload') {
    return supabase.storage.from(BUCKET).getPublicUrl(perfil.avatar_url).data.publicUrl
  }
  return perfil.avatar_url
}

function aBlob(lienzo: HTMLCanvasElement, tipo: string, calidad: number) {
  return new Promise<Blob | null>(resolve => lienzo.toBlob(resolve, tipo, calidad))
}

/** Recorta la imagen al centro en un cuadrado de 512 px y la convierte a WebP (o JPEG si el navegador no puede). */
async function prepararImagen(archivo: File): Promise<{ blob: Blob; extension: 'webp' | 'jpg' }> {
  if (!TIPOS_ACEPTADOS.includes(archivo.type)) throw new Error('Elegí una imagen JPG, PNG, WebP o GIF.')
  if (archivo.size > MAXIMO_ORIGINAL) throw new Error('La imagen no puede superar los 10 MB.')

  let imagen: ImageBitmap
  try {
    imagen = await createImageBitmap(archivo)
  } catch {
    throw new Error('No se pudo leer la imagen.')
  }

  const lado = Math.min(imagen.width, imagen.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO
  lienzo.height = LADO
  const contexto = lienzo.getContext('2d')
  if (!contexto) throw new Error('Tu navegador no permite procesar imágenes.')
  contexto.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  imagen.close()

  const webp = await aBlob(lienzo, 'image/webp', 0.85)
  if (webp?.type === 'image/webp') return { blob: webp, extension: 'webp' }
  const jpeg = await aBlob(lienzo, 'image/jpeg', 0.85)
  if (!jpeg) throw new Error('No se pudo convertir la imagen.')
  return { blob: jpeg, extension: 'jpg' }
}

async function borrarArchivoAnterior(anterior: AvatarPerfil | null) {
  if (anterior?.avatar_source !== 'upload' || !anterior.avatar_url) return
  // Si falla, solo queda un archivo huérfano; el perfil ya apunta al nuevo.
  await supabase.storage.from(BUCKET).remove([anterior.avatar_url])
}

function avisarCambio(perfil: AvatarPerfil) {
  window.dispatchEvent(new CustomEvent<AvatarPerfil>(EVENTO_AVATAR, { detail: perfil }))
}

/** Sube una foto nueva, la asigna al perfil y borra la anterior. */
export async function cambiarAvatar(usuarioId: string, archivo: File, anterior: AvatarPerfil | null): Promise<AvatarPerfil> {
  const { blob, extension } = await prepararImagen(archivo)
  // Nombre nuevo en cada subida: evita que el navegador muestre la foto vieja guardada en caché.
  const ruta = `${usuarioId}/avatar-${Date.now()}.${extension}`

  const { error: errorSubida } = await supabase.storage.from(BUCKET).upload(ruta, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
  })
  if (errorSubida) throw new Error('No se pudo subir la imagen.')

  const { data, error } = await supabase.from('profiles')
    .update({ avatar_url: ruta, avatar_source: 'upload' })
    .eq('id', usuarioId)
    .select('avatar_url,avatar_source')
    .single()
  if (error || !data) {
    await supabase.storage.from(BUCKET).remove([ruta])
    throw new Error('No se pudo guardar la foto en tu perfil.')
  }

  await borrarArchivoAnterior(anterior)
  avisarCambio(data)
  return data
}

/** Quita la foto del perfil y borra el archivo. */
export async function quitarAvatar(usuarioId: string, anterior: AvatarPerfil | null): Promise<AvatarPerfil> {
  const { data, error } = await supabase.from('profiles')
    .update({ avatar_url: null, avatar_source: null })
    .eq('id', usuarioId)
    .select('avatar_url,avatar_source')
    .single()
  if (error || !data) throw new Error('No se pudo quitar la foto.')
  await borrarArchivoAnterior(anterior)
  avisarCambio(data)
  return data
}
