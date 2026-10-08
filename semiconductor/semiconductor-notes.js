// Ders notları: section -> part listesi -> part içeriği (hash ile gezinme)

(function () {
    const PARTS = 3; // Part 4 simülasyon sayfasına gider
    const views = document.querySelectorAll('[data-view]');
    const crumbs = document.getElementById('notes-breadcrumb');
    const crumbSection = document.getElementById('crumb-section');
    const crumbPart = document.getElementById('crumb-part');
    const nextBtn = document.getElementById('part-next');

    function t(key, fallback, opts) {
        if (window.i18next && i18next.isInitialized && i18next.exists(key)) return i18next.t(key, opts);
        return fallback;
    }

    function show(name) {
        views.forEach(v => v.classList.toggle('d-none', v.dataset.view !== name));
    }

    function route(keepScroll) {
        const m = location.hash.match(/^#section-2(?:\/part-(\d))?$/);
        if (!m) {
            show('sections');
            crumbs.classList.add('d-none');
        } else if (!m[1] || Number(m[1]) > PARTS) {
            show('section-2');
            crumbs.classList.remove('d-none');
            crumbSection.classList.add('active');
            crumbPart.classList.add('d-none');
        } else {
            const n = Number(m[1]);
            show('part');
            document.querySelectorAll('[data-part]').forEach(p => p.classList.toggle('d-none', Number(p.dataset.part) !== n));
            crumbs.classList.remove('d-none');
            crumbSection.classList.remove('active');
            crumbPart.classList.remove('d-none');
            crumbPart.textContent = `Part ${n}`;
            if (n < PARTS) {
                nextBtn.href = `#section-2/part-${n + 1}`;
                nextBtn.textContent = t('semiNotes.nextPart', `Sonraki: Part ${n + 1} →`, { n: n + 1 });
            } else {
                nextBtn.href = 'ic-fabrication.html';
                nextBtn.textContent = t('semiNotes.nextSim', 'Sonraki: Part 4 Simülasyonu →');
            }
        }
        if (keepScroll !== true) window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', () => route());
    if (window.i18next) i18next.on('languageChanged', () => setTimeout(() => route(true), 0));
    route();
})();
