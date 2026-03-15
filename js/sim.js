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
let simScale = 1, simOX = 0, simOY = 0;  // uniform scale + letterbox offsets for draw.js
let faultKey = 'ok';             // default to normal operation
let potV     = 0.5;              // 0..1, maps to pot position
let simTick  = 0;                // incremented each draw frame, used for fan animation
let noiseOff = 0;                // phase offset for the noisy PWM simulation

// ── Resize handler ────────────────────────────────────────────────────────────
function fitSimToLayout() {
  const bw = simBounds.maxX - simBounds.minX;
  const bh = simBounds.maxY - simBounds.minY;
  simScale = Math.min(simW / bw, simH / bh) * 0.92;
  simOX = simW / 2 - (simBounds.minX + simBounds.maxX) / 2 * simScale;
  simOY = simH / 2 - (simBounds.minY + simBounds.maxY) / 2 * simScale;
}

function resizeSim() {
  const sidebar = document.querySelector('.sim-sidebar');
  // Detect stacked (mobile) layout: sidebar below canvas rather than beside it
  const stacked = sidebar &&
    sidebar.getBoundingClientRect().top >= simCanvas.getBoundingClientRect().bottom - 5;
  const sidebarW = stacked ? 0 : (sidebar ? sidebar.offsetWidth : 240);
  simW = simCanvas.width  = simWrap.clientWidth - sidebarW;
  simH = simCanvas.height = stacked ? (simCanvas.offsetHeight || 400)
                                    : (simWrap.clientHeight   || 560);

  fitSimToLayout();

  const pwWrap = pwmCanvas.parentElement;
  pwmCanvas.width  = pwWrap.clientWidth  - 10;
  pwmCanvas.height = pwWrap.clientHeight - 20;
}
let _simResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_simResizeTimer);
  _simResizeTimer = setTimeout(resizeSim, 150);
});
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

// ── Viewport zoom / pan ───────────────────────────────────────────────────────
let vpZoom = 1, vpPanX = 0, vpPanY = 0;

function clampPan() {
  const margin = 100;
  const ox = simOX * vpZoom, oy = simOY * vpZoom;
  const sw = 840 * simScale * vpZoom, sh = 560 * simScale * vpZoom;
  vpPanX = Math.max(margin - ox - sw, Math.min(simW - margin - ox, vpPanX));
  vpPanY = Math.max(margin - oy - sh, Math.min(simH - margin - oy, vpPanY));
}

simCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const rect = simCanvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (simCanvas.width  / rect.width);
  const my = (e.clientY - rect.top)  * (simCanvas.height / rect.height);

  if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    // Horizontal thumb-wheel → pan X
    vpPanX -= e.deltaX;
    clampPan();
  } else {
    // Vertical scroll → zoom centred on cursor
    const factor  = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const newZoom = Math.min(5, Math.max(1, vpZoom * factor));
    const ratio   = newZoom / vpZoom;
    vpPanX = mx * (1 - ratio) + vpPanX * ratio;
    vpPanY = my * (1 - ratio) + vpPanY * ratio;
    vpZoom = newZoom;
    if (vpZoom <= 1.001) { vpZoom = 1; vpPanX = 0; vpPanY = 0; }
    else clampPan();
  }
}, { passive: false });

// Double-click resets to fit view
simCanvas.addEventListener('dblclick', () => { vpZoom = 1; vpPanX = 0; vpPanY = 0; });

// Click-drag panning
let _touchActive = false; // suppresses synthetic mouse events fired after touch
let _dragActive  = false, _dragStartX = 0, _dragStartY = 0, _panStartX = 0, _panStartY = 0;

simCanvas.addEventListener('mousedown', e => {
  if (_touchActive) return;
  _dragActive = true;
  _dragStartX = e.clientX;
  _dragStartY = e.clientY;
  _panStartX  = vpPanX;
  _panStartY  = vpPanY;
  simCanvas.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (_touchActive || !_dragActive) return;
  vpPanX = _panStartX + (e.clientX - _dragStartX);
  vpPanY = _panStartY + (e.clientY - _dragStartY);
  clampPan();
});

window.addEventListener('mouseup', () => {
  if (_touchActive || !_dragActive) return;
  _dragActive = false;
  simCanvas.style.cursor = 'grab';
});

simCanvas.style.cursor = 'grab';

// ── Component hover / tap ─────────────────────────────────────────────────────
let hoverSimComp = null;

function simCanvasToWorld(cx, cy) {
  return {
    x: ((cx - vpPanX) / vpZoom - simOX) / simScale,
    y: ((cy - vpPanY) / vpZoom - simOY) / simScale,
  };
}

function _hitTestComp(cx, cy) {
  const w = simCanvasToWorld(cx, cy);
  for (const [id, pos] of Object.entries(simPos)) {
    const bh = _BODY_HALF[id];
    if (!bh) continue;
    if (Math.abs(w.x - pos.x) <= bh[0] && Math.abs(w.y - pos.y) <= bh[1]) return id;
  }
  return null;
}

simCanvas.addEventListener('mousemove', e => {
  if (_touchActive || _dragActive) return;
  const rect = simCanvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (simCanvas.width  / rect.width);
  const cy = (e.clientY - rect.top)  * (simCanvas.height / rect.height);
  hoverSimComp = _hitTestComp(cx, cy);
});

simCanvas.addEventListener('mouseleave', () => { hoverSimComp = null; });

// ── Touch interactions ────────────────────────────────────────────────────────

// Pinch state
let _pinchActive    = false;
let _pinchStartDist = 0;
let _pinchStartZoom = 1;
let _pinchMidX = 0, _pinchMidY = 0;

// Tap / double-tap state
let _tapTime = 0, _tapX = 0, _tapY = 0;
let _touchMovedPx = 0, _touchStartCX = 0, _touchStartCY = 0;

function _touchCanvasXY(touch) {
  const rect = simCanvas.getBoundingClientRect();
  return {
    cx: (touch.clientX - rect.left) * (simCanvas.width  / rect.width),
    cy: (touch.clientY - rect.top)  * (simCanvas.height / rect.height),
  };
}

function _pinchDist(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

simCanvas.addEventListener('touchstart', e => {
  e.preventDefault();
  _touchActive = true;

  if (e.touches.length === 2) {
    _pinchActive    = true;
    _dragActive     = false;
    _pinchStartDist = _pinchDist(e.touches);
    _pinchStartZoom = vpZoom;
    const rect = simCanvas.getBoundingClientRect();
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    _pinchMidX = (mx - rect.left) * (simCanvas.width  / rect.width);
    _pinchMidY = (my - rect.top)  * (simCanvas.height / rect.height);
  } else if (e.touches.length === 1) {
    _pinchActive  = false;
    _dragActive   = true;
    const { cx, cy } = _touchCanvasXY(e.touches[0]);
    _dragStartX   = e.touches[0].clientX;
    _dragStartY   = e.touches[0].clientY;
    _panStartX    = vpPanX;
    _panStartY    = vpPanY;
    _touchStartCX = cx;
    _touchStartCY = cy;
    _touchMovedPx = 0;
  }
}, { passive: false });

simCanvas.addEventListener('touchmove', e => {
  e.preventDefault();

  if (_pinchActive && e.touches.length === 2) {
    const newDist = _pinchDist(e.touches);
    const ratio   = newDist / _pinchStartDist;
    const newZoom = Math.min(5, Math.max(1, _pinchStartZoom * ratio));
    const zRatio  = newZoom / vpZoom;
    vpPanX = _pinchMidX * (1 - zRatio) + vpPanX * zRatio;
    vpPanY = _pinchMidY * (1 - zRatio) + vpPanY * zRatio;
    vpZoom = newZoom;
    if (vpZoom <= 1.001) { vpZoom = 1; vpPanX = 0; vpPanY = 0; }
    else clampPan();

  } else if (_dragActive && e.touches.length === 1) {
    const dx = e.touches[0].clientX - _dragStartX;
    const dy = e.touches[0].clientY - _dragStartY;
    _touchMovedPx = Math.hypot(dx, dy);
    vpPanX = _panStartX + dx;
    vpPanY = _panStartY + dy;
    clampPan();
  }
}, { passive: false });

simCanvas.addEventListener('touchend', e => {
  e.preventDefault();
  _pinchActive = false;

  if (e.touches.length === 0) {
    _dragActive = false;
    // Delay clearing _touchActive to outlast synthetic mouse events (~300ms delay on mobile)
    setTimeout(() => { _touchActive = false; }, 400);

    if (_touchMovedPx < 8) {
      const now = Date.now();
      const cx = _touchStartCX, cy = _touchStartCY;

      if (now - _tapTime < 300 && Math.hypot(cx - _tapX, cy - _tapY) < 40) {
        // Double-tap: reset view
        vpZoom = 1; vpPanX = 0; vpPanY = 0;
        fitSimToLayout();
        hoverSimComp = null;
      } else {
        // Single tap: toggle component value label
        const hit = _hitTestComp(cx, cy);
        hoverSimComp = (hit && hit !== hoverSimComp) ? hit : null;
      }

      _tapTime = now;
      _tapX = cx;
      _tapY = cy;
    }

  } else if (e.touches.length === 1) {
    // Dropped from 2 fingers to 1 — resume pan
    _dragActive   = true;
    _dragStartX   = e.touches[0].clientX;
    _dragStartY   = e.touches[0].clientY;
    _panStartX    = vpPanX;
    _panStartY    = vpPanY;
    _touchMovedPx = 0;
  }
}, { passive: false });

simCanvas.addEventListener('touchcancel', () => {
  _touchActive = false;
  _dragActive  = false;
  _pinchActive = false;
}, { passive: false });

// ── Animation loop ────────────────────────────────────────────────────────────
let simVisible = true;

const _simObserver = new IntersectionObserver(
  entries => { simVisible = entries[0].isIntersecting; },
  { threshold: 0 }
);
_simObserver.observe(simCanvas);

function simLoop() {
  if (simVisible) drawSim();
  requestAnimationFrame(simLoop);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
fetch('./layout.json')
  .then(r => r.json())
  .then(data => {
    applySimLayout(data);
    vpZoom = 1; vpPanX = 0; vpPanY = 0;
    fitSimToLayout();
    if (typeof drawAllMinis === 'function') drawAllMinis();
  })
  .catch(() => {});
document.getElementById('faultSel').value = 'ok';
faultKey = 'ok';
updateSimSidebar();
drawPWM();
simLoop();
