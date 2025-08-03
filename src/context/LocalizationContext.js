import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { STORAGE_KEYS, APP_CONFIG } from '../api/config';
import enTranslations from '../localization/en';
import csTranslations from '../localization/cs';
import skTranslations from '../localization/sk';
import deTranslations from '../localization/de';
import esTranslations from '../localization/es';
import frTranslations from '../localization/fr';

// Create context
const LocalizationContext = createContext();

// Available translations
const translations = {
  en: enTranslations,
  cs: csTranslations,
  sk: skTranslations,
  de: deTranslations,
  es: esTranslations,
  fr: frTranslations
};

// Provider component
export const LocalizationProvider = ({ children }) => {
  const [locale, setLocale] = useState(APP_CONFIG.DEFAULT_LANGUAGE);
  const [translations, setTranslations] = useState(enTranslations);

  // Initialize locale
  useEffect(() => {
    const initializeLocale = async () => {
      try {
        // Get saved locale from storage
        const savedLocale = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
        
        // Use saved locale or device locale or default
        const deviceLocale = Localization.locale.split('-')[0];
        const supportedLocales = APP_CONFIG.AVAILABLE_LANGUAGES;
        
        let selectedLocale;
        
        if (savedLocale && supportedLocales.includes(savedLocale)) {
          selectedLocale = savedLocale;
        } else if (deviceLocale && supportedLocales.includes(deviceLocale)) {
          selectedLocale = deviceLocale;
        } else {
          selectedLocale = APP_CONFIG.DEFAULT_LANGUAGE;
        }
        
        // Set locale and load translations
        await changeLocale(selectedLocale);
      } catch (error) {
        console.error('Error initializing locale:', error);
        setLocale(APP_CONFIG.DEFAULT_LANGUAGE);
        setTranslations(enTranslations);
      }
    };
    
    initializeLocale();
  }, []);

  // Change locale
  const changeLocale = async (newLocale) => {
    try {
      if (APP_CONFIG.AVAILABLE_LANGUAGES.includes(newLocale)) {
        // Set new locale
        setLocale(newLocale);
        
        // Load translations
        const newTranslations = translations[newLocale] || enTranslations;
        setTranslations(newTranslations);
        
        // Save to storage
        await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, newLocale);
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error changing locale:', error);
      return false;
    }
  };

  // Get translation for key
  const t = (key, params = {}) => {
    if (!key) return '';
    
    let translatedText = translations[key] || key;
    
    // Replace params in string (e.g. {{param}})
    if (Object.keys(params).length) {
      Object.keys(params).forEach(paramKey => {
        translatedText = translatedText.replace(
          new RegExp(`{{${paramKey}}}`, 'g'),
          params[paramKey]
        );
      });
    }
    
    return translatedText;
  };

  // Format date
  const formatDate = (date, format = 'medium') => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    try {
      const options = getDateFormatOptions(format);
      return new Intl.DateTimeFormat(locale, options).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toString();
    }
  };

  // Format number
  const formatNumber = (number, options = {}) => {
    if (number === undefined || number === null) return '';
    
    try {
      const defaultOptions = { 
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      };
      
      const formatterOptions = { ...defaultOptions, ...options };
      
      return new Intl.NumberFormat(locale, formatterOptions).format(number);
    } catch (error) {
      console.error('Error formatting number:', error);
      return number.toString();
    }
  };

  // Format currency
  const formatCurrency = (amount, currencyCode = 'USD', options = {}) => {
    if (amount === undefined || amount === null) return '';
    
    try {
      const defaultOptions = {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      };
      
      const formatterOptions = { ...defaultOptions, ...options };
      
      return new Intl.NumberFormat(locale, formatterOptions).format(amount);
    } catch (error) {
      console.error('Error formatting currency:', error);
      return `${currencyCode} ${amount}`;
    }
  };

  // Helper function to get date format options
  const getDateFormatOptions = (format) => {
    switch (format) {
      case 'short':
        return { 
          year: 'numeric', 
          month: 'numeric', 
          day: 'numeric'
        };
      case 'long':
        return { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        };
      case 'time':
        return { 
          hour: 'numeric', 
          minute: 'numeric'
        };
      case 'datetime':
        return { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric', 
          minute: 'numeric'
        };
      case 'medium':
      default:
        return { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric'
        };
    }
  };

  // Context value
  const value = {
    locale,
    changeLocale,
    t,
    formatDate,
    formatNumber,
    formatCurrency,
    isRTL: ['ar', 'he'].includes(locale)
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

// Custom hook to use the localization context
export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  
  if (!context) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  
  return context;
};

export default LocalizationContext;