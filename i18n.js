import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import kn from './locales/kn.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import ur from './locales/ur.json';
import or from './locales/or.json';
import as from './locales/as.json';
import sa from './locales/sa.json';

const LANG_KEY = 'app_language';

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  ta: { translation: ta },
  te: { translation: te },
  bn: { translation: bn },
  mr: { translation: mr },
  gu: { translation: gu },
  kn: { translation: kn },
  ml: { translation: ml },
  pa: { translation: pa },
  ur: { translation: ur },
  or: { translation: or },
  as: { translation: as },
  sa: { translation: sa },
};

const getInitialLanguage = async () => {
  const savedLang = await AsyncStorage.getItem(LANG_KEY);
  if (savedLang) return savedLang;
  return Localization.locale.split('-')[0] || 'en';
};

let initialLang = 'en';
getInitialLanguage().then(lang => {
  initialLang = lang;
  i18n.changeLanguage(lang);
});

// i18n init is async, but react-i18next expects sync. So we set a default and update later.
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    lng: initialLang,
    fallbackLng: 'en',
    resources,
    interpolation: { escapeValue: false },
  });

// Helper to force reload language from AsyncStorage
export const reloadLanguage = async () => {
  const lang = await getInitialLanguage();
  i18n.changeLanguage(lang);
};

export { i18n, LANG_KEY }; 