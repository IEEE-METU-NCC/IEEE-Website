// i18n initialization for index.html
// Simple key-based replacement using data-i18n attributes

// update cacheKey const to prevent translation keys not being updated

// Alt klasördeki sayfalar da ana çeviri dosyalarını sitenin kökünden yüklesin
const i18nScript = document.currentScript;
const i18nBase = i18nScript ? new URL('.', i18nScript.src).href : './';
// Sayfaya özel ek çeviriler: <script src="i18n.js" data-extra-locales="locales/semiconductor-"> -> locales/semiconductor-tr.json
// Boşlukla ayrılmış birden fazla önek verilebilir: data-extra-locales="locales/semiconductor- locales/semiconductor-s3-"
const i18nExtraLocales = i18nScript && i18nScript.dataset.extraLocales ? i18nScript.dataset.extraLocales.trim().split(/\s+/) : [];

// Ek çevirileri iç içe birleştir (aynı üst anahtar birden fazla dosyada olabilir)
function i18nDeepMerge(target, source) {
  for (const key in source) {
    const val = source[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && target[key] && typeof target[key] === 'object') {
      i18nDeepMerge(target[key], val);
    } else {
      target[key] = val;
    }
  }
  return target;
}

document.addEventListener("DOMContentLoaded", async function() {
  // Changes once per hour, so cached locale files are reused within the hour
  const cacheKey = 234523423232325400;
  const loadLocale = (dir, lng) => fetch(`${dir}${lng}.json?v=${cacheKey}`).then(res => res.json());
  const [enRes, trRes] = await Promise.all([
      loadLocale(`${i18nBase}locales/`, 'en'),
      loadLocale(`${i18nBase}locales/`, 'tr')
    ]);

    const extras = await Promise.all(i18nExtraLocales.map(dir => Promise.all([
      loadLocale(dir, 'en'),
      loadLocale(dir, 'tr')
    ])));
    extras.forEach(([enExtra, trExtra]) => {
      i18nDeepMerge(enRes.translation, enExtra.translation);
      i18nDeepMerge(trRes.translation, trExtra.translation);
    });

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
