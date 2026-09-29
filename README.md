# Visualizador de carga de ruedas

Visualizador 3D y validador para la práctica de metaheurísticas.

- [Guía de uso para alumnos](GUIA-ALUMNOS.md)
- [Publicación paso a paso](PUBLICAR.md)

La especificación técnica original se conserva a continuación.

# Tyre packing viewer

Support tool for a metaheuristics assignment: pack tyres (solid cylinders) into a truck so that **free space is minimised**. Students implement the solvers. This repository validates a solution JSON, reports the official metric, and visualises the packing.

## Problem

Select and place tyres from a fixed inventory into a rectangular cargo box. Loading every available tyre is optional. The only objective is to **minimise free space**.

Tyres are **solid cylinders**. The inner hole is not free space and cannot hold another tyre. Gravity is ignored: floating is feasible, but the gap counts as waste.

### Truck and types

The official instance is [`problem.json`](problem.json), using the values specified in the assignment.

| | value |
|---|---|
| Box | \(L=13.620\) m (X, cab → door), \(W=2.480\) m (Y), \(H=2.650\) m (Z) |
| Origin | inner bottom-left corner, looking toward the door |
| Position | `coord_x`, `coord_y`, `coord_z` are the **cylinder centre** (metres) |
| Tolerance \(\varepsilon\) | \(10^{-4}\) m |

| `type` | size | diameter (mm) | width (mm) | available |
|---|---|---:|---:|---:|
| `R1` | 165/70 R14 | 586.6 | 165 | 15 |
| `R2` | 195/65 R15 | 634.5 | 195 | 15 |
| `R3` | 205/55 R16 | 631.9 | 205 | 15 |
| `R4` | 225/75 R16C | 743.9 | 225 | 15 |
| `R5` | 235/65 R16C | 711.9 | 235 | 15 |
| `R6` | 275/70 R22.5 | 956.5 | 275 | 15 |
| `R7` | 315/70 R22.5 | 1012.5 | 315 | 15 |
| `R8` | 315/80 R22.5 | 1075.5 | 315 | 15 |
| `R9` | 385/65 R22.5 | 1072.0 | 385 | 15 |
| `R10` | 600/70 R30 | 1602.0 | 600 | 15 |
| `R11` | 650/65 R42 | 1911.8 | 650 | 15 |
| `R12` | 710/70 R42 | 2060.8 | 710 | 15 |

Internally, `problem.json` stores all lengths in metres and each tyre's outer radius as half its nominal diameter.

### Orientations

Only three axis-aligned orientations:

| `orientation` | cylinder axis | occupancy |
|---|---|---|
| `flat` | Z | \(2r \times 2r \times h\) |
| `parallel_to_end` | X (face parallel to the cab/door) | \(h \times 2r \times 2r\) |
| `parallel_to_side` | Y (face parallel to the side wall) | \(2r \times h \times 2r\) |

### Feasibility

A solution is feasible if and only if:

1. Every `type` and `orientation` is valid
2. No tyre type exceeds its 15 available units
3. Every cylinder lies entirely inside the box (touching a wall is fine)
4. Cylinder **interiors** do not overlap (touching is fine)

### Objective

If the solution is feasible:

\[
V_{\text{free}} = LWH - \sum_i \pi r_{t_i}^2 h_{t_i}
\]

Lower is better. Density is \(1 - V_{\text{free}}/(LWH)\). If anything overlaps, the solution is **invalid** and free space is not reported (overlapping volume must not be counted twice).

## Solution JSON

Either a raw array:

```json
[
  {
    "coord_x": 1.234,
    "coord_y": 0.500,
    "coord_z": 0.1025,
    "type": "R3",
    "orientation": "flat"
  }
]
```

or a labelled object:

```json
{
  "metaheuristic": "SA",
  "placements": [ ]
}
```

## Run the viewer

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Drop a solution JSON onto the page, or use the example buttons.

```bash
npm test      # geometry + validator checks
npm run build # production build
```

## Assignment (students)

Implement **two or three metaheuristics** (for example SA, GRASP, GA, VNS) on this instance.

A useful representation is a **sequence of (type, orientation)** plus a **constructive decoder** that places each tyre (bottom-left-fill, skyline, grid, …). Searching raw \((x,y,z)\) in \(\mathbb{R}^3\) is a much harder search space.

Submit:

1. One JSON file per algorithm (feasible packing)
2. A short report: idea, parameters, and a table of \(V_{\text{free}}\)

You do not need to build a visualiser. Use this one to debug.

Grading of the packing: (1) valid feasible JSON, (2) lower free space is better, (3) quality of the report and comparison between algorithms.

## Repository layout

| path | role |
|---|---|
| `problem.json` | official truck and tyre types |
| `src/geometry.ts` | cylinders, bounds, overlap |
| `src/validate.ts` | JSON schema + metric |
| `src/viewer.ts` | Three.js scene |
| `fixtures/valid.json` | small feasible example |
| `fixtures/overlap.json` | overlapping example |
