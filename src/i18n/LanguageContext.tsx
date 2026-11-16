import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { translations, type Language, type TranslationKey } from './translations'

type LanguageContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}
const LanguageContext = createContext<LanguageContextValue | null>(null)
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
  const t = (key: TranslationKey) => translations[language][key] ?? translations.es[key]
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage requires LanguageProvider')
  return context
}
