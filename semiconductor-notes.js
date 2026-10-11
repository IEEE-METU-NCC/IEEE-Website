// Ders notları: section -> part listesi -> part içeriği (hash ile gezinme)

(function () {
    // parts: sayfadaki part sayısı, sim: son part'tan sonra gidilen simülasyon sayfası
    const SECTIONS = {
        2: { parts: 3, sim: 'semiconductor-ic-fabrication.html' },
        3: { parts: 4, sim: 'semiconductor-pn-junction.html' }
    };
    const views = document.querySelectorAll('[data-view]');
    const crumbs = document.getElementById('notes-breadcrumb');
    const crumbSection = document.getElementById('crumb-section');
    const crumbSectionLink = crumbSection.querySelector('a');
    const crumbPart = document.getElementById('crumb-part');
    const nextBtn = document.getElementById('part-next');
    const backBtn = document.getElementById('part-back');

    function t(key, fallback, opts) {
        if (window.i18next && i18next.isInitialized && i18next.exists(key)) return i18next.t(key, opts);
        return fallback;
    }

    function show(name) {
        views.forEach(v => v.classList.toggle('d-none', v.dataset.view !== name));
    }

    function route(keepScroll) {
        const m = location.hash.match(/^#section-(\d)(?:\/part-(\d))?$/);
        const sec = m && SECTIONS[m[1]];
        if (!sec) {
            show('sections');
            crumbs.classList.add('d-none');
        } else {
            const s = Number(m[1]);
            crumbs.classList.remove('d-none');
            crumbSectionLink.href = `#section-${s}`;
            crumbSectionLink.dataset.i18n = `semiNotes.s${s}.short`;
            crumbSectionLink.textContent = t(`semiNotes.s${s}.short`, `Section ${s}`);
            if (!m[2] || Number(m[2]) < 1 || Number(m[2]) > sec.parts) {
                show(`section-${s}`);
                crumbSection.classList.add('active');
                crumbPart.classList.add('d-none');
            } else {
                const n = Number(m[2]);
                show('part');
                document.querySelectorAll('[data-part]').forEach(p => {
                    p.classList.toggle('d-none', Number(p.dataset.section) !== s || Number(p.dataset.part) !== n);
                });
                crumbSection.classList.remove('active');
                crumbPart.classList.remove('d-none');
                crumbPart.textContent = `Part ${n}`;
                backBtn.href = `#section-${s}`;
                if (n < sec.parts) {
                    nextBtn.href = `#section-${s}/part-${n + 1}`;
                    nextBtn.textContent = t('semiNotes.nextPart', `Sonraki: Part ${n + 1} →`, { n: n + 1 });
                } else {
                    nextBtn.href = sec.sim;
                    nextBtn.textContent = t('semiNotes.nextSim', `Sonraki: Part ${n + 1} Simülasyonu →`, { n: n + 1 });
                }
            }
        }
        if (keepScroll !== true) window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', () => route());
    if (window.i18next) i18next.on('languageChanged', () => setTimeout(() => route(true), 0));
    route();
})();
