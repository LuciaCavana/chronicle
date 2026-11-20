import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { Link } from 'react-router-dom'
import { Camera, Settings, Trash2 } from 'lucide-react'
import '../styles/paginas/Profile.css'
import { useAuth } from '../contexts/useAuth'
import { supabase } from '../lib/supabase'
import { cambiarAvatar, quitarAvatar, urlAvatar } from '../services/avatar'
import { useLanguage } from '../i18n/useLanguage'
import { actualizarPerfilSesion } from '../hooks/usePerfilSesion'
import { coberturaTraduccion } from '../i18n/cobertura'

type ProfileData = {
  id: string
  display_name: string
  username: string
  bio: string
  created_at: string
  avatar_url: string | null
  avatar_source: string | null
}

export default function Profile() {
  const { session } = useAuth()
  const { language, t } = useLanguage()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const selectorFoto = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) return
    let active = true
    void (async () => {
      const { data, error: loadError } = await supabase
        .from('profiles')
        .select('id,display_name,username,bio,created_at,avatar_url,avatar_source')
        .eq('id', userId)
        .single()
      if (!active) return
      if (loadError || !data) {
        setError(t('profile.loadError'))
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
  }, [session?.user.id, t])

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile || saving || !session) return
    const name = displayName.trim()
    const handle = username.trim().toLowerCase()
    if (!name || name.length > 80) { setError(t('profile.nameError')); return }
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) { setError(t('profile.usernameError')); return }
    if (bio.length > 500) { setError(t('profile.bioError')); return }
    setSaving(true)
    setError('')
    setMessage('')
    const { data, error: saveError } = await supabase
      .from('profiles')
      .update({ display_name: name, username: handle, bio })
      .eq('id', session.user.id)
      .select('id,display_name,username,bio,created_at,avatar_url,avatar_source')
      .single()
    if (saveError) {
      setError(saveError.code === '23505' ? t('profile.usernameTaken') : t('profile.saveError'))
    } else if (data) {
      setProfile(data as ProfileData)
      setDisplayName(data.display_name)
      setUsername(data.username)
      setBio(data.bio)
      actualizarPerfilSesion({ nombre: data.display_name?.trim() || data.username || '' })
      setMessage(t('profile.saved'))
    }
    setSaving(false)
  }

  async function elegirFoto(event: ChangeEvent<HTMLInputElement>) {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo || !profile || !session || subiendoFoto) return
    setSubiendoFoto(true)
    setError('')
    setMessage('')
    try {
      const avatar = await cambiarAvatar(session.user.id, archivo, profile)
      setProfile(actual => actual ? { ...actual, ...avatar } : actual)
      setMessage(t('profile.photoUpdated'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.photoError'))
    } finally {
      setSubiendoFoto(false)
    }
  }

  async function eliminarFoto() {
    if (!profile || !session || subiendoFoto) return
    setSubiendoFoto(true)
    setError('')
    setMessage('')
    try {
      const avatar = await quitarAvatar(session.user.id, profile)
      setProfile(actual => actual ? { ...actual, ...avatar } : actual)
      setMessage(t('profile.photoDeleted'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.photoDeleteError'))
    } finally {
      setSubiendoFoto(false)
    }
  }

  const fotoPerfil = urlAvatar(profile)

  return (
    <AppLayout title={t('nav.profile')} subtitle={t('profile.subtitle')}>
      <div className="profile-page">
        {loading && session?.user.id ? <p>{t('profile.loading')}</p> : !profile ? <p role="alert" className="profile-alert profile-alert--error">{error || t('profile.notFound')}</p> : (
          <>
            <section className="profile-hero">
              <div className="profile-identity">
                <div className="profile-avatar-editor">
                  <div className="profile-avatar" aria-label={t('profile.avatar')}>
                    {fotoPerfil ? <img src={fotoPerfil} alt={t('profile.avatar')} /> : '👤'}
                  </div>
                  <div className="profile-avatar-actions">
                    <input ref={selectorFoto} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e => void elegirFoto(e)} />
                    <button type="button" className="profile-avatar-button" disabled={subiendoFoto} onClick={() => selectorFoto.current?.click()}>
                      <Camera size={15} aria-hidden="true" /> {subiendoFoto ? t('profile.saving') : fotoPerfil ? t('profile.changePhoto') : t('profile.uploadPhoto')}
                    </button>
                    {fotoPerfil && profile.avatar_source === 'upload' && (
                      <button type="button" className="profile-avatar-button profile-avatar-button--danger" disabled={subiendoFoto} onClick={() => void eliminarFoto()} aria-label={t('profile.removePhoto')} title={t('profile.removePhoto')}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <div className="profile-name">{profile.display_name || profile.username}</div>
                  <div className="profile-handle">@{profile.username}</div>
                  <div className="profile-meta">{t('profile.memberSince')} {new Date(profile.created_at).toLocaleDateString(language === 'es' ? 'es-AR' : 'en-US')}</div>
                </div>
              </div>
              <Link className="profile-settings-link" to="/configuracion"><Settings size={18} /> {t('nav.settings')}</Link>
            </section>
            <section className="profile-card">
              <h2>{t('profile.personalInfo')}</h2>
              <p className="profile-description">{t('profile.privateDescription')}</p>
              <form className="profile-form" onSubmit={save}>
                <div className="profile-field">
                  <label htmlFor="profile-display-name">{t('profile.displayName')}</label>
                  <input id="profile-display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} required />
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-username">{t('profile.username')}</label>
                  <input id="profile-username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} maxLength={30} required />
                  <span className="profile-help">{t('profile.usernameHelp')}</span>
                </div>
                <div className="profile-field">
                  <label htmlFor="profile-bio">{t('profile.bio')}</label>
                  <textarea id="profile-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={5} />
                  <span className="profile-help">{bio.length}/500 {t('profile.characters')}</span>
                </div>
                {error && <p role="alert" className="profile-alert profile-alert--error">{error}</p>}
                {message && <p role="status" className="profile-alert profile-alert--success">{message}</p>}
                <div className="profile-form-footer">
                  <span className="profile-meta">{t('profile.changesSaved')}</span>
                  <button className="profile-save" type="submit" disabled={saving}>{saving ? t('profile.saving') : t('profile.save')}</button>
                </div>
              </form>
            </section>
            <section className="profile-card" aria-labelledby="perfil-traduccion">
              <h2 id="perfil-traduccion">{t('profile.translation')}</h2>
              <p className="profile-description">{t('profile.translationDescription')}</p>
              <ul className="profile-traduccion">
                <li>
                  <div className="profile-traduccion__fila"><strong>{t('language.es')}</strong><span>100 % · {t('profile.translationBase')}</span></div>
                  <div className="profile-traduccion__barra" role="progressbar" aria-label={t('language.es')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><span style={{ width: '100%' }} /></div>
                </li>
                <li>
                  <div className="profile-traduccion__fila"><strong>{t('language.en')}</strong><span>{coberturaTraduccion.en.porcentaje.toLocaleString(language === 'es' ? 'es-AR' : 'en-US')} %</span></div>
                  <div className="profile-traduccion__barra" role="progressbar" aria-label={t('language.en')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coberturaTraduccion.en.porcentaje}><span style={{ width: `${coberturaTraduccion.en.porcentaje}%` }} /></div>
                  <span className="profile-meta">{coberturaTraduccion.en.traducidos} {t('profile.translationOf')} {coberturaTraduccion.en.total} · {coberturaTraduccion.en.total - coberturaTraduccion.en.traducidos} {t('profile.translationMissing')}</span>
                </li>
              </ul>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  )
}
