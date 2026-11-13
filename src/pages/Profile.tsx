import { useEffect, useState, type FormEvent } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import '../styles/Profile.css'
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
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) { setError('Escribí el usuario sin @. Debe tener entre 3 y 30 caracteres: letras minúsculas, números o guion bajo.'); return }
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
      <div className="profile-page">
        {loading ? <p>Cargando perfil...</p> : !profile ? <p role="alert" className="profile-alert profile-alert--error">{error || 'No se encontró el perfil.'}</p> : (
          <>
            <section className="profile-hero">
              <div className="profile-identity">
                <div className="profile-avatar" aria-label="Avatar">
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar de perfil" /> : '👤'}
                </div>
                <div>
                  <div className="profile-name">{profile.display_name || profile.username}</div>
                  <div className="profile-handle">@{profile.username}</div>
                  <div className="profile-meta">Miembro desde {new Date(profile.created_at).toLocaleDateString('es-AR')}</div>
                </div>
              </div>
              <Link className="profile-settings-link" to="/configuracion"><Settings size={18} /> Configuración</Link>
            </section>
            <section className="profile-card">
              <h2>Información personal</h2>
              <p className="profile-description">Estos datos son privados por ahora y solo vos podés modificarlos.</p>
              <form className="profile-form" onSubmit={save}>
                <div className="profile-field">
                  <label htmlFor="profile-display-name">Nombre visible</label>
                  <input id="profile-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} required />
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-username">Nombre de usuario</label>
                  <input id="profile-username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} maxLength={30} required />
                  <span className="profile-help">No escribas @: Chronicle lo agrega automáticamente al mostrar tu usuario. Usá entre 3 y 30 caracteres: letras, números o guion bajo.</span>
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-bio">Biografía</label>
                  <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={5} />
                  <span className="profile-help">{bio.length}/500 caracteres</span>
                </div>
                {error && <p role="alert" className="profile-alert profile-alert--error">{error}</p>}
                {message && <p role="status" className="profile-alert profile-alert--success">{message}</p>}
                <div className="profile-form-footer">
                  <span className="profile-meta">Tus cambios se guardan en Chronicle.</span>
                  <button className="profile-save" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
                </div>
              </form>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  )
}
