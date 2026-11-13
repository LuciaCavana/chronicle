import { useEffect, useState, type FormEvent } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '../lib/supabase'

type ProfileData = {
  id: string
  display_name: string
  username: string
  bio: string
  created_at: string
  avatar_url: string | null
}

export default function Profile() {
  const { session } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) { setLoading(false); return }
    let active = true
    void (async () => {
      const { data, error: loadError } = await supabase
        .from('profiles')
        .select('id,display_name,username,bio,created_at,avatar_url')
        .eq('id', userId)
        .single()
      if (!active) return
      if (loadError || !data) {
        setError('No se pudo cargar tu perfil.')
      } else {
        const value = data as ProfileData
        setProfile(value)
        setDisplayName(value.display_name)
        setUsername(value.username)
        setBio(value.bio)
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [session?.user.id])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || saving || !session) return
    const name = displayName.trim()
    const handle = username.trim().toLowerCase()
    if (!name || name.length > 80) { setError('El nombre visible debe tener entre 1 y 80 caracteres.'); return }
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) { setError('El usuario debe tener entre 3 y 30 caracteres: letras minúsculas, números o guion bajo.'); return }
    if (bio.length > 500) { setError('La biografía no puede superar 500 caracteres.'); return }
    setSaving(true)
    setError('')
    setMessage('')
    const { data, error: saveError } = await supabase
      .from('profiles')
      .update({ display_name: name, username: handle, bio })
      .eq('id', session.user.id)
      .select('id,display_name,username,bio,created_at,avatar_url')
      .single()
    if (saveError) {
      setError(saveError.code === '23505' ? 'Ese nombre de usuario ya está ocupado.' : 'No se pudieron guardar los cambios.')
    } else if (data) {
      setProfile(data as ProfileData)
      setDisplayName(data.display_name)
      setUsername(data.username)
      setBio(data.bio)
      setMessage('Perfil actualizado correctamente.')
    }
    setSaving(false)
  }

  return (
    <AppLayout title="Mi perfil" subtitle="Administrá tu identidad en Chronicle">
      {loading ? <p>Cargando perfil...</p> : !profile ? <p role="alert">{error || 'No se encontró el perfil.'}</p> : (
        <form onSubmit={save} style={{ maxWidth: 620, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div aria-label="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', background: '#554936', display: 'grid', placeItems: 'center', fontSize: 28, overflow: 'hidden' }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar de perfil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
            </div>
            <div><strong>{profile.display_name || profile.username}</strong><div>@{profile.username}</div></div>
          </div>
          <label htmlFor="profile-display-name">Nombre visible</label>
          <input id="profile-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} required />
          <label htmlFor="profile-username">Nombre de usuario</label>
          <input id="profile-username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} maxLength={30} required />
          <label htmlFor="profile-bio">Biografía</label>
          <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={5} style={{ resize: 'vertical', font: 'inherit' }} />
          <small>{bio.length}/500 caracteres</small>
          <p>Miembro desde {new Date(profile.created_at).toLocaleDateString('es-AR')}</p>
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </form>
      )}
    </AppLayout>
  )
}
