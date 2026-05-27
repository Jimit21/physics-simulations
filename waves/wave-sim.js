// ============================================================
// WAVE SUPERPOSITION SIMULATION
// Built by Jimit Pandya — jimitportal.web.app
// MSc Physics | Wave Mechanics
//
// y1(x,t) = A1 * sin(2π·f1·t − 2π·x/λ + φ1)
// y2(x,t) = A2 * sin(2π·f2·t − 2π·x/λ + φ2)
// y(x,t)  = y1 + y2  (Principle of Superposition)
// ============================================================

'use strict';

const canvas  = document.getElementById('wave-canvas');
const ctx     = canvas.getContext('2d');
let W, H, animating = true;

function resize() {
    const wrapper = document.getElementById('wave-canvas-wrapper');
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

// ── State ────────────────────────────────────────────────────
let state = {
    a1: 1.0, f1: 1.0, p1: 0,
    a2: 1.0, f2: 1.0, p2: 0,
    speed: 1.0,
    showW1: true, showW2: true, showResult: true
};
let t = 0;

// ── Draw everything ───────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
        ctx.beginPath(); ctx.moveTo(0, H * i/6); ctx.lineTo(W, H * i/6); ctx.stroke();
    }

    // Wave parameters
    const { a1, f1, p1, a2, f2, p2 } = state;
    const p1r = (p1 * Math.PI) / 180;
    const p2r = (p2 * Math.PI) / 180;
    const lambda = W / 2.5; // wavelength in pixels

    // ── Draw individual waves ──
    const midY  = H / 2;
    const scale = H / 5; // amplitude scale factor

    function waveY(x, A, f, phi) {
        return A * Math.sin(2 * Math.PI * f * t - (2 * Math.PI * x) / lambda + phi);
    }

    function drawWave(colour, A, f, phi, lineWidth, shadow) {
        ctx.beginPath();
        ctx.strokeStyle = colour;
        ctx.lineWidth = lineWidth;
        if (shadow) { ctx.shadowBlur = 10; ctx.shadowColor = colour; }
        for (let x = 0; x <= W; x += 2) {
            const y = midY + waveY(x, A, f, phi) * scale;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function drawResultant() {
        ctx.beginPath();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#22c55e';
        for (let x = 0; x <= W; x += 2) {
            const y = midY + (waveY(x, a1, f1, p1r) + waveY(x, a2, f2, p2r)) * scale;
            x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    // Centre axis
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();
    ctx.setLineDash([]);

    if (state.showW1) drawWave('rgba(56,189,248,0.75)', a1, f1, p1r, 2, true);
    if (state.showW2) drawWave('rgba(168,85,247,0.75)', a2, f2, p2r, 2, true);
    if (state.showResult) drawResultant();

    // ── Labels ──
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.textAlign = 'left';
    if (state.showW1) { ctx.fillStyle = 'rgba(56,189,248,0.9)'; ctx.fillText(`y₁  A=${a1.toFixed(2)} f=${f1.toFixed(1)}Hz φ=${p1}°`, 12, 22); }
    if (state.showW2) { ctx.fillStyle = 'rgba(168,85,247,0.9)'; ctx.fillText(`y₂  A=${a2.toFixed(2)} f=${f2.toFixed(1)}Hz φ=${p2}°`, 12, 38); }
    if (state.showResult) { ctx.fillStyle = 'rgba(34,197,94,0.9)'; ctx.fillText(`y = y₁ + y₂  (Resultant)`, 12, 54); }

    // Amplitude marker on resultant
    if (state.showResult) {
        const maxY_val = a1 + a2;
        const markerY = midY - maxY_val * scale;
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(34,197,94,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, markerY); ctx.lineTo(W, markerY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, midY + maxY_val * scale); ctx.lineTo(W, midY + maxY_val * scale); ctx.stroke();
        ctx.setLineDash([]);
    }

    // Watermark
    ctx.font = '500 11px Outfit, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.textAlign = 'right';
    ctx.fillText('jimitportal.web.app', W - 10, H - 10);
}

// ── Update live stats ─────────────────────────────────────────
function updateStats() {
    const beat = Math.abs(state.f1 - state.f2).toFixed(1);
    const phaseDiff = Math.abs(state.p1 - state.p2) % 360;
    const maxAmp = (state.a1 + state.a2).toFixed(2);

    let type = 'Mixed';
    if (phaseDiff === 0 && state.f1 === state.f2) type = 'Constructive';
    else if (phaseDiff === 180 && state.f1 === state.f2) type = 'Destructive';
    else if (parseFloat(beat) === 0 && state.f1 === state.f2) type = 'Standing Wave';
    else if (parseFloat(beat) > 0 && parseFloat(beat) < 1) type = 'Beats';

    document.getElementById('val-beat').textContent = beat;
    document.getElementById('val-phase').textContent = phaseDiff + '°';
    document.getElementById('val-maxamp').textContent = maxAmp;
    document.getElementById('val-type').textContent = type;
}

// ── Animation loop ────────────────────────────────────────────
function loop() {
    if (animating) t += 0.005 * state.speed;
    draw();
    updateStats();
    requestAnimationFrame(loop);
}

// ── Controls ─────────────────────────────────────────────────
function bind(id, key, valId, suffix = '', scale = 1) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function() {
        state[key] = parseFloat(this.value) * scale;
        document.getElementById(valId).textContent = parseFloat(this.value).toFixed(key === 'p1' || key === 'p2' ? 0 : 2) + suffix;
        updateStats();
    });
}
bind('a1-slider', 'a1', 'a1-val');
bind('f1-slider', 'f1', 'f1-val');
bind('p1-slider', 'p1', 'p1-val', '°');
bind('a2-slider', 'a2', 'a2-val');
bind('f2-slider', 'f2', 'f2-val');
bind('p2-slider', 'p2', 'p2-val', '°');

document.getElementById('speed-slider').addEventListener('input', function() {
    state.speed = parseFloat(this.value);
    document.getElementById('speed-val').textContent = state.speed.toFixed(1) + 'x';
});

document.getElementById('show-w1').addEventListener('change', e => { state.showW1 = e.target.checked; });
document.getElementById('show-w2').addEventListener('change', e => { state.showW2 = e.target.checked; });
document.getElementById('show-result').addEventListener('change', e => { state.showResult = e.target.checked; });
document.getElementById('animate-toggle').addEventListener('change', e => { animating = e.target.checked; });

// ── Presets ───────────────────────────────────────────────────
const PRESETS = {
    constructive: { a1:1, f1:1, p1:0, a2:1, f2:1, p2:0 },
    destructive:  { a1:1, f1:1, p1:0, a2:1, f2:1, p2:180 },
    standing:     { a1:1, f1:2, p1:0, a2:1, f2:2, p2:180 },
    beats:        { a1:1, f1:2, p1:0, a2:1, f2:2.5, p2:0 }
};

function applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    Object.assign(state, p);
    // Sync sliders & labels
    ['a1','f1','p1','a2','f2','p2'].forEach(k => {
        const slider = document.getElementById(k.replace(/\d/, n => n + '-') + 'slider');
        const valEl  = document.getElementById(k.replace(/\d/, n => n + '-') + 'val');
        if (slider) slider.value = state[k];
        if (valEl) valEl.textContent = (k.includes('p') ? state[k] + '°' : state[k].toFixed(2));
    });
    updateStats();
}

document.querySelectorAll('.wave-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

// ── Init ─────────────────────────────────────────────────────
updateStats();
loop();
