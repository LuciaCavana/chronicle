export type Language = 'es' | 'en'
export const translations = {
  es: {
    'nav.profile':'Mi perfil','nav.settings':'Configuración','nav.logout':'Cerrar sesión','nav.loggingOut':'Cerrando sesión...',
    'settings.title':'Configuración','settings.subtitle':'Opciones de cuenta y seguridad',
    'settings.heading':'Configuración de cuenta','settings.description':'Gestioná tus opciones de acceso a Chronicle.',
    'settings.back':'Volver a mi perfil','settings.security':'Cuenta y seguridad',
    'settings.email':'Correo electrónico','settings.unavailable':'No disponible',
    'settings.providers':'Discord y Google','settings.providersDescription':'Vinculá cuentas externas para usar distintos métodos de inicio de sesión.',
    'settings.comingSoon':'Próximamente','settings.privacy':'Privacidad',
    'settings.privacyDescription':'Tu perfil es privado. Solo vos podés consultar y editar tus datos desde esta sección.',
    'settings.private':'Perfil privado','settings.language':'Idioma','settings.languageDescription':'Elegí el idioma de la interfaz de Chronicle.',
    'language.es':'Español','language.en':'English','weapon.mastery':'Maestría',
    'weapon.none':'Sin seleccionar','weapon.cleave':'Hender','weapon.graze':'Rozar','weapon.nick':'Corte rápido',
    'weapon.push':'Empujar','weapon.sap':'Debilitar','weapon.slow':'Ralentizar','weapon.topple':'Derribar','weapon.vex':'Hostigar',
  },
  en: {
    'nav.profile':'My profile','nav.settings':'Settings','nav.logout':'Sign out','nav.loggingOut':'Signing out...',
    'settings.title':'Settings','settings.subtitle':'Account and security options',
    'settings.heading':'Account settings','settings.description':'Manage how you access Chronicle.',
    'settings.back':'Back to my profile','settings.security':'Account and security',
    'settings.email':'Email address','settings.unavailable':'Unavailable',
    'settings.providers':'Discord and Google','settings.providersDescription':'Link external accounts to use different sign-in methods.',
    'settings.comingSoon':'Coming soon','settings.privacy':'Privacy',
    'settings.privacyDescription':'Your profile is private. Only you can view and edit your information here.',
    'settings.private':'Private profile','settings.language':'Language','settings.languageDescription':'Choose the language of the Chronicle interface.',
    'language.es':'Español','language.en':'English','weapon.mastery':'Mastery',
    'weapon.none':'None selected','weapon.cleave':'Cleave','weapon.graze':'Graze','weapon.nick':'Nick',
    'weapon.push':'Push','weapon.sap':'Sap','weapon.slow':'Slow','weapon.topple':'Topple','weapon.vex':'Vex',
  },
} as const
export type TranslationKey = keyof typeof translations.es
