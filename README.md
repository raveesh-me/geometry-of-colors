# Handoff: "The Geometry Behind Color Spaces" — interactive companion app

## Overview
An interactive, talk-companion experience that walks a developer audience from Newton's
color wheel to **perceptually uniform color spaces**, ending on **HSLuv** and the Flutter
`hsluv` package. It is a 2-D presentation: **swipe horizontally between topics, vertically
between demos within a topic**. Most topics carry one or more live, manipulable visualizers
(canvas-rendered) plus the underlying math.

The talk's narrative thread: *a color is a point in space; every model is a choice of axes
and a choice of scale on those axes.* The demos progressively reveal how we reshape an RGB
cube into a cylinder, why that fights human perception, and how CIELAB/CIELUV/HSLuv fix it.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype
showing the intended look, content, math, and interaction. They are **not production code to
copy line-for-line.**

The stated target is **Flutter (web + native)**. The task is to **recreate these designs in
Flutter**, using its idioms:
- Visualizers → `CustomPainter` / `CustomPaint` (the 2-D ones) and a small manual 3-D
  projector for the point-cloud scenes (or `flutter_scene`/a lightweight 3D lib if preferred).
- Color conversions → the **`hsluv` package** (`Hsluv.*` + `HSLuvColor`) for HSLuv/LCh/Luv,
  and the matrices/formulas in this README for sRGB↔XYZ↔Lab.
- Navigation → a 2-D `PageView` arrangement (a horizontal `PageView` of vertical `PageView`s),
  or a custom gesture + `AnimatedContainer`/transform.

`color-math.js` is the **authoritative algorithm reference** — it is small, dependency-free,
and every function maps directly to a Dart equivalent. Read it as the spec.

If you would rather ship the HTML itself (e.g. embed in a WebView or host the web build),
the prototype is fully functional standalone — see **Files** below.

## Fidelity
**High-fidelity.** Final colors, type, spacing, layout, copy, and interaction are all
intentional and should be reproduced faithfully. The watercolor aesthetic (paper ground,
blurred pigment washes, elegant serif display) is part of the brief.

---

## Navigation model
Content is a grid of **topics (columns) × demos (rows within a column)**. Topics do not all
have the same number of demos (ragged grid).

- **← / →** (or on-screen side arrows, or horizontal swipe): change **topic**. Vertical
  position within each topic is remembered independently.
- **↑ / ↓** (or vertical swipe): change **demo** within the current topic.
- A bottom-center **minimap** shows every cell as a dot (columns = topics, dots in a column =
  demos); the active dot is accented; click any dot to jump.
- Each cell is a full **100vw × 100vh** frame. Transitions: `transform` translate,
  `0.7s cubic-bezier(.65,0,.2,1)`.

Implementation in the prototype: an outer flex track translated in X by `topic`, and each
column's inner track translated in Y by its remembered demo index. In Flutter, a horizontal
`PageView` whose children are vertical `PageView`s reproduces this exactly.

### Topic / demo map (10 topics, 28 cells)
```
0  Title              0 Hero            1 Thesis / journey map
1  Newton             0 Color wheel     1 Additive light mixing
2  Axes & scales      0 Axis rescaling  1 2×2 matrix transform
3  RGB cube           0 3D cube         1 Blue-slice grid
4  Cube → cylinder    0 Cube↔cyl morph  1 HSL cylinder        2 HSL math card
5  CIE XYZ            0 Why XYZ (matrix)1 Chromaticity horseshoe 2 Inverse matrix
6  CIELAB / CIELUV    0 MacAdam ellipses 1 Lab formulas  2 Lab 3D solid  3 Equal-steps compare
7  Trouble with HSL   0 Same-L / brightness strips
8  HSLuv              0 Normalize idea  1 HSL vs HSLuv grid  2 Live picker  3 maxChroma math
9  In Flutter         0 hsluv package card
```

---

## Design tokens

### Color (CSS custom properties, see `:root` in the file)
| Token | Value | Use |
|---|---|---|
| `--paper` | `#f1ead9` | page background (warm paper) |
| `--paper2` | `#ebe2cd` | secondary paper |
| `--ink` | `#2b2720` | primary text / strokes |
| `--ink2` | `#736b5c` | secondary text, captions |
| `--line` | `rgba(43,39,32,.16)` | hairlines, borders |
| `--line2` | `rgba(43,39,32,.08)` | faint grid |
| `--accent` | `oklch(0.52 0.10 256)` ≈ `#3a5fae` | muted indigo — links, HSLuv emphasis |
| `--accent2` | `oklch(0.55 0.11 38)` ≈ `#b8693f` | muted terracotta — secondary emphasis |
| code panel bg | `#272320` | dark code blocks (Flutter slide) |

Watercolor washes: four large blurred (`blur(60px)`) radial-gradient blobs,
`opacity:.5`, `mix-blend-mode:multiply`, slowly drifting (`drift`/`drift2` keyframes,
26–38s). Pigment hues: `oklch(0.78–0.80 0.11–0.13 H)` for H ≈ 28 / 200 / 110 / 300.
Plus a faint SVG `feTurbulence` grain at `opacity:.5`, `mix-blend-mode:multiply`.

Visualizer colors are computed from the color-math functions, not hand-picked.

### Typography (Google Fonts)
| Role | Family | Weights | Notes |
|---|---|---|---|
| Display / headings | **Cormorant Garamond** | 500/600; italic for emphasis | serif, high-contrast, artistic |
| Body / UI | **Work Sans** | 300/400/500/600 | clean grotesque |
| Mono / math / code / labels | **Space Mono** | 400/700 | all kickers, readouts, formulas, axis labels |

Type scale (fluid `clamp`): hero `clamp(46px,6.6vw,108px)`; topic title
`clamp(28px,3.6vw,52px)`; lead `clamp(15px,1.2vw,20px)`; body `clamp(14px,1.05vw,17px)`;
kicker 12px mono, `letter-spacing:.28em`, uppercase, `--ink2`. Line-height ~1.0 for display,
1.6 for body.

### Spacing / shape
- Cell padding: `7vh 7vw 6vh` (viz cells), `7vh 9vw` (centered math cards).
- Aside column: `flex:0 0 ~30vw; max-width:440px`. Canvas wrap: `flex:1.1`.
- Card radius: 8–10px. Pills: 999px. Matrix brackets: 3–4px.
- Canvas card: `background:rgba(255,255,255,.4); border:1px solid var(--line); radius:8px`.
  Chromaticity/horseshoe cards use `#fbf7ee`. The additive-mixing card is `#0b0b0d` (dark).
- Range sliders: 3px track `--line`; 16px round thumb, paper fill, 1.5px `--ink` border.

---

## The color math (port target)
`color-math.js` exposes `window.ColorMath`. All RGB values are **0…1**. HSLuv/HSL: H 0–360,
S/L 0–100. Lab: L 0–100, a/b roughly −128…128.

**Matrices (D65):**
```
linear sRGB → XYZ                       XYZ → linear sRGB
[ 0.4124 0.3576 0.1805 ]                [  3.2406 -1.5372 -0.4986 ]
[ 0.2126 0.7152 0.0722 ]                [ -0.9689  1.8758  0.0415 ]
[ 0.0193 0.1192 0.9505 ]                [  0.0557 -0.2040  1.0570 ]
```
**Gamma (companding):** `toLinear(c) = c>0.04045 ? ((c+0.055)/1.055)^2.4 : c/12.92`;
`fromLinear` is the inverse. Apply on each channel; matrix works on **linear** light only.

**CIELAB** (white Xn,Yn,Zn = 0.95047, 1.0, 1.08883; ε=0.0088564516, κ=903.2962962):
`f(t)=∛t if t>ε else (κt+16)/116`; `L*=116·f(Y/Yn)−16`, `a*=500(f(X/Xn)−f(Y/Yn))`,
`b*=200(f(Y/Yn)−f(Z/Zn))`.

**CIELUV / LCh / HSLuv:** see `xyzToLuv`, `luvToLch`, and `maxChromaForLH(L,H)` (intersects
the hue ray with the six gamut-boundary lines; nearest hit = max chroma). HSLuv saturation is
`S = 100·C/Cmax(L,H)`.

**In Flutter use the package instead of re-deriving HSLuv:**
```dart
import 'package:hsluv/hsluv.dart';                 // pubspec: hsluv: ^1.1.3
final c   = HSLuvColor.fromHSL(14, 72, 62);        // H 0-360, S/L 0-100
final col = c.toColor();                            // Flutter Color
final hex = Hsluv.hsluvToHex([14, 72, 62]);
final hsl = Hsluv.hexToHsluv('#C96A3F');
// Also: Hsluv.rgbToXyz / xyzToLuv / luvToLch / maxChromaForLH etc. for the teaching demos.
```
**Gotcha:** Flutter's `HSLColor` uses S/L in 0…1; HSLuv uses 0…100.

---

## Screens / views — layout & behavior
Common cell scaffold: mono **kicker** (topic no. + name) → serif **title** → a flex row of a
**canvas card** (left, `flex:1.1`) and an **aside** (right) holding lead copy, controls, and a
readout strip. Math-card cells are centered, no canvas.

### 0 · Title
- **0.0 Hero**: left-aligned title block over a blurred **conic-gradient color ring** (the
  watercolor wheel) on the right — `conic-gradient(red→…→red)`, `blur(7px)`, ring mask
  `radial-gradient(transparent 33%, #000 34%)`. Mono kicker, hero title with italic
  "Color Spaces" in `--accent`, italic serif subtitle, two mono nav hints.
- **0.1 Thesis**: large serif statement; lead paragraph; a row of pills naming the journey
  (Newton → RGB cube → HSL cylinder → CIE XYZ → CIELAB/LUV → **HSLuv** [filled accent pill]).

### 1 · Newton
- **1.0 Color wheel** (`drawNewton`): per-pixel HSL wheel (angle=hue, radius=saturation,
  L=50), 7 white spoke lines + mono labels for Newton's named colors, thin ink rim.
- **1.1 Additive mixing** (`drawAdditive`): black card; three radial-gradient light disks
  (R,G,B) composited with `globalCompositeOperation='lighter'`; overlap → white. Three
  intensity sliders (`lightR/G/B`, 0–1); readouts show % and the resulting center hex.

### 2 · Axes & scales  *(the "demystify the math" foundation)*
- **2.0 Axis rescaling** (`drawAxisScale`): plot box, dashed identity line, curve `y=xᵞ` in
  accent. 11 equal **input** steps along the bottom project (faint right-angle leaders) onto
  the left axis, where they **bunch** — showing a nonlinear scale warps spacing. Slider
  `gamma` 0.3–3. Dots are colored greyscale = input value.
- **2.1 2×2 matrix** (`drawMatrix2d`): faint identity grid + transformed grid under
  `[[a,b],[c,d]]`; a transformed field of HSL-colored dots; red/blue basis-vector arrows
  (where the axes land). Four sliders a,b,c,d (−1.5…1.5). Live matrix readout in brackets.

### 3 · RGB cube
- **3.0 3D cube** (`drawCube`, point cloud): 7³ colored points at `(r−.5,g−.5,b−.5)`,
  drag-rotate, gentle auto-spin; mono R/G/B corner labels. See **3-D engine** below.
- **3.1 Blue slice** (`drawRgbSlice`): square grid, R across / G up, Blue fixed by slider
  `sliceB`; readout `B = 0–255`. "A cube is a stack of slices."

### 4 · Cube → cylinder
- **4.0 Morph** (`drawMorph`, point cloud): same HSL-sampled colors interpolated between a
  **cube layout** (RGB tilted so the grey diagonal is vertical — rotate `Ry(45°)` then
  `Rx(35.264°)`) and a **cylinder layout** (`angle=H, radius=S, height=L−0.5`). Slider
  `morphT` 0→1; status readout. Drag-rotate.
- **4.1 HSL cylinder** (`drawHslCyl`): the cylinder layout alone; `L↑` label; drag-rotate.
- **4.2 HSL math card**: mono formula block — `M=max`, `m=min`, `C=M−m`, `L=(M+m)/2`,
  `S=C/(1−|2L−1|)`, hue from which channel is max — plus prose ("L is just the channel
  midpoint; that's why it misleads").

### 5 · CIE XYZ
- **5.0 Why XYZ** (math card): prose (cone fundamentals, imaginary primaries so all visible
  colors are positive, Y = luminance) + the **linear sRGB→XYZ matrix** in brackets.
- **5.1 Chromaticity horseshoe** (`drawChromaticity`): spectral locus polygon (CIE 1931 xy
  data embedded in `locus()`), interior filled per-pixel (point-in-polygon; for each inside
  pixel treat (x,y) as chromaticity at Y=1, → XYZ → RGB, normalize by max channel). Overlays:
  **sRGB gamut triangle** (R 0.64,0.33 · G 0.30,0.60 · B 0.15,0.06), D65 white point
  (0.3127,0.3290), and a **draggable sample ring** that turns green inside / red outside the
  triangle. Readouts: xy + gamut status. Drag = `data-pick="chroma"`.
- **5.2 Inverse** (math card): XYZ→sRGB matrix + two cautions (linear-light only; relative to
  D65 white point).

### 6 · CIELAB / CIELUV
- **6.0 MacAdam** (`drawMacadam`): the horseshoe again, overlaid with ~12 ellipses of varying
  size/orientation (illustrative, ×11) — equal perceptual JND looks wildly unequal in xy.
- **6.1 Lab formulas** (math card): the `f(t)` cube-root piecewise + L*/a*/b* equations + ε,κ.
- **6.2 Lab 3D solid** (`drawLabSolid`, point cloud): every sRGB sample placed at
  `(a*/150, (L*−50)/110, b*/150)`; lumpy, irregular; L*/+a*/+b* labels; drag-rotate.
- **6.3 Equal-steps compare** (`drawStepCompare`): two horizontal ramps between a fixed navy
  `[0.05,0.07,0.34]` and yellow `[0.97,0.83,0.16]`. Top = linear-sRGB interpolation (bunches);
  bottom = CIELAB interpolation (even). Slider `stepN` 3–15.

### 7 · Trouble with HSL
- **7.0** (`drawHslTrouble`): for a fixed lightness (slider `troubleL` 8–92), 30 hue swatches
  in **HSL** with a greyscale **perceived-luminance** strip beneath, then the same in
  **HSLuv**. HSL's grey strip lurches (yellow bright, blue dark); HSLuv's stays flat.
  Luminance = `0.2126R+0.7152G+0.0722B` on linear RGB, shown as `Y^(1/2.2)` grey.

### 8 · HSLuv  *(the payoff)*
- **8.0 Normalize idea** (`drawHsluvIdea`): at a fixed L (slider `ideaL`), draw the per-hue
  max-chroma boundary (lopsided blob) + concentric S-rings at 20/40/60/80/100% of it, filled
  with sampled HSLuv colors. "S = % of the way to the gamut edge."
- **8.1 HSL vs HSLuv grid** (`drawCompareGrid`): two side-by-side grids, hue→across,
  lightness→down, saturation fixed (slider `cmpS`). Rows are even in HSLuv, heaving in HSL.
- **8.2 Live picker** (`drawHsluvPicker`): an S(×)–L(y) plane for the current hue
  (`data-pick="picker"`, drag the square); H/S/L sliders (`pH/pS/pL`); an 84px swatch, large
  hex, and `H S L` readout, all live.
- **8.3 maxChroma math** (math card): `Cmax=maxChromaForLH(L,H)`, `S=100·C/Cmax`, with prose
  on the ray-vs-gamut-line intersection.

### 9 · In Flutter
- **9.0 Package card**: dark code panels for `pubspec.yaml` (`hsluv: ^1.1.3`) and `color.dart`
  (high-level `HSLuvColor.fromHSL(...).toColor()` and low-level `Hsluv.hsluvToHex/hexToHsluv`),
  syntax-tinted; prose on the two API surfaces, the 0–1 vs 0–100 gotcha, and use cases
  (tonal ramps, accessible contrast, theme palettes); reference links.

---

## 3-D engine (point clouds) — porting note
Scenes 3.0, 4.0, 4.1, 6.2 are **point clouds**, not meshes — ideal and easy to reproduce.
Each point = `{pos:[x,y,z] in ~[-0.6,0.6], color}`. Per frame: rotate by yaw (`ay`) about Y
then pitch (`ax`) about X; orthographic project with a slight depth-based size/alpha
(`persp = 1 + z*0.0009`; alpha scales with depth); **sort back-to-front by z**; draw filled
circles. Drag updates `ay/ax`; idle adds `ay += 0.0035`/frame. In Flutter: a `CustomPainter`
fed by a `Ticker`/`AnimationController`, points as `canvas.drawCircle`, depth-sorted.

## Interactions & behavior summary
- All sliders write a single param and trigger a redraw of the active cell's canvas(es) +
  update mono readouts (event-delegated `input` listener in the prototype).
- Drag: 3-D canvases (`data-viz3d`) rotate; pick canvases (`data-pick`) set a value from
  pointer position (chromaticity sample, picker S/L) — inverse-mapped through stored geometry.
- Keyboard: ←→ topic, ↑↓ demo, PageUp/Down = ←/→.
- No data fetching, no backend, no persistence required. (For a deployed talk surface you may
  want to sync the current cell into the URL so reload/deep-link works.)

## State (per the prototype)
`topic`, `demoByTopic[]`, drag/rotation state per 3-D scene, and a flat `params` object of all
slider values: `lightR/G/B, gamma, mA/mB/mC/mD, sliceB, morphT, chx/chy, stepN, troubleL,
ideaL, cmpS, pH/pS/pL`. Plus prebuilt point-cloud arrays.

## Assets
None external. No images, no icon fonts. All imagery is computed (canvas) or CSS
(conic/radial gradients, SVG turbulence grain). Fonts load from Google Fonts (Cormorant
Garamond, Work Sans, Space Mono) — bundle them with the app for offline/native.

## Files (in this bundle)
- **`Color Spaces.dc.html`** — the design source. Markup + an inline logic class hold all
  layout, copy, and the `draw*` visualizer algorithms. **Read this for exact structure and
  rendering logic.** (Opens in a browser alongside `support.js` + `color-math.js`.)
- **`color-math.js`** — the authoritative, dependency-free color-conversion module. **Port
  this (or replace with the `hsluv` package) in the target app.**
- **`Color Spaces (offline).html`** — a single self-contained build; open directly in any
  browser to see the running prototype (fonts fall back to system serif when offline).
- **`support.js`** — the prototype's runtime; only needed to run `Color Spaces.dc.html`
  locally. Not part of the design to reproduce.

## Suggested Flutter structure
```
lib/
  color_math/            # port of color-math.js OR thin wrappers over package:hsluv
  deck/deck_scaffold.dart  # 2-D PageView nav + minimap + arrows + keyboard
  painters/              # one CustomPainter per visualizer (newton, additive, axis_scale,
                         #   matrix2d, rgb_cube, rgb_slice, morph, hsl_cyl, chromaticity,
                         #   macadam, lab_solid, step_compare, hsl_trouble, hsluv_idea,
                         #   compare_grid, hsluv_picker)
  cells/                 # one widget per cell (kicker/title/aside + CustomPaint + sliders)
  theme.dart             # the design tokens above
```
Build the nav + theme + `color_math` first, then port painters in narrative order (Newton →
HSLuv). The CIE 1931 locus data and gamut/white-point constants are in `drawChromaticity`/
`locus()`.
# geometry-of-colors
