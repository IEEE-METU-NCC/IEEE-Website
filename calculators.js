// Engineering calculators for calculators.html
// Everything is computed in the browser, there is no backend.

document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);
    const EMPTY = '—';

    // ---------- Helpers ----------

    // Reads a numeric input, scaled by its "<id>-unit" select if there is one.
    // rule: 'positive' | 'nonNegative' | 'any' | 'optional' (empty -> null)
    function readValue(id, rule = 'positive') {
        const input = $(id);
        const unit = $(id + '-unit');
        if (rule === 'optional' && input.value.trim() === '') {
            input.classList.remove('is-invalid');
            return null;
        }
        const value = parseFloat(input.value) * (unit ? parseFloat(unit.value) : 1);
        let valid = Number.isFinite(value);
        if (rule === 'positive' || rule === 'optional') valid = valid && value > 0;
        if (rule === 'nonNegative') valid = valid && value >= 0;
        input.classList.toggle('is-invalid', !valid);
        return valid ? value : NaN;
    }

    function formatNumber(value, digits = 4) {
        if (Math.abs(value) < 1e-12) return '0';
        return String(parseFloat(value.toPrecision(digits)));
    }

    const SI_PREFIXES = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];

    // 0.00047 , 'F' -> "470 µF"
    function formatSI(value, unit) {
        if (Number.isNaN(value)) return EMPTY;
        if (!Number.isFinite(value)) return '∞';
        if (value === 0) return '0 ' + unit;
        // Rounded first so that 0.9999999 s becomes "1 s" instead of "1000 ms"
        const abs = parseFloat(Math.abs(value).toPrecision(4));
        const [factor, prefix] = SI_PREFIXES.find(([f]) => abs >= f) || SI_PREFIXES[SI_PREFIXES.length - 1];
        return formatNumber(value / factor) + ' ' + prefix + unit;
    }

    function formatComplex(re, im) {
        return `${formatNumber(re)} ${im < 0 ? '−' : '+'} j${formatNumber(Math.abs(im))}`;
    }

    // 0.0627 -> "6.27×10⁻²"
    function formatSci(value) {
        if (!Number.isFinite(value)) return EMPTY;
        if (value === 0) return '0';
        let exp = Math.floor(Math.log10(Math.abs(value)));
        let mantissa = parseFloat((value / 10 ** exp).toPrecision(4));
        if (Math.abs(mantissa) >= 10) { mantissa /= 10; exp += 1; }
        const superscript = String(exp).replace(/[-0-9]/g, ch => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(ch)]);
        return `${mantissa}×10${superscript}`;
    }

    // dB value followed by its linear ratio in scientific notation: "4.15 dB / 3.846×10⁻¹"
    function formatDb(db, ratio) {
        const text = Number.isFinite(db) ? formatNumber(db) : (db > 0 ? '∞' : '−∞');
        return `${text} dB / ${formatSci(ratio)}`;
    }

    // (a + jb) / (c + jd)
    function divide(a, b, c, d) {
        const den = c * c + d * d;
        return [(a * c + b * d) / den, (b * c - a * d) / den];
    }

    function setResults(results) {
        Object.entries(results).forEach(([id, text]) => { $(id).textContent = text; });
    }

    function clearResults(ids) {
        ids.forEach(id => { $(id).textContent = EMPTY; });
    }

    // Shows only the elements whose data-<attr> matches the selected value
    function showVariant(attr, value) {
        document.querySelectorAll(`[${attr}]`).forEach(el => {
            el.classList.toggle('d-none', el.getAttribute(attr) !== value);
        });
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';

    function svgEl(name, attrs, parent) {
        const el = document.createElementNS(SVG_NS, name);
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
        parent.appendChild(el);
        return el;
    }

    // Draws an L-network schematic: "series" parts sit between Vin and Vout,
    // "shunt" parts go from Vout to ground. Parts are 'R', 'C' or 'L'.
    function drawLadder(svgId, series, shunt) {
        const svg = $(svgId);
        svg.replaceChildren();
        const y = 30, nodeX = 45 + 60 * series.length;
        const g = svgEl('g', { transform: `translate(${(260 - nodeX - 85) / 2} 0)` }, svg);
        const wire = points => svgEl('polyline', { class: 'calc-wire', points }, g);
        const label = (x, ty, text, anchor = 'middle') => {
            svgEl('text', { x, y: ty, 'text-anchor': anchor }, g).textContent = text;
        };

        wire(`15,${y} 35,${y}`);
        series.forEach((part, i) => {
            const x = 35 + 60 * i;
            if (part === 'R') {
                wire(`${x},${y} ${x + 8},${y}`);
                svgEl('rect', { class: 'calc-wire', x: x + 8, y: y - 8, width: 34, height: 16 }, g);
                wire(`${x + 42},${y} ${x + 60},${y}`);
            } else if (part === 'C') {
                wire(`${x},${y} ${x + 21},${y}`);
                wire(`${x + 21},${y - 11} ${x + 21},${y + 11}`);
                wire(`${x + 29},${y - 11} ${x + 29},${y + 11}`);
                wire(`${x + 29},${y} ${x + 60},${y}`);
            } else {
                wire(`${x},${y} ${x + 7},${y}`);
                svgEl('path', { class: 'calc-wire', d: `M${x + 7},${y}` + ' a6,6 0 0 1 12,0'.repeat(3) }, g);
                wire(`${x + 43},${y} ${x + 60},${y}`);
            }
            label(x + 25, y - 15, part);
        });
        wire(`${nodeX - 10},${y} ${nodeX + 50},${y}`);

        wire(`${nodeX},${y} ${nodeX},45`);
        shunt.forEach((part, j) => {
            const top = 45 + 40 * j;
            if (part === 'R') {
                svgEl('rect', { class: 'calc-wire', x: nodeX - 8, y: top, width: 16, height: 35 }, g);
            } else if (part === 'C') {
                wire(`${nodeX},${top} ${nodeX},${top + 14}`);
                wire(`${nodeX - 11},${top + 14} ${nodeX + 11},${top + 14}`);
                wire(`${nodeX - 11},${top + 21} ${nodeX + 11},${top + 21}`);
                wire(`${nodeX},${top + 21} ${nodeX},${top + 35}`);
            } else {
                wire(`${nodeX},${top} ${nodeX},${top + 2.5}`);
                svgEl('path', { class: 'calc-wire', d: `M${nodeX},${top + 2.5}` + ' a5,5 0 0 1 0,10'.repeat(3) }, g);
                wire(`${nodeX},${top + 32.5} ${nodeX},${top + 35}`);
            }
            wire(`${nodeX},${top + 35} ${nodeX},${top + 40}`);
            label(nodeX + 18, top + 22, part, 'start');
        });
        const ground = 45 + 40 * shunt.length;
        wire(`${nodeX - 12},${ground} ${nodeX + 12},${ground}`);
        wire(`${nodeX - 7},${ground + 5} ${nodeX + 7},${ground + 5}`);
        wire(`${nodeX - 3},${ground + 10} ${nodeX + 3},${ground + 10}`);

        svgEl('circle', { class: 'calc-node', cx: nodeX, cy: y, r: 3 }, g);
        svgEl('circle', { class: 'calc-terminal', cx: 15, cy: y, r: 3 }, g);
        svgEl('circle', { class: 'calc-terminal', cx: nodeX + 50, cy: y, r: 3 }, g);
        label(15, y - 10, 'Vin');
        label(nodeX + 58, y + 4, 'Vout', 'start');
    }

    // ---------- 555 Timer ----------

    function drawTimerWave(mode, duty) {
        const high = 15, low = 75, start = 10, width = 300;
        const points = [];
        if (mode === 'astable') {
            const periods = 3, w = width / periods;
            for (let k = 0; k < periods; k++) {
                const x0 = start + k * w;
                points.push([x0, low], [x0, high], [x0 + w * duty, high], [x0 + w * duty, low]);
            }
            points.push([start + width, low]);
        } else {
            points.push([start, low], [70, low], [70, high], [230, high], [230, low], [start + width, low]);
        }
        $('t555-wave-line').setAttribute('points', points.map(p => p.join(',')).join(' '));
    }

    function calcTimer555() {
        const mode = $('t555-mode').value;
        showVariant('data-t555-mode', mode);

        const r1 = readValue('t555-r1');
        const c = readValue('t555-c');

        if (mode === 'monostable') {
            const pulse = Math.log(3) * r1 * c;
            setResults({ 't555-pulse': formatSI(pulse, 's') });
            drawTimerWave(mode);
            return;
        }

        const r2 = readValue('t555-r2');
        const tHigh = Math.LN2 * (r1 + r2) * c;
        const tLow = Math.LN2 * r2 * c;
        const period = tHigh + tLow;
        if (Number.isNaN(period)) {
            clearResults(['t555-f', 't555-period', 't555-thigh', 't555-tlow', 't555-duty']);
            drawTimerWave(mode, 0.5);
            return;
        }
        const duty = tHigh / period;
        setResults({
            't555-f': formatSI(1 / period, 'Hz'),
            't555-period': formatSI(period, 's'),
            't555-thigh': formatSI(tHigh, 's'),
            't555-tlow': formatSI(tLow, 's'),
            't555-duty': formatNumber(duty * 100) + ' %'
        });
        drawTimerWave(mode, duty);
    }

    // ---------- Smith Chart ----------

    const SMITH_RADIUS = 200;
    const SMITH_GRID = [0.2, 0.5, 1, 2, 5];
    const smithChart = $('smith-chart');

    function buildSmithChart() {
        const R = SMITH_RADIUS;
        const defs = svgEl('defs', {}, smithChart);
        const clip = svgEl('clipPath', { id: 'smith-clip' }, defs);
        svgEl('circle', { cx: 0, cy: 0, r: R }, clip);

        const grid = svgEl('g', { class: 'smith-grid', 'clip-path': 'url(#smith-clip)' }, smithChart);
        svgEl('line', { x1: -R, y1: 0, x2: R, y2: 0 }, grid);
        SMITH_GRID.forEach(v => {
            // Constant resistance circle: center (r/(1+r), 0), radius 1/(1+r)
            svgEl('circle', { cx: R * v / (1 + v), cy: 0, r: R / (1 + v) }, grid);
            // Constant reactance circles: center (1, ±1/x), radius 1/x
            svgEl('circle', { cx: R, cy: -R / v, r: R / v }, grid);
            svgEl('circle', { cx: R, cy: R / v, r: R / v }, grid);
        });
        svgEl('circle', { class: 'smith-outline', cx: 0, cy: 0, r: R }, smithChart);

        // Labels (normalized values)
        [0, ...SMITH_GRID].forEach(v => {
            const label = svgEl('text', { class: 'smith-label', x: R * (v - 1) / (v + 1) + 3, y: -4 }, smithChart);
            label.textContent = v;
        });
        SMITH_GRID.forEach(v => {
            const gr = (v * v - 1) / (v * v + 1), gi = 2 * v / (v * v + 1);
            [1, -1].forEach(sign => {
                const label = svgEl('text', {
                    class: 'smith-label', 'text-anchor': 'middle', 'dominant-baseline': 'middle',
                    x: gr * R * 1.1, y: -sign * gi * R * 1.1
                }, smithChart);
                label.textContent = (sign > 0 ? '+j' : '−j') + v;
            });
        });

        svgEl('circle', { id: 'smith-swr', class: 'smith-swr', cx: 0, cy: 0, r: 0 }, smithChart);
        svgEl('path', { id: 'smith-arc', class: 'smith-arc', d: '' }, smithChart);
        svgEl('line', { id: 'smith-ray', class: 'smith-ray', x1: 0, y1: 0, x2: 0, y2: 0 }, smithChart);
        svgEl('circle', { id: 'smith-point-in', class: 'smith-point-in', cx: 0, cy: 0, r: 6 }, smithChart);
        svgEl('circle', { id: 'smith-point', class: 'smith-point', cx: 0, cy: 0, r: 6 }, smithChart);
    }

    // Marks the load (gr, gi) and, when the line rotation theta is non-zero,
    // the rotated point (gInR, gInI) with the arc travelled on the VSWR circle
    function drawSmithPoint(gr, gi, gInR, gInI, theta) {
        const visible = Number.isFinite(gr) && Math.hypot(gr, gi) <= 1.05;
        const rotated = visible && Math.abs(theta) > 1e-9;
        ['smith-swr', 'smith-ray', 'smith-point'].forEach(id => $(id).classList.toggle('d-none', !visible));
        ['smith-arc', 'smith-point-in'].forEach(id => $(id).classList.toggle('d-none', !rotated));
        if (!visible) return;
        const x = gr * SMITH_RADIUS, y = -gi * SMITH_RADIUS;
        const radius = Math.hypot(x, y);
        $('smith-swr').setAttribute('r', radius);
        $('smith-ray').setAttribute('x2', x);
        $('smith-ray').setAttribute('y2', y);
        $('smith-point').setAttribute('cx', x);
        $('smith-point').setAttribute('cy', y);
        if (!rotated) return;

        const xIn = gInR * SMITH_RADIUS, yIn = -gInI * SMITH_RADIUS;
        const span = Math.abs(theta) % (2 * Math.PI);
        // Negative theta (toward generator) is clockwise on screen
        $('smith-arc').setAttribute('d', `M${x},${y} A${radius},${radius} 0 ${span > Math.PI ? 1 : 0} ${theta < 0 ? 1 : 0} ${xIn},${yIn}`);
        $('smith-point-in').setAttribute('cx', xIn);
        $('smith-point-in').setAttribute('cy', yIn);
    }

    function calcSmith() {
        const z0 = readValue('smith-z0');
        const r = readValue('smith-r', 'nonNegative');
        const x = readValue('smith-x', 'any');
        const f = readValue('smith-f', 'optional');
        const z0x = readValue('smith-z0x', 'any');
        const len = readValue('smith-len', 'nonNegative');

        if (Number.isNaN(z0 + z0x + r + x + len)) {
            clearResults(['smith-zn', 'smith-gamma', 'smith-vswr', 'smith-rl', 'smith-ml', 'smith-y', 'smith-eq', 'smith-gin', 'smith-zin']);
            drawSmithPoint(NaN, NaN);
            return;
        }

        // z = ZL / Z0 and Γ = (ZL - Z0) / (ZL + Z0), with Z0 = R0 + jX0
        const toDeg = rad => rad * 180 / Math.PI;
        const [zr, zi] = divide(r, x, z0, z0x);
        const [gr, gi] = divide(r - z0, x - z0x, r + z0, x + z0x);
        const rawMag = Math.hypot(gr, gi);
        const mag = Math.abs(rawMag - 1) < 1e-9 ? 1 : rawMag;
        const angle = mag < 1e-12 ? 0 : toDeg(Math.atan2(gi, gr));

        // Moving ℓ along the line rotates Γ by 4π·ℓ/λ: clockwise toward the generator
        const theta = ($('smith-dir').value === 'gen' ? -1 : 1) * 4 * Math.PI * len;
        const gInR = gr * Math.cos(theta) - gi * Math.sin(theta);
        const gInI = gr * Math.sin(theta) + gi * Math.cos(theta);
        const angleIn = mag < 1e-12 ? 0 : toDeg(Math.atan2(gInI, gInR));
        // Zin = Z0 · (1 + Γin) / (1 - Γin)
        let zin = '∞';
        if (Math.hypot(1 - gInR, gInI) > 1e-9) {
            const [nr, ni] = divide(1 + gInR, gInI, 1 - gInR, -gInI);
            zin = `${formatComplex(nr * z0 - ni * z0x, nr * z0x + ni * z0)} Ω`;
        }

        // Y = 1 / Z
        const zMag2 = r * r + x * x;
        const admittance = zMag2 === 0 ? '∞' : `${formatComplex(r / zMag2 * 1e3, -x / zMag2 * 1e3)} mS`;

        let equivalent = EMPTY;
        if (f && Math.abs(x) > 1e-12) {
            const w = 2 * Math.PI * f;
            equivalent = x > 0 ? 'L = ' + formatSI(x / w, 'H') : 'C = ' + formatSI(1 / (w * -x), 'F');
        }

        setResults({
            'smith-zn': formatComplex(zr, zi),
            'smith-gamma': `${formatNumber(mag)} ∠ ${formatNumber(angle)}°`,
            'smith-vswr': mag >= 1 ? '∞' : formatNumber((1 + mag) / (1 - mag)),
            // dB values are followed by the matching power ratio: |Γ|² and 1 - |Γ|²
            'smith-rl': formatDb(mag < 1e-12 ? Infinity : -20 * Math.log10(mag), mag * mag),
            'smith-ml': mag >= 1 ? formatDb(Infinity, 0) : formatDb(-10 * Math.log10(1 - mag * mag), 1 - mag * mag),
            'smith-y': admittance,
            'smith-eq': equivalent,
            'smith-gin': `${formatNumber(mag)} ∠ ${formatNumber(angleIn)}°`,
            'smith-zin': zin
        });
        drawSmithPoint(gr, gi, gInR, gInI, theta);
    }

    // Clicking (or dragging with the mouse) on the chart picks the load impedance
    function pickSmithPoint(e) {
        const z0 = readValue('smith-z0');
        const z0x = readValue('smith-z0x', 'any');
        if (Number.isNaN(z0 + z0x)) return;
        const pt = smithChart.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(smithChart.getScreenCTM().inverse());
        let gr = p.x / SMITH_RADIUS, gi = -p.y / SMITH_RADIUS;
        const mag = Math.hypot(gr, gi);
        if (mag > 1.08) return;
        if (mag > 1) { gr /= mag; gi /= mag; }

        // z = (1 + Γ) / (1 - Γ)
        const den = (1 - gr) ** 2 + gi ** 2;
        if (den < 1e-6) return;
        const zr = (1 - gr * gr - gi * gi) / den;
        const zi = 2 * gi / den;
        // ZL = z · Z0
        $('smith-r').value = formatNumber(Math.max(zr * z0 - zi * z0x, 0), 3);
        $('smith-x').value = formatNumber(zr * z0x + zi * z0, 3);
        calcSmith();
    }

    // ---------- Voltage Divider ----------

    function calcDivider() {
        const vin = readValue('div-vin', 'any');
        const r1 = readValue('div-r1');
        const r2 = readValue('div-r2');
        const rl = readValue('div-rl', 'optional');

        const rBottom = rl === null ? r2 : (r2 * rl) / (r2 + rl);
        const current = vin / (r1 + rBottom);
        const vout = current * rBottom;
        if (Number.isNaN(vout)) {
            clearResults(['div-vout', 'div-ratio', 'div-i', 'div-p1', 'div-p2']);
            return;
        }
        setResults({
            'div-vout': formatSI(vout, 'V'),
            'div-ratio': formatNumber(rBottom / (r1 + rBottom)),
            'div-i': formatSI(current, 'A'),
            'div-p1': formatSI(current * current * r1, 'W'),
            'div-p2': formatSI(vout * vout / r2, 'W')
        });
    }

    // ---------- RC / RL Time Constant ----------

    function calcTau() {
        const type = $('tau-type').value;
        showVariant('data-tau-type', type);
        drawLadder('tau-schematic', ['R'], [type === 'rc' ? 'C' : 'L']);

        const r = readValue('tau-r');
        const tau = type === 'rc' ? r * readValue('tau-c') : readValue('tau-l') / r;
        const valid = !Number.isNaN(tau);

        setResults({
            'tau-value': valid ? formatSI(tau, 's') : EMPTY,
            'tau-fc': valid ? formatSI(1 / (2 * Math.PI * tau), 'Hz') : EMPTY
        });

        $('tau-table').innerHTML = [1, 2, 3, 4, 5].map(n => `
            <tr>
                <th scope="row">${n}τ</th>
                <td>${valid ? formatSI(n * tau, 's') : EMPTY}</td>
                <td>${((1 - Math.exp(-n)) * 100).toFixed(1)} %</td>
                <td>${(Math.exp(-n) * 100).toFixed(1)} %</td>
            </tr>
        `).join('');
    }

    // ---------- Passive Filter ----------

    const FILTER_LAYOUTS = {
        lp: { rc: [['R'], ['C']], rl: [['L'], ['R']] },
        hp: { rc: [['C'], ['R']], rl: [['R'], ['L']] },
        bp: [['L', 'C'], ['R']],
        bs: [['R'], ['L', 'C']]
    };

    // Magnitude response over two decades on each side of the cutoff / center frequency
    function drawFilterResponse(center, response) {
        const valid = Number.isFinite(center) && center > 0;
        const steps = 120, points = [];
        for (let i = 0; valid && i <= steps; i++) {
            const db = Math.max(20 * Math.log10(response(center * 10 ** (-2 + 4 * i / steps)).mag), -40);
            points.push(`${(35 + 275 * i / steps).toFixed(1)},${(10 - db / 40 * 115).toFixed(1)}`);
        }
        $('filter-plot-line').setAttribute('points', points.join(' '));
        setResults({
            'filter-plot-min': valid ? formatSI(center / 100, 'Hz') : '',
            'filter-plot-mid': valid ? formatSI(center, 'Hz') : '',
            'filter-plot-max': valid ? formatSI(center * 100, 'Hz') : ''
        });
    }

    function calcFilter() {
        const type = $('filter-type').value;
        const topology = $('filter-topology').value;
        const firstOrder = type === 'lp' || type === 'hp';
        const useC = !firstOrder || topology === 'rc';
        const useL = !firstOrder || topology === 'rl';
        showVariant('data-filter-kind', firstOrder ? 'first' : 'second');
        $('filter-c-group').classList.toggle('d-none', !useC);
        $('filter-l-group').classList.toggle('d-none', !useL);
        drawLadder('filter-schematic', ...(firstOrder ? FILTER_LAYOUTS[type][topology] : FILTER_LAYOUTS[type]));

        const r = readValue('filter-r');
        const c = useC ? readValue('filter-c') : 0;
        const l = useL ? readValue('filter-l') : 0;
        const f = readValue('filter-f', 'optional');
        const toDeg = rad => rad * 180 / Math.PI;
        let center, response;

        if (firstOrder) {
            center = topology === 'rc' ? 1 / (2 * Math.PI * r * c) : r / (2 * Math.PI * l);
            // Low pass: H = 1 / (1 + jx), high pass: H = jx / (1 + jx), x = f / fc
            response = freq => {
                const x = freq / center;
                return type === 'lp'
                    ? { mag: 1 / Math.hypot(1, x), phase: -toDeg(Math.atan(x)) }
                    : { mag: x / Math.hypot(1, x), phase: 90 - toDeg(Math.atan(x)) };
            };
            setResults({ 'filter-fc': formatSI(center, 'Hz') });
        } else {
            // Series RLC: band pass output is taken across R, band stop across L + C
            center = 1 / (2 * Math.PI * Math.sqrt(l * c));
            const bandwidth = r / (2 * Math.PI * l);
            const q = center / bandwidth;
            const half = Math.sqrt(1 + 1 / (4 * q * q));
            response = freq => {
                const w = 2 * Math.PI * freq;
                const x = w * l - 1 / (w * c);
                return type === 'bp'
                    ? { mag: r / Math.hypot(r, x), phase: -toDeg(Math.atan2(x, r)) }
                    : { mag: Math.abs(x) / Math.hypot(r, x), phase: (x >= 0 ? 90 : -90) - toDeg(Math.atan2(x, r)) };
            };
            setResults({
                'filter-f0': formatSI(center, 'Hz'),
                'filter-bw': formatSI(bandwidth, 'Hz'),
                'filter-q': Number.isNaN(q) ? EMPTY : formatNumber(q),
                'filter-fl': formatSI(center * (half - 1 / (2 * q)), 'Hz'),
                'filter-fh': formatSI(center * (half + 1 / (2 * q)), 'Hz')
            });
        }

        let gain = EMPTY, phase = EMPTY;
        if (f && Number.isFinite(center)) {
            const at = response(f);
            // dB followed by the linear voltage ratio |H| = Vout / Vin
            gain = at.mag < 1e-12 ? formatDb(-Infinity, 0) : formatDb(20 * Math.log10(at.mag), at.mag);
            phase = formatNumber(at.phase) + '°';
        }
        setResults({ 'filter-gain': gain, 'filter-phase': phase });
        drawFilterResponse(center, response);
    }

    // ---------- Three Phase ----------

    // Draws one branch from p1 to p2 with an AC source or an impedance in the middle
    function drawBranch(g, [x1, y1], [x2, y2], kind) {
        const half = Math.hypot(x2 - x1, y2 - y1) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        const branch = svgEl('g', { transform: `translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) rotate(${angle})` }, g);
        const size = kind === 'source' ? 11 : 15;
        svgEl('polyline', { class: 'calc-wire', points: `${-half},0 ${-size},0` }, branch);
        svgEl('polyline', { class: 'calc-wire', points: `${size},0 ${half},0` }, branch);
        if (kind === 'source') {
            svgEl('circle', { class: 'calc-wire', cx: 0, cy: 0, r: size }, branch);
            // Sine symbol, rotated back so that it always stays upright
            svgEl('path', { class: 'calc-wire', d: 'M-6,0 q3,-7 6,0 t6,0', transform: `rotate(${-angle})` }, branch);
        } else {
            svgEl('rect', { class: 'calc-wire', x: -size, y: -7, width: 2 * size, height: 14 }, branch);
        }
    }

    // Three-phase schematic: source on the left, load on the right, each 'y' or 'delta'
    function drawThreePhase(source, load) {
        const g = $('tp-schematic');
        g.replaceChildren();
        const rows = [40, 110, 180];
        const label = (x, y, text, anchor = 'middle', cls = '') => {
            svgEl('text', { x, y, 'text-anchor': anchor, class: cls }, g).textContent = text;
        };

        // Blue measurement marks: an arrowhead centered on a wire, and a double-headed span
        const arrow = (x, y, angle, points = '-6,-5 6,0 -6,5') => {
            svgEl('polygon', { class: 'calc-mark', points, transform: `translate(${x} ${y}) rotate(${angle})` }, g);
        };
        const span = ([x1, y1], [x2, y2]) => {
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            svgEl('polyline', { class: 'calc-mark', points: `${x1},${y1} ${x2},${y2}` }, g);
            arrow(x1, y1, angle + 180, '-8,-4 0,0 -8,4');
            arrow(x2, y2, angle, '-8,-4 0,0 -8,4');
        };
        const mark = (x, y, text, anchor) => label(x, y, text, anchor, 'calc-mark-text');

        // "outer" is the far side of the bank, "inner" the side facing the lines
        [[source, 'source', 70, 130, 'n'], [load, 'load', 350, 290, 'N']].forEach(([config, kind, outer, inner, neutral]) => {
            const [a, b, c] = [[outer, rows[0]], [inner, rows[1]], [outer, rows[2]]];
            // +1 when the lines are to the right of the bank (source), -1 for the load
            const dir = outer < inner ? 1 : -1;
            const [away, toward] = dir > 0 ? ['end', 'start'] : ['start', 'end'];
            if (config === 'y') {
                const center = [outer, rows[1]];
                [a, b, c].forEach(end => drawBranch(g, center, end, kind));
                svgEl('circle', { class: 'calc-node', cx: center[0], cy: center[1], r: 3 }, g);
                label(outer - 9 * dir, rows[1] + 4, neutral, away);

                // Phase a: voltage between a and the neutral, current through that winding
                span([outer - 22 * dir, rows[1] - 12], [outer - 22 * dir, rows[0] + 12]);
                mark(outer - 27 * dir, 79, 'Vφ', away);
                arrow(outer, rows[0] + 12, kind === 'source' ? -90 : 90);
                mark(outer + 9 * dir, rows[0] + 17, 'Iφ', toward);
            } else {
                [[a, b], [b, c], [c, a]].forEach(([from, to]) => drawBranch(g, from, to, kind));
                [a, b, c].forEach(([x, y]) => svgEl('circle', { class: 'calc-node', cx: x, cy: y, r: 3 }, g));

                // Phase a is the branch between a and b: voltage across it (drawn beside
                // the branch, outside the triangle) and the current flowing through it
                const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
                const [ux, uy] = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
                const [mx, my] = [(a[0] + b[0]) / 2 + 16 * uy * dir, (a[1] + b[1]) / 2 - 16 * ux * dir];
                span([mx - 23 * ux, my - 23 * uy], [mx + 23 * ux, my + 23 * uy]);
                mark(mx + 8 * dir, my - 3, 'Vφ', toward);
                const angle = Math.atan2(uy, ux) * 180 / Math.PI;
                arrow(outer + 51 * dir, 99.5, kind === 'source' ? angle + 180 : angle);
                mark(outer + 40 * dir, 109, 'Iφ', away);
            }
        });

        // Lines a, b and c
        [[70, 350], [130, 290], [70, 350]].forEach(([from, to], i) => {
            svgEl('polyline', { class: 'calc-wire', points: `${from},${rows[i]} ${to},${rows[i]}` }, g);
            label(160, rows[i] - 8, 'abc'[i]);
            label(260, rows[i] - 8, 'ABC'[i]);
        });

        // Line current arrow on line a, line voltage between lines b and c
        arrow(210, rows[0], 0);
        mark(210, rows[0] - 12, 'IL', 'middle');
        span([210, rows[1] + 7], [210, rows[2] - 7]);
        mark(218, (rows[1] + rows[2]) / 2 + 4, 'VL', 'start');
    }

    function calcThreePhase() {
        const source = $('tp-source').value;
        const load = $('tp-load').value;
        drawThreePhase(source, load);

        const v = readValue('tp-v');
        let r = readValue('tp-r', 'nonNegative');
        const x = readValue('tp-x', 'any');
        // A short circuit (Z = 0) has no finite solution
        if (r === 0 && x === 0) {
            $('tp-r').classList.add('is-invalid');
            r = NaN;
        }
        if (Number.isNaN(v + r + x)) {
            clearResults(['tp-vl', 'tp-il', 'tp-vs', 'tp-is', 'tp-vp', 'tp-ip', 'tp-pf', 'tp-p', 'tp-q', 'tp-s']);
            return;
        }

        const SQRT3 = Math.sqrt(3);
        const phasor = (mag, unit, angle) => `${formatSI(mag, unit)} ∠ ${formatNumber(angle)}°`;

        // Entered voltage is either line-to-line or across one source winding;
        // readValue has already scaled it from amplitude / peak-to-peak to RMS
        const vLine = $('tp-vtype').value === 'phase' && source === 'y' ? v * SQRT3 : v;
        const vNeutral = vLine / SQRT3;
        const zMag = Math.hypot(r, x);
        const theta = Math.atan2(x, r) * 180 / Math.PI;
        // Per-phase equivalent: a delta load becomes a Y load of Z / 3
        const iLine = vNeutral / (load === 'y' ? zMag : zMag / 3);

        // Phase a quantities with Van = 0°: in a Y the phase voltage is Van and the phase current
        // is the line current, in a delta they are Vab (leads by 30°) and IL / √3 (leads by 30°)
        const phaseVoltage = config => config === 'y' ? phasor(vNeutral, 'V', 0) : phasor(vLine, 'V', 30);
        const phaseCurrent = config => config === 'y' ? phasor(iLine, 'A', -theta) : phasor(iLine / SQRT3, 'A', 30 - theta);

        const iLoad = load === 'y' ? iLine : iLine / SQRT3;
        const pf = r / zMag;
        setResults({
            'tp-vl': phasor(vLine, 'V', 30),
            'tp-il': phasor(iLine, 'A', -theta),
            'tp-vs': phaseVoltage(source),
            'tp-is': phaseCurrent(source),
            'tp-vp': phaseVoltage(load),
            'tp-ip': phaseCurrent(load),
            'tp-pf': formatNumber(pf) + (x > 0 ? ' lagging' : x < 0 ? ' leading' : ''),
            'tp-p': formatSI(3 * iLoad * iLoad * r, 'W'),
            'tp-q': formatSI(3 * iLoad * iLoad * x, 'var'),
            'tp-s': formatSI(SQRT3 * vLine * iLine, 'VA')
        });
    }

    // ---------- Buck Converter ----------

    function calcBuck() {
        const vin = readValue('buck-vin');
        const vout = readValue('buck-vout');
        const iout = readValue('buck-iout');
        const fsw = readValue('buck-fsw');
        const dv = readValue('buck-dv');
        let ripple = readValue('buck-ripple');
        // Above 200 % the inductor current reaches zero, CCM formulas no longer hold
        if (ripple > 200) {
            $('buck-ripple').classList.add('is-invalid');
            ripple = NaN;
        }

        const notStepDown = vout >= vin;
        $('buck-error').classList.toggle('d-none', !notStepDown);

        if (notStepDown || Number.isNaN(vin + vout + iout + fsw + dv + ripple)) {
            clearResults(['buck-duty', 'buck-ton', 'buck-l', 'buck-dil', 'buck-ipk', 'buck-c', 'buck-p']);
            return;
        }

        const duty = vout / vin;
        const deltaIL = iout * ripple / 100;
        setResults({
            'buck-duty': formatNumber(duty * 100) + ' %',
            'buck-ton': formatSI(duty / fsw, 's'),
            'buck-l': formatSI(vout * (vin - vout) / (deltaIL * fsw * vin), 'H'),
            'buck-dil': formatSI(deltaIL, 'A'),
            'buck-ipk': formatSI(iout + deltaIL / 2, 'A'),
            'buck-c': formatSI(deltaIL / (8 * fsw * dv), 'F'),
            'buck-p': formatSI(vout * iout, 'W')
        });
    }

    // ---------- Wiring ----------

    const calculators = {
        timer555: calcTimer555,
        smith: calcSmith,
        divider: calcDivider,
        tau: calcTau,
        filter: calcFilter,
        threephase: calcThreePhase,
        buck: calcBuck
    };

    buildSmithChart();
    Object.entries(calculators).forEach(([id, calculate]) => {
        $(id).addEventListener('input', calculate);
        $(id).addEventListener('change', calculate);
        calculate();
    });

    smithChart.addEventListener('pointerdown', pickSmithPoint);
    smithChart.addEventListener('pointermove', e => {
        if (e.pointerType === 'mouse' && e.buttons === 1) pickSmithPoint(e);
    });

    // ---------- Categories ----------

    // Calculators listed under each category button, in tab order
    const CATEGORIES = {
        circuit: ['divider', 'tau', 'filter', 'threephase'],
        wave: ['smith'],
        semiconductor: ['divider'],
        generic: ['timer555', 'buck'],
        everything: ['timer555', 'smith', 'divider', 'tau', 'filter', 'threephase', 'buck']
    };
    let currentCategory = null;

    // The URL hash decides what is shown: none -> category buttons,
    // "#circuit" -> that category, "#circuit/filter" -> a calculator inside it.
    // A bare calculator id ("#smith") opens it under Everything.
    function route() {
        const [first, second] = location.hash.slice(1).split('/');
        currentCategory = Object.hasOwn(CATEGORIES, first) ? first
            : Object.hasOwn(calculators, first) ? 'everything' : null;
        $('calc-categories').classList.toggle('d-none', currentCategory !== null);
        $('calc-view').classList.toggle('d-none', currentCategory === null);
        if (!currentCategory) return;

        const ids = CATEGORIES[currentCategory];
        // Copy the button's title, keeping its translation key so the language toggle updates it too
        const source = document.querySelector(`[data-category="${currentCategory}"] .calc-category-title`);
        const title = $('calc-category-title');
        title.textContent = source.textContent;
        if (source.hasAttribute('data-i18n')) title.setAttribute('data-i18n', source.getAttribute('data-i18n'));
        else title.removeAttribute('data-i18n');
        Object.keys(calculators).forEach(id => $(id + '-tab').parentElement.classList.add('d-none'));
        ids.forEach(id => {
            const item = $(id + '-tab').parentElement;
            item.classList.remove('d-none');
            $('calcTabs').appendChild(item);
        });

        const wanted = first === currentCategory ? second : first;
        bootstrap.Tab.getOrCreateInstance($((ids.includes(wanted) ? wanted : ids[0]) + '-tab')).show();
    }

    $('calc-categories').addEventListener('click', e => {
        const button = e.target.closest('[data-category]');
        if (!button) return;
        history.pushState(null, '', '#' + button.getAttribute('data-category'));
        route();
    });
    $('calc-back').addEventListener('click', () => {
        history.pushState(null, '', location.pathname + location.search);
        route();
    });
    $('calcTabs').addEventListener('shown.bs.tab', e => {
        if (!currentCategory) return;
        history.replaceState(null, '', `#${currentCategory}/${e.target.getAttribute('data-bs-target').slice(1)}`);
    });
    window.addEventListener('popstate', route);
    route();
});
