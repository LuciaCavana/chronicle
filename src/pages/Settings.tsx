import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { useAuth } from '../contexts/useAuth'
import '../styles/Profile.css'
import { useLanguage } from '../i18n/LanguageContext'

export default function Settings() {
  const { session } = useAuth()
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
        </section>
      </div>
    </AppLayout>
  )
}
