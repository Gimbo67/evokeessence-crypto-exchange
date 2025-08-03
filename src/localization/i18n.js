import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../api/config';

// Import translations
import en from './translations/en';
import de from './translations/de';
import es from './translations/es';
import fr from './translations/fr';
import it from './translations/it';
import cs from './translations/cs';
import sk from './translations/sk';

// Create i18n instance
const i18n = new I18n({
  en,
  de,
  es,
  fr,
  it,
  cs,
  sk
});

// Set the locale once at the beginning of your app
const setInitialLocale = async () => {
  try {
    // Check if user has set a preferred language
    const savedLocale = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
    
    if (savedLocale) {
      // Use saved locale if available
      i18n.locale = savedLocale;
    } else {
      // Use device locale if no saved preference
      const deviceLocale = Localization.locale.split('-')[0]; // Get language code (e.g., 'en' from 'en-US')
      
      // Check if we support the device locale
      if (Object.keys(i18n.translations).includes(deviceLocale)) {
        i18n.locale = deviceLocale;
      } else {
        // Default to English if we don't support the device locale
        i18n.locale = 'en';
      }
      
      // Save the initial locale
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, i18n.locale);
    }
  } catch (error) {
    console.error('Error setting initial locale:', error);
    // Default to English in case of error
    i18n.locale = 'en';
  }
};

// Set fallback locale to English
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

// Set initial locale
setInitialLocale();

// Function to change locale
export const setLocale = async (locale) => {
  try {
    if (Object.keys(i18n.translations).includes(locale)) {
      i18n.locale = locale;
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, locale);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error setting locale:', error);
    return false;
  }
};

// Function to get current locale
export const getCurrentLocale = () => i18n.locale;

// Function to get available locales
export const getAvailableLocales = () => Object.keys(i18n.translations);

// Helper function to get translated language name
export const getLanguageName = (locale) => {
  const languageNames = {
    en: 'English',
    de: 'Deutsch',
    es: 'Español',
    fr: 'Français',
    it: 'Italiano',
    cs: 'Čeština',
    sk: 'Slovenčina'
  };
  
  return languageNames[locale] || locale;
};

// Export i18n instance
export default i18n;