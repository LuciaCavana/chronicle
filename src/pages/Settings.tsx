import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../contexts/useAuth'
import '../styles/paginas/Profile.css'
import { useLanguage } from '../i18n/useLanguage'
import { coberturaTraduccion } from '../i18n/cobertura'

export default function Settings() {
  const { session, role } = useAuth()
  // El detalle de cuántos textos faltan traducir es para quienes administran la página.
  const esAdmin = role === 'creator' || role === 'admin'
  const { language, setLanguage, t } = useLanguage()
  return (
    <AppLayout title={t('settings.title')} subtitle={t('settings.subtitle')}>
      <div className="profile-page">
        <section className="profile-hero">
          <div>
            <h2 style={{ margin: '0 0 8px' }}>{t('settings.heading')}</h2>
            <p className="profile-description" style={{ margin: 0 }}>{t('settings.description')}</p>
          </div>
          <Link className="profile-settings-link" to="/perfil"><ArrowLeft size={18} /> {t('settings.back')}</Link>
        </section>
        <section className="profile-card">
          <h2><ShieldCheck size={19} aria-hidden="true" /> {t('settings.security')}</h2>
          <div className="profile-settings-grid">
            <div className="profile-settings-item">
              <div><strong>{t('settings.email')}</strong><p>{session?.user.email ?? t('settings.unavailable')}</p></div>
            </div>
            <div className="profile-settings-item">
              <div><strong>{t('settings.providers')}</strong><p>{t('settings.providersDescription')}</p></div>
              <span className="profile-settings-note">{t('settings.comingSoon')}</span>
            </div>
            <div className="profile-settings-item">
              <div><strong>{t('settings.privacy')}</strong><p>{t('settings.privacyDescription')}</p></div>
              <span className="profile-settings-note">{t('settings.private')}</span>
            </div>
          </div>
        </section>
        <section className="profile-card">
          <h2>{t('settings.language')}</h2>
          <div className="profile-settings-item">
            <div><strong>{t('settings.language')}</strong><p>{t('settings.languageDescription')}</p></div>
            <select aria-label={t('settings.language')} value={language} onChange={event => setLanguage(event.target.value as 'es' | 'en')}>
              <option value="es">{t('language.es')}</option>
              <option value="en">{t('language.en')}</option>
            </select>
          </div>
          <h3 className="profile-subtitulo">{t('profile.translation')}</h3>
          <p className="profile-description">{t('profile.translationDescription')}</p>
          {/* Solo el idioma elegido arriba. */}
          {language === 'es'
            ? <div className="profile-traduccion">
                <div className="profile-traduccion__fila"><strong>{t('language.es')}</strong><span>100 % · {t('profile.translationBase')}</span></div>
                <div className="profile-traduccion__barra" role="progressbar" aria-label={t('language.es')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><span style={{ width: '100%' }} /></div>
              </div>
            : <div className="profile-traduccion">
                <div className="profile-traduccion__fila"><strong>{t('language.en')}</strong><span>{coberturaTraduccion.en.porcentaje.toLocaleString('en-US')} %</span></div>
                <div className="profile-traduccion__barra" role="progressbar" aria-label={t('language.en')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coberturaTraduccion.en.porcentaje}><span style={{ width: `${coberturaTraduccion.en.porcentaje}%` }} /></div>
                {esAdmin && <span className="profile-meta">{coberturaTraduccion.en.traducidos} {t('profile.translationOf')} {coberturaTraduccion.en.total} · {coberturaTraduccion.en.total - coberturaTraduccion.en.traducidos} {t('profile.translationMissing')}</span>}
              </div>}
        </section>
      </div>
    </AppLayout>
  )
}
