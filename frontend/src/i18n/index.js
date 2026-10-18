import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import messaging from './locales/en/messaging.json';

/**
 * Real i18n (react-i18next) replacing the hand-rolled `t()` string table the
 * messaging UI used before. Add a locale by dropping a folder under
 * `locales/<lng>/` and registering it here.
 */
i18n.use(initReactI18next).init({
  resources: { en: { messaging } },
  lng: 'en',
  fallbackLng: 'en',
  defaultNS: 'messaging',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
