// ─────────────────────────────────────────────────────────────────────────────
// mini.js — isolated mini circuit diagrams for each network card
// When layout.json has been loaded (simPos populated), diagrams are derived
// from that data so they stay in sync with the simulation.
// Falls back to hardcoded layouts on first render (before fetch resolves).
// ─────────────────────────────────────────────────────────────────────────────

// ── Pixel-coord helpers (shared by both layout-derived and fallback paths) ────

function mWire(mx, x1, y1, x2, y2, color, glow = true) {
  mx.save();
  mx.strokeStyle = color;
  mx.lineWidth = 1.5;
  if (glow) { mx.shadowColor = color; mx.shadowBlur = 5; }
  mx.beginPath(); mx.moveTo(x1, y1); mx.lineTo(x2, y2); mx.stroke();
  mx.restore();
}

function mDot(mx, x, y, color) {
  mx.save();
  mx.fillStyle = color; mx.shadowColor = color; mx.shadowBlur = 6;
  mx.beginPath(); mx.arc(x, y, 3, 0, Math.PI * 2); mx.fill();
  mx.restore();
}

function mLabel(mx, x, y, text, color, size = 9, align = 'center') {
  mx.save();
  mx.fillStyle = color;
  mx.font = `${size}px Share Tech Mono, monospace`;
  mx.textAlign = align; mx.textBaseline = 'middle';
  mx.fillText(text, x, y);
  mx.restore();
}

function mBox(mx, x, y, w, h, label, sub, color) {
  mx.save();
  mx.strokeStyle = color; mx.fillStyle = '#030803'; mx.lineWidth = 1.5;
  mx.shadowColor = color; mx.shadowBlur = 6;
  mx.beginPath(); mx.roundRect(x - w / 2, y - h / 2, w, h, 3); mx.fill(); mx.stroke();
  mx.shadowBlur = 0; mx.fillStyle = color;
  mx.font = `bold ${sub ? 8 : 9}px Share Tech Mono, monospace`;
  mx.textAlign = 'center'; mx.textBaseline = 'middle';
  mx.fillText(label, x, sub ? y - 4 : y);
  if (sub) {
    mx.fillStyle = '#2a5a2a'; mx.font = '7px Share Tech Mono, monospace';
    mx.fillText(sub, x, y + 5);
  }
  mx.restore();
}

function mSMD(mx, x, y, label, color) {
  mx.save();
  mx.strokeStyle = color; mx.fillStyle = '#030803'; mx.lineWidth = 1.2;
  mx.shadowColor = color; mx.shadowBlur = 4;
  mx.beginPath(); mx.roundRect(x - 14, y - 6, 28, 12, 2); mx.fill(); mx.stroke();
  mx.fillStyle = color + '44';
  mx.beginPath(); mx.roundRect(x - 14, y - 6, 5, 12, 1); mx.fill();
  mx.beginPath(); mx.roundRect(x + 9,  y - 6, 5, 12, 1); mx.fill();
  mx.shadowBlur = 0; mx.fillStyle = color;
  mx.font = 'bold 7px Share Tech Mono, monospace';
  mx.textAlign = 'center'; mx.textBaseline = 'middle';
  mx.fillText(label, x, y);
  mx.restore();
}

function mDiode(mx, x, y, color) {
  mx.save();
  mx.strokeStyle = color; mx.fillStyle = color + '33'; mx.lineWidth = 1.2;
  mx.shadowColor = color; mx.shadowBlur = 4;
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
  mx.strokeStyle = color; mx.lineWidth = 1.2;
  [[12, 0], [8, 5], [4, 10]].forEach(([hw, dy]) => {
    mx.beginPath(); mx.moveTo(x - hw, y + dy); mx.lineTo(x + hw, y + dy); mx.stroke();
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
  mx.beginPath(); mx.moveTo(x, y); mx.lineTo(x + Math.cos(ang) * 11, y + Math.sin(ang) * 11); mx.stroke();
  mx.restore();
}

function mFan(mx, x, y, color) {
  mx.save();
  mx.strokeStyle = color; mx.fillStyle = '#020802'; mx.lineWidth = 1.2;
  mx.shadowColor = color; mx.shadowBlur = 4;
  mx.beginPath(); mx.roundRect(x - 14, y - 18, 28, 38, 2); mx.fill(); mx.stroke();
  mx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    mx.save(); mx.translate(x, y - 4); mx.rotate(i * Math.PI * 2 / 3);
    mx.beginPath(); mx.ellipse(0, -6, 3, 7, 0, 0, Math.PI * 2); mx.fill();
    mx.restore();
  }
  mx.fillStyle = color + '55';
  for (let i = 0; i < 4; i++) { mx.beginPath(); mx.rect(x - 10 + i * 5, y + 14, 4, 4); mx.fill(); }
  mx.restore();
}

function mBackground(mx, w, h) {
  mx.fillStyle = '#06100a'; mx.fillRect(0, 0, w, h);
  mx.strokeStyle = '#1a3a1a'; mx.lineWidth = 1; mx.strokeRect(1, 1, w - 2, h - 2);
  mx.strokeStyle = '#0d1f0d'; mx.lineWidth = 0.5;
  mx.beginPath();
  for (let x = 20; x < w; x += 20) { mx.moveTo(x, 0); mx.lineTo(x, h); }
  for (let y = 20; y < h; y += 20) { mx.moveTo(0, y); mx.lineTo(w, y); }
  mx.stroke();
}

// ── Layout-derived mini diagram machinery ─────────────────────────────────────

// Mini transform state (world → CSS-pixel canvas coords)
let _mctx = null;
let _mS = 1, _mOX = 0, _mOY = 0;

function mSX(wx) { return _mOX + wx * _mS; }
function mSY(wy) { return _mOY + wy * _mS; }
function mSS(v)  { return v * _mS; }

/**
 * Size a mini canvas for crisp rendering on HiDPI/Retina displays.
 * Sets the backing-store resolution to cssW×cssH scaled by devicePixelRatio,
 * pre-scales the 2d context so all drawing uses CSS-pixel coordinates,
 * and returns { ctx, w: cssW, h: cssH }.
 */
function _miniInit(el, cssH) {
  const dpr  = window.devicePixelRatio || 1;
  const cssW = el.offsetWidth;
  el.width        = Math.round(cssW * dpr);
  el.height       = Math.round(cssH * dpr);
  el.style.width  = cssW + 'px';
  el.style.height = cssH + 'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: cssW, h: cssH };
}

// Component body colors for mini diagrams (static, fault-independent)
const _MCC = {
  NE555: '#00ff41', REG: '#44aaff',
  SATA: '#ff6b00', BARREL: '#ff6b00', F1: '#ff6b00',
  C1: '#44aaff', C2: '#44aaff', C3: '#ff6b00', C4: '#888888',
  R1: '#44aaff', R2: '#ffdd44', R3: '#00ff41',
  D1: '#ffdd44', D2: '#ffdd44',
  POT: '#00ff41', LED1: '#00ff41',
  FAN1: '#00ff41', FAN2: '#00ff41', FAN3: '#00ff41',
  FAN4: '#00ff41', FAN5: '#00ff41', FAN6: '#00ff41',
};

// Map editor wire color → static display color
const _MWC = {
  '#ff6b00': '#ff6b00', '#44aaff': '#44aaff',
  '#00ff41': '#00ff41', '#ffdd44': '#ffdd44',
  '#1a5a1a': '#2a6a2a',
};
function _mwc(ec) { return _MWC[ec] || ec || '#555555'; }

/**
 * Filter simWires to only those where BOTH endpoints land near a terminal
 * of one of the components in `ids`.
 */
function _miniWires(ids) {
  if (!simWires.length || !Object.keys(simPos).length) return [];
  const pts = [];
  for (const id of ids) {
    const p = simPos[id];
    if (p) p.terminals.forEach(t => pts.push([t.x, t.y]));
  }
  const near = (px, py) => pts.some(([tx, ty]) => Math.hypot(px - tx, py - ty) < 15);
  return simWires.filter(w => {
    if (!w.points || w.points.length < 2) return false;
    const p0 = w.points[0], pe = w.points[w.points.length - 1];
    return near(p0[0], p0[1]) && near(pe[0], pe[1]);
  });
}

/**
 * Compute _mS, _mOX, _mOY so that the bounding box of `ids` fits inside
 * (cw × ch) with `pad` pixels of margin.
 * Returns false if simPos has no data for any id in ids.
 */
function _miniSetXform(ids, cw, ch, pad) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const ex = (x, y) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  for (const id of ids) {
    const p = simPos[id];
    if (!p) continue;
    const bh = _BODY_HALF[id];
    if (bh) { ex(p.x - bh[0], p.y - bh[1]); ex(p.x + bh[0], p.y + bh[1]); }
    else p.terminals.forEach(t => ex(t.x, t.y));
  }
  _miniWires(ids).forEach(w => w.points.forEach(pt => ex(pt[0], pt[1])));
  if (!isFinite(minX)) return false;
  const bw = Math.max(1, maxX - minX), bh2 = Math.max(1, maxY - minY);
  _mS  = Math.min((cw - pad * 2) / bw, (ch - pad * 2) / bh2);
  _mOX = cw / 2 - (minX + maxX) / 2 * _mS;
  _mOY = ch / 2 - (minY + maxY) / 2 * _mS;
  return true;
}

/** Draw a single component body at its world position with rotation. */
function _mwComp(id) {
  const pos = simPos[id];
  if (!pos) return;
  const cx = mSX(pos.x), cy = mSY(pos.y);
  const rot = pos.rot || 0;
  const c = _MCC[id] || '#00ff41';

  _mctx.save();
  if (rot) {
    _mctx.translate(cx, cy);
    _mctx.rotate(rot * Math.PI / 180);
    _mctx.translate(-cx, -cy);
  }

  if (id === 'NE555') {
    const hw = mSS(30), hh = mSS(40);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#030803'; _mctx.lineWidth = 1.5;
    _mctx.shadowColor = c; _mctx.shadowBlur = 6;
    _mctx.beginPath(); _mctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, mSS(3));
    _mctx.fill(); _mctx.stroke();
    _mctx.shadowBlur = 0; _mctx.fillStyle = c;
    _mctx.font = `bold ${Math.max(6, mSS(8))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'middle';
    _mctx.fillText('NE555', cx, cy - mSS(4));
    _mctx.fillStyle = '#2a5a2a';
    _mctx.font = `${Math.max(5, mSS(6))}px Share Tech Mono, monospace`;
    _mctx.fillText('U1', cx, cy + mSS(5));

  } else if (id === 'REG') {
    const hw = mSS(25), hh = mSS(17);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#030803'; _mctx.lineWidth = 1.5;
    _mctx.shadowColor = c; _mctx.shadowBlur = 6;
    _mctx.beginPath(); _mctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, mSS(3));
    _mctx.fill(); _mctx.stroke();
    _mctx.shadowBlur = 0; _mctx.fillStyle = c;
    _mctx.font = `bold ${Math.max(5, mSS(7))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'middle';
    _mctx.fillText('78L05', cx, cy - mSS(2));
    _mctx.fillStyle = '#2a5a2a';
    _mctx.font = `${Math.max(4, mSS(5.5))}px Share Tech Mono, monospace`;
    _mctx.fillText('VR1', cx, cy + mSS(4));

  } else if (id === 'D1' || id === 'D2') {
    const hw = mSS(12);
    _mctx.strokeStyle = c; _mctx.fillStyle = c + '33'; _mctx.lineWidth = 1.2;
    _mctx.shadowColor = c; _mctx.shadowBlur = 4;
    _mctx.beginPath();
    _mctx.moveTo(cx - hw * 0.65, cy);
    _mctx.lineTo(cx + hw * 0.35, cy - mSS(6));
    _mctx.lineTo(cx + hw * 0.35, cy + mSS(6));
    _mctx.closePath(); _mctx.fill(); _mctx.stroke();
    _mctx.beginPath();
    _mctx.moveTo(cx + hw * 0.35, cy - mSS(6));
    _mctx.lineTo(cx + hw * 0.35, cy + mSS(6)); _mctx.stroke();
    _mctx.beginPath();
    _mctx.moveTo(cx - hw * 0.65, cy); _mctx.lineTo(cx - hw, cy);
    _mctx.moveTo(cx + hw * 0.35, cy); _mctx.lineTo(cx + hw, cy); _mctx.stroke();
    // ID label — drawn unrotated so it's always readable
    _mctx.restore();
    _mctx.save();
    _mctx.fillStyle = c;
    _mctx.font = `${Math.max(5, mSS(5.5))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'top';
    _mctx.fillText(id, cx, cy + mSS(8));

  } else if (id.match(/^[RC]\d/)) {
    const hw = mSS(10), hh = mSS(5);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#030803'; _mctx.lineWidth = 1.2;
    _mctx.shadowColor = c; _mctx.shadowBlur = 4;
    _mctx.beginPath(); _mctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, mSS(2));
    _mctx.fill(); _mctx.stroke();
    _mctx.fillStyle = c + '44';
    _mctx.beginPath(); _mctx.roundRect(cx - hw, cy - hh, mSS(4), hh * 2, mSS(1)); _mctx.fill();
    _mctx.beginPath(); _mctx.roundRect(cx + hw - mSS(4), cy - hh, mSS(4), hh * 2, mSS(1)); _mctx.fill();
    _mctx.shadowBlur = 0; _mctx.fillStyle = c;
    _mctx.font = `bold ${Math.max(5, mSS(5.5))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'middle';
    _mctx.fillText(id, cx, cy);

  } else if (id === 'POT') {
    const r = mSS(18);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#030803'; _mctx.lineWidth = 1.2;
    _mctx.shadowColor = c; _mctx.shadowBlur = 5;
    _mctx.beginPath(); _mctx.arc(cx, cy, r, 0, Math.PI * 2); _mctx.fill(); _mctx.stroke();
    _mctx.beginPath(); _mctx.roundRect(cx - r * 0.56, cy - r * 0.56, r * 1.12, r * 1.12, mSS(2));
    _mctx.fill(); _mctx.stroke();
    _mctx.lineWidth = 2;
    const ang = (135 + 0.5 * 270) * Math.PI / 180;
    _mctx.beginPath(); _mctx.moveTo(cx, cy);
    _mctx.lineTo(cx + Math.cos(ang) * r * 0.7, cy + Math.sin(ang) * r * 0.7); _mctx.stroke();

  } else if (id.startsWith('FAN')) {
    const hw = mSS(13), hh = mSS(24);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#020802'; _mctx.lineWidth = 1.2;
    _mctx.shadowColor = c; _mctx.shadowBlur = 4;
    _mctx.beginPath(); _mctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, mSS(2));
    _mctx.fill(); _mctx.stroke();
    _mctx.fillStyle = c;
    for (let i = 0; i < 3; i++) {
      _mctx.save(); _mctx.translate(cx, cy - mSS(4));
      _mctx.rotate(i * Math.PI * 2 / 3);
      _mctx.beginPath(); _mctx.ellipse(0, -mSS(6), mSS(3), mSS(7), 0, 0, Math.PI * 2); _mctx.fill();
      _mctx.restore();
    }
    _mctx.shadowBlur = 0; _mctx.fillStyle = c;
    _mctx.font = `${Math.max(5, mSS(5.5))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'bottom';
    _mctx.fillText(id, cx, cy - hh - mSS(1));

  } else if (id === 'SATA') {
    const hw = mSS(38), hh = mSS(13);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#030803'; _mctx.lineWidth = 1.5;
    _mctx.shadowColor = c; _mctx.shadowBlur = 6;
    _mctx.beginPath(); _mctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, mSS(2));
    _mctx.fill(); _mctx.stroke();
    _mctx.shadowBlur = 0; _mctx.fillStyle = c;
    _mctx.font = `bold ${Math.max(5, mSS(7))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'middle';
    _mctx.fillText('SATA', cx, cy - mSS(2.5));
    _mctx.fillStyle = '#2a5a2a';
    _mctx.font = `${Math.max(4, mSS(5.5))}px Share Tech Mono, monospace`;
    _mctx.fillText('12V IN', cx, cy + mSS(3.5));

  } else if (id === 'BARREL') {
    const r = mSS(18);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#030803'; _mctx.lineWidth = 1.5;
    _mctx.shadowColor = c; _mctx.shadowBlur = 6;
    _mctx.beginPath(); _mctx.arc(cx, cy, r, 0, Math.PI * 2); _mctx.fill(); _mctx.stroke();
    _mctx.beginPath(); _mctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2); _mctx.stroke();
    _mctx.shadowBlur = 0; _mctx.fillStyle = c;
    _mctx.font = `${Math.max(5, mSS(5.5))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'bottom';
    _mctx.fillText('BARREL', cx, cy - r - mSS(1));

  } else if (id === 'F1') {
    const hw = mSS(13), hh = mSS(7);
    _mctx.strokeStyle = c; _mctx.fillStyle = '#030803'; _mctx.lineWidth = 1.5;
    _mctx.shadowColor = c; _mctx.shadowBlur = 6;
    _mctx.beginPath(); _mctx.roundRect(cx - hw, cy - hh, hw * 2, hh * 2, mSS(2));
    _mctx.fill(); _mctx.stroke();
    _mctx.shadowBlur = 0; _mctx.fillStyle = c;
    _mctx.font = `bold ${Math.max(5, mSS(6.5))}px Share Tech Mono, monospace`;
    _mctx.textAlign = 'center'; _mctx.textBaseline = 'middle';
    _mctx.fillText('F1', cx, cy);

  } else if (id === 'LED1') {
    const r = mSS(10);
    _mctx.strokeStyle = c; _mctx.fillStyle = 'rgba(0,255,65,0.1)'; _mctx.lineWidth = 1.5;
    _mctx.shadowColor = c; _mctx.shadowBlur = 8;
    _mctx.beginPath(); _mctx.arc(cx, cy, r, 0, Math.PI * 2); _mctx.fill(); _mctx.stroke();
    _mctx.fillStyle = c;
    _mctx.beginPath(); _mctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2); _mctx.fill();
  }

  _mctx.restore();
}

/**
 * Draw GND/power flags at any power terminal that has no wire in _miniWires(ids).
 * This shows where each subnetwork connects to power/ground rails.
 */
function _mwPowerSyms(ids) {
  const ws = _miniWires(ids);
  for (const id of ids) {
    const pos = simPos[id];
    if (!pos) continue;
    for (const t of pos.terminals) {
      if (t.net !== 'GND' && t.net !== '12V' && t.net !== '5V') continue;
      const wired = ws.some(w => {
        const p0 = w.points[0], pe = w.points[w.points.length - 1];
        return Math.hypot(p0[0] - t.x, p0[1] - t.y) < 15 ||
               Math.hypot(pe[0] - t.x, pe[1] - t.y) < 15;
      });
      if (wired) continue;
      const tx = mSX(t.x), ty = mSY(t.y);
      if (t.net === 'GND') {
        _mctx.save();
        _mctx.strokeStyle = '#2a6a2a'; _mctx.lineWidth = 1;
        [[mSS(5), 0], [mSS(3.5), mSS(2.5)], [mSS(2), mSS(5)]].forEach(([hw, dy]) => {
          _mctx.beginPath(); _mctx.moveTo(tx - hw, ty + dy); _mctx.lineTo(tx + hw, ty + dy); _mctx.stroke();
        });
        _mctx.restore();
      } else {
        const pc = t.net === '12V' ? '#ff6b00' : '#44aaff';
        _mctx.save();
        _mctx.fillStyle = pc;
        _mctx.font = `bold ${Math.max(5, mSS(6))}px Share Tech Mono, monospace`;
        _mctx.textAlign = 'center'; _mctx.textBaseline = 'bottom';
        _mctx.fillText(t.net === '12V' ? '+12V' : '+5V', tx, ty - mSS(2));
        _mctx.restore();
      }
    }
  }
}

/**
 * Render a mini diagram derived from layout.json.
 * Returns true on success; caller falls back to hardcoded version on false.
 */
function drawMiniFromLayout(el, ids, height, pad) {
  if (!el || !Object.keys(simPos).length) return false;
  const { ctx, w, h } = _miniInit(el, height);
  _mctx = ctx;
  mBackground(_mctx, w, h);
  if (!_miniSetXform(ids, w, h, pad)) return false;

  // Wires
  const ws = _miniWires(ids);
  for (const wire of ws) {
    const c = _mwc(wire.color);
    _mctx.save();
    _mctx.strokeStyle = c; _mctx.lineWidth = Math.max(1, mSS(1.5));
    _mctx.shadowColor = c; _mctx.shadowBlur = 3;
    _mctx.beginPath();
    wire.points.forEach((p, i) =>
      i === 0 ? _mctx.moveTo(mSX(p[0]), mSY(p[1])) : _mctx.lineTo(mSX(p[0]), mSY(p[1]))
    );
    _mctx.stroke(); _mctx.restore();
  }

  // Junction dots where 2+ wire endpoints coincide
  const epMap = {};
  for (const w of ws) {
    for (const p of [w.points[0], w.points[w.points.length - 1]]) {
      const k = `${Math.round(p[0])},${Math.round(p[1])}`;
      if (!epMap[k]) epMap[k] = { wx: p[0], wy: p[1], n: 0, c: _mwc(w.color) };
      epMap[k].n++;
    }
  }
  for (const ep of Object.values(epMap)) {
    if (ep.n < 2) continue;
    _mctx.save();
    _mctx.fillStyle = ep.c; _mctx.shadowColor = ep.c; _mctx.shadowBlur = 4;
    _mctx.beginPath();
    _mctx.arc(mSX(ep.wx), mSY(ep.wy), Math.max(1.5, mSS(2.5)), 0, Math.PI * 2);
    _mctx.fill(); _mctx.restore();
  }

  // Power/GND flags at unconnected power terminals
  _mwPowerSyms(ids);

  // Component bodies
  for (const id of ids) _mwComp(id);

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-network draw functions (try layout-derived first, fall back to hardcoded)
// ─────────────────────────────────────────────────────────────────────────────

function drawMiniPower() {
  const el = document.getElementById('mini-power');
  if (!el) return;
  if (drawMiniFromLayout(el, ['SATA', 'BARREL', 'F1', 'C1'], 140, 18)) return;

  // ── Hardcoded fallback ─────────────────────────────────────────────────────
  const { ctx: mx, w } = _miniInit(el, 140);
  mBackground(mx, w, 140);
  const O = '#ff6b00', DM = '#1a5a1a', BL = '#44aaff';
  mWire(mx, 20, 125, w - 20, 125, DM, false);
  mLabel(mx, w / 2, 133, 'GND', DM, 7);
  mBox(mx, 55, 35, 70, 22, 'SATA', '12V IN', O);
  mWire(mx, 55, 46, 55, 70, O);
  mWire(mx, 55, 70, 130, 70, O);
  mx.save(); mx.strokeStyle = O; mx.fillStyle = '#030803'; mx.lineWidth = 1.5;
  mx.shadowColor = O; mx.shadowBlur = 5;
  mx.beginPath(); mx.arc(55, 95, 10, 0, Math.PI * 2); mx.fill(); mx.stroke();
  mx.beginPath(); mx.arc(55, 95, 4, 0, Math.PI * 2); mx.stroke();
  mx.restore();
  mLabel(mx, 55, 110, 'BARREL', O, 7);
  mWire(mx, 55, 85, 55, 70, O);
  mDot(mx, 55, 70, O);
  mBox(mx, 160, 70, 36, 18, 'F1', '5A', O);
  mWire(mx, 178, 70, w - 20, 70, O);
  mLabel(mx, w - 50, 60, '12V RAIL', O, 7);
  const c1x = w - 70;
  mDot(mx, c1x, 70, BL);
  mWire(mx, c1x, 70, c1x, 95, BL);
  mSMD(mx, c1x, 96, 'C1', BL);
  mWire(mx, c1x, 107, c1x, 125, DM);
  mLabel(mx, c1x, 135, '0.22µF', BL, 7);
}

function drawMiniReg() {
  const el = document.getElementById('mini-reg');
  if (!el) return;
  if (drawMiniFromLayout(el, ['REG', 'C1', 'C2'], 140, 18)) return;

  // ── Hardcoded fallback ─────────────────────────────────────────────────────
  const { ctx: mx, w } = _miniInit(el, 140);
  mBackground(mx, w, 140);
  const O = '#ff6b00', BL = '#44aaff', DM = '#1a5a1a';
  mWire(mx, 20, 125, w - 20, 125, DM, false);
  mLabel(mx, w / 2, 133, 'GND', DM, 7);
  mWire(mx, 20, 35, 80, 35, O);
  mLabel(mx, 35, 26, '12V IN', O, 7);
  const c1x = 60;
  mDot(mx, c1x, 35, O);
  mWire(mx, c1x, 35, c1x, 57, O);
  mSMD(mx, c1x, 58, 'C1', '#44aaff');
  mWire(mx, c1x, 69, c1x, 125, DM);
  mLabel(mx, c1x, 80, 'Vin', '#44aaff', 7);
  mLabel(mx, c1x, 90, 'byp', '#44aaff', 7);
  mBox(mx, w / 2, 65, 60, 36, '78L05', '5V REG', BL);
  mWire(mx, 80, 35, w / 2 - 30, 35, O);
  mWire(mx, w / 2 - 30, 35, w / 2 - 30, 47, O);
  mWire(mx, w / 2, 83, w / 2, 125, DM);
  mWire(mx, w / 2 + 30, 65, w - 20, 65, BL);
  mLabel(mx, w - 35, 55, '5V OUT', BL, 7);
  const c2x = w - 50;
  mDot(mx, c2x, 65, BL);
  mWire(mx, c2x, 65, c2x, 87, BL);
  mSMD(mx, c2x, 88, 'C2', BL);
  mWire(mx, c2x, 99, c2x, 125, DM);
  mLabel(mx, c2x, 110, '0.33µF', BL, 7);
}

function drawMiniLED() {
  const el = document.getElementById('mini-led');
  if (!el) return;
  if (drawMiniFromLayout(el, ['R3', 'LED1'], 140, 18)) return;

  // ── Hardcoded fallback ─────────────────────────────────────────────────────
  const { ctx: mx, w } = _miniInit(el, 140);
  mBackground(mx, w, 140);
  const G = '#00ff41', BL = '#44aaff', DM = '#1a5a1a';
  const cx = w / 2;
  mLabel(mx, cx, 15, '5V', BL, 9);
  mWire(mx, cx, 22, cx, 35, BL);
  mSMD(mx, cx, 42, 'R3', G);
  mLabel(mx, cx + 30, 42, '4.7kΩ', G, 7, 'left');
  mWire(mx, cx, 54, cx, 68, G);
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
  mLabel(mx, cx - 28, 35, '~4.97V', BL, 7, 'right');
  mLabel(mx, cx - 28, 65, '~0.6mA', G, 7, 'right');
}

function drawMiniPWM() {
  const el = document.getElementById('mini-pwm');
  if (!el) return;
  if (drawMiniFromLayout(el, ['NE555', 'R1', 'R2', 'D1', 'D2', 'POT', 'C3', 'C4'], 140, 18)) return;

  // ── Hardcoded fallback ─────────────────────────────────────────────────────
  const { ctx: mx, w } = _miniInit(el, 140);
  mBackground(mx, w, 140);
  const G = '#00ff41', BL = '#44aaff', YL = '#ffdd44', O = '#ff6b00', DM = '#1a5a1a';
  const icx = w / 2 - 10;
  mBox(mx, icx, 70, 52, 68, 'NE555', 'U1', G);
  mWire(mx, 20, 15, icx, 15, BL);
  mWire(mx, icx, 15, icx, 36, BL);
  mLabel(mx, 35, 8, '5V', BL, 7);
  mWire(mx, icx, 104, icx, 125, DM);
  mGND(mx, icx, 125, DM);
  const r1x = icx - 50;
  mWire(mx, 20, 15, r1x, 15, BL);
  mWire(mx, r1x, 15, r1x, 38, BL);
  mSMD(mx, r1x, 44, 'R1', BL);
  mLabel(mx, r1x - 18, 44, '1kΩ', BL, 7, 'right');
  mWire(mx, r1x, 55, r1x, 65, BL);
  mDot(mx, r1x, 65, BL);
  mWire(mx, r1x, 65, icx - 26, 65, BL);
  mLabel(mx, r1x - 8, 72, 'P7', BL, 7);
  mWire(mx, r1x, 65, r1x, 78, YL);
  mSMD(mx, r1x, 84, 'R2', YL);
  mLabel(mx, r1x - 18, 84, '1kΩ', YL, 7, 'right');
  mWire(mx, r1x, 95, r1x, 105, YL);
  mDiode(mx, r1x, 108, YL);
  mLabel(mx, r1x, 120, 'D2', YL, 7);
  const potx = w - 45;
  mPot(mx, potx, 80, G);
  mLabel(mx, potx, 107, 'RV1', G, 7);
  mWire(mx, r1x + 12, 108, potx, 108, YL);
  mWire(mx, potx, 62, potx, 108, YL);
  mWire(mx, potx - 18, 80, potx - 35, 80, YL);
  mDiode(mx, potx - 45, 80, YL);
  mLabel(mx, potx - 45, 93, 'D1', YL, 7);
  mWire(mx, potx - 57, 80, r1x, 80, YL);
  mDot(mx, r1x, 80, YL);
  mWire(mx, potx - 18, 80, potx - 18, 95, G);
  mWire(mx, potx - 18, 95, icx + 26, 95, G);
  mLabel(mx, icx + 36, 90, 'P2/6', G, 7, 'left');
  const c3x = icx + 50;
  mDot(mx, c3x, 95, O);
  mWire(mx, icx + 26, 95, c3x, 95, O);
  mWire(mx, c3x, 95, c3x, 108, O);
  mSMD(mx, c3x, 114, 'C3', O);
  mWire(mx, c3x, 120, c3x, 125, DM);
  mLabel(mx, c3x + 18, 114, '33nF', O, 7, 'left');
  mWire(mx, icx + 26, 70, w - 10, 70, G);
  mLabel(mx, w - 8, 62, 'PWM', G, 7, 'right');
  mLabel(mx, w - 8, 72, 'OUT', G, 7, 'right');
}

function drawMiniFan() {
  const el = document.getElementById('mini-fan');
  if (!el) return;
  if (drawMiniFromLayout(el, ['FAN1', 'FAN2', 'FAN3', 'FAN4', 'FAN5', 'FAN6'], 140, 18)) return;

  // ── Hardcoded fallback ─────────────────────────────────────────────────────
  const { ctx: mx, w } = _miniInit(el, 140);
  mBackground(mx, w, 140);
  const O = '#ff6b00', G = '#00ff41', DM = '#1a5a1a';
  mWire(mx, 20, 18, w - 20, 18, O, false);
  mLabel(mx, w / 2, 10, '12V RAIL (PIN 1)', O, 7);
  mWire(mx, 20, 33, w - 20, 33, G, false);
  mLabel(mx, w / 2, 40, 'PWM RAIL (PIN 4)', G, 7);
  mWire(mx, 20, 125, w - 20, 125, DM, false);
  mLabel(mx, w / 2, 134, 'GND (PIN 2)', DM, 7);
  const fanXs = [Math.round(w * 0.18), Math.round(w * 0.50), Math.round(w * 0.82)];
  const labels = ['FAN 1', 'FAN 2–5', 'FAN 6'];
  fanXs.forEach((fx, i) => {
    mWire(mx, fx, 18, fx, 54, O, false);
    mWire(mx, fx, 33, fx, 54, G, false);
    mFan(mx, fx, 80, G);
    mLabel(mx, fx, 115, labels[i], i === 1 ? DM : G, 7);
    mWire(mx, fx, 107, fx, 125, DM, false);
  });
  fanXs.forEach(fx => { mDot(mx, fx, 18, O); mDot(mx, fx, 33, G); });
}

// ── Boot ──────────────────────────────────────────────────────────────────────
function drawAllMinis() {
  drawMiniPower();
  drawMiniReg();
  drawMiniLED();
  drawMiniPWM();
  drawMiniFan();
}

let _miniResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_miniResizeTimer);
  _miniResizeTimer = setTimeout(drawAllMinis, 150);
});

drawAllMinis();
