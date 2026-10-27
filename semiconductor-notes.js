// Section sayfası: part listesi -> part içeriği (hash ile gezinme: #part-N)
// Ayarlar <body data-section="3" data-parts="7" data-sim="..."> üzerinden gelir.

(function () {
    const body = document.body;
    const PARTS = Number(body.dataset.parts);
    const SIM = body.dataset.sim;
    const views = document.querySelectorAll('[data-view]');
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
        const m = location.hash.match(/^#part-(\d+)$/);
        const n = m ? Number(m[1]) : 0;
        if (n < 1 || n > PARTS) {
            show('parts');
            crumbSection.classList.add('active');
            crumbPart.classList.add('d-none');
        } else {
            show('part');
            document.querySelectorAll('[data-part]').forEach(p => {
                p.classList.toggle('d-none', Number(p.dataset.part) !== n);
            });
            crumbSection.classList.remove('active');
            crumbPart.classList.remove('d-none');
            crumbPart.textContent = `Part ${n}`;
            if (n < PARTS) {
                nextBtn.href = `#part-${n + 1}`;
                nextBtn.textContent = t('semiNotes.nextPart', `Sonraki: Part ${n + 1} →`, { n: n + 1 });
            } else {
                nextBtn.href = SIM;
                nextBtn.textContent = t('semiNotes.nextSim', `Sonraki: Part ${n + 1} Simülasyonu →`, { n: n + 1 });
            }
        }
        if (keepScroll !== true) window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', () => route());
    if (window.i18next) i18next.on('languageChanged', () => setTimeout(() => route(true), 0));
    route();
})();
