// ─────────────────────────────────────────────────────────────────────────────
// draw.js — simulation canvas drawing primitives
// All functions use sctx (set by sim.js) and SX/SY coordinate helpers
// ─────────────────────────────────────────────────────────────────────────────

// ── Coordinate helpers ────────────────────────────────────────────────────────
// Virtual world is 840×560 (3:2 ratio).
// simScale, simOX, simOY are written by resizeSim() in sim.js.
function SX(v) { return vpPanX + (simOX + v * simScale) * vpZoom; }
function SY(v) { return vpPanY + (simOY + v * simScale) * vpZoom; }
function SS(v) { return v * simScale * vpZoom; }

// ── Layout state (populated from layout.json via applySimLayout) ───────────────
let simPos    = {};  // { compId: {x, y, rot, terminals:[{id,x,y,net}]} }
let simWires  = [];  // [{ points:[[x,y],...], color:'#rrggbb' }]
let simBounds = { minX: 30, minY: 30, maxX: 810, maxY: 530 };  // board outline

// Half-dimensions used to compute rect-type component centres from top-left x,y
const _RECT_HALF = {
  NE555: { hw: 30, hh: 40 },
  REG:   { hw: 25, hh: 17 },
  POT:   { hw: 18, hh: 18 },
  F1:    { hw: 13, hh:  7 },
  SATA:  { hw: 38, hh: 13 },
};

// Drawn body half-extents for each component (used to size the board outline)
// [hw, hh] in world units from component centre, accounting for labels/leads
const _BODY_HALF = {
  NE555:  [30, 40], REG:    [25, 17], POT:    [32, 32],
  F1:     [13,  7], SATA:   [38, 13], BARREL: [18, 18],
  LED1:   [12, 20], // label above
  R1:     [10, 10], R2:     [10, 10], R3:     [10, 10],
  C1:     [10, 10], C2:     [10, 10], C3:     [10, 10], C4:     [10, 10],
  D1:     [12,  8], D2:     [12,  8],
  FAN1:   [13, 24], FAN2:   [13, 24], FAN3:   [13, 24],
  FAN4:   [13, 24], FAN5:   [13, 24], FAN6:   [13, 24],
};

// Canonical terminal → net mapping (circuit topology, not layout-dependent)
const _TERM_NETS = {
  NE555:  { P1:'GND', P2:'TIM', P3:'PWM', P4:'5V', P8:'5V', P7:'P7', P6:'TIM', P5:'CV' },
  REG:    { Vout:'5V', Vin:'12V' },
  R1:     { L:'5V',  R:'P7'  },
  R2:     { L:'P7',  R:'DK'  },
  R3:     { L:'5V',  R:'RLED'},
  C1:     { L:'12V', R:'GND' },
  C2:     { L:'5V',  R:'GND' },
  C3:     { L:'TIM', R:'GND' },
  C4:     { L:'CV',  R:'GND' },
  D1:     { A:'P7',  K:'TIM' },
  D2:     { A:'DA',  K:'DK'  },
  POT:    { LW:'TIM',R:'DA'  },
  LED1:   { A:'RLED',K:'GND' },
  F1:     { IN:'12V',OUT:'12V'},
  SATA:   { '12V':'12V', GND:'GND' },
  BARREL: { '12V':'12V', GND:'GND' },
  FAN1:   { '12V':'12V', PWM:'PWM', GND:'GND' },
  FAN2:   { '12V':'12V', PWM:'PWM', GND:'GND' },
  FAN3:   { '12V':'12V', PWM:'PWM', GND:'GND' },
  FAN4:   { '12V':'12V', PWM:'PWM', GND:'GND' },
  FAN5:   { '12V':'12V', PWM:'PWM', GND:'GND' },
  FAN6:   { '12V':'12V', PWM:'PWM', GND:'GND' },
};

/**
 * Parse layout.json data into simPos and simWires.
 * Called once from sim.js after fetch('./layout.json').
 */
function applySimLayout(data) {
  simWires = data.wires || [];
  simPos   = {};
  for (const c of (data.components || [])) {
    let cx, cy;
    const hd = _RECT_HALF[c.id];
    if (c.cx !== undefined)           { cx = c.cx;        cy = c.cy; }
    else if (hd && c.x !== undefined) { cx = c.x + hd.hw; cy = c.y + hd.hh; }
    else if (c.terminals?.length) {
      const xs = c.terminals.map(t => t.x), ys = c.terminals.map(t => t.y);
      cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    }
    if (cx === undefined) continue;
    const netMap = _TERM_NETS[c.id] || {};
    simPos[c.id] = {
      x: cx, y: cy, rot: c.rot || 0,
      terminals: (c.terminals || []).map(t => ({ ...t, net: netMap[t.id] || 'misc' })),
    };
  }

  // Compute board outline from component body extents and wire points
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ex = (x, y) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  for (const [id, pos] of Object.entries(simPos)) {
    const bh = _BODY_HALF[id];
    if (bh) { ex(pos.x - bh[0], pos.y - bh[1]); ex(pos.x + bh[0], pos.y + bh[1]); }
    else pos.terminals.forEach(t => ex(t.x, t.y));
  }
  for (const w of simWires)
    w.points.forEach(p => ex(p[0], p[1]));
  if (isFinite(minX)) {
    const pad = 40;
    simBounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }
}

// ── Rotation wrapper ───────────────────────────────────────────────────────────
/** Apply a canvas rotation around world-point (cx,cy), run fn(), then restore. */
function withRot(cx, cy, rot, fn) {
  if (!rot) { fn(); return; }
  sctx.save();
  const px = SX(cx), py = SY(cy);
  sctx.translate(px, py);
  sctx.rotate(rot * Math.PI / 180);
  sctx.translate(-px, -py);
  fn();
  sctx.restore();
}

// ── Power / GND schematic symbols ─────────────────────────────────────────────
/** Draw a KiCad-style +12V / +5V flag or GND 3-bar symbol at terminal (tx,ty). */
function sPowerSym(tx, ty, net, c) {
  sctx.save();
  sctx.strokeStyle = c; sctx.fillStyle = c;
  sctx.lineWidth   = Math.max(1, SS(1.2));
  sctx.shadowColor = c; sctx.shadowBlur = c === '#252525' ? 0 : 4;
  if (net === 'GND') {
    sctx.beginPath();
    sctx.moveTo(SX(tx), SY(ty)); sctx.lineTo(SX(tx), SY(ty + 5));
    sctx.stroke();
    [[6, 0], [4, 2.5], [2.5, 5]].forEach(([hw, dy]) => {
      sctx.beginPath();
      sctx.moveTo(SX(tx - hw), SY(ty + 5 + dy));
      sctx.lineTo(SX(tx + hw), SY(ty + 5 + dy));
      sctx.stroke();
    });
  } else {
    sctx.beginPath();
    sctx.moveTo(SX(tx), SY(ty)); sctx.lineTo(SX(tx), SY(ty - 7));
    sctx.stroke();
    sctx.shadowBlur = 0;
    sctx.font = `bold ${Math.max(5, SS(6.5))}px Share Tech Mono`;
    sctx.textAlign = 'center'; sctx.textBaseline = 'bottom';
    sctx.fillText(net === '12V' ? '+12V' : '+5V', SX(tx), SY(ty - 7));
  }
  sctx.restore();
}

// ── Primitive helpers ─────────────────────────────────────────────────────────

/** Draw a straight wire segment with optional glow */
function sw(x1, y1, x2, y2, c, g = true) {
  sctx.save();
  if (g) { sctx.shadowColor = c; sctx.shadowBlur = 4; }
  sctx.strokeStyle = c;
  sctx.lineWidth = Math.max(1, SS(1.2));
  sctx.beginPath();
  sctx.moveTo(SX(x1), SY(y1));
  sctx.lineTo(SX(x2), SY(y2));
  sctx.stroke();
  sctx.restore();
}

/** Draw a junction dot */
function sdot(x, y, c) {
  sctx.save();
  sctx.fillStyle = c;
  sctx.shadowColor = c;
  sctx.shadowBlur = 6;
  sctx.beginPath();
  sctx.arc(SX(x), SY(y), Math.max(2, SS(3)), 0, Math.PI * 2);
  sctx.fill();
  sctx.restore();
}

/** Draw a text label */
function slbl(x, y, t, c, s = 8, a = 'center') {
  sctx.save();
  sctx.fillStyle = c;
  sctx.font = `${Math.max(6, SS(s))}px Share Tech Mono, monospace`;
  sctx.textAlign = a;
  sctx.textBaseline = 'middle';
  sctx.fillText(t, SX(x), SY(y));
  sctx.restore();
}

/** Draw a highlighted pill label on hover */
function sHoverLbl(x, y, text, align = 'center') {
  sctx.save();
  const fs = Math.max(8, SS(8.5));
  sctx.font = `bold ${fs}px Share Tech Mono, monospace`;
  const tw  = sctx.measureText(text).width;
  const pad = Math.max(3, SS(4));
  const bh  = fs + pad * 2;
  const px  = SX(x), py = SY(y);
  const rx  = align === 'left'  ? px :
              align === 'right' ? px - tw - pad * 2 :
                                  px - tw / 2 - pad;
  sctx.fillStyle   = 'rgba(0,8,0,0.92)';
  sctx.strokeStyle = '#00ff41';
  sctx.lineWidth   = Math.max(1, SS(0.9));
  sctx.shadowColor = '#00ff41'; sctx.shadowBlur = 10;
  sctx.beginPath();
  sctx.roundRect(rx, py - bh / 2, tw + pad * 2, bh, bh / 3);
  sctx.fill(); sctx.stroke();
  sctx.shadowBlur  = 0;
  sctx.fillStyle   = '#ffffff';
  sctx.textAlign   = 'left'; sctx.textBaseline = 'middle';
  sctx.fillText(text, rx + pad, py);
  sctx.restore();
}

/** Draw a GND symbol (3 horizontal bars, decreasing width) */
function sgnd(x, y, c = '#1a5a1a') {
  sctx.save();
  sctx.strokeStyle = c;
  sctx.lineWidth = 1.2;
  sctx.shadowColor = c;
  sctx.shadowBlur = 2;
  [[10, 0], [7, 4], [4, 8]].forEach(([hw, dy]) => {
    sctx.beginPath();
    sctx.moveTo(SX(x - hw / 8), SY(y + dy / 6));
    sctx.lineTo(SX(x + hw / 8), SY(y + dy / 6));
    sctx.stroke();
  });
  sctx.restore();
}

/** Draw a rectangular component box (IC, regulator, fuse) */
function sbox(x, y, w, h, t, s2, c, fault = false) {
  const fc = fault ? '#ff4444' : c;
  sctx.save();
  sctx.shadowColor = fc;
  sctx.shadowBlur = fault ? 14 : 6;
  sctx.strokeStyle = fc;
  sctx.lineWidth = Math.max(1, SS(fault ? 2.5 : 1.8));
  sctx.fillStyle = fault ? 'rgba(255,0,0,0.08)' : '#030803';
  sctx.beginPath();
  sctx.roundRect(SX(x - w / 2), SY(y - h / 2), SS(w), SS(h), SS(3));
  sctx.fill();
  sctx.stroke();
  sctx.shadowBlur = 0;
  sctx.fillStyle = fc;
  sctx.font = `bold ${Math.max(6, SS(8))}px Share Tech Mono`;
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText(t, SX(x), SY(s2 ? y - 3 : y));
  if (s2) {
    sctx.fillStyle = fault ? '#ff4444' : '#2a5a2a';
    sctx.font = `${Math.max(5, SS(6.5))}px Share Tech Mono`;
    sctx.fillText(s2, SX(x), SY(y + 4));
  }
  if (fault) {
    sctx.fillStyle = '#ff4444';
    sctx.font = `bold ${Math.max(5, SS(6))}px Share Tech Mono`;
    sctx.fillText('✗FAULT', SX(x), SY(y + h / 2 + 7));
  }
  sctx.restore();
}

/** Draw an SMD passive component (resistor, capacitor) */
function ssmd(x, y, lbl, c, fault = false, warn = false) {
  const fc = fault ? '#ff4444' : warn ? '#ff6b00' : c;
  sctx.save();
  sctx.shadowColor = fc;
  sctx.shadowBlur = fault ? 12 : 4;
  sctx.strokeStyle = fc;
  sctx.lineWidth = Math.max(1, SS(fault ? 2.5 : 1.5));
  sctx.fillStyle = '#030803';
  sctx.beginPath();
  sctx.roundRect(SX(x - 10), SY(y - 5), SS(20), SS(10), SS(2));
  sctx.fill();
  sctx.stroke();
  // End caps
  sctx.fillStyle = fc + '44';
  sctx.beginPath();
  sctx.roundRect(SX(x - 10), SY(y - 5), SS(4), SS(10), SS(1));
  sctx.fill();
  sctx.beginPath();
  sctx.roundRect(SX(x + 6), SY(y - 5), SS(4), SS(10), SS(1));
  sctx.fill();
  sctx.fillStyle = fc;
  sctx.shadowBlur = 0;
  sctx.font = `bold ${Math.max(5, SS(6.5))}px Share Tech Mono`;
  sctx.textAlign = 'center';
  sctx.textBaseline = 'middle';
  sctx.fillText(lbl, SX(x), SY(y));
  sctx.restore();
}

/** Draw a diode symbol (triangle + cathode bar) */
function sdio(x, y, c, fault = false) {
  const fc = fault ? '#ff4444' : c;
  sctx.save();
  sctx.strokeStyle = fc;
  sctx.fillStyle = fault ? 'rgba(255,0,0,0.1)' : fc + '22';
  sctx.lineWidth = 1.2;
  sctx.shadowColor = fc;
  sctx.shadowBlur = fault ? 10 : 4;
  // Triangle body (anode left, cathode right)
  sctx.beginPath();
  sctx.moveTo(SX(x - 7), SY(y));
  sctx.lineTo(SX(x + 5), SY(y - 6));
  sctx.lineTo(SX(x + 5), SY(y + 6));
  sctx.closePath();
  sctx.fill();
  sctx.stroke();
  // Cathode bar
  sctx.beginPath();
  sctx.moveTo(SX(x + 5), SY(y - 6));
  sctx.lineTo(SX(x + 5), SY(y + 6));
  sctx.stroke();
  // Lead lines
  sctx.beginPath();
  sctx.moveTo(SX(x - 7), SY(y));
  sctx.lineTo(SX(x - 11), SY(y));
  sctx.moveTo(SX(x + 5), SY(y));
  sctx.lineTo(SX(x + 9), SY(y));
  sctx.stroke();
  if (fault) {
    sctx.fillStyle = '#ff4444';
    sctx.font = `bold ${Math.max(5, SS(7))}px Share Tech Mono`;
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('✗', SX(x), SY(y - 12));
  }
  sctx.restore();
}

/** Draw an animated fan header */
function sfan(x, y, n, spd) {
  const fc = spd > 0.05 ? '#00ff41' : '#1a4a1a';
  sctx.save();
  sctx.strokeStyle = fc;
  sctx.lineWidth = 1;
  sctx.fillStyle = '#020802';
  sctx.shadowColor = fc;
  sctx.shadowBlur = spd > 0.05 ? 4 : 1;
  // Housing
  sctx.beginPath();
  sctx.roundRect(SX(x - 13), SY(y - 18), SS(26), SS(36), SS(2));
  sctx.fill();
  sctx.stroke();
  // Spinning blades
  const ang = (simTick * 0.045 * (spd * 0.6) * 9) % (Math.PI * 2);
  sctx.save();
  sctx.translate(SX(x), SY(y - 4));
  for (let i = 0; i < 3; i++) {
    sctx.save();
    sctx.rotate(ang + i * Math.PI * 2 / 3);
    sctx.fillStyle = fc;
    sctx.beginPath();
    sctx.ellipse(0, SS(-5), SS(2.5), SS(6), 0, 0, Math.PI * 2);
    sctx.fill();
    sctx.restore();
  }
  sctx.restore();
  // Pin indicators
  sctx.fillStyle = fc + '44';
  for (let i = 0; i < 4; i++) {
    sctx.beginPath();
    sctx.rect(SX(x - 10 + i * 5), SY(y + 14), SS(3.5), SS(4));
    sctx.fill();
  }
  sctx.restore();
  slbl(x, y - 24, `F${n}`, fc, 6.5);
}

// ── Main scene draw ────────────────────────────────────────────────────────────
function drawSim() {
  sctx.clearRect(0, 0, simW, simH);

  const f      = FAULTS[faultKey];
  const faults = f.faults;
  const dead   = f.vin === 0, v5d = f.v5 === 0;
  const iF     = id => faults.includes(id);
  const fuseOk = !iF('FUSE') && !iF('C1');

  // Fault-aware base colours
  const p12c = dead   ? '#252525' : '#ff6b00';
  const pFc  = fuseOk ? p12c     : '#252525';
  const p5c  = v5d    ? '#252525' : '#44aaff';
  const pgc  = dead   ? '#252525' : '#1a5a1a';

  const p3live = f.p3 !== 'zero' && f.p3 !== 'low' && !v5d;
  const p3c    = p3live ? '#00ff41' : '#252525';
  const spd    = getFaultSpd();
  const R1c    = iF('R1') ? '#252525' : p5c;
  const timC   = (v5d || iF('IC555') || iF('CT')) ? '#252525' : '#ffee44';

  // Map an editor net-colour to its current fault-aware colour
  function netC(ec) {
    switch (ec) {
      case '#00ffcc': return p3c;                                          // PWM
      case '#88ccff': return R1c;                                          // P7
      case '#ffee44': return timC;                                         // TIM
      case '#dd44ff': return p5c;                                          // CV
      case '#ffdd44': return timC;                                         // DA / DK
      case '#00ff41': return (iF('R3') || v5d) ? '#252525' : '#00ff41';   // RLED
      default:        return ec;
    }
  }

  // ── Board background (sized from layout bounds) ─────────────────────────────
  sctx.save();
  sctx.fillStyle = 'rgba(0,12,0,0.5)'; sctx.strokeStyle = '#1a3a1a'; sctx.lineWidth = 2;
  sctx.shadowColor = '#00ff41'; sctx.shadowBlur = 12;
  sctx.beginPath();
  sctx.roundRect(SX(simBounds.minX), SY(simBounds.minY),
    SS(simBounds.maxX - simBounds.minX), SS(simBounds.maxY - simBounds.minY), SS(6));
  sctx.fill(); sctx.stroke();
  sctx.shadowBlur = 0; sctx.restore();

  // ── Signal wires from layout.json ───────────────────────────────────────────
  for (const w of simWires) {
    const c = netC(w.color);
    for (let i = 0; i < w.points.length - 1; i++)
      sw(w.points[i][0], w.points[i][1], w.points[i + 1][0], w.points[i + 1][1], c);
  }

  // Junction dots where 3+ wire point-coordinates coincide
  const ptCount = new Map();
  for (const w of simWires) {
    const c = netC(w.color);
    for (const p of w.points) {
      const k = `${p[0]},${p[1]}`;
      if (!ptCount.has(k)) ptCount.set(k, { n: 0, c });
      ptCount.get(k).n++;
    }
  }
  for (const [k, v] of ptCount) {
    if (v.n >= 3) {
      const [x, y] = k.split(',').map(Number);
      sdot(x, y, v.c);
    }
  }

  // ── Power / GND symbols at every power-net terminal ─────────────────────────
  const pwrAlive = { '12V': pFc, '5V': p5c, 'GND': pgc };
  for (const pos of Object.values(simPos)) {
    for (const t of pos.terminals) {
      if (pwrAlive[t.net] !== undefined)
        sPowerSym(t.x, t.y, t.net, pwrAlive[t.net]);
    }
  }

  // ── Fans ────────────────────────────────────────────────────────────────────
  for (let i = 0; i < 6; i++) {
    const fn = simPos[`FAN${i + 1}`];
    if (fn) sfan(fn.x, fn.y, i + 1, spd);
  }

  // ── SATA connector ──────────────────────────────────────────────────────────
  const sat = simPos.SATA || { x: 78, y: 98, rot: 0 };
  withRot(sat.x, sat.y, sat.rot, () => {
    sctx.save();
    sctx.strokeStyle = dead ? '#333' : '#ff6b00';
    sctx.lineWidth = 1.5; sctx.fillStyle = '#020802';
    sctx.shadowColor = dead ? '#333' : '#ff6b00';
    sctx.shadowBlur = dead ? 2 : 8;
    sctx.beginPath();
    sctx.roundRect(SX(sat.x - 38), SY(sat.y - 13), SS(76), SS(26), SS(2));
    sctx.fill(); sctx.stroke();
    sctx.restore();
  });
  slbl(sat.x, sat.y, 'SATA POWER', dead ? '#333' : '#ff6b00', 7);

  // ── Barrel jack ─────────────────────────────────────────────────────────────
  const bar = simPos.BARREL || { x: 80, y: 420 };
  sctx.save();
  sctx.strokeStyle = dead ? '#333' : '#ff6b00'; sctx.lineWidth = 2;
  sctx.fillStyle = '#020802';
  sctx.shadowColor = dead ? '#333' : '#ff6b00'; sctx.shadowBlur = dead ? 2 : 10;
  sctx.beginPath(); sctx.arc(SX(bar.x), SY(bar.y), SS(18), 0, Math.PI * 2);
  sctx.fill(); sctx.stroke();
  sctx.beginPath(); sctx.arc(SX(bar.x), SY(bar.y), SS(7),  0, Math.PI * 2); sctx.stroke();
  sctx.fillStyle = dead ? '#333' : '#ff6b00';
  sctx.beginPath(); sctx.arc(SX(bar.x), SY(bar.y), SS(3.5),0, Math.PI * 2); sctx.fill();
  slbl(bar.x, bar.y + 23, '12V BARREL', dead ? '#333' : '#ff6b00', 6.5);
  sctx.restore();

  // ── Fuse ────────────────────────────────────────────────────────────────────
  const fu = simPos.F1 || { x: 200, y: 390, rot: 0 };
  withRot(fu.x, fu.y, fu.rot, () =>
    sbox(fu.x, fu.y, 26, 14, 'F1', '5A', '#ff6b00', iF('FUSE') || iF('C1')));
  if (hoverSimComp === 'F1') sHoverLbl(fu.x, fu.y + 14, 'F1 — 5A fuse');

  // ── Voltage regulator ───────────────────────────────────────────────────────
  const reg = simPos.REG || { x: 680, y: 300, rot: 0 };
  withRot(reg.x, reg.y, reg.rot, () =>
    sbox(reg.x, reg.y, 50, 34, '78L05', '5V REG', '#44aaff', iF('REG')));

  // ── Potentiometer ───────────────────────────────────────────────────────────
  const pot = simPos.POT || { x: 500, y: 310 };
  sctx.save();
  sctx.strokeStyle = '#2a5a2a'; sctx.lineWidth = 1; sctx.fillStyle = '#020802';
  sctx.beginPath(); sctx.arc(SX(pot.x), SY(pot.y), SS(32), 0, Math.PI * 2);
  sctx.fill(); sctx.stroke();
  sctx.strokeStyle = '#00ff41'; sctx.shadowColor = '#00ff41'; sctx.shadowBlur = 6;
  sctx.beginPath();
  sctx.roundRect(SX(pot.x - 18), SY(pot.y - 18), SS(36), SS(36), SS(3));
  sctx.fill(); sctx.stroke();
  const pang = (135 + potV * 270) * Math.PI / 180;
  sctx.lineWidth = 2; sctx.beginPath();
  sctx.moveTo(SX(pot.x), SY(pot.y));
  sctx.lineTo(SX(pot.x) + Math.cos(pang) * SS(14), SY(pot.y) + Math.sin(pang) * SS(14));
  sctx.stroke();
  sctx.fillStyle = '#00ff41';
  sctx.beginPath(); sctx.arc(SX(pot.x), SY(pot.y), SS(2.5), 0, Math.PI * 2); sctx.fill();
  if (hoverSimComp === 'POT') sHoverLbl(pot.x, pot.y + 24, 'RV1 — 90kΩ pot');
  else slbl(pot.x, pot.y + 24, 'RV1 90kΩ', '#2a5a2a', 6.5);
  sctx.restore();

  // ── LED ─────────────────────────────────────────────────────────────────────
  const led   = simPos.LED1 || { x: 610, y: 130 };
  const ledOn = f.ledOn;
  sctx.save();
  sctx.strokeStyle = ledOn ? '#00ff41' : '#1a3a1a';
  sctx.fillStyle   = ledOn ? 'rgba(0,255,65,0.12)' : '#020802';
  sctx.shadowColor = ledOn ? '#00ff41' : '#1a3a1a'; sctx.shadowBlur = ledOn ? 12 : 2;
  sctx.beginPath(); sctx.arc(SX(led.x), SY(led.y), SS(8), 0, Math.PI * 2);
  sctx.fill(); sctx.stroke();
  if (ledOn) {
    sctx.fillStyle = '#00ff41';
    sctx.beginPath(); sctx.arc(SX(led.x), SY(led.y), SS(3), 0, Math.PI * 2); sctx.fill();
  }
  slbl(led.x, led.y - 17, 'LED1', ledOn ? '#00ff41' : '#1a3a1a', 6.5);
  sctx.restore();

  // ── SMD passives ─────────────────────────────────────────────────────────────
  function drawSMD(id, lbl, color, fault, warn) {
    const p = simPos[id]; if (!p) return;
    withRot(p.x, p.y, p.rot, () => ssmd(p.x, p.y, id, color, fault, warn));
    const hov = hoverSimComp === id;
    if (p.rot % 180 === 90) {
      if (hov) sHoverLbl(p.x + 16, p.y, lbl, 'left');
      else slbl(p.x + 16, p.y, lbl, '#2a5a2a', 6.5, 'left');
    } else {
      if (hov) sHoverLbl(p.x, p.y + 14, lbl);
      else slbl(p.x, p.y + 14, lbl, '#2a5a2a', 6.5);
    }
  }
  drawSMD('R3', 'R3 4.7k',  '#00ff41', iF('R3'));
  drawSMD('R1', 'R1 1kΩ',   '#44aaff', iF('R1'));
  drawSMD('C2', 'C2 .33µF', '#44aaff', iF('C2') && v5d, iF('C2') && !v5d);
  drawSMD('C1', 'C1 .22µF', '#44aaff', iF('C1'));
  drawSMD('R2', 'R2 1kΩ',   '#ffdd44', iF('R2'));
  drawSMD('C3', 'C3 33nF',  '#ff6b00', iF('CT'));
  drawSMD('C4', 'C4 10nF',  '#00ff41');

  // ── Diodes ──────────────────────────────────────────────────────────────────
  function drawDiode(id) {
    const p = simPos[id]; if (!p) return;
    withRot(p.x, p.y, p.rot, () => sdio(p.x, p.y, '#ffdd44', iF(id)));
    if (id === 'D1')
      slbl(p.x - 16, p.y, id, '#ffdd44', 6.5, 'right');
    else
      slbl(p.x, p.y + 14, id, '#ffdd44', 6.5);
  }
  drawDiode('D1');
  drawDiode('D2');

  // ── NE555 IC ─────────────────────────────────────────────────────────────────
  const ic        = simPos.NE555 || { x: 380, y: 420, rot: 0, terminals: [] };
  const ic555fault = iF('IC555');
  const icc        = ic555fault ? '#ff4444' : '#00ff41';

  // Box body (inside rotation transform)
  withRot(ic.x, ic.y, ic.rot, () => {
    sctx.save();
    sctx.strokeStyle = icc; sctx.lineWidth = Math.max(1, SS(1.5));
    sctx.fillStyle = '#020802';
    sctx.shadowColor = icc; sctx.shadowBlur = ic555fault ? 14 : 8;
    sctx.beginPath();
    sctx.roundRect(SX(ic.x - 30), SY(ic.y - 40), SS(60), SS(80), SS(3));
    sctx.fill(); sctx.stroke();
    // Orientation notch
    sctx.fillStyle = '#020802'; sctx.strokeStyle = '#1a4a1a'; sctx.lineWidth = 1;
    sctx.beginPath(); sctx.arc(SX(ic.x), SY(ic.y - 40), SS(5), 0, Math.PI);
    sctx.fill(); sctx.stroke();
    slbl(ic.x, ic.y - 10, 'NE555', icc, 8);
    slbl(ic.x, ic.y - 19, 'U1', '#2a5a2a', 6.5);
    if (ic555fault) slbl(ic.x, ic.y, '✗FAULT', '#ff4444', 7);
    sctx.restore();
  });

  // Pin number labels — drawn at already-rotated terminal world positions
  if (!ic555fault) {
    const pinNums = { P1:'1', P2:'2', P3:'3', P4:'4', P8:'8', P7:'7', P6:'6', P5:'5' };
    for (const t of ic.terminals) {
      const pn = pinNums[t.id]; if (!pn) continue;
      const inward = t.x < ic.x ? 7 : -7;
      sctx.save();
      sctx.fillStyle = '#2a5a2a';
      sctx.font = `${Math.max(5, SS(6))}px Share Tech Mono`;
      sctx.textAlign = 'center'; sctx.textBaseline = 'middle';
      sctx.fillText(pn, SX(t.x + inward), SY(t.y));
      sctx.restore();
    }
  }

  // ── Board label (anchored to bottom-right of board outline) ─────────────────
  const _blx = simBounds.maxX - 10, _bly = simBounds.maxY - 10;
  sctx.save();
  sctx.strokeStyle = '#1a4a1a'; sctx.lineWidth = 1;
  sctx.strokeRect(SX(_blx - 75), SY(_bly - 40), SS(75), SS(40));
  slbl(_blx - 75 + 37.5, _bly - 30, 'UENORTH', '#2a5a2a', 7);
  slbl(_blx - 75 + 37.5, _bly - 18, 'FAN-K11', '#2a5a2a', 8);
  sctx.restore();

  simTick++;
}
