// ─────────────────────────────────────────────────────────────────────────────
// thumb.js — hero section PCB thumbnail
// Draws a simplified top-view representation of the board onto #boardThumb
// ─────────────────────────────────────────────────────────────────────────────

function drawThumb() {
  const tc = document.getElementById('boardThumb');
  if (!tc) return;

  const x  = tc.getContext('2d');
  const tw = tc.width;
  const th = tc.height;

  x.clearRect(0, 0, tw, th);

  // PCB background
  x.fillStyle = '#080f08';
  x.fillRect(0, 0, tw, th);
  x.strokeStyle = '#1a4a1a';
  x.lineWidth = 2;
  x.strokeRect(8, 8, tw - 16, th - 16);

  // Dot grid
  x.fillStyle = '#0f1f0f';
  for (let gx = 20; gx < tw; gx += 20) {
    for (let gy = 20; gy < th; gy += 20) {
      x.beginPath();
      x.arc(gx, gy, 0.8, 0, Math.PI * 2);
      x.fill();
    }
  }

  // ── Scale helpers ──────────────────────────────────────────────────────
  // Virtual space matches POSITIONS (840×560), thumbnail is 480×320
  const scale = tw / 840;
  const sy = v => v * th / 560;

  function trect(cx, cy, w, h, c) {
    x.save();
    x.strokeStyle = c;
    x.fillStyle   = c + '22';
    x.lineWidth   = 1.5;
    x.shadowColor = c;
    x.shadowBlur  = 5;
    x.beginPath();
    x.roundRect(cx * scale - w * scale / 2, sy(cy) - h * scale / 2, w * scale, h * scale, 2);
    x.fill();
    x.stroke();
    x.restore();
  }

  function tcirc(cx, cy, r, c) {
    x.save();
    x.strokeStyle = c;
    x.fillStyle   = c + '22';
    x.lineWidth   = 1.5;
    x.shadowColor = c;
    x.shadowBlur  = 5;
    x.beginPath();
    x.arc(cx * scale, sy(cy), r * scale, 0, Math.PI * 2);
    x.fill();
    x.stroke();
    x.restore();
  }

  // ── Components (matches POSITIONS coordinates) ─────────────────────────

  // Fans (6×)
  [180, 230, 280, 330, 380, 430].forEach(fx => tcirc(fx, 110, 12, '#00ff41'));

  // Power connectors
  trect(80,  100, 76, 26, '#ff6b00');   // SATA
  tcirc(80,  420, 18, '#ff6b00');       // Barrel jack
  trect(200, 390, 26, 14, '#ff6b00');   // Fuse F1

  // ICs
  trect(680, 300, 50, 34, '#44aaff');   // 78L05 regulator
  trect(380, 420, 60, 80, '#00ff41');   // NE555

  // Potentiometer
  tcirc(500, 310, 32, '#00ff41');

  // SMD passives (R1, R2, R3, C1, C2, C3, C4)
  [[610,180],[610,225],[660,180],[660,225],[490,480],[660,390],[710,390]]
    .forEach(([cx, cy]) => trect(cx, cy, 20, 12, '#00ff41'));

  // Diodes (D1, D2)
  [[490, 430], [560, 430]]
    .forEach(([cx, cy]) => trect(cx, cy, 18, 14, '#ffdd44'));

  // LED
  tcirc(610, 130, 8, '#00ff41');

  // Board label
  x.font      = 'bold 10px Share Tech Mono, monospace';
  x.fillStyle = '#2a5a2a';
  x.textAlign = 'center';
  x.fillText('UENORTH FAN-K11', tw / 2, th - 12);
}

// Draw once on load
drawThumb();
