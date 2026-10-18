import enAdmin from '../../i18n/locales/en/admin.json';

const dictionaries = {
  admin: enAdmin,
};

const getNestedValue = (obj, path) => path.split('.').reduce((current, key) => (
  current && Object.prototype.hasOwnProperty.call(current, key) ? current[key] : undefined
), obj);

export const useTranslation = (namespace = 'admin') => {
  const dictionary = dictionaries[namespace] || dictionaries.admin;

  const t = (key) => {
    if (typeof key !== 'string') return '';
    const value = getNestedValue(dictionary, key);
    return value !== undefined ? value : key;
  };

  return {
    t,
    i18n: {
      language: 'en',
      changeLanguage: () => {},
    },
  };
};
