// i18n initialization for index.html
// Simple key-based replacement using data-i18n attributes

document.addEventListener("DOMContentLoaded", async function() {
  const [enRes, trRes] = await Promise.all([
      fetch('./locales/en.json').then(res => res.json()),
      fetch('./locales/tr.json').then(res => res.json())
    ]);

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
