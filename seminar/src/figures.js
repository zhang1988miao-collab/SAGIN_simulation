// Figure definitions for the seminar deck (rendered by render_figures.js).
// Units: 1 unit = 0.01 inch on the slide, so a 600 x 470 figure fills 6.0" x 4.7".
const L = require("./figlib.js");
const { C, text, math, line, rect, circle, ellipse, path, group, arrow, curveArrow, wave, polEllipse, svgDoc, building } = L;

// ------------------------------------------------------------ helpers ----
function stars(w, h, n, seed, avoid = () => false) {
  const rng = L.mulberry32(seed);
  let s = "";
  for (let k = 0; k < n; k++) {
    const x = rng() * w, y = rng() * h;
    if (avoid(x, y)) continue;
    s += circle(x, y, 0.5 + rng() * 1.3, { fill: "#FFFFFF", opacity: (0.25 + rng() * 0.7).toFixed(2) });
  }
  return s;
}

function panel(w, h, fill = "#F3F6FA", stroke = "#DCE3EC") {
  return rect(1, 1, w - 2, h - 2, { fill, stroke, width: 1.5, r: 18 });
}

function tag(x, y, label, color, o = {}) {
  const size = o.size || 13, padX = 8, wTxt = label.length * size * 0.5 + 2;
  const w = o.w || wTxt + 2 * padX, h = size + 9;
  const x0 = o.anchor === "middle" ? x - w / 2 : o.anchor === "end" ? x - w : x;
  return rect(x0, y - h / 2, w, h, { fill: o.fill || C.white, stroke: color, width: 1.4, r: h / 2 })
    + text(x0 + w / 2, y + size * 0.35, label, { size, fill: o.textFill || color, anchor: "middle", weight: "bold" });
}

// =================================================================== I ====
// SAGIN layered architecture
function sagin() {
  const W = 600, H = 470;
  const defs = `
  <clipPath id="clipP"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18"/></clipPath>
  <linearGradient id="gSpace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081733"/><stop offset="1" stop-color="#1D4683"/></linearGradient>
  <linearGradient id="gAir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFDDF8"/><stop offset="1" stop-color="#EEF6FE"/></linearGradient>
  <linearGradient id="gGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CDEBD6"/><stop offset="1" stop-color="#A9D6B7"/></linearGradient>
  <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FCDEB"/><stop offset="1" stop-color="#6FAEDB"/></linearGradient>`;
  let b = "";
  b += rect(0, 0, W, 180, { fill: "url(#gSpace)" });
  b += stars(W, 170, 90, 3, (x, y) => (x < 170 && y < 56) || (x > 440 && y < 40));
  b += rect(0, 180, W, 175, { fill: "url(#gAir)" });
  b += path(`M0,180 L${W},180`, { stroke: "#6FB6F2", width: 3, opacity: 0.55 });
  for (const [cx, cy, s] of [[95, 300, 1], [520, 318, 0.8], [300, 205, 0.7]])
    b += group(ellipse(0, 0, 34, 9, { fill: C.white, opacity: 0.85 }) + ellipse(-14, -6, 16, 9, { fill: C.white, opacity: 0.85 }) + ellipse(10, -7, 18, 10, { fill: C.white, opacity: 0.85 }), { x: cx, y: cy, s });
  // ground: land + sea
  b += path(`M0,372 Q300,342 ${W},372 L${W},${H} L0,${H} Z`, { fill: "url(#gGround)" });
  b += path(`M440,358 Q525,352 ${W},372 L${W},${H} L418,${H} Q452,420 440,358 Z`, { fill: "url(#gSea)" });

  // ---- links (drawn first so icons sit on top)
  const sat1 = [300, 108], sat2 = [478, 64], geo = [112, 62], hap = [175, 238], u1 = [352, 272], u2 = [478, 238];
  const bs = [150, 392], iotP = [208, 436], gs = [264, 410], ph = [338, 418], carP = [408, 424], shipP = [528, 418];
  const L_S = { stroke: C.gold, width: 2.2, dash: "7 5" }, L_A = { stroke: C.sky, width: 2.2 }, L_G = { stroke: C.green, width: 2.2 };
  b += line(geo[0] + 30, geo[1] + 8, sat1[0] - 34, sat1[1] - 6, { ...L_S, opacity: 0.95 });
  b += line(sat1[0] + 34, sat1[1] - 8, sat2[0] - 32, sat2[1] + 6, { ...L_S, opacity: 0.95 });
  b += line(sat1[0] - 6, sat1[1] + 22, gs[0] + 9, gs[1] - 24, L_S);
  b += line(sat1[0] - 18, sat1[1] + 18, hap[0] + 12, hap[1] - 20, L_S);
  b += line(sat2[0] + 6, sat2[1] + 24, shipP[0] + 2, shipP[1] - 22, L_S);
  b += line(sat2[0] - 6, sat2[1] + 24, u2[0] + 2, u2[1] - 16, L_S);
  b += line(hap[0] - 4, hap[1] + 22, bs[0] + 2, bs[1] - 46, L_A);
  b += line(hap[0] + 16, hap[1] + 16, u1[0] - 26, u1[1] - 4, L_A);
  b += line(u1[0] - 6, u1[1] + 12, ph[0] + 2, ph[1] - 20, L_A);
  b += line(u1[0] + 8, u1[1] + 12, carP[0] - 2, carP[1] - 16, L_A);
  b += line(u2[0] + 2, u2[1] + 14, shipP[0] - 10, shipP[1] - 18, L_A);
  b += line(bs[0] + 8, bs[1] - 34, iotP[0] - 2, iotP[1] - 16, L_G);
  b += line(bs[0] + 12, bs[1] - 38, ph[0] - 12, ph[1] - 16, L_G);

  // ---- space layer
  b += path(`M-20,150 Q300,40 ${W + 20},96`, { stroke: "#9CC7F5", width: 1.4, dash: "3 6", opacity: 0.7 });
  b += L.satellite(geo[0], geo[1], 0.95);
  b += L.satellite(sat1[0], sat1[1], 0.72, { rotate: -8 });
  b += L.satellite(sat2[0], sat2[1], 0.72, { rotate: 6 });
  b += text(geo[0], geo[1] + 40, "GEO", { size: 13, fill: C.white, anchor: "middle", weight: "bold" });
  b += text(sat1[0] + 44, sat1[1] + 26, "LEO", { size: 13, fill: C.white, weight: "bold" });
  b += text(sat2[0] + 40, sat2[1] + 32, "LEO", { size: 13, fill: C.white, weight: "bold" });
  b += text(206, 72, "ISL", { size: 12, fill: C.goldL, anchor: "middle", italic: true });

  // ---- air layer
  b += L.airship(hap[0], hap[1], 0.85);
  b += text(hap[0] - 50, hap[1] + 4, "HAP", { size: 13, fill: C.navy, anchor: "end", weight: "bold" });
  b += L.uav(u1[0], u1[1], 0.85, C.sky);
  b += L.uav(u2[0], u2[1], 0.85, C.sky);
  b += text(u1[0] + 32, u1[1] - 10, "UAV", { size: 13, fill: C.navy, weight: "bold" });
  b += text(u2[0] + 30, u2[1] - 10, "UAV", { size: 13, fill: C.navy, weight: "bold" });

  // ---- ground layer
  b += L.house(52, 446, 0.85) + L.house(84, 452, 0.7);
  b += L.tower(bs[0], bs[1], 0.9);
  b += L.iot(iotP[0], iotP[1], 0.9, C.teal);
  b += L.dish(gs[0], gs[1], 0.95);
  b += L.person(ph[0] - 10, ph[1] + 6, 0.85, C.ink) + L.phone(ph[0] + 8, ph[1] + 2, 0.75);
  b += L.car(carP[0], carP[1], 0.85, C.sky);
  b += L.ship(shipP[0], shipP[1], 0.9);
  b += text(bs[0] + 16, bs[1] + 48, "BS", { size: 12, fill: C.navy, weight: "bold" });
  b += text(gs[0], gs[1] + 44, "Gateway", { size: 12, fill: C.navy, anchor: "middle", weight: "bold" });

  // ---- layer labels + altitude annotations
  b += text(18, 30, "SPACE", { size: 15, fill: C.white, weight: "bold", spacing: 2 });
  b += text(18, 48, "GEO · MEO · LEO", { size: 12, fill: "#BFD6F2" });
  b += text(18, 206, "AIR", { size: 15, fill: C.navy, weight: "bold", spacing: 2 });
  b += text(18, 224, "HAPs · UAVs", { size: 12, fill: C.muted });
  b += text(W - 18, 30, "500 – 36,000 km", { size: 12, fill: "#BFD6F2", anchor: "end" });
  b += text(W - 18, 206, "0.1 – 20 km", { size: 12, fill: C.muted, anchor: "end" });
  b += text(18, 396, "GROUND", { size: 15, fill: C.navy, weight: "bold", spacing: 2 });
  b += text(18, 413, "terrestrial & maritime", { size: 12, fill: "#3D5A4A" });

  // ---- legend
  const lg = (x, st, label) => line(x, 459, x + 20, 459, st) + text(x + 25, 463, label, { size: 12, fill: C.navy });
  b += rect(318, 449, 270, 20, { fill: C.white, opacity: 0.85, r: 10 });
  b += lg(328, L_S, "space") + lg(398, L_A, "aerial") + lg(474, L_G, "terrestrial");

  return svgDoc(W, H, `<g clip-path="url(#clipP)">${b}</g>` + rect(1, 1, W - 2, H - 2, { stroke: "#C9D6E6", width: 1.5, r: 18 }), defs);
}

// Polarforming: PS-based polarization-reconfigurable antenna + polarization states
function polarforming() {
  const W = 600, H = 470;
  let b = panel(W, H);
  const box = (x, y, w, h, label, o = {}) =>
    rect(x, y, w, h, { fill: o.fill || C.white, stroke: o.stroke || C.ink, width: 1.6, r: 8 })
    + (o.math ? math(x + w / 2, y + h / 2 + 6, label, { size: o.size || 17, anchor: "middle", fill: o.color || C.ink })
              : text(x + w / 2, y + h / 2 + 5, label, { size: o.size || 14, anchor: "middle", fill: o.color || C.ink, weight: o.weight }));
  b += text(22, 34, "PS-based polarization-reconfigurable antenna (PRA)", { size: 15, weight: "bold", fill: C.navy });
  // chain: RF -> splitter -> phase shifters -> 90° hybrid -> V/H ports -> dual-polarized element
  b += text(26, 131, "RF", { size: 14, weight: "bold", fill: C.muted });
  b += arrow(50, 126, 76, 126, { stroke: C.ink, width: 1.8 });
  b += box(78, 102, 54, 48, "1:2", { size: 14, weight: "bold" });
  b += path("M132,116 L150,116 L150,82 L166,82", { stroke: C.ink, width: 1.8 }) + path("M132,136 L150,136 L150,170 L166,170", { stroke: C.ink, width: 1.8 });
  b += box(166, 62, 62, 40, "\\r{PS} φ_1", { math: true, stroke: C.teal, fill: C.tealL, size: 16 });
  b += box(166, 150, 62, 40, "\\r{PS} φ_2", { math: true, stroke: C.teal, fill: C.tealL, size: 16 });
  b += path("M228,82 L246,82 L246,108 L262,108", { stroke: C.ink, width: 1.8 }) + path("M228,170 L246,170 L246,144 L262,144", { stroke: C.ink, width: 1.8 });
  b += rect(262, 92, 66, 68, { fill: C.white, stroke: C.ink, width: 1.6, r: 8 });
  b += text(295, 122, "90°", { size: 15, anchor: "middle", weight: "bold" }) + text(295, 140, "hybrid", { size: 13, anchor: "middle", fill: C.muted });
  b += line(328, 108, 372, 108, { stroke: C.skyD, width: 2 }) + line(328, 144, 372, 144, { stroke: C.orangeD, width: 2 });
  b += text(350, 101, "V", { size: 13, anchor: "middle", weight: "bold", fill: C.skyD }) + text(350, 162, "H", { size: 13, anchor: "middle", weight: "bold", fill: C.orangeD });
  // dual-polarized patch
  b += rect(372, 92, 68, 68, { fill: "#FFF7E6", stroke: C.goldD, width: 1.6, r: 4 });
  b += line(406, 100, 406, 152, { stroke: C.skyD, width: 3.2 }) + line(380, 126, 432, 126, { stroke: C.orangeD, width: 3.2 });
  b += text(406, 182, "dual-pol. element", { size: 12, anchor: "middle", fill: C.muted });
  // radiated polarization ellipse with V/H axes
  const ex = 522, ey = 126;
  b += line(ex - 52, ey, ex + 52, ey, { stroke: C.grid, width: 1.4 }) + line(ex, ey - 52, ex, ey + 52, { stroke: C.grid, width: 1.4 });
  b += text(ex + 4, ey - 54, "V", { size: 12, fill: C.skyD, weight: "bold" }) + text(ex + 50, ey - 6, "H", { size: 12, fill: C.orangeD, weight: "bold" });
  b += polEllipse(ex, ey, 40, 17, -55, C.teal, { width: 2.8 });
  b += math(ex, 206, "\\b{p} = [\\r{cos} α, \\r{sin} α e^{jδ}]^T", { size: 15, anchor: "middle", fill: C.tealD });
  b += curveArrow(446, 104, 462, 90, 476, 102, { stroke: C.slate, width: 1.6, head: 8 });

  // ---- bottom left: reachable polarization states
  b += line(22, 238, W - 22, 238, { stroke: "#DCE3EC", width: 1.4 });
  b += text(22, 270, "Reachable polarization states", { size: 15, weight: "bold", fill: C.navy });
  const st = [
    { x: 58, el: [26, 0, -90], name: "linear", sub: "α=0" },
    { x: 128, el: [26, 0, -45], name: "slant", sub: "α=π/4, δ=0" },
    { x: 198, el: [22, 22, 0], name: "circular", sub: "δ=±π/2" },
    { x: 268, el: [27, 13, -30], name: "elliptical", sub: "general" },
  ];
  for (const q of st) {
    b += circle(q.x, 330, 33, { fill: C.white, stroke: "#DCE3EC", width: 1.2 });
    b += polEllipse(q.x, 330, q.el[0], q.el[1], q.el[2], C.teal, { width: 2.4 });
    b += text(q.x, 384, q.name, { size: 13, anchor: "middle", weight: "bold", fill: C.ink });
    b += text(q.x, 401, q.sub, { size: 11.5, anchor: "middle", fill: C.muted, math: true, italic: true });
  }
  b += text(22, 440, "Two phase shifts reach any polarization", { size: 12.5, fill: C.muted, italic: true });

  // ---- bottom right: mismatch vs polarforming
  b += line(318, 256, 318, 452, { stroke: "#DCE3EC", width: 1.4 });
  b += text(336, 270, "Faraday rotation Ω", { size: 15, weight: "bold", fill: C.navy });
  const row = (y, aligned) => {
    let g = "";
    const ix = 368;
    g += circle(ix, y, 26, { fill: C.white, stroke: "#DCE3EC", width: 1.2 });
    g += polEllipse(ix, y, 21, 0, -55, C.violet, { width: 2.4 });
    g += text(ix, y + 42, "incoming", { size: 11.5, anchor: "middle", fill: C.muted });
    g += arrow(402, y, 432, y, { stroke: C.slate, width: 1.6, head: 8 });
    const rx = 462;
    g += circle(rx, y, 26, { fill: aligned ? C.tealL : "#FBE3E3", stroke: aligned ? C.teal : C.red, width: 1.4 });
    if (aligned) g += polEllipse(rx, y, 21, 0, -55, C.tealD, { width: 3 });
    else g += polEllipse(rx, y, 21, 0, -90, C.red, { width: 3 });
    g += text(rx, y + 42, aligned ? "PRA" : "fixed Rx", { size: 11.5, anchor: "middle", fill: C.muted });
    g += text(500, y - 4, aligned ? "polarforming" : "fixed pol.", { size: 13, weight: "bold", fill: aligned ? C.tealD : C.red });
    g += math(500, y + 15, aligned ? "loss ≈ 0" : "loss |cos Ω|^2", { size: 13, fill: aligned ? C.tealD : C.red });
    return g;
  };
  b += row(318, false) + row(400, true);
  return svgDoc(W, H, b);
}

// Rydberg atomic receiver: setup, energy levels, EIT/AT spectrum
function rydberg() {
  const W = 600, H = 470;
  let b = panel(W, H);
  b += text(22, 34, "Rydberg atomic receiver (RF → optical)", { size: 15, weight: "bold", fill: C.navy });
  // RF signal + LO
  b += wave(150, 52, 238, 96, { stroke: C.violet, amp: 4.5, lambda: 13, width: 2.2 });
  b += wave(170, 44, 258, 88, { stroke: C.violet, amp: 4.5, lambda: 13, width: 2.2, opacity: 0.55 });
  b += math(84, 60, "E_s", { size: 15, fill: C.violetD, weight: "bold" }) + text(84, 76, "signal", { size: 11.5, fill: C.muted });
  b += L.horn(424, 52, 0.9, 150, "#B9C3D3");
  b += wave(402, 64, 344, 98, { stroke: C.gold, amp: 4, lambda: 12, width: 2.2 });
  b += math(450, 50, "E_{\\r{LO}}", { size: 15, fill: C.goldD, weight: "bold" }) + text(450, 66, "local osc.", { size: 11.5, fill: C.muted });
  // vapor cell
  b += L.vaporCell(170, 100, 240, 56, { atoms: 22, seed: 5 });
  b += text(290, 176, "Cs vapor cell", { size: 12.5, anchor: "middle", fill: C.muted });
  // probe laser (red) left -> right, coupling laser (green) right -> left via dichroic mirror
  b += rect(26, 110, 70, 32, { fill: "#FBE3E3", stroke: C.probe, width: 1.5, r: 6 });
  b += text(61, 131, "probe", { size: 12.5, anchor: "middle", weight: "bold", fill: C.probe });
  b += L.laser(96, 122, 476, 122, C.probe, 3.2);
  b += L.laser(476, 134, 160, 134, C.coupling, 3.2);
  b += arrow(150, 134, 128, 134, { stroke: C.coupling, width: 2, head: 8 });
  b += line(466, 110, 486, 146, { stroke: "#6E8CB5", width: 4 });
  b += L.laser(476, 134, 476, 196, C.coupling, 3.2);
  b += rect(441, 196, 70, 30, { fill: "#DDF3E4", stroke: C.coupling, width: 1.5, r: 6 });
  b += text(476, 216, "coupling", { size: 12.5, anchor: "middle", weight: "bold", fill: C.coupling });
  b += L.photodetector(526, 122, 1.1);
  b += text(530, 156, "PD", { size: 12.5, anchor: "middle", weight: "bold", fill: C.ink });
  b += arrow(542, 122, 572, 122, { stroke: C.ink, width: 1.6, head: 7 });
  b += text(500, 100, "DM", { size: 11, anchor: "middle", fill: C.muted });

  // ---- energy-level ladder
  b += line(22, 246, W - 22, 246, { stroke: "#DCE3EC", width: 1.4 });
  b += text(22, 274, "Four-level ladder", { size: 15, weight: "bold", fill: C.navy });
  const lev = (x1, x2, y, ket, term, o = {}) => line(x1, y, x2, y, { stroke: C.ink, width: 2.4 })
    + math(o.ketRight ? x2 + 8 : x1 - 8, y + 5, ket, { size: 14, anchor: o.ketRight ? "start" : "end" })
    + math(o.termX ?? x2 + 8, y + (o.termDy ?? 5), term, { size: 12.5, fill: C.muted });
  b += lev(66, 150, 440, "|1⟩", "\\r{6S}_{1/2}");
  b += lev(66, 150, 384, "|2⟩", "\\r{6P}_{3/2}");
  b += lev(66, 150, 316, "|3⟩", "n\\r{D}_{5/2}", { termDy: 22 });
  b += lev(186, 250, 292, "|4⟩", "(n+1)\\r{P}_{3/2}", { ketRight: true, termX: 186, termDy: -10 });
  b += arrow(92, 438, 92, 388, { stroke: C.probe, width: 2.6, head: 10 });
  b += text(98, 420, "852 nm", { size: 11.5, fill: C.probe, weight: "bold" });
  b += arrow(122, 382, 122, 320, { stroke: C.coupling, width: 2.6, head: 10 });
  b += text(128, 356, "510 nm", { size: 11.5, fill: C.coupling, weight: "bold" });
  b += wave(146, 312, 190, 296, { stroke: C.violet, amp: 3.5, lambda: 9, width: 2.2 });
  b += text(206, 322, "RF", { size: 12, fill: C.violetD, weight: "bold" });

  // ---- transmission spectrum: EIT vs Autler-Townes splitting
  const ox = 318, oy = 432, pw = 250, ph = 120;
  b += line(304, 256, 304, 452, { stroke: "#DCE3EC", width: 1.4 });
  b += text(318, 274, "Probe transmission", { size: 15, weight: "bold", fill: C.navy });
  b += arrow(ox, oy, ox + pw + 8, oy, { stroke: C.ink, width: 1.4, head: 7 }) + arrow(ox, oy, ox, oy - ph - 18, { stroke: C.ink, width: 1.4, head: 7 });
  b += math(ox + pw + 6, oy + 18, "Δ_p", { size: 13, anchor: "end" });
  const lor = (x, x0, g) => 1 / (1 + ((x - x0) / g) ** 2);
  let d1 = "", d2 = "";
  for (let k = 0; k <= 120; k++) {
    const xx = ox + 6 + (k / 120) * (pw - 12), u = (k / 120) * 2 - 1;
    const y1 = oy - 14 - (ph - 20) * lor(u, 0, 0.1);
    const y2 = oy - 14 - (ph - 34) * (lor(u, -0.36, 0.1) + lor(u, 0.36, 0.1)) * 0.92;
    d1 += `${k ? "L" : "M"}${L.f2(xx)},${L.f2(y1)}`; d2 += `${k ? "L" : "M"}${L.f2(xx)},${L.f2(y2)}`;
  }
  b += path(d1, { stroke: C.slate, width: 2, dash: "5 4" }) + path(d2, { stroke: C.violet, width: 2.6 });
  const xa = ox + 6 + ((1 - 0.36) / 2) * (pw - 12), xb = ox + 6 + ((1 + 0.36) / 2) * (pw - 12);
  b += arrow(xa, oy - ph + 2, xb, oy - ph + 2, { stroke: C.violetD, width: 1.6, both: true, head: 7 });
  b += math((xa + xb) / 2, oy - ph - 8, "Δf_{\\r{AT}} ∝ |E|", { size: 13, anchor: "middle", fill: C.violetD });
  b += text(ox + pw - 2, oy - 66, "with RF", { size: 11.5, anchor: "end", fill: C.violetD, weight: "bold" });
  b += text(ox + pw - 2, oy - 50, "EIT only", { size: 11.5, anchor: "end", fill: C.slate });
  return svgDoc(W, H, b);
}

// RSMA transmitter / receiver
function rsma() {
  const W = 600, H = 470;
  let b = panel(W, H);
  const pill = (x, y, w, h, label, color, fill, o = {}) => rect(x, y, w, h, { fill, stroke: color, width: 1.6, r: o.r ?? 8 })
    + math(x + w / 2, y + h / 2 + 5.5, label, { size: o.size || 15, anchor: "middle", fill: o.tc || C.ink });
  const tbox = (x, y, w, h, label, color, fill, o = {}) => rect(x, y, w, h, { fill, stroke: color, width: 1.6, r: 8 })
    + text(x + w / 2, y + h / 2 + 5, label, { size: o.size || 13, anchor: "middle", fill: o.tc || C.ink, weight: o.weight });
  b += text(22, 34, "Transmitter", { size: 15, weight: "bold", fill: C.navy });
  b += text(436, 34, "Receivers", { size: 15, weight: "bold", fill: C.navy });
  // messages
  const yU = [118, 352];
  yU.forEach((y, i) => {
    b += pill(20, y - 18, 46, 36, `W_${i + 1}`, C.ink, C.white);
    b += line(66, y, 84, y, { stroke: C.ink, width: 1.8 });
    b += circle(90, y, 6, { fill: C.ink });
  });
  // split: user 1 -> private up, common down ; user 2 -> common up, private down
  b += path("M90,112 L90,78 L118,78", { stroke: C.sky, width: 2 }); b += arrow(116, 78, 130, 78, { stroke: C.sky, width: 2 });
  b += math(96, 68, "W_{p,1}", { size: 13, fill: C.skyD });
  b += path("M90,124 L90,222 L118,222", { stroke: C.gold, width: 2.2 });
  b += math(97, 180, "W_{c,1}", { size: 13, fill: C.goldD });
  b += path("M90,346 L90,248 L118,248", { stroke: C.gold, width: 2.2 });
  b += math(97, 300, "W_{c,2}", { size: 13, fill: C.goldD });
  b += path("M90,358 L90,392 L118,392", { stroke: C.violet, width: 2 }); b += arrow(116, 392, 130, 392, { stroke: C.violet, width: 2 });
  b += math(100, 412, "W_{p,2}", { size: 13, fill: C.violetD });
  // encoders
  b += tbox(130, 60, 78, 36, "encode", C.sky, C.skyL);
  b += tbox(120, 210, 90, 50, "combine +", C.goldD, C.goldL, { size: 12.5 });
  b += text(165, 251, "encode", { size: 12.5, anchor: "middle" });
  b += tbox(130, 374, 78, 36, "encode", C.violet, C.violetL);
  b += arrow(208, 78, 246, 78, { stroke: C.sky, width: 2 }) + math(226, 70, "s_1", { size: 14, anchor: "middle", fill: C.skyD });
  b += arrow(210, 235, 246, 235, { stroke: C.gold, width: 2.4 }) + math(228, 227, "s_c", { size: 14, anchor: "middle", fill: C.goldD });
  b += arrow(208, 392, 246, 392, { stroke: C.violet, width: 2 }) + math(226, 384, "s_2", { size: 14, anchor: "middle", fill: C.violetD });
  // precoder
  b += rect(248, 56, 58, 358, { fill: C.white, stroke: C.ink, width: 1.6, r: 10 });
  b += text(277, 228, "precoder", { size: 13, anchor: "middle", weight: "bold", rotate: -90 });
  b += math(277, 92, "\\b{w}_1", { size: 13, anchor: "middle", fill: C.skyD });
  b += math(277, 270, "\\b{w}_c", { size: 13, anchor: "middle", fill: C.goldD });
  b += math(277, 404, "\\b{w}_2", { size: 13, anchor: "middle", fill: C.violetD });
  // antenna array
  for (const y of [170, 205, 240, 275, 310]) {
    b += line(306, y, 322, y, { stroke: C.ink, width: 1.6 });
    b += path(`M322,${y} L334,${y - 9} M322,${y} L334,${y + 9} M322,${y - 10} L322,${y + 10}`, { stroke: C.ink, width: 1.6 });
  }
  // wireless links
  b += wave(346, 210, 430, 128, { stroke: C.gold, amp: 3, lambda: 11, width: 2 });
  b += wave(346, 262, 430, 340, { stroke: C.gold, amp: 3, lambda: 11, width: 2 });
  b += math(372, 156, "\\b{h}_1", { size: 14, fill: C.muted, anchor: "middle" }) + math(370, 330, "\\b{h}_2", { size: 14, fill: C.muted, anchor: "middle" });
  // receivers
  const rx = (y0, k, col, colFill) => {
    let g = rect(432, y0, 150, 150, { fill: C.white, stroke: "#C9D3E0", width: 1.4, r: 12 });
    g += text(444, y0 + 22, `User ${k}`, { size: 13.5, weight: "bold", fill: C.navy });
    g += pill(444, y0 + 32, 126, 28, `\\r{decode} s_c`, C.goldD, C.goldL, { size: 13.5 });
    g += arrow(507, y0 + 60, 507, y0 + 70, { stroke: C.ink, width: 1.4, head: 6 });
    g += pill(444, y0 + 70, 126, 28, `\\r{SIC: remove} s_c`, C.ink, C.light, { size: 13.5 });
    g += arrow(507, y0 + 98, 507, y0 + 108, { stroke: C.ink, width: 1.4, head: 6 });
    g += pill(444, y0 + 108, 126, 28, `\\r{decode} s_${k}`, col, colFill, { size: 13.5 });
    return g;
  };
  b += rx(52, 1, C.sky, C.skyL) + rx(262, 2, C.violet, C.violetL);
  b += text(22, 452, "Common stream decoded by all users; private streams by their own user.", { size: 12.5, fill: C.muted, italic: true });
  return svgDoc(W, H, b);
}

// MADRL: centralized training, decentralized execution
function madrl() {
  const W = 600, H = 470;
  let b = panel(W, H);
  // critic
  b += rect(150, 22, 300, 66, { fill: C.orangeL, stroke: C.orangeD, width: 1.8, r: 12, dash: "7 5" });
  b += text(300, 48, "Centralized critic", { size: 15, weight: "bold", anchor: "middle", fill: C.orangeD });
  b += math(300, 72, "V_φ(s)  \\r{or}  Q_φ(s, a_1, …, a_J)", { size: 14, anchor: "middle", fill: C.ink });
  b += text(458, 40, "training only", { size: 11.5, fill: C.orangeD, italic: true });
  // agents
  const ag = [{ x: 30, name: "Agent 1", who: "LEO satellite" }, { x: 220, name: "Agent 2", who: "UAV" }, { x: 410, name: "Agent J", who: "HAP / BS" }];
  for (const [i, a] of ag.entries()) {
    b += rect(a.x, 126, 160, 128, { fill: C.white, stroke: "#C9D3E0", width: 1.5, r: 12 });
    b += circle(a.x + 24, 150, 13, { fill: C.orange });
    b += text(a.x + 24, 155, String(i === 2 ? "J" : i + 1), { size: 13, weight: "bold", anchor: "middle", fill: C.white });
    b += text(a.x + 44, 148, a.name, { size: 13.5, weight: "bold", fill: C.navy });
    b += text(a.x + 44, 164, a.who, { size: 11.5, fill: C.muted });
    b += L.nn(a.x + 80, 206, 0.95, C.orange, [3, 4, 2]);
    b += math(a.x + 80, 246, "π_j(a_j | o_j)", { size: 13, anchor: "middle", fill: C.ink });
    // critic feedback (dashed)
    b += arrow(a.x + 80 + (i - 1) * -30, 90, a.x + 80, 124, { stroke: C.orangeD, width: 1.6, dash: "5 4", head: 8 });
  }
  b += text(330, 112, "advantage / gradient", { size: 11.5, fill: C.orangeD, italic: true });
  b += text(196, 194, "…", { size: 22, fill: C.muted, anchor: "middle" }) + text(396, 194, "…", { size: 22, fill: C.muted, anchor: "middle" });
  // environment
  b += rect(30, 324, 540, 124, { fill: "#EAF3FC", stroke: C.skyD, width: 1.8, r: 14 });
  b += text(48, 350, "SAGIN environment", { size: 15, weight: "bold", fill: C.skyD });
  b += text(48, 368, "channels · mobility · traffic", { size: 12, fill: C.muted });
  b += L.satellite(250, 362, 0.55) + L.uav(330, 400, 0.7, C.sky) + L.airship(420, 372, 0.5) + L.tower(500, 396, 0.55);
  b += L.person(220, 430, 0.7) + L.car(282, 432, 0.6, C.sky) + L.phone(380, 428, 0.65) + L.iot(450, 432, 0.7, C.teal);
  // obs / action arrows
  for (const a of ag) {
    b += arrow(a.x + 52, 322, a.x + 52, 258, { stroke: C.skyD, width: 2, head: 9 });
    b += arrow(a.x + 108, 258, a.x + 108, 322, { stroke: C.orangeD, width: 2, head: 9 });
    b += math(a.x + 46, 294, "o_j", { size: 13.5, anchor: "end", fill: C.skyD });
    b += math(a.x + 114, 294, "a_j", { size: 13.5, fill: C.orangeD });
  }
  // global state / reward to critic (training)
  b += path("M570,360 L588,360 L588,55 L452,55", { stroke: C.orangeD, width: 1.6, dash: "5 4" });
  b += `<polygon points="450,55 460,50 460,60" fill="${C.orangeD}"/>`;
  b += math(582, 200, "s, r", { size: 13.5, anchor: "end", fill: C.orangeD });
  b += text(22, 464, "", { size: 1 });
  return svgDoc(W, H, b);
}

// =========================================================== system models ====
function sceneDefs(id) {
  return `
  <clipPath id="clip${id}"><rect x="1" y="1" width="598" height="478" rx="18"/></clipPath>
  <linearGradient id="gSp${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081733"/><stop offset="1" stop-color="#1C447F"/></linearGradient>
  <linearGradient id="gSk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE5FA"/><stop offset="1" stop-color="#F3F8FE"/></linearGradient>
  <linearGradient id="gGr${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D5ECDC"/><stop offset="1" stop-color="#B7DCC3"/></linearGradient>`;
}
const frame = (body, id) => `<g clip-path="url(#clip${id})">${body}</g>` + rect(1, 1, 598, 478, { stroke: "#C9D6E6", width: 1.5, r: 18 });

// Part II: polarforming-aided RSMA LEO downlink
function pfSystem() {
  const W = 600, H = 480, id = "pf";
  let b = rect(0, 0, W, H, { fill: `url(#gSk${id})` });
  b += rect(0, 0, W, 118, { fill: `url(#gSp${id})` }) + stars(W, 112, 50, 21);
  // ionosphere band
  b += path(`M0,128 Q300,112 ${W},128 L${W},168 Q300,152 0,168 Z`, { fill: C.teal, opacity: 0.16 });
  b += path(`M0,128 Q300,112 ${W},128`, { stroke: C.teal, width: 1.4, dash: "4 5", opacity: 0.8 });
  b += path(`M0,168 Q300,152 ${W},168`, { stroke: C.teal, width: 1.4, dash: "4 5", opacity: 0.8 });
  b += text(W - 16, 148, "Ionosphere: Faraday rotation", { size: 13, anchor: "end", fill: C.tealD, weight: "bold" });
  b += math(W - 16, 164, "Ω_k ∝ \\r{TEC}/f^2", { size: 12.5, anchor: "end", fill: C.tealD });
  // ground
  b += path(`M0,392 Q300,370 ${W},392 L${W},${H} L0,${H} Z`, { fill: `url(#gGr${id})` });
  b += building(28, 410, 34, 74) + building(66, 410, 26, 52) + building(96, 410, 30, 88);
  // users
  const users = [[300, 430], [420, 438], [530, 424]], uavU = [404, 300];
  // common beam (gold cone)
  b += path("M178,92 L250,430 L585,430 L196,86 Z", { fill: C.gold, opacity: 0.12 });
  // private beams
  for (const [ux, uy] of [...users, uavU]) b += line(186, 96, ux, uy - 26, { stroke: C.teal, width: 2.2, opacity: 0.85 });
  // depolarizing reflection
  b += path("M186,96 L118,322", { stroke: C.slate, width: 1.6, dash: "5 4" }) + arrow(120, 330, 286, 418, { stroke: C.slate, width: 1.6, dash: "5 4", head: 8 });
  b += text(18, 296, "depolarization", { size: 12.5, fill: C.muted, weight: "bold" }) + math(18, 313, "(\\r{XPD} χ)", { size: 12.5, fill: C.muted });
  // satellite + PRA array plate
  b += L.satellite(150, 54, 1.05);
  b += rect(126, 80, 50, 22, { fill: "#EAF2FB", stroke: C.ink, width: 1.2, r: 3 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const cx = 133 + i * 12, cy = 86 + j * 10;
    b += line(cx - 3.5, cy, cx + 3.5, cy, { stroke: C.tealD, width: 1.4 }) + line(cx, cy - 3.5, cx, cy + 3.5, { stroke: C.tealD, width: 1.4 });
  }
  b += text(214, 40, "LEO satellite", { size: 13.5, weight: "bold", fill: C.white });
  b += math(214, 58, "N\\r{-element PRA array}, \\b{p}_n", { size: 12.5, fill: "#BFD6F2" });
  // polarization ellipses: before / after the ionosphere
  b += circle(262, 92, 16, { fill: C.white, opacity: 0.9 }) + polEllipse(262, 92, 12, 0, -90, C.tealD, { width: 2.4 });
  b += circle(244, 206, 18, { fill: C.white, stroke: C.teal, width: 1.2 }) + polEllipse(244, 206, 13, 0, -50, C.tealD, { width: 2.4 });
  b += path("M244,193 A13,13 0 0 1 252.4,196", { stroke: C.violet, width: 1.6 });
  b += math(266, 202, "Ω_k", { size: 13, fill: C.violetD, weight: "bold" });
  // UAV user + ground users with PRA badges
  b += L.uav(uavU[0], uavU[1], 0.95, C.sky) + L.pra(uavU[0] + 30, uavU[1] - 24, 0.75);
  b += text(uavU[0] + 44, uavU[1] + 4, "UAV user", { size: 12.5, fill: C.navy, weight: "bold" });
  b += L.person(users[0][0] - 8, users[0][1] + 4, 0.9) + L.phone(users[0][0] + 10, users[0][1], 0.8) + L.pra(users[0][0] + 2, users[0][1] - 34, 0.75);
  b += L.car(users[1][0], users[1][1], 0.9, C.sky) + L.pra(users[1][0], users[1][1] - 34, 0.75);
  b += L.ship(users[2][0], users[2][1], 0.85) + L.pra(users[2][0], users[2][1] - 38, 0.75);
  b += math(users[0][0] + 20, users[0][1] - 38, "\\b{p}_k", { size: 13.5, fill: C.tealD, weight: "bold" });
  b += text(300, 470, "user k", { size: 12, anchor: "middle", fill: C.navy });
  // channel label
  b += math(330, 300, "\\b{H}_{k,n}", { size: 14, fill: C.ink, weight: "bold" });
  // legend
  b += rect(408, 196, 180, 54, { fill: C.white, opacity: 0.9, r: 10 });
  b += line(418, 212, 442, 212, { stroke: C.gold, width: 6, opacity: 0.6 }) + math(450, 217, "\\r{common stream} s_c", { size: 12.5 });
  b += line(418, 236, 442, 236, { stroke: C.teal, width: 2.4 }) + math(450, 241, "\\r{private streams} s_k", { size: 12.5 });
  return svgDoc(W, H, frame(b, id), sceneDefs(id));
}

// Part III: LEO -> ground terminal with a Rydberg atomic receiver array
function aqSystem() {
  const W = 600, H = 480, id = "aq";
  let b = rect(0, 0, W, H, { fill: `url(#gSk${id})` });
  b += rect(0, 0, W, 150, { fill: `url(#gSp${id})` }) + stars(W, 146, 60, 31);
  b += path(`M0,150 L${W},150`, { stroke: "#6FB6F2", width: 3, opacity: 0.5 });
  // satellite with precoder
  b += L.satellite(120, 62, 1.05);
  b += text(176, 42, "LEO satellite", { size: 13.5, weight: "bold", fill: C.white });
  b += math(176, 60, "N\\r{ antennas, precoder} \\b{w}", { size: 12.5, fill: "#BFD6F2" });
  b += arrow(70, 112, 30, 128, { stroke: "#BFD6F2", width: 1.8, head: 8 });
  b += math(38, 108, "\\b{v}", { size: 13, fill: "#BFD6F2", anchor: "end" });
  b += math(176, 96, "\\r{Doppler} f_D(t), \\r{path loss} β", { size: 12.5, fill: "#BFD6F2" });
  // long-range link
  b += wave(146, 92, 352, 300, { stroke: C.violet, amp: 5, lambda: 16, width: 2.4 });
  b += wave(126, 104, 332, 312, { stroke: C.violet, amp: 5, lambda: 16, width: 2.4, opacity: 0.45 });
  b += math(290, 196, "\\b{g}_m^T\\b{w} s", { size: 14, fill: C.violetD, weight: "bold" });
  // ground terminal
  b += rect(214, 300, 372, 168, { fill: C.white, stroke: "#C9D3E0", width: 1.5, r: 14 });
  b += text(228, 322, "RAQR ground terminal", { size: 13.5, weight: "bold", fill: C.navy });
  // LO horn and waves
  b += L.horn(244, 396, 0.9, 0, "#D8DFEA");
  b += text(244, 430, "LO", { size: 12.5, anchor: "middle", weight: "bold", fill: C.goldD });
  b += math(244, 446, "E_{\\r{LO},m}, f_{\\r{LO}}", { size: 11.5, anchor: "middle", fill: C.goldD });
  for (const y of [350, 380, 410, 440]) b += wave(262, 396, 302, y - 2, { stroke: C.gold, amp: 2.2, lambda: 8, width: 1.6, opacity: 0.85 });
  // vapor cells + PDs
  const ys = [338, 368, 398, 428];
  ys.forEach((y, k) => {
    b += L.vaporCell(306, y, 110, 22, { atoms: 6, seed: 3 + k, atomR: 2, atomColor: C.violet });
    b += line(300, y + 9, 430, y + 9, { stroke: C.probe, width: 1.6 }) + line(300, y + 14, 420, y + 14, { stroke: C.coupling, width: 1.6, opacity: 0.85 });
    b += L.photodetector(440, y + 11, 0.62);
    b += line(448, y + 11, 462, y + 11, { stroke: C.ink, width: 1.2 });
  });
  b += math(361, 462, "M\\r{ vapor cells}", { size: 12, anchor: "middle", fill: C.muted });
  b += line(462, 349, 462, 439, { stroke: C.ink, width: 1.2 });
  // DSP blocks
  b += rect(474, 336, 100, 40, { fill: C.violetL, stroke: C.violet, width: 1.5, r: 8 });
  b += text(524, 353, "IF / I-Q", { size: 12.5, anchor: "middle", weight: "bold", fill: C.violetD }) + text(524, 368, "demod", { size: 12, anchor: "middle", fill: C.violetD });
  b += arrow(462, 356, 474, 356, { stroke: C.ink, width: 1.4, head: 6 });
  b += arrow(524, 376, 524, 394, { stroke: C.ink, width: 1.4, head: 7 });
  b += rect(474, 394, 100, 44, { fill: C.violetL, stroke: C.violet, width: 1.5, r: 8 });
  b += text(524, 412, "detector", { size: 12.5, anchor: "middle", weight: "bold", fill: C.violetD }) + text(524, 428, "(biased PR)", { size: 11.5, anchor: "middle", fill: C.violetD });
  b += arrow(524, 438, 524, 458, { stroke: C.ink, width: 1.4, head: 7 }) + math(532, 456, "ŝ", { size: 14 });
  // noise annotation
  b += rect(16, 352, 186, 112, { fill: C.white, stroke: "#C9D3E0", width: 1.2, r: 12 });
  b += text(28, 374, "Noise sources", { size: 13, weight: "bold", fill: C.navy });
  b += text(28, 394, "photon shot noise (PSN)", { size: 12, fill: C.ink });
  b += text(28, 412, "quantum projection (QPN)", { size: 12, fill: C.ink });
  b += text(28, 430, "blackbody radiation (BBR)", { size: 12, fill: C.ink });
  b += text(28, 448, "extrinsic sky / thermal", { size: 12, fill: C.ink });
  return svgDoc(W, H, frame(b, id), sceneDefs(id));
}

// Part IV: multi-UAV RSMA network with LEO backhaul (one agent per UAV)
function maSystem() {
  const W = 600, H = 480, id = "ma";
  let b = rect(0, 0, W, H, { fill: `url(#gSk${id})` });
  b += rect(0, 0, W, 100, { fill: `url(#gSp${id})` }) + stars(W, 96, 40, 41);
  b += path(`M0,100 L${W},100`, { stroke: "#6FB6F2", width: 3, opacity: 0.5 });
  b += path(`M0,370 Q300,350 ${W},370 L${W},${H} L0,${H} Z`, { fill: `url(#gGr${id})` });
  const sat = [300, 46], uav = [[110, 196], [300, 226], [490, 190]], cl = [[110, 418], [300, 432], [492, 418]];
  // backhaul
  for (const [x, y] of uav) b += line(sat[0], sat[1] + 22, x, y - 16, { stroke: C.gold, width: 2.2, dash: "7 5" });
  b += math(392, 188, "C_j^{\\r{sat}}(t)", { size: 13.5, fill: C.goldD, weight: "bold" });
  b += L.satellite(sat[0], sat[1], 0.95);
  b += text(352, 34, "LEO backhaul", { size: 13, weight: "bold", fill: C.white });
  // coverage + users
  const rng = L.mulberry32(9);
  cl.forEach(([cx, cy], j) => {
    b += ellipse(cx, cy, 78, 26, { fill: C.orange, opacity: 0.12, stroke: C.orange, width: 1.2, dash: "4 4" });
    const pts = [[-40, 4], [0, -6], [38, 6]];
    for (const [dx, dy] of pts) {
      b += line(uav[j][0], uav[j][1] + 12, cx + dx, cy + dy - 22, { stroke: C.orangeD, width: 1.6, opacity: 0.85 });
      b += L.person(cx + dx, cy + dy, 0.8, C.ink);
    }
  });
  // common stream glow from each UAV
  uav.forEach(([x, y], j) => { b += path(`M${x},${y + 10} L${cl[j][0] - 60},${cl[j][1] - 16} L${cl[j][0] + 60},${cl[j][1] - 16} Z`, { fill: C.gold, opacity: 0.14 }); });
  // interference + collision distance
  b += arrow(126, 214, 258, 404, { stroke: C.red, width: 1.8, dash: "6 4", head: 9 });
  b += text(196, 300, "inter-UAV", { size: 12, fill: C.red, weight: "bold" }) + text(196, 315, "interference", { size: 12, fill: C.red, weight: "bold" });
  b += arrow(332, 226, 458, 198, { stroke: C.muted, width: 1.4, both: true, head: 7, dash: "3 3" });
  b += math(398, 236, "≥ d_{\\r{min}}", { size: 13, anchor: "middle", fill: C.muted });
  // trajectories
  b += curveArrow(88, 182, 62, 146, 28, 160, { stroke: C.orangeD, width: 1.8, dash: "5 4", head: 9 });
  b += curveArrow(512, 176, 540, 140, 576, 156, { stroke: C.orangeD, width: 1.8, dash: "5 4", head: 9 });
  b += math(16, 134, "\\b{q}_j(t+1)", { size: 13, fill: C.orangeD });
  // UAV agents
  uav.forEach(([x, y], j) => {
    b += L.uav(x, y, 0.95, C.orange);
    b += rect(x - 30, y + 18, 60, 20, { fill: C.white, stroke: C.orangeD, width: 1.3, r: 10 });
    b += text(x, y + 32, `Agent ${j === 2 ? "J" : j + 1}`, { size: 12, anchor: "middle", weight: "bold", fill: C.orangeD });
  });
  b += math(152, 202, "\\b{q}_j(t)", { size: 13.5, fill: C.ink });
  b += math(542, 300, "\\b{h}_{j,k}(t)", { size: 13.5, fill: C.ink });
  b += math(300, 470, "\\b{u}_k", { size: 13.5, anchor: "middle", fill: C.ink });
  return svgDoc(W, H, frame(b, id), sceneDefs(id));
}

// Part III design: Doppler- and LO-aware receive pipeline
function aqPipeline() {
  const W = 620, H = 250;
  let b = panel(W, H);
  const blk = (x, y, w, h, t1, t2, col, fill) => rect(x, y, w, h, { fill, stroke: col, width: 1.6, r: 10 })
    + text(x + w / 2, y + h / 2 - (t2 ? 3 : -5), t1, { size: 13, anchor: "middle", weight: "bold", fill: C.ink })
    + (t2 ? math(x + w / 2, y + h / 2 + 15, t2, { size: 12.5, anchor: "middle", fill: C.muted }) : "");
  b += blk(18, 26, 128, 56, "Ephemeris", "\\r{orbit, time} t", C.slate, C.white);
  b += blk(178, 26, 128, 56, "Doppler", "f_D(t)", C.slate, C.white);
  b += blk(338, 26, 128, 56, "LO synthesizer", "f_{\\r{LO}}, E_{\\r{LO},m}", C.goldD, C.goldL);
  b += blk(338, 150, 128, 56, "RAQR array", "M\\r{ vapor cells}", C.violet, C.violetL);
  b += blk(178, 150, 128, 56, "I/Q demod", "\\r{linearized output}", C.violet, C.white);
  b += blk(18, 150, 128, 56, "EM-GS detector", "\\r{biased PR} → ŝ", C.violet, C.white);
  b += blk(492, 88, 110, 56, "LO amplitude", "\\r{1-D search}", C.goldD, C.white);
  b += arrow(146, 54, 178, 54, { stroke: C.ink, width: 1.8 }) + arrow(306, 54, 338, 54, { stroke: C.ink, width: 1.8 });
  b += arrow(402, 82, 402, 150, { stroke: C.goldD, width: 2 });
  b += arrow(338, 178, 306, 178, { stroke: C.ink, width: 1.8 }) + arrow(178, 178, 146, 178, { stroke: C.ink, width: 1.8 });
  b += path("M466,178 L547,178 L547,144", { stroke: C.goldD, width: 1.8, dash: "5 4" });
  b += `<polygon points="547,144 542,154 552,154" fill="${C.goldD}"/>`;
  b += path("M547,88 L547,54 L470,54", { stroke: C.goldD, width: 1.8, dash: "5 4" });
  b += `<polygon points="468,54 478,49 478,59" fill="${C.goldD}"/>`;
  b += text(556, 196, "SNR feedback", { size: 11.5, fill: C.goldD, italic: true, anchor: "middle" });
  b += wave(470, 230, 410, 208, { stroke: C.violet, amp: 3, lambda: 10, width: 2 });
  b += math(478, 238, "\\r{satellite signal} \\b{g}_m^T\\b{w} s", { size: 12.5, fill: C.violetD });
  return svgDoc(W, H, b);
}

// Part IV design: MAPPO with centralized critic and parameter sharing
function maArch() {
  const W = 640, H = 300;
  let b = panel(W, H);
  const blk = (x, y, w, h, col, fill, dash) => rect(x, y, w, h, { fill, stroke: col, width: 1.6, r: 10, dash });
  // actors
  b += text(20, 30, "Decentralized actors (shared θ)", { size: 13.5, weight: "bold", fill: C.orangeD });
  [[44, "1"], [150, "J"]].forEach(([y, j]) => {
    b += blk(18, y, 266, 92, C.orangeD, C.white);
    b += math(30, y + 30, `o_${j}`, { size: 15, fill: C.skyD, weight: "bold" });
    b += arrow(52, y + 25, 76, y + 25, { stroke: C.ink, width: 1.4, head: 6 });
    b += rect(78, y + 10, 64, 32, { fill: C.orangeL, stroke: C.orange, width: 1.3, r: 6 });
    b += text(110, y + 31, "MLP", { size: 12.5, anchor: "middle", weight: "bold" });
    b += line(142, y + 26, 156, y + 26, { stroke: C.ink, width: 1.4 }) + line(156, y + 14, 156, y + 78, { stroke: C.ink, width: 1.4 });
    const heads = [["Δ\\b{q}_" + j, "move"], ["ζ_" + j, "power split"], ["\\b{c}_" + j, "common rate"]];
    heads.forEach(([m, lab], k) => {
      const hy = y + 14 + k * 26;
      b += arrow(156, hy, 168, hy, { stroke: C.ink, width: 1.2, head: 5 });
      b += math(172, hy + 5, m, { size: 13, fill: C.orangeD });
      b += text(206, hy + 5, lab, { size: 11.5, fill: C.muted });
    });
  });
  b += text(140, 145, "⋮", { size: 18, anchor: "middle", fill: C.muted });
  // environment
  b += blk(312, 98, 112, 92, C.skyD, "#EAF3FC");
  b += text(368, 128, "SAGIN", { size: 13.5, anchor: "middle", weight: "bold", fill: C.skyD });
  b += text(368, 144, "simulator", { size: 12, anchor: "middle", fill: C.muted });
  b += L.uav(368, 170, 0.6, C.orange);
  b += arrow(284, 106, 312, 120, { stroke: C.orangeD, width: 1.8 }) + math(294, 102, "\\b{a}", { size: 13, fill: C.orangeD });
  b += arrow(312, 170, 284, 196, { stroke: C.skyD, width: 1.8 }) + math(288, 176, "o'", { size: 13, fill: C.skyD });
  // buffer + critic
  b += blk(452, 30, 170, 70, C.slate, C.white);
  b += text(537, 56, "Rollout buffer", { size: 13, anchor: "middle", weight: "bold" });
  b += math(537, 78, "(s, \\b{o}, \\b{a}, r, s')", { size: 12.5, anchor: "middle", fill: C.muted });
  b += blk(452, 124, 170, 70, C.orangeD, C.orangeL, "6 4");
  b += text(537, 150, "Central critic", { size: 13, anchor: "middle", weight: "bold", fill: C.orangeD });
  b += math(537, 172, "V_φ(s) → \\r{GAE} Â_t", { size: 12.5, anchor: "middle" });
  b += blk(452, 216, 170, 62, C.ink, C.white);
  b += text(537, 242, "PPO update", { size: 13, anchor: "middle", weight: "bold" });
  b += math(537, 262, "\\r{clip} ε, \\r{entropy bonus}", { size: 12.5, anchor: "middle", fill: C.muted });
  b += arrow(424, 120, 452, 84, { stroke: C.slate, width: 1.6 }) + math(430, 94, "r", { size: 13, fill: C.muted });
  b += arrow(537, 100, 537, 124, { stroke: C.ink, width: 1.6, head: 7 }) + arrow(537, 194, 537, 216, { stroke: C.ink, width: 1.6, head: 7 });
  b += path("M452,248 L240,248 L240,242", { stroke: C.orangeD, width: 1.6, dash: "5 4" });
  b += `<polygon points="240,240 235,250 245,250" fill="${C.orangeD}"/>`;
  b += math(336, 266, "∇_θ \\r{(shared actor weights)}", { size: 12.5, anchor: "middle", fill: C.orangeD });
  return svgDoc(W, H, b);
}

// ======================================================= backgrounds ====
function darkBase(W, H, defsExtra = "") {
  const defs = `
  <radialGradient id="gBg" cx="0.78" cy="1.05" r="1.05"><stop offset="0" stop-color="#1D4B8C"/><stop offset="0.45" stop-color="#0D2550"/><stop offset="1" stop-color="#060E22"/></radialGradient>
  <filter id="fGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
  <filter id="fSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>${defsExtra}`;
  return { defs, base: rect(0, 0, W, H, { fill: "url(#gBg)" }) };
}

function earthLimb(cx, cy, r) {
  let s = "";
  s += circle(cx, cy, r + 14, { fill: "#4FB3FF", opacity: 0.35 }).replace("/>", ' filter="url(#fGlow)"/>');
  s += circle(cx, cy, r, { fill: "url(#gEarth)" });
  s += circle(cx, cy, r, { stroke: "#7CCBFF", width: 3, opacity: 0.85 });
  // faint graticule
  for (let k = 1; k <= 5; k++) s += ellipse(cx, cy, r * (k / 5.6), r, { stroke: "#9BD3FF", width: 1, opacity: 0.12 });
  for (let k = 1; k <= 4; k++) s += ellipse(cx, cy, r, r * (k / 4.6), { stroke: "#9BD3FF", width: 1, opacity: 0.1 });
  return s;
}

function orbitSat(x, y, s, rot) { return L.satellite(x, y, s, { rotate: rot }); }

function bgTitle() {
  const W = 1333, H = 750;
  const extra = `<radialGradient id="gEarth" cx="0.35" cy="0.25" r="0.9"><stop offset="0" stop-color="#2F7FD0"/><stop offset="0.5" stop-color="#17508F"/><stop offset="1" stop-color="#0A2A55"/></radialGradient>`;
  const { defs, base } = darkBase(W, H, extra);
  const ex = 1180, ey = 1580, er = 1000;
  let b = base;
  b += stars(W, H, 260, 11, (x, y) => Math.hypot(x - ex, y - ey) < er + 40);
  b += earthLimb(ex, ey, er);
  // orbits around the Earth
  b += ellipse(ex, ey, er + 190, er - 120, { stroke: "#8CC4FF", width: 1.6, opacity: 0.35, rotate: -12 });
  b += ellipse(ex, ey, er + 360, er + 40, { stroke: "#8CC4FF", width: 1.4, opacity: 0.25, rotate: -4, dash: "2 9" });
  b += ellipse(ex, ey, er + 120, er + 60, { stroke: C.gold, width: 1.4, opacity: 0.35, rotate: 18 });
  b += orbitSat(1035, 455, 0.95, -18) + orbitSat(1265, 330, 0.7, 10) + orbitSat(760, 640, 0.6, -28);
  // inter-satellite / feeder links
  b += line(1068, 448, 1236, 338, { stroke: C.gold, width: 1.6, dash: "6 6", opacity: 0.6 });
  b += line(1005, 470, 790, 622, { stroke: C.gold, width: 1.6, dash: "6 6", opacity: 0.5 });
  return svgDoc(W, H, b, defs);
}

// Section-divider backgrounds: same night-sky base, one motif per part on the right.
function bgSection(part) {
  const W = 1333, H = 750;
  const extra = `<radialGradient id="gEarth" cx="0.35" cy="0.25" r="0.9"><stop offset="0" stop-color="#2F7FD0"/><stop offset="0.5" stop-color="#17508F"/><stop offset="1" stop-color="#0A2A55"/></radialGradient>
  <radialGradient id="gNuc" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.35" stop-color="#C9B6FF"/><stop offset="1" stop-color="#7A4FD8" stop-opacity="0"/></radialGradient>`;
  const { defs, base } = darkBase(W, H, extra);
  let b = base + stars(W, H, 170, 50 + part);
  const cx = 1010, cy = 375;
  if (part === 1) {
    b += earthLimb(1120, 1320, 760);
    b += ellipse(1120, 1320, 900, 640, { stroke: "#8CC4FF", width: 1.6, opacity: 0.35, rotate: -10 });
    b += ellipse(1120, 1320, 1010, 820, { stroke: C.gold, width: 1.4, opacity: 0.3, rotate: 8, dash: "3 9" });
    b += orbitSat(870, 470, 0.9, -20) + orbitSat(1180, 300, 0.75, 8);
    b += line(900, 460, 1150, 312, { stroke: C.gold, width: 1.6, dash: "6 6", opacity: 0.55 });
    b += group(L.uav(0, 0, 1.3, C.sky), { x: 760, y: 610 });
  } else if (part === 2) {
    // polarization: rotating E-field ellipses along a propagation axis
    const ax0 = 700, ay0 = 560, ax1 = 1290, ay1 = 200;
    b += line(ax0, ay0, ax1, ay1, { stroke: "#7FE3D6", width: 1.6, opacity: 0.5, dash: "4 8" });
    for (let k = 0; k < 7; k++) {
      const t = k / 6, x = ax0 + (ax1 - ax0) * t, y = ay0 + (ay1 - ay0) * t;
      const rot = -90 + k * 22, a = 70 - k * 4, bb = 18 + k * 7;
      b += ellipse(x, y, a, bb, { stroke: C.teal, width: 3, opacity: (0.25 + 0.1 * k).toFixed(2), rotate: rot });
    }
    let d = "";
    for (let k = 0; k <= 240; k++) {
      const t = k / 240, x = ax0 + (ax1 - ax0) * t, y = ay0 + (ay1 - ay0) * t;
      const amp = 62 * Math.sin(t * Math.PI * 7);
      d += `${k ? "L" : "M"}${(x + 0.52 * amp).toFixed(1)},${(y + 0.85 * amp).toFixed(1)}`;
    }
    b += path(d, { stroke: "#5FE0CF", width: 2.4, opacity: 0.7 });
  } else if (part === 3) {
    b += circle(cx, cy, 120, { fill: "url(#gNuc)", opacity: 0.55 });
    b += circle(cx, cy, 16, { fill: "#EDE6FF" });
    for (const r of [0, 60, 120]) b += ellipse(cx, cy, 250, 82, { stroke: "#B9A2FF", width: 2.6, opacity: 0.55, rotate: r });
    for (const [r, t] of [[0, 0.3], [60, 2.2], [120, 4.1]]) {
      const th = (r * Math.PI) / 180, ex = 250 * Math.cos(t), ey = 82 * Math.sin(t);
      b += circle(cx + ex * Math.cos(th) - ey * Math.sin(th), cy + ex * Math.sin(th) + ey * Math.cos(th), 9, { fill: "#D8CCFF" });
    }
    b += line(700, 650, 1333, 610, { stroke: C.probe, width: 3, opacity: 0.45 }) + line(700, 664, 1333, 624, { stroke: C.coupling, width: 3, opacity: 0.4 });
  } else {
    const rng = L.mulberry32(77);
    const pts = [];
    for (let gx = 0; gx < 6; gx++) for (let gy = 0; gy < 5; gy++)
      pts.push([790 + gx * 92 + (rng() - 0.5) * 60, 150 + gy * 112 + (rng() - 0.5) * 60]);
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
        if (d < 135) b += line(pts[i][0], pts[i][1], pts[j][0], pts[j][1], { stroke: "#F3B57A", width: 1.4, opacity: 0.35 });
      }
    pts.forEach(([x, y], i) => {
      const hub = i % 6 === 0;
      b += circle(x, y, hub ? 13 : 6, { fill: hub ? C.orange : "#F6C89A", opacity: hub ? 0.95 : 0.7 });
      if (hub) b += circle(x, y, 24, { stroke: C.orange, width: 2, opacity: 0.45 });
    });
  }
  return svgDoc(W, H, b, defs);
}

module.exports = [
  { name: "sagin", w: 600, h: 470, svg: sagin },
  { name: "polarforming", w: 600, h: 470, svg: polarforming },
  { name: "rydberg", w: 600, h: 470, svg: rydberg },
  { name: "rsma", w: 600, h: 470, svg: rsma },
  { name: "madrl", w: 600, h: 470, svg: madrl },
  { name: "pf_system", w: 600, h: 480, svg: pfSystem },
  { name: "aq_system", w: 600, h: 480, svg: aqSystem },
  { name: "ma_system", w: 600, h: 480, svg: maSystem },
  { name: "aq_pipeline", w: 620, h: 250, svg: aqPipeline },
  { name: "ma_arch", w: 640, h: 300, svg: maArch },
  { name: "bg_title", w: 1333, h: 750, svg: bgTitle, jpg: true, scale: 2.4 },
  { name: "bg_sec1", w: 1333, h: 750, svg: () => bgSection(1), jpg: true, scale: 2.4 },
  { name: "bg_sec2", w: 1333, h: 750, svg: () => bgSection(2), jpg: true, scale: 2.4 },
  { name: "bg_sec3", w: 1333, h: 750, svg: () => bgSection(3), jpg: true, scale: 2.4 },
  { name: "bg_sec4", w: 1333, h: 750, svg: () => bgSection(4), jpg: true, scale: 2.4 },
];
