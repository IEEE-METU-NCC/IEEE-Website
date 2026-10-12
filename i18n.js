// i18n initialization for index.html
// Simple key-based replacement using data-i18n attributes

// update cacheKey const to prevent translation keys not being updated

// Alt klasördeki sayfalar da ana çeviri dosyalarını sitenin kökünden yüklesin
const i18nScript = document.currentScript;
const i18nBase = i18nScript ? new URL('.', i18nScript.src).href : './';
// Sayfaya özel ek çeviriler: <script src="i18n.js" data-extra-locales="locales/semiconductor-"> -> locales/semiconductor-tr.json
const i18nExtraLocales = i18nScript ? i18nScript.dataset.extraLocales : null;

document.addEventListener("DOMContentLoaded", async function() {
  // Changes once per hour, so cached locale files are reused within the hour
  const cacheKey = 234523423232325234;
  const loadLocale = (dir, lng) => fetch(`${dir}${lng}.json?v=${cacheKey}`).then(res => res.json());
  const [enRes, trRes] = await Promise.all([
      loadLocale(`${i18nBase}locales/`, 'en'),
      loadLocale(`${i18nBase}locales/`, 'tr')
    ]);

    if (i18nExtraLocales) {
      const [enExtra, trExtra] = await Promise.all([
        loadLocale(i18nExtraLocales, 'en'),
        loadLocale(i18nExtraLocales, 'tr')
      ]);
      Object.assign(enRes.translation, enExtra.translation);
      Object.assign(trRes.translation, trExtra.translation);
    }

    const resources = {
      "en": enRes,
      "tr": trRes
    };

    const savedLng = localStorage.getItem('lang') || 'tr';

    i18next.init({
      lng: savedLng,
      fallbackLng: 'en',
      resources: resources
    }, () => {
      updateContent();
      setLangToggleLabel();
    });
});

function updateContent() {
  document.documentElement.lang = i18next.language;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    // Keep the text already in the HTML if the key is missing
    if (!i18next.exists(key)) return;
    const text = i18next.t(key);
    if (el.tagName === 'INPUT') {
      if (el.hasAttribute('placeholder')) {
        el.setAttribute('placeholder', text);
      }
    } else {
      el.innerHTML = text;
    }
  });
}

// Language switcher buttons
function setLangToggleLabel() {
  const toggle = document.querySelector('[data-lang-toggle]');
  if (!toggle) return;
  // Show the next language code as label
  toggle.textContent = i18next.language === 'tr' ? 'TR' : 'EN';
}

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-lang-toggle]');
  if (toggle) {
    const next = i18next.language === 'tr' ? 'en' : 'tr';
    i18next.changeLanguage(next, () => {
      localStorage.setItem('lang', next);
      updateContent();
      setLangToggleLabel();
    });
    return;
  }
  const btn = e.target.closest('[data-setlang]');
  if (btn) {
    const lang = btn.getAttribute('data-setlang');
    i18next.changeLanguage(lang, () => {
      localStorage.setItem('lang', lang);
      updateContent();
      setLangToggleLabel();
    });
  }
});
