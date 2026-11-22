// FET simülasyonları (Chapter 4): MOSFET (NMOS/PMOS, enhancement/depletion) ve JFET
// Denklemler ders notundaki (Chap 4) triode / saturation (pinch-off) denklemlerini takip eder.
// Sayfada #mos-sim varsa MOSFET, #jfet-sim varsa JFET simülasyonu çalışır.

(function () {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const COLORS = {
        pSi: '#eaf4ee',
        nSi: '#f7d6ec',
        pPlus: '#b5dcc2',
        nPlus: '#e9a9d3',
        ox: '#d9e6f5',
        poly: '#9a9a9a',
        metal: '#7d7d7d',
        dep: '#fffdf0',
        depLine: '#c9b458',
        pos: 'rgb(204, 0, 0)',     // hole, donor iyonu (+)
        neg: '#0d6efd',            // elektron, acceptor iyonu (−)
        plot: '#e600c8',
        ghost: '#b5b5b5',
        ink: '#212529',
        muted: '#6c757d'
    };
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Ortak yardımcılar ----------
    function lang() {
        let l = window.i18next && i18next.language;
        if (!l) {
            try { l = localStorage.getItem('lang'); } catch (e) { l = null; }
        }
        return l && l.startsWith('en') ? 'en' : 'tr';
    }
    const tx = (obj) => obj[lang()];

    function el(tag, attrs, parent) {
        const n = document.createElementNS(SVG_NS, tag);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }

    // "v_{GS}" gibi alt indisleri tspan'a çevirir
    function label(parent, x, y, str, attrs) {
        const t = el('text', Object.assign({ x, y }, attrs || {}), parent);
        str.split(/(_\{[^}]*\}|\^\{[^}]*\})/).forEach(part => {
            if (!part) return;
            if (part.startsWith('_{')) {
                el('tspan', { 'baseline-shift': 'sub', 'font-size': '0.75em' }, t).textContent = part.slice(2, -1);
            } else if (part.startsWith('^{')) {
                el('tspan', { 'baseline-shift': 'super', 'font-size': '0.75em' }, t).textContent = part.slice(2, -1);
            } else {
                el('tspan', {}, t).textContent = part;
            }
        });
        return t;
    }

    const minus = (s) => String(s).replace(/-/g, '−');
    const fmtV = (v, d = 2) => minus((Math.abs(v) < 0.005 ? 0 : v).toFixed(d)) + ' V';

    function fmtI(i) {
        const a = Math.abs(i);
        if (a < 1e-9) return '0 A';
        const u = a >= 1e-3 ? [1e-3, 'mA'] : a >= 1e-6 ? [1e-6, 'µA'] : [1e-9, 'nA'];
        return minus(parseFloat((i / u[0]).toPrecision(3))) + ' ' + u[1];
    }

    function fmtR(r) {
        if (!isFinite(r)) return '∞';
        if (r >= 1e6) return parseFloat((r / 1e6).toPrecision(3)) + ' MΩ';
        if (r >= 1e3) return parseFloat((r / 1e3).toPrecision(3)) + ' kΩ';
        return parseFloat(r.toPrecision(3)) + ' Ω';
    }

    function fmtG(g) {
        if (g <= 0) return '0';
        if (g >= 1e-3) return parseFloat((g * 1e3).toPrecision(3)) + ' mA/V';
        return parseFloat((g * 1e6).toPrecision(3)) + ' µA/V';
    }

    function niceMax(v) {
        const e = Math.pow(10, Math.floor(Math.log10(v)));
        for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * e >= v) return m * e;
        return 10 * e;
    }

    // Grafik çerçevesi: eksenler, grid, etiketler
    function plotFrame(svg, o) {
        svg.textContent = '';
        const W = 360, H = 250, L = 52, R = 14, T = 14, B = 40;
        const pw = W - L - R, ph = H - T - B;
        const px = (x) => L + (x - o.x0) / (o.x1 - o.x0) * pw;
        const py = (y) => T + ph - Math.min(y, o.y1 * 1.04) / o.y1 * ph;
        const g = el('g', {}, svg);
        o.xticks.forEach(t => {
            el('line', { x1: px(t), y1: T, x2: px(t), y2: T + ph, stroke: '#ececec' }, g);
            el('text', { x: px(t), y: T + ph + 15, 'text-anchor': 'middle', 'font-size': 11, fill: COLORS.ink }, g).textContent = minus(t);
        });
        for (let k = 0; k <= 4; k++) {
            const y = o.y1 * k / 4;
            el('line', { x1: L, y1: py(y), x2: L + pw, y2: py(y), stroke: '#ececec' }, g);
            el('text', { x: L - 5, y: py(y) + 4, 'text-anchor': 'end', 'font-size': 11, fill: COLORS.ink }, g).textContent = parseFloat((y * 1e3).toPrecision(3));
        }
        const xa = o.x0 < 0 && o.x1 > 0 ? px(0) : L;
        el('line', { x1: L, y1: T + ph, x2: L + pw, y2: T + ph, stroke: COLORS.ink }, g);
        el('line', { x1: xa, y1: T, x2: xa, y2: T + ph, stroke: COLORS.ink }, g);
        label(g, L + pw / 2, H - 6, o.xlab, { 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', fill: COLORS.ink });
        const yl = label(g, 13, T + ph / 2, o.ylab, { 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', fill: COLORS.ink });
        yl.setAttribute('transform', `rotate(-90 13 ${T + ph / 2})`);
        return { px, py, g, L, T, pw, ph };
    }

    function polyline(g, pts, attrs) {
        return el('polyline', Object.assign({ points: pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), fill: 'none' }, attrs), g);
    }

    // Gradual channel: kanal boyunca (0..1) potansiyel, V(u) = Vov − sqrt(Vov² − u·(Vov² − (Vov − Vds)²))
    function channelV(u, vov, vds) {
        const a = vov * vov, b = (vov - vds) * (vov - vds);
        return vov - Math.sqrt(Math.max(0, a - u * (a - b)));
    }

    function setActive(buttons, isOn, onCls, offCls) {
        buttons.forEach(b => {
            const on = isOn(b);
            b.classList.toggle(onCls, on);
            b.classList.toggle(offCls, !on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function renderValues(list, rows) {
        list.innerHTML = rows.map(([k, v, hl]) =>
            `<li class="list-group-item d-flex justify-content-between px-0${hl ? ' fw-semibold' : ''}"><span>${k}</span><span class="text-nowrap ms-2">${v}</span></li>`).join('');
    }

    // ================================================================
    // MOSFET
    // ================================================================
    function initMos(root) {
        const svg = document.getElementById('mos-svg');
        const outSvg = document.getElementById('mos-out');
        const trSvg = document.getElementById('mos-tr');
        const symSvg = document.getElementById('mos-sym');
        const vgsR = document.getElementById('mos-vgs');
        const vdsR = document.getElementById('mos-vds');
        const vsbR = document.getElementById('mos-vsb');
        const vgsOut = document.getElementById('mos-vgs-out');
        const vdsOut = document.getElementById('mos-vds-out');
        const vsbOut = document.getElementById('mos-vsb-out');
        const vsbLab = document.getElementById('mos-vsb-label');
        const headOut = document.getElementById('mos-head');
        const lamSw = document.getElementById('mos-lambda');
        const labSw = document.getElementById('mos-labels');
        const badgeEl = document.getElementById('mos-region');
        const titleEl = document.getElementById('mos-title');
        const textEl = document.getElementById('mos-text');
        const eqEl = document.getElementById('mos-eq');
        const valuesEl = document.getElementById('mos-values');
        const sweepG = document.getElementById('mos-sweep-gs');
        const sweepD = document.getElementById('mos-sweep-ds');

        // Parametreler: PMOS daha geniş seçildi (K_p' küçük olduğu için) ki iki tipin akımları eşit olsun
        const P = {
            n: { kp: 100e-6, wl: 10, vto: { enh: 1, dep: -2 } },
            p: { kp: 40e-6, wl: 25, vto: { enh: -1, dep: 2 } }
        };
        const GAMMA = 0.5, PHI2 = 0.6, LAMBDA = 0.05;
        const VGS_MAX = 6, VDS_MAX = 6;

        let type = 'n', mode = 'enh';
        // İçeride hep "NMOS cinsinden" çalışıyoruz: g = s·v_GS, d = s·v_DS, b = |v_SB| (s = +1 NMOS, −1 PMOS)
        let g = 3, d = 4, b = 0;
        let showLabels = true;
        let timer = null;
        let m = null;

        const UI = {
            tr: {
                src: 'Source', drn: 'Drain', gate: 'Gate', body: 'Body',
                sub: { n: 'p-type substrate', p: 'n-type substrate' },
                chan: 'channel', pinch: 'pinch-off', implant: 'implanted channel', depl: 'depletion region',
                type: 'Tip', vt: 'Threshold', vov: 'Overdrive', vdsat: 'v_{DS(sat)}', id: 'Drain akımı i<sub>D</sub>',
                ron: 'R<sub>on</sub> (küçük v<sub>DS</sub>)', gm: 'g<sub>m</sub>', kn: 'K<sub>n</sub> = K<sub>n</sub>\'·W/L', kp: 'K<sub>p</sub> = K<sub>p</sub>\'·W/L',
                sweepG: 'v<sub>GS</sub> Tara', sweepD: 'v<sub>DS</sub> Tara', stop: 'Durdur',
                curves: 'gri: diğer v_{GS} değerleri', bound: 'kesikli: v_{DS} = v_{GS} − V_{T}',
                names: { nenh: 'NMOS enhancement', ndep: 'NMOS depletion', penh: 'PMOS enhancement', pdep: 'PMOS depletion' }
            },
            en: {
                src: 'Source', drn: 'Drain', gate: 'Gate', body: 'Body',
                sub: { n: 'p-type substrate', p: 'n-type substrate' },
                chan: 'channel', pinch: 'pinch-off', implant: 'implanted channel', depl: 'depletion region',
                type: 'Type', vt: 'Threshold', vov: 'Overdrive', vdsat: 'v_{DS(sat)}', id: 'Drain current i<sub>D</sub>',
                ron: 'R<sub>on</sub> (small v<sub>DS</sub>)', gm: 'g<sub>m</sub>', kn: 'K<sub>n</sub> = K<sub>n</sub>\'·W/L', kp: 'K<sub>p</sub> = K<sub>p</sub>\'·W/L',
                sweepG: 'Sweep v<sub>GS</sub>', sweepD: 'Sweep v<sub>DS</sub>', stop: 'Stop',
                curves: 'gray: other v_{GS} values', bound: 'dashed: v_{DS} = v_{GS} − V_{T}',
                names: { nenh: 'NMOS enhancement', ndep: 'NMOS depletion', penh: 'PMOS enhancement', pdep: 'PMOS depletion' }
            }
        };
        const L = (k) => UI[lang()][k];

        // Tipe göre kelimeler
        function words() {
            const n = type === 'n';
            return {
                tr: {
                    car: n ? 'elektronlar' : 'hole\'lar', carAbl: n ? 'elektronlardan' : 'hole\'lardan', carAcc: n ? 'elektronları' : 'hole\'ları',
                    maj: n ? 'hole\'lar' : 'elektronlar', well: n ? 'n<sup>+</sup>' : 'p<sup>+</sup>',
                    VT: n ? 'V<sub>TN</sub>' : 'V<sub>TP</sub>',
                    off: n ? 'v<sub>GS</sub> ≤ V<sub>TN</sub>' : 'v<sub>GS</sub> ≥ V<sub>TP</sub>'
                },
                en: {
                    car: n ? 'electrons' : 'holes', carAbl: n ? 'electrons' : 'holes', carAcc: n ? 'the electrons' : 'the holes',
                    maj: n ? 'holes' : 'electrons', well: n ? 'n<sup>+</sup>' : 'p<sup>+</sup>',
                    VT: n ? 'V<sub>TN</sub>' : 'V<sub>TP</sub>',
                    off: n ? 'v<sub>GS</sub> ≤ V<sub>TN</sub>' : 'v<sub>GS</sub> ≥ V<sub>TP</sub>'
                }
            };
        }

        const REGIONS = {
            acc: {
                badge: 'text-bg-secondary',
                title: { tr: 'Cutoff: accumulation', en: 'Cutoff: accumulation' },
                text: {
                    tr: 'Gate voltajı substrate\'ın majority carrier\'larını ({maj}) oxide\'ın altına çekiyor (<strong>accumulation</strong>). Source ile drain arasında kanal yok; iki {well} bölge arka arkaya bağlı iki ters diode gibi akımı engelliyor: i<sub>D</sub> = 0.',
                    en: 'The gate voltage attracts the majority carriers of the substrate ({maj}) under the oxide (<strong>accumulation</strong>). There is no channel between source and drain; the two {well} regions act like two back-to-back diodes and block the current: i<sub>D</sub> = 0.'
                }
            },
            cutEnh: {
                badge: 'text-bg-secondary',
                title: { tr: 'Cutoff: depletion', en: 'Cutoff: depletion' },
                text: {
                    tr: 'Gate majority carrier\'ları ({maj}) yüzeyden itti ve oxide\'ın altında bir <strong>depletion region</strong> oluştu. Ama {car} henüz bir inversion layer oluşturacak kadar toplanmadı. {off} olduğu sürece kanal yok: <strong>cutoff</strong>, i<sub>D</sub> = 0.',
                    en: 'The gate has pushed the majority carriers ({maj}) away from the surface and a <strong>depletion region</strong> has formed under the oxide. But not enough {car} have gathered yet to form an inversion layer. As long as {off}, there is no channel: <strong>cutoff</strong>, i<sub>D</sub> = 0.'
                }
            },
            cutDep: {
                badge: 'text-bg-secondary',
                title: { tr: 'Cutoff: kanal boşaldı', en: 'Cutoff: channel depleted' },
                text: {
                    tr: 'Bu depletion-mode transistörün implanted kanalı baştan vardı, ama gate voltajı kanaldaki {carAcc} tamamen dışarı itti (kanal deplete oldu). {off} olduğu için <strong>cutoff</strong>: i<sub>D</sub> = 0.',
                    en: 'This depletion-mode transistor had an implanted channel from the start, but the gate voltage has pushed {carAcc} out of it completely (the channel is depleted). Since {off}, it is in <strong>cutoff</strong>: i<sub>D</sub> = 0.'
                }
            },
            triode: {
                badge: 'text-bg-primary',
                title: { tr: 'Triode (linear) region', en: 'Triode (linear) region' },
                text: {
                    tr: 'Source ile drain arasında {carAbl} oluşan bir kanal var. |v<sub>DS</sub>| &lt; |v<sub>GS</sub> − {VT}| olduğu için kanal drain tarafında biraz incelse de iki uçta da açık: <strong>triode</strong>. Transistör, değeri v<sub>GS</sub> ile ayarlanan bir direnç gibi davranıyor (R<sub>on</sub>). |v<sub>DS</sub>|\'yi artırınca akım artıyor ama eğri yavaş yavaş düzleşiyor.',
                    en: 'There is a channel of {carAbl} between source and drain. Since |v<sub>DS</sub>| &lt; |v<sub>GS</sub> − {VT}|, the channel narrows somewhat at the drain end but stays open at both ends: <strong>triode</strong>. The transistor behaves like a resistor whose value is set by v<sub>GS</sub> (R<sub>on</sub>). Increasing |v<sub>DS</sub>| increases the current, but the curve gradually flattens.'
                }
            },
            sat: {
                badge: 'text-bg-success',
                title: { tr: 'Saturation (pinch-off)', en: 'Saturation (pinch-off)' },
                text: {
                    tr: '|v<sub>DS</sub>| ≥ |v<sub>GS</sub> − {VT}|: kanal drain ucunda kayboldu (<strong>pinch-off</strong>). Fazladan voltaj pinch-off noktası ile drain arasındaki depleted bölgeye düşüyor ve {car} bu bölgeyi field ile hızla geçiyor. Akım artık v<sub>DS</sub>\'ye neredeyse bağlı değil, sadece v<sub>GS</sub> ile kontrol ediliyor: <strong>saturation</strong>.',
                    en: '|v<sub>DS</sub>| ≥ |v<sub>GS</sub> − {VT}|: the channel has vanished at the drain end (<strong>pinch-off</strong>). The extra voltage drops across the depleted region between the pinch-off point and the drain, which the {car} cross quickly under the field. The current hardly depends on v<sub>DS</sub> anymore and is controlled only by v<sub>GS</sub>: <strong>saturation</strong>.'
                }
            }
        };
        const EXTRA = {
            dep: {
                tr: ' Depletion-mode olduğu için v<sub>GS</sub> = 0\'da bile kanal var.',
                en: ' Being a depletion-mode device, it has a channel even at v<sub>GS</sub> = 0.'
            },
            lam: {
                tr: ' λ açık: pinch-off noktası source\'a doğru kayıyor, etkin kanal kısalıyor ve akım v<sub>DS</sub> ile hafifçe artıyor.',
                en: ' λ is on: the pinch-off point moves toward the source, the effective channel gets shorter and the current rises slightly with v<sub>DS</sub>.'
            },
            body: {
                tr: ' Body effect threshold\'u {dvt} kaydırdı.',
                en: ' The body effect has shifted the threshold by {dvt}.'
            }
        };

        function fill(str) {
            const w = words()[lang()];
            return str.replace(/\{(\w+)\}/g, (all, k) => (k in w ? w[k] : all));
        }

        // --- Fizik (NMOS cinsinden) ---
        function vt0() { return type === 'n' ? P.n.vto[mode] : -P.p.vto[mode]; }   // pozitif = enhancement
        function vtOf(bb) { return vt0() + GAMMA * (Math.sqrt(bb + PHI2) - Math.sqrt(PHI2)); }
        function kOf() { const p = P[type]; return p.kp * p.wl; }
        function lam() { return lamSw.checked ? LAMBDA : 0; }

        function current(gg, dd, vt) {
            const K = kOf(), vov = gg - vt, l = lam();
            if (vov <= 0) return 0;
            if (dd < vov) return K * (vov - dd / 2) * dd * (1 + l * dd);
            return K / 2 * vov * vov * (1 + l * dd);
        }

        function compute() {
            const vt = vtOf(b), vov = g - vt, K = kOf();
            const i = current(g, d, vt);
            let region;
            if (vov <= 0) region = mode === 'dep' ? 'cutDep' : (g <= 0 ? 'acc' : 'cutEnh');
            else region = d < vov ? 'triode' : 'sat';
            m = { vt, vov, K, i, region };
        }

        // --- Kesit çizimi ---
        const XS = 230, XD = 530, YS = 132;     // kanal başı/sonu, silicon yüzeyi
        const gStatic = el('g', {}, svg);
        const gDep = el('g', {}, svg);
        const gTop = el('g', {}, svg);
        const gChan = el('g', {}, svg);
        const gDyn = el('g', {}, svg);
        const gLab = el('g', {}, svg);

        function chanThick(u) {
            // kanal kalınlığı (px): yerel overdrive ile orantılı
            const { vov } = m;
            if (vov <= 0) return 0;
            const de = Math.min(d, vov);
            return Math.max(0, Math.min(26, 5 * (vov - channelV(u, vov, de))));
        }

        function pinchU() {
            if (m.region !== 'sat') return 1;
            // pinch-off noktası: v_DS arttıkça source'a doğru kayar (λ açıkken daha belirgin)
            const k = lam() > 0 ? 0.05 : 0.025;
            return 1 - Math.min(0.22, 0.04 + k * (d - m.vov));
        }

        function depthUnderGate() {
            // gate altındaki depletion derinliği (px): yüzey potansiyeli + body bias
            const vt = m.vt;
            const psi = mode === 'enh' ? Math.max(0, Math.min(g, vt)) / Math.max(vt, 0.1) : 1;
            return 22 + 50 * Math.sqrt((psi * PHI2 + b) / (PHI2 + 4));
        }

        function draw() {
            const n = type === 'n';
            const sub = n ? COLORS.pSi : COLORS.nSi;
            const well = n ? COLORS.nPlus : COLORS.pPlus;
            const carCol = n ? COLORS.neg : COLORS.pos;
            [gStatic, gDep, gTop, gChan, gLab].forEach(x => { x.textContent = ''; });

            // substrate ve body kontağı
            el('rect', { x: 40, y: YS, width: 680, height: 160, fill: sub, stroke: '#555' }, gStatic);
            el('rect', { x: 340, y: YS + 160, width: 80, height: 10, fill: COLORS.metal }, gStatic);
            el('path', { d: `M380,${YS + 170} L380,${YS + 186}`, stroke: COLORS.ink, 'stroke-width': 2 }, gStatic);

            // depletion region (gate altı + well çevresi)
            const dep = depthUnderGate();
            const wellDep = 7 + 5 * Math.sqrt(b + 0.6);
            const drainDep = wellDep + 4 * Math.sqrt(Math.max(0, d));
            el('path', { d: `M${80 - wellDep},${YS} L${80 - wellDep},${YS + 50} Q${80 - wellDep},${YS + 60 + wellDep} ${110},${YS + 60 + wellDep} L${XS + 10},${YS + 60 + wellDep} L${XS + 10},${YS + dep} L${XD - 10},${YS + dep} L${XD - 10},${YS + 60 + drainDep} L${650},${YS + 60 + drainDep} Q${680 + drainDep},${YS + 60 + drainDep} ${680 + drainDep},${YS + 50} L${680 + drainDep},${YS} Z`,
                fill: COLORS.dep, stroke: COLORS.depLine, 'stroke-dasharray': '4 3' }, gDep);
            // depletion region'daki sabit iyonlar
            const ionSign = n ? '−' : '+';
            const ionCol = n ? COLORS.neg : COLORS.pos;
            for (let x = XS + 22; x < XD - 14; x += 34) {
                for (let y = YS + dep - 9; y > YS + (m.vov > 0 ? 30 : 18); y -= 18) {
                    const gI = el('g', {}, gDep);
                    el('rect', { x: x - 6, y: y - 6, width: 12, height: 12, rx: 3, fill: '#fff', stroke: ionCol }, gI);
                    el('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: ionCol }, gI).textContent = ionSign;
                }
            }

            // source / drain well'leri
            el('path', { d: `M80,${YS} L80,${YS + 40} Q80,${YS + 60} 100,${YS + 60} L${XS - 10},${YS + 60} Q${XS},${YS + 60} ${XS},${YS + 40} L${XS},${YS} Z`, fill: well, stroke: '#555' }, gTop);
            el('path', { d: `M${XD},${YS} L${XD},${YS + 40} Q${XD},${YS + 60} ${XD + 10},${YS + 60} L660,${YS + 60} Q680,${YS + 60} 680,${YS + 40} L680,${YS} Z`, fill: well, stroke: '#555' }, gTop);

            // oxide, gate, kontaklar, teller
            el('rect', { x: XS - 8, y: YS - 12, width: XD - XS + 16, height: 12, fill: COLORS.ox, stroke: '#8aa4c8' }, gTop);
            el('rect', { x: XS - 4, y: YS - 46, width: XD - XS + 8, height: 34, fill: COLORS.poly }, gTop);
            [[125, 'S'], [575, 'D']].forEach(([x]) => {
                el('rect', { x, y: YS - 30, width: 60, height: 30, fill: COLORS.metal }, gTop);
                el('path', { d: `M${x + 30},${YS - 30} L${x + 30},${YS - 82}`, stroke: COLORS.ink, 'stroke-width': 2 }, gTop);
            });
            el('path', { d: `M380,${YS - 46} L380,${YS - 82}`, stroke: COLORS.ink, 'stroke-width': 2 }, gTop);

            // implanted kanal (depletion-mode)
            if (mode === 'dep') {
                el('rect', { x: XS, y: YS, width: XD - XS, height: 9, fill: 'none', stroke: carCol, 'stroke-dasharray': '3 3', opacity: 0.7 }, gChan);
            }

            // kanal
            if (m.vov > 0) {
                const up = pinchU();
                const top = [], bot = [];
                const N = 60;
                for (let k = 0; k <= N; k++) {
                    const u = k / N * up;
                    const uu = m.region === 'sat' ? u / up : u;
                    const t = m.region === 'sat' ? Math.max(1.2, chanThickSat(uu)) : Math.max(1.2, chanThick(uu));
                    const x = XS + u * (XD - XS);
                    top.push([x, YS]);
                    bot.push([x, YS + t]);
                }
                const pts = top.concat(bot.reverse());
                el('polygon', { points: pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '), fill: carCol, opacity: 0.45 }, gChan);
                if (m.region === 'sat') {
                    const xp = XS + up * (XD - XS);
                    el('line', { x1: xp, y1: YS - 2, x2: xp, y2: YS + 22, stroke: COLORS.ink, 'stroke-dasharray': '2 2' }, gChan);
                }
            }

            // accumulation: majority carrier'lar yüzeyde
            if (mode === 'enh' && g < 0) {
                const op = Math.min(1, -g / 2);
                for (let x = XS + 10; x < XD - 4; x += 15) {
                    if (n) el('circle', { cx: x, cy: YS + 5, r: 3.5, fill: '#fff', stroke: COLORS.pos, 'stroke-width': 2, opacity: op }, gChan);
                    else el('circle', { cx: x, cy: YS + 5, r: 3.5, fill: COLORS.neg, opacity: op }, gChan);
                }
            }

            // Etiketler ve uç voltajları
            const s = n ? 1 : -1;
            label(gLab, 155, YS - 88, 'S  0 V', { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13 });
            label(gLab, 380, YS - 88, 'G  ' + fmtV(s * g, 2), { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13 });
            label(gLab, 605, YS - 88, 'D  ' + fmtV(s * d, 2), { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13 });
            label(gLab, 392, YS + 186, 'B  ' + fmtV(-s * b, 2), { 'text-anchor': 'start', 'font-weight': 700, 'font-size': 13 });
            if (showLabels) {
                const wl = n ? 'n^{+}' : 'p^{+}';
                label(gLab, 155, YS + 34, wl + ' ' + L('src').toLowerCase(), { 'text-anchor': 'middle', 'font-size': 12 });
                label(gLab, 605, YS + 34, wl + ' ' + L('drn').toLowerCase(), { 'text-anchor': 'middle', 'font-size': 12 });
                label(gLab, 380, YS - 24, 'gate (poly)', { 'text-anchor': 'middle', 'font-size': 12, fill: '#fff' });
                label(gLab, 120, YS + 145, L('sub')[type], { 'text-anchor': 'start', 'font-size': 12 });
                label(gLab, 712, YS - 18, 'SiO_{2}', { 'text-anchor': 'end', 'font-size': 11, fill: COLORS.muted });
                el('path', { d: `M${XD + 6},${YS - 6} L686,${YS - 22}`, stroke: COLORS.muted, 'stroke-dasharray': '2 2' }, gLab);
                if (dep > 16) label(gLab, 380, YS + dep + 14, L('depl'), { 'text-anchor': 'middle', 'font-size': 11, fill: '#9a7d0a' });
                if (m.region === 'sat') {
                    const xp = XS + pinchU() * (XD - XS);
                    label(gLab, xp, YS + 36, L('pinch'), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600 });
                } else if (m.vov > 0) {
                    label(gLab, 300, YS + 36, L('chan'), { 'text-anchor': 'middle', 'font-size': 11, fill: carCol, 'font-weight': 600 });
                } else if (mode === 'dep') {
                    label(gLab, 300, YS + 36, L('implant'), { 'text-anchor': 'middle', 'font-size': 11, fill: carCol });
                }
            }
            // akım oku
            if (m.i > 1e-9) {
                const down = n;   // NMOS: akım drain'e girer, PMOS: drain'den çıkar
                const y1 = down ? YS - 74 : YS - 40, y2 = down ? YS - 40 : YS - 74;
                el('path', { d: `M620,${y1} L620,${y2}`, stroke: COLORS.plot, 'stroke-width': 2.5, 'marker-end': 'url(#mos-arr)' }, gLab);
                label(gLab, 630, YS - 52, 'i_{D} = ' + fmtI(m.i), { 'text-anchor': 'start', 'font-size': 12, fill: COLORS.plot, 'font-weight': 600 });
            }
        }

        function chanThickSat(u) {
            // saturation'da kanal pinch-off noktasında sıfıra iner
            const vov = m.vov;
            return Math.max(0, Math.min(26, 5 * (vov - channelV(u, vov, vov))));
        }

        // --- Hareketli carrier'lar ---
        const dyn = [];
        function clearDyn() { dyn.forEach(p => p.node.remove()); dyn.length = 0; }
        let acc = 0, last = null;
        function frame(now) {
            requestAnimationFrame(frame);
            if (last === null) last = now;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!m) return;
            const n = type === 'n';
            const rate = m.i > 1e-7 ? Math.min(40, 6 + 10 * Math.sqrt(m.i / 1e-3)) : 0;
            acc += rate * dt;
            while (acc >= 1 && dyn.length < 90) {
                acc -= 1;
                const node = n ? el('circle', { r: 3.2, fill: COLORS.neg }, gDyn)
                    : el('circle', { r: 3.2, fill: '#fff', stroke: COLORS.pos, 'stroke-width': 1.8 }, gDyn);
                dyn.push({ node, u: 0, f: Math.random() });
            }
            if (rate === 0) acc = 0;
            const up = pinchU();
            const base = 0.12 + 0.5 * Math.sqrt(Math.max(0, m.i) / 2e-3);
            for (let k = dyn.length - 1; k >= 0; k--) {
                const p = dyn[k];
                let t, speed;
                if (m.vov <= 0) { p.node.remove(); dyn.splice(k, 1); continue; }
                if (p.u < up) {
                    const uu = m.region === 'sat' ? p.u / up : p.u;
                    t = m.region === 'sat' ? chanThickSat(uu) : chanThick(uu);
                    speed = base * Math.min(4, 8 / Math.max(2, t));
                } else {
                    t = 1.5;
                    speed = base * 5;
                }
                p.u += speed * dt;
                if (p.u >= 1) { p.node.remove(); dyn.splice(k, 1); continue; }
                const x = XS + p.u * (XD - XS);
                const y = YS + 2 + p.f * Math.max(0, t - 4);
                p.node.setAttribute('cx', x.toFixed(1));
                p.node.setAttribute('cy', y.toFixed(1));
            }
        }

        // --- Grafikler ---
        function drawOut() {
            const vtA = m.vt, K = kOf();
            const gMax = VGS_MAX, vovMax = gMax - vtOf(0);
            const yTop = niceMax(K / 2 * vovMax * vovMax * (1 + LAMBDA * VDS_MAX) * 1.02);
            const pre = type === 'n' ? '' : '−';
            const f = plotFrame(outSvg, { x0: 0, x1: VDS_MAX, y1: yTop, xticks: [0, 1, 2, 3, 4, 5, 6], xlab: pre + 'v_{DS} (V)', ylab: 'i_{D} (mA)' });
            // gri eğriler
            const steps = 5;
            for (let k = 1; k <= steps; k++) {
                const gg = vtA + (gMax - vtA) * k / steps;
                const pts = [];
                for (let j = 0; j <= 80; j++) { const dd = VDS_MAX * j / 80; pts.push([f.px(dd), f.py(current(gg, dd, vtA))]); }
                polyline(f.g, pts, { stroke: COLORS.ghost, 'stroke-width': 1.2 });
            }
            // saturation sınırı
            const bpts = [];
            for (let j = 0; j <= 60; j++) {
                const vv = (gMax - vtA) * j / 60;
                if (vv > VDS_MAX) break;
                bpts.push([f.px(vv), f.py(K / 2 * vv * vv * (1 + lam() * vv))]);
            }
            polyline(f.g, bpts, { stroke: COLORS.muted, 'stroke-dasharray': '5 4', 'stroke-width': 1.3 });
            // seçili v_GS eğrisi
            if (m.vov > 0) {
                const pts = [];
                for (let j = 0; j <= 120; j++) { const dd = VDS_MAX * j / 120; pts.push([f.px(dd), f.py(current(g, dd, vtA))]); }
                polyline(f.g, pts, { stroke: COLORS.plot, 'stroke-width': 2.4 });
            } else {
                polyline(f.g, [[f.px(0), f.py(0)], [f.px(VDS_MAX), f.py(0)]], { stroke: COLORS.plot, 'stroke-width': 2.4 });
            }
            el('circle', { cx: f.px(d), cy: f.py(m.i), r: 5.5, fill: COLORS.plot, stroke: '#fff', 'stroke-width': 1.5 }, f.g);
            if (m.region === 'triode' || m.region === 'sat') {
                label(f.g, f.L + f.pw - 4, f.T + 12, m.region === 'sat' ? 'saturation' : 'triode', { 'text-anchor': 'end', 'font-size': 11, fill: COLORS.muted });
            }
        }

        function drawTr() {
            const vtA = m.vt;
            const gMin = -4, gMax = VGS_MAX;
            const K = kOf(), vovMax = gMax - vtOf(0);
            const yTop = niceMax(K / 2 * vovMax * vovMax * (1 + LAMBDA * VDS_MAX) * 1.02);
            const pre = type === 'n' ? '' : '−';
            const f = plotFrame(trSvg, { x0: gMin, x1: gMax, y1: yTop, xticks: [-4, -2, 0, 2, 4, 6], xlab: pre + 'v_{GS} (V)', ylab: 'i_{D} (mA)' });
            const pts = [];
            for (let j = 0; j <= 150; j++) { const gg = gMin + (gMax - gMin) * j / 150; pts.push([f.px(gg), f.py(current(gg, d, vtA))]); }
            polyline(f.g, pts, { stroke: COLORS.plot, 'stroke-width': 2.4 });
            el('line', { x1: f.px(vtA), y1: f.T, x2: f.px(vtA), y2: f.T + f.ph, stroke: COLORS.muted, 'stroke-dasharray': '4 3' }, f.g);
            const vtName = type === 'n' ? 'V_{TN}' : '−V_{TP}';
            label(f.g, f.px(vtA) + (vtA > 3 ? -4 : 4), f.T + 12, vtName, { 'text-anchor': vtA > 3 ? 'end' : 'start', 'font-size': 11, fill: COLORS.muted });
            el('circle', { cx: f.px(g), cy: f.py(m.i), r: 5.5, fill: COLORS.plot, stroke: '#fff', 'stroke-width': 1.5 }, f.g);
        }

        // Seçili tipin devre sembolü
        function drawSym() {
            symSvg.textContent = '';
            const n = type === 'n';
            const st = { fill: 'none', stroke: COLORS.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' };
            el('path', Object.assign({ d: 'M6,62 L38,62 M38,34 L38,90' }, st), symSvg);
            el('path', Object.assign({ d: mode === 'dep' ? 'M50,30 L50,94' : 'M50,30 L50,46 M50,54 L50,70 M50,78 L50,94' }, st), symSvg);
            el('path', Object.assign({ d: 'M50,38 L92,38 L92,6 M50,86 L92,86 L92,118 M50,62 L96,62' }, st), symSvg);
            el('path', { d: n ? 'M52,62 L66,54 L66,70 Z' : 'M80,62 L66,54 L66,70 Z', fill: COLORS.ink }, symSvg);
            const t = (x, y, s) => { el('text', { x, y, 'font-size': 13, 'font-weight': 600, fill: COLORS.ink }, symSvg).textContent = s; };
            t(100, 16, n ? 'D' : 'S'); t(100, 118, n ? 'S' : 'D'); t(4, 54, 'G'); t(102, 67, 'B');
        }

        function panel() {
            const r = REGIONS[m.region];
            badgeEl.className = 'badge align-self-start mb-2 ' + r.badge;
            badgeEl.textContent = L('names')[type + mode];
            titleEl.textContent = tx(r.title);
            let text = fill(tx(r.text));
            if (mode === 'dep' && (m.region === 'triode' || m.region === 'sat') && g <= 0.05) text += tx(EXTRA.dep);
            if (m.region === 'sat' && lam() > 0) text += tx(EXTRA.lam);
            if (b > 0.05) {
                const dvt = (m.vt - vt0()) * (type === 'n' ? 1 : -1);
                text += tx(EXTRA.body).replace('{dvt}', (type === 'n' ? '+' : '−') + Math.abs(dvt).toFixed(2) + ' V');
            }
            textEl.innerHTML = text;

            const n = type === 'n', s = n ? 1 : -1;
            const VT = n ? 'V<sub>TN</sub>' : 'V<sub>TP</sub>';
            const Kn = n ? 'K<sub>n</sub>' : 'K<sub>p</sub>';
            const lamTxt = lam() > 0 ? `(1 + λ${n ? '' : '|'}v<sub>DS</sub>${n ? '' : '|'})` : '';
            const vtS = s * m.vt;
            let eq;
            if (m.region === 'sat') {
                eq = `i<sub>D</sub> = (${Kn}/2)(v<sub>GS</sub> − ${VT})<sup>2</sup>${lamTxt}<br>= (${fmtK(m.K)}/2)(${minus((s * g).toFixed(2))} − (${minus(vtS.toFixed(2))}))<sup>2</sup>${lam() > 0 ? `(1 + ${LAMBDA}·${Math.abs(d).toFixed(2)})` : ''}<br>= <strong>${fmtI(m.i)}</strong>`;
            } else if (m.region === 'triode') {
                eq = `i<sub>D</sub> = ${Kn}(v<sub>GS</sub> − ${VT} − v<sub>DS</sub>/2)v<sub>DS</sub>${lamTxt}<br>= ${fmtK(m.K)}·(${minus((s * g).toFixed(2))} − (${minus(vtS.toFixed(2))}) − ${minus((s * d).toFixed(2))}/2)·(${minus((s * d).toFixed(2))})${lam() > 0 ? `(1 + ${LAMBDA}·${Math.abs(d).toFixed(2)})` : ''}<br>= <strong>${fmtI(m.i)}</strong>`;
            } else {
                eq = `${n ? 'v<sub>GS</sub> ≤ V<sub>TN</sub>' : 'v<sub>GS</sub> ≥ V<sub>TP</sub>'} → i<sub>D</sub> = <strong>0</strong>`;
            }
            eqEl.innerHTML = eq;

            const rows = [];
            const lg = lang();
            rows.push([`${VT}${b > 0.05 ? (lg === 'tr' ? ' (body effect ile)' : ' (with body effect)') : ''}`, fmtV(vtS)]);
            rows.push([`v<sub>GS</sub> − ${VT}`, fmtV(s * m.vov)]);
            if (m.vov > 0) rows.push(['v<sub>DS(sat)</sub> = v<sub>GS</sub> − ' + VT, fmtV(s * m.vov)]);
            rows.push([L('id'), fmtI(m.i), true]);
            if (m.region === 'triode') rows.push([L('ron'), fmtR(1 / (m.K * m.vov))]);
            if (m.region === 'sat') rows.push([L('gm') + ' = 2I<sub>D</sub>/(V<sub>GS</sub> − ' + VT + ')', fmtG(2 * m.i / m.vov)]);
            rows.push([n ? L('kn') : L('kp'), fmtK(m.K) + ` (W/L = ${P[type].wl})`]);
            renderValues(valuesEl, rows);
        }

        function fmtK(K) { return parseFloat((K * 1e3).toPrecision(3)) + ' mA/V<sup>2</sup>'; }

        function syncInputs() {
            const s = type === 'n' ? 1 : -1;
            if (type === 'n') {
                vgsR.min = -4; vgsR.max = VGS_MAX; vdsR.min = 0; vdsR.max = VDS_MAX;
            } else {
                vgsR.min = -VGS_MAX; vgsR.max = 4; vdsR.min = -VDS_MAX; vdsR.max = 0;
            }
            vgsR.value = s * g;
            vdsR.value = s * d;
            vsbR.value = b;
            vgsOut.textContent = fmtV(s * g);
            vdsOut.textContent = fmtV(s * d);
            vsbOut.textContent = fmtV(type === 'n' ? b : b);
            vsbLab.innerHTML = type === 'n' ? 'Body bias v<sub>SB</sub>' : 'Body bias v<sub>BS</sub>';
            headOut.innerHTML = `v<sub>GS</sub> = ${fmtV(s * g)} · v<sub>DS</sub> = ${fmtV(s * d)}`;
        }

        function update() {
            compute();
            syncInputs();
            draw();
            drawOut();
            drawTr();
            drawSym();
            panel();
            setActive(root.querySelectorAll('[data-mos-type]'), btn => btn.dataset.mosType === type, 'btn-primary', 'btn-outline-primary');
            setActive(root.querySelectorAll('[data-mos-mode]'), btn => btn.dataset.mosMode === mode, 'btn-primary', 'btn-outline-primary');
            setActive(root.querySelectorAll('[data-mos-pre]'), btn => btn.dataset.mosPre === presetOf(), 'btn-secondary', 'btn-outline-secondary');
        }

        function presetOf() {
            if (m.region === 'triode') return 'triode';
            if (m.region === 'sat') return 'sat';
            return 'cutoff';
        }

        function stop() {
            clearInterval(timer);
            timer = null;
            sweepG.innerHTML = L('sweepG');
            sweepD.innerHTML = L('sweepD');
        }

        function sweep(which) {
            const btn = which === 'g' ? sweepG : sweepD;
            if (timer) { const was = btn.dataset.running; stop(); delete sweepG.dataset.running; delete sweepD.dataset.running; if (was) return; }
            btn.dataset.running = '1';
            btn.innerHTML = L('stop');
            if (which === 'g') g = -4; else d = 0;
            timer = setInterval(() => {
                if (which === 'g') { g = Math.round((g + 0.05) * 100) / 100; if (g >= VGS_MAX) { g = VGS_MAX; stop(); delete btn.dataset.running; } }
                else { d = Math.round((d + 0.04) * 100) / 100; if (d >= VDS_MAX) { d = VDS_MAX; stop(); delete btn.dataset.running; } }
                update();
            }, 40);
            update();
        }

        // Ok işaretçisi
        const defs = el('defs', {}, svg);
        const mk = el('marker', { id: 'mos-arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, defs);
        el('path', { d: 'M0,0 L10,5 L0,10 z', fill: COLORS.plot }, mk);

        vgsR.addEventListener('input', () => { stop(); g = (type === 'n' ? 1 : -1) * Number(vgsR.value); update(); });
        vdsR.addEventListener('input', () => { stop(); d = (type === 'n' ? 1 : -1) * Number(vdsR.value); update(); });
        vsbR.addEventListener('input', () => { b = Number(vsbR.value); update(); });
        lamSw.addEventListener('change', update);
        labSw.addEventListener('change', () => { showLabels = labSw.checked; update(); });
        sweepG.addEventListener('click', () => sweep('g'));
        sweepD.addEventListener('click', () => sweep('d'));
        root.querySelectorAll('[data-mos-type]').forEach(btn => btn.addEventListener('click', () => { type = btn.dataset.mosType; clearDyn(); update(); }));
        root.querySelectorAll('[data-mos-mode]').forEach(btn => btn.addEventListener('click', () => { mode = btn.dataset.mosMode; update(); }));
        root.querySelectorAll('[data-mos-pre]').forEach(btn => btn.addEventListener('click', () => {
            stop();
            const vt = vtOf(b);
            const p = btn.dataset.mosPre;
            if (p === 'cutoff') { g = Math.round((vt - 1) * 10) / 10; d = 3; }
            if (p === 'triode') { g = Math.round((vt + 3) * 10) / 10; d = 1; }
            if (p === 'sat') { g = Math.round((vt + 2) * 10) / 10; d = 4; }
            g = Math.max(-4, Math.min(VGS_MAX, g));
            update();
        }));

        function renderAll() {
            if (!timer) { sweepG.innerHTML = L('sweepG'); sweepD.innerHTML = L('sweepD'); }
            update();
        }
        if (window.i18next) i18next.on('languageChanged', () => setTimeout(renderAll, 0));
        renderAll();
        if (!reduceMotion) requestAnimationFrame(frame);
    }

    // ================================================================
    // JFET
    // ================================================================
    function initJfet(root) {
        const svg = document.getElementById('jf-svg');
        const outSvg = document.getElementById('jf-out');
        const trSvg = document.getElementById('jf-tr');
        const symSvg = document.getElementById('jf-sym');
        const vgsR = document.getElementById('jf-vgs');
        const vdsR = document.getElementById('jf-vds');
        const vgsOut = document.getElementById('jf-vgs-out');
        const vdsOut = document.getElementById('jf-vds-out');
        const headOut = document.getElementById('jf-head');
        const lamSw = document.getElementById('jf-lambda');
        const labSw = document.getElementById('jf-labels');
        const badgeEl = document.getElementById('jf-region');
        const titleEl = document.getElementById('jf-title');
        const textEl = document.getElementById('jf-text');
        const eqEl = document.getElementById('jf-eq');
        const valuesEl = document.getElementById('jf-values');
        const warnEl = document.getElementById('jf-warn');
        const sweepG = document.getElementById('jf-sweep-gs');
        const sweepD = document.getElementById('jf-sweep-ds');

        const IDSS = 4e-3, VP = -4, PHI = 0.8, LAMBDA = 0.03;   // n-channel; p-channel'da işaretler ters
        const VDS_MAX = 10, VG_MIN = -5, VG_MAX = 0.5;
        let type = 'n';
        let g = -1, d = 5;          // NMOS cinsinden: g = s·v_GS, d = s·v_DS
        let showLabels = true, timer = null, m = null;

        const UI = {
            tr: {
                sub: { n: 'n-type channel', p: 'p-type channel' }, gate: 'gate',
                pinch: 'pinch-off', depl: 'depletion region', chan: 'channel',
                id: 'Drain akımı i<sub>D</sub>', ron: 'R<sub>on</sub> (küçük v<sub>DS</sub>)', gm: 'g<sub>m</sub>',
                sweepG: 'v<sub>GS</sub> Tara', sweepD: 'v<sub>DS</sub> Tara', stop: 'Durdur',
                names: { n: 'n-channel JFET', p: 'p-channel JFET' }
            },
            en: {
                sub: { n: 'n-type channel', p: 'p-type channel' }, gate: 'gate',
                pinch: 'pinch-off', depl: 'depletion region', chan: 'channel',
                id: 'Drain current i<sub>D</sub>', ron: 'R<sub>on</sub> (small v<sub>DS</sub>)', gm: 'g<sub>m</sub>',
                sweepG: 'Sweep v<sub>GS</sub>', sweepD: 'Sweep v<sub>DS</sub>', stop: 'Stop',
                names: { n: 'n-channel JFET', p: 'p-channel JFET' }
            }
        };
        const L = (k) => UI[lang()][k];

        const REGIONS = {
            cutoff: {
                badge: 'text-bg-secondary',
                title: { tr: 'Cutoff: kanal kapandı', en: 'Cutoff: channel closed' },
                text: {
                    tr: '{off}: iki gate\'in depletion region\'ları kanalın ortasında birleşti ve kanalı boydan boya kapattı. Kanal direnci sonsuz, akım akmıyor: i<sub>D</sub> = 0.',
                    en: '{off}: the depletion regions of the two gates have met in the middle of the channel and closed it along its whole length. The channel resistance is infinite and no current flows: i<sub>D</sub> = 0.'
                }
            },
            triode: {
                badge: 'text-bg-primary',
                title: { tr: 'Triode region', en: 'Triode region' },
                text: {
                    tr: 'Kanal source\'tan drain\'e kadar açık. Gate junction\'ları reverse bias\'ta ve depletion region\'lar kanalı daraltıyor; |v<sub>GS</sub>| büyüdükçe kanal incelir ve direnci artar. Drain tarafında reverse bias daha büyük (v<sub>DG</sub> = v<sub>DS</sub> − v<sub>GS</sub>) olduğu için kanal kama şeklinde.',
                    en: 'The channel is open from source to drain. The gate junctions are reverse-biased and the depletion regions narrow the channel; as |v<sub>GS</sub>| grows, the channel becomes thinner and its resistance increases. The reverse bias is larger at the drain end (v<sub>DG</sub> = v<sub>DS</sub> − v<sub>GS</sub>), so the channel is wedge-shaped.'
                }
            },
            pinch: {
                badge: 'text-bg-success',
                title: { tr: 'Pinch-off (saturation)', en: 'Pinch-off (saturation)' },
                text: {
                    tr: '|v<sub>DS</sub>| ≥ |v<sub>GS</sub> − V<sub>P</sub>|: depletion region\'lar drain ucunda birleşti ve kanal orada kapandı (<strong>pinch-off</strong>). {car} pinch-off noktasından sonra field ile drain\'e süpürülüyor. Akım v<sub>DS</sub>\'den neredeyse bağımsız: i<sub>D</sub> = I<sub>DSS</sub>(1 − v<sub>GS</sub>/V<sub>P</sub>)<sup>2</sup>.',
                    en: '|v<sub>DS</sub>| ≥ |v<sub>GS</sub> − V<sub>P</sub>|: the depletion regions have met at the drain end and the channel is closed there (<strong>pinch-off</strong>). Beyond the pinch-off point the {car} are swept to the drain by the field. The current is nearly independent of v<sub>DS</sub>: i<sub>D</sub> = I<sub>DSS</sub>(1 − v<sub>GS</sub>/V<sub>P</sub>)<sup>2</sup>.'
                }
            }
        };

        function words() {
            const n = type === 'n';
            return {
                tr: { car: n ? 'Elektronlar' : 'Hole\'lar', off: n ? 'v<sub>GS</sub> ≤ V<sub>P</sub>' : 'v<sub>GS</sub> ≥ V<sub>P</sub>' },
                en: { car: n ? 'electrons' : 'holes', off: n ? 'v<sub>GS</sub> ≤ V<sub>P</sub>' : 'v<sub>GS</sub> ≥ V<sub>P</sub>' }
            };
        }
        const fill = (str) => { const w = words()[lang()]; return str.replace(/\{(\w+)\}/g, (a, k) => (k in w ? w[k] : a)); };
        const lam = () => (lamSw.checked ? LAMBDA : 0);

        function current(gg, dd) {
            const vov = gg - VP, l = lam();
            if (vov <= 0) return 0;
            const K = 2 * IDSS / (VP * VP);
            if (dd < vov) return K * (vov - dd / 2) * dd * (1 + l * dd);
            return IDSS * (1 - gg / VP) * (1 - gg / VP) * (1 + l * dd);
        }

        function compute() {
            const vov = g - VP;
            const i = current(g, d);
            const region = vov <= 0 ? 'cutoff' : (d < vov ? 'triode' : 'pinch');
            m = { vov, i, region };
        }

        // Geometri
        const X0 = 80, X1 = 680, XG0 = 220, XG1 = 540, YT = 70, YB = 250, YC = 160;
        const GATE_H = 24;
        const OPEN = (YB - YT) / 2 - GATE_H;     // gate kenarından merkeze mesafe (px)
        const gStatic = el('g', {}, svg);
        const gDep = el('g', {}, svg);
        const gGate = el('g', {}, svg);
        const gDyn = el('g', {}, svg);
        const gLab = el('g', {}, svg);

        function pinchU() {
            if (m.region !== 'pinch') return 1;
            const k = lam() > 0 ? 0.03 : 0.015;
            return 1 - Math.min(0.2, 0.04 + k * (d - m.vov));
        }

        // Gate kenarından kanala doğru depletion genişliği (px), u: gate boyunca 0..1
        function depW(u) {
            let V;
            if (m.vov <= 0) return OPEN;
            if (m.region === 'pinch') {
                const up = pinchU();
                if (u >= up) return OPEN;
                V = channelV(u / up, m.vov, m.vov);
            } else {
                V = channelV(u, m.vov, d);
            }
            const r = (PHI + V - g) / (PHI - VP);
            return Math.max(2, Math.min(OPEN, OPEN * Math.sqrt(Math.max(0, r))));
        }

        function draw() {
            const n = type === 'n';
            const chanCol = n ? COLORS.nSi : COLORS.pSi;
            const gateCol = n ? COLORS.pPlus : COLORS.nPlus;
            [gStatic, gDep, gGate, gLab].forEach(x => { x.textContent = ''; });

            el('path', { d: `M380,${YT} L380,${YT - 34} L600,${YT - 34} L600,${YB + 26} L380,${YB + 26} L380,${YB}`, fill: 'none', stroke: COLORS.ink, 'stroke-width': 2 }, gStatic);
            el('rect', { x: X0, y: YT, width: X1 - X0, height: YB - YT, fill: chanCol, stroke: '#555' }, gStatic);
            // depletion: üst ve alt
            const N = 64, top = [], bot = [];
            for (let k = 0; k <= N; k++) {
                const u = k / N, x = XG0 + u * (XG1 - XG0), w = depW(u);
                top.push([x, YT + GATE_H + w]);
                bot.push([x, YB - GATE_H - w]);
            }
            const w0 = depW(0), w1 = depW(1);
            const pathOf = (pts, yEdge, sgn, wa, wb) => {
                let s = `M${XG0 - wa},${yEdge} `;
                s += `Q${XG0 - wa},${pts[0][1]} ${XG0},${pts[0][1]} `;
                pts.forEach(p => { s += `L${p[0].toFixed(1)},${p[1].toFixed(1)} `; });
                s += `Q${XG1 + wb},${pts[pts.length - 1][1]} ${XG1 + wb},${yEdge} Z`;
                return s;
            };
            el('path', { d: pathOf(top, YT + GATE_H, 1, Math.min(w0, 30), Math.min(w1, 30)), fill: COLORS.dep, stroke: COLORS.depLine, 'stroke-dasharray': '4 3' }, gDep);
            el('path', { d: pathOf(bot, YB - GATE_H, -1, Math.min(w0, 30), Math.min(w1, 30)), fill: COLORS.dep, stroke: COLORS.depLine, 'stroke-dasharray': '4 3' }, gDep);
            // depletion'daki iyonlar (kanal tarafındaki)
            const ionSign = n ? '+' : '−', ionCol = n ? COLORS.pos : COLORS.neg;
            for (let x = XG0 + 18; x < XG1 - 8; x += 32) {
                const u = (x - XG0) / (XG1 - XG0), w = depW(u);
                for (let yy = 10; yy < w - 4; yy += 18) {
                    [YT + GATE_H + yy, YB - GATE_H - yy].forEach(y => {
                        const gi = el('g', {}, gDep);
                        el('rect', { x: x - 6, y: y - 6, width: 12, height: 12, rx: 3, fill: '#fff', stroke: ionCol }, gi);
                        el('text', { x, y: y + 4, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: ionCol }, gi).textContent = ionSign;
                    });
                }
            }
            // gate bölgeleri, kontaklar
            el('rect', { x: XG0, y: YT, width: XG1 - XG0, height: GATE_H, fill: gateCol, stroke: '#555' }, gGate);
            el('rect', { x: XG0, y: YB - GATE_H, width: XG1 - XG0, height: GATE_H, fill: gateCol, stroke: '#555' }, gGate);
            el('rect', { x: X0 - 16, y: YC - 40, width: 16, height: 80, fill: COLORS.metal }, gStatic);
            el('rect', { x: X1, y: YC - 40, width: 16, height: 80, fill: COLORS.metal }, gStatic);
            el('path', { d: `M${X0 - 16},${YC} L${X0 - 40},${YC} M${X1 + 16},${YC} L${X1 + 40},${YC}`, stroke: COLORS.ink, 'stroke-width': 2 }, gStatic);
            el('circle', { cx: 600, cy: YT - 34, r: 3, fill: COLORS.ink }, gStatic);

            const s = n ? 1 : -1;
            label(gLab, 8, YC - 50, 'S  0 V', { 'text-anchor': 'start', 'font-weight': 700, 'font-size': 13 });
            label(gLab, 752, YC - 50, 'D  ' + fmtV(s * d), { 'text-anchor': 'end', 'font-weight': 700, 'font-size': 13 });
            label(gLab, 608, YT - 40, 'G  ' + fmtV(s * g), { 'text-anchor': 'start', 'font-weight': 700, 'font-size': 13 });
            if (showLabels) {
                const gl = (n ? 'p^{+} ' : 'n^{+} ') + L('gate');
                label(gLab, 380, YT + 17, gl, { 'text-anchor': 'middle', 'font-size': 12 });
                label(gLab, 380, YB - 7, gl, { 'text-anchor': 'middle', 'font-size': 12 });
                label(gLab, X0 + 10, YT + 18, L('sub')[type], { 'text-anchor': 'start', 'font-size': 12 });
                if (m.region === 'pinch') {
                    const xp = XG0 + pinchU() * (XG1 - XG0);
                    el('line', { x1: xp, y1: YT + GATE_H, x2: xp, y2: YB - GATE_H, stroke: COLORS.ink, 'stroke-dasharray': '2 2' }, gLab);
                    label(gLab, xp, YB + 44, L('pinch'), { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600 });
                } else if (m.region === 'cutoff') {
                    label(gLab, 380, YB + 44, L('depl'), { 'text-anchor': 'middle', 'font-size': 11, fill: '#9a7d0a' });
                }
            }
            if (m.i > 1e-9) {
                const y1 = YC + 52, x1 = n ? X1 + 64 : X1 + 26, x2 = n ? X1 + 26 : X1 + 64;
                el('path', { d: `M${x1},${y1} L${x2},${y1}`, stroke: COLORS.plot, 'stroke-width': 2.5, 'marker-end': 'url(#jf-arr)' }, gLab);
                label(gLab, 752, y1 + 20, 'i_{D} = ' + fmtI(m.i), { 'text-anchor': 'end', 'font-size': 12, fill: COLORS.plot, 'font-weight': 600 });
            }
        }

        const dyn = [];
        let acc = 0, last = null;
        function frame(now) {
            requestAnimationFrame(frame);
            if (last === null) last = now;
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            if (!m) return;
            const n = type === 'n';
            const rate = m.i > 1e-7 ? Math.min(40, 6 + 14 * Math.sqrt(m.i / IDSS)) : 0;
            acc += rate * dt;
            while (acc >= 1 && dyn.length < 110) {
                acc -= 1;
                const node = n ? el('circle', { r: 3.2, fill: COLORS.neg }, gDyn)
                    : el('circle', { r: 3.2, fill: '#fff', stroke: COLORS.pos, 'stroke-width': 1.8 }, gDyn);
                dyn.push({ node, x: X0 + 4, f: Math.random() * 2 - 1 });
            }
            if (rate === 0) acc = 0;
            const base = 60 + 220 * Math.sqrt(Math.max(0, m.i) / IDSS);
            for (let k = dyn.length - 1; k >= 0; k--) {
                const p = dyn[k];
                if (m.vov <= 0) { p.node.remove(); dyn.splice(k, 1); continue; }
                let half;
                if (p.x < XG0 || p.x > XG1) half = OPEN + GATE_H - 8;
                else half = Math.max(1, OPEN - depW((p.x - XG0) / (XG1 - XG0)));
                const speed = base * Math.min(5, (OPEN * 0.6) / Math.max(half, 6));
                p.x += speed * dt;
                if (p.x >= X1 - 4) { p.node.remove(); dyn.splice(k, 1); continue; }
                p.node.setAttribute('cx', p.x.toFixed(1));
                p.node.setAttribute('cy', (YC + p.f * Math.max(0, half - 5)).toFixed(1));
            }
        }

        function drawOut() {
            const yTop = niceMax(IDSS * 1.02 * (1 + LAMBDA * VDS_MAX) * 1.06);
            const pre = type === 'n' ? '' : '−';
            const f = plotFrame(outSvg, { x0: 0, x1: VDS_MAX, y1: yTop, xticks: [0, 2, 4, 6, 8, 10], xlab: pre + 'v_{DS} (V)', ylab: 'i_{D} (mA)' });
            [0, -1, -2, -3].forEach(gg => {
                const pts = [];
                for (let j = 0; j <= 80; j++) { const dd = VDS_MAX * j / 80; pts.push([f.px(dd), f.py(current(gg, dd))]); }
                polyline(f.g, pts, { stroke: COLORS.ghost, 'stroke-width': 1.2 });
            });
            const bpts = [];
            for (let j = 0; j <= 60; j++) { const vv = -VP * j / 60; bpts.push([f.px(vv), f.py(IDSS / (VP * VP) * vv * vv * (1 + lam() * vv))]); }
            polyline(f.g, bpts, { stroke: COLORS.muted, 'stroke-dasharray': '5 4', 'stroke-width': 1.3 });
            const pts = [];
            for (let j = 0; j <= 120; j++) { const dd = VDS_MAX * j / 120; pts.push([f.px(dd), f.py(current(g, dd))]); }
            polyline(f.g, pts, { stroke: COLORS.plot, 'stroke-width': 2.4 });
            el('circle', { cx: f.px(d), cy: f.py(m.i), r: 5.5, fill: COLORS.plot, stroke: '#fff', 'stroke-width': 1.5 }, f.g);
            label(f.g, f.L + 6, f.T + 12, 'I_{DSS} = 4 mA', { 'text-anchor': 'start', 'font-size': 11, fill: COLORS.muted });
        }

        function drawTr() {
            const yTop = niceMax(IDSS * 1.02 * (1 + LAMBDA * VDS_MAX) * 1.06);
            const pre = type === 'n' ? '' : '−';
            const f = plotFrame(trSvg, { x0: VG_MIN, x1: 1, y1: yTop, xticks: [-5, -4, -3, -2, -1, 0, 1], xlab: pre + 'v_{GS} (V)', ylab: 'i_{D} (mA)' });
            const pts = [];
            for (let j = 0; j <= 120; j++) { const gg = VG_MIN + (VG_MAX - VG_MIN) * j / 120; pts.push([f.px(gg), f.py(current(gg, d))]); }
            polyline(f.g, pts, { stroke: COLORS.plot, 'stroke-width': 2.4 });
            el('line', { x1: f.px(VP), y1: f.T, x2: f.px(VP), y2: f.T + f.ph, stroke: COLORS.muted, 'stroke-dasharray': '4 3' }, f.g);
            label(f.g, f.px(VP) + 4, f.T + 12, type === 'n' ? 'V_{P}' : '−V_{P}', { 'text-anchor': 'start', 'font-size': 11, fill: COLORS.muted });
            el('circle', { cx: f.px(g), cy: f.py(m.i), r: 5.5, fill: COLORS.plot, stroke: '#fff', 'stroke-width': 1.5 }, f.g);
        }

        function drawSym() {
            symSvg.textContent = '';
            const n = type === 'n';
            const st = { fill: 'none', stroke: COLORS.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' };
            el('path', Object.assign({ d: 'M50,26 L50,98 M50,38 L92,38 L92,6 M50,86 L92,86 L92,118 M6,86 L50,86' }, st), symSvg);
            el('path', { d: n ? 'M48,86 L34,78 L34,94 Z' : 'M10,86 L24,78 L24,94 Z', fill: COLORS.ink }, symSvg);
            const t = (x, y, s) => { el('text', { x, y, 'font-size': 13, 'font-weight': 600, fill: COLORS.ink }, symSvg).textContent = s; };
            t(100, 16, n ? 'D' : 'S'); t(100, 118, n ? 'S' : 'D'); t(4, 76, 'G');
        }

        function panel() {
            const r = REGIONS[m.region];
            badgeEl.className = 'badge align-self-start mb-2 ' + r.badge;
            badgeEl.textContent = L('names')[type];
            titleEl.textContent = tx(r.title);
            textEl.innerHTML = fill(tx(r.text));
            warnEl.classList.toggle('d-none', !(g > 0.05));

            const n = type === 'n', s = n ? 1 : -1;
            const vgs = s * g, vds = s * d, vp = s * VP;
            const lamTxt = lam() > 0 ? '(1 + λ|v<sub>DS</sub>|)' : '';
            let eq;
            if (m.region === 'pinch') {
                eq = `i<sub>D</sub> = I<sub>DSS</sub>(1 − v<sub>GS</sub>/V<sub>P</sub>)<sup>2</sup>${lamTxt}<br>= 4 mA·(1 − (${minus(vgs.toFixed(2))})/(${minus(vp.toFixed(0))}))<sup>2</sup>${lam() > 0 ? `(1 + ${LAMBDA}·${d.toFixed(2)})` : ''}<br>= <strong>${fmtI(m.i)}</strong>`;
            } else if (m.region === 'triode') {
                eq = `i<sub>D</sub> = (2I<sub>DSS</sub>/V<sub>P</sub><sup>2</sup>)(v<sub>GS</sub> − V<sub>P</sub> − v<sub>DS</sub>/2)v<sub>DS</sub>${lamTxt}<br>= 0.5 mA/V<sup>2</sup>·(${minus(vgs.toFixed(2))} − (${minus(vp.toFixed(0))}) − ${minus(vds.toFixed(2))}/2)·(${minus(vds.toFixed(2))})${lam() > 0 ? `(1 + ${LAMBDA}·${d.toFixed(2)})` : ''}<br>= <strong>${fmtI(m.i)}</strong>`;
            } else {
                eq = `${n ? 'v<sub>GS</sub> ≤ V<sub>P</sub>' : 'v<sub>GS</sub> ≥ V<sub>P</sub>'} → i<sub>D</sub> = <strong>0</strong>`;
            }
            eqEl.innerHTML = eq;

            const rows = [];
            rows.push(['V<sub>P</sub>', fmtV(vp, 1)]);
            rows.push(['I<sub>DSS</sub>', '4 mA']);
            rows.push(['v<sub>GS</sub> − V<sub>P</sub>', fmtV(s * m.vov)]);
            if (m.vov > 0) rows.push(['v<sub>DSP</sub> = v<sub>GS</sub> − V<sub>P</sub>', fmtV(s * m.vov)]);
            rows.push([L('id'), fmtI(m.i), true]);
            if (m.region === 'triode') rows.push([L('ron'), fmtR(1 / (2 * IDSS / (VP * VP) * m.vov))]);
            if (m.region === 'pinch') rows.push([L('gm') + ' = 2I<sub>D</sub>/(V<sub>GS</sub> − V<sub>P</sub>)', fmtG(2 * m.i / m.vov)]);
            rows.push(['i<sub>G</sub>', g > 0.05 ? (lang() === 'tr' ? '≠ 0 (forward bias)' : '≠ 0 (forward bias)') : '≈ 0']);
            renderValues(valuesEl, rows);
        }

        function syncInputs() {
            const s = type === 'n' ? 1 : -1;
            if (type === 'n') { vgsR.min = VG_MIN; vgsR.max = VG_MAX; vdsR.min = 0; vdsR.max = VDS_MAX; }
            else { vgsR.min = -VG_MAX; vgsR.max = -VG_MIN; vdsR.min = -VDS_MAX; vdsR.max = 0; }
            vgsR.value = s * g;
            vdsR.value = s * d;
            vgsOut.textContent = fmtV(s * g);
            vdsOut.textContent = fmtV(s * d);
            headOut.innerHTML = `v<sub>GS</sub> = ${fmtV(s * g)} · v<sub>DS</sub> = ${fmtV(s * d)}`;
        }

        function update() {
            compute();
            syncInputs();
            draw();
            drawOut();
            drawTr();
            drawSym();
            panel();
            setActive(root.querySelectorAll('[data-jf-type]'), b => b.dataset.jfType === type, 'btn-primary', 'btn-outline-primary');
            setActive(root.querySelectorAll('[data-jf-pre]'), b => b.dataset.jfPre === m.region, 'btn-secondary', 'btn-outline-secondary');
        }

        function stop() {
            clearInterval(timer);
            timer = null;
            sweepG.innerHTML = L('sweepG');
            sweepD.innerHTML = L('sweepD');
        }

        function sweep(which) {
            const btn = which === 'g' ? sweepG : sweepD;
            if (timer) { const was = btn.dataset.running; stop(); delete sweepG.dataset.running; delete sweepD.dataset.running; if (was) return; }
            btn.dataset.running = '1';
            btn.innerHTML = L('stop');
            if (which === 'g') g = VG_MIN; else d = 0;
            timer = setInterval(() => {
                if (which === 'g') { g = Math.round((g + 0.03) * 100) / 100; if (g >= 0) { g = 0; stop(); delete btn.dataset.running; } }
                else { d = Math.round((d + 0.06) * 100) / 100; if (d >= VDS_MAX) { d = VDS_MAX; stop(); delete btn.dataset.running; } }
                update();
            }, 40);
            update();
        }

        const defs = el('defs', {}, svg);
        const mk = el('marker', { id: 'jf-arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto' }, defs);
        el('path', { d: 'M0,0 L10,5 L0,10 z', fill: COLORS.plot }, mk);

        vgsR.addEventListener('input', () => { stop(); g = (type === 'n' ? 1 : -1) * Number(vgsR.value); update(); });
        vdsR.addEventListener('input', () => { stop(); d = (type === 'n' ? 1 : -1) * Number(vdsR.value); update(); });
        lamSw.addEventListener('change', update);
        labSw.addEventListener('change', () => { showLabels = labSw.checked; update(); });
        sweepG.addEventListener('click', () => sweep('g'));
        sweepD.addEventListener('click', () => sweep('d'));
        root.querySelectorAll('[data-jf-type]').forEach(b => b.addEventListener('click', () => { type = b.dataset.jfType; dyn.forEach(p => p.node.remove()); dyn.length = 0; update(); }));
        root.querySelectorAll('[data-jf-pre]').forEach(b => b.addEventListener('click', () => {
            stop();
            const p = b.dataset.jfPre;
            if (p === 'cutoff') { g = -4.5; d = 5; }
            if (p === 'triode') { g = -1; d = 1; }
            if (p === 'pinch') { g = -1; d = 6; }
            update();
        }));

        function renderAll() {
            if (!timer) { sweepG.innerHTML = L('sweepG'); sweepD.innerHTML = L('sweepD'); }
            update();
        }
        if (window.i18next) i18next.on('languageChanged', () => setTimeout(renderAll, 0));
        renderAll();
        if (!reduceMotion) requestAnimationFrame(frame);
    }

    const mosRoot = document.getElementById('mos-sim');
    if (mosRoot) initMos(mosRoot);
    const jfRoot = document.getElementById('jfet-sim');
    if (jfRoot) initJfet(jfRoot);
})();
