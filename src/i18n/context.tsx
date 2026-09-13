import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Locale, LocalizedString, LocalizedStringList } from './types'
import {
  detectDefaultLocale,
  loadStoredLocale,
  saveLocale,
  translations,
} from './translations'

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  lx: (value: LocalizedString) => string
  lxList: (value: LocalizedStringList) => string[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    return loadStoredLocale() ?? detectDefaultLocale()
  })

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next)
    setLocaleState(next)
  }, [])

  useEffect(() => {
    document.documentElement.lang =
      locale === 'en' ? 'en' : locale === 'zh-CN' ? 'zh-Hans' : 'zh-Hant'
  }, [locale])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = translations[locale]
      let text = dict[key] ?? translations['zh-TW'][key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(`{${k}}`, String(v))
        }
      }
      return text
    },
    [locale],
  )

  const lx = useCallback(
    (value: LocalizedString) => value[locale] ?? value['zh-TW'] ?? value.en,
    [locale],
  )

  const lxList = useCallback(
    (value: LocalizedStringList) => value[locale] ?? value['zh-TW'] ?? value.en,
    [locale],
  )

  const value = useMemo(
    () => ({ locale, setLocale, t, lx, lxList }),
    [locale, setLocale, t, lx, lxList],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
