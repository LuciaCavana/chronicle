import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from './translations'
import { LanguageContext } from './useLanguage'

const STORAGE_KEY = 'chronicle.interfaceLanguage'

function initialLanguage(): Language {
  try { return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'es' } catch { return 'es' }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(initialLanguage)
  useEffect(() => {
    document.documentElement.lang = language
    try { localStorage.setItem(STORAGE_KEY, language) } catch { /* Storage unavailable */ }
  }, [language])
  // Estable mientras no cambie el idioma: se puede usar como dependencia de efectos.
  const t = useCallback(
    (key: TranslationKey) => translations[language][key] ?? translations.es[key],
    [language]
  )
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
