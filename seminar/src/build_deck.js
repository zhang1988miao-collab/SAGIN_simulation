// Build the seminar slide template:  node build_deck.js  ->  ../SAGIN_Optimization_Seminar.pptx
// Inputs: build/fig/* (render_figures.js), build/eq/* + build/equations.json (render_equations.js),
//         build/chart_data.json (sim_data.py).
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const JSZip = require(require.resolve("jszip", { paths: [require.resolve("pptxgenjs")] }));
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const TB = require("react-icons/tb");

const OUT = path.join(__dirname, "..", "SAGIN_Optimization_Seminar.pptx");
const FIG = (f) => path.join(__dirname, "build", "fig", f);
const EQ = JSON.parse(fs.readFileSync(path.join(__dirname, "build", "equations.json"), "utf8"));
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "build", "chart_data.json"), "utf8"));

// ------------------------------------------------------------------ theme ----
const THEME = {
  name: "SAGIN Seminar",
  headFontFace: "Cambria",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1B2638", lt1: "FFFFFF", dk2: "0B1E3F", lt2: "F0F4F9",
    accent1: "2188D8", accent2: "0F9F8F", accent3: "7A4FD8", accent4: "E07B22", accent5: "F2B53A", accent6: "8C97AB",
    hlink: "1670B3", folHlink: "5F37BE",
  },
};
const HEX = { ink: "1B2638", navy: "0B1E3F", muted: "5B6880", line: "D5DCE6", card: "F6F8FB", cardLine: "E1E7EF", white: "FFFFFF", gold: "F2B53A", goldD: "B9821A" };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.title = "Emerging Techniques for Space-Air-Ground Integrated Networks";
pres.subject = "Seminar slide template";
pres.author = "Miao Zhang";
pres.company = "Department / University";
const C = pres.SchemeColor;
const S = pres.shapes;

const SEC = {
  I: { key: "I", num: "01", label: "PART I", name: "Introduction", kicker: "PART I  ·  INTRODUCTION", color: "2188D8", dark: "1670B3", tint: "E8F2FC", bright: "6CC0FF", scheme: C.accent1, bg: "bg_sec1.jpg" },
  II: { key: "II", num: "02", label: "PART II", name: "Polarforming Design in SAGIN", kicker: "PART II  ·  POLARFORMING DESIGN IN SAGIN", color: "0F9F8F", dark: "0B7F72", tint: "E2F5F2", bright: "4FD8C6", scheme: C.accent2, bg: "bg_sec2.jpg" },
  III: { key: "III", num: "03", label: "PART III", name: "Atomic-to-Space: Quantum Receiver for SAGINs", kicker: "PART III  ·  ATOMIC-TO-SPACE: QUANTUM RECEIVER FOR SAGINS", color: "7A4FD8", dark: "5F37BE", tint: "EFEAFC", bright: "B9A2FF", scheme: C.accent3, bg: "bg_sec3.jpg" },
  IV: { key: "IV", num: "04", label: "PART IV", name: "MADRL and Rate-Splitting Multiple Access for SAGIN", kicker: "PART IV  ·  MADRL AND RATE-SPLITTING MULTIPLE ACCESS FOR SAGIN", color: "E07B22", dark: "B85F12", tint: "FCEEE2", bright: "FFB26B", scheme: C.accent4, bg: "bg_sec4.jpg" },
};
const PARTS = ["I", "II", "III", "IV"];

// ------------------------------------------------------------- geometry ----
const W = 13.333, M = 0.6, CW = W - 2 * M; // content width 12.133
const TOP = 1.92;

// ---------------------------------------------------------------- icons ----
const iconCache = {};
async function prepareIcons(names) {
  for (const n of names) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(TB[n], { color: "#FFFFFF", size: 256 }));
    const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
    iconCache[n] = "image/png;base64," + png.toString("base64");
  }
}

// ----------------------------------------------------------- rich text ----
// "plain **bold** $math$" -> pptxgenjs runs.  Math markup: \b{x} bold upright,
// \r{x} roman, _x / _{..} subscript, ^x / ^{..} superscript; letters italic.
function readGroup(src, i) {
  if (src[i] !== "{") return [src[i], i + 1];
  let depth = 1, j = i + 1;
  while (j < src.length && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
  return [src.slice(i + 1, j - 1), j];
}
function styleParts(src) {
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
function mathRuns(src, base) {
  const runs = [];
  const emit = (parts, script) => {
    for (const p of parts) runs.push({ text: p.t.replace(/ /g, "\u00A0"), options: { ...base, fontFace: "+mj-lt", italic: p.it, bold: p.bold || base.bold, ...(script ? { [script]: true } : {}) } });
  };
  let i = 0;
  while (i < src.length) {
    let atom = "";
    if (src[i] === "_" || src[i] === "^") { /* script with an empty base */ }
    else if (src.startsWith("\\b{", i) || src.startsWith("\\r{", i)) { const [, j] = readGroup(src, i + 2); atom = src.slice(i, j); i = j; }
    else { atom = src[i]; i++; }
    if (atom) emit(styleParts(atom));
    while (src[i] === "_" || src[i] === "^") {
      const script = src[i] === "_" ? "subscript" : "superscript";
      const [g, j] = readGroup(src, i + 1);
      i = j;
      emit(styleParts(g), script);
    }
  }
  return runs;
}
function rich(str, base = {}) {
  const runs = [];
  const re = /(\$[^$]+\$|\*\*[^*]+\*\*)/g;
  let last = 0, m;
  while ((m = re.exec(str))) {
    if (m.index > last) runs.push({ text: str.slice(last, m.index), options: { ...base } });
    if (m[0][0] === "$") runs.push(...mathRuns(m[0].slice(1, -1), base));
    else runs.push({ text: m[0].slice(2, -2), options: { ...base, bold: true } });
    last = re.lastIndex;
  }
  if (last < str.length) runs.push({ text: str.slice(last), options: { ...base } });
  return runs;
}
// paragraphs: array of run-arrays -> single run array with breakLine between paragraphs
function paras(list) {
  const out = [];
  list.forEach((runs, k) => {
    runs.forEach((r, i) => {
      const o = { ...r.options };
      if (i === runs.length - 1 && k < list.length - 1) o.breakLine = true;
      out.push({ text: r.text, options: o });
    });
  });
  return out;
}

// --------------------------------------------------------------- layouts ----
function defineLayouts() {
  pres.defineSlideMaster({
    title: "TITLE",
    background: { path: FIG("bg_title.jpg") },
    objects: [
      { text: { text: "SEMINAR", options: { x: 0.75, y: 1.42, w: 4, h: 0.36, fontSize: 13, bold: true, color: HEX.gold, charSpacing: 6, margin: 0 } } },
      { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 1.85, w: 7.9, h: 2.15, fontFace: "+mj-lt", fontSize: 40, bold: true, color: HEX.white, align: "left", valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "subtitle", type: "body", x: 0.75, y: 4.18, w: 7.9, h: 0.8, fontSize: 18, color: "A8D8FF", align: "left", valign: "top", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "presenter", type: "body", x: 0.75, y: 5.3, w: 7.2, h: 1.3, fontSize: 15, color: "D6E2F2", align: "left", valign: "top", margin: 0 }, text: "" } },
    ],
  });

  for (const k of PARTS) {
    const s = SEC[k];
    pres.defineSlideMaster({
      title: `SECTION_${k}`,
      background: { path: FIG(s.bg) },
      objects: [
        { text: { text: s.num, options: { x: 0.75, y: 1.35, w: 3.5, h: 1.45, fontFace: "+mj-lt", fontSize: 96, bold: true, color: s.bright, margin: 0, valign: "bottom" } } },
        { text: { text: s.label, options: { x: 0.8, y: 2.95, w: 4, h: 0.35, fontSize: 14, bold: true, color: "D6E2F2", charSpacing: 6, margin: 0 } } },
        { placeholder: { options: { name: "title", type: "title", x: 0.75, y: 3.38, w: 7.6, h: 1.55, fontFace: "+mj-lt", fontSize: 38, bold: true, color: HEX.white, align: "left", valign: "top", margin: 0 }, text: "" } },
        { placeholder: { options: { name: "agenda", type: "body", x: 0.8, y: 5.05, w: 7.4, h: 1.0, fontSize: 16, color: "BFD0E6", align: "left", valign: "top", margin: 0 }, text: "" } },
      ],
    });
  }

  const header = (kickerColor, active) => {
    const objs = [];
    PARTS.forEach((r, i) => {
      const on = r === active;
      objs.push({ text: { text: r, options: { shape: S.OVAL, x: 11.17 + i * 0.4, y: 0.36, w: 0.32, h: 0.32, fontSize: 9, bold: true, align: "center", valign: "middle", margin: 0,
        color: on ? HEX.white : "8C97AB", fill: { color: on ? SEC[r].color : "E9EDF3" }, line: { color: on ? SEC[r].color : "E9EDF3", width: 0.5 } } } });
    });
    objs.push({ text: { text: "Emerging Techniques for SAGINs  ·  Seminar", options: { x: M, y: 7.02, w: 7, h: 0.28, fontSize: 10, color: HEX.muted, margin: 0 } } });
    return objs;
  };
  const common = (objs) => ({
    background: { color: HEX.white },
    margin: [0.6, 0.6, 0.6, 0.6],
    slideNumber: { x: 12.13, y: 7.02, w: 0.6, h: 0.28, fontSize: 10, color: HEX.muted, align: "right" },
    objects: objs,
  });
  const titlePh = () => ({ placeholder: { options: { name: "title", type: "title", x: M, y: 0.62, w: CW, h: 0.62, fontFace: "+mj-lt", fontSize: 32, bold: true, color: HEX.navy, align: "left", valign: "middle", margin: 0 }, text: "" } });
  const leadPh = () => ({ placeholder: { options: { name: "lead", type: "body", x: M, y: 1.26, w: CW, h: 0.46, fontSize: 16, color: HEX.muted, align: "left", valign: "middle", margin: 0 }, text: "" } });

  for (const k of PARTS) {
    const s = SEC[k];
    pres.defineSlideMaster({
      title: `CONTENT_${k}`,
      ...common([
        { text: { text: s.kicker, options: { x: M, y: 0.36, w: 10.2, h: 0.3, fontSize: 12, bold: true, color: s.dark, charSpacing: 2, margin: 0 } } },
        ...header(s.dark, k), titlePh(), leadPh(),
      ]),
    });
  }
  pres.defineSlideMaster({
    title: "CONTENT_GENERAL",
    ...common([
      { placeholder: { options: { name: "kicker", type: "body", x: M, y: 0.36, w: 10.2, h: 0.3, fontSize: 12, bold: true, color: HEX.goldD, charSpacing: 2, margin: 0 }, text: "" } },
      ...header(HEX.goldD, null), titlePh(), leadPh(),
    ]),
  });

  pres.defineSlideMaster({
    title: "CLOSING",
    background: { path: FIG("bg_end.jpg") },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 5.9, y: 1.9, w: 6.8, h: 1.3, fontFace: "+mj-lt", fontSize: 54, bold: true, color: HEX.white, align: "left", valign: "bottom", margin: 0 }, text: "" } },
      { placeholder: { options: { name: "body", type: "body", x: 5.95, y: 3.4, w: 6.7, h: 2.2, fontSize: 18, color: "D6E2F2", align: "left", valign: "top", margin: 0 }, text: "" } },
    ],
  });
}

// ------------------------------------------------------------ components ----
let objCount = 0;
const nm = (base) => `${base}-${++objCount}`;

function newSlide(layout, section, title, lead, notes) {
  const slide = pres.addSlide({ masterName: layout, sectionTitle: section });
  if (title) slide.addText(title, { placeholder: "title" });
  if (lead) slide.addText(rich(lead), { placeholder: "lead" });
  if (notes) slide.addNotes(notes);
  return slide;
}

function card(slide, x, y, w, h, o = {}) {
  slide.addShape(S.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.r ?? 0.1, objectName: nm(o.name || "card"),
    fill: { color: o.fill || HEX.card }, line: { color: o.line || HEX.cardLine, width: o.lineW ?? 0.75 },
    ...(o.shadow ? { shadow: { type: "outer", color: "1B2638", opacity: 0.12, blur: 6, offset: 2, angle: 90 } } : {}),
  });
}

function iconCircle(slide, x, y, d, color, iconName) {
  slide.addShape(S.OVAL, { x, y, w: d, h: d, fill: { color }, line: { color, width: 0.5 }, objectName: nm("icon-bg") });
  const p = d * 0.22;
  const label = iconName.replace(/^Tb/, "").replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
  slide.addImage({ data: iconCache[iconName], x: x + p, y: y + p, w: d - 2 * p, h: d - 2 * p, altText: `Icon: ${label}`, objectName: nm("icon") });
}

function eqImage(slide, id, x, y, scale = 1) {
  const e = EQ[id];
  slide.addImage({ path: e.file, x, y, w: e.w * scale, h: e.h * scale, altText: "LaTeX: " + e.tex.replace(/\s+/g, " "), objectName: nm(`eq-${id}`) });
  return { w: e.w * scale, h: e.h * scale };
}

// Card with a small label and one or more stacked equations. Returns the card height.
function mathCard(slide, x, y, w, label, ids, o = {}) {
  const pad = 0.2, labelH = 0.26, gap = o.gap ?? 0.1;
  const maxW = w - 2 * pad;
  const sizes = ids.map((id) => {
    const s = Math.min(o.scale || 1, maxW / EQ[id].w);
    return { id, s, w: EQ[id].w * s, h: EQ[id].h * s };
  });
  const h = 0.12 + labelH + 0.06 + sizes.reduce((a, b) => a + b.h, 0) + gap * (sizes.length - 1) + 0.14;
  card(slide, x, y, w, h, { fill: o.fill, line: o.line, name: "math-card" });
  slide.addText(rich(label, { fontSize: 12.5, bold: true, color: o.labelColor || HEX.navy }),
    { x: x + pad, y: y + 0.11, w: w - 2 * pad, h: labelH, margin: 0, valign: "middle", objectName: nm("math-label") });
  let yy = y + 0.12 + labelH + 0.06;
  for (const sz of sizes) {
    const xx = o.center ? x + (w - sz.w) / 2 : x + pad;
    eqImage(slide, sz.id, xx, yy, sz.s);
    yy += sz.h + gap;
  }
  return h;
}

// Icon rows: [{icon, head, body}] with heading + description text.
function iconRows(slide, sec, x, y, w, rows, rowH) {
  rows.forEach((r, i) => {
    const yy = y + i * rowH;
    iconCircle(slide, x, yy + 0.02, 0.46, sec.scheme, r.icon);
    slide.addText(paras([
      rich(r.head, { fontSize: 15, bold: true, color: HEX.navy }),
      rich(r.body, { fontSize: 14, color: HEX.ink }),
    ]), { x: x + 0.64, y: yy - 0.02, w: w - 0.64, h: rowH - 0.04, margin: 0, valign: "top", paraSpaceAfter: 2, objectName: nm("row-text") });
  });
}

function chip(slide, x, y, label, sec, o = {}) {
  const w = o.w || 0.3 + label.length * 0.083;
  slide.addText(label, { shape: S.ROUNDED_RECTANGLE, rectRadius: 0.17, x, y, w, h: 0.34, fontSize: 13, color: o.color || sec.dark, align: "center", valign: "middle", margin: 0,
    fill: { color: o.fill || sec.tint }, line: { color: o.line || sec.tint, width: 0.75 }, objectName: nm("chip") });
  return w;
}

function caption(slide, x, y, w, str, o = {}) {
  slide.addText(rich(str, { fontSize: 11, color: HEX.muted, italic: o.italic ?? true }), { x, y, w, h: 0.28, margin: 0, valign: "middle", align: o.align || "left", objectName: nm("caption") });
}

// Native line chart inside a white card with a heading. Per-series dash/marker styles
// are added after writeFile() (pptxgenjs only styles whole charts).
function chartCard(slide, sec, x, y, w, h, spec) {
  card(slide, x, y, w, h, { fill: HEX.white, line: HEX.cardLine, name: "chart-card" });
  slide.addText(spec.title, { x: x + 0.22, y: y + 0.12, w: w - 0.44, h: 0.34, fontSize: 15, bold: true, color: HEX.navy, margin: 0, valign: "middle", objectName: nm("chart-title") });
  const colors = [sec.color, "0B1E3F", "7C8AA0", "B3BDCB"];
  slide.addChart(pres.charts.LINE, spec.series.map((s) => ({ name: s.name, labels: spec.cats.map(String), values: s.values })), {
    x: x + 0.1, y: y + 0.5, w: w - 0.2, h: h - 0.6, objectName: nm("chart"),
    chartColors: colors.slice(0, spec.series.length),
    lineSize: 2.25, lineDataSymbol: spec.markers === false ? "none" : "circle", lineDataSymbolSize: 7,
    showLegend: true, legendPos: "b", legendFontSize: 11, legendFontFace: "+mn-lt", legendColor: HEX.ink,
    showCatAxisTitle: true, catAxisTitle: spec.xTitle, catAxisTitleFontSize: 12, catAxisTitleColor: HEX.muted, catAxisTitleFontFace: "+mn-lt",
    showValAxisTitle: true, valAxisTitle: spec.yTitle, valAxisTitleFontSize: 12, valAxisTitleColor: HEX.muted, valAxisTitleFontFace: "+mn-lt",
    catAxisLabelFontSize: 11, valAxisLabelFontSize: 11, catAxisLabelColor: HEX.muted, valAxisLabelColor: HEX.muted,
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt",
    valGridLine: { color: "E3E8EF", size: 0.75 }, catGridLine: { style: "none" },
    catAxisLineColor: "B8C2CF", valAxisLineShow: false,
    valAxisMinVal: spec.yMin, valAxisMaxVal: spec.yMax, valAxisMajorUnit: spec.yStep, valAxisLabelFormatCode: spec.fmt || "0.0",
    catAxisLabelFrequency: spec.labelEvery || 1,
    layout: { x: 0.12, y: 0.05, w: 0.85, h: 0.57 },
  });
}

function statCallout(slide, sec, x, y, w, h, value, label) {
  card(slide, x, y, w, h, { fill: sec.tint, line: sec.tint, name: "stat" });
  slide.addText(value, { x: x + 0.2, y, w: 1.45, h, fontSize: 28, bold: true, color: sec.dark, margin: 0, valign: "middle", fontFace: "+mj-lt", objectName: nm("stat-value") });
  slide.addText(rich(label, { fontSize: 14, color: HEX.ink }), { x: x + 1.7, y, w: w - 1.85, h, margin: 0, valign: "middle", objectName: nm("stat-label") });
}

function illustrativeTag(slide, x, y) {
  slide.addText("ILLUSTRATIVE DATA · replace with your results", { shape: S.ROUNDED_RECTANGLE, rectRadius: 0.14, x, y, w: 3.75, h: 0.28, fontSize: 10, bold: true, color: HEX.goldD, align: "center", valign: "middle", margin: 0,
    fill: { color: "FFF7E3" }, line: { color: HEX.gold, width: 0.75 }, objectName: nm("illustrative-tag") });
}

function figure(slide, file, x, y, w, h, alt) {
  slide.addImage({ path: FIG(file), x, y, w, h, altText: alt, objectName: nm("figure") });
}

// ======================================================================== slides
function buildSlides() {
  // ---------------------------------------------------------------- 1. title
  pres.addSection({ title: "Opening" });
  let s = pres.addSlide({ masterName: "TITLE", sectionTitle: "Opening" });
  s.addText([{ text: "Emerging Techniques for" }, { text: "Space-Air-Ground Integrated Networks", options: { softBreakBefore: true } }], { placeholder: "title" });
  s.addText("Polarforming  ·  Atomic Quantum Receivers  ·  MADRL and Rate-Splitting Multiple Access", { placeholder: "subtitle" });
  s.addText(paras([
    rich("Miao Zhang", { fontSize: 18, bold: true, color: HEX.white }),
    rich("Department / Laboratory, University", { fontSize: 15, color: "D6E2F2" }),
    rich("Seminar Series  ·  Month DD, 2026", { fontSize: 15, color: "D6E2F2" }),
  ]), { placeholder: "presenter" });
  s.addNotes("Title slide. Replace the affiliation and date (they are placeholders). One-sentence hook: SAGIN promises global 6G coverage, but each layer brings its own bottleneck; this talk presents three emerging techniques that address them, and how to optimize each one.");

  // ---------------------------------------------------------------- 2. outline
  s = newSlide("CONTENT_GENERAL", "Opening", "Outline",
    "Background first, then three optimization case studies that share one structure: system model, proposed design, results.",
    "Walk through the four parts. Parts II–IV follow the same three-slide pattern (system model, proposed design, simulation results), so the audience knows what to expect.");
  s.addText("ROADMAP", { placeholder: "kicker" });
  const outline = [
    { k: "I", icon: "TbWorld", title: "Introduction", items: ["SAGIN", "Polarforming", "Atomic receivers", "RSMA", "MADRL"], q: "Which tools fit which layer?" },
    { k: "II", icon: "TbAntenna", title: "Polarforming Design in SAGIN", items: ["System model", "Proposed design", "Simulation results"], q: "Can antennas follow the channel's polarization?" },
    { k: "III", icon: "TbAtom", title: "Atomic-to-Space: Quantum Receiver for SAGINs", items: ["System model", "Proposed design", "Simulation results"], q: "Can atoms hear weak satellite signals?" },
    { k: "IV", icon: "TbBrain", title: SEC.IV.name, items: ["System model", "Proposed design", "Simulation results"], q: "Can UAVs learn to share spectrum with RSMA?" },
  ];
  const cw = (CW - 3 * 0.25) / 4;
  outline.forEach((o, i) => {
    const x = M + i * (cw + 0.25), y = TOP + 0.05, sec = SEC[o.k];
    card(s, x, y, cw, 4.25, { fill: sec.tint, line: sec.tint, name: "outline-card" });
    iconCircle(s, x + 0.25, y + 0.25, 0.62, sec.scheme, o.icon);
    s.addText(sec.label, { x: x + 1.02, y: y + 0.36, w: cw - 1.2, h: 0.4, fontSize: 13, bold: true, color: sec.dark, charSpacing: 3, margin: 0, valign: "middle", objectName: nm("outline-part") });
    s.addText(o.title, { x: x + 0.25, y: y + 1.0, w: cw - 0.5, h: 0.98, fontSize: 18, bold: true, color: HEX.navy, margin: 0, valign: "top", objectName: nm("outline-title") });
    s.addText(o.items.map((t, j) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: j < o.items.length - 1 } })),
      { x: x + 0.25, y: y + 2.05, w: cw - 0.45, h: 1.5, fontSize: 14, color: HEX.ink, margin: 0, valign: "top", paraSpaceAfter: 4, objectName: nm("outline-items") });
    s.addText(o.q, { x: x + 0.25, y: y + 3.66, w: cw - 0.5, h: 0.5, fontSize: 14, italic: true, color: sec.dark, margin: 0, valign: "top", objectName: nm("outline-question") });
  });
  s.addText(rich("Then: **conclusion & future directions**, references, and Q&A", { fontSize: 14, color: HEX.muted }),
    { x: M, y: 6.42, w: CW, h: 0.36, margin: 0, valign: "middle", objectName: nm("outline-footer") });

  // ======================================================== PART I: Intro
  pres.addSection({ title: "Part I: Introduction" });
  sectionSlide("I", "Part I: Introduction", "SAGIN  ·  Polarforming  ·  Atomic receivers  ·  RSMA  ·  MADRL",
    "Part I gives the background needed for the three technical parts: the SAGIN architecture and the four enabling techniques.");

  // ---------------------------------------------------------------- SAGIN
  s = newSlide("CONTENT_I", "Part I: Introduction", "Space-Air-Ground Integrated Network (SAGIN)",
    "Satellites, aerial platforms and terrestrial networks merged into one system for seamless, global 6G coverage [1].",
    "Introduce the three layers and their roles. Stress that the layers differ in altitude, mobility, delay and on-board resources, which is exactly why cross-layer optimization is needed. Figure: own illustration; replace freely.");
  iconRows(s, SEC.I, M, TOP + 0.05, 5.85, [
    { icon: "TbSatellite", head: "Space layer", body: "GEO/MEO/LEO satellites and mega-constellations: global coverage, backhaul and broadcasting." },
    { icon: "TbDrone", head: "Air layer", body: "HAPs, airships and UAVs: flexible on-demand coverage, relaying and edge computing." },
    { icon: "TbBuildingBroadcastTower", head: "Ground layer", body: "Cellular BSs, gateways, IoT devices, vehicles and ships: high capacity and low latency." },
  ], 0.88);
  s.addText("Key challenges", { x: M, y: 4.62, w: 5.85, h: 0.32, fontSize: 15, bold: true, color: HEX.navy, margin: 0, valign: "middle", objectName: nm("label") });
  let cx = M;
  for (const t of ["Heterogeneity", "High mobility", "Long delay & Doppler"]) cx += chip(s, cx, 5.02, t, SEC.I) + 0.12;
  cx = M;
  for (const t of ["Limited on-board power", "Severe path loss"]) cx += chip(s, cx, 5.46, t, SEC.I) + 0.12;
  iconCircle(s, M, 6.06, 0.46, SEC.I.scheme, "TbTarget");
  s.addText(rich("Cross-layer optimization: beamforming, access, trajectory and resource allocation must be designed jointly.", { fontSize: 14, color: SEC.I.dark, italic: true }),
    { x: M + 0.64, y: 5.98, w: 5.21, h: 0.62, margin: 0, valign: "middle", objectName: nm("takeaway") });
  figure(s, "sagin.png", 6.73, TOP + 0.03, 6.0, 4.7, "Layered SAGIN architecture: GEO and LEO satellites with inter-satellite links, a HAP and UAVs in the air layer, and base station, gateway, users, vehicle and ship on the ground.");

  // ---------------------------------------------------------------- Polarforming
  s = newSlide("CONTENT_I", "Part I: Introduction", "Polarforming: Reconfigurable Antenna Polarization",
    "Adapt each antenna's polarization to the channel, just as beamforming adapts its phase and amplitude [2].",
    "Polarforming (Zhou et al. [2]) uses polarization-reconfigurable antennas. With two phase shifters and a hybrid, one element can synthesize any polarization state. Key message: polarization becomes an optimization variable, which matters in satellite links because of Faraday rotation.");
  figure(s, "polarforming.png", M, TOP + 0.03, 6.0, 4.7, "Phase-shifter-based polarization-reconfigurable antenna, reachable polarization states, and polarization mismatch under Faraday rotation with and without polarforming.");
  iconRows(s, SEC.I, 6.95, TOP + 0.05, 5.78, [
    { icon: "TbAdjustments", head: "How it works", body: "A dual-polarized element fed through phase shifters synthesizes linear, circular or elliptical polarization." },
    { icon: "TbRotate", head: "Why it matters", body: "Faraday rotation, platform attitude and scattering cause polarization mismatch; at 90° a fixed antenna loses the link." },
    { icon: "TbShieldCheck", head: "What it buys", body: "Full polarization diversity (order 2 per dual-polarized antenna) and robustness to depolarization [2]." },
  ], ROW_H);
  eqAndNote(s, 6.95, 5.78, "Polarforming (Jones) vector of one antenna", "int_pf",
    "**In SAGIN:** track ionospheric rotation on satellite links and attitude changes of UAV and handheld terminals.");

  // ---------------------------------------------------------------- Atomic receiver
  s = newSlide("CONTENT_I", "Part I: Introduction", "Atomic (Rydberg) Quantum Receivers",
    "Highly excited atoms in a vapor cell act as the antenna: an RF field changes how the atoms absorb laser light [3].",
    "Explain EIT and Autler–Townes splitting with the ladder diagram. The superheterodyne version (Jing et al. [4]) adds a local oscillator so amplitude and phase can be read out. Be careful with sensitivity claims; quote the measured number and its reference.");
  iconRows(s, SEC.I, M, TOP + 0.05, 5.85, [
    { icon: "TbAtom", head: "Principle", body: "Probe and coupling lasers create EIT; a resonant RF field splits the line (Autler–Townes) in proportion to |E|." },
    { icon: "TbWaveSine", head: "Superheterodyne", body: "A local-oscillator field adds phase readout; measured sensitivity 55\u00A0nV\u00A0cm$^{-1}$\u00A0Hz$^{-1/2}$ [4]." },
    { icon: "TbGauge", head: "Advantages", body: "SI-traceable, tunable from MHz to THz, and the sensor size is not tied to the wavelength." },
  ], ROW_H);
  eqAndNote(s, M, 5.85, "Field from the measured splitting (SI-traceable)", "int_at",
    "**In SAGIN:** detect very weak signals on long space–ground links; one vapor cell can serve several bands.");
  figure(s, "rydberg.png", 6.73, TOP + 0.03, 6.0, 4.7, "Rydberg atomic receiver: cesium vapor cell with probe and coupling lasers, signal and local-oscillator fields, four-level ladder, and EIT versus Autler-Townes split transmission spectra.");

  // ---------------------------------------------------------------- RSMA
  s = newSlide("CONTENT_I", "Part I: Introduction", "Rate-Splitting Multiple Access (RSMA)",
    "Split messages into common and private parts, so interference is partly decoded and partly treated as noise [5], [6].",
    "RSMA (Mao, Clerckx et al. [5], [6]) bridges SDMA (no common stream) and NOMA (full SIC). In SAGIN it is attractive because satellite CSIT is outdated and beams are often overloaded. It is the multiple-access scheme used in Parts II and IV.");
  figure(s, "rsma.png", M, TOP + 0.03, 6.0, 4.7, "RSMA transmitter and receivers: messages split into common and private parts, common stream decoded first by all users and removed by SIC.");
  iconRows(s, SEC.I, 6.95, TOP + 0.05, 5.78, [
    { icon: "TbArrowsSplit", head: "Rate splitting", body: "Message $W_k$ is split into a common part $W_{c,k}$ and a private part $W_{p,k}$." },
    { icon: "TbStack2", head: "Superposition + SIC", body: "Users decode the common stream $s_c$, remove it by SIC, then decode their own $s_k$." },
    { icon: "TbHierarchy", head: "Generality", body: "SDMA, NOMA, OMA and multicasting are all special cases of RSMA [6]." },
  ], ROW_H);
  eqAndNote(s, 6.95, 5.78, "Transmit signal", "int_rsma",
    "**In SAGIN:** robust to imperfect CSIT from long delays and Doppler, and to overloaded satellite beams.");

  // ---------------------------------------------------------------- MADRL
  s = newSlide("CONTENT_I", "Part I: Introduction", "Multi-Agent Deep Reinforcement Learning (MADRL)",
    "Satellites, UAVs and base stations learn cooperative policies from interaction instead of re-solving a hard problem every slot.",
    "Introduce the Markov game / Dec-POMDP view and the CTDE paradigm (MADDPG [7], MAPPO [8]). Emphasize: training can use global information, execution only needs local observations — a natural fit for SAGIN where global CSI is unavailable in real time.");
  iconRows(s, SEC.I, M, TOP + 0.05, 5.85, [
    { icon: "TbAffiliate", head: "Model", body: "Markov game / Dec-POMDP: agent $j$ sees observation $o_j$, takes action $a_j$; agents share reward $r$." },
    { icon: "TbBrain", head: "CTDE", body: "Centralized training with a critic that sees the global state; decentralized execution with local actors." },
    { icon: "TbCpu", head: "Algorithms", body: "MADDPG [7], MAPPO [8], QMIX and other value-decomposition methods." },
  ], ROW_H);
  eqAndNote(s, M, 5.85, "Cooperative objective", "int_marl",
    "**In SAGIN:** real-time, distributed control of trajectory, power, beamforming and access.");
  figure(s, "madrl.png", 6.73, TOP + 0.03, 6.0, 4.7, "Centralized training, decentralized execution: agents with policy networks act on a SAGIN environment; a centralized critic is used only during training.");

  // ============================================== PART II: Polarforming
  pres.addSection({ title: "Part II: Polarforming" });
  sectionSlide("II", "Part II: Polarforming", "System model  ·  Proposed design  ·  Simulation results",
    "Part II: polarforming-aided RSMA for a LEO downlink. Replace the content with your own model and results; the three-slide structure stays.");

  const d2 = DATA.part2;
  s = newSlide("CONTENT_II", "Part II: Polarforming", "System Model",
    "A LEO satellite with an $N$-element PRA array serves $K$ PRA-equipped ground and aerial users with RSMA.",
    "Walk through the figure from top to bottom: PRA array on the satellite, ionospheric Faraday rotation, depolarization near the ground, PRA at each user. Then the three equations: Jones vector, polarized channel, effective channel and received signal. Template note: equations are images; their LaTeX source is in each picture's alt text.");
  figure(s, "pf_system.png", M, TOP, 5.3, 4.24, "System model: LEO satellite with a polarization-reconfigurable antenna array serving a handheld user, a vehicle, a ship and a UAV with common and private RSMA streams through the ionosphere.");
  caption(s, M, 6.24, 5.3, "Fig. Polarforming-aided RSMA downlink through a rotating, depolarizing channel.");
  let y = TOP;
  y += mathCard(s, 6.2, y, 6.53, "Polarforming vector of each PRA (transmit $\\b{p}_n$, receive $\\b{p}_k$)", ["pf_jones"], { labelColor: SEC.II.dark }) + 0.14;
  y += mathCard(s, 6.2, y, 6.53, "Polarized channel from antenna $n$ to user $k$", ["pf_channel"], { labelColor: SEC.II.dark }) + 0.14;
  mathCard(s, 6.2, y, 6.53, "Effective channel and received RSMA signal", ["pf_effective", "pf_signal"], { labelColor: SEC.II.dark });

  s = newSlide("CONTENT_II", "Part II: Polarforming", "Proposed Design: Polarforming-Aided RSMA",
    "Maximize the minimum user rate by jointly optimizing RSMA precoders, the common-rate split and every polarforming vector.",
    "State the max-min problem (P1). Explain why it is hard: non-convex rates, coupled precoders and polarization vectors, and Jones-vector constraints. Then the AO algorithm: each block is solved optimally or by a convex surrogate, so the objective never decreases. Replace with your actual algorithm and complexity.");
  y = TOP;
  y += mathCard(s, M, y, 6.35, "Common and private rates of user $k$", ["pf_rates"], { labelColor: SEC.II.dark }) + 0.14;
  y += mathCard(s, M, y, 6.35, "Max-min fairness problem", ["pf_problem"], { labelColor: SEC.II.dark }) + 0.16;
  cx = M;
  s.addText("Challenges:", { x: cx, y, w: 1.15, h: 0.34, fontSize: 14, bold: true, color: HEX.navy, margin: 0, valign: "middle", objectName: nm("label") });
  cx += 1.2;
  for (const t of ["non-convex rates", "coupled variables", "Jones constraints"]) cx += chip(s, cx, y, t, SEC.II) + 0.1;
  aoFlowchart(s, SEC.II, 7.25, TOP, 5.48);

  s = newSlide("CONTENT_II", "Part II: Polarforming", "Simulation Results",
    "Polarforming lifts every curve, RSMA keeps scaling at high power, and fixed linear polarization collapses under Faraday rotation.",
    "Left: max-min rate versus transmit power. Right: robustness to Faraday rotation at 20 dBW. THE DATA ARE ILLUSTRATIVE (toy model in src/sim_data.py) — right-click each chart → Edit Data to paste your own results; the callout numbers below must be updated by hand.");
  const p20 = d2.power_dbw.indexOf(20);
  chartCard(s, SEC.II, M, TOP, 5.94, 3.6, {
    title: "Max-min rate vs. transmit power", cats: d2.power_dbw, xTitle: "Transmit power (dBW)", yTitle: "Max-min rate (bps/Hz)",
    yMin: 0, yMax: 3, yStep: 0.5, series: [
      { name: "PF-RSMA (proposed)", values: d2.vs_power.pf_rsma }, { name: "FP-RSMA", values: d2.vs_power.fp_rsma },
      { name: "PF-SDMA", values: d2.vs_power.pf_sdma }, { name: "FP-SDMA", values: d2.vs_power.fp_sdma }],
  });
  chartCard(s, SEC.II, M + 6.19, TOP, 5.94, 3.6, {
    title: "Robustness to Faraday rotation (20 dBW)", cats: d2.faraday_deg, xTitle: "Faraday rotation Ω (deg)", yTitle: "Max-min rate (bps/Hz)",
    yMin: 0, yMax: 2.5, yStep: 0.5, series: [
      { name: "Polarforming (proposed)", values: d2.vs_faraday.pf }, { name: "Circular Tx, linear Rx", values: d2.vs_faraday.cp },
      { name: "Linear Tx, linear Rx", values: d2.vs_faraday.lp }],
  });
  caption(s, M, 5.6, 7.9, "Setup: $N = 16$, $K = 4$ clustered users, Rician $κ = 10$ dB, XPD 12 dB, 3% CSIT error. PF/FP: polarforming / fixed polarization.");
  illustrativeTag(s, W - M - 3.75, 5.6);
  const pfGain = pct(d2.vs_power.pf_rsma[p20], d2.vs_power.fp_rsma[p20]);
  const rsGain = pct(d2.vs_power.pf_rsma[p20], d2.vs_power.pf_sdma[p20]);
  const om90 = d2.vs_faraday.pf.at(-1) / d2.vs_faraday.lp.at(-1);
  const sw = (CW - 2 * 0.2) / 3;
  statCallout(s, SEC.II, M, 6.0, sw, 0.8, `+${pfGain}%`, "vs. fixed polarization at 20\u00A0dBW");
  statCallout(s, SEC.II, M + sw + 0.2, 6.0, sw, 0.8, `+${rsGain}%`, "RSMA vs. SDMA, both with polarforming");
  statCallout(s, SEC.II, M + 2 * (sw + 0.2), 6.0, sw, 0.8, `${om90.toFixed(0)}×`, "vs. fixed linear at Ω\u00A0=\u00A090°");

  // ============================================== PART III: Atomic receiver
  pres.addSection({ title: "Part III: Atomic-to-Space" });
  sectionSlide("III", "Part III: Atomic-to-Space", "System model  ·  Proposed design  ·  Simulation results",
    "Part III: Rydberg atomic quantum receivers for satellite-to-ground links. The structure mirrors Part II.");

  const d3 = DATA.part3;
  s = newSlide("CONTENT_III", "Part III: Atomic-to-Space", "System Model",
    "A LEO satellite precodes its downlink to a ground terminal whose antenna is an array of $M$ Rydberg vapor cells with a local oscillator.",
    "Physical chain: satellite precoder → long, Doppler-shifted link → vapor cells illuminated by an LO → photodetectors → IF demodulation → detector. The general model is a biased phase-retrieval problem (Cui, Zeng, Huang [9]); with a strong LO it becomes linear (superheterodyne). Noise terms: photon shot, quantum projection, blackbody, extrinsic.");
  figure(s, "aq_system.png", M, TOP, 5.3, 4.24, "System model: LEO satellite with a precoder sending to a ground terminal with four vapor cells, an LO horn, photodetectors, IQ demodulation and a biased phase-retrieval detector.");
  caption(s, M, 6.24, 5.3, "Fig. Satellite-to-RAQR link with superheterodyne (LO-assisted) detection.");
  y = TOP;
  y += mathCard(s, 6.2, y, 6.53, "Atomic response: Rabi frequency of the RF transition in cell $m$", ["aq_rabi"], { labelColor: SEC.III.dark }) + 0.14;
  y += mathCard(s, 6.2, y, 6.53, "General output model: biased phase retrieval [9]", ["aq_bpr"], { labelColor: SEC.III.dark }) + 0.14;
  y += mathCard(s, 6.2, y, 6.53, "Strong-LO (superheterodyne) linearization", ["aq_linear"], { labelColor: SEC.III.dark }) + 0.14;
  mathCard(s, 6.2, y, 6.53, "Output SNR with combining over $M$ cells", ["aq_snr"], { labelColor: SEC.III.dark });

  s = newSlide("CONTENT_III", "Part III: Atomic-to-Space", "Proposed Design: LO- and Doppler-Aware Reception",
    "Choose the satellite precoder and every cell's LO jointly: maximize SNR while each vapor cell stays in its linear regime.",
    "Problem (P2): the LO amplitude sets the conversion gain κ and the noise; the linear-regime constraint keeps the signal small relative to the LO; the frequency constraint keeps the Doppler-shifted beat note inside the atomic bandwidth. The three-step solution is shown below the pipeline. Replace with your algorithm.");
  mathCard(s, M, TOP, 6.0, "SNR maximization with linear-regime and bandwidth constraints", ["aq_problem"], { labelColor: SEC.III.dark });
  figure(s, "aq_pipeline.png", 6.73, TOP, 6.0, 2.42, "Receive pipeline: ephemeris to Doppler predictor to LO synthesizer, RAQR array, IQ demodulation and EM-GS detector, with an LO amplitude feedback loop.");
  const stepW = (CW - 2 * 0.25) / 3;
  [
    { icon: "TbRadar", head: "1  Doppler-aware LO tracking", body: "Predict $f_D(t)$ from the ephemeris and set $f_{\\r{LO}} = f_c + f_D(t) − f_{\\r{IF}}$, so the beat note stays inside $B_{\\r{IF}}$." },
    { icon: "TbAdjustments", head: "2  LO amplitude + precoder (AO)", body: "1-D search of $E_{\\r{LO},m}$ maximizes $κ_m^2/σ_m^2$; for fixed LOs the precoder $\\b{w}$ is a convex SOCP. Alternate." },
    { icon: "TbFocus2", head: "3  Biased phase-retrieval detection", body: "EM-based Gerchberg–Saxton (EM-GS) handles the residual nonlinearity to recover ŝ [9]." },
  ].forEach((st, i) => {
    const x = M + i * (stepW + 0.25), yy = 4.62;
    card(s, x, yy, stepW, 1.98, { fill: SEC.III.tint, line: SEC.III.tint, name: "step-card" });
    iconCircle(s, x + 0.22, yy + 0.22, 0.46, SEC.III.scheme, st.icon);
    s.addText(st.head, { x: x + 0.82, y: yy + 0.2, w: stepW - 1.0, h: 0.5, fontSize: 15, bold: true, color: HEX.navy, margin: 0, valign: "middle", objectName: nm("step-head") });
    s.addText(rich(st.body, { fontSize: 14, color: HEX.ink }), { x: x + 0.22, y: yy + 0.82, w: stepW - 0.42, h: 1.06, margin: 0, valign: "top", objectName: nm("step-body") });
  });

  s = newSlide("CONTENT_III", "Part III: Atomic-to-Space", "Simulation Results",
    "Atomic reception stretches the usable slant range, but only if the LO amplitude is chosen well.",
    "Left: achievable rate versus slant range for the proposed LO/precoder design, a fixed LO, and a conventional RF front end. Right: output SNR versus normalized LO amplitude — there is an optimum, which motivates step 2. THE DATA ARE ILLUSTRATIVE (toy link budget in src/sim_data.py); replace them and the callouts.");
  chartCard(s, SEC.III, M, TOP, 5.94, 3.6, {
    title: "Achievable rate vs. slant range", cats: d3.range_km.map((v) => v.toLocaleString("en-US")), xTitle: "Slant range (km)", yTitle: "Rate (bps/Hz)",
    yMin: 0, yMax: 7, yStep: 1, fmt: "0", series: [
      { name: "RAQR, optimized LO (proposed)", values: d3.vs_range.raqr_opt }, { name: "RAQR, fixed LO", values: d3.vs_range.raqr_fixed },
      { name: "Conventional RF receiver", values: d3.vs_range.conv }],
    labelEvery: 2,
  });
  chartCard(s, SEC.III, M + 6.19, TOP, 5.94, 3.6, {
    title: "Output SNR vs. LO amplitude", cats: d3.lo_norm, xTitle: "LO amplitude (normalized to optimum)", yTitle: "Output SNR (dB)",
    yMin: -15, yMax: 25, yStep: 5, fmt: "0", series: [
      { name: "M = 16 cells", values: d3.vs_lo.M16 }, { name: "M = 4 cells", values: d3.vs_lo.M4 }, { name: "M = 1 cell", values: d3.vs_lo.M1 }],
  });
  caption(s, M, 5.6, 7.9, "Setup: LEO downlink, free-space loss, conventional front-end SNR 8 dB at 500 km; LO amplitude normalized to its optimum.");
  illustrativeTag(s, W - M - 3.75, 5.6);
  const i2000 = d3.range_km.indexOf(2000);
  const rangeGain = d3.vs_range.raqr_opt[i2000] / d3.vs_range.conv[i2000];
  const loss5 = d3.vs_lo.M16[d3.lo_norm.indexOf(1)] - d3.vs_lo.M16[d3.lo_norm.indexOf(5)];
  statCallout(s, SEC.III, M, 6.0, sw, 0.8, "+10 dB", "SNR over a conventional RF front end");
  statCallout(s, SEC.III, M + sw + 0.2, 6.0, sw, 0.8, `${rangeGain.toFixed(1)}×`, "rate at 2,000\u00A0km slant range");
  statCallout(s, SEC.III, M + 2 * (sw + 0.2), 6.0, sw, 0.8, `−${loss5.toFixed(0)} dB`, "if the LO is 5× too strong");

  // ============================================== PART IV: MADRL
  pres.addSection({ title: "Part IV: MADRL and RSMA" });
  sectionSlide("IV", "Part IV: MADRL and RSMA", "System model  ·  Proposed design  ·  Simulation results",
    "Part IV: multi-agent deep reinforcement learning combined with rate-splitting multiple access, for a multi-UAV network with LEO backhaul.");

  const d4 = DATA.part4;
  s = newSlide("CONTENT_IV", "Part IV: MADRL and RSMA", "System Model",
    "$J$ UAVs with LEO backhaul serve $K$ ground users with RSMA; each UAV is an agent that moves and allocates power on its own.",
    "Scenario: LEO satellite provides backhaul C_j^sat(t); each UAV serves its cluster with RSMA; inter-UAV interference couples the agents. Problem (P3) is a long-term, coupled, partially observable control problem — hard for one-shot optimization, natural for MADRL.");
  figure(s, "ma_system.png", M, TOP, 5.3, 4.24, "System model: LEO backhaul to three UAV agents, each serving a cluster of ground users, with trajectories, a minimum-distance constraint and inter-UAV interference.");
  caption(s, M, 6.24, 5.3, "Fig. Multi-UAV RSMA network with LEO backhaul; one agent per UAV.");
  y = TOP;
  y += mathCard(s, 6.2, y, 6.53, "Air-to-ground Rician channel ($d_{j,k}$: UAV–user distance)", ["ma_channel"], { labelColor: SEC.IV.dark }) + 0.14;
  y += mathCard(s, 6.2, y, 6.53, "Achievable rate of user $k$ served by UAV $j$", ["ma_rate"], { labelColor: SEC.IV.dark }) + 0.14;
  mathCard(s, 6.2, y, 6.53, "Long-term sum-rate maximization", ["ma_problem"], { labelColor: SEC.IV.dark });

  s = newSlide("CONTENT_IV", "Part IV: MADRL and RSMA", "Proposed Design: MAPPO with a Centralized Critic",
    "Recast (P3) as a Dec-POMDP and train shared actors with a centralized critic; execution needs only local observations.",
    "Map P3 to a Dec-POMDP (table). Actors output movement, power split and common-rate shares; the critic sees the global state during training only. Mention reward shaping (QoS and collision penalties) and training tricks (parameter sharing, GAE, PPO clipping). Replace with your network sizes and hyperparameters.");
  figure(s, "ma_arch.png", M, TOP, 6.4, 3.0, "MAPPO architecture: decentralized actors with shared weights output movement, power split and common rate; a SAGIN simulator returns observations and rewards; a rollout buffer, central critic and PPO update train the actors.");
  mathCard(s, M, 5.06, 6.4, "MAPPO actor (clipped surrogate) and critic losses", ["ma_ppo"], { labelColor: SEC.IV.dark });
  mdpTable(s, 7.25, TOP, 5.48);
  const rh = mathCard(s, 7.25, 5.06, 5.48, "Shared reward", ["ma_reward"], { labelColor: SEC.IV.dark });
  s.addText(rich("**Execution:** each UAV runs its own actor on board from local $o_j$ only; the critic is dropped after training.", { fontSize: 14, color: HEX.ink }),
    { x: 7.25, y: 5.06 + rh + 0.12, w: 5.48, h: 0.5, margin: 0, valign: "top", objectName: nm("note") });

  s = newSlide("CONTENT_IV", "Part IV: MADRL and RSMA", "Simulation Results",
    "MAPPO with a centralized critic learns faster and better, and RSMA keeps adding rate when the network is overloaded.",
    "Left: learning curves (average episode reward). Right: sum rate versus number of users for different multiple-access schemes. THE DATA ARE ILLUSTRATIVE (synthetic curves in src/sim_data.py); replace them and the callouts.");
  chartCard(s, SEC.IV, M, TOP, 5.94, 3.6, {
    title: "Training convergence", cats: every2(d4.episodes).map((e) => (e / 1000).toFixed(1)), xTitle: "Training episodes (×10³)", yTitle: "Average episode reward",
    yMin: -40, yMax: 120, yStep: 40, fmt: "0", markers: false, series: [
      { name: "MAPPO-CTDE (proposed)", values: every2(d4.training.mappo) }, { name: "MADDPG", values: every2(d4.training.maddpg) },
      { name: "IPPO", values: every2(d4.training.ippo) }, { name: "Random policy", values: every2(d4.training.random) }],
  });
  chartCard(s, SEC.IV, M + 6.19, TOP, 5.94, 3.6, {
    title: "Sum rate vs. number of users", cats: d4.users, xTitle: "Number of users K", yTitle: "Sum rate (bps/Hz)",
    yMin: 0, yMax: 40, yStep: 10, fmt: "0", series: [
      { name: "MADRL + RSMA (proposed)", values: d4.vs_users.rsma }, { name: "MADRL + SDMA", values: d4.vs_users.sdma },
      { name: "MADRL + NOMA", values: d4.vs_users.noma }, { name: "Static UAVs + RSMA", values: d4.vs_users.static }],
  });
  caption(s, M, 5.6, 7.9, "Setup: $J = 3$ UAVs with 4 antennas, altitude 100 m, LEO backhaul, 3,000 training episodes.");
  illustrativeTag(s, W - M - 3.75, 5.6);
  const avgLast = (a) => a.slice(-5).reduce((x, z) => x + z, 0) / 5;
  const rewGain = pct(avgLast(d4.training.mappo), avgLast(d4.training.maddpg));
  const reach = (a, thr) => d4.episodes[a.findIndex((v) => v >= thr)];
  const thr = 0.9 * avgLast(d4.training.maddpg);
  const speed = reach(d4.training.maddpg, thr) / reach(d4.training.mappo, thr);
  const kGain = pct(d4.vs_users.rsma.at(-1), d4.vs_users.sdma.at(-1));
  statCallout(s, SEC.IV, M, 6.0, sw, 0.8, `+${rewGain}%`, "final reward vs. MADDPG");
  statCallout(s, SEC.IV, M + sw + 0.2, 6.0, sw, 0.8, `${speed.toFixed(1)}×`, "faster to MADDPG's 90% reward level");
  statCallout(s, SEC.IV, M + 2 * (sw + 0.2), 6.0, sw, 0.8, `+${kGain}%`, `sum rate vs. SDMA at K\u00A0=\u00A0${d4.users.at(-1)}`);

  // ============================================== Closing
  pres.addSection({ title: "Closing" });
  s = newSlide("CONTENT_GENERAL", "Closing", "Conclusion & Future Directions",
    "Each layer of the SAGIN has its own bottleneck, and each called for a different optimization tool.",
    "One takeaway per technical part, then open problems. Adapt the future directions to your own research agenda.");
  s.addText("WRAP-UP", { placeholder: "kicker" });
  const tk = [
    { k: "II", icon: "TbAntenna", head: "Polarforming", body: "Polarization is a new degree of freedom: joint polarforming + RSMA design removes mismatch loss and adds diversity." },
    { k: "III", icon: "TbAtom", head: "Atomic receivers", body: "Quantum front ends extend space–ground links; LO and Doppler awareness decide how much of the gain is realized." },
    { k: "IV", icon: "TbBrain", head: "MADRL + RSMA", body: "CTDE learning steers UAV trajectories and RSMA power and rate splitting in real time, from local observations only." },
  ];
  const tw = (CW - 2 * 0.25) / 3;
  tk.forEach((t, i) => {
    const x = M + i * (tw + 0.25), sec = SEC[t.k];
    card(s, x, TOP, tw, 1.95, { fill: sec.tint, line: sec.tint, name: "takeaway-card" });
    iconCircle(s, x + 0.25, TOP + 0.25, 0.56, sec.scheme, t.icon);
    s.addText(t.head, { x: x + 0.95, y: TOP + 0.25, w: tw - 1.15, h: 0.56, fontSize: 17, bold: true, color: HEX.navy, margin: 0, valign: "middle", objectName: nm("takeaway-head") });
    s.addText(t.body, { x: x + 0.25, y: TOP + 0.92, w: tw - 0.5, h: 0.92, fontSize: 14, color: HEX.ink, margin: 0, valign: "top", objectName: nm("takeaway-body") });
  });
  s.addText("Future directions", { x: M, y: 4.12, w: 6, h: 0.36, fontSize: 17, bold: true, color: HEX.navy, margin: 0, valign: "middle", objectName: nm("label") });
  const fd = [
    { icon: "TbSparkles", text: "Polarization-resolved atomic receivers: polarforming meets Rydberg sensing" },
    { icon: "TbRadar", text: "Integrated sensing and communication across SAGIN layers" },
    { icon: "TbBulb", text: "LLM-assisted and foundation-model MADRL for network control" },
    { icon: "TbTool", text: "Hardware prototypes and over-the-air validation" },
  ];
  const fw = (CW - 0.3) / 2;
  fd.forEach((f, i) => {
    const x = M + (i % 2) * (fw + 0.3), yy = 4.6 + Math.floor(i / 2) * 0.68;
    iconCircle(s, x, yy, 0.46, C.accent5, f.icon);
    s.addText(f.text, { x: x + 0.62, y: yy - 0.06, w: fw - 0.65, h: 0.58, fontSize: 14, color: HEX.ink, margin: 0, valign: "middle", objectName: nm("future") });
  });
  s.addShape(S.ROUNDED_RECTANGLE, { x: M, y: 6.06, w: CW, h: 0.72, rectRadius: 0.1, fill: { color: C.text2 }, line: { color: C.text2, width: 0.5 }, objectName: nm("take-home") });
  iconCircle(s, M + 0.2, 6.19, 0.46, C.accent5, "TbTarget");
  s.addText(rich("**Take-home:** match the optimization tool to each layer's bottleneck: polarization, receiver sensitivity, or coordination.", { fontSize: 15, color: HEX.white }),
    { x: M + 0.82, y: 6.06, w: CW - 1.0, h: 0.72, margin: 0, valign: "middle", objectName: nm("take-home-text") });

  s = newSlide("CONTENT_GENERAL", "Closing", "References", null,
    "Key references cited on the slides. Add your own papers here (and cite them on the Part II–IV slides).");
  s.addText("KEY LITERATURE", { placeholder: "kicker" });
  const refs = [
    "J. Liu, Y. Shi, Z. M. Fadlullah, and N. Kato, “Space-air-ground integrated network: A survey,” IEEE Commun. Surveys Tuts., vol. 20, no. 4, pp. 2714–2741, 2018.",
    "Z. Zhou, J. Ding, C. Wang, B. Jiao, and R. Zhang, “Polarforming for wireless communications: Modeling and performance analysis,” arXiv:2409.07771, 2024.",
    "T. Gong et al., “Rydberg atomic quantum receivers for classical wireless communication and sensing,” IEEE Wireless Commun., 2025 (arXiv:2409.14501).",
    "M. Jing et al., “Atomic superheterodyne receiver based on microwave-dressed Rydberg spectroscopy,” Nature Physics, vol. 16, pp. 911–915, 2020.",
    "Y. Mao, B. Clerckx, and V. O. K. Li, “Rate-splitting multiple access for downlink communication systems: Bridging, generalizing, and outperforming SDMA and NOMA,” EURASIP J. Wireless Commun. Netw., art. 133, 2018.",
    "Y. Mao, O. Dizdar, B. Clerckx, R. Schober, P. Popovski, and H. V. Poor, “Rate-splitting multiple access: Fundamentals, survey, and future research trends,” IEEE Commun. Surveys Tuts., vol. 24, no. 4, pp. 2073–2126, 2022.",
    "R. Lowe et al., “Multi-agent actor-critic for mixed cooperative-competitive environments,” in Proc. NeurIPS, 2017.",
    "C. Yu et al., “The surprising effectiveness of PPO in cooperative multi-agent games,” in Proc. NeurIPS Datasets and Benchmarks Track, 2022.",
    "M. Cui, Q. Zeng, and K. Huang, “Towards atomic MIMO receivers,” arXiv:2404.04864, 2024.",
  ];
  const refRuns = (list, start) => list.map((r, i) => ({ text: `[${start + i}]  ${r}`, options: { breakLine: i < list.length - 1, paraSpaceAfter: 14 } }));
  s.addText(refRuns(refs.slice(0, 5), 1), { x: M, y: 1.5, w: 5.9, h: 5.3, fontSize: 14, color: HEX.ink, margin: 0, valign: "top", objectName: nm("refs") });
  s.addText(refRuns(refs.slice(5), 6), { x: M + 6.23, y: 1.5, w: 5.9, h: 5.3, fontSize: 14, color: HEX.ink, margin: 0, valign: "top", objectName: nm("refs") });

  s = pres.addSlide({ masterName: "CLOSING", sectionTitle: "Closing" });
  s.addText("Thank You", { placeholder: "title" });
  s.addText(paras([
    rich("Questions & discussion", { fontSize: 22, color: "A8D8FF" }),
    rich(" ", { fontSize: 10 }),
    rich("Miao Zhang  ·  your.email@university.edu", { fontSize: 16, color: "D6E2F2" }),
    rich("Department / Laboratory, University", { fontSize: 16, color: "D6E2F2" }),
  ]), { placeholder: "body" });
  s.addNotes("Closing slide. Replace the contact details.");
}


// Intro slides: equation card right below the icon rows, then a one-line "In SAGIN" note.
const ROW_H = 0.94;
function eqAndNote(slide, x, w, label, eqId, note) {
  const y = TOP + 0.05 + 3 * ROW_H + 0.04;
  const h = mathCard(slide, x, y, w, label, [eqId], { labelColor: SEC.I.dark });
  slide.addText(rich(note, { fontSize: 14, color: HEX.ink }), { x, y: y + h + 0.1, w, h: 0.52, margin: 0, valign: "top", objectName: nm("note") });
}

function pct(a, b) { return Math.round((a / b - 1) * 100); }
function every2(a) { return a.filter((_, i) => i % 2 === 0); }

function sectionSlide(k, sectionTitle, agenda, notes) {
  const sec = SEC[k];
  const s = pres.addSlide({ masterName: `SECTION_${k}`, sectionTitle });
  s.addText(sec.name, { placeholder: "title" });
  s.addText(agenda, { placeholder: "agenda" });
  s.addNotes(notes);
  return s;
}

// AO flowchart for Part II (native, editable shapes).
function aoFlowchart(s, sec, x, y, w) {
  s.addText("Alternating optimization (AO)", { x, y, w, h: 0.34, fontSize: 15, bold: true, color: sec.dark, margin: 0, valign: "middle", objectName: nm("flow-title") });
  const bw = w - 0.55;
  const steps = [
    { h: 0.5, fill: "F3F5F8", line: "C9D3E0", text: rich("**Initialize** fixed polarization $\\b{p}_n, \\b{p}_k$ and a feasible $\\b{W}$", { fontSize: 14, color: HEX.ink }) },
    { h: 0.74, fill: HEX.white, line: sec.color, text: paras([rich("**① Precoders + common rate**", { fontSize: 14, color: HEX.navy }), rich("given $\\b{p}$: convex SCA / WMMSE step for $\\b{W}, \\b{c}$", { fontSize: 14, color: HEX.ink })]) },
    { h: 0.74, fill: HEX.white, line: sec.color, text: paras([rich("**② Receive polarforming**", { fontSize: 14, color: HEX.navy }), rich("$\\b{p}_k$ ← dominant eigenvector (closed form)", { fontSize: 14, color: HEX.ink })]) },
    { h: 0.74, fill: HEX.white, line: sec.color, text: paras([rich("**③ Transmit polarforming**", { fontSize: 14, color: HEX.navy }), rich("$\\b{p}_n$ ← SCA / manifold step over $(α_n, δ_n)$", { fontSize: 14, color: HEX.ink })]) },
    { h: 0.46, fill: sec.tint, line: sec.tint, text: rich("**Converged?**  objective gain < ε", { fontSize: 14, color: sec.dark }) },
  ];
  let yy = y + 0.44;
  const pos = [];
  steps.forEach((st, i) => {
    s.addText(st.text, { shape: S.ROUNDED_RECTANGLE, rectRadius: 0.08, x, y: yy, w: bw, h: st.h, margin: [4, 10, 4, 12], valign: "middle", align: "left",
      fill: { color: st.fill }, line: { color: st.line, width: 1.25 }, objectName: nm("flow-step") });
    pos.push({ top: yy, bottom: yy + st.h });
    if (i < steps.length - 1) {
      s.addShape(S.LINE, { x: x + bw / 2, y: yy + st.h, w: 0, h: 0.16, line: { color: HEX.muted, width: 1.25, endArrowType: "triangle" }, objectName: nm("flow-arrow") });
      yy += st.h + 0.16;
    }
  });
  // loop back from "converged?" (no) to step ①
  const xr = x + bw, xl = x + bw + 0.32;
  const yDec = (pos[4].top + pos[4].bottom) / 2, yOne = (pos[1].top + pos[1].bottom) / 2;
  s.addShape(S.LINE, { x: xr, y: yDec, w: 0.32, h: 0, line: { color: sec.dark, width: 1.25 }, objectName: nm("flow-loop") });
  s.addShape(S.LINE, { x: xl, y: yOne, w: 0, h: yDec - yOne, line: { color: sec.dark, width: 1.25 }, objectName: nm("flow-loop") });
  s.addShape(S.LINE, { x: xr, y: yOne, w: 0.32, h: 0, flipH: true, line: { color: sec.dark, width: 1.25, endArrowType: "triangle" }, objectName: nm("flow-loop") });
  s.addText("no", { x: xl - 0.36, y: yDec - 0.3, w: 0.32, h: 0.24, fontSize: 11, italic: true, color: sec.dark, margin: 0, align: "right", objectName: nm("flow-no") });
  s.addText(rich("Each block never decreases the objective, so AO converges monotonically.", { fontSize: 13, color: HEX.muted, italic: true }),
    { x, y: pos[4].bottom + 0.12, w, h: 0.42, margin: 0, valign: "top", objectName: nm("flow-note") });
}

// Dec-POMDP design table for Part IV (native table).
function mdpTable(s, x, y, w) {
  const sec = SEC.IV;
  const head = (t) => ({ text: t, options: { bold: true, color: HEX.white, fill: { color: sec.color }, fontSize: 14 } });
  const cell1 = (t) => ({ text: rich(t, { fontSize: 14, bold: true, color: HEX.navy }), options: { fill: { color: sec.tint } } });
  const cell2 = (t) => ({ text: rich(t, { fontSize: 13.5, color: HEX.ink }), options: { fill: { color: HEX.white } } });
  const rows = [
    [head("Element"), head("Design")],
    [cell1("Observation $o_j(t)$"), cell2("own position $\\b{q}_j$, neighbors' positions, local channel gains, backhaul $C_j^{\\r{sat}}$, users' QoS backlog")],
    [cell1("Action $a_j(t)$"), cell2("move $Δ\\b{q}_j$, common/private power split $ζ_j$, common-rate shares $\\b{c}_j$")],
    [cell1("Reward $r(t)$"), cell2("shared: sum rate minus QoS-violation and collision penalties")],
    [cell1("Training"), cell2("CTDE, parameter sharing, GAE, PPO clip $ε = 0.2$")],
  ];
  s.addTable(rows, { x, y, w, colW: [1.62, w - 1.62], border: { type: "solid", pt: 0.75, color: "E1E7EF" }, margin: [4, 8, 4, 8], valign: "middle", fontSize: 14, objectName: nm("mdp-table") });
}

// ======================================================= post-processing ----
const SERIES_STYLE = [
  { dash: "solid", symbol: "circle", width: 2.75, hollow: false },
  { dash: "dash", symbol: "square", width: 2.0, hollow: true },
  { dash: "sysDot", symbol: "triangle", width: 2.0, hollow: true },
  { dash: "lgDash", symbol: "diamond", width: 2.0, hollow: true },
];

function styleChartXml(xml) {
  let idx = 0;
  return xml.replace(/<c:ser>[\s\S]*?<\/c:ser>/g, (ser) => {
    const st = SERIES_STYLE[idx++ % SERIES_STYLE.length];
    const color = (/<c:spPr><a:solidFill><a:srgbClr val="([0-9A-Fa-f]{6})"/.exec(ser) || [])[1] || "1B2638";
    const w = Math.round(st.width * 12700);
    ser = ser.replace(/(<c:spPr>[\s\S]*?<a:ln) w="\d+"([^>]*>)([\s\S]*?)<a:prstDash val="[^"]*"\/>/, (m, a, b, c) => `${a} w="${w}"${b}${c}<a:prstDash val="${st.dash}"/>`);
    ser = ser.replace(/<c:marker>[\s\S]*?<\/c:marker>/, (mk) => {
      if (/<c:symbol val="none"\/>/.test(mk)) return mk;
      const fill = st.hollow ? "FFFFFF" : color;
      return `<c:marker><c:symbol val="${st.symbol}"/><c:size val="7"/><c:spPr><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` +
        `<a:ln w="15875"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:prstDash val="solid"/></a:ln></c:spPr></c:marker>`;
    });
    return ser;
  });
}

function themeXml(xml) {
  const slots = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
  const scheme = `<a:clrScheme name="${THEME.name}">` + slots.map((k) => `<a:${k}><a:srgbClr val="${THEME.colors[k]}"/></a:${k}>`).join("") + "</a:clrScheme>";
  const out = xml.replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head) => `${head}${THEME.name}"`);
  if (!out.includes(scheme)) throw new Error("theme1.xml has no clrScheme to replace");
  return out;
}

async function postProcess(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  zip.file("ppt/theme/theme1.xml", themeXml(await zip.file("ppt/theme/theme1.xml").async("string")));
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)))
    zip.file(name, styleChartXml(await zip.file(name).async("string")));
  for (const name of Object.keys(zip.files).filter((n) => n.endsWith(".xml"))) {
    const bad = (await zip.file(name).async("string")).match(/<a:srgbClr val="((?![0-9A-Fa-f]{6}")[^"]*)"/);
    if (bad) throw new Error(`${name}: <a:srgbClr val="${bad[1]}"> is not a hex color (scheme color in a hex-only option)`);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

// ================================================================== main ----
(async () => {
  await prepareIcons(["TbWorld", "TbAntenna", "TbAtom", "TbBrain", "TbSatellite", "TbDrone", "TbBuildingBroadcastTower", "TbTarget",
    "TbAdjustments", "TbRotate", "TbShieldCheck", "TbWaveSine", "TbGauge", "TbArrowsSplit", "TbStack2", "TbHierarchy", "TbAffiliate",
    "TbCpu", "TbRadar", "TbFocus2", "TbSparkles", "TbBulb", "TbTool"]);
  // closing-slide background = mirrored title background
  await sharp(FIG("bg_title.jpg")).flop().jpeg({ quality: 90 }).toFile(FIG("bg_end.jpg"));
  defineLayouts();
  buildSlides();
  await pres.writeFile({ fileName: OUT });
  await postProcess(OUT);
  console.log("wrote", OUT);
})().catch((e) => { console.error(e); process.exit(1); });
