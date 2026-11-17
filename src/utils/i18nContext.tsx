import React, { createContext, useContext, useEffect } from 'react';
import { TRANSLATIONS, type TranslationDict } from './i18n';
import type { LanguageCode } from '../types';

interface LanguageContextValue {
  lang: LanguageCode;
  t: TranslationDict;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'kh',
  t: TRANSLATIONS.kh,
});

export const LanguageProvider: React.FC<{
  language: LanguageCode;
  children: React.ReactNode;
}> = ({ language, children }) => {
  const safeLang: LanguageCode = TRANSLATIONS[language] ? language : 'kh';
  const t = TRANSLATIONS[safeLang];

  useEffect(() => {
    document.documentElement.lang =
      safeLang === 'kr' ? 'ko' : safeLang === 'en' ? 'en' : 'km';
  }, [safeLang]);

  return (
    <LanguageContext.Provider value={{ lang: safeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useI18n(): LanguageContextValue {
  return useContext(LanguageContext);
}
