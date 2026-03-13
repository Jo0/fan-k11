// ─────────────────────────────────────────────────────────────────────────────
// mini.js — isolated mini circuit diagrams for each network card
// Each function draws a focused sub-circuit onto its named canvas element.
// Uses a shared set of lightweight canvas helpers (no dependency on sim.js).
// ─────────────────────────────────────────────────────────────────────────────

// ── Mini canvas helpers ───────────────────────────────────────────────────────
// All helpers take a CanvasRenderingContext2D as first argument (mx)

function mWire(mx, x1, y1, x2, y2, color, glow = true) {
  mx.save();
  mx.strokeStyle = color;
  mx.lineWidth = 1.5;
  if (glow) { mx.shadowColor = color; mx.shadowBlur = 5; }
  mx.beginPath();
  mx.moveTo(x1, y1);
  mx.lineTo(x2, y2);
  mx.stroke();
  mx.restore();
}

function mDot(mx, x, y, color) {
  mx.save();
  mx.fillStyle = color;
  mx.shadowColor = color;
  mx.shadowBlur = 6;
  mx.beginPath();
  mx.arc(x, y, 3, 0, Math.PI * 2);
  mx.fill();
  mx.restore();
}

function mLabel(mx, x, y, text, color, size = 9, align = 'center') {
  mx.save();
  mx.fillStyle = color;
  mx.font = `${size}px Share Tech Mono, monospace`;
  mx.textAlign = align;
  mx.textBaseline = 'middle';
  mx.fillText(text, x, y);
  mx.restore();
}

function mBox(mx, x, y, w, h, label, sub, color) {
  mx.save();
  mx.strokeStyle = color;
  mx.fillStyle = '#030803';
  mx.lineWidth = 1.5;
  mx.shadowColor = color;
  mx.shadowBlur = 6;
  mx.beginPath();
  mx.roundRect(x - w / 2, y - h / 2, w, h, 3);
  mx.fill();
  mx.stroke();
  mx.shadowBlur = 0;
  mx.fillStyle = color;
  mx.font = `bold ${sub ? 8 : 9}px Share Tech Mono, monospace`;
  mx.textAlign = 'center';
  mx.textBaseline = 'middle';
  mx.fillText(label, x, sub ? y - 4 : y);
  if (sub) {
    mx.fillStyle = '#2a5a2a';
    mx.font = '7px Share Tech Mono, monospace';
    mx.fillText(sub, x, y + 5);
  }
  mx.restore();
}

function mSMD(mx, x, y, label, color) {
  mx.save();
  mx.strokeStyle = color;
  mx.fillStyle = '#030803';
  mx.lineWidth = 1.2;
  mx.shadowColor = color;
  mx.shadowBlur = 4;
  mx.beginPath();
  mx.roundRect(x - 14, y - 6, 28, 12, 2);
  mx.fill();
  mx.stroke();
  mx.fillStyle = color + '44';
  mx.beginPath(); mx.roundRect(x - 14, y - 6, 5, 12, 1); mx.fill();
  mx.beginPath(); mx.roundRect(x + 9,  y - 6, 5, 12, 1); mx.fill();
  mx.shadowBlur = 0;
  mx.fillStyle = color;
  mx.font = 'bold 7px Share Tech Mono, monospace';
  mx.textAlign = 'center';
  mx.textBaseline = 'middle';
  mx.fillText(label, x, y);
  mx.restore();
}

function mDiode(mx, x, y, color) {
  mx.save();
  mx.strokeStyle = color;
  mx.fillStyle = color + '33';
  mx.lineWidth = 1.2;
  mx.shadowColor = color;
  mx.shadowBlur = 4;
  mx.beginPath();
  mx.moveTo(x - 8, y); mx.lineTo(x + 5, y - 7); mx.lineTo(x + 5, y + 7);
  mx.closePath(); mx.fill(); mx.stroke();
  mx.beginPath(); mx.moveTo(x + 5, y - 7); mx.lineTo(x + 5, y + 7); mx.stroke();
  mx.beginPath();
  mx.moveTo(x - 8, y); mx.lineTo(x - 13, y);
  mx.moveTo(x + 5, y); mx.lineTo(x + 10, y);
  mx.stroke();
  mx.restore();
}

function mGND(mx, x, y, color = '#1a5a1a') {
  mx.save();
  mx.strokeStyle = color;
  mx.lineWidth = 1.2;
  [[12, 0], [8, 5], [4, 10]].forEach(([hw, dy]) => {
    mx.beginPath();
    mx.moveTo(x - hw, y + dy);
    mx.lineTo(x + hw, y + dy);
    mx.stroke();
  });
  mx.restore();
}

function mPot(mx, x, y, color) {
  mx.save();
  mx.strokeStyle = color; mx.fillStyle = '#030803'; mx.lineWidth = 1.2;
  mx.shadowColor = color; mx.shadowBlur = 5;
  mx.beginPath(); mx.arc(x, y, 18, 0, Math.PI * 2); mx.fill(); mx.stroke();
  mx.beginPath(); mx.roundRect(x - 10, y - 10, 20, 20, 2); mx.fill(); mx.stroke();
  mx.lineWidth = 2;
  const ang = (135 + 0.5 * 270) * Math.PI / 180;
  mx.beginPath(); mx.moveTo(x, y);
  mx.lineTo(x + Math.cos(ang) * 11, y + Math.sin(ang) * 11); mx.stroke();
  mx.restore();
}

function mFan(mx, x, y, color) {
  mx.save();
  mx.strokeStyle = color; mx.fillStyle = '#020802'; mx.lineWidth = 1.2;
  mx.shadowColor = color; mx.shadowBlur = 4;
  mx.beginPath(); mx.roundRect(x - 14, y - 18, 28, 38, 2); mx.fill(); mx.stroke();
  mx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    mx.save(); mx.translate(x, y - 4);
    mx.rotate(i * Math.PI * 2 / 3);
    mx.beginPath(); mx.ellipse(0, -6, 3, 7, 0, 0, Math.PI * 2); mx.fill();
    mx.restore();
  }
  mx.fillStyle = color + '55';
  for (let i = 0; i < 4; i++) {
    mx.beginPath(); mx.rect(x - 10 + i * 5, y + 14, 4, 4); mx.fill();
  }
  mx.restore();
}

// ── Canvas background ─────────────────────────────────────────────────────────
function mBackground(mx, w, h) {
  mx.fillStyle = '#06100a';
  mx.fillRect(0, 0, w, h);
  mx.strokeStyle = '#1a3a1a';
  mx.lineWidth = 1;
  mx.strokeRect(1, 1, w - 2, h - 2);
  // Subtle grid
  mx.strokeStyle = '#0d1f0d';
  mx.lineWidth = 0.5;
  for (let x = 20; x < w; x += 20) {
    mx.beginPath(); mx.moveTo(x, 0); mx.lineTo(x, h); mx.stroke();
  }
  for (let y = 20; y < h; y += 20) {
    mx.beginPath(); mx.moveTo(0, y); mx.lineTo(w, y); mx.stroke();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI-POWER: SATA/Barrel → Fuse → 12V rail + C1 bypass
// ─────────────────────────────────────────────────────────────────────────────
function drawMiniPower() {
  const el = document.getElementById('mini-power');
  if (!el) return;
  const w = el.width = el.offsetWidth;
  const h = el.height = 140;
  const mx = el.getContext('2d');
  mBackground(mx, w, h);

  const O  = '#ff6b00';
  const DM = '#1a5a1a';
  const BL = '#44aaff';

  // GND rail
  mWire(mx, 20, 125, w - 20, 125, DM, false);
  mLabel(mx, w / 2, 133, 'GND', DM, 7);

  // SATA input left
  mBox(mx, 55, 35, 70, 22, 'SATA', '12V IN', O);
  mWire(mx, 55, 46, 55, 70, O);       // SATA → junction
  mWire(mx, 55, 70, 130, 70, O);      // junction → Fuse

  // Barrel input
  mx.save(); mx.strokeStyle = O; mx.fillStyle = '#030803'; mx.lineWidth = 1.5;
  mx.shadowColor = O; mx.shadowBlur = 5;
  mx.beginPath(); mx.arc(55, 95, 10, 0, Math.PI * 2); mx.fill(); mx.stroke();
  mx.beginPath(); mx.arc(55, 95, 4, 0, Math.PI * 2); mx.stroke();
  mx.restore();
  mLabel(mx, 55, 110, 'BARREL', O, 7);
  mWire(mx, 55, 85, 55, 70, O);
  mDot(mx, 55, 70, O);                // junction dot

  // Fuse
  mBox(mx, 160, 70, 36, 18, 'F1', '5A', O);
  // Post-fuse rail
  mWire(mx, 178, 70, w - 20, 70, O);
  mLabel(mx, w - 50, 60, '12V RAIL', O, 7);

  // C1 bypass: 12V rail tap → C1 → GND
  const c1x = w - 70;
  mDot(mx, c1x, 70, BL);
  mWire(mx, c1x, 70, c1x, 95, BL);
  mSMD(mx, c1x, 96, 'C1', BL);
  mWire(mx, c1x, 107, c1x, 125, DM);
  mLabel(mx, c1x, 135, '0.22µF', BL, 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI-REG: 78L05 regulation + C2 decoupling
// ─────────────────────────────────────────────────────────────────────────────
function drawMiniReg() {
  const el = document.getElementById('mini-reg');
  if (!el) return;
  const w = el.width = el.offsetWidth;
  const h = el.height = 140;
  const mx = el.getContext('2d');
  mBackground(mx, w, h);

  const O  = '#ff6b00';
  const BL = '#44aaff';
  const DM = '#1a5a1a';

  // GND rail
  mWire(mx, 20, 125, w - 20, 125, DM, false);
  mLabel(mx, w / 2, 133, 'GND', DM, 7);

  // 12V in
  mWire(mx, 20, 35, 80, 35, O);
  mLabel(mx, 35, 26, '12V IN', O, 7);

  // C1 tap on 12V in
  const c1x = 60;
  mDot(mx, c1x, 35, O);
  mWire(mx, c1x, 35, c1x, 57, O);
  mSMD(mx, c1x, 58, 'C1', '#44aaff');
  mWire(mx, c1x, 69, c1x, 125, DM);
  mLabel(mx, c1x, 80, 'Vin', '#44aaff', 7);
  mLabel(mx, c1x, 90, 'byp', '#44aaff', 7);

  // 78L05
  mBox(mx, w / 2, 65, 60, 36, '78L05', '5V REG', BL);

  // 12V → REG Vin
  mWire(mx, 80, 35, w / 2 - 30, 35, O);
  mWire(mx, w / 2 - 30, 35, w / 2 - 30, 47, O);

  // REG GND
  mWire(mx, w / 2, 83, w / 2, 125, DM);

  // REG Vout → 5V rail
  mWire(mx, w / 2 + 30, 65, w - 20, 65, BL);
  mLabel(mx, w - 35, 55, '5V OUT', BL, 7);

  // C2 on 5V out
  const c2x = w - 50;
  mDot(mx, c2x, 65, BL);
  mWire(mx, c2x, 65, c2x, 87, BL);
  mSMD(mx, c2x, 88, 'C2', BL);
  mWire(mx, c2x, 99, c2x, 125, DM);
  mLabel(mx, c2x, 110, '0.33µF', BL, 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI-LED: 5V → R3 → LED → GND
// ─────────────────────────────────────────────────────────────────────────────
function drawMiniLED() {
  const el = document.getElementById('mini-led');
  if (!el) return;
  const w = el.width = el.offsetWidth;
  const h = el.height = 140;
  const mx = el.getContext('2d');
  mBackground(mx, w, h);

  const G  = '#00ff41';
  const BL = '#44aaff';
  const DM = '#1a5a1a';
  const cx = w / 2;

  // Vertical series chain: 5V top → R3 → LED → GND
  mLabel(mx, cx, 15, '5V', BL, 9);
  mWire(mx, cx, 22, cx, 35, BL);

  mSMD(mx, cx, 42, 'R3', G);
  mLabel(mx, cx + 30, 42, '4.7kΩ', G, 7, 'left');

  mWire(mx, cx, 54, cx, 68, G);

  // LED circle
  mx.save();
  mx.strokeStyle = G; mx.fillStyle = 'rgba(0,255,65,0.1)'; mx.lineWidth = 1.5;
  mx.shadowColor = G; mx.shadowBlur = 10;
  mx.beginPath(); mx.arc(cx, 78, 10, 0, Math.PI * 2); mx.fill(); mx.stroke();
  mx.fillStyle = G; mx.beginPath(); mx.arc(cx, 78, 4, 0, Math.PI * 2); mx.fill();
  mx.restore();
  mLabel(mx, cx + 22, 78, 'LED1', G, 7, 'left');

  mWire(mx, cx, 88, cx, 108, G);
  mGND(mx, cx, 108, DM);
  mLabel(mx, cx, 128, 'GND', DM, 7);

  // Voltage annotations
  mLabel(mx, cx - 28, 35, '~4.97V', BL, 7, 'right');
  mLabel(mx, cx - 28, 65, '~0.6mA', G, 7, 'right');
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI-PWM: NE555 astable + timing network (R1, R2, D1, D2, Pot, C3, C4)
// ─────────────────────────────────────────────────────────────────────────────
function drawMiniPWM() {
  const el = document.getElementById('mini-pwm');
  if (!el) return;
  const w = el.width = el.offsetWidth;
  const h = el.height = 140;
  const mx = el.getContext('2d');
  mBackground(mx, w, h);

  const G  = '#00ff41';
  const BL = '#44aaff';
  const YL = '#ffdd44';
  const O  = '#ff6b00';
  const DM = '#1a5a1a';

  // NE555 IC body
  const icx = w / 2 - 10;
  mBox(mx, icx, 70, 52, 68, 'NE555', 'U1', G);

  // 5V → Vcc (P8) + RST (P4)
  mWire(mx, 20, 15, icx, 15, BL);
  mWire(mx, icx, 15, icx, 36, BL);
  mLabel(mx, 35, 8, '5V', BL, 7);

  // GND (P1)
  mWire(mx, icx, 104, icx, 125, DM);
  mGND(mx, icx, 125, DM);

  // R1: 5V → P7
  const r1x = icx - 50;
  mWire(mx, 20, 15, r1x, 15, BL);
  mWire(mx, r1x, 15, r1x, 38, BL);
  mSMD(mx, r1x, 44, 'R1', BL);
  mLabel(mx, r1x - 18, 44, '1kΩ', BL, 7, 'right');
  mWire(mx, r1x, 55, r1x, 65, BL);
  // P7 node dot
  mDot(mx, r1x, 65, BL);
  mWire(mx, r1x, 65, icx - 26, 65, BL);
  mLabel(mx, r1x - 8, 72, 'P7', BL, 7);

  // R2 from P7
  mWire(mx, r1x, 65, r1x, 78, YL);
  mSMD(mx, r1x, 84, 'R2', YL);
  mLabel(mx, r1x - 18, 84, '1kΩ', YL, 7, 'right');
  mWire(mx, r1x, 95, r1x, 105, YL);

  // D2: R2 → Pot right
  mDiode(mx, r1x, 108, YL);
  mLabel(mx, r1x, 120, 'D2', YL, 7);

  // Pot
  const potx = w - 45;
  mPot(mx, potx, 80, G);
  mLabel(mx, potx, 107, 'RV1', G, 7);
  mWire(mx, r1x + 12, 108, potx, 108, YL);
  mWire(mx, potx, 62, potx, 108, YL);  // Pot right leg wire up

  // D1: Pot left+wiper → P7
  mWire(mx, potx - 18, 80, potx - 35, 80, YL);
  mDiode(mx, potx - 45, 80, YL);
  mLabel(mx, potx - 45, 93, 'D1', YL, 7);
  mWire(mx, potx - 57, 80, r1x, 80, YL);
  mDot(mx, r1x, 80, YL);

  // Wiper → P2/6
  mWire(mx, potx - 18, 80, potx - 18, 95, G);
  mWire(mx, potx - 18, 95, icx + 26, 95, G);
  mLabel(mx, icx + 36, 90, 'P2/6', G, 7, 'left');

  // C3: P2/6 → GND
  const c3x = icx + 50;
  mDot(mx, c3x, 95, O);
  mWire(mx, c3x, 95, c3x, 95, O);
  mWire(mx, icx + 26, 95, c3x, 95, O);
  mWire(mx, c3x, 95, c3x, 108, O);
  mSMD(mx, c3x, 114, 'C3', O);
  mWire(mx, c3x, 120, c3x, 125, DM);
  mLabel(mx, c3x + 18, 114, '33nF', O, 7, 'left');

  // P3 PWM out
  mWire(mx, icx + 26, 70, w - 10, 70, G);
  mLabel(mx, w - 8, 62, 'PWM', G, 7, 'right');
  mLabel(mx, w - 8, 72, 'OUT', G, 7, 'right');
}

// ─────────────────────────────────────────────────────────────────────────────
// MINI-FAN: 6× 4-pin fan headers wired in parallel
// ─────────────────────────────────────────────────────────────────────────────
function drawMiniFan() {
  const el = document.getElementById('mini-fan');
  if (!el) return;
  const w = el.width = el.offsetWidth;
  const h = el.height = 140;
  const mx = el.getContext('2d');
  mBackground(mx, w, h);

  const O  = '#ff6b00';
  const G  = '#00ff41';
  const DM = '#1a5a1a';

  // Rails at top
  mWire(mx, 20, 18, w - 20, 18, O, false);
  mLabel(mx, w / 2, 10, '12V RAIL (PIN 1)', O, 7);
  mWire(mx, 20, 33, w - 20, 33, G, false);
  mLabel(mx, w / 2, 40, 'PWM RAIL (PIN 4)', G, 7);

  // GND rail at bottom
  mWire(mx, 20, 125, w - 20, 125, DM, false);
  mLabel(mx, w / 2, 134, 'GND (PIN 2)', DM, 7);

  // 3 fans shown (representative — labeled as ×6)
  const fanXs = [
    Math.round(w * 0.18),
    Math.round(w * 0.50),
    Math.round(w * 0.82),
  ];
  const labels = ['FAN 1', 'FAN 2–5', 'FAN 6'];

  fanXs.forEach((fx, i) => {
    // 12V drop
    mWire(mx, fx, 18, fx, 54, O, false);
    // PWM drop
    mWire(mx, fx, 33, fx, 54, G, false);
    // Fan body
    mFan(mx, fx, 80, G);
    mLabel(mx, fx, 115, labels[i], i === 1 ? DM : G, 7);
    // GND
    mWire(mx, fx, 107, fx, 125, DM, false);
  });

  // Dots on rails
  fanXs.forEach(fx => {
    mDot(mx, fx, 18, O);
    mDot(mx, fx, 33, G);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Boot — draw all mini diagrams after DOM is ready
// ─────────────────────────────────────────────────────────────────────────────
function drawAllMinis() {
  drawMiniPower();
  drawMiniReg();
  drawMiniLED();
  drawMiniPWM();
  drawMiniFan();
}

// Redraw on resize so canvases don't go blurry/stretched
window.addEventListener('resize', drawAllMinis);

drawAllMinis();
