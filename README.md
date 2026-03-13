# UENORTH FAN-K11 — Reverse Engineering & Circuit Documentation

A complete reverse-engineered circuit analysis of the **UENORTH FAN-K11**, a 6-port 4-pin PWM fan controller. This repo contains the circuit documentation, confirmed fault analysis, repair notes, and an interactive GitHub Pages site for troubleshooting.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/P5P21VW0S3)

---
## GitHub Pages Site

An interactive documentation site is hosted at: **https://jo0.github.io/fan-k11/**

The site includes:
- Circuit overview and signal path description
- Per-network cards explaining Power Input, Voltage Regulation, Power Indicator, PWM Oscillator, and Fan Output
- **Interactive schematic** — animated canvas simulation with a fault selector (15 fault modes) and potentiometer slider
- Fault guide with symptom quick-reference cards and measurement tables
- Repair log documenting the specific faults found on these two units

---

## The Board

The FAN-K11 accepts 12V power via SATA connector or DC barrel jack and provides six 4-pin PWM fan headers, all driven simultaneously by a single NE555 timer IC. Fan speed is controlled by a single rotary potentiometer.

**Key specs:**
- Input: 12V via SATA (pin 13) or DC barrel jack
- Output: 6× 4-pin PWM headers
- PWM frequency: ~22kHz (within Intel 4-pin spec of 21–28kHz)
- Potentiometer range: ~3.8kΩ to 89.8kΩ (~90kΩ)
- Logic supply: 5V via 78L05 linear regulator

---

## Reverse-Engineered Circuit

The circuit has four functional networks:

### 1. Power Input
12V from SATA or barrel jack → fuse F1 (5A) → 12V rail. Both inputs are tied together before the fuse — only one needs to be connected. C1 (0.22µF) bypasses the 12V rail at the regulator input. The 12V rail feeds fan Pin 1 on all six headers directly.

### 2. Voltage Regulation
78L05 linear regulator steps 12V → 5V. C2 (0.33µF) decouples the output rail. This 5V rail powers the NE555 (Pin 8 / Pin 4) and the power indicator LED branch.

### 3. Power Indicator
5V → R3 (4.7kΩ) → LED1 → GND. LED is on whenever 5V rail is present. Fully independent of the PWM oscillator — a fault here is purely cosmetic.

### 4. PWM Oscillator
NE555 configured in astable mode. Pin 3 output drives all six fan headers (Pin 4 / PWM signal).

**Timing:** frequency ≈ 1.44 / ((R1 + R2) × C3) ≈ 22kHz

**Duty cycle control:** D1 and D2 steer charge/discharge paths through the potentiometer, allowing the duty cycle to vary from ~10% to ~90% as the pot is turned.

**Key node — Pin 7 (DIS):** R1 (1kΩ), D1 anode, and one pad of R2 all share the same physical PCB pad. This is the junction node for the timing network.

**Potentiometer wiring:** Left leg and wiper are shorted together on the PCB, forming a 2-terminal rheostat. Left/wiper → D1 cathode. Right leg → D2 anode.

**Complete component list:**

| Ref | Value | Function |
|-----|-------|----------|
| F1  | 5A fuse | Overcurrent protection |
| C1  | 0.22µF | 12V rail input bypass |
| U1  | 78L05 | 12V → 5V linear regulator |
| C2  | 0.33µF | 5V rail output decoupling |
| R3  | 4.7kΩ | LED current limiter |
| LED1 | — | Power indicator |
| U2  | NE555 | PWM oscillator |
| R1  | 1kΩ | Charge path / Pin 7 node |
| R2  | 1kΩ | Discharge path |
| C3  | 33nF | Timing capacitor (Pin 2/6 to GND) |
| C4  | 10nF | CV pin bypass (Pin 5) |
| D1  | Signal diode | Charge path steering |
| D2  | Signal diode | Discharge path steering |
| RV1 | ~90kΩ pot | Duty cycle / speed control |
| J1–J6 | 4-pin headers | Fan outputs |

---

## Component Connections — Full Netlist

This section is the canonical reference for building or validating the simulation. Every connection is derived from physical PCB trace-out. Component IDs match `data.js` / `draw.js`.

### Rails

| Rail | Source | Destinations |
|------|--------|-------------|
| 12V | SATA pin 13 **or** BARREL tip (both inputs tie together before F1) | → F1 (fuse) input |
| 12V (post-fuse) | F1 output | → REG Vin, C1 top pad, all 6× FAN Pin 1 |
| 5V | REG Vout | → C2 top pad, R1 top pad, R3 top pad, NE555 Pin 8, NE555 Pin 4 |
| GND | SATA pins 4/5/6/10/11/12, BARREL sleeve | → C1 bottom pad, C2 bottom pad, C3 bottom pad, C4 bottom pad, LED1 cathode, NE555 Pin 1, GND rail |

### Power Input Network

```
SATA (Pin 13) ─┐
               ├──► F1 (5A fuse) ──► 12V post-fuse rail
BARREL (tip)  ─┘

SATA (GND pins) ─┐
                 └──► Common GND rail
BARREL (sleeve) ─┘
```

### Voltage Regulation Network

```
12V post-fuse ──► C1 (0.22µF, top pad) ──► 78L05 Vin (Pin 1)
                  C1 bottom pad ──► GND

78L05 Vout (Pin 3) ──► 5V rail
                   ──► C2 (0.33µF, top pad)
                       C2 bottom pad ──► GND

78L05 GND (Pin 2) ──► GND
```

### Power Indicator Network

```
5V ──► R3 (4.7kΩ) ──► LED1 anode
                       LED1 cathode ──► GND
```

### PWM Oscillator Network

This is the most complex network. Diode orientations were confirmed by hand with a multimeter diode test during reverse engineering.

#### Charge path
```
5V ──► R1 (1kΩ) ──► NE555 Pin 7 (DIS)
```

#### Discharge path
```
NE555 Pin 7 ──► R2 (1kΩ) ──► D2 cathode
                               D2 anode ──► POT right leg
```

**D2 orientation (hand-confirmed):** anode into the right leg of the pot, cathode toward R2/Pin 7.

#### Pot to Pin 2/6 (timing node)
```
POT left leg ──► D1 anode
POT wiper    ──► D1 anode  (left leg and wiper confirmed shorted together on PCB)
                 D1 cathode ──► NE555 Pin 2/6
```

**D1 orientation (hand-confirmed):** anode into the left leg + wiper of the pot, cathode toward Pin 2/6.

```
POT wiper ──► NE555 Pin 2/6  (direct connection in parallel with D1 cathode)
```

#### Timing capacitor — C3
```
NE555 Pin 2/6 ──► C3 (33nF, top pad)
                   C3 bottom pad ──► GND
```

#### Control voltage bypass — C4
```
NE555 Pin 5 (CV) ──► C4 (10nF, top pad)
                      C4 bottom pad ──► GND
```

#### NE555 supply and reset
```
5V ──► NE555 Pin 8 (Vcc)
5V ──► NE555 Pin 4 (RST)   ← tied permanently HIGH
NE555 Pin 1 (GND) ──► GND
```

#### PWM output
```
NE555 Pin 3 (OUT) ──► FAN1–FAN6 Pin 4 (all six in parallel)
```

### Fan Headers (×6, identical wiring)

| Fan Pin | Connection |
|---------|-----------|
| Pin 1 (12V) | 12V post-fuse rail |
| Pin 2 (GND) | GND rail |
| Pin 3 (Tach) | **Not connected** |
| Pin 4 (PWM) | NE555 Pin 3 output |

### Potentiometer (RV1, ~90kΩ)

Left leg and wiper are **shorted together on the PCB**. Confirmed by physical trace. Functions as a 2-terminal variable resistor.

| Terminal | Connection |
|----------|-----------|
| Left leg | D1 anode (shorted to wiper) |
| Wiper | D1 anode + NE555 Pin 2/6 (direct) |
| Right leg | D2 anode |

### Complete node summary

| Node | Connected components |
|------|---------------------|
| 12V pre-fuse | SATA Pin 13, BARREL tip, F1 input |
| 12V post-fuse | F1 output, REG Vin, C1 top, FAN×6 Pin 1 |
| 5V | REG Vout, C2 top, R1 top, R3 top, NE555 Pin 8, NE555 Pin 4 |
| GND | C1 bottom, C2 bottom, C3 bottom, C4 bottom, LED1 cathode, NE555 Pin 1, FAN×6 Pin 2, SATA/BARREL GND pins |
| NE555 Pin 7 | R1 bottom, R2 top |
| D2 anode / POT right leg | D2 anode, POT right leg |
| D2 cathode | R2 bottom |
| D1 anode / POT left+wiper | D1 anode, POT left leg, POT wiper |
| Pin 2/6 node | D1 cathode, POT wiper (direct), C3 top, NE555 Pin 2, NE555 Pin 6 |
| Pin 5 (CV) | C4 top, NE555 Pin 5 |
| Pin 3 (PWM out) | NE555 Pin 3, FAN×6 Pin 4 |

---

## Diagnostic Procedure

**Tools needed:** Multimeter with continuity, DC voltage, capacitance, and diode test modes.

### Quick symptom triage

| Symptom | First checks |
|---------|-------------|
| Board completely dead — no LED, no fans | F1 (blown fuse) or C1 (shorted) |
| LED off, fans full speed | 78L05 dead, or C2 shorted |
| LED on, fans full speed, pot does nothing | C3 open or NE555 dead |
| LED on, fans stopped, pot does nothing | C3 shorted, R1 open, or Pin 4 pulled low |
| Pot has reduced range | D1 or D2 leaky — diode test both |
| Fan speed hunts / fluctuates randomly | C2 open (noisy 5V), or C4 open (noisy CV pin) |
| LED dark, everything else normal | R3 open or LED1 dead — cosmetic only |

### Voltage checkpoints (board powered)

| Test point | Expected | Notes |
|------------|----------|-------|
| 12V rail (post-fuse) | 11.8–12.2V | At F1 output pad |
| NE555 Pin 8 (Vcc) | 4.9–5.1V | = 78L05 Vout |
| NE555 Pin 4 (RST) | 4.9–5.1V | Must be high for oscillation |
| NE555 Pin 2/6 (healthy) | 1.7–3.3V oscillating | Stuck = fault |
| NE555 Pin 3 (healthy) | ~2.5V average | Stuck high or low = fault |
| NE555 Pin 5 (CV) | ~3.3V | Should be stable ⅔ × Vcc |

### Diode test (power off)

| Result | Meaning |
|--------|---------|
| Forward ~0.6V, Reverse OL | Healthy |
| Forward ~0.6V, Reverse any reading | Leaky — replace |
| Forward OL | Open — replace |
| Forward ~0V both directions | Shorted — replace |

---