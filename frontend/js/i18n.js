// Simple shared formatters and language state.

export const fmt = {
    int:   (v) => Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }),
    num2:  (v) => Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    num3:  (v) => Number(v).toLocaleString("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
    num4:  (v) => Number(v).toLocaleString("en-IN", { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
    num6:  (v) => Number(v).toLocaleString("en-IN", { minimumFractionDigits: 6, maximumFractionDigits: 6 }),
    inr:   (v) => "₹" + Number(v).toLocaleString("en-IN", { maximumFractionDigits: 0 }),
};

// Lightweight language-prefs (used by inferences component).
const KEY = "ck-lang";
export function getLang() { return localStorage.getItem(KEY) || "en"; }
export function setLang(lang) { localStorage.setItem(KEY, lang); }

export const LANGS = [
    { code: "en", label: "🇬🇧 English" },
    { code: "hi", label: "🇮🇳 हिंदी" },
    { code: "te", label: "🇮🇳 తెలుగు" },
    { code: "mr", label: "🇮🇳 मराठी" },
];
