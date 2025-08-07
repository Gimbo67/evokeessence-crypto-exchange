import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { Language, DEFAULT_LANGUAGE, translations, type TranslationDictionary } from './i18n';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    // Load saved language from localStorage if available
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && ['en', 'cs', 'de'].includes(savedLanguage)) {
      console.log('Loading saved language:', savedLanguage);
      setLanguage(savedLanguage);
    } else {
      // Set based on browser language if available
      const browserLang = navigator.language.split('-')[0];
      console.log('Detected browser language:', browserLang);
      if (['en', 'cs', 'de'].includes(browserLang as Language)) {
        setLanguage(browserLang as Language);
      }
    }
  }, []);

  useEffect(() => {
    if (language) {
      console.log('Language changed to:', language);
      localStorage.setItem('language', language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = React.useMemo(
    () => ({ language, setLanguage }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export type TranslationKey = keyof typeof translations.en;

// Export the useTranslations hook that will be used throughout the application
export function useTranslations() {
  const { language } = useLanguage();

  return function translate(key: TranslationKey | string, params?: Record<string, string | number>): string {
    try {
      console.log(`[Translation] Resolving key "${key}" for language "${language}"`);
      const translation = translations[language]?.[key] || translations.en[key] || key;

      if (translation === key) {
        console.warn(`[Translation] Missing translation for key: ${key} in language: ${language}`);
      }

      if (params) {
        return Object.entries(params).reduce(
          (str, [paramKey, value]) => String(str).replace(`{${paramKey}}`, String(value)),
          translation
        );
      }

      return translation;
    } catch (error) {
      console.error(`[Translation] Error resolving key: ${key}`, error);
      return String(key);
    }
  };
}