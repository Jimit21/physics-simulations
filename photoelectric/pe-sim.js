// ============================================================
// PHOTOELECTRIC EFFECT SIMULATION
// Built by Jimit Pandya — jimitportal.web.app
// MSc Physics | NCERT Class 12 Chapter 11
//
// Physics constants used:
//   h  = 6.626e-34 J·s  (Planck's constant)
//   e  = 1.602e-19 C    (electron charge)
// All energies displayed in eV for clarity.
// ============================================================

'use strict';

// ── Physical Constants ───────────────────────────────────────
const h = 6.626e-34;      // Planck's constant (J·s)
const e = 1.602e-19;      // Electron charge (C)
const c = 3e8;            // Speed of light (m/s)

// ── Metal Work Functions (eV) ────────────────────────────────
const METALS = {
    sodium:   { symbol: 'Na', name: 'Sodium',   phi: 2.3,  color: '#ffd700' },
    zinc:     { symbol: 'Zn', name: 'Zinc',     phi: 4.3,  color: '#a0aec0' },
    copper:   { symbol: 'Cu', name: 'Copper',   phi: 4.7,  color: '#c97b3a' },
    platinum: { symbol: 'Pt', name: 'Platinum', phi: 5.6,  color: '#e5e4e2' }
};

// ── Light colour map (frequency in 10^14 Hz → colour) ───────
function freqToColour(freqE14) {
    if (freqE14 < 4.3)  return { hex: '#ff4040', label: 'Infrared / Deep Red',    hint: '#ff4040' };
    if (freqE14 < 4.8)  return { hex: '#ff6600', label: 'Red-Orange light',        hint: '#ff6600' };
    if (freqE14 < 5.3)  return { hex: '#ffcc00', label: 'Yellow light',            hint: '#ffcc00' };
    if (freqE14 < 5.9)  return { hex: '#66ff66', label: 'Visible green light',     hint: '#66ff66' };
    if (freqE14 < 6.5)  return { hex: '#00ccff', label: 'Cyan / Blue-green light', hint: '#00ccff' };
    if (freqE14 < 7.5)  return { hex: '#6699ff', label: 'Blue-violet light',       hint: '#6699ff' };
    if (freqE14 < 9.0)  return { hex: '#cc66ff', label: 'Near UV light',           hint: '#cc66ff' };
    return                      { hex: '#ff99ff', label: 'Deep UV light',           hint: '#ff99ff' };
}

// ── State ────────────────────────────────────────────────────
let state = {
    metal:      'sodium',
    freqE14:    6.0,       // frequency × 10^14 Hz
    intensity:  50,        // W/m^2
    voltage:    0,         // Applied voltage (V)
    emitting:   false,
    ke_eV:      0,
    vs:         0,
    current:    0,
    electrons:  [],
    photons:    [],
    collisionCount: 0
};

// ── Canvas Setup ─────────────────────────────────────────────
const canvas = document.getElementById('pe-canvas');
const ctx = canvas.getContext('2d');
let W, H;

function resize() {
    const wrapper = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    W = wrapper.clientWidth;
    H = wrapper.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ── Particle Classes ─────────────────────────────────────────
class Photon {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = W * 0.08 + Math.random() * 20 - 10;
        this.y = H * 0.15 + Math.random() * (H * 0.7);
        this.vx = 2.5 + Math.random() * 1.5;
        this.vy = (Math.random() - 0.5) * 0.8;
        this.r  = 3;
        this.alive = true;
        this.alpha = 0.85;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        // Hit the cathode plate
        if (this.x > W * 0.44) {
            this.alive = false;
            if (state.emitting) spawnElectron(this.y);
        }
        if (this.x > W || this.y < 0 || this.y > H) this.alive = false;
    }
    draw() {
        const col = freqToColour(state.freqE14);
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = col.hex;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = col.hex;
        ctx.fill();
        ctx.restore();
    }
}

class Electron {
    constructor(y) {
        this.x  = W * 0.44;
        this.y  = y;
        // Speed proportional to sqrt(KE)
        const speed = 1.5 + Math.sqrt(Math.max(state.ke_eV, 0.1)) * 1.2;
        this.vx = speed * (0.8 + Math.random() * 0.4);
        this.vy = (Math.random() - 0.5) * speed * 0.6;
        this.r  = 2.5;
        this.alive = true;
        this.alpha = 1;
        this.trail  = [];
    }
    update() {
        // Voltage decelerates/accelerates electrons
        const accel = (state.voltage * e) / (50 * 1.6726e-27) * 1e-28;
        this.vx += accel;

        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 12) this.trail.shift();

        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.008;

        if (this.x > W * 0.85 || this.x < W * 0.44 || this.y < 0 || this.y > H || this.alpha <= 0)
            this.alive = false;
    }
    draw() {
        // Trail
        for (let i = 0; i < this.trail.length; i++) {
            const a = (i / this.trail.length) * this.alpha * 0.35;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56,189,248,${a})`;
            ctx.fill();
        }
        // Electron dot
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#38bdf8';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.restore();
    }
}

// ── Spawn helpers ────────────────────────────────────────────
let photonTimer = 0;
function spawnPhoton() {
    if (state.photons.length < 60) state.photons.push(new Photon());
}

function spawnElectron(y) {
    if (state.electrons.length < 80) {
        state.electrons.push(new Electron(y));
        state.collisionCount++;
        document.getElementById('stat-collisions') &&
            (document.getElementById('stat-collisions').textContent = state.collisionCount);
    }
}

// ── Physics Calculations ─────────────────────────────────────
function calculatePhysics() {
    const metal = METALS[state.metal];
    const nu    = state.freqE14 * 1e14;          // Hz
    const nu0   = (metal.phi * e) / h;           // threshold frequency (Hz)
    const nu0E14 = nu0 / 1e14;
    const photonE_eV = (h * nu) / e;             // photon energy in eV

    state.emitting = nu > nu0;
    state.ke_eV    = state.emitting ? (photonE_eV - metal.phi) : 0;
    state.vs       = state.emitting ? state.ke_eV : 0;
    // Current: proportional to intensity (NOT frequency) when emitting
    state.current  = state.emitting
        ? (state.intensity / 100) * 35 * Math.max(0, 1 + state.voltage / (state.vs + 0.01))
        : 0;
    state.current  = Math.max(state.current, 0);

    // Update UI
    document.getElementById('val-threshold').textContent = nu0E14.toFixed(2);
    document.getElementById('val-ke').textContent = state.ke_eV.toFixed(3);
    document.getElementById('val-vs').textContent = state.vs.toFixed(3);
    document.getElementById('val-current').textContent = state.current.toFixed(1);

    const dot  = document.getElementById('status-dot');
    const text = document.getElementById('status-text');
    if (state.emitting) {
        dot.classList.add('emitting');
        text.textContent = `Emission active! KE = ${state.ke_eV.toFixed(2)} eV`;
    } else {
        dot.classList.remove('emitting');
        text.textContent = `No emission — ν < ν₀ (${nu0E14.toFixed(2)} × 10¹⁴ Hz)`;
    }

    return { nu0E14, photonE_eV, metal };
}

// ── Draw Scene ───────────────────────────────────────────────
function drawScene() {
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createRadialGradient(W*0.3, H*0.5, 0, W*0.3, H*0.5, W*0.6);
    bg.addColorStop(0, '#0d1f3c');
    bg.addColorStop(1, '#080d1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Light source (left) ──
    const metal = METALS[state.metal];
    const col   = freqToColour(state.freqE14);

    // Lamp body
    const lampX = W * 0.06, lampY = H * 0.5;
    ctx.save();
    ctx.shadowBlur  = 30;
    ctx.shadowColor = col.hex;
    ctx.beginPath();
    ctx.arc(lampX, lampY, 22, 0, Math.PI * 2);
    const lampGrad = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 22);
    lampGrad.addColorStop(0, col.hex);
    lampGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lampGrad;
    ctx.fill();
    ctx.restore();

    // Lamp label
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('Light Source', lampX, lampY + 36);
    ctx.fillText(`ν = ${state.freqE14.toFixed(1)} × 10¹⁴ Hz`, lampX, lampY + 49);

    // ── Beam ──
    const beamGrad = ctx.createLinearGradient(lampX + 22, lampY, W * 0.44, lampY);
    beamGrad.addColorStop(0, col.hex + 'aa');
    beamGrad.addColorStop(1, col.hex + '11');
    ctx.beginPath();
    ctx.moveTo(lampX + 22, lampY - 4);
    ctx.lineTo(W * 0.44, H * 0.2);
    ctx.lineTo(W * 0.44, H * 0.8);
    ctx.lineTo(lampX + 22, lampY + 4);
    ctx.closePath();
    ctx.fillStyle = beamGrad;
    ctx.fill();

    // ── Cathode plate ──
    const plateX = W * 0.44;
    ctx.save();
    ctx.shadowBlur  = 20;
    ctx.shadowColor = metal.color;
    ctx.beginPath();
    ctx.roundRect(plateX - 8, H * 0.15, 16, H * 0.7, 4);
    const plateGrad = ctx.createLinearGradient(plateX - 8, 0, plateX + 8, 0);
    plateGrad.addColorStop(0, metal.color + '66');
    plateGrad.addColorStop(0.5, metal.color);
    plateGrad.addColorStop(1, metal.color + '66');
    ctx.fillStyle = plateGrad;
    ctx.fill();
    ctx.restore();

    // Cathode label
    ctx.font = '700 13px Outfit, sans-serif';
    ctx.fillStyle = metal.color;
    ctx.textAlign = 'center';
    ctx.fillText(metal.symbol, plateX, H * 0.15 - 20);
    ctx.font = '500 10px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(`φ = ${metal.phi} eV`, plateX, H * 0.15 - 8);
    ctx.fillText('Cathode', plateX, H * 0.85 + 18);

    // ── Anode plate ──
    const anodeX = W * 0.78;
    ctx.save();
    ctx.shadowBlur  = 12;
    ctx.shadowColor = 'rgba(56,189,248,0.4)';
    ctx.beginPath();
    ctx.roundRect(anodeX - 6, H * 0.2, 12, H * 0.6, 3);
    ctx.fillStyle = 'rgba(56,189,248,0.35)';
    ctx.fill();
    ctx.restore();

    ctx.font = '500 10px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(56,189,248,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('Anode', anodeX, H * 0.2 - 8);

    // ── Voltage indicator ──
    const vLabel = state.voltage >= 0 ? `+${state.voltage.toFixed(1)}V` : `${state.voltage.toFixed(1)}V`;
    const vColor = state.voltage >= 0 ? '#22c55e' : '#ef4444';
    ctx.font = '600 12px Outfit, sans-serif';
    ctx.fillStyle = vColor;
    ctx.textAlign = 'center';
    ctx.fillText(vLabel, (plateX + anodeX) / 2, H - 18);

    // ── Ammeter symbol ──
    const ammX = (plateX + anodeX) / 2, ammY = H * 0.88;
    ctx.beginPath();
    ctx.arc(ammX, ammY, 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = '700 12px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('A', ammX, ammY + 4);

    // ── Photons & electrons ──
    state.photons  = state.photons.filter(p => p.alive);
    state.electrons = state.electrons.filter(e => e.alive);
    state.photons.forEach(p => { p.update(); p.draw(); });
    state.electrons.forEach(e => { e.update(); e.draw(); });

    // Spawn photons based on intensity
    photonTimer++;
    const spawnRate = Math.max(2, Math.round(20 - state.intensity / 7));
    if (photonTimer % spawnRate === 0) spawnPhoton();

    // ── Watermark on canvas ──
    ctx.font = '500 11px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.textAlign = 'right';
    ctx.fillText('jimitportal.web.app', W - 10, H - 10);
}

// ── NCERT Graph Drawing ──────────────────────────────────────
let activeGraph = 'iv';
const graphCanvas = document.getElementById('ncert-graph');
const gCtx = graphCanvas.getContext('2d');

function drawGraph() {
    const gW = graphCanvas.width, gH = graphCanvas.height;
    gCtx.clearRect(0, 0, gW, gH);

    // Background
    gCtx.fillStyle = 'rgba(8,13,26,0.95)';
    gCtx.fillRect(0, 0, gW, gH);

    // Grid
    gCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    gCtx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
        gCtx.beginPath(); gCtx.moveTo(gW * i/4, 0); gCtx.lineTo(gW * i/4, gH); gCtx.stroke();
        gCtx.beginPath(); gCtx.moveTo(0, gH * i/4); gCtx.lineTo(gW, gH * i/4); gCtx.stroke();
    }

    const pad = 24;
    const pw = gW - pad * 2, ph = gH - pad * 2;

    // Axes
    gCtx.strokeStyle = 'rgba(255,255,255,0.3)';
    gCtx.lineWidth = 1.5;
    gCtx.beginPath();
    gCtx.moveTo(pad, pad); gCtx.lineTo(pad, gH - pad); gCtx.lineTo(gW - pad, gH - pad);
    gCtx.stroke();

    const metal = METALS[state.metal];
    const nu    = state.freqE14 * 1e14;
    const nu0   = (metal.phi * e) / h;

    if (activeGraph === 'iv') {
        // I vs V: current vs voltage
        drawGraphLabel(gCtx, gW, gH, 'Current (I)', 'Voltage (V)');
        gCtx.beginPath();
        gCtx.strokeStyle = '#38bdf8';
        gCtx.lineWidth = 2;
        for (let vi = 0; vi <= pw; vi++) {
            const v = -5 + (vi / pw) * 10;
            const iVal = state.emitting
                ? Math.max(0, (state.intensity / 100) * 28 * (1 + v / (state.vs + 0.01)))
                : 0;
            const x = pad + vi;
            const y = gH - pad - (iVal / 35) * ph * 0.85;
            vi === 0 ? gCtx.moveTo(x, y) : gCtx.lineTo(x, y);
        }
        gCtx.stroke();
        // Mark stopping potential
        if (state.emitting && state.vs > 0) {
            const vsX = pad + ((5 - state.vs) / 10) * pw;
            gCtx.setLineDash([3, 3]);
            gCtx.strokeStyle = 'rgba(239,68,68,0.6)';
            gCtx.beginPath();
            gCtx.moveTo(vsX, pad); gCtx.lineTo(vsX, gH - pad);
            gCtx.stroke();
            gCtx.setLineDash([]);
            gCtx.font = '9px Outfit, sans-serif';
            gCtx.fillStyle = '#ef4444';
            gCtx.textAlign = 'center';
            gCtx.fillText(`−Vs`, vsX, gH - pad + 14);
        }
        document.getElementById('graph-legend').textContent = 'Dashed = Stopping Potential (−Vs)';

    } else if (activeGraph === 'if') {
        // I vs ν (intensity comparison)
        drawGraphLabel(gCtx, gW, gH, 'Current (I)', 'Frequency (ν)');
        // High intensity line
        gCtx.beginPath();
        gCtx.strokeStyle = '#38bdf8';
        gCtx.lineWidth = 2;
        for (let xi = 0; xi <= pw; xi++) {
            const f = 3 + (xi / pw) * 9;
            const fHz = f * 1e14;
            const emit = fHz > nu0;
            const iVal = emit ? (state.intensity / 100) * 28 : 0;
            const x = pad + xi, y = gH - pad - (iVal / 28) * ph * 0.85;
            xi === 0 ? gCtx.moveTo(x, y) : gCtx.lineTo(x, y);
        }
        gCtx.stroke();
        // Low intensity (half) line
        gCtx.beginPath();
        gCtx.strokeStyle = 'rgba(56,189,248,0.4)';
        gCtx.lineWidth = 1.5;
        for (let xi = 0; xi <= pw; xi++) {
            const f = 3 + (xi / pw) * 9;
            const fHz = f * 1e14;
            const emit = fHz > nu0;
            const iVal = emit ? (state.intensity / 200) * 28 : 0;
            const x = pad + xi, y = gH - pad - (iVal / 28) * ph * 0.85;
            xi === 0 ? gCtx.moveTo(x, y) : gCtx.lineTo(x, y);
        }
        gCtx.stroke();
        // Mark threshold
        markThreshold(gCtx, nu0 / 1e14, pad, pw, ph, gH);
        document.getElementById('graph-legend').textContent = 'Bright = high intensity | Dim = low intensity';

    } else if (activeGraph === 'vsf') {
        // Vs vs ν (stopping potential vs frequency)
        drawGraphLabel(gCtx, gW, gH, 'Vs (V)', 'Frequency (ν)');
        gCtx.beginPath();
        gCtx.strokeStyle = '#a855f7';
        gCtx.lineWidth = 2;
        for (let xi = 0; xi <= pw; xi++) {
            const f = 3 + (xi / pw) * 9;
            const fHz = f * 1e14;
            const emit = fHz > nu0;
            const vsVal = emit ? ((h * fHz) / e) - metal.phi : 0;
            const x = pad + xi, y = gH - pad - Math.max(0, vsVal / 8) * ph * 0.85;
            xi === 0 ? gCtx.moveTo(x, y) : gCtx.lineTo(x, y);
        }
        gCtx.stroke();
        markThreshold(gCtx, nu0 / 1e14, pad, pw, ph, gH);
        document.getElementById('graph-legend').textContent = 'Slope = h/e (Planck\'s constant / e)';

    } else if (activeGraph === 'kef') {
        // KE vs ν
        drawGraphLabel(gCtx, gW, gH, 'KE (eV)', 'Frequency (ν)');
        gCtx.beginPath();
        gCtx.strokeStyle = '#22c55e';
        gCtx.lineWidth = 2;
        for (let xi = 0; xi <= pw; xi++) {
            const f = 3 + (xi / pw) * 9;
            const fHz = f * 1e14;
            const emit = fHz > nu0;
            const keVal = emit ? ((h * fHz) / e) - metal.phi : 0;
            const x = pad + xi, y = gH - pad - Math.max(0, keVal / 8) * ph * 0.85;
            xi === 0 ? gCtx.moveTo(x, y) : gCtx.lineTo(x, y);
        }
        gCtx.stroke();
        markThreshold(gCtx, nu0 / 1e14, pad, pw, ph, gH);
        // Mark current freq
        const curX = pad + ((state.freqE14 - 3) / 9) * pw;
        const curKE = state.ke_eV;
        if (state.emitting) {
            gCtx.beginPath();
            gCtx.arc(curX, gH - pad - Math.max(0, curKE / 8) * ph * 0.85, 5, 0, Math.PI * 2);
            gCtx.fillStyle = '#22c55e';
            gCtx.fill();
        }
        document.getElementById('graph-legend').textContent = 'Slope = h (Planck\'s constant)';
    }
}

function drawGraphLabel(gCtx, gW, gH, yLabel, xLabel) {
    gCtx.font = '9px Outfit, sans-serif';
    gCtx.fillStyle = 'rgba(255,255,255,0.4)';
    gCtx.save();
    gCtx.translate(9, gH / 2);
    gCtx.rotate(-Math.PI / 2);
    gCtx.textAlign = 'center';
    gCtx.fillText(yLabel, 0, 0);
    gCtx.restore();
    gCtx.textAlign = 'center';
    gCtx.fillText(xLabel, gW / 2, gH - 4);
}

function markThreshold(gCtx, nu0E14, pad, pw, ph, gH) {
    const thX = pad + ((nu0E14 - 3) / 9) * pw;
    gCtx.setLineDash([3, 3]);
    gCtx.strokeStyle = 'rgba(239,68,68,0.5)';
    gCtx.lineWidth = 1;
    gCtx.beginPath();
    gCtx.moveTo(thX, pad); gCtx.lineTo(thX, gH - pad);
    gCtx.stroke();
    gCtx.setLineDash([]);
    gCtx.font = '9px Outfit, sans-serif';
    gCtx.fillStyle = '#ef4444';
    gCtx.textAlign = 'center';
    gCtx.fillText('ν₀', thX, gH - pad + 14);
}

// ── Controls ─────────────────────────────────────────────────
function updateFreqHint() {
    const col = freqToColour(state.freqE14);
    const hint = document.getElementById('freq-hint');
    hint.textContent = col.label;
    hint.style.background = col.hex + '22';
    hint.style.color = col.hex;
    hint.style.borderColor = col.hex + '44';
    hint.style.border = `1px solid ${col.hex}44`;
}

document.getElementById('freq-slider').addEventListener('input', function() {
    state.freqE14 = parseFloat(this.value);
    document.getElementById('freq-val').textContent = state.freqE14.toFixed(1);
    updateFreqHint();
    state.photons = [];
    calculatePhysics();
    drawGraph();
});

document.getElementById('intensity-slider').addEventListener('input', function() {
    state.intensity = parseInt(this.value);
    document.getElementById('intensity-val').textContent = state.intensity;
    state.photons = [];
    calculatePhysics();
    drawGraph();
});

document.getElementById('voltage-slider').addEventListener('input', function() {
    state.voltage = parseFloat(this.value);
    document.getElementById('voltage-val').textContent = state.voltage.toFixed(1) + ' V';
    calculatePhysics();
    drawGraph();
});

// Metal selector
document.querySelectorAll('.metal-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.metal-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        state.metal = this.dataset.metal;
        state.electrons = [];
        state.photons = [];
        calculatePhysics();
        drawGraph();
    });
});

// Graph tabs
document.querySelectorAll('.graph-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.graph-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        activeGraph = this.dataset.graph;
        drawGraph();
    });
});

// ── FPS Counter ───────────────────────────────────────────────
let fps = 60, lastTime = performance.now(), frameCount = 0;

// ── Main Loop ────────────────────────────────────────────────
function loop(now) {
    frameCount++;
    if (now - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
        const fpEl = document.getElementById('stat-fps');
        if (fpEl) fpEl.textContent = fps;
    }

    const bodiesEl = document.getElementById('stat-bodies');
    if (bodiesEl) bodiesEl.textContent = state.electrons.length + state.photons.length;

    const keEl = document.getElementById('stat-ke');
    if (keEl) keEl.textContent = state.ke_eV.toFixed(2) + ' eV';

    drawScene();
    requestAnimationFrame(loop);
}

// ── Init ─────────────────────────────────────────────────────
updateFreqHint();
calculatePhysics();
drawGraph();
requestAnimationFrame(loop);
