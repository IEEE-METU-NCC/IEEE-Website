// Entegre devre üretimi simülasyonu: pn diyot kesit görünümü
// Adımlar ders notundaki (Chap 2, s. 60-65) şekilleri takip eder.

(function () {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Kesit geometrisi (SVG birimi)
    const W0 = 20, W1 = 620;          // pul kenarları
    const SUB = 200, BOTTOM = 300;    // silisyum üst / alt
    const OX = 180;                   // SiO2 üstü
    const AL = 170;                   // alüminyum üstü
    const MASK_Y = 95;                // maske
    const P_WIN = [230, 410];         // p-bölgesi penceresi
    const CONTACTS = [[100, 160], [290, 350]];
    const PADS = [[85, 175], [275, 365]];
    const METAL_OPEN = [[W0, 85], [175, 275], [365, W1]];

    const COLORS = {
        nSi: '#f7d6ec',
        pSi: '#eaf4ee',
        oxide: '#fdfbe8',
        resist: '#c8c8c8',
        exposed: '#f3b6ef',
        al: '#7d7d7d',
        mask: '#3d3d3d',
        light: '#e600c8',
        ion: '#0d6efd',
        heat: 'rgb(204, 0, 0)'
    };

    // Her metin { tr, en } çifti. Türkçe metinlerde teknik terimler İngilizce bırakıldı.
    const STEPS = [
        {
            title: { tr: 'Başlangıç: n-type silicon wafer', en: 'Start: n-type silicon wafer' },
            fig: null,
            tags: ['Wafer'],
            params: { tr: ['Kalınlık ≈ 500 µm'], en: ['Thickness ≈ 500 µm'] },
            text: {
                tr: 'Fabrication, yaklaşık 500 µm kalınlığında single crystal <strong>n-type silicon wafer</strong> ile başlar. Bu wafer üzerinde bir pn diode oluşturacağız. Gerekirse yüksek kaliteli ince crystal layer\'lar <strong>epitaxial growth</strong> ile wafer\'ın üzerine eklenebilir.',
                en: 'Fabrication starts with a single-crystal <strong>n-type silicon wafer</strong> about 500 µm thick. We will build a pn diode on this wafer. If needed, thin high-quality crystalline layers can be added on top with <strong>epitaxial growth</strong>.'
            },
            oxide: null
        },
        {
            title: { tr: 'Oxidation', en: 'Oxidation' },
            fig: null,
            tags: ['Oxidation'],
            params: { tr: ['1000–1200 °C', 'Saf O₂ veya water vapor', 'SiO₂ ≈ 1 µm'], en: ['1000–1200 °C', 'Pure O₂ or water vapor', 'SiO₂ ≈ 1 µm'] },
            text: {
                tr: 'Wafer, saf oxygen veya water vapor ortamında 1000–1200 °C\'ye ısıtılır ve yüzeyde yaklaşık 1 µm kalınlığında <strong>silicon dioxide (SiO₂)</strong> insulating layer büyür. Silicon\'ın kolayca oxidize olabilmesi, IC\'lerde germanium\'a tercih edilmesinin önemli nedenlerinden biridir.',
                en: 'The wafer is heated to 1000–1200 °C in pure oxygen or water vapor, and a <strong>silicon dioxide (SiO₂)</strong> insulating layer about 1 µm thick grows on the surface. Silicon\'s ability to oxidize easily is a key reason it replaced germanium in ICs.'
            },
            oxide: { holes: [], grow: true },
            heat: true
        },
        {
            title: { tr: 'Photoresist coating', en: 'Photoresist coating' },
            fig: null,
            tags: ['Photolithography'],
            params: { tr: ['Light-sensitive polymer'], en: ['Light-sensitive polymer'] },
            text: {
                tr: 'Oxide\'ın üzerine ışığa duyarlı bir layer olan <strong>photoresist</strong> kaplanır. Bu layer, mask\'taki pattern\'i wafer yüzeyine aktarmak için kullanılacak.',
                en: 'A light-sensitive layer called <strong>photoresist</strong> is coated on top of the oxide. It will be used to transfer the mask pattern onto the wafer surface.'
            },
            oxide: { holes: [] },
            resist: { holes: [], grow: true }
        },
        {
            title: { tr: 'p-region mask ile exposure', en: 'Exposure with the p-region mask' },
            fig: '(a)',
            tags: ['Mask', 'Photolithography'],
            params: { tr: ['High-resolution optical exposure'], en: ['High-resolution optical exposure'] },
            text: {
                tr: '<strong>p-region mask</strong> wafer\'ın üzerine align edilir ve ışık tutulur. Mask\'ın şeffaf window\'undan geçen ışık, altındaki photoresist\'in kimyasal yapısını değiştirir (pembe bölge). Mask\'ın opaque kısımları ışığı engeller.',
                en: 'The <strong>p-region mask</strong> is aligned over the wafer and exposed to light. Light passing through the clear window changes the chemistry of the photoresist underneath (pink region). The opaque parts of the mask block the light.'
            },
            oxide: { holes: [] },
            resist: { holes: [], exposed: [P_WIN] },
            mask: { open: [P_WIN] },
            light: true
        },
        {
            title: { tr: 'Photoresist development', en: 'Photoresist development' },
            fig: '(b)',
            tags: ['Photolithography'],
            params: { tr: ['Developer solution'], en: ['Developer solution'] },
            text: {
                tr: 'Wafer developer solution\'a daldırılır. Işık almış photoresist çözünür ve oxide üzerinde bir <strong>window</strong> açılır. Geri kalan photoresist, alttaki oxide\'ı koruyacak.',
                en: 'The wafer is dipped in developer solution. The exposed photoresist dissolves and opens a <strong>window</strong> over the oxide. The remaining photoresist will protect the oxide underneath.'
            },
            oxide: { holes: [] },
            resist: { holes: [P_WIN], fade: [P_WIN] }
        },
        {
            title: { tr: 'SiO₂ etching', en: 'SiO₂ etching' },
            fig: '(c)',
            tags: ['Etching'],
            params: { tr: ['Wet etching (acid) veya dry plasma etching'], en: ['Wet etching (acid) or dry plasma etching'] },
            text: {
                tr: 'Window\'dan görünen oxide, acid ile (<strong>wet etching</strong>) ya da <strong>dry plasma etching</strong> ile kaldırılır. Photoresist ile korunan oxide yerinde kalır. Böylece silicon yüzeyi yalnızca p-region\'ın oluşacağı yerde açığa çıkar.',
                en: 'The oxide visible through the window is removed with acids (<strong>wet etching</strong>) or by <strong>dry plasma etching</strong>. Oxide protected by photoresist stays in place, so the silicon surface is exposed only where the p-region will form.'
            },
            oxide: { holes: [P_WIN], fade: [P_WIN] },
            resist: { holes: [P_WIN] },
            etch: [P_WIN]
        },
        {
            title: { tr: 'Acceptor ion implantation', en: 'Acceptor ion implantation' },
            fig: '(c)',
            tags: ['Ion implantation'],
            params: { tr: ['Boron (acceptor) ion\'ları', 'Enerji: 1 MeV\'ye kadar', 'Particle accelerator'], en: ['Boron (acceptor) ions', 'Energy: up to 1 MeV', 'Particle accelerator'] },
            text: {
                tr: 'Particle accelerator\'da yüksek enerjiye (1 MeV\'ye kadar) çıkarılan <strong>acceptor (p-type) atomlar</strong> wafer\'a çarptırılır. Photoresist ve oxide ion\'ları durdurur. Ion\'lar yalnızca açık window\'dan silicon\'a girer ve yüzeye yakın ince bir p-type layer oluşturur.',
                en: '<strong>Acceptor (p-type) atoms</strong>, accelerated to high energy (up to 1 MeV) in a particle accelerator, bombard the wafer. Photoresist and oxide stop the ions, so they enter the silicon only through the open window and form a thin p-type layer near the surface.'
            },
            oxide: { holes: [P_WIN] },
            resist: { holes: [P_WIN] },
            ions: true,
            p: 'shallow'
        },
        {
            title: { tr: 'Resist strip, diffusion ve re-oxidation', en: 'Resist strip, diffusion and re-oxidation' },
            fig: '(d)',
            tags: ['Diffusion', 'Oxidation'],
            params: { tr: ['≈ 1200 °C', 'p-region derinleşir'], en: ['≈ 1200 °C', 'p-region gets deeper'] },
            text: {
                tr: 'Photoresist sökülür ve wafer yaklaşık 1200 °C\'ye ısıtılır. <strong>Diffusion</strong> ile dopant atomları silicon\'ın içine doğru ilerler ve n-type wafer içinde bir <strong>p-type region</strong> oluşur: pn junction artık hazır. Aynı thermal process\'te window yeniden oxide ile kapanır.',
                en: 'The photoresist is stripped and the wafer is heated to about 1200 °C. Through <strong>diffusion</strong> the dopant atoms move deeper into the silicon, forming a <strong>p-type region</strong> inside the n-type wafer: the pn junction is now in place. The same thermal step regrows oxide over the window.'
            },
            oxide: { holes: [], regrow: [P_WIN] },
            p: 'deep',
            heat: true
        },
        {
            title: { tr: 'Contact opening mask ile exposure', en: 'Exposure with the contact opening mask' },
            fig: '(e)',
            tags: ['Mask', 'Photolithography'],
            params: { tr: ['2. mask', 'Alignment kritik'], en: ['2nd mask', 'Alignment is critical'] },
            text: {
                tr: 'Yeniden photoresist kaplanır ve <strong>contact opening mask</strong> ile exposure yapılır. Bu mask\'ın iki window\'u var: biri n-region\'ın, diğeri p-region\'ın üzerine denk gelir. Mask, önceki pattern\'e göre hassas şekilde align edilmelidir.',
                en: 'Photoresist is coated again and exposed through the <strong>contact opening mask</strong>. This mask has two windows: one over the n-region and one over the p-region. It must be aligned precisely to the previous pattern.'
            },
            oxide: { holes: [] },
            resist: { holes: [], exposed: CONTACTS, grow: true },
            mask: { open: CONTACTS },
            light: true,
            p: 'deep'
        },
        {
            title: { tr: 'Development ve contact window etching', en: 'Development and contact window etching' },
            fig: '(f)',
            tags: ['Photolithography', 'Etching'],
            params: { tr: ['Resist development', 'SiO₂ etching'], en: ['Resist development', 'SiO₂ etching'] },
            text: {
                tr: 'Exposure almış resist develop edilir ve açığa çıkan oxide etch edilir. Sonuçta n-type ve p-type silicon\'a ulaşan iki <strong>contact window</strong> açılır.',
                en: 'The exposed resist is developed and the uncovered oxide is etched. This opens two <strong>contact windows</strong> that reach the n-type and p-type silicon.'
            },
            oxide: { holes: CONTACTS, fade: CONTACTS },
            resist: { holes: CONTACTS, fade: CONTACTS },
            etch: CONTACTS,
            p: 'deep'
        },
        {
            title: { tr: 'Metal deposition: evaporation / sputtering', en: 'Metal deposition: evaporation / sputtering' },
            fig: null,
            tags: ['Evaporation', 'Sputtering'],
            params: { tr: ['Aluminum (Al)', 'Vacuum ortamı'], en: ['Aluminum (Al)', 'Vacuum'] },
            text: {
                tr: 'Resist sökülür ve tüm yüzey ince bir <strong>aluminum</strong> thin film ile kaplanır. <strong>Evaporation</strong>\'da metal vacuum içinde melting point\'ine kadar ısıtılır. <strong>Sputtering</strong>\'de ise yüzey metal ion\'larıyla bombardıman edilir. Al, contact window\'larını doldurarak silicon\'a değer.',
                en: 'The resist is stripped and the whole surface is covered with a thin <strong>aluminum</strong> film. In <strong>evaporation</strong> the metal is heated to its melting point in vacuum; in <strong>sputtering</strong> the surface is bombarded with metal ions. The Al fills the contact windows and touches the silicon.'
            },
            oxide: { holes: CONTACTS },
            al: 'full',
            deposit: true,
            p: 'deep'
        },
        {
            title: { tr: 'Metallization mask ile exposure', en: 'Exposure with the metallization mask' },
            fig: '(g)',
            tags: ['Mask', 'Photolithography'],
            params: { tr: ['3. mask'], en: ['3rd mask'] },
            text: {
                tr: 'Aluminum\'un üzerine photoresist kaplanır ve <strong>metallization mask</strong> ile exposure yapılır. Bu kez mask, contact pad\'lerin bulunacağı yerlerde opaque\'tır. Böylece pad\'lerin üzerindeki resist korunur, diğer her yer ışık alır.',
                en: 'Photoresist is coated over the aluminum and exposed through the <strong>metallization mask</strong>. This time the mask is opaque where the contact pads will be, so the resist over the pads is protected and everything else is exposed.'
            },
            oxide: { holes: CONTACTS },
            al: 'full',
            resist: { holes: [], exposed: METAL_OPEN, onAl: true, grow: true },
            mask: { open: METAL_OPEN },
            light: true,
            p: 'deep'
        },
        {
            title: { tr: 'Al etching ve resist removal: pn diode tamam', en: 'Al etching and resist removal: pn diode complete' },
            fig: '(h)',
            tags: ['Etching'],
            params: { tr: ['Anode: p-region Al contact', 'Cathode: n-region Al contact'], en: ['Anode: p-region Al contact', 'Cathode: n-region Al contact'] },
            text: {
                tr: 'Korunmayan aluminum etch edilir ve kalan resist sökülür. Geriye iki <strong>Al contact</strong> kalır: biri p-region\'a (anode), diğeri n-type wafer\'a (cathode) bağlanır. Böylece entegre bir <strong>pn diode</strong> üretilmiş olur. Top view, ders notundaki diode layout\'unu gösterir.',
                en: 'The unprotected aluminum is etched and the remaining resist is removed. Two <strong>Al contacts</strong> remain: one on the p-region (anode) and one on the n-type wafer (cathode). An integrated <strong>pn diode</strong> has been fabricated. The top view shows the diode layout from the lecture notes.'
            },
            oxide: { holes: CONTACTS },
            al: 'pads',
            etch: METAL_OPEN,
            p: 'deep',
            done: true
        }
    ];

    // Sözlük: her adım için bir terim (STEPS ile aynı sırada)
    const TERMS = [
        { name: 'Silicon wafer', step: 0, text: { tr: 'Üretimin başladığı ≈500 µm kalınlığındaki single crystal n-type silicon taban.', en: 'The ≈500 µm thick single-crystal n-type silicon base that fabrication starts from.' } },
        { name: 'Oxidation', step: 1, text: { tr: '1000–1200 °C\'de O₂ veya water vapor ile yüzeyde ≈1 µm SiO₂ insulating layer büyütme.', en: 'Growing a ≈1 µm SiO₂ insulating layer on the surface at 1000–1200 °C in O₂ or water vapor.' } },
        { name: 'Photoresist', step: 2, text: { tr: 'Oxide\'ın üzerine kaplanan, mask pattern\'ini yüzeye aktarmaya yarayan light-sensitive polymer layer.', en: 'A light-sensitive polymer layer coated over the oxide, used to transfer the mask pattern onto the surface.' } },
        { name: 'p-region mask', step: 3, text: { tr: '1. mask. Şeffaf window\'u p-region\'ın yerini belirler, exposure sırasında yalnızca buradaki resist ışık alır.', en: '1st mask. Its clear window defines where the p-region goes, so only the resist there is exposed.' } },
        { name: 'Development', step: 4, text: { tr: 'Işık almış photoresist\'i developer solution ile çözerek oxide üzerinde window açma.', en: 'Dissolving the exposed photoresist in developer solution to open a window over the oxide.' } },
        { name: 'SiO₂ etching', step: 5, text: { tr: 'Window\'dan görünen oxide\'ı acid (wet etching) ya da plasma (dry etching) ile kaldırma.', en: 'Removing the oxide visible through the window with acids (wet etching) or plasma (dry etching).' } },
        { name: 'Ion implantation', step: 6, text: { tr: 'Accelerator\'da 1 MeV\'ye kadar hızlandırılan acceptor ion\'larını açık window\'dan silicon\'a gömme.', en: 'Driving acceptor ions, accelerated up to 1 MeV, into the silicon through the open window.' } },
        { name: 'Diffusion', step: 7, text: { tr: 'Wafer\'ı ≈1200 °C\'ye ısıtarak dopant atomlarını derine yayma. p-region oluşur, window yeniden oxide ile kapanır.', en: 'Heating the wafer to ≈1200 °C so dopant atoms spread deeper. The p-region forms and oxide regrows over the window.' } },
        { name: 'Contact opening mask', step: 8, text: { tr: '2. mask. n-region ve p-region üzerine denk gelen iki window\'u vardır, önceki pattern\'e align edilir.', en: '2nd mask. It has two windows, over the n-region and the p-region, and is aligned to the previous pattern.' } },
        { name: 'Contact window', step: 9, text: { tr: 'Resist development ve SiO₂ etching sonrası oxide\'da açılan, silicon\'a ulaşan açıklık.', en: 'An opening in the oxide, made by resist development and SiO₂ etching, that reaches the silicon.' } },
        { name: 'Evaporation / Sputtering', step: 10, text: { tr: 'Metal deposition. Evaporation\'da Al vacuum içinde ısıtılır, sputtering\'de yüzey ion\'larla bombardıman edilir.', en: 'Metal deposition. In evaporation the Al is heated in vacuum, in sputtering the surface is bombarded with ions.' } },
        { name: 'Metallization mask', step: 11, text: { tr: '3. mask. Contact pad\'lerin olacağı yerlerde opaque\'tır, pad\'lerin üzerindeki resist\'i korur.', en: '3rd mask. It is opaque where the contact pads will be, protecting the resist over the pads.' } },
        { name: 'Al contact', step: 12, text: { tr: 'Al etching sonrası kalan metal pad\'ler: p-region\'a bağlanan anode ve n-type wafer\'a bağlanan cathode.', en: 'The metal pads left after Al etching: the anode on the p-region and the cathode on the n-type wafer.' } }
    ];

    // Arayüz metinleri
    const UI = {
        tr: {
            furnaceOx: 'Furnace · 1000–1200 °C · O₂ / H₂O',
            furnace: 'Furnace · ≈1200 °C',
            nSi: 'n-type silicon', nSiShort: 'n-type Si', pSi: 'p-type silicon', pSiShort: 'p-type Si',
            al: 'Aluminum (Al)', cathode: 'Al (cathode)', anode: 'Al (anode)',
            resist: 'Photoresist', mask: 'Mask', light: 'Exposure light',
            ions: 'Acceptor (B⁺) ion\'ları · ≤ 1 MeV', atoms: 'Al atomları (vacuum)',
            wafer: 'n-type silicon wafer',
            step: 'Adım', fig: 'Ders notu figure', goTo: n => `Adım ${n}'e git →`,
            play: 'Oynat', pause: 'Duraklat'
        },
        en: {
            furnaceOx: 'Furnace · 1000–1200 °C · O₂ / H₂O',
            furnace: 'Furnace · ≈1200 °C',
            nSi: 'n-type silicon', nSiShort: 'n-type Si', pSi: 'p-type silicon', pSiShort: 'p-type Si',
            al: 'Aluminum (Al)', cathode: 'Al (cathode)', anode: 'Al (anode)',
            resist: 'Photoresist', mask: 'Mask', light: 'Exposure light',
            ions: 'Acceptor (B⁺) ions · ≤ 1 MeV', atoms: 'Al atoms (vacuum)',
            wafer: 'n-type silicon wafer',
            step: 'Step', fig: 'Lecture figure', goTo: n => `Go to step ${n} →`,
            play: 'Play', pause: 'Pause'
        }
    };

    function lang() {
        let l = window.i18next && i18next.language;
        if (!l) {
            try { l = localStorage.getItem('lang'); } catch (e) { l = null; }
        }
        return l && l.startsWith('en') ? 'en' : 'tr';
    }

    function L(key) { return UI[lang()][key]; }
    function tx2(obj) { return obj[lang()]; }

    const svg = document.getElementById('fab-svg');
    const top = document.getElementById('fab-top');
    if (!svg || !top) return;

    let current = 0;
    let timer = null;
    let showLabels = true;

    // --- SVG yardımcıları ---
    function el(name, attrs, parent) {
        const node = document.createElementNS(SVG_NS, name);
        for (const k in attrs) node.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(node);
        return node;
    }

    function rect(parent, x0, x1, y0, y1, attrs) {
        return el('rect', Object.assign({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, attrs), parent);
    }

    // [W0, W1] aralığından pencereleri çıkar
    function segments(holes, from = W0, to = W1) {
        const sorted = holes.slice().sort((a, b) => a[0] - b[0]);
        const out = [];
        let x = from;
        for (const [a, b] of sorted) {
            if (a > x) out.push([x, a]);
            x = Math.max(x, b);
        }
        if (x < to) out.push([x, to]);
        return out;
    }

    function defs(parent) {
        const d = el('defs', {}, parent);
        const pn = el('pattern', { id: 'fab-dots-n', width: 9, height: 9, patternUnits: 'userSpaceOnUse' }, d);
        rect(pn, 0, 9, 0, 9, { fill: COLORS.nSi });
        el('circle', { cx: 2, cy: 3, r: 0.8, fill: '#b06a9a' }, pn);
        el('circle', { cx: 7, cy: 7, r: 0.6, fill: '#b06a9a' }, pn);
        const pp = el('pattern', { id: 'fab-dots-p', width: 11, height: 11, patternUnits: 'userSpaceOnUse' }, d);
        rect(pp, 0, 11, 0, 11, { fill: COLORS.pSi });
        el('circle', { cx: 4, cy: 5, r: 0.7, fill: '#5f9b78' }, pp);
        const arrow = el('marker', { id: 'fab-arrow', viewBox: '0 0 10 10', refX: 10, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, d);
        el('path', { d: 'M0,0 L10,5 L0,10 z', fill: COLORS.light }, arrow);
    }

    // --- Kesit çizimi ---
    function drawSection(step) {
        const s = STEPS[step];
        svg.innerHTML = '';
        defs(svg);
        const labels = [];

        // Fırın / ısı
        if (s.heat) {
            const g = el('g', { class: 'fab-heat' }, svg);
            rect(g, W0 - 10, W1 + 10, 20, BOTTOM + 10, { fill: 'none', stroke: COLORS.heat, 'stroke-width': 3, rx: 10, 'stroke-dasharray': '10 6' });
            el('text', { x: W0, y: 40, fill: COLORS.heat, 'font-weight': 600 }, g).textContent = step === 1 ? L('furnaceOx') : L('furnace');
            if (step === 1) {
                for (let i = 0; i < 9; i++) {
                    const x = 60 + i * 65;
                    const t = el('text', { x, y: 150, fill: '#555', class: 'fab-particle', style: `animation-delay:${(i % 4) * 0.3}s` }, svg);
                    t.textContent = i % 2 ? 'O₂' : 'H₂O';
                }
            }
        }

        // Silisyum gövde
        rect(svg, W0, W1, SUB, BOTTOM, { fill: 'url(#fab-dots-n)', stroke: '#888' });
        el('text', { x: 470, y: 275, fill: '#6b2f57', 'font-style': 'italic' }, svg).textContent = L('nSi');
        labels.push([L('nSiShort'), 260]);

        // p-bölgesi
        if (s.p) {
            const depth = s.p === 'deep' ? 45 : 14;
            const cls = (s.p === 'shallow' || (s.p === 'deep' && STEPS[step - 1] && STEPS[step - 1].p === 'shallow')) ? 'fab-grow-down' : '';
            rect(svg, P_WIN[0], P_WIN[1], SUB, SUB + depth, { fill: 'url(#fab-dots-p)', stroke: '#5f9b78', class: cls });
            el('text', { x: (P_WIN[0] + P_WIN[1]) / 2, y: SUB + Math.min(depth, 30) - 4, 'text-anchor': 'middle', fill: '#2f6b48', 'font-style': 'italic', class: 'fab-fade-in' }, svg).textContent = s.p === 'deep' ? L('pSi') : 'p';
            labels.push([L('pSiShort'), SUB + 20]);
        }

        // Oksit
        if (s.oxide) {
            const g = el('g', { class: s.oxide.grow ? 'fab-grow' : '' }, svg);
            for (const [a, b] of segments(s.oxide.holes)) {
                rect(g, a, b, OX, SUB, { fill: COLORS.oxide, stroke: '#a59e6a' });
            }
            (s.oxide.fade || []).forEach(([a, b]) => rect(svg, a, b, OX, SUB, { fill: COLORS.oxide, stroke: '#a59e6a', class: 'fab-fade-out' }));
            (s.oxide.regrow || []).forEach(([a, b]) => rect(svg, a, b, OX, SUB, { fill: '#fff6b0', stroke: '#a59e6a', class: 'fab-fade-in' }));
            labels.push(['SiO₂', OX + 10]);
        }

        // Alüminyum
        if (s.al) {
            const g = el('g', { class: s.deposit ? 'fab-grow' : '' }, svg);
            if (s.al === 'full') {
                for (const [a, b] of segments(CONTACTS)) rect(g, a, b, AL, OX, { fill: COLORS.al });
                for (const [a, b] of CONTACTS) rect(g, a, b, AL, SUB, { fill: COLORS.al });
            } else {
                for (const [a, b] of PADS) {
                    rect(g, a, b, AL, OX, { fill: COLORS.al });
                }
                for (const [a, b] of CONTACTS) rect(g, a, b, OX, SUB, { fill: COLORS.al });
                for (const [a, b] of METAL_OPEN) rect(svg, a, b, AL, OX, { fill: COLORS.al, class: 'fab-fade-out' });
                PADS.forEach(([a, b], i) => {
                    el('text', { x: (a + b) / 2, y: AL - 8, 'text-anchor': 'middle', 'font-weight': 600 }, svg).textContent = i === 0 ? L('cathode') : L('anode');
                });
            }
            labels.push([L('al'), AL + 5]);
        }

        // Fotorezist
        if (s.resist) {
            const y1 = s.resist.onAl ? AL : OX;
            const y0 = y1 - 14;
            const g = el('g', { class: s.resist.grow ? 'fab-grow' : '' }, svg);
            for (const [a, b] of segments(s.resist.holes)) rect(g, a, b, y0, y1, { fill: COLORS.resist, stroke: '#888' });
            (s.resist.exposed || []).forEach(([a, b]) => rect(svg, a, b, y0, y1, { fill: COLORS.exposed, stroke: '#b84fb0', class: 'fab-fade-in', style: 'animation-delay:0.6s' }));
            (s.resist.fade || []).forEach(([a, b]) => rect(svg, a, b, y0, y1, { fill: COLORS.exposed, class: 'fab-fade-out' }));
            labels.push([L('resist'), y0 + 7]);
        }

        // Aşındırma efekti
        if (s.etch) {
            s.etch.forEach(([a, b]) => {
                const yTop = s.al ? AL - 20 : OX - 20;
                for (let x = a + 8; x < b - 4; x += 16) {
                    el('circle', { cx: x, cy: yTop, r: 3, fill: '#20c997', class: 'fab-particle', style: `animation-delay:${((x / 16) % 5) * 0.2}s` }, svg);
                }
            });
        }

        // Maske ve ışık
        if (s.mask) {
            for (const [a, b] of segments(s.mask.open, W0 - 10, W1 + 10)) rect(svg, a, b, MASK_Y, MASK_Y + 10, { fill: COLORS.mask });
            for (const [a, b] of s.mask.open) rect(svg, a, b, MASK_Y, MASK_Y + 10, { fill: '#fff', stroke: COLORS.mask });
            labels.push([L('mask'), MASK_Y + 5]);
        }
        if (s.light) {
            const stopY = s.resist ? (s.resist.onAl ? AL : OX) - 16 : OX - 4;
            for (let x = W0 + 15; x < W1; x += 40) {
                const open = s.mask.open.some(([a, b]) => x > a && x < b);
                el('line', { x1: x, y1: 50, x2: x, y2: open ? stopY : MASK_Y - 4, stroke: COLORS.light, 'stroke-width': 2, 'marker-end': 'url(#fab-arrow)', class: 'fab-fade-in' }, svg);
            }
            labels.push([L('light'), 60]);
        }
        if (s.ions) {
            const g = el('g', {}, svg);
            for (let x = W0 + 12; x < W1; x += 24) {
                const open = x > P_WIN[0] && x < P_WIN[1];
                const yEnd = open ? SUB + 8 : (s.resist ? OX - 16 : OX);
                el('circle', { cx: x, cy: yEnd - 10, r: 3.5, fill: COLORS.ion, class: 'fab-particle', style: `animation-delay:${((x / 24) % 6) * 0.22}s` }, g);
                el('line', { x1: x, y1: 50, x2: x, y2: 90, stroke: COLORS.ion, 'stroke-width': 1.5, opacity: 0.6 }, g);
            }
            el('text', { x: W0, y: 40, fill: COLORS.ion, 'font-weight': 600 }, svg).textContent = L('ions');
        }
        if (s.deposit) {
            for (let x = W0 + 10; x < W1; x += 20) {
                el('circle', { cx: x, cy: 120, r: 3, fill: COLORS.al, class: 'fab-particle', style: `animation-delay:${((x / 20) % 7) * 0.2}s` }, svg);
            }
            el('text', { x: W0, y: 40, fill: '#444', 'font-weight': 600 }, svg).textContent = L('atoms');
        }

        // Sağ kenar etiketleri
        if (showLabels) {
            const used = [];
            labels.sort((a, b) => a[1] - b[1]).forEach(([name, y]) => {
                let ly = y;
                while (used.some(u => Math.abs(u - ly) < 16)) ly += 16;
                used.push(ly);
                el('line', { x1: W1 + 2, y1: y, x2: W1 + 18, y2: ly, stroke: '#666' }, svg);
                el('text', { x: W1 + 22, y: ly + 4, fill: '#222' }, svg).textContent = name;
            });
        }
    }

    // --- Üst görünüm ---
    function tx(x) { return 10 + (x - W0) / (W1 - W0) * 280; }

    function drawTop(step) {
        const s = STEPS[step];
        top.innerHTML = '';
        defs(top);
        rect(top, 10, 290, 10, 190, { fill: 'url(#fab-dots-n)', stroke: '#888' });
        if (s.p) rect(top, tx(P_WIN[0]), tx(P_WIN[1]), 58, 142, { fill: 'url(#fab-dots-p)', stroke: '#5f9b78' });
        if (s.oxide) rect(top, 10, 290, 10, 190, { fill: COLORS.oxide, opacity: 0.45 });
        if (s.oxide && s.oxide.holes.length && s.oxide.holes[0] === P_WIN) {
            rect(top, tx(P_WIN[0]), tx(P_WIN[1]), 58, 142, { fill: '#fff', stroke: '#5f9b78', opacity: 0.6 });
        }
        if (s.oxide && s.oxide.holes === CONTACTS || s.al) {
            CONTACTS.forEach(([a, b]) => {
                rect(top, tx(a), tx(b), 86, 114, { fill: '#fff', stroke: '#333' });
                el('path', { d: `M${tx(a)},86 L${tx(b)},114 M${tx(b)},86 L${tx(a)},114`, stroke: '#333' }, top);
            });
        }
        if (s.al === 'full') rect(top, 10, 290, 10, 190, { fill: COLORS.al, opacity: 0.75 });
        if (s.al === 'pads') {
            PADS.forEach(([a, b]) => {
                rect(top, tx(a), tx(b), 79, 121, { fill: COLORS.al, opacity: 0.85, stroke: '#333' });
                el('path', { d: `M${tx(a) + 7},86 L${tx(b) - 7},114 M${tx(b) - 7},86 L${tx(a) + 7},114`, stroke: '#111' }, top);
            });
        }
        el('line', { x1: 4, y1: 100, x2: 296, y2: 100, stroke: '#000', 'stroke-dasharray': '6 4' }, top);
        el('text', { x: 150, y: 184, 'text-anchor': 'middle', 'font-style': 'italic', fill: '#6b2f57' }, top).textContent = L('wafer');
    }

    // --- Arayüz ---
    const titleEl = document.getElementById('fab-title');
    const figEl = document.getElementById('fab-fig');
    const textEl = document.getElementById('fab-text');
    const tagsEl = document.getElementById('fab-tags');
    const paramsEl = document.getElementById('fab-params');
    const counterEl = document.getElementById('fab-counter');
    const range = document.getElementById('fab-range');
    const prevBtn = document.getElementById('fab-prev');
    const nextBtn = document.getElementById('fab-next');
    const playBtn = document.getElementById('fab-play');
    const resetBtn = document.getElementById('fab-reset');
    const dotsEl = document.getElementById('fab-dots');
    const doneEl = document.getElementById('fab-done');
    const labelToggle = document.getElementById('fab-labels');

    range.max = STEPS.length - 1;
    STEPS.forEach((st, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn btn-outline-primary fab-step-dot';
        b.textContent = i;
        b.addEventListener('click', () => { stop(); go(i); });
        dotsEl.appendChild(b);
    });

    function go(i) {
        current = Math.max(0, Math.min(STEPS.length - 1, i));
        const s = STEPS[current];
        drawSection(current);
        drawTop(current);
        titleEl.textContent = tx2(s.title);
        figEl.textContent = s.fig ? `${L('fig')} ${s.fig}` : '';
        figEl.classList.toggle('d-none', !s.fig);
        textEl.innerHTML = tx2(s.text);
        tagsEl.innerHTML = s.tags.map(t => `<span class="badge text-bg-primary me-1">${t}</span>`).join('');
        paramsEl.innerHTML = tx2(s.params).map(p => `<li class="list-group-item py-1">${p}</li>`).join('');
        counterEl.textContent = `${L('step')} ${current} / ${STEPS.length - 1}`;
        range.value = current;
        prevBtn.disabled = current === 0;
        nextBtn.disabled = current === STEPS.length - 1;
        doneEl.classList.toggle('d-none', !s.done);
        [...dotsEl.children].forEach((b, k) => {
            b.title = tx2(STEPS[k].title);
            b.setAttribute('aria-label', `${L('step')} ${k}: ${tx2(STEPS[k].title)}`);
            b.classList.toggle('btn-primary', k === current);
            b.classList.toggle('btn-outline-primary', k !== current);
        });
        document.querySelectorAll('.fab-term').forEach(t => {
            t.classList.toggle('active', Number(t.dataset.step) === current);
        });
    }

    function stop() {
        clearInterval(timer);
        timer = null;
        playBtn.textContent = L('play');
    }

    function play() {
        if (timer) { stop(); return; }
        if (current === STEPS.length - 1) go(0);
        playBtn.textContent = L('pause');
        timer = setInterval(() => {
            if (current >= STEPS.length - 1) { stop(); return; }
            go(current + 1);
        }, 3500);
    }

    prevBtn.addEventListener('click', () => { stop(); go(current - 1); });
    nextBtn.addEventListener('click', () => { stop(); go(current + 1); });
    resetBtn.addEventListener('click', () => { stop(); go(0); });
    playBtn.addEventListener('click', play);
    range.addEventListener('input', () => { stop(); go(Number(range.value)); });
    labelToggle.addEventListener('change', () => { showLabels = labelToggle.checked; drawSection(current); });

    document.addEventListener('keydown', (e) => {
        if (e.target.closest('input, textarea, select')) return;
        if (e.key === 'ArrowRight') { stop(); go(current + 1); }
        if (e.key === 'ArrowLeft') { stop(); go(current - 1); }
    });

    // Process sözlüğü
    const termsEl = document.getElementById('fab-terms');
    function renderTerms() {
        termsEl.innerHTML = '';
        TERMS.forEach(t => {
            const col = document.createElement('div');
            col.className = 'col-12 col-sm-6 col-lg-4';
            col.innerHTML = `<button type="button" class="card fab-term lecture-card shadow-sm h-100 w-100 p-3" data-step="${t.step}">
                <span class="fw-semibold">${t.name}</span>
                <span class="small text-body-secondary">${tx2(t.text)}</span>
                <span class="small text-primary mt-1">${L('goTo')(t.step)}</span>
            </button>`;
            col.querySelector('button').addEventListener('click', () => {
                stop();
                go(t.step);
                document.getElementById('fab-sim').scrollIntoView({ behavior: 'smooth' });
            });
            termsEl.appendChild(col);
        });
    }

    function renderAll() {
        renderTerms();
        playBtn.textContent = L(timer ? 'pause' : 'play');
        go(current);
    }

    if (window.i18next) i18next.on('languageChanged', () => setTimeout(renderAll, 0));
    renderAll();
})();
