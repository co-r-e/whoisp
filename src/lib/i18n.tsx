"use client";

import React from "react";

export type Lang = "ja" | "en";

type LanguageContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
};

const LanguageContext = React.createContext<LanguageContextValue | undefined>(
  undefined
);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = React.useState<Lang>("ja");

  // Load from localStorage once on mount
  React.useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved === "ja" || saved === "en") setLang(saved);
  }, []);

  // Persist on change and reflect on <html lang>
  React.useEffect(() => {
    try {
      document.documentElement.lang = lang;
      localStorage.setItem("lang", lang);
    } catch {}
  }, [lang]);

  const value = React.useMemo(() => ({ lang, setLang }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const ctx = React.useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};