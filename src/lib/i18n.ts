import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { STORAGE_LANG_KEY } from '@/utils/constants';
import idTranslations from '@/locales/id/common.json';
import enTranslations from '@/locales/en/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      id: { translation: idTranslations },
      en: { translation: enTranslations },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_LANG_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

// If detected language is not 'id', default to 'en'
const currentLang = i18n.language;
if (currentLang && !currentLang.startsWith('id')) {
  // Only set if not already 'en'
  if (!currentLang.startsWith('en')) {
    i18n.changeLanguage('en');
  }
}

export default i18n;
