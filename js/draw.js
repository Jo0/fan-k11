// ─────────────────────────────────────────────────────────────────────────────
// draw.js — simulation canvas drawing primitives
// All functions use sctx (set by sim.js) and SX/SY coordinate helpers
// ─────────────────────────────────────────────────────────────────────────────

// ── Coordinate helpers ────────────────────────────────────────────────────────
// Virtual world is 840×560 (3:2 ratio).
// simScale, simOX, simOY are written by resizeSim() in sim.js.
// Using a uniform scale ensures the schematic never distorts regardless of
// canvas size — if the canvas isn't exactly 3:2, we letterbox on that axis.

function SX(v) { return simOX + v * simScale; }   // world x → canvas x
function SY(v) { return simOY + v * simScale; }   // world y → canvas y
function SS(v) { return v * simScale; }            // world dimension → canvas size (no offset)

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
  // Spinning blades — simTick comes from sim.js
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
  slbl(x, y + 24, `F${n}`, fc, 6.5);
}

// ── Main scene draw — faithful port of original ───────────────────────────────
function drawSim(){
  sctx.clearRect(0,0,simW,simH);
  const f=FAULTS[faultKey];
  const faults=f.faults;
  const dead=f.vin===0;
  const v5d=f.v5===0;
  const iF=id=>faults.includes(id);
  const fuseOk=!iF('FUSE')&&!iF('C1');
  const p12=(c='#ff6b00')=>dead?'#252525':c;
  const pF=(c='#ff6b00')=>fuseOk?p12(c):'#252525';
  const p5=(c='#44aaff')=>v5d?'#252525':c;
  const pg=(c='#00ff41')=>dead?'#252525':c;
  const p3live=f.p3!=='zero'&&f.p3!=='low'&&!v5d;
  const p3c=p3live?'#00ff41':'#252525';
  const spd=getFaultSpd();

  // Board BG
  sctx.save();sctx.fillStyle='rgba(0,12,0,0.5)';sctx.strokeStyle='#1a3a1a';sctx.lineWidth=2;
  sctx.shadowColor='#00ff41';sctx.shadowBlur=12;
  sctx.beginPath();sctx.roundRect(SX(30),SY(30),SS(780),SS(500),SS(6));sctx.fill();sctx.stroke();
  sctx.shadowBlur=0;sctx.restore();

  // GND rail
  sw(35,530,810,530,'#1a4a1a',false);
  sctx.save();sctx.strokeStyle='#1a4a1a';sctx.lineWidth=1;sctx.setLineDash([4,4]);
  sctx.beginPath();sctx.moveTo(SX(35),SY(530));sctx.lineTo(SX(810),SY(530));sctx.stroke();
  sctx.setLineDash([]);sctx.restore();
  slbl(420,538,'── COMMON GND ──','#1a4a1a',7);

  // 12V rail
  const V12Y=65;
  sw(200,390,200,V12Y,pF());sw(200,V12Y,810,V12Y,pF());
  slbl(550,57,'12V RAIL → FAN PIN 1',pF(),7);

  // 5V rail
  const V5Y=160;
  sw(680,300,680,V5Y,p5());sw(200,V5Y,810,V5Y,p5());
  sdot(680,V5Y,p5());slbl(550,152,'5V RAIL',p5(),7);

  // SATA → FUSE
  sw(120,100,200,100,p12());sw(200,100,200,390,p12());sdot(200,100,p12());
  // BARREL → FUSE
  sw(80,390,200,390,p12());sdot(200,390,p12());
  // GND returns
  sw(80,115,80,530,pg());sdot(80,530,'#1a4a1a');
  sw(60,420,60,530,pg());sdot(60,530,'#1a4a1a');

  // FUSE → REG Vin
  sw(220,390,680,390,pF());sw(680,390,680,316,pF());sdot(680,390,pF());
  // C1 from 12V rail
  sw(660,225,660,V12Y,pF());sdot(660,V12Y,pF());
  sw(660,237,660,530,'#1a4a1a');sdot(660,530,'#1a4a1a');

  // REG → 5V
  sw(680,284,680,V5Y,p5());
  // C2 on 5V
  sw(660,180,660,V5Y,p5());sdot(660,V5Y,p5());
  sw(660,192,660,530,'#1a4a1a');sdot(660,530,'#1a4a1a');
  // R3 → 5V
  sw(610,180,610,V5Y,p5());sdot(610,V5Y,p5());
  // R3 → LED → GND
  sw(610,174,610,145,pg());
  sw(610,119,610,530,pg());sdot(610,530,'#1a4a1a');

  // REG → IC555 P8 + P4
  sw(630,300,380,300,p5());sw(380,300,380,380,p5());sdot(380,300,p5());
  slbl(505,293,'Vout→P8/P4',p5(),6.5);

  // R1 → 5V rail + down to P7
  sw(610,225,610,V5Y,p5());sdot(610,V5Y,p5());
  const R1c=iF('R1')?'#252525':p5();
  sw(610,237,610,350,R1c);
  // R2 down to P7
  const R2c=iF('R2')?'#252525':R1c;
  sw(490,480,490,350,R2c);
  // D1 Anode up to P7
  sw(490,430,490,350,iF('D1')?'#252525':'#ffdd44');
  // P7 bus
  sw(490,350,615,350,R1c);sdot(490,350,R1c);sdot(610,350,R1c);
  slbl(550,342,'P7 NODE',R1c,6.5);
  sw(610,350,610,380,R1c);sdot(615,350,R1c);

  // R2 → D2K
  sw(490,480,560,480,R2c);
  // D2A → POT right
  sw(560,416,560,310,iF('D2')?'#252525':'#ffdd44');sdot(560,310,'#ffdd44');
  sw(560,310,535,310,iF('D2')?'#252525':'#ffdd44');
  // POT L+wiper → D1K
  sw(465,310,490,310,iF('D1')?'#252525':'#ffdd44');sdot(490,310,'#ffdd44');
  sw(490,310,490,416,iF('D1')?'#252525':'#ffdd44');

  // POT wiper → P2/6
  sw(500,345,380,345,pg());sw(380,345,380,380,pg());sdot(380,380,pg());
  slbl(440,337,'wiper→P2/6',pg(),6.5);

  // C3 → P2/6
  sw(660,390,660,380,iF('CT')?'#333':'#ff6b00');sw(660,380,410,380,iF('CT')?'#333':'#ff6b00');
  sw(660,402,660,530,'#1a4a1a');sdot(660,530,'#1a4a1a');
  slbl(535,371,'C3→P2/6',iF('CT')?'#333':'#ff6b00',6.5);

  // C4 → P5
  sw(710,390,710,V5Y,p5());sdot(710,V5Y,p5());
  sw(710,402,710,530,'#1a4a1a');sdot(710,530,'#1a4a1a');
  sw(710,390,410,390,p5());
  slbl(560,381,'C4→P5',p5(),6.5);

  // P3 → fans
  sw(350,420,350,V12Y+15,p3c);sw(350,V12Y+15,810,V12Y+15,p3c);
  slbl(580,V12Y+23,'P3→PWM→Fan Pin4',p3c,6.5);

  // Per-fan drops
  [180,230,280,330,380,430].forEach((fx,i)=>{
    sw(fx,V12Y,fx,92,pF()+'aa',false);
    sw(fx,V12Y+15,fx,92,p3c+'aa',false);
    sw(fx,128,fx,530,'#1a4a1a',false);
    sfan(fx,110,i+1,spd);
  });

  // SATA connector
  sctx.save();sctx.strokeStyle=dead?'#333':'#ff6b00';sctx.lineWidth=1.5;sctx.fillStyle='#020802';
  sctx.shadowColor=dead?'#333':'#ff6b00';sctx.shadowBlur=dead?2:8;
  sctx.beginPath();sctx.roundRect(SX(40),SY(85),SS(76),SS(26),SS(2));sctx.fill();sctx.stroke();
  slbl(78,98,'SATA POWER',dead?'#333':'#ff6b00',7);sctx.restore();

  // Barrel jack
  sctx.save();sctx.strokeStyle=dead?'#333':'#ff6b00';sctx.lineWidth=2;sctx.fillStyle='#020802';
  sctx.shadowColor=dead?'#333':'#ff6b00';sctx.shadowBlur=dead?2:10;
  sctx.beginPath();sctx.arc(SX(80),SY(420),SS(18),0,Math.PI*2);sctx.fill();sctx.stroke();
  sctx.beginPath();sctx.arc(SX(80),SY(420),SS(7),0,Math.PI*2);sctx.stroke();
  sctx.fillStyle=dead?'#333':'#ff6b00';sctx.beginPath();sctx.arc(SX(80),SY(420),SS(3.5),0,Math.PI*2);sctx.fill();
  slbl(80,443,'12V BARREL',dead?'#333':'#ff6b00',6.5);sctx.restore();

  sbox(200,390,26,14,'F1','5A','#ff6b00',iF('FUSE')||iF('C1'));
  sbox(680,300,50,34,'78L05','5V REG','#44aaff',iF('REG'));

  // Pot
  sctx.save();
  sctx.strokeStyle='#2a5a2a';sctx.lineWidth=1;sctx.fillStyle='#020802';
  sctx.beginPath();sctx.arc(SX(500),SY(310),SS(32),0,Math.PI*2);sctx.fill();sctx.stroke();
  sctx.strokeStyle='#00ff41';sctx.shadowColor='#00ff41';sctx.shadowBlur=6;
  sctx.beginPath();sctx.roundRect(SX(482),SY(292),SS(36),SS(36),SS(3));sctx.fill();sctx.stroke();
  const pang=(135+potV*270)*Math.PI/180;
  sctx.lineWidth=2;sctx.beginPath();sctx.moveTo(SX(500),SY(310));
  sctx.lineTo(SX(500)+Math.cos(pang)*SS(14),SY(310)+Math.sin(pang)*SS(14));sctx.stroke();
  sctx.fillStyle='#00ff41';sctx.beginPath();sctx.arc(SX(500),SY(310),SS(2.5),0,Math.PI*2);sctx.fill();
  slbl(500,347,'RV1 90kΩ','#2a5a2a',6.5);sctx.restore();

  // LED
  const ledOn=f.ledOn;
  sctx.save();sctx.strokeStyle=ledOn?'#00ff41':'#1a3a1a';sctx.fillStyle=ledOn?'rgba(0,255,65,0.12)':'#020802';
  sctx.shadowColor=ledOn?'#00ff41':'#1a3a1a';sctx.shadowBlur=ledOn?12:2;
  sctx.beginPath();sctx.arc(SX(610),SY(130),SS(8),0,Math.PI*2);sctx.fill();sctx.stroke();
  if(ledOn){sctx.fillStyle='#00ff41';sctx.beginPath();sctx.arc(SX(610),SY(130),SS(3),0,Math.PI*2);sctx.fill();}
  slbl(610,113,'LED1',ledOn?'#00ff41':'#1a3a1a',6.5);sctx.restore();

  // SMD passives
  ssmd(610,180,'R3','#00ff41',iF('R3'));slbl(610,194,'R3 4.7k','#2a5a2a',6.5);
  ssmd(610,225,'R1','#44aaff',iF('R1'));slbl(610,238,'R1 1kΩ','#2a5a2a',6.5);
  ssmd(660,180,'C2','#44aaff',iF('C2')&&f.v5===0,iF('C2')&&f.v5>0);slbl(660,194,'C2 .33µF','#2a5a2a',6.5);
  ssmd(660,225,'C1','#44aaff',iF('C1'));slbl(660,238,'C1 .22µF','#2a5a2a',6.5);
  ssmd(490,480,'R2','#ffdd44',iF('R2'));slbl(490,493,'R2 1kΩ','#2a5a2a',6.5);
  ssmd(660,390,'C3','#ff6b00',iF('CT'));slbl(660,403,'C3 33nF','#2a5a2a',6.5);
  ssmd(710,390,'C4','#00ff41');slbl(710,403,'C4 10nF','#2a5a2a',6.5);

  // Diodes
  sdio(490,430,'#ffdd44',iF('D1'));slbl(490,445,'D1','#ffdd44',6.5);
  sdio(560,430,'#ffdd44',iF('D2'));slbl(560,445,'D2','#ffdd44',6.5);

  // NE555 IC
  const ic555fault=iF('IC555');
  const icc=ic555fault?'#ff4444':'#00ff41';
  sctx.save();sctx.strokeStyle=icc;sctx.lineWidth=Math.max(1,SS(1.5));sctx.fillStyle='#020802';
  sctx.shadowColor=icc;sctx.shadowBlur=ic555fault?14:8;
  sctx.beginPath();sctx.roundRect(SX(350),SY(380),SS(60),SS(80),SS(3));sctx.fill();sctx.stroke();
  sctx.fillStyle='#020802';sctx.strokeStyle='#1a4a1a';sctx.lineWidth=1;
  sctx.beginPath();sctx.arc(SX(380),SY(380),SS(5),0,Math.PI);sctx.fill();sctx.stroke();
  slbl(380,370,'NE555',icc,8);slbl(380,361,'U1','#2a5a2a',6.5);
  if(ic555fault)slbl(380,420,'✗FAULT','#ff4444',7);
  else{[['1',357,388],['2',357,398],['3',357,408],['4',357,418],
    ['8',403,388],['7',403,398],['6',403,408],['5',403,418]
  ].forEach(([t,px,py])=>{
    sctx.save();sctx.fillStyle='#2a5a2a';sctx.font=`${Math.max(5,SS(6))}px Share Tech Mono`;
    sctx.textAlign='center';sctx.textBaseline='middle';sctx.fillText(t,SX(px),SY(py));sctx.restore();
  });}
  sctx.restore();

  // Board label
  sctx.save();sctx.strokeStyle='#1a4a1a';sctx.lineWidth=1;sctx.strokeRect(SX(720),SY(45),SS(75),SS(40));
  slbl(757,55,'UENORTH','#2a5a2a',7);slbl(757,65,'FAN-K11','#2a5a2a',8);sctx.restore();

  simTick++;
}
