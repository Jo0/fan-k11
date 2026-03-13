## GitHub Pages Site

An interactive documentation site is hosted at: **https://jo0.github.io/fan-k11/**

The site includes:
- Circuit overview and signal path description
- Per-network cards explaining Power Input, Voltage Regulation, Power Indicator, PWM Oscillator, and Fan Output
- **Interactive schematic** — animated canvas simulation with a fault selector (15 fault modes) and potentiometer slider
- Fault guide with symptom quick-reference cards and measurement tables
- Repair log documenting the specific faults found on these two units

### Site file structure

```
fan-k11/
├── index.html          # Markup, layout, section structure
├── css/
│   └── style.css       # All styles, fluid type scale, responsive layout
└── js/
    ├── data.js         # FAULTS data, component definitions
    ├── draw.js         # Canvas drawing primitives + main drawSim()
    ├── sim.js          # Simulation state, controls, sidebar, animation loop
    ├── mini.js         # Mini circuit diagrams for network cards
    ├── thumb.js        # Hero section PCB thumbnail sketch
    └── nav.js          # Scroll-spy nav active state
```

**Script load order in index.html must be:** `data.js` → `draw.js` → `sim.js` → `mini.js` → `thumb.js` → `nav.js`

`draw.js` must load before `sim.js` because `sim.js` calls `drawSim()` at boot.

### Fault simulation modes

The interactive schematic supports 15 fault scenarios selectable from a dropdown:

`ok` · `ctiming_open` · `ctiming_short` · `fuse_blown` · `reg_dead` · `c1_short` · `c2_open` · `c2_short` · `r1_open` · `r2_open` · `d1_open` · `d2_open` · `ne555_dead` · `pin4_low` · `r3_open` · `led_short`

Each mode shows animated voltage states on the schematic, updates the sidebar with live node voltages, animates fans at the correct speed, and displays a diagnosis banner explaining the fault and fix.
