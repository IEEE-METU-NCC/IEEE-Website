// pn junction simülasyonu: depletion region'un bias voltajına tepkisi
// Formüller ders notundaki (Chap 3) Eq. 3.4, 3.5, 3.7, 3.18 ve diode equation'ı takip eder.

(function () {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    // Fizik sabitleri (silicon, oda sıcaklığı)
    const Q = 1.602e-19;              // C
    const EPS_S = 11.7 * 8.854e-14;   // F/cm
    const NI = 1e10;                  // cm^-3
    const VT = 0.025;                 // V
    const IS = 1e-15;                 // A, sabit alındı
    const VZ = 5;                     // V, örnek breakdown voltajı
    const RZ = 50;                    // Ω
    const V_MIN = -6, V_MAX = 0.76;

    // Kesit geometrisi (SVG birimi)
    const X0 = 80, X1 = 680, XJ = 380;   // p ucu, n ucu, metallurgical junction
    const Y0 = 34, Y1 = 170;             // diode üst / alt
    const WIRE_Y = 222;
    const COLS = 20, ROWS = 5, PITCH = 30, ROW_PITCH = 26;
    const MAX_SIDE = 285;

    const COLORS = {
        pSi: '#eaf4ee',
        nSi: '#f7d6ec',
        dep: '#fffdf0',
        al: '#7d7d7d',
        pos: 'rgb(204, 0, 0)',     // hole, donor iyonu (+)
        neg: '#0d6efd',            // elektron, acceptor iyonu (−)
        plot: '#e600c8',
        ghost: '#9a9a9a',
        ink: '#212529'
    };

    // Her metin { tr, en } çifti. Türkçe metinlerde teknik terimler İngilizce bırakıldı.
    const REGIONS = {
        zero: {
            badge: 'text-bg-secondary',
            title: { tr: 'Zero bias: denge', en: 'Zero bias: equilibrium' },
            text: {
                tr: 'Dışarıdan voltaj yok. Hole\'lar sağa, elektronlar sola geçmek istiyor (<strong>diffusion</strong>) ama depletion region\'daki field onları geri itiyor (<strong>drift</strong>). İkisi birbirini tam götürür: net akım sıfır, bariyer tam φ<sub>j</sub> kadar.',
                en: 'No external voltage. Holes tend to move right and electrons left (<strong>diffusion</strong>), but the field in the depletion region pushes them back (<strong>drift</strong>). The two cancel exactly: the net current is zero and the barrier equals φ<sub>j</sub>.'
            }
        },
        reverse: {
            badge: 'text-bg-primary',
            title: { tr: 'Reverse bias: diode karşı koyuyor', en: 'Reverse bias: the diode blocks' },
            text: {
                tr: 'Kaynağın + ucu n tarafında. Hole\'lar ve elektronlar junction\'dan <strong>uzağa</strong> çekilir, arkalarında daha çok iyon açıkta kalır: depletion region genişler, field ve bariyer büyür (φ<sub>j</sub> + v<sub>R</sub>). Majority carrier\'lar bu duvarı aşamaz. Sadece depletion region\'da ısıyla oluşan birkaç electron-hole pair field tarafından süpürülür: akım −I<sub>S</sub>, yani yok denecek kadar az.',
                en: 'The + terminal of the source is on the n side. Holes and electrons are pulled <strong>away</strong> from the junction and uncover more ions: the depletion region widens, and the field and barrier grow (φ<sub>j</sub> + v<sub>R</sub>). Majority carriers cannot cross this barrier. Only the few electron-hole pairs thermally generated in the depletion region are swept out by the field: the current is −I<sub>S</sub>, practically zero.'
            }
        },
        forwardLow: {
            badge: 'text-bg-warning',
            title: { tr: 'Forward bias: bariyer düşüyor', en: 'Forward bias: the barrier drops' },
            text: {
                tr: 'Kaynağın + ucu p tarafında. Uygulanan voltaj bariyeri düşürür (φ<sub>j</sub> − v<sub>D</sub>) ve depletion region daralır. Carrier\'lar karşıya geçmeye başladı ama akım henüz çok küçük, <strong>turn-on voltage</strong>\'a gelmedik. Biraz daha artır gülüm.',
                en: 'The + terminal of the source is on the p side. The applied voltage lowers the barrier (φ<sub>j</sub> − v<sub>D</sub>) and the depletion region narrows. Carriers begin to cross, but the current is still very small: the <strong>turn-on voltage</strong> has not been reached yet.'
            }
        },
        forwardOn: {
            badge: 'text-bg-success',
            title: { tr: 'Forward bias: diode iletimde', en: 'Forward bias: the diode conducts' },
            text: {
                tr: 'Bariyer iyice düştü. Hole\'lar n tarafına, elektronlar p tarafına akın akın geçiyor (diffusion kazandı) ve karşı tarafta <strong>recombine</strong> oluyor. Akım voltajla üstel artıyor: her ~60 mV\'de 10 kat. Voltajı biraz oynat, akıma bak.',
                en: 'The barrier is now low. Holes flood into the n side and electrons into the p side (diffusion wins), where they <strong>recombine</strong>. The current grows exponentially with voltage: a factor of 10 for every ~60 mV.'
            }
        },
        breakdown: {
            badge: 'text-bg-danger',
            title: { tr: 'Reverse breakdown', en: 'Reverse breakdown' },
            text: {
                tr: 'Reverse voltaj V<sub>Z</sub>\'yi geçti. Field o kadar büyüdü ki hızlanan carrier\'lar atomlara çarpıp yeni electron-hole pair\'ler koparıyor (<strong>avalanche</strong>). Diode artık karşı koyamıyor: voltaj neredeyse V<sub>Z</sub>\'de sabit kalırken ters yöndeki akım hızla büyüyor.',
                en: 'The reverse voltage has exceeded V<sub>Z</sub>. The field is now so large that accelerated carriers collide with atoms and knock loose new electron-hole pairs (<strong>avalanche</strong>). The diode can no longer block: the voltage stays near V<sub>Z</sub> while the reverse current rises rapidly.'
            }
        }
    };

    const UI = {
        tr: {
            anode: 'Anode', cathode: 'Cathode', junction: 'Metallurgical junction',
            scr: 'Depletion region (SCR)', neutral: 'Nötr bölge',
            rho: 'Charge density', field: 'Electric field', pot: 'Potential',
            zeroBias: 'kesikli: zero bias', notScale: 'Çizim ölçekli değildir',
            sweep: 'Voltajı Tara', stop: 'Durdur',
            rows: {
                phi: 'Built-in potential φ<sub>j</sub>',
                barrier: 'Bariyer φ<sub>j</sub> − v<sub>D</sub>',
                wd: 'Depletion width w<sub>d</sub>',
                wd0: 'Zero bias\'ta w<sub>d0</sub>',
                xp: 'p tarafı x<sub>p</sub>',
                xn: 'n tarafı x<sub>n</sub>',
                emax: 'E<sub>MAX</sub>',
                id: 'Diode akımı i<sub>D</sub>'
            },
            ivV: 'v', ivI: 'i', turnOn: 'turn-on'
        },
        en: {
            anode: 'Anode', cathode: 'Cathode', junction: 'Metallurgical junction',
            scr: 'Depletion region (SCR)', neutral: 'Neutral region',
            rho: 'Charge density', field: 'Electric field', pot: 'Potential',
            zeroBias: 'dashed: zero bias', notScale: 'Drawing is not to scale',
            sweep: 'Sweep Voltage', stop: 'Stop',
            rows: {
                phi: 'Built-in potential φ<sub>j</sub>',
                barrier: 'Barrier φ<sub>j</sub> − v<sub>D</sub>',
                wd: 'Depletion width w<sub>d</sub>',
                wd0: 'Zero-bias w<sub>d0</sub>',
                xp: 'p side x<sub>p</sub>',
                xn: 'n side x<sub>n</sub>',
                emax: 'E<sub>MAX</sub>',
                id: 'Diode current i<sub>D</sub>'
            },
            ivV: 'v', ivI: 'i', turnOn: 'turn-on'
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

    const svg = document.getElementById('pn-svg');
    const ivSvg = document.getElementById('pn-iv');
    if (!svg || !ivSvg) return;

    const vRange = document.getElementById('pn-v');
    const vOut = document.getElementById('pn-v-out');
    const naRange = document.getElementById('pn-na');
    const ndRange = document.getElementById('pn-nd');
    const naOut = document.getElementById('pn-na-out');
    const ndOut = document.getElementById('pn-nd-out');
    const sweepBtn = document.getElementById('pn-sweep');
    const labelToggle = document.getElementById('pn-labels');
    const badgeEl = document.getElementById('pn-region');
    const titleEl = document.getElementById('pn-title');
    const textEl = document.getElementById('pn-text');
    const valuesEl = document.getElementById('pn-values');
    const clampEl = document.getElementById('pn-clamp');

    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let vd = Number(vRange.value);
    let showLabels = true;
    let sweepTimer = null;
    let model = null;

    // --- Fizik ---
    function diodeCurrent(v) {
        if (v < -VZ) return -IS - (-v - VZ) / RZ;
        return IS * (Math.exp(v / VT) - 1);
    }

    function compute() {
        const NA = Math.pow(10, Number(naRange.value));
        const ND = Math.pow(10, Number(ndRange.value));
        const phi = VT * Math.log(NA * ND / (NI * NI));
        // Bariyer sıfıra yaklaşınca depletion approximation geçersizleşir, alt sınır koy
        const clamped = phi - vd < 0.04;
        const barrier = Math.max(phi - vd, 0.04);
        const k = 2 * EPS_S / Q * (1 / NA + 1 / ND);
        const wd0 = Math.sqrt(k * phi);
        const wd = Math.sqrt(k * barrier);
        const xn = wd / (1 + ND / NA);
        const xp = wd / (1 + NA / ND);
        const emax = 2 * barrier / wd;
        const i = diodeCurrent(vd);

        let region;
        if (vd < -VZ) region = 'breakdown';
        else if (vd < -0.005) region = 'reverse';
        else if (vd <= 0.005) region = 'zero';
        else if (i < 1e-6) region = 'forwardLow';
        else region = 'forwardOn';

        // Görsel ölçek: genişlik sqrt(bariyer) ile büyür; iki tarafın payı doping oranının
        // logaritmasına göre (gerçek oran 10^5'e kadar çıkabildiği için çizimde sınırlı)
        const basePx = Math.max(64, Math.min(150, 92 + 24 * Math.log10(wd0 / 1e-5)));
        const fp = Math.max(0.2, Math.min(0.8, 0.5 + 0.12 * Math.log10(ND / NA)));
        const side = (w) => [Math.min(w * fp, MAX_SIDE), Math.min(w * (1 - fp), MAX_SIDE)];
        const [xpPx, xnPx] = side(basePx * Math.sqrt(barrier / phi));
        const [xpPx0, xnPx0] = side(basePx);

        return { NA, ND, phi, barrier, clamped, wd0, wd, xn, xp, emax, i, region, xpPx, xnPx, xpPx0, xnPx0 };
    }

    // --- Biçimlendirme ---
    const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    function sup(n) { return String(n).split('').map(c => SUP[c]).join(''); }
    function minus(s) { return String(s).replace('-', '−'); }

    function sci(x) {
        if (x === 0) return '0';
        const a = Math.abs(x);
        if (a >= 0.01 && a < 10000) return minus(parseFloat(x.toPrecision(3)));
        const e = Math.floor(Math.log10(a));
        const m = parseFloat((x / Math.pow(10, e)).toPrecision(3));
        return (m === 1 ? '' : minus(m) + '×') + '10' + sup(e);
    }

    function fmtI(i) {
        const a = Math.abs(i);
        if (a < 1e-18) return '0 A';
        const units = [[1, 'A'], [1e-3, 'mA'], [1e-6, 'µA'], [1e-9, 'nA'], [1e-12, 'pA'], [1e-15, 'fA']];
        const u = units.find(x => a >= x[0] * 0.9995) || units[units.length - 1];
        return minus(parseFloat((i / u[0]).toPrecision(3))) + ' ' + u[1];
    }

    function fmtV(v) { return minus(v.toFixed(2)) + ' V'; }
    function um(cm) { return sci(cm * 1e4) + ' µm'; }

    // --- SVG yardımcıları ---
    function el(name, attrs, parent) {
        const e = document.createElementNS(SVG_NS, name);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }

    // "w_{d} = 1 µm" gibi metinlerde _{...} kısmını alt indis yapar
    function label(parent, x, y, str, attrs) {
        const t = el('text', Object.assign({ x, y }, attrs || {}), parent);
        str.split(/(_\{[^}]*\})/).forEach(part => {
            if (!part) return;
            const m = part.match(/^_\{(.*)\}$/);
            if (!m) { el('tspan', {}, t).textContent = part; return; }
            const s = el('tspan', { dy: 3, 'font-size': '10' }, t);
            s.textContent = m[1];
            el('tspan', { dy: -3 }, t).textContent = '​';
        });
        return t;
    }

    function line(parent, x1, y1, x2, y2, attrs) {
        return el('line', Object.assign({ x1, y1, x2, y2, stroke: COLORS.ink }, attrs || {}), parent);
    }

    // Kalıcı katmanlar
    const defs = el('defs', {}, svg);
    [['pn-arrow', COLORS.ink], ['pn-arrow-plot', COLORS.plot]].forEach(([id, color]) => {
        const m = el('marker', { id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        el('path', { d: 'M0,0 L10,5 L0,10 z', fill: color }, m);
    });
    const gBg = el('g', {}, svg);
    const gIons = el('g', {}, svg);
    const gCarriers = el('g', {}, svg);
    const gDyn = el('g', {}, svg);
    const gFg = el('g', {}, svg);

    // İyonlar ve onlara eşlik eden majority carrier'lar bir kez oluşturulur
    const sites = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            const x = X0 + 15 + c * PITCH;
            const y = Y0 + 12 + r * ROW_PITCH;
            const isP = x < XJ;
            const g = el('g', { class: 'pn-ion' }, gIons);
            el('circle', { cx: x, cy: y, r: 8, fill: '#fff', stroke: isP ? COLORS.neg : COLORS.pos, 'stroke-width': 1.5 }, g);
            const s = el('text', { x, y: y + 4.5, 'text-anchor': 'middle', fill: isP ? COLORS.neg : COLORS.pos, 'font-weight': 700 }, g);
            s.textContent = isP ? '−' : '+';
            const carrier = el('circle', isP
                ? { r: 4, fill: '#fff', stroke: COLORS.pos, 'stroke-width': 2, class: 'pn-carrier' }
                : { r: 4, fill: COLORS.neg, class: 'pn-carrier' }, gCarriers);
            sites.push({
                x, y, isP, g, carrier,
                ox: (Math.random() - 0.5) * 12, oy: (Math.random() - 0.5) * 10,
                f1: 0.8 + Math.random() * 1.4, f2: 0.8 + Math.random() * 1.4,
                p1: Math.random() * 6.28, p2: Math.random() * 6.28
            });
        }
    }

    function placeCarriers(t) {
        sites.forEach(s => {
            const k = reduceMotion ? 0 : 1;
            s.carrier.setAttribute('cx', (s.x + s.ox + k * 7 * Math.sin(t * s.f1 + s.p1)).toFixed(1));
            s.carrier.setAttribute('cy', (s.y + 13 + s.oy * 0.3 + k * 2.5 * Math.cos(t * s.f2 + s.p2)).toFixed(1));
        });
    }

    // --- Kesit, devre ve grafikler ---
    let wireEl = null;

    function draw() {
        const m = model;
        const xl = XJ - m.xpPx, xr = XJ + m.xnPx;      // depletion region kenarları
        const xl0 = XJ - m.xpPx0, xr0 = XJ + m.xnPx0;  // zero bias'taki kenarlar
        gBg.innerHTML = '';
        gFg.innerHTML = '';

        // Yarı iletken bölgeler
        el('rect', { x: X0, y: Y0, width: XJ - X0, height: Y1 - Y0, fill: COLORS.pSi }, gBg);
        el('rect', { x: XJ, y: Y0, width: X1 - XJ, height: Y1 - Y0, fill: COLORS.nSi }, gBg);
        el('rect', { x: xl, y: Y0, width: xr - xl, height: Y1 - Y0, fill: COLORS.dep }, gBg);

        // Depletion region içindeki iyonlar açıkta, dışındakiler carrier ile nötr
        sites.forEach(s => {
            const inside = s.x > xl && s.x < xr;
            s.g.style.opacity = inside ? 1 : 0.16;
            s.carrier.style.opacity = inside ? 0 : 1;
        });

        el('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, fill: 'none', stroke: COLORS.ink, 'stroke-width': 1.5 }, gFg);
        line(gFg, XJ, Y0, XJ, Y1, { 'stroke-width': 1.5 });
        [xl, xr].forEach(x => line(gFg, x, Y0, x, Y1, { 'stroke-dasharray': '5 4' }));
        // Metal kontaklar
        el('rect', { x: X0 - 12, y: Y0, width: 12, height: Y1 - Y0, fill: COLORS.al, stroke: COLORS.ink }, gFg);
        el('rect', { x: X1, y: Y0, width: 12, height: Y1 - Y0, fill: COLORS.al, stroke: COLORS.ink }, gFg);

        // Electric field oku (n'den p'ye)
        if (m.xpPx + m.xnPx > 44) {
            const ym = Y0 - 9;
            line(gFg, xr - 4, ym, xl + 4, ym, { stroke: COLORS.plot, 'stroke-width': Math.min(4, 1.2 + m.emax / 2.5e5), 'marker-end': 'url(#pn-arrow-plot)' });
        }

        // Devre: cathode -> sağ tel -> kaynak -> sol tel -> anode (forward akım yönü)
        const yMid = (Y0 + Y1) / 2;
        const src = 18;
        el('path', {
            d: `M${X1 + 12},${yMid} H730 V${WIRE_Y} H${XJ + src} M${XJ - src},${WIRE_Y} H30 V${yMid} H${X0 - 12}`,
            fill: 'none', stroke: COLORS.ink, 'stroke-width': 1.5
        }, gFg);
        wireEl = el('path', {
            d: `M${X1 + 12},${yMid} H730 V${WIRE_Y} H${XJ + src} M${XJ - src},${WIRE_Y} H30 V${yMid} H${X0 - 12}`,
            fill: 'none', stroke: COLORS.pos, 'stroke-width': 3, 'stroke-dasharray': '2 16', 'stroke-linecap': 'round',
            opacity: Math.abs(m.i) > 1e-11 ? 0.9 : 0
        }, gFg);
        el('circle', { cx: XJ, cy: WIRE_Y, r: src, fill: '#fff', stroke: COLORS.ink, 'stroke-width': 1.5 }, gFg);
        if (Math.abs(vd) > 0.005) {
            const fwd = vd > 0;
            label(gFg, XJ - 8, WIRE_Y + 5, fwd ? '+' : '−', { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': '15', fill: fwd ? COLORS.pos : COLORS.neg });
            label(gFg, XJ + 8, WIRE_Y + 5, fwd ? '−' : '+', { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': '15', fill: fwd ? COLORS.neg : COLORS.pos });
        }
        label(gFg, XJ + 26, WIRE_Y - 8, `v_{D} = ${fmtV(vd)}`, { 'font-weight': 600 });

        // Akım oku (alt telde): forward'da sola, reverse'te sağa
        if (Math.abs(m.i) > 1e-18) {
            const ax = 600, fwd = m.i > 0;
            line(gFg, fwd ? ax + 22 : ax - 22, WIRE_Y - 9, fwd ? ax - 22 : ax + 22, WIRE_Y - 9, {
                stroke: COLORS.pos, 'stroke-width': Math.abs(m.i) > 1e-9 ? 2.5 : 1,
                'stroke-dasharray': Math.abs(m.i) > 1e-9 ? '' : '3 3', 'marker-end': 'url(#pn-arrow)'
            });
            label(gFg, ax, WIRE_Y + 17, `i_{D} = ${fmtI(m.i)}`, { 'text-anchor': 'middle', fill: COLORS.pos, 'font-weight': 600 });
        } else {
            label(gFg, 600, WIRE_Y + 17, 'i_{D} = 0', { 'text-anchor': 'middle', fill: COLORS.pos, 'font-weight': 600 });
        }

        if (showLabels) {
            label(gFg, X0 + 10, Y0 + 20, 'p', { 'font-size': '20', 'font-style': 'italic', 'font-weight': 700 });
            label(gFg, X1 - 10, Y0 + 20, 'n', { 'font-size': '20', 'font-style': 'italic', 'font-weight': 700, 'text-anchor': 'end' });
            label(gFg, 34, yMid - 8, L('anode'), { 'text-anchor': 'middle', 'font-size': '11' });
            label(gFg, 727, yMid - 8, L('cathode'), { 'text-anchor': 'middle', 'font-size': '11' });
            label(gFg, XJ, 14, `${L('scr')}: w_{d} = ${um(m.wd)}`, { 'text-anchor': 'middle', 'font-weight': 600 });
            if (m.xpPx + m.xnPx > 44) label(gFg, xr + 6, Y0 - 5, 'E', { fill: COLORS.plot, 'font-style': 'italic', 'font-weight': 700 });
            label(gFg, xl, Y1 + 14, '−x_{p}', { 'text-anchor': 'end', 'font-size': '11' });
            label(gFg, xr, Y1 + 14, 'x_{n}', { 'text-anchor': 'start', 'font-size': '11' });
            label(gFg, X0 + 4, WIRE_Y + 17, L('notScale'), { 'font-size': '10', fill: '#6c757d' });
        }

        // Grafikler: kesitle aynı x ekseni
        [xl, xr].forEach(x => line(gFg, x, Y1, x, 548, { stroke: '#bbb', 'stroke-dasharray': '2 4' }));
        const plots = [
            { y: 300, name: 'ρ(x)', sub: L('rho') },
            { y: 362, name: 'E(x)', sub: L('field') },
            { y: 540, name: 'φ(x)', sub: L('pot') }
        ];
        plots.forEach(p => {
            line(gFg, X0 - 12, p.y, X1 + 22, p.y, { 'marker-end': 'url(#pn-arrow)' });
            label(gFg, X1 + 28, p.y + 4, 'x', { 'font-style': 'italic' });
            label(gFg, 6, p.y === 540 ? 470 : p.y - 22, p.name, { 'font-style': 'italic', 'font-weight': 700 });
            label(gFg, 6, p.y === 540 ? 484 : p.y - 8, p.sub, { 'font-size': '10', fill: '#6c757d' });
        });
        line(gFg, XJ, 262, XJ, 338, {});
        line(gFg, XJ, 352, XJ, 440, {});
        line(gFg, XJ, 455, XJ, 546, {});
        label(gFg, X1 + 10, 262, L('zeroBias'), { 'text-anchor': 'end', 'font-size': '10', fill: COLORS.ghost });

        // ρ(x): alanlar eşit (qN_A·x_p = qN_D·x_n)
        const rhoRect = (a, b, color, dash) => {
            const A = 34 * Math.min(a, b);
            const hp = A / a, hn = A / b;
            el('path', {
                d: `M${XJ - a},300 V${300 + hp} H${XJ} V${300 - hn} H${XJ + b} V300`,
                fill: dash ? 'none' : 'rgba(230, 0, 200, 0.12)', stroke: color, 'stroke-width': dash ? 1 : 2, 'stroke-dasharray': dash ? '4 3' : ''
            }, gFg);
            return [hp, hn];
        };
        rhoRect(m.xpPx0, m.xnPx0, COLORS.ghost, true);
        const [hp, hn] = rhoRect(m.xpPx, m.xnPx, COLORS.plot, false);
        if (showLabels) {
            label(gFg, XJ + 6, 300 - hn - 4, '+qN_{D}', { 'font-size': '11', fill: COLORS.pos });
            label(gFg, XJ - 6, 300 + hp + 13, '−qN_{A}', { 'font-size': '11', fill: COLORS.neg, 'text-anchor': 'end' });
        }

        // E(x): üçgen, tepe junction'da
        const peak = 20 * Math.sqrt(m.barrier / m.phi);
        el('path', { d: `M${xl0},362 L${XJ},382 L${xr0},362`, fill: 'none', stroke: COLORS.ghost, 'stroke-dasharray': '4 3' }, gFg);
        el('path', { d: `M${xl},362 L${XJ},${362 + peak} L${xr},362 z`, fill: 'rgba(230, 0, 200, 0.12)', stroke: COLORS.plot, 'stroke-width': 2 }, gFg);
        if (showLabels) label(gFg, XJ + 8, 362 + peak + 4, `−E_{MAX} = ${sci(m.emax / 1000)} kV/cm`, { 'font-size': '11' });

        // φ(x): parabol + parabol, yükseklik = bariyer
        const vMax = [1.2, 2.5, 4.5, 8].find(v => m.barrier <= v) || 8;
        const pxV = 78 / vMax;
        const curve = (a, b, total) => {
            const pts = [`${X0 - 12},540`];
            for (let s = 0; s <= 24; s++) {
                const x = -a + (a + b) * s / 24;
                const phiX = x < 0
                    ? total * (a / (a + b)) * Math.pow((x + a) / a, 2)
                    : total - total * (b / (a + b)) * Math.pow((b - x) / b, 2);
                pts.push(`${(XJ + x).toFixed(1)},${(540 - phiX * pxV).toFixed(1)}`);
            }
            pts.push(`${X1 + 12},${(540 - total * pxV).toFixed(1)}`);
            return pts.join(' ');
        };
        el('polyline', { points: curve(m.xpPx0, m.xnPx0, m.phi), fill: 'none', stroke: COLORS.ghost, 'stroke-dasharray': '4 3' }, gFg);
        el('polyline', { points: curve(m.xpPx, m.xnPx, m.barrier), fill: 'none', stroke: COLORS.plot, 'stroke-width': 2 }, gFg);
        const yTop = 540 - m.barrier * pxV;
        if (m.barrier * pxV > 14) {
            line(gFg, X1 - 18, 540, X1 - 18, yTop, { 'marker-end': 'url(#pn-arrow)', 'marker-start': 'url(#pn-arrow)' });
        }
        label(gFg, X1 - 26, Math.min(yTop + 16, 528), `φ_{j} − v_{D} = ${fmtV(m.barrier)}`, { 'text-anchor': 'end', 'font-weight': 600 });
        line(gFg, XJ - 4, 540 - vMax * pxV, XJ + 4, 540 - vMax * pxV, {});
        label(gFg, XJ - 8, 540 - vMax * pxV + 4, `${vMax} V`, { 'text-anchor': 'end', 'font-size': '10', fill: '#6c757d' });
    }

    // --- i-v grafiği ---
    function drawIV() {
        ivSvg.innerHTML = '';
        const W = 300, H = 200;
        const px = v => 14 + (v + 6.6) / 7.8 * (W - 28);
        const py = i => H / 2 - Math.max(-21, Math.min(21, i * 1000)) / 21 * (H / 2 - 14);
        const d = el('defs', {}, ivSvg);
        const mk = el('marker', { id: 'pn-iv-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, d);
        el('path', { d: 'M0,0 L10,5 L0,10 z', fill: COLORS.ink }, mk);
        line(ivSvg, 8, py(0), W - 6, py(0), { 'marker-end': 'url(#pn-iv-arrow)' });
        line(ivSvg, px(0), H - 6, px(0), 6, { 'marker-end': 'url(#pn-iv-arrow)' });
        for (let v = -6; v <= 1; v++) {
            if (v === 0) continue;
            line(ivSvg, px(v), py(0) - 3, px(v), py(0) + 3, {});
            if (v % 2 === 0 || v === 1 || v === -VZ) label(ivSvg, px(v), py(0) + 15, minus(v), { 'text-anchor': 'middle', 'font-size': '10' });
        }
        label(ivSvg, W - 8, py(0) - 6, 'v_{D} (V)', { 'text-anchor': 'end', 'font-size': '11', 'font-style': 'italic' });
        label(ivSvg, px(0) - 6, 14, 'i_{D}', { 'text-anchor': 'end', 'font-size': '11', 'font-style': 'italic' });
        label(ivSvg, px(-VZ), py(0) - 8, '−V_{Z}', { 'text-anchor': 'middle', 'font-size': '11', fill: COLORS.pos });
        label(ivSvg, px(0.5) - 4, py(0.006), L('turnOn'), { 'text-anchor': 'end', 'font-size': '10', fill: '#6c757d' });

        const pts = [];
        for (let v = -6.4; v <= 0.78; v += 0.01) pts.push(`${px(v).toFixed(1)},${py(diodeCurrent(v)).toFixed(1)}`);
        el('polyline', { points: pts.join(' '), fill: 'none', stroke: COLORS.plot, 'stroke-width': 2 }, ivSvg);
        line(ivSvg, px(vd), py(0), px(vd), py(model.i), { stroke: COLORS.ghost, 'stroke-dasharray': '3 3' });
        el('circle', { cx: px(vd), cy: py(model.i), r: 6, fill: COLORS.pos, stroke: '#fff', 'stroke-width': 2 }, ivSvg);
    }

    // --- Yan panel ---
    function drawPanel() {
        const m = model;
        const r = REGIONS[m.region];
        const rows = L('rows');
        badgeEl.className = 'badge align-self-start mb-2 ' + r.badge;
        badgeEl.textContent = ({ zero: 'Zero bias', reverse: 'Reverse bias', forwardLow: 'Forward bias', forwardOn: 'Forward bias', breakdown: 'Breakdown' })[m.region];
        titleEl.textContent = tx2(r.title);
        textEl.innerHTML = tx2(r.text);
        const list = [
            [rows.phi, fmtV(m.phi)],
            [rows.barrier, (m.clamped ? '≈ ' : '') + fmtV(m.barrier)],
            [rows.wd, um(m.wd)],
            [rows.wd0, um(m.wd0)],
            [rows.xp, um(m.xp)],
            [rows.xn, um(m.xn)],
            [rows.emax, sci(m.emax / 1000) + ' kV/cm'],
            [rows.id, fmtI(m.i)]
        ];
        valuesEl.innerHTML = list.map(([k, v]) =>
            `<li class="list-group-item py-1 d-flex justify-content-between gap-2"><span>${k}</span><span class="fw-semibold text-nowrap">${v}</span></li>`).join('');
        clampEl.classList.toggle('d-none', !m.clamped);
    }

    function dopingText(exp) {
        const e = Math.floor(exp);
        const mant = Math.pow(10, exp - e);
        return (mant < 1.01 ? '' : mant.toFixed(1) + '×') + '10' + sup(e) + ' cm⁻³';
    }

    function update() {
        vd = Math.max(V_MIN, Math.min(V_MAX, vd));
        vRange.value = vd;
        model = compute();
        vOut.textContent = fmtV(vd);
        naOut.textContent = dopingText(Number(naRange.value));
        ndOut.textContent = dopingText(Number(ndRange.value));
        draw();
        drawIV();
        drawPanel();
        document.querySelectorAll('[data-pn-v]').forEach(b => {
            const on = Math.abs(Number(b.dataset.pnV) - vd) < 0.005;
            b.classList.toggle('btn-primary', on);
            b.classList.toggle('btn-outline-primary', !on);
        });
        if (reduceMotion) placeCarriers(0);
    }

    // --- Hareketli carrier'lar ---
    // forward: majority carrier'lar junction'ı geçip karşıda recombine olur
    // reverse: depletion region'da oluşan pair'ler field ile süpürülür (I_S); breakdown'da çığ gibi artar
    const dyn = [];
    let acc = 0, dash = 0, last = null;

    function spawn(type, x, vx, endX) {
        if (dyn.length > 140) return;
        const y = Y0 + 12 + Math.random() * (Y1 - Y0 - 24);
        const node = el('circle', type === 'h'
            ? { r: 4, fill: '#fff', stroke: COLORS.pos, 'stroke-width': 2 }
            : { r: 4, fill: COLORS.neg }, gDyn);
        dyn.push({ node, x, y, vx, endX, x0: x });
    }

    function frame(now) {
        requestAnimationFrame(frame);
        if (last === null) last = now;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const m = model;
        placeCarriers(now / 1000);

        const xl = XJ - m.xpPx, xr = XJ + m.xnPx;
        let rate = 0;
        if (m.i > 1e-9) rate = 0.5 + 1.6 * Math.log10(m.i / 1e-9);           // forward
        else if (m.region === 'breakdown') rate = 2 + Math.min(24, -m.i * 1500);
        else if (m.region === 'reverse') rate = 0.5;
        acc += rate * dt;
        while (acc >= 1) {
            acc -= 1;
            if (m.i > 1e-9) {
                spawn('h', xl - Math.random() * 25, 75, xr + 25 + Math.random() * 90);
                spawn('e', xr + Math.random() * 25, -75, xl - 25 - Math.random() * 90);
            } else {
                const x = xl + Math.random() * (xr - xl);
                const speed = m.region === 'breakdown' ? 220 : 110;
                spawn('e', x, speed, xr + 30);
                spawn('h', x, -speed, xl - 30);
            }
        }
        for (let k = dyn.length - 1; k >= 0; k--) {
            const p = dyn[k];
            p.x += p.vx * dt;
            const left = (p.endX - p.x) * Math.sign(p.vx);
            if (left <= 0) { p.node.remove(); dyn.splice(k, 1); continue; }
            p.node.setAttribute('cx', p.x.toFixed(1));
            p.node.setAttribute('cy', p.y.toFixed(1));
            p.node.setAttribute('opacity', Math.min(1, left / 22, Math.abs(p.x - p.x0) / 12 + 0.2).toFixed(2));
        }

        // Teldeki akım: forward akım path yönünde ilerler
        const a = Math.abs(m.i);
        if (wireEl && a > 1e-11) {
            const speed = Math.min(90, 9 * Math.log10(a / 1e-11));
            dash -= Math.sign(m.i) * speed * dt;
            wireEl.setAttribute('stroke-dashoffset', dash.toFixed(1));
        }
    }

    // --- Kontroller ---
    function stopSweep() {
        clearInterval(sweepTimer);
        sweepTimer = null;
        sweepBtn.textContent = L('sweep');
    }

    function sweep() {
        if (sweepTimer) { stopSweep(); return; }
        vd = V_MIN;
        sweepBtn.textContent = L('stop');
        sweepTimer = setInterval(() => {
            vd = Math.round((vd + (vd < -0.5 ? 0.05 : 0.01)) * 100) / 100;
            if (vd >= V_MAX) { vd = V_MAX; stopSweep(); }
            update();
        }, 50);
        update();
    }

    vRange.min = V_MIN;
    vRange.max = V_MAX;
    vRange.addEventListener('input', () => { stopSweep(); vd = Number(vRange.value); update(); });
    naRange.addEventListener('input', update);
    ndRange.addEventListener('input', update);
    sweepBtn.addEventListener('click', sweep);
    labelToggle.addEventListener('change', () => { showLabels = labelToggle.checked; update(); });
    document.querySelectorAll('[data-pn-v]').forEach(b => {
        b.addEventListener('click', () => { stopSweep(); vd = Number(b.dataset.pnV); update(); });
    });
    document.addEventListener('keydown', (e) => {
        if (e.target.closest('input, textarea, select')) return;
        if (e.key === 'ArrowRight') { stopSweep(); vd = Math.round((vd + 0.05) * 100) / 100; update(); }
        if (e.key === 'ArrowLeft') { stopSweep(); vd = Math.round((vd - 0.05) * 100) / 100; update(); }
    });

    function renderAll() {
        sweepBtn.textContent = L(sweepTimer ? 'stop' : 'sweep');
        update();
    }

    if (window.i18next) i18next.on('languageChanged', () => setTimeout(renderAll, 0));
    renderAll();
    if (!reduceMotion) requestAnimationFrame(frame);
})();
