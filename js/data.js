// ─────────────────────────────────────────────────────────────────────────────
// data.js — FAN-K11 circuit data
// Edit this file to add/change components, wires, positions, or fault scenarios
// ─────────────────────────────────────────────────────────────────────────────

// ── Component definitions ─────────────────────────────────────────────────────
// shape options: rect | circle | dip8 | smd | diode | pot | fan
const COMP_DEFS = [
  { id:'SATA',   label:'SATA',    sub:'Power Input',       color:'#ff6b00', shape:'rect',   w:80, h:30 },
  { id:'BARREL', label:'BARREL',  sub:'12V DC Jack',       color:'#ff6b00', shape:'circle', w:40, h:40 },
  { id:'FUSE',   label:'F1',      sub:'5A Fuse',           color:'#ff6b00', shape:'rect',   w:36, h:18 },
  { id:'REG',    label:'78L05',   sub:'5V Regulator',      color:'#44aaff', shape:'rect',   w:50, h:34 },
  { id:'IC555',  label:'NE555',   sub:'U1 Timer IC',       color:'#00ff41', shape:'dip8',   w:60, h:80 },
  { id:'POT',    label:'RV1',     sub:'90kΩ Pot',          color:'#00ff41', shape:'pot',    w:70, h:70 },
  { id:'LED',    label:'LED1',    sub:'Power LED',         color:'#00ff41', shape:'circle', w:18, h:18 },
  { id:'R1',     label:'R1',      sub:'1kΩ',               color:'#44aaff', shape:'smd',    w:24, h:12 },
  { id:'R2',     label:'R2',      sub:'1kΩ',               color:'#ffdd44', shape:'smd',    w:24, h:12 },
  { id:'R3',     label:'R3',      sub:'4.7kΩ LED',         color:'#00ff41', shape:'smd',    w:24, h:12 },
  { id:'C1',     label:'C1',      sub:'0.22µF Vin byp',    color:'#44aaff', shape:'smd',    w:20, h:12 },
  { id:'C2',     label:'C2',      sub:'0.33µF Vout',       color:'#44aaff', shape:'smd',    w:20, h:12 },
  { id:'CT',     label:'C3',      sub:'33nF timing',       color:'#ff6b00', shape:'smd',    w:20, h:12 },
  { id:'CV',     label:'C4',      sub:'10nF CV bypass',    color:'#00ff41', shape:'smd',    w:20, h:12 },
  { id:'D1',     label:'D1',      sub:'A→P7 K→L+wiper',   color:'#ffdd44', shape:'diode',  w:20, h:14 },
  { id:'D2',     label:'D2',      sub:'A→PotR K←R2',      color:'#ffdd44', shape:'diode',  w:20, h:14 },
  { id:'FAN1',   label:'FAN1',    sub:'4-pin PWM',         color:'#00ff41', shape:'fan',    w:32, h:42 },
  { id:'FAN2',   label:'FAN2',    sub:'4-pin PWM',         color:'#00ff41', shape:'fan',    w:32, h:42 },
  { id:'FAN3',   label:'FAN3',    sub:'4-pin PWM',         color:'#00ff41', shape:'fan',    w:32, h:42 },
  { id:'FAN4',   label:'FAN4',    sub:'4-pin PWM',         color:'#00ff41', shape:'fan',    w:32, h:42 },
  { id:'FAN5',   label:'FAN5',    sub:'4-pin PWM',         color:'#00ff41', shape:'fan',    w:32, h:42 },
  { id:'FAN6',   label:'FAN6',    sub:'4-pin PWM',         color:'#00ff41', shape:'fan',    w:32, h:42 },
];

// ── Component positions ───────────────────────────────────────────────────────
// Virtual 840×560 coordinate space. Adjust to match PCB layout.
const POSITIONS = {
  SATA:   { x: 80,  y: 100 },
  BARREL: { x: 80,  y: 420 },
  FUSE:   { x: 200, y: 390 },
  REG:    { x: 680, y: 300 },
  IC555:  { x: 380, y: 420 },
  POT:    { x: 500, y: 310 },
  LED:    { x: 610, y: 130 },
  R3:     { x: 610, y: 180 },
  R1:     { x: 610, y: 225 },
  C2:     { x: 660, y: 180 },
  C1:     { x: 660, y: 225 },
  CT:     { x: 660, y: 390 },
  CV:     { x: 710, y: 390 },
  D1:     { x: 490, y: 430 },
  D2:     { x: 560, y: 430 },
  R2:     { x: 490, y: 480 },
  FAN1:   { x: 180, y: 110 },
  FAN2:   { x: 230, y: 110 },
  FAN3:   { x: 280, y: 110 },
  FAN4:   { x: 330, y: 110 },
  FAN5:   { x: 380, y: 110 },
  FAN6:   { x: 430, y: 110 },
};

// ── Wire connections ──────────────────────────────────────────────────────────
// Format: [fromId, toId, color, label]
// Label on first wire of a group only — leave '' for unlabeled duplicates
//
// Corrected topology (verified by physical trace-out):
//
//  12V: SATA/BARREL → FUSE → REG Vin, C1, FAN Pin1 ×6
//  5V:  REG Vout → R1, R3, C2, IC555 P8+P4
//  LED: 5V → R3 → LED → GND
//  P7 node: R1 out pad shared with D1 Anode and one pad of R2, all → IC555 P7
//  Timing: R2 → D2K, D2A → POT right leg
//          POT left+wiper shorted together → D1 Cathode
//          POT wiper → IC555 P2/6
//          C3 → IC555 P2/6 (other pad GND)
//          C4 → IC555 P5  (other pad GND)
//  PWM out: IC555 P3 → FAN Pin4 ×6
const WIRES = [
  // ── 12V input ──
  ['SATA',  'FUSE',   '#ff6b00', '12V'],
  ['BARREL','FUSE',   '#ff6b00', '12V'],

  // ── Post-fuse 12V rail → REG, C1, fans ──
  ['FUSE',  'REG',    '#ff6b00', 'Vin'],
  ['FUSE',  'C1',     '#ff6b00', 'Vin'],
  ['FUSE',  'FAN1',   '#ff6b00', '12V→Pin1'],
  ['FUSE',  'FAN2',   '#ff6b00', ''],
  ['FUSE',  'FAN3',   '#ff6b00', ''],
  ['FUSE',  'FAN4',   '#ff6b00', ''],
  ['FUSE',  'FAN5',   '#ff6b00', ''],
  ['FUSE',  'FAN6',   '#ff6b00', ''],

  // ── 5V rail from REG Vout ──
  ['REG',   'R1',     '#44aaff', 'Vout→R1'],
  ['REG',   'R3',     '#44aaff', 'Vout→R3'],
  ['REG',   'C2',     '#44aaff', 'Vout→C2'],
  ['REG',   'IC555',  '#44aaff', 'Vout→P8/P4'],
  ['REG',   'IC555',  '#44aaff', ''],              // Pin4 RST held high (same source)

  // ── LED branch: Vout → R3 → LED → GND ──
  ['R3',    'LED',    '#00ff41', 'R3→LED'],

  // ── Pin7 shared node: R1 out, R2 one pad, D1 Anode all share same physical pad ──
  ['R1',    'IC555',  '#44aaff', 'R1,R2,D1A→P7'],
  ['R1',    'D1',     '#44aaff', ''],              // R1 and D1 Anode share the same pad
  ['R2',    'IC555',  '#44aaff', ''],              // R2 also goes to P7

  // ── Discharge path: P7 → R2 → D2 Cathode → D2 Anode → POT right leg ──
  ['R2',    'D2',     '#ffdd44', 'R2→D2K'],
  ['D2',    'POT',    '#ffdd44', 'D2A→PotR'],

  // ── Charge path: POT left+wiper (shorted together) → D1 Cathode ──
  ['POT',   'D1',     '#ffdd44', 'L+wiper→D1K'],

  // ── Pin2/6 timing node: POT wiper + C3 ──
  ['POT',   'IC555',  '#00ff41', 'wiper→P2/6'],
  ['CT',    'IC555',  '#ff6b00', 'C3→P2/6'],

  // ── C4 CV bypass ──
  ['CV',    'IC555',  '#00ff41', 'C4→P5'],

  // ── PWM output to all fans ──
  ['IC555', 'FAN1',   '#00ff41', 'P3→PWM'],
  ['IC555', 'FAN2',   '#00ff41', ''],
  ['IC555', 'FAN3',   '#00ff41', ''],
  ['IC555', 'FAN4',   '#00ff41', ''],
  ['IC555', 'FAN5',   '#00ff41', ''],
  ['IC555', 'FAN6',   '#00ff41', ''],
];

// ── Fault scenario definitions ────────────────────────────────────────────────
// sev:     ok | warn | err | dead
// faults:  array of component IDs to highlight as faulted on the schematic
// fanMode: pot | full | off | halfrange | limited | erratic
// p3:      pwm | high | low | zero | noisy | limited | half_high | half_low
const FAULTS = {
  ok: {
    sev:'ok', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'pwm', fanMode:'pot', ledOn:true, faults:[],
    desc:'✓ All systems nominal<br>PWM ~22kHz oscillating<br>Pot controls fan speed',
  },

  // ── Power stage ──────────────────────────────────────────────────────────
  fuse_blown: {
    sev:'dead', vin:0, v5:0, v8:0, v5cv:0,
    p3:'zero', fanMode:'off', ledOn:false, faults:['FUSE'],
    desc:'✗ FUSE BLOWN<br>Total power loss<br>No fans, no LED<br><br>Find short before replacing fuse',
  },
  reg_dead: {
    sev:'err', vin:12, v5:0, v8:0, v5cv:0,
    p3:'high', fanMode:'full', ledOn:false, faults:['REG'],
    desc:'✗ 78L05 DEAD<br>5V rail = 0V<br>Fans full speed, LED off<br><br>Replace 78L05',
  },
  c1_short: {
    sev:'dead', vin:0, v5:0, v8:0, v5cv:0,
    p3:'zero', fanMode:'off', ledOn:false, faults:['C1','FUSE'],
    desc:'✗ C1 SHORTED<br>12V rail → GND, fuse blows<br>Total power loss<br><br>Replace C1 then fuse',
  },
  c2_open: {
    sev:'warn', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'noisy', fanMode:'erratic', ledOn:true, faults:['C2'],
    desc:'⚠ C2 OPEN<br>5V rail noisy, unfiltered<br>Fan speed hunts randomly<br><br>Replace C2 (0.33µF 0603)',
  },
  c2_short: {
    sev:'err', vin:12, v5:0, v8:0, v5cv:0,
    p3:'high', fanMode:'full', ledOn:false, faults:['C2','REG'],
    desc:'✗ C2 SHORTED<br>5V rail collapses<br>Fans full speed, 78L05 hot<br><br>Replace C2, check 78L05',
  },

  // ── PWM oscillator ───────────────────────────────────────────────────────
  ctiming_open: {
    sev:'err', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'high', fanMode:'full', ledOn:true, faults:['CT'],
    desc:'✗ C3 OPEN — THIS UNIT<br>Pin 2/6 stuck HIGH<br>Pin 3 locked HIGH<br>Fans full speed, pot dead<br><br>Replace C3 (33nF 0603)',
  },
  ctiming_short: {
    sev:'err', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'low', fanMode:'off', ledOn:true, faults:['CT'],
    desc:'✗ C3 SHORTED<br>Pin 2/6 clamped LOW<br>Pin 3 stuck LOW<br>Fans completely stopped<br><br>Replace C3 (33nF 0603)',
  },
  r1_open: {
    sev:'err', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'low', fanMode:'off', ledOn:true, faults:['R1'],
    desc:'✗ R1 OPEN<br>No charge path to C3<br>Pin 3 stuck LOW<br>Fans stopped<br><br>Replace R1 (1kΩ 0402)',
  },
  r2_open: {
    sev:'warn', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'limited', fanMode:'limited', ledOn:true, faults:['R2'],
    desc:'⚠ R2 OPEN<br>Discharge path broken<br>Pot range severely limited<br>Speed stuck near minimum<br><br>Replace R2 (1kΩ 0402)',
  },
  d1_open: {
    sev:'warn', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'half_high', fanMode:'halfrange', ledOn:true, faults:['D1'],
    desc:"⚠ D1 LEAKY/OPEN — THIS UNIT<br>Measured 2.3V reverse (should OL)<br>Pot range compressed<br>Can't reach low speed<br><br>Replace D1 (1N4148 SOD-123)",
  },
  d2_open: {
    sev:'warn', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'half_low', fanMode:'halfrange', ledOn:true, faults:['D2'],
    desc:"⚠ D2 OPEN<br>Discharge path compressed<br>Can't reach high speed<br>Pot only controls lower half<br><br>Replace D2 (1N4148 SOD-123)",
  },
  ne555_dead: {
    sev:'err', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'high', fanMode:'full', ledOn:true, faults:['IC555'],
    desc:'✗ NE555 DEAD<br>Pin 3 stuck HIGH<br>Fans full speed, pot dead<br><br>Replace NE555 (DIP-8)',
  },
  pin4_low: {
    sev:'err', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'low', fanMode:'off', ledOn:true, faults:['IC555'],
    desc:'✗ PIN 4 RESET LOW<br>Output overridden LOW<br>Fans completely stopped<br><br>Check Pin 4 trace/solder',
  },

  // ── Indicator ────────────────────────────────────────────────────────────
  r3_open: {
    sev:'ok', vin:12, v5:4.97, v8:4.97, v5cv:3.31,
    p3:'pwm', fanMode:'pot', ledOn:false, faults:['R3'],
    desc:'⚠ R3 OPEN<br>LED dark — cosmetic only<br>Fan control fully normal<br><br>Replace R3 (4.7kΩ 0402)',
  },
  led_short: {
    sev:'warn', vin:12, v5:4.8, v8:4.8, v5cv:3.2,
    p3:'pwm', fanMode:'pot', ledOn:true, faults:['LED'],
    desc:'⚠ LED SHORTED<br>5V rail slightly loaded<br>R3 getting warm<br>Fan control degraded<br><br>Replace LED1',
  },
};
