// ─────────────────────────────────────────────────────────────────────────────
// sim.js — simulation state, controls, sidebar, animation loop
// Depends on: data.js (FAULTS), draw.js (drawSim, SX, SY)
// ─────────────────────────────────────────────────────────────────────────────

// ── Canvas references ─────────────────────────────────────────────────────────
const simCanvas = document.getElementById('simCanvas');
const sctx      = simCanvas.getContext('2d');
const simWrap   = simCanvas.parentElement;

const pwmCanvas = document.getElementById('pwmCanvas');
const pctx      = pwmCanvas.getContext('2d');

// ── Simulation state ──────────────────────────────────────────────────────────
let simW, simH;
let faultKey = 'ok';             // default to normal operation
let potV     = 0.5;              // 0..1, maps to pot position
let simTick  = 0;                // incremented each draw frame, used for fan animation
let noiseOff = 0;                // phase offset for the noisy PWM simulation

// ── Resize handler ────────────────────────────────────────────────────────────
function resizeSim() {
  const sidebar = document.querySelector('.sim-sidebar');
  const sidebarW = sidebar ? sidebar.offsetWidth : 240;
  simW = simCanvas.width  = simWrap.clientWidth - sidebarW;
  simH = simCanvas.height = simWrap.clientHeight || 560;
  const pwWrap = pwmCanvas.parentElement;
  pwmCanvas.width  = pwWrap.clientWidth  - 10;
  pwmCanvas.height = pwWrap.clientHeight - 20;
}
window.addEventListener('resize', resizeSim);
resizeSim();

// ── Fan speed calculation ─────────────────────────────────────────────────────
/**
 * Returns simulated fan speed 0..1 based on current fault and pot position.
 * Used by both drawSim (blade animation) and updateSimSidebar (RPM display).
 */
function getFaultSpd() {
  const f = FAULTS[faultKey];
  if (f.fanMode === 'off')       return 0;
  if (f.fanMode === 'full')      return 1;
  if (f.fanMode === 'pot')       return potV;
  if (f.fanMode === 'halfrange') return faultKey === 'd1_open' ? 0.5 + potV * 0.5 : potV * 0.5;
  if (f.fanMode === 'limited')   return potV * 0.2;
  if (f.fanMode === 'erratic')   return Math.max(0, Math.min(1, potV + Math.sin(simTick * 0.07) * 0.3));
  return potV;
}

// ── PWM waveform canvas ───────────────────────────────────────────────────────
/**
 * Draws the Pin 3 PWM waveform preview in the sidebar.
 * Re-drawn on fault change and pot change.
 */
function drawPWM() {
  const f  = FAULTS[faultKey];
  const pw = pwmCanvas.width;
  const ph = pwmCanvas.height;
  pctx.clearRect(0, 0, pw, ph);

  const cyc = 4;
  const cw  = pw / cyc;
  const hi  = ph * 0.1;
  const lo  = ph * 0.88;

  let duty = potV;
  let wc   = '#00ff41';
  let note = '';

  if (f.p3 === 'zero' || f.p3 === 'low') {
    duty = 0;   wc = '#ff4444'; note = 'STUCK LOW';
  } else if (f.p3 === 'high') {
    duty = 1;   wc = '#ff4444'; note = 'STUCK HIGH';
  } else if (f.p3 === 'noisy') {
    noiseOff += 0.15;
    duty = Math.max(0.05, Math.min(0.95, potV + Math.sin(noiseOff) * 0.25));
    wc = '#ff6b00'; note = 'NOISY';
  } else if (f.p3 === 'limited') {
    duty = potV * 0.2; wc = '#ffdd44'; note = 'LIMITED';
  } else if (f.p3 === 'half_high') {
    duty = 0.5 + potV * 0.5; wc = '#ffdd44';
  } else if (f.p3 === 'half_low') {
    duty = potV * 0.5; wc = '#ffdd44';
  }

  pctx.strokeStyle = wc;
  pctx.lineWidth   = 1.5;
  pctx.shadowColor = wc;
  pctx.shadowBlur  = 3;
  pctx.beginPath();
  let x = 0;
  pctx.moveTo(x, lo);
  for (let i = 0; i < cyc; i++) {
    pctx.lineTo(x, lo);
    pctx.lineTo(x, hi);
    pctx.lineTo(x + cw * duty, hi);
    pctx.lineTo(x + cw * duty, lo);
    x += cw;
    pctx.lineTo(x, lo);
  }
  pctx.stroke();
  pctx.shadowBlur = 0;

  pctx.fillStyle = wc + 'bb';
  pctx.font = '7px Share Tech Mono';
  pctx.textAlign = 'right';
  pctx.fillText(`${Math.round(duty * 100)}%`, pw - 2, ph - 1);
  if (note) {
    pctx.textAlign = 'left';
    pctx.fillText(note, 2, ph - 1);
  }
}

// ── Sidebar helpers ───────────────────────────────────────────────────────────
function setBar(id, pct, c) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.width      = pct + '%';
  el.style.background = c;
  el.style.boxShadow  = `0 0 4px ${c}`;
}
function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

// ── Sidebar update ────────────────────────────────────────────────────────────
/**
 * Refreshes all voltage bars, node readings, fan RPM cells, and fault banner.
 * Call after any fault or pot change.
 */
function updateSimSidebar() {
  const f = FAULTS[faultKey];

  // Power rail bars
  setText('sv12', f.vin + 'V');
  setBar('sf12', (f.vin / 12) * 100, f.vin ? '#ff6b00' : '#333');
  setText('sv5', f.v5 + 'V');
  setBar('sf5', (f.v5 / 5) * 100, f.v5 ? '#44aaff' : '#333');
  setText('sv8', f.v8 + 'V');
  setBar('sf8', (f.v8 / 5) * 100, f.v8 ? '#44aaff' : '#333');
  setText('sv5cv', f.v5cv + 'V');
  setBar('sf5cv', (f.v5cv / 5) * 100, '#00ff41');

  // NE555 node readings
  const m = f.p3;
  if (m === 'pwm' || m === 'half_high' || m === 'half_low') {
    let d = m === 'half_high' ? 0.5 + potV * 0.5 : m === 'half_low' ? potV * 0.5 : potV;
    const v = (1.67 + potV * 1.66).toFixed(2);
    setText('sv26', `~${v}V osc`);
    setBar('sf26', (parseFloat(v) / 5) * 100, '#00ff41');
    setText('sv3', `~${(d * 4.9).toFixed(2)}V avg`);
    setBar('sf3', d * 100, '#00ff41');
  } else if (m === 'high') {
    setText('sv26', '4.82V STUCK↑'); setBar('sf26', 96, '#ff4444');
    setText('sv3',  '4.86V STUCK↑'); setBar('sf3',  97, '#ff4444');
  } else if (m === 'low' || m === 'zero') {
    setText('sv26', '0V STUCK↓'); setBar('sf26', 1, '#ff4444');
    setText('sv3',  '0V STUCK↓'); setBar('sf3',  1, '#ff4444');
  } else if (m === 'noisy') {
    setText('sv26', '~2.5V NOISY'); setBar('sf26', 50, '#ff6b00');
    setText('sv3',  '~2.5V NOISY'); setBar('sf3',  50, '#ff6b00');
  } else if (m === 'limited') {
    setText('sv26', '~1.8V'); setBar('sf26', 36, '#ffdd44');
    setText('sv3',  '~0.5V'); setBar('sf3',  10, '#ffdd44');
  } else {
    setText('sv26', f.v5 > 0 ? '~2.5V float' : '0V');
    setBar('sf26', f.v5 > 0 ? 50 : 1, '#00ff41');
    setText('sv3', '—');
    setBar('sf3', 1, '#00ff41');
  }

  // Fan RPM cells
  const spd = getFaultSpd();
  const fg = document.getElementById('fanGrid');
  fg.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const rpm = Math.round(spd * 1800 + 200);
    const dur = (1 / (Math.max(0.05, spd * 0.6) * 0.9 + 0.1)).toFixed(2);
    const d = document.createElement('div');
    d.className = 'fan-cell';
    d.innerHTML = `<span class="fan-icon" style="animation:spin ${dur}s linear infinite">⊕</span>`
      + `<span class="fan-rpm" style="${spd < 0.05 ? 'color:#1a4a1a' : ''}">`
      + (spd < 0.05 ? 'STOP' : rpm)
      + `</span>F${i + 1}`;
    fg.appendChild(d);
  }

  // Fault/diagnosis banner
  const fb = document.getElementById('faultBanner');
  const sevMap = { ok: 'fb-ok', warn: 'fb-warn', err: 'fb-err', dead: 'fb-dead' };
  fb.className = 'fault-banner ' + sevMap[f.sev];
  fb.innerHTML = f.desc;

  // Disable pot slider when fault makes it irrelevant
  document.getElementById('potRange').disabled =
    f.fanMode !== 'pot' && f.fanMode !== 'halfrange' && f.fanMode !== 'erratic';
}

// ── Public control functions (called from index.html inline handlers) ─────────
function setFault(key) {
  faultKey = key;
  updateSimSidebar();
  drawPWM();
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('potRange').addEventListener('input', function () {
  potV = this.value / 100;
  document.getElementById('potVal').textContent = this.value + '%';
  updateSimSidebar();
  drawPWM();
});

// ── Animation loop ────────────────────────────────────────────────────────────
function simLoop() {
  drawSim();
  requestAnimationFrame(simLoop);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
updateSimSidebar();
drawPWM();
simLoop();
