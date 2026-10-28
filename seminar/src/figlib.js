// Small SVG toolkit for the seminar figures: palette, text/math helpers and icons.
// Coordinates are in "figure units" (1 unit = 0.01 inch on the slide).

const C = {
  navy: "#0B1E3F", navy2: "#16315E", ink: "#1B2638", muted: "#5B6880", grid: "#C9D3E0",
  light: "#F0F4F9", white: "#FFFFFF",
  sky: "#2188D8", skyD: "#1670B3", skyL: "#DCEBFA",
  teal: "#0F9F8F", tealD: "#0B7F72", tealL: "#D4F0EB",
  violet: "#7A4FD8", violetD: "#5F37BE", violetL: "#E8E0FA",
  orange: "#E07B22", orangeD: "#B85F12", orangeL: "#FBE5D1",
  gold: "#F2B53A", goldD: "#B9821A", goldL: "#FDF0D3",
  slate: "#8C97AB", red: "#D64545", green: "#3E9E62", greenL: "#DDF0E3",
  probe: "#D93B3B", coupling: "#16A34A",
};
const FONT = "Calibri, Carlito, 'Liberation Sans', Arial, sans-serif";
const MATH = "Cambria, Caladea, 'Liberation Serif', 'Times New Roman', serif";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const f2 = (v) => (Math.round(v * 100) / 100).toString();

// ---------------------------------------------------------------- text ----
function text(x, y, str, o = {}) {
  const size = +(Math.max((o.size || 15) * 1.08, 12.5)).toFixed(2); // keep labels legible once placed on a slide
  const attrs = [
    `x="${f2(x)}"`, `y="${f2(y)}"`, `font-family="${o.math ? MATH : FONT}"`, `font-size="${size}"`,
    `fill="${o.fill || C.ink}"`, `text-anchor="${o.anchor || "start"}"`,
  ];
  if (o.weight) attrs.push(`font-weight="${o.weight}"`);
  if (o.italic) attrs.push(`font-style="italic"`);
  if (o.spacing) attrs.push(`letter-spacing="${o.spacing}"`);
  if (o.opacity) attrs.push(`opacity="${o.opacity}"`);
  if (o.rotate) attrs.push(`transform="rotate(${o.rotate} ${f2(x)} ${f2(y)})"`);
  const body = o.raw ? str : esc(str);
  return `<text ${attrs.join(" ")}>${body}</text>`;
}

// Tiny math markup -> <tspan>s.  Letters italic, digits upright.
//   \b{h} bold upright (vectors),  \r{max} roman,  _x / _{..} subscript,  ^x / ^{..} superscript
function readGroup(src, i) {
  if (src[i] !== "{") return [src[i], i + 1];
  let depth = 1, j = i + 1;
  while (j < src.length && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
  return [src.slice(i + 1, j - 1), j];
}
function styleParts(src) {
  // splits a script-free string into runs of {t, it, bold}; handles \b{..} and \r{..}
  const parts = [];
  const push = (ch, st) => {
    const it = st ? false : /[A-Za-zͰ-Ͽ]/.test(ch), bold = st === "b";
    const last = parts[parts.length - 1];
    if (last && last.it === it && last.bold === bold) last.t += ch; else parts.push({ t: ch, it, bold });
  };
  let i = 0;
  while (i < src.length) {
    if (src.startsWith("\\b{", i) || src.startsWith("\\r{", i)) {
      const st = src[i + 1];
      const [g, j] = readGroup(src, i + 2);
      for (const ch of g) push(ch, st);
      i = j;
    } else { push(src[i], null); i++; }
  }
  return parts;
}
function mathSpans(src) {
  const out = [];
  const emit = (parts, shift) => {
    for (const p of parts) {
      const a = [];
      if (p.it) a.push('font-style="italic"');
      if (p.bold) a.push('font-weight="bold"');
      if (shift) a.push(`baseline-shift="${shift}" font-size="68%"`);
      out.push(`<tspan ${a.join(" ")}>${esc(p.t)}</tspan>`);
    }
  };
  let i = 0;
  while (i < src.length) {
    let atomSrc;
    if (src.startsWith("\\b{", i) || src.startsWith("\\r{", i)) {
      const [, j] = readGroup(src, i + 2);
      atomSrc = src.slice(i, j); i = j;
    } else { atomSrc = src[i]; i++; }
    emit(styleParts(atomSrc));
    while (src[i] === "_" || src[i] === "^") {
      const kind = src[i] === "_" ? "sub" : "super";
      const [g, j] = readGroup(src, i + 1);
      i = j;
      emit(styleParts(g), kind);
    }
  }
  return out.join("");
}
const math = (x, y, src, o = {}) => text(x, y, mathSpans(src), { ...o, math: true, raw: true });

// --------------------------------------------------------------- shapes ----
const line = (x1, y1, x2, y2, o = {}) =>
  `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${o.stroke || C.ink}" stroke-width="${o.width || 2}"` +
  `${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.opacity ? ` opacity="${o.opacity}"` : ""} stroke-linecap="${o.cap || "round"}"/>`;

const rect = (x, y, w, h, o = {}) =>
  `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w)}" height="${f2(h)}" rx="${o.r ?? 0}" fill="${o.fill || "none"}"` +
  `${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.width || 1.5}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}` +
  `${o.opacity ? ` opacity="${o.opacity}"` : ""}/>`;

const circle = (cx, cy, r, o = {}) =>
  `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${o.fill || "none"}"` +
  `${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.width || 1.5}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}` +
  `${o.opacity ? ` opacity="${o.opacity}"` : ""}/>`;

const ellipse = (cx, cy, rx, ry, o = {}) =>
  `<ellipse cx="${f2(cx)}" cy="${f2(cy)}" rx="${f2(rx)}" ry="${f2(ry)}" fill="${o.fill || "none"}"` +
  `${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.width || 1.5}"` : ""}${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}` +
  `${o.opacity ? ` opacity="${o.opacity}"` : ""}${o.rotate ? ` transform="rotate(${o.rotate} ${f2(cx)} ${f2(cy)})"` : ""}/>`;

const path = (d, o = {}) =>
  `<path d="${d}" fill="${o.fill || "none"}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.width || 2}"` : ""}` +
  `${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}${o.opacity ? ` opacity="${o.opacity}"` : ""}` +
  ` stroke-linecap="round" stroke-linejoin="round"/>`;

const group = (inner, o = {}) => {
  const t = [];
  if (o.x !== undefined || o.y !== undefined) t.push(`translate(${f2(o.x || 0)} ${f2(o.y || 0)})`);
  if (o.rotate) t.push(`rotate(${o.rotate})`);
  if (o.s && o.s !== 1) t.push(`scale(${o.s})`);
  return `<g${t.length ? ` transform="${t.join(" ")}"` : ""}${o.opacity ? ` opacity="${o.opacity}"` : ""}>${inner}</g>`;
};

// Arrow with a filled triangular head (no SVG markers, so it survives any editor).
function arrow(x1, y1, x2, y2, o = {}) {
  const w = o.width || 2, hl = o.head || 4 + 3 * w, hw = (o.headW || 0.62) * hl;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const bx = x2 - ux * hl, by = y2 - uy * hl;
  let s = line(x1, y1, bx + ux * 0.5, by + uy * 0.5, { ...o, cap: "butt" });
  const head = (tx, ty, ax, ay) =>
    `<polygon points="${f2(tx)},${f2(ty)} ${f2(ax - uy * hw)},${f2(ay + ux * hw)} ${f2(ax + uy * hw)},${f2(ay - ux * hw)}" fill="${o.stroke || C.ink}"${o.opacity ? ` opacity="${o.opacity}"` : ""}/>`;
  s += head(x2, y2, bx, by);
  if (o.both) {
    const cx = x1 + ux * hl, cy = y1 + uy * hl;
    s = line(cx, cy, bx, by, { ...o, cap: "butt" }) + head(x2, y2, bx, by)
      + `<polygon points="${f2(x1)},${f2(y1)} ${f2(cx - uy * hw)},${f2(cy + ux * hw)} ${f2(cx + uy * hw)},${f2(cy - ux * hw)}" fill="${o.stroke || C.ink}"${o.opacity ? ` opacity="${o.opacity}"` : ""}/>`;
  }
  return s;
}

// Arrow along a quadratic curve (x1,y1) -> (x2,y2) with control (cx,cy).
function curveArrow(x1, y1, cx, cy, x2, y2, o = {}) {
  const w = o.width || 2, hl = o.head || 4 + 3 * w, hw = 0.62 * hl;
  let dx = x2 - cx, dy = y2 - cy; const L = Math.hypot(dx, dy); dx /= L; dy /= L;
  const bx = x2 - dx * hl, by = y2 - dy * hl;
  return path(`M${f2(x1)},${f2(y1)} Q${f2(cx)},${f2(cy)} ${f2(bx)},${f2(by)}`, { stroke: o.stroke || C.ink, width: w, dash: o.dash, opacity: o.opacity })
    + `<polygon points="${f2(x2)},${f2(y2)} ${f2(bx - dy * hw)},${f2(by + dx * hw)} ${f2(bx + dy * hw)},${f2(by - dx * hw)}" fill="${o.stroke || C.ink}"${o.opacity ? ` opacity="${o.opacity}"` : ""}/>`;
}

// Sinusoidal "radio wave" between two points.
function wave(x1, y1, x2, y2, o = {}) {
  const amp = o.amp || 4, lam = o.lambda || 12;
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const n = Math.max(8, Math.round(L / 2));
  let d = "";
  for (let k = 0; k <= n; k++) {
    const t = (k / n) * L, a = amp * Math.sin((2 * Math.PI * t) / lam);
    const px = x1 + ux * t - uy * a, py = y1 + uy * t + ux * a;
    d += `${k ? "L" : "M"}${f2(px)},${f2(py)}`;
  }
  return path(d, { stroke: o.stroke || C.violet, width: o.width || 1.8, opacity: o.opacity });
}

// Polarization ellipse with a small arrow showing the rotation sense.
function polEllipse(cx, cy, a, b, angle, color, o = {}) {
  const w = o.width || 2.2;
  let s = ellipse(cx, cy, a, b, { stroke: color, width: w, rotate: angle, fill: o.fill || "none" });
  if (b > 0.5) {
    const th = (angle * Math.PI) / 180;
    const px = cx + a * Math.cos(th), py = cy + a * Math.sin(th);
    const tx = -Math.sin(th) * (o.ccw ? -1 : 1), ty = Math.cos(th) * (o.ccw ? -1 : 1);
    const hl = 7, hw = 4.5;
    s += `<polygon points="${f2(px + tx * hl)},${f2(py + ty * hl)} ${f2(px - ty * hw)},${f2(py + tx * hw)} ${f2(px + ty * hw)},${f2(py - tx * hw)}" fill="${color}"/>`;
  } else {
    const th = (angle * Math.PI) / 180, ux = Math.cos(th), uy = Math.sin(th);
    s = arrow(cx - ux * a, cy - uy * a, cx + ux * a, cy + uy * a, { stroke: color, width: w, both: true, head: 9 });
  }
  return s;
}

// ---------------------------------------------------------------- icons ----
function satellite(x, y, s = 1, o = {}) {
  const panel = (px) => {
    let g = rect(px, -10, 34, 20, { fill: "url(#gPanel)", stroke: "#173766", width: 1.2, r: 1.5 });
    for (let k = 1; k < 4; k++) g += line(px + (34 * k) / 4, -10, px + (34 * k) / 4, 10, { stroke: "#7FB0E8", width: 0.8, opacity: 0.8 });
    g += line(px, 0, px + 34, 0, { stroke: "#7FB0E8", width: 0.8, opacity: 0.8 });
    return g;
  };
  let g = panel(-52) + panel(18);
  g += line(-18, 0, -11, 0, { stroke: C.slate, width: 2.4 }) + line(11, 0, 18, 0, { stroke: C.slate, width: 2.4 });
  g += rect(-11, -13, 22, 26, { fill: "url(#gFoil)", stroke: C.goldD, width: 1.2, r: 3 });
  g += line(-11, -4, 11, -4, { stroke: C.goldD, width: 0.8, opacity: 0.7 }) + line(-11, 5, 11, 5, { stroke: C.goldD, width: 0.8, opacity: 0.7 });
  g += path("M-8,13 Q0,25 8,13 Z", { fill: "#EEF2F8", stroke: C.slate, width: 1.2 });
  g += line(0, 15, 0, 22, { stroke: C.slate, width: 1.2 });
  return group(g, { x, y, s, rotate: o.rotate || 0 });
}

function uav(x, y, s = 1, color = C.sky) {
  let g = "";
  g += line(-25, -2, 25, -2, { stroke: C.ink, width: 2.6 });
  for (const sx of [-25, 25]) {
    g += line(sx, -2, sx, -7, { stroke: C.ink, width: 2 });
    g += ellipse(sx, -8.5, 13, 2.8, { fill: "#D9E2EE", stroke: C.ink, width: 1.2, opacity: 0.95 });
  }
  g += rect(-12, -7, 24, 12, { fill: color, stroke: C.ink, width: 1.3, r: 5 });
  g += rect(-5, 5, 10, 4, { fill: C.ink, r: 1.5 });
  g += line(-8, 5, -13, 12, { stroke: C.ink, width: 1.6 }) + line(8, 5, 13, 12, { stroke: C.ink, width: 1.6 });
  return group(g, { x, y, s });
}

function airship(x, y, s = 1) {
  let g = "";
  g += path("M38,0 L54,-12 L56,-10 L46,0 L56,10 L54,12 Z", { fill: C.slate, stroke: C.ink, width: 1 });
  g += ellipse(0, 0, 46, 15, { fill: "url(#gShip)", stroke: C.ink, width: 1.3 });
  g += path("M-30,-9 Q0,-17 30,-9", { stroke: "#244A86", width: 3.2 });
  g += rect(-9, 13, 18, 7, { fill: C.white, stroke: C.ink, width: 1.2, r: 2 });
  return group(g, { x, y, s });
}

function tower(x, y, s = 1, color = C.ink) {
  let g = "";
  g += path("M-11,46 L0,-34 L11,46", { stroke: color, width: 2.2 });
  for (const yy of [-10, 14, 34]) {
    const hw = 11 * (yy + 34) / 80;
    g += line(-hw, yy, hw, yy, { stroke: color, width: 1.4 });
  }
  g += path("M-4,-6 L7,18 M4,-6 L-7,18 M-8,22 L10,40 M8,22 L-10,40", { stroke: color, width: 1 });
  g += rect(-8, -40, 4, 12, { fill: C.slate, stroke: color, width: 1, r: 1 }) + rect(4, -40, 4, 12, { fill: C.slate, stroke: color, width: 1, r: 1 });
  for (const r of [12, 20]) {
    g += path(`M${-r - 2},${-44 + r * 0.55} A${r},${r} 0 0 1 ${-r - 2},${-40 - r * 0.55}`, { stroke: C.green, width: 1.6 });
    g += path(`M${r + 2},${-44 + r * 0.55} A${r},${r} 0 0 0 ${r + 2},${-40 - r * 0.55}`, { stroke: C.green, width: 1.6 });
  }
  return group(g, { x, y, s });
}

function dish(x, y, s = 1) {
  let g = "";
  g += path("M-12,22 L0,4 L12,22", { stroke: C.ink, width: 2 });
  g += rect(-16, 22, 32, 5, { fill: C.slate, stroke: C.ink, width: 1, r: 1.5 });
  g += path("M-20,-8 Q-6,22 22,0 Z", { fill: "#EEF2F8", stroke: C.ink, width: 1.6 });
  g += line(1, 3, 10, -16, { stroke: C.ink, width: 1.4 }) + circle(10, -17, 2.4, { fill: C.ink });
  return group(g, { x, y, s });
}

function phone(x, y, s = 1, color = C.ink) {
  return group(rect(-7, -12, 14, 24, { fill: C.white, stroke: color, width: 1.8, r: 3 })
    + rect(-4.5, -8.5, 9, 14, { fill: C.skyL }) + circle(0, 9, 1.2, { fill: color }), { x, y, s });
}

function person(x, y, s = 1, color = C.ink) {
  return group(circle(0, -12, 5.2, { fill: color })
    + path("M-9,10 Q-9,-4 0,-4 Q9,-4 9,10 Z", { fill: color }), { x, y, s });
}

function car(x, y, s = 1, color = C.sky) {
  let g = path("M-22,4 L-20,-4 Q-18,-7 -14,-7 L-8,-7 L-3,-14 L10,-14 L16,-7 L20,-6 Q23,-5 23,-1 L23,4 Z", { fill: color, stroke: C.ink, width: 1.3 });
  g += path("M-6,-7 L-2,-12 L4,-12 L4,-7 Z M6,-7 L6,-12 L9,-12 L13,-7 Z", { fill: C.skyL });
  g += circle(-12, 5, 4.2, { fill: C.ink }) + circle(13, 5, 4.2, { fill: C.ink });
  g += circle(-12, 5, 1.6, { fill: C.slate }) + circle(13, 5, 1.6, { fill: C.slate });
  return group(g, { x, y, s });
}

function ship(x, y, s = 1) {
  let g = path("M-30,0 L30,0 L23,11 L-24,11 Z", { fill: C.navy2, stroke: C.ink, width: 1.2 });
  g += rect(-14, -11, 22, 11, { fill: C.white, stroke: C.ink, width: 1.2, r: 1.5 });
  g += rect(-10, -8, 4, 4, { fill: C.skyL }) + rect(-3, -8, 4, 4, { fill: C.skyL });
  g += line(14, 0, 14, -16, { stroke: C.ink, width: 1.4 }) + line(14, -16, 20, -12, { stroke: C.ink, width: 1.2 });
  return group(g, { x, y, s });
}

function building(x, y, w, h, color = "#A9B6C9") {
  let g = rect(x, y - h, w, h, { fill: color, stroke: "#6F7F96", width: 1 });
  for (let yy = y - h + 6; yy < y - 8; yy += 10)
    for (let xx = x + 4; xx < x + w - 6; xx += 9) g += rect(xx, yy, 5, 5, { fill: "#EEF3F9" });
  return g;
}

function iot(x, y, s = 1, color = C.teal) {
  let g = rect(-8, -6, 16, 12, { fill: color, stroke: C.ink, width: 1.2, r: 2 });
  g += line(4, -6, 4, -15, { stroke: C.ink, width: 1.3 }) + circle(4, -16, 1.6, { fill: C.ink });
  return group(g, { x, y, s });
}

function house(x, y, s = 1) {
  return group(path("M-12,0 L-12,-12 L0,-22 L12,-12 L12,0 Z", { fill: "#F6F8FB", stroke: C.ink, width: 1.3 })
    + rect(-4, -8, 8, 8, { fill: C.slate }), { x, y, s });
}

// Small dual-polarized "polarization-reconfigurable antenna" glyph (cross + ring).
function pra(x, y, s = 1, color = C.teal) {
  return group(rect(-11, -11, 22, 22, { fill: C.white, stroke: color, width: 1.8, r: 5 })
    + line(0, -7, 0, 7, { stroke: C.skyD, width: 2.4 }) + line(-7, 0, 7, 0, { stroke: C.orangeD, width: 2.4 }), { x, y, s });
}

// Neural network glyph (3 layers).
function nn(x, y, s = 1, color = C.orange, layers = [3, 4, 2]) {
  const xs = layers.map((_, i) => (i - (layers.length - 1) / 2) * 22);
  let edges = "", nodes = "";
  const pos = layers.map((n, i) => Array.from({ length: n }, (_, k) => [xs[i], (k - (n - 1) / 2) * 12]));
  for (let i = 0; i < pos.length - 1; i++)
    for (const a of pos[i]) for (const b of pos[i + 1]) edges += line(a[0], a[1], b[0], b[1], { stroke: C.slate, width: 0.9, opacity: 0.8 });
  for (const col of pos) for (const p of col) nodes += circle(p[0], p[1], 4.2, { fill: color, stroke: C.ink, width: 0.9 });
  return group(edges + nodes, { x, y, s });
}

// Glass vapor cell with atoms.
function vaporCell(x, y, w, h, o = {}) {
  let g = rect(x, y, w, h, { fill: "url(#gGlass)", stroke: "#6E8CB5", width: 1.6, r: h / 2 });
  g += rect(x + 6, y + 4, w - 12, 3.5, { fill: C.white, r: 1.75, opacity: 0.85 });
  const rng = mulberry32(o.seed || 7);
  for (let k = 0; k < (o.atoms || 16); k++) {
    const ax = x + h / 2 + rng() * (w - h), ay = y + 8 + rng() * (h - 16);
    g += circle(ax, ay, o.atomR || 2.6, { fill: o.atomColor || C.violet, opacity: 0.85 });
  }
  return g;
}

function photodetector(x, y, s = 1) {
  return group(rect(-10, -13, 14, 26, { fill: "#3A4760", stroke: C.ink, width: 1.2, r: 2 })
    + path("M-10,-8 A8,8 0 0 0 -10,8 Z", { fill: "#9FB3CF", stroke: C.ink, width: 1 })
    + line(4, 0, 12, 0, { stroke: C.ink, width: 1.6 }), { x, y, s });
}

function horn(x, y, s = 1, rotate = 0, color = C.slate) {
  return group(path("M-14,-5 L-2,-5 L14,-14 L14,14 L-2,5 L-14,5 Z", { fill: color, stroke: C.ink, width: 1.3 }), { x, y, s, rotate });
}

function laser(x1, y1, x2, y2, color, w = 4) {
  return line(x1, y1, x2, y2, { stroke: color, width: w * 3, opacity: 0.18 }) + line(x1, y1, x2, y2, { stroke: color, width: w * 0.8 });
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Shared gradient definitions used by the icons.
const DEFS = `
<linearGradient id="gPanel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3C76C4"/><stop offset="1" stop-color="#1B3F7A"/></linearGradient>
<linearGradient id="gFoil" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD978"/><stop offset="1" stop-color="#E0A126"/></linearGradient>
<linearGradient id="gShip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#C9D6E8"/></linearGradient>
<linearGradient id="gGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F8FE"/><stop offset="0.55" stop-color="#DDE8F7"/><stop offset="1" stop-color="#C7D7EE"/></linearGradient>`;

function svgDoc(w, h, body, extraDefs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<defs>${DEFS}${extraDefs}</defs>${body}</svg>`;
}

module.exports = {
  C, FONT, MATH, text, math, mathSpans, line, rect, circle, ellipse, path, group, arrow, curveArrow, wave,
  polEllipse, satellite, uav, airship, tower, dish, phone, person, car, ship, building, iot, house, pra, nn,
  vaporCell, photodetector, horn, laser, mulberry32, svgDoc, f2,
};
