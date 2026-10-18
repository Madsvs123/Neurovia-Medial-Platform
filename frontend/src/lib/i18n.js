import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enMessaging from '../locales/en/messaging.json';

/**
 * Real i18n (react-i18next) replaces the hand-rolled `t()` string table that
 * used to live in components/conversationText.js. Namespaces are per
 * feature so new features add their own JSON file under locales/<lang>/.
 */
if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { messaging: enMessaging },
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'messaging',
    ns: ['messaging'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

export default i18n;
