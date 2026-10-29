#!/usr/bin/env node
"use strict";
/**
 * Build the bilingual chapter decks for 《新一代移动通信系统（双语）》
 * (Next-Generation Mobile Communication Systems).
 *
 *   node build_decks.js BG_DIR OUT_DIR
 *
 * BG_DIR holds chN_cover.jpg / chN_dark.jpg / chN_light.jpg from make_backgrounds.py.
 * Chapter 1 is a full lecture deck. Chapters 2-5 are templates: cover, contents and
 * one blank, titled slide per section of the syllabus, plus a closing slide.
 * Every deck carries the same six layouts, so slides can be added from PowerPoint's
 * "New Slide" menu with the chapter's background and styles.
 */
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const sharp = require("sharp");
const tb = require("react-icons/tb");
const JSZip = require(require.resolve("jszip", { paths: [require.resolve("pptxgenjs")] }));

const W = 13.333;
const H = 7.5;
const MX = 0.6;
const CW = W - 2 * MX;
const EA_FONT = "微软雅黑";
const LATIN_FONT = "Arial";

const COURSE = { cn: "新一代移动通信系统（双语）", en: "Next-Generation Mobile Communication Systems" };
const SCHOOL = { cn: "信息科学与工程学院", en: "School of Information Science and Engineering" };
const INSTRUCTOR = "主讲教师 Instructor：张淼";

const L = {
  COVER: "Cover 封面",
  CONTENTS: "Contents 目录",
  SECTION: "Section 节标题",
  CONTENT: "Title and Content 标题和内容",
  TITLE: "Title Only 仅标题",
  CLOSING: "Closing 结束页",
};

// ----------------------------------------------------------------------------- chapters
const CHAPTERS = [
  {
    n: 1, cn: "概述", en: "Overview", short: "Overview", file: "Ch1_概述.pptx",
    sections: [
      { no: "1.1", cn: "5G-6G标准演进", en: "Evolution of 5G-to-6G Standards" },
      { no: "1.2", cn: "移动通信前沿技术简介", en: "Introduction to Frontier Technologies in Mobile Communications" },
    ],
    req: {
      hours: ["2 学时", "2 class hours"],
      outcome: ["下一代移动通信系统的认知能力", "Cognitive grasp of next-generation mobile systems"],
      objective: ["目标1", "Course Objective 1"],
      method: ["讲授", "Lecture"],
      after: ["网络自学", "Online self-study"],
      ideology: ["中国移动通信的逆袭之路", "China's rise in mobile communications"],
    },
    pal: {
      dk1: "1F2433", lt1: "FFFFFF", dk2: "1E1856", lt2: "F1EFFF",
      accent1: "5B3FE0", accent2: "0E8FB5", accent3: "D63F86", accent4: "E8962E", accent5: "9FE3FF", accent6: "C3B6FF",
      hlink: "3D5AFE", folHlink: "7E57C2",
      sub: "9FE3FF", soft: "B9BDE0", muted: "656B80", panel: "0F0C33",
    },
  },
  {
    n: 2, cn: "空天地一体化通信系统", en: "Space-Air-Ground Integrated Communication Systems", short: "SAGIN",
    file: "Ch2_空天地一体化通信系统.pptx",
    sections: [
      { no: "2.1", cn: "空天地信道特征", en: "Space-Air-Ground Channel Characteristics" },
      { no: "2.2", cn: "空天地一体化通信关键技术", en: "Key Technologies of Space-Air-Ground Integrated Communications" },
      { no: "2.3", cn: "空天地一体化通信应用场景", en: "Application Scenarios of Space-Air-Ground Integrated Communications" },
    ],
    req: {
      hours: ["6 学时", "6 class hours"],
      outcome: ["掌握空天地一体化组网", "Master space-air-ground integrated networking"],
      objective: ["目标2、目标3", "Course Objectives 2 & 3"],
      method: ["讲授 + 项目式", "Lecture + project-based learning"],
      after: ["作业", "Homework"],
      ideology: ["低空经济引领空天地一体化通信", "The low-altitude economy drives SAGIN"],
      lab: ["实验一：空天地一体化通信系统仿真", "Lab 1 (4 h, design): SAGIN system simulation"],
    },
    pal: {
      dk1: "1E2533", lt1: "FFFFFF", dk2: "0B2A55", lt2: "EAF3FF",
      accent1: "1D6FD6", accent2: "0A9AB8", accent3: "EE7F1F", accent4: "2BA36B", accent5: "9AD8FF", accent6: "FFC56B",
      hlink: "1D6FD6", folHlink: "5B6CB8",
      sub: "9AD8FF", soft: "B4C3DD", muted: "626B7F", panel: "04112A",
    },
  },
  {
    n: 3, cn: "新型收发机技术", en: "Novel Transceiver Technologies", short: "Novel Transceivers",
    file: "Ch3_新型收发机技术.pptx",
    sections: [
      { no: "3.1", cn: "极化天线与极化赋形", en: "Polarized Antennas and Polarforming" },
      { no: "3.2", cn: "里德堡原子接收机", en: "Rydberg Atomic Receivers" },
    ],
    req: {
      hours: ["6 学时", "6 class hours"],
      outcome: ["掌握极化赋形与里德堡原子接收机原理", "Master polarforming and Rydberg atomic receivers"],
      objective: ["目标2、目标3", "Course Objectives 2 & 3"],
      method: ["讲授 + 项目式", "Lecture + project-based learning"],
      after: ["作业", "Homework"],
      lab: ["实验二：新型收发机仿真", "Lab 2 (4 h, verification): transceiver simulation"],
    },
    pal: {
      dk1: "1C2B2A", lt1: "FFFFFF", dk2: "08403E", lt2: "E6F7F3",
      accent1: "0B7C6C", accent2: "3D6FE0", accent3: "E0465E", accent4: "D9961A", accent5: "7CF2DC", accent6: "FFD36B",
      hlink: "0B7C6C", folHlink: "5B7F7A",
      sub: "7CF2DC", soft: "A9CFC9", muted: "5E6E6C", panel: "021C1C",
    },
  },
  {
    n: 4, cn: "太赫兹通信", en: "Terahertz Communications", short: "THz Communications", file: "Ch4_太赫兹通信.pptx",
    sections: [
      { no: "4.1", cn: "太赫兹与毫米波技术原理", en: "Principles of Terahertz and Millimeter-Wave Technologies" },
      { no: "4.2", cn: "太赫兹通信系统", en: "Terahertz Communication Systems" },
      { no: "4.3", cn: "太赫兹通信应用场景", en: "Application Scenarios of Terahertz Communications" },
    ],
    req: {
      hours: ["6 学时", "6 class hours"],
      outcome: ["掌握太赫兹通信原理", "Master the principles of THz communications"],
      objective: ["目标1、目标2", "Course Objectives 1 & 2"],
      method: ["讲授 + 项目式", "Lecture + project-based learning"],
      after: ["作业", "Homework"],
      ideology: ["太赫兹在下一代移动通信中的优势", "Advantages of THz in next-generation mobile"],
    },
    pal: {
      dk1: "2A1F2A", lt1: "FFFFFF", dk2: "4A1240", lt2: "FFF0F5",
      accent1: "C92A63", accent2: "D9692A", accent3: "7B2FA8", accent4: "D9961A", accent5: "FFB3CC", accent6: "FFD166",
      hlink: "C92A63", folHlink: "8E4F7A",
      sub: "FFB3CC", soft: "D7B5C8", muted: "6E6070", panel: "17081F",
    },
  },
  {
    n: 5, cn: "下一代移动通信展望", en: "Outlook for Next-Generation Mobile Communications", short: "Outlook",
    file: "Ch5_下一代移动通信展望.pptx",
    sections: [
      { no: "5.1", cn: "下一代移动通信技术的发展趋势", en: "Development Trends of Next-Generation Mobile Communication Technologies" },
      { no: "5.2", cn: "下一代移动通信的挑战与应对策略", en: "Challenges and Countermeasures for Next-Generation Mobile Communications" },
    ],
    req: {
      hours: ["4 学时", "4 class hours"],
      outcome: ["能够预判未来移动通信挑战与应对策略", "Anticipate future challenges and countermeasures"],
      objective: ["目标3", "Course Objective 3"],
      method: ["讲授", "Lecture"],
      after: ["大作业", "Course project"],
    },
    pal: {
      dk1: "24223A", lt1: "FFFFFF", dk2: "22205A", lt2: "FFF3E8",
      accent1: "B4561A", accent2: "4F55C9", accent3: "D9456F", accent4: "2B9A8F", accent5: "FFD58A", accent6: "A9C1FF",
      hlink: "4F55C9", folHlink: "7A6FA8",
      sub: "FFD58A", soft: "C2BEDB", muted: "65627A", panel: "0B0A26",
    },
  },
];

// ----------------------------------------------------------------------------- text helpers
/** Markup to runs: **bold**, ^{superscript}, _{subscript}. Every run is tagged zh-CN (alt en-US). */
function runs(str, opts = {}) {
  const out = [];
  const re = /\*\*(.+?)\*\*|\^\{(.+?)\}|_\{(.+?)\}/g;
  const base = Object.assign({ lang: "zh-CN" }, opts);
  let last = 0;
  let m;
  while ((m = re.exec(str))) {
    if (m.index > last) out.push({ text: str.slice(last, m.index), options: { ...base } });
    if (m[1] !== undefined) out.push({ text: m[1], options: { ...base, bold: true } });
    else if (m[2] !== undefined) out.push({ text: m[2], options: { ...base, superscript: true } });
    else out.push({ text: m[3], options: { ...base, subscript: true } });
    last = re.lastIndex;
  }
  if (last < str.length) out.push({ text: str.slice(last), options: { ...base } });
  if (!out.length) out.push({ text: "", options: { ...base } });
  return out;
}

/** One paragraph holding a Chinese line and its English gloss after a soft line break,
 * so the English line shares the bullet indent of the Chinese one. */
function bl(cn, en, cnOpts = {}, enOpts = {}) {
  const e = runs(en, enOpts);
  e[0].options.softBreakBefore = true;
  return { runs: [...runs(cn, cnOpts), ...e] };
}

/** Bullet with a tighter indent than pptxgenjs' 27 pt default (a fresh object per use). */
const BUL = () => ({ indent: 13 });

/** Paragraph list ([markup, opts] or bl(...)) to one run list with a line break after each paragraph. */
function paras(list) {
  const out = [];
  list.forEach((item, i) => {
    const r = Array.isArray(item) ? runs(item[0], item[1]) : item.runs.map((x) => ({ text: x.text, options: { ...x.options } }));
    if (i < list.length - 1) r[r.length - 1].options.breakLine = true;
    out.push(...r);
  });
  return out;
}

function hex2rgb(h) {
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function mix(a, b, t) {
  const pa = hex2rgb(a);
  const pb = hex2rgb(b);
  return pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// ----------------------------------------------------------------------------- icons
const iconCache = new Map();
async function icon(name, color, px = 256) {
  const key = `${name}:${color}`;
  if (!iconCache.has(key)) {
    const Comp = tb[name];
    if (!Comp) throw new Error(`unknown icon ${name}`);
    const svg = renderToStaticMarkup(React.createElement(Comp, { color: "#" + color, size: px, strokeWidth: 1.8 }));
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    iconCache.set(key, "image/png;base64," + buf.toString("base64"));
  }
  return iconCache.get(key);
}

// ----------------------------------------------------------------------------- deck
class Deck {
  constructor(ch, bgDir) {
    this.ch = ch;
    this.p = ch.pal;
    this.bg = (k) => path.join(bgDir, `ch${ch.n}_${k}.jpg`);
    const pres = new pptxgen();
    pres.layout = "LAYOUT_WIDE";
    pres.title = `${COURSE.cn} 第${ch.n}章 ${ch.cn}`;
    pres.subject = `${COURSE.en} - Chapter ${ch.n} ${ch.en}`;
    pres.author = "张淼";
    pres.company = SCHOOL.cn;
    pres.theme = { headFontFace: LATIN_FONT, bodyFontFace: LATIN_FONT };
    this.pres = pres;
    this.C = pres.SchemeColor;
    this.S = pres.shapes;
    this.defineLayouts();
  }

  shadow() {
    return { type: "outer", color: "1A1A40", blur: 7, offset: 1.6, angle: 90, opacity: 0.13 };
  }

  footerText() {
    const { n, cn, short } = this.ch;
    return `${COURSE.cn}｜第${n}章 ${cn}  ·  Ch.${n} ${short}`;
  }

  defineLayouts() {
    const { pres, p, C } = this;
    const footer = [
      { text: { text: this.footerText(), options: { x: MX, y: 7.03, w: 9.5, h: 0.3, fontSize: 10, color: p.muted, margin: 0, valign: "middle", lang: "zh-CN" } } },
    ];
    const slideNumber = { x: W - MX - 0.8, y: 7.03, w: 0.8, h: 0.3, fontSize: 10, color: p.muted, align: "right", margin: 0 };
    const ph = (name, type, o, prompt) => ({ placeholder: { options: Object.assign({ name, type, margin: 0, lang: "zh-CN" }, o), text: prompt } });

    pres.defineSlideMaster({
      title: L.COVER,
      background: { path: this.bg("cover") },
      objects: [
        ph("course", "body", { x: 0.75, y: 0.55, w: 10.5, h: 0.42, fontSize: 14, color: "D9DCF2", valign: "middle", bullet: false }, "课程名称 Course title"),
        ph("chapter", "body", { x: 0.75, y: 1.72, w: 7.5, h: 0.45, fontSize: 16, bold: true, color: p.sub, charSpacing: 2, valign: "middle", bullet: false }, "第 N 章 · CHAPTER N"),
        ph("title", "title", { x: 0.75, y: 2.2, w: 8.2, h: 1.2, fontSize: 54, bold: true, color: "FFFFFF", valign: "middle", align: "left" }, "章标题"),
        ph("subtitle", "body", { x: 0.75, y: 3.45, w: 8.2, h: 1.0, fontSize: 24, color: p.accent6, valign: "top", bullet: false }, "Chapter title in English"),
        ph("topics", "body", { x: 0.75, y: 4.62, w: 8.2, h: 0.9, fontSize: 14, color: p.soft, valign: "top", bullet: false }, "本章小节 Sections"),
        ph("info", "body", { x: 0.75, y: 6.45, w: 11, h: 0.45, fontSize: 12, color: p.soft, valign: "middle", bullet: false }, "学院 · 主讲教师 School · Instructor"),
      ],
    });

    pres.defineSlideMaster({
      title: L.CONTENTS,
      background: { path: this.bg("dark") },
      objects: [
        ph("title", "title", { x: 0.75, y: 0.55, w: 6, h: 0.85, fontSize: 40, bold: true, color: "FFFFFF", valign: "middle", align: "left" }, "目录"),
        ph("subtitle", "body", { x: 0.75, y: 1.38, w: 6, h: 0.42, fontSize: 15, color: p.sub, charSpacing: 6, valign: "middle", bullet: false }, "CONTENTS"),
      ],
    });

    pres.defineSlideMaster({
      title: L.SECTION,
      background: { path: this.bg("dark") },
      objects: [
        ph("number", "body", { x: 0.75, y: 1.25, w: 7, h: 1.75, fontSize: 110, bold: true, color: p.sub, valign: "bottom", bullet: false }, "N.N"),
        ph("title", "title", { x: 0.75, y: 3.1, w: 9.5, h: 1.0, fontSize: 40, bold: true, color: "FFFFFF", valign: "middle", align: "left" }, "节标题"),
        ph("subtitle", "body", { x: 0.75, y: 4.1, w: 9.5, h: 0.62, fontSize: 20, color: p.accent6, valign: "top", bullet: false }, "Section title in English"),
        ph("body", "body", { x: 0.75, y: 5.15, w: 9.5, h: 1.0, fontSize: 13, color: p.soft, valign: "top", bullet: false }, "本节要点 Key topics"),
      ],
    });

    const titlePh = ph("title", "title", { x: MX, y: 0.32, w: CW, h: 0.66, fontSize: 30, bold: true, color: C.text2, valign: "middle", align: "left" }, "单击此处添加标题");
    const subPh = ph("subtitle", "body", { x: MX, y: 0.97, w: CW, h: 0.42, fontSize: 15, color: C.accent1, valign: "middle", bullet: false }, "Click to add the English title");
    pres.defineSlideMaster({
      title: L.CONTENT,
      background: { path: this.bg("light") },
      objects: [
        titlePh,
        subPh,
        ph("body", "body", { x: MX, y: 1.65, w: CW, h: 5.15, fontSize: 18, color: C.text1, valign: "top", bullet: { indent: 18 }, paraSpaceAfter: 6 }, "单击此处添加内容 / Click to add content"),
        ...footer,
      ],
      slideNumber,
    });

    pres.defineSlideMaster({
      title: L.TITLE,
      background: { path: this.bg("light") },
      objects: [titlePh, subPh, ...footer],
      slideNumber,
    });

    pres.defineSlideMaster({
      title: L.CLOSING,
      background: { path: this.bg("cover") },
      objects: [
        ph("title", "title", { x: 0.75, y: 2.25, w: 8.2, h: 1.2, fontSize: 54, bold: true, color: "FFFFFF", valign: "middle", align: "left" }, "谢谢聆听"),
        ph("subtitle", "body", { x: 0.75, y: 3.45, w: 8.2, h: 0.7, fontSize: 26, color: p.accent6, valign: "top", bullet: false }, "Thank You"),
        ph("body", "body", { x: 0.75, y: 4.55, w: 8.2, h: 1.3, fontSize: 14, color: p.soft, valign: "top", bullet: false }, "下一章预告 / Next chapter"),
      ],
    });
  }

  // ---------------------------------------------------------------- generic slides
  section(title) {
    this.pres.addSection({ title });
    this.curSection = title;
  }

  slide(layout) {
    return this.pres.addSlide({ masterName: layout, sectionTitle: this.curSection });
  }

  titled(cn, en, layout = L.TITLE) {
    const s = this.slide(layout);
    s.addText(runs(cn), { placeholder: "title" });
    s.addText(runs(en), { placeholder: "subtitle" });
    return s;
  }

  cover() {
    const { ch } = this;
    const s = this.slide(L.COVER);
    s.addText(runs(`${COURSE.cn}   |   ${COURSE.en}`), { placeholder: "course" });
    s.addText(runs(`第 ${ch.n} 章   ·   CHAPTER ${String(ch.n).padStart(2, "0")}`), { placeholder: "chapter" });
    s.addText(runs(ch.cn), { placeholder: "title" });
    s.addText(runs(ch.en), { placeholder: "subtitle" });
    s.addText(runs(ch.sections.map((x) => `${x.no} ${x.cn}`).join("     ")), { placeholder: "topics" });
    s.addText(runs(`${SCHOOL.cn}  ${SCHOOL.en}     ·     ${INSTRUCTOR}`), { placeholder: "info" });
    s.addNotes(`第${ch.n}章 ${ch.cn}（${ch.en}）。学时：${ch.req.hours[0]}。`);
    return s;
  }

  /** Contents: numbered sections on the left, the syllabus requirements for the chapter on the right. */
  contents() {
    const { ch, p, S } = this;
    const s = this.slide(L.CONTENTS);
    s.addText(runs("目录"), { placeholder: "title" });
    s.addText(runs("CONTENTS"), { placeholder: "subtitle" });

    const n = ch.sections.length;
    const step = n === 3 ? 1.32 : 1.5;
    const y0 = n === 3 ? 2.3 : 2.55;
    ch.sections.forEach((sec, i) => {
      const y = y0 + i * step;
      s.addText(runs(sec.no), { x: 0.75, y, w: 1.45, h: 0.62, fontSize: 34, bold: true, color: p.sub, margin: 0, valign: "middle", isTextBox: true, objectName: `目录编号 ${sec.no}` });
      s.addText(paras([[sec.cn, { fontSize: 21, bold: true, color: "FFFFFF" }], [sec.en, { fontSize: 12.5, color: p.soft }]]),
        { x: 2.25, y: y - 0.02, w: 5.3, h: 1.1, margin: 0, valign: "top", paraSpaceAfter: 4, isTextBox: true, objectName: `目录标题 ${sec.no}` });
    });

    // requirements panel
    const r = ch.req;
    const rows = [
      ["学时", "Hours", r.hours],
      ["学习达成", "Outcome", r.outcome],
      ["支撑课程目标", "Objectives", r.objective],
      ["教学方法", "Methods", r.method],
      ["课外环节", "After class", r.after],
    ];
    if (r.ideology) rows.push(["思政融入点", "Ideology", r.ideology]);
    if (r.lab) rows.push(["配套实验", "Lab", r.lab]);
    const px = 7.95;
    const pw = W - MX - px;
    const rowH = rows.length > 6 ? 0.66 : 0.72;
    const ph = 0.72 + rows.length * rowH + 0.12;
    const py = Math.max(1.55, (H - ph) / 2 + 0.1);
    s.addShape(S.ROUNDED_RECTANGLE, { x: px, y: py, w: pw, h: ph, rectRadius: 0.12, fill: { color: p.panel, transparency: 16 }, line: { color: "FFFFFF", transparency: 70, width: 0.75 }, objectName: "教学要求面板" });
    s.addText(paras([["本章教学要求", { fontSize: 15, bold: true, color: "FFFFFF" }], ["Teaching requirements (from the syllabus)", { fontSize: 10.5, color: p.soft }]]),
      { x: px + 0.28, y: py + 0.16, w: pw - 0.5, h: 0.56, margin: 0, valign: "top", isTextBox: true, objectName: "面板标题" });
    rows.forEach(([lc, le, [vc, ve]], i) => {
      const y = py + 0.8 + i * rowH;
      s.addText(paras([[lc, { fontSize: 11.5, bold: true, color: p.sub }], [le, { fontSize: 9.5, color: p.soft }]]),
        { x: px + 0.28, y, w: 1.3, h: rowH - 0.06, margin: 0, valign: "top", isTextBox: true });
      s.addText(paras([[vc, { fontSize: 11.5, color: "FFFFFF" }], [ve, { fontSize: 9.5, color: p.soft }]]),
        { x: px + 1.62, y, w: pw - 1.85, h: rowH - 0.06, margin: 0, valign: "top", isTextBox: true });
    });
    s.addNotes("目录与本章教学要求（依据课程教学大纲：学时、学习达成、支撑课程目标、教学方法、课外环节" + (r.ideology ? "、思政融入点" : "") + "）。");
    return s;
  }

  sectionDivider(sec, topics) {
    const s = this.slide(L.SECTION);
    s.addText(runs(sec.no), { placeholder: "number" });
    s.addText(runs(sec.cn), { placeholder: "title" });
    s.addText(runs(sec.en), { placeholder: "subtitle" });
    s.addText(runs(topics), { placeholder: "body" });
    return s;
  }

  /** One blank, titled slide for a syllabus section (Chapters 2-5). */
  blankSection(sec) {
    const { p, ch } = this;
    const s = this.slide(L.CONTENT);
    s.addText([{ text: `${sec.no}  `, options: { lang: "zh-CN", color: p.accent1 } }, ...runs(sec.cn)], { placeholder: "title" });
    s.addText(runs(sec.en), { placeholder: "subtitle" });
    s.addText("", { placeholder: "body" });
    const r = ch.req;
    s.addNotes(`【${sec.no} ${sec.cn} / ${sec.en}】\n教学要求：${r.outcome[0]}；教学方法：${r.method[0]}；课外环节：${r.after[0]}` +
      (r.ideology ? `；思政融入点：${r.ideology[0]}` : "") + "。\n（本页为空白模板，请在此添加本小节讲授内容。）");
    return s;
  }

  closing(nextText) {
    const s = this.slide(L.CLOSING);
    s.addText(runs("谢谢聆听！"), { placeholder: "title" });
    s.addText(runs("Thank You"), { placeholder: "subtitle" });
    s.addText(nextText, { placeholder: "body" });
    return s;
  }

  // ---------------------------------------------------------------- composition helpers
  card(s, x, y, w, h, o = {}) {
    s.addShape(this.S.ROUNDED_RECTANGLE, {
      x, y, w, h, rectRadius: o.r ?? 0.1,
      fill: { color: o.fill ?? "FFFFFF", transparency: o.transparency ?? 0 },
      line: o.line ?? { type: "none" },
      shadow: o.shadow === false ? undefined : this.shadow(),
      objectName: o.name,
    });
  }

  async iconDot(s, x, y, d, iconName, fill, fg = "FFFFFF", name) {
    s.addShape(this.S.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" }, objectName: name ? `${name} 图标底` : undefined });
    const k = d * 0.56;
    s.addImage({ data: await icon(iconName, fg), x: x + (d - k) / 2, y: y + (d - k) / 2, w: k, h: k, objectName: name ? `${name} 图标` : undefined });
  }

  text(s, content, o) {
    const r = typeof content === "string" ? runs(content) : content;
    s.addText(r, Object.assign({ margin: 0, valign: "top", isTextBox: true }, o));
  }

  pill(s, x, y, w, h, label, fill, color, fontSize = 10.5, name) {
    s.addText(runs(label), { x, y, w, h, shape: this.S.ROUNDED_RECTANGLE, rectRadius: h / 2, fill: { color: fill }, line: { type: "none" }, color, fontSize, bold: true, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: name });
  }

  arrow(s, x1, y1, x2, y2, color, width = 1.5, dash) {
    const flipH = x2 < x1;
    const flipV = y2 < y1;
    s.addShape(this.S.LINE, {
      x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH, flipV,
      line: { color, width, endArrowType: "triangle", dashType: dash },
    });
  }

  line(s, x1, y1, x2, y2, color, width = 1, dash) {
    s.addShape(this.S.LINE, {
      x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1), flipH: x2 < x1, flipV: y2 < y1,
      line: { color, width, dashType: dash },
    });
  }

  source(s, txt, y = 6.62) {
    this.text(s, txt, { x: MX, y, w: CW, h: 0.3, fontSize: 10, color: this.p.muted, valign: "middle", objectName: "来源" });
  }

  async write(outDir) {
    const file = path.join(outDir, this.ch.file);
    await this.pres.writeFile({ fileName: file });
    await finalizeTheme(file, this.ch);
    return file;
  }
}

// ----------------------------------------------------------------------------- theme
const SLOTS = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];

/** Write the chapter palette and fonts (Arial + 微软雅黑 for East Asian text) into the theme. */
async function finalizeTheme(file, ch) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = "ppt/theme/theme1.xml";
  const name = `新一代移动通信系统 第${ch.n}章`;
  let xml = await zip.file(part).async("string");
  const scheme = `<a:clrScheme name="${name}">` + SLOTS.map((k) => `<a:${k}><a:srgbClr val="${ch.pal[k]}"/></a:${k}>`).join("") + "</a:clrScheme>";
  xml = xml
    .replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, head) => `${head}${name}"`)
    .replace(/<a:ea typeface=""\/>/g, `<a:ea typeface="${EA_FONT}"/>`)
    .replace(/<a:font script="Hans" typeface="[^"]*"\/>/g, `<a:font script="Hans" typeface="${EA_FONT}"/>`);
  if (!xml.includes(scheme)) throw new Error("theme colour scheme not replaced");
  zip.file(part, xml);
  // pptxgenjs writes an <a:pPr> in front of every run of a paragraph; the schema allows one,
  // first. Keep the leading one (it carries the paragraph's bullet, alignment and spacing).
  for (const f of Object.keys(zip.files)) {
    if (!/^ppt\/(slides|slideLayouts|slideMasters|notesSlides)\/[^/]+\.xml$/.test(f)) continue;
    const src = await zip.file(f).async("string");
    const fixed = src.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (whole, inner) => {
      const re = /<a:pPr\b(?:[^>]*\/>|[^>]*>[\s\S]*?<\/a:pPr>)/g;
      let first = true;
      const body = inner.replace(re, (m, offset) => {
        const keep = first && offset === 0;
        first = false;
        return keep ? m : "";
      });
      return `<a:p>${body}</a:p>`;
    });
    // an empty paragraph keeps no paragraph properties, so typing into an empty placeholder
    // picks up the layout's bullets and spacing
    const tidy = fixed.replace(/<a:p><a:pPr indent="0" marL="0"><a:buNone\/><\/a:pPr>(<a:endParaRPr[^>]*\/>)<\/a:p>/g, "<a:p>$1</a:p>");
    if (tidy !== src) zip.file(f, tidy);
  }
  // pptxgenjs' master list levels are 32/28/24/20 pt; bring them in line with the 18 pt body text
  const LEVEL_SZ = { 1: 2000, 2: 1600, 3: 1400 };
  const masterPart = "ppt/slideMasters/slideMaster1.xml";
  const master = (await zip.file(masterPart).async("string")).replace(/<p:bodyStyle>[\s\S]*?<\/p:bodyStyle>/, (body) =>
    body.replace(/(<a:lvl(\d)pPr\b[\s\S]*?<a:defRPr sz=")\d+"/g, (_, head, lvl) => `${head}${LEVEL_SZ[lvl] || 1400}"`));
  zip.file(masterPart, master);
  for (const f of Object.keys(zip.files)) {
    if (!/^ppt\/slideLayouts\/[^/]+\.xml$/.test(f)) continue;
    const src = await zip.file(f).async("string");
    if (src.includes('<p:cSld name="DEFAULT"')) zip.file(f, src.replace('<p:cSld name="DEFAULT"', '<p:cSld name="Blank 空白"'));
  }
  for (const f of Object.keys(zip.files)) {
    if (!f.endsWith(".xml")) continue;
    const bad = (await zip.file(f).async("string")).match(/<a:srgbClr val="((?![0-9A-Fa-f]{6}")[^"]*)"/);
    if (bad) throw new Error(`${f}: <a:srgbClr val="${bad[1]}"> is not a hex colour`);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

// ----------------------------------------------------------------------------- chapter 1 content
async function buildChapter1(d) {
  const { p, C, S } = d;
  const ch = d.ch;

  d.section("封面与导学 Opening");
  d.cover();
  d.contents();

  // ---- chapter guide
  {
    const s = d.titled("本章导学", "Chapter Guide: Objectives, Key Points and Difficulties");
    const objs = [
      ["了解1G–6G移动通信的演进脉络与驱动力", "Trace the evolution of mobile generations from 1G to 6G and its drivers"],
      ["掌握IMT-2020（5G）三大应用场景与关键能力指标", "Master the usage scenarios and key capabilities of IMT-2020 (5G)"],
      ["理解IMT-2030（6G）愿景、能力指标与标准化时间表", "Understand the IMT-2030 (6G) vision, capabilities and standards timeline"],
      ["了解空天地一体化、新型收发机、太赫兹等前沿技术", "Get an overview of SAGIN, novel transceivers, THz and other frontier technologies"],
    ];
    d.text(s, paras([["学习目标", { fontSize: 18, bold: true, color: C.text2 }], ["Learning objectives", { fontSize: 12, color: C.accent1 }]]), { x: MX, y: 1.68, w: 6.6, h: 0.65 });
    for (let i = 0; i < objs.length; i++) {
      const y = 2.5 + i * 1.08;
      d.card(s, MX, y, 6.95, 0.92, { name: `目标${i + 1}` });
      d.text(s, runs(String(i + 1).padStart(2, "0"), { fontSize: 24, bold: true, color: C.accent1 }), { x: MX + 0.22, y: y + 0.13, w: 0.8, h: 0.66, valign: "middle" });
      d.text(s, paras([[objs[i][0], { fontSize: 14, bold: true, color: C.text1 }], [objs[i][1], { fontSize: 11, color: p.muted }]]),
        { x: MX + 1.05, y: y + 0.12, w: 5.7, h: 0.7, valign: "middle", paraSpaceAfter: 2 });
    }
    const bx = 8.05;
    const bw = W - MX - bx;
    const blocks = [
      ["TbTarget", "重点", "Key points", [["5G/6G应用场景与关键能力指标的对比", "5G vs 6G usage scenarios and key capabilities"], ["3GPP版本演进与6G标准化时间表", "3GPP release roadmap and the 6G timeline"]], C.accent1, p.accent1],
      ["TbPuzzle", "难点", "Difficulties", [["ITU-R与3GPP协同的标准化流程", "How ITU-R and 3GPP work together"], ["性能指标之间的权衡与取舍", "Trade-offs among performance targets"]], C.accent3, p.accent3],
    ];
    for (let i = 0; i < blocks.length; i++) {
      const [ic, t1, t2, items, cfill, hex] = blocks[i];
      const y = 1.72 + i * 2.55;
      d.card(s, bx, y, bw, 2.35, { fill: i ? "FFF4F8" : p.lt2, shadow: false, name: t1 });
      await d.iconDot(s, bx + 0.25, y + 0.25, 0.6, ic, hex, "FFFFFF", t1);
      d.text(s, paras([[t1, { fontSize: 17, bold: true, color: cfill }], [t2, { fontSize: 11, color: p.muted }]]), { x: bx + 1.0, y: y + 0.22, w: bw - 1.2, h: 0.68, valign: "middle" });
      d.text(s, paras(items.map(([a, b]) => bl(a, b, { fontSize: 13, color: C.text1, bullet: BUL(), paraSpaceAfter: 8 }, { fontSize: 10.5, color: p.muted }))),
        { x: bx + 0.3, y: y + 1.05, w: bw - 0.55, h: 1.2 });
    }
    s.addNotes("本章导学：学习目标对应课程目标1（深刻理解5G-6G标准演进）。重点放在5G与6G场景/指标对比和标准化路线；难点是ITU-R与3GPP的分工协同、各项指标之间的权衡。");
  }

  // ================================================================ 1.1
  d.section("1.1 5G-6G标准演进 Standards Evolution");
  d.sectionDivider(ch.sections[0], "代际演进 · 标准化体系 · 5G与5G-Advanced · IMT-2030愿景与指标 · 6G时间表\nGenerations · Standards bodies · 5G & 5G-Advanced · IMT-2030 vision · 6G timeline");

  // ---- generations timeline
  {
    const s = d.titled("移动通信代际演进：约十年一代", "From 1G to 6G: A New Generation Roughly Every Decade");
    const gens = [
      ["1G", "1980s", "模拟语音", "Analog voice", ["FDMA", "模拟调频"], ["AMPS / TACS", "NMT"]],
      ["2G", "1990s", "数字语音与短信", "Digital voice & SMS", ["TDMA / CDMA"], ["GSM", "IS-95"]],
      ["3G", "2000s", "移动互联网", "Mobile Internet", ["宽带CDMA"], ["WCDMA", "CDMA2000", "TD-SCDMA"]],
      ["4G", "2010s", "移动宽带", "Mobile broadband", ["OFDM + MIMO"], ["LTE", "LTE-Advanced"]],
      ["5G", "2019–", "万物互联", "Internet of Everything", ["Massive MIMO", "毫米波 mmWave"], ["5G NR", "5G-Advanced"]],
      ["6G", "≈2030", "智慧泛在", "Ubiquitous intelligence", ["空天地一体", "通感一体 · AI原生"], ["IMT-2030"]],
    ];
    const cw = 1.85;
    const gap = (CW - 6 * cw) / 5;
    const ty = 2.42;
    d.line(s, MX + cw / 2, ty, MX + 5 * (cw + gap) + cw / 2, ty, mix(p.lt2, p.accent1, 0.45), 2);
    for (let i = 0; i < 6; i++) {
      const [g, era, kcn, ken, tech, sys] = gens[i];
      const x = MX + i * (cw + gap);
      const cx = x + cw / 2;
      const fill = i === 5 ? p.accent3 : mix(mix(p.lt2, p.accent1, 0.35), p.accent1, i / 4);
      d.text(s, runs(era, { fontSize: 13, bold: true, color: p.muted }), { x, y: 1.66, w: cw, h: 0.3, align: "center", valign: "middle" });
      s.addText(runs(g), { x: cx - 0.4, y: ty - 0.4, w: 0.8, h: 0.8, shape: S.OVAL, fill: { color: fill }, line: { color: "FFFFFF", width: 2 }, color: "FFFFFF", fontSize: 17, bold: true, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `代际 ${g}` });
      d.card(s, x, 3.05, cw, 2.75, { name: `${g} 说明卡` });
      d.text(s, paras([
        [kcn, { fontSize: 15, bold: true, color: i === 5 ? C.accent3 : C.text2 }],
        [ken, { fontSize: 10.5, color: i === 5 ? C.accent3 : C.accent1, paraSpaceAfter: 10 }],
        ["关键技术 Key tech", { fontSize: 9.5, bold: true, color: p.muted, paraSpaceAfter: 2 }],
        ...tech.map((t, k) => [t, { fontSize: 12, color: C.text1, paraSpaceAfter: k === tech.length - 1 ? 9 : 0 }]),
        ["代表系统 Systems", { fontSize: 9.5, bold: true, color: p.muted, paraSpaceAfter: 2 }],
        ...sys.map((t) => [t, { fontSize: 12, color: C.text1 }]),
      ]), { x: x + 0.16, y: 3.2, w: cw - 0.3, h: 2.5 });
    }
    d.card(s, MX, 6.0, CW, 0.78, { fill: p.lt2, shadow: false, name: "演进规律" });
    await d.iconDot(s, MX + 0.2, 6.11, 0.56, "TbBulb", p.accent1, "FFFFFF", "演进规律");
    d.text(s, paras([["规律：每一代 ≈ 新空口 + 新频谱 + 新业务", { fontSize: 13, bold: true, color: C.text2 }], ["Pattern: each generation brings a new air interface, new spectrum and new services", { fontSize: 10.5, color: p.muted }]]),
      { x: MX + 0.95, y: 6.05, w: CW - 1.15, h: 0.68, valign: "middle" });
    s.addNotes("约每十年一代：1G模拟语音（AMPS/TACS），2G数字化（GSM/IS-95），3G移动互联网（WCDMA/CDMA2000/TD-SCDMA），4G移动宽带（OFDM+MIMO），5G万物互联（2019年商用），6G预计2030年前后商用。引导学生思考每一代的“新空口+新频谱+新业务”。");
  }

  // ---- peak rate chart
  {
    const s = d.titled("峰值速率指标的代际跃升", "Peak Data Rate Targets Across IMT Generations");
    s.addChart(d.pres.charts.BAR, [{ name: "Peak data rate (Gbit/s)", labels: ["3G · 2 Mbit/s", "4G · 1 Gbit/s", "5G · 20 Gbit/s", "6G · 200 Gbit/s"], values: [0.002, 1, 20, 200] }], {
      x: MX, y: 1.62, w: 7.4, h: 5.0, barDir: "col", barGapWidthPct: 55,
      chartColors: [mix(p.lt2, p.accent1, 0.35), mix(p.lt2, p.accent1, 0.65), p.accent1, p.accent3],
      valAxisLogScaleBase: 10, valAxisMinVal: 0.001, valAxisMaxVal: 1000,
      valAxisLabelFormatCode: "General", valAxisLabelColor: p.muted, valAxisLabelFontSize: 11, valAxisLabelFontFace: "+mn-lt",
      catAxisLabelColor: p.dk1, catAxisLabelFontSize: 12, catAxisLabelFontFace: "+mn-lt",
      valGridLine: { color: "E3E5EE", size: 0.75 }, catGridLine: { style: "none" },
      showValue: false,
      showValAxisTitle: true, valAxisTitle: "Gbit/s (log scale)", valAxisTitleColor: p.muted, valAxisTitleFontSize: 11, valAxisTitleFontFace: "+mn-lt",
      showLegend: false, showTitle: false, objectName: "峰值速率柱状图",
    });
    const rx = 8.45;
    const rw = W - MX - rx;
    d.card(s, rx, 1.7, rw, 2.25, { fill: p.lt2, shadow: false, name: "倍数卡" });
    d.text(s, [...runs("10", { fontSize: 54, bold: true, color: C.accent1 }), ...runs("5", { fontSize: 54, bold: true, color: C.accent1, superscript: true }), ...runs(" ×", { fontSize: 40, bold: true, color: C.accent1 })],
      { x: rx + 0.3, y: 1.8, w: rw - 0.5, h: 1.05, valign: "middle" });
    d.text(s, paras([["3G → 6G：峰值速率指标提升约十万倍", { fontSize: 14, bold: true, color: C.text2 }], ["2 Mbit/s → 200 Gbit/s, about 100,000× in four generations", { fontSize: 11, color: p.muted }]]),
      { x: rx + 0.3, y: 2.88, w: rw - 0.5, h: 0.95 });
    const bo = (sp) => ({ fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: sp });
    const eo = { fontSize: 10, color: p.muted };
    d.text(s, paras([
      ["速率从哪里来？", { fontSize: 14, bold: true, color: C.text2 }],
      ["Where does the gain come from?", { fontSize: 10.5, color: C.accent1, paraSpaceAfter: 6 }],
      bl("更宽的带宽：从MHz走向GHz（毫米波、太赫兹）", "Wider bandwidth: MHz → GHz (mmWave, THz)", bo(6), eo),
      bl("更高的频谱效率：高阶调制、先进编码", "Higher spectral efficiency: modulation & coding", bo(6), eo),
      bl("更多的空间维度：MIMO → Massive MIMO", "More spatial streams: MIMO → massive MIMO", bo(0), eo),
    ]), { x: rx + 0.05, y: 4.15, w: rw - 0.05, h: 2.4 });
    d.source(s, "来源 Source：ITU-R M.1645（IMT-2000 / IMT-Advanced）、M.2083（IMT-2020）、M.2160（IMT-2030，取50/100/200 Gbit/s示例值的上限）；纵轴为对数坐标");
    s.addNotes("峰值速率为ITU-R给出的指标（非实测）：IMT-2000约2 Mbit/s，IMT-Advanced 1 Gbit/s（低速），IMT-2020 20 Gbit/s，IMT-2030研究目标50/100/200 Gbit/s。纵轴为对数坐标。香农公式 C = B·log2(1+SNR) × 流数：带宽、频谱效率、空间复用是三条主线。");
  }

  // ---- standards ecosystem
  {
    const s = d.titled("标准化体系：ITU-R定框架，3GPP出规范", "The Standards Ecosystem: ITU-R Sets the Framework, 3GPP Writes the Specifications");
    const cards = [
      ["TbWorldBolt", "WRC", "世界无线电通信大会", "World Radiocommunication Conference", "每3–4年修订《无线电规则》，为IMT标识频谱", "Revises the Radio Regulations and identifies IMT spectrum",
        [["WRC-19：标识多个毫米波频段", "24.25–71 GHz"], ["WRC-23：设立WRC-27议题1.7", "研究6G候选频段 Candidate 6G bands"], ["WRC-27：6G频谱决策", "4.4–4.8 / 7.125–8.4 / 14.8–15.35 GHz"]]],
      ["TbWorld", "ITU-R WP 5D", "国际电联无线电通信部门", "ITU-R Working Party 5D", "制定IMT愿景框架与最低技术性能要求，评估并批准IMT标准", "Sets the IMT framework and requirements; evaluates and approves",
        [["IMT-2020愿景框架", "ITU-R M.2083（2015）"], ["IMT-2030愿景框架", "ITU-R M.2160（2023）"], ["需求 → 评估 → 批准", "Requirements → evaluation → approval"]]],
      ["TbStack2", "3GPP", "第三代合作伙伴计划", "3rd Generation Partnership Project", "由7个区域标准组织组成，以版本（Release）发布技术规范", "Seven partner SDOs publish specifications as Releases",
        [["研究SI → 工作项目WI → 冻结", "Study → work item → freeze"], ["Stage 1需求 / 2架构 / 3协议", "Requirements / architecture / protocols"], ["7个组织伙伴 Partners", "ARIB, ATIS, CCSA, ETSI, TSDSI, TTA, TTC"]]],
    ];
    const cw = 3.42;
    const gap = (CW - 3 * cw) / 2;
    const y = 1.72;
    const h = 3.88;
    const fills = [p.accent2, p.accent1, p.dk2];
    const tColors = [C.accent2, C.accent1, C.text2];
    for (let i = 0; i < 3; i++) {
      const [ic, code, cn, en, dcn, den, bullets] = cards[i];
      const x = MX + i * (cw + gap);
      d.card(s, x, y, cw, h, { name: code });
      await d.iconDot(s, x + 0.25, y + 0.25, 0.62, ic, fills[i], "FFFFFF", code);
      d.text(s, paras([[code, { fontSize: 15, bold: true, color: tColors[i] }], [cn, { fontSize: 12, bold: true, color: C.text2 }], [en, { fontSize: 9.5, color: p.muted }]]),
        { x: x + 1.0, y: y + 0.13, w: cw - 1.12, h: 0.88, valign: "middle" });
      d.text(s, paras([[dcn, { fontSize: 11.5, bold: true, color: C.accent1 }], [den, { fontSize: 10, color: p.muted }]]), { x: x + 0.25, y: y + 1.12, w: cw - 0.45, h: 0.9 });
      d.text(s, paras(bullets.map(([a, b], k) => bl(a, b, { fontSize: 11.5, color: C.text1, bullet: BUL(), paraSpaceAfter: k < 2 ? 7 : 0 }, { fontSize: 10, color: p.muted }))),
        { x: x + 0.25, y: y + 2.1, w: cw - 0.42, h: 1.7 });
    }
    // arrows between the cards
    const ax1 = MX + cw + 0.08;
    const ax2 = MX + cw + gap - 0.08;
    d.arrow(s, ax1, 3.25, ax2, 3.25, p.accent2, 2);
    d.text(s, paras([["频谱", { fontSize: 11, bold: true, color: C.accent2 }], ["Spectrum", { fontSize: 9.5, color: p.muted }]]), { x: ax1 - 0.05, y: 2.67, w: gap - 0.06, h: 0.55, align: "center" });
    const bx1 = MX + 2 * cw + gap + 0.08;
    const bx2 = MX + 2 * (cw + gap) - 0.08;
    d.arrow(s, bx1, 3.0, bx2, 3.0, p.accent1, 2);
    d.text(s, paras([["需求", { fontSize: 11, bold: true, color: C.accent1 }], ["Requirements", { fontSize: 9.5, color: p.muted }]]), { x: bx1 - 0.1, y: 2.42, w: gap, h: 0.55, align: "center" });
    d.arrow(s, bx2, 3.75, bx1, 3.75, p.dk2, 2);
    d.text(s, paras([["候选技术", { fontSize: 11, bold: true, color: C.text2 }], ["Candidates", { fontSize: 9.5, color: p.muted }]]), { x: bx1 - 0.1, y: 3.82, w: gap, h: 0.55, align: "center" });
    d.card(s, MX, 5.88, CW, 0.9, { fill: p.lt2, shadow: false, name: "我国对口" });
    await d.iconDot(s, MX + 0.22, 6.03, 0.6, "TbFlag", p.accent3, "FFFFFF", "我国对口");
    d.text(s, paras([["我国对口：CCSA（中国通信标准化协会）是3GPP组织伙伴；IMT-2030(6G)推进组统筹国内6G研究", { fontSize: 12.5, bold: true, color: C.text2 }],
      ["In China, CCSA is a 3GPP organizational partner and the IMT-2030 (6G) Promotion Group coordinates national 6G research", { fontSize: 10.5, color: p.muted }]]),
      { x: MX + 1.0, y: 5.93, w: CW - 1.2, h: 0.8, valign: "middle" });
    s.addNotes("三类组织：WRC负责频谱（无线电规则），ITU-R WP 5D负责IMT愿景/需求/评估，3GPP负责具体技术规范并作为候选技术提交ITU-R。3GPP的7个组织伙伴：ARIB、TTC（日本）、ATIS（美国）、CCSA（中国）、ETSI（欧洲）、TSDSI（印度）、TTA（韩国）。WRC-27议题1.7研究4.4–4.8 GHz、7.125–8.4 GHz、14.8–15.35 GHz用于IMT。");
  }

  // ---- 5G scenarios and KPIs
  {
    const s = d.titled("5G：IMT-2020三大应用场景与八大关键能力", "5G (IMT-2020): Three Usage Scenarios and Eight Key Capabilities");
    const scen = [
      ["TbVideo", "eMBB 增强移动宽带", "Enhanced Mobile Broadband", "4K/8K视频 · AR/VR", 3.15, 2.5, p.accent1, "right"],
      ["TbBuildingFactory", "URLLC 超高可靠低时延", "Ultra-Reliable Low-Latency", "工业控制 · 车联网 · 远程医疗", 1.75, 4.85, p.accent2, "below"],
      ["TbAffiliate", "mMTC 海量机器类通信", "Massive Machine-Type", "智慧城市 · 环境监测 · 物联网", 4.55, 4.85, p.accent3, "below"],
    ];
    const dd = 1.0;
    const edge = mix(p.lt2, p.accent1, 0.4);
    d.line(s, scen[0][4], scen[0][5], scen[1][4], scen[1][5], edge, 1.5, "dash");
    d.line(s, scen[0][4], scen[0][5], scen[2][4], scen[2][5], edge, 1.5, "dash");
    d.line(s, scen[1][4], scen[1][5], scen[2][4], scen[2][5], edge, 1.5, "dash");
    d.text(s, paras([["IMT-2020", { fontSize: 13, bold: true, color: C.text2, align: "center" }], ["三大场景 Scenarios", { fontSize: 9.5, color: p.muted, align: "center" }]]),
      { x: 2.15, y: 3.82, w: 2.0, h: 0.55, align: "center", valign: "middle" });
    for (const [ic, t1, t2, ex, cx, cy, fill, where] of scen) {
      s.addShape(S.OVAL, { x: cx - dd / 2 - 0.08, y: cy - dd / 2 - 0.08, w: dd + 0.16, h: dd + 0.16, fill: { color: "FFFFFF" }, line: { color: mix("FFFFFF", fill, 0.35), width: 1.5 } });
      await d.iconDot(s, cx - dd / 2, cy - dd / 2, dd, ic, fill, "FFFFFF", t1);
      const lab = paras([[t1, { fontSize: 12.5, bold: true, color: C.text2 }], [t2, { fontSize: 9.5, color: p.muted }], [ex, { fontSize: 10.5, color: C.text1 }]]);
      if (where === "right") d.text(s, lab, { x: cx + dd / 2 + 0.2, y: cy - 0.45, w: 2.3, h: 0.9, valign: "middle" });
      else d.text(s, lab.map((r) => ({ text: r.text, options: { ...r.options, align: "center" } })), { x: cx - 1.2, y: cy + dd / 2 + 0.12, w: 2.4, h: 0.85, align: "center" });
    }
    const kpis = [
      ["20 Gbit/s", "峰值速率", "Peak data rate"],
      ["100 Mbit/s", "用户体验速率", "User experienced data rate"],
      ["1 ms", "空口时延", "Latency (air interface)"],
      ["500 km/h", "移动性", "Mobility"],
      ["10^{6} /km²", "连接密度", "Connection density"],
      ["3×", "频谱效率（相对4G）", "Spectrum efficiency vs IMT-A"],
      ["100×", "网络能效（相对4G）", "Network energy efficiency vs IMT-A"],
      ["10 Mbit/s/m²", "区域流量容量", "Area traffic capacity"],
    ];
    const gx = 6.25;
    const gw = (W - MX - gx - 0.2) / 2;
    const gh = 1.12;
    for (let i = 0; i < kpis.length; i++) {
      const [v, cn, en] = kpis[i];
      const x = gx + (i % 2) * (gw + 0.2);
      const y = 1.7 + Math.floor(i / 2) * (gh + 0.15);
      d.card(s, x, y, gw, gh, { name: `指标 ${cn}` });
      d.text(s, runs(v, { fontSize: 22, bold: true, color: C.accent1 }), { x: x + 0.22, y: y + 0.12, w: gw - 0.4, h: 0.48, valign: "middle" });
      d.text(s, paras([[cn, { fontSize: 12, bold: true, color: C.text1 }], [en, { fontSize: 9.5, color: p.muted }]]), { x: x + 0.22, y: y + 0.6, w: gw - 0.4, h: 0.48 });
    }
    d.source(s, "来源 Source：ITU-R M.2083-0, IMT Vision – Framework and overall objectives of the future development of IMT for 2020 and beyond (2015)");
    s.addNotes("5G三大场景（ITU-R M.2083）：eMBB、URLLC、mMTC。八大关键能力：峰值速率20 Gbit/s、用户体验速率100 Mbit/s、时延1 ms、移动性500 km/h、连接密度10^6/km²、频谱效率3倍、网络能效100倍、区域流量10 Mbit/s/m²。说明：不同场景侧重不同指标，并不要求同时达到。");
  }

  // ---- 3GPP releases
  {
    const s = d.titled("3GPP版本演进：从Rel-15到Rel-21", "3GPP Release Roadmap: From Rel-15 to Rel-21");
    const rel = [
      ["15", "2018", ["首个5G NR标准", "NSA 2017.12", "SA 2018.06"], "First 5G NR (NSA and SA)"],
      ["16", "2020", ["URLLC增强", "工业物联网", "V2X · NR-U · 定位"], "URLLC, IIoT, V2X, NR-U, positioning"],
      ["17", "2022", ["非地面网络NTN", "RedCap轻量终端", "扩展至71 GHz"], "NTN, RedCap, up to 71 GHz"],
      ["18", "2024", ["5G-A首个版本", "AI/ML空口研究", "网络节能 · XR"], "First 5G-A: AI/ML study, energy saving, XR"],
      ["19", "2025", ["AI/ML空口标准化", "ISAC信道建模", "环境物联网"], "AI/ML air interface, ISAC channel model, Ambient IoT"],
      ["20", "2025–2027", ["5G-A持续演进", "6G技术研究", "2025.06启动"], "5G-A evolution and 6G study (from June 2025)"],
      ["21", "2027–2029", ["首个6G规范", "Stage-3 2028.12", "ASN.1 2029.03"], "First 6G specifications"],
    ];
    const cw = 1.6;
    const gap = (CW - 7 * cw) / 6;
    const colX = (i) => MX + i * (cw + gap);
    const phases = [["5G", 0, 2, p.accent2], ["5G-Advanced", 3, 5, p.accent1], ["6G", 6, 6, p.accent3]];
    for (const [label, a, b, fill] of phases) {
      d.pill(s, colX(a), 1.85, colX(b) + cw - colX(a), 0.36, label, fill, "FFFFFF", 12, `阶段 ${label}`);
    }
    const ty = 2.95;
    d.line(s, colX(0) + cw / 2, ty, colX(6) + cw / 2, ty, mix(p.lt2, p.accent1, 0.45), 2);
    for (let i = 0; i < rel.length; i++) {
      const [r, yr, cn, en] = rel[i];
      const x = colX(i);
      const fill = i < 3 ? p.accent2 : i < 6 ? p.accent1 : p.accent3;
      d.text(s, runs(yr, { fontSize: 11.5, bold: true, color: p.muted }), { x, y: 2.33, w: cw, h: 0.28, align: "center", valign: "middle" });
      s.addText(runs(`R${r}`), { x: x + cw / 2 - 0.32, y: ty - 0.32, w: 0.64, h: 0.64, shape: S.OVAL, fill: { color: fill }, line: { color: "FFFFFF", width: 2 }, color: "FFFFFF", fontSize: 13, bold: true, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Rel-${r}` });
      d.card(s, x, 3.5, cw, 2.3, { name: `Rel-${r} 说明` });
      d.text(s, paras([
        [`Rel-${r}`, { fontSize: 14, bold: true, color: C.text2, paraSpaceAfter: 5 }],
        ...cn.map((t, k) => [t, { fontSize: 11.5, color: C.text1, paraSpaceAfter: k === cn.length - 1 ? 6 : 1 }]),
        [en, { fontSize: 9.5, color: p.muted }],
      ]), { x: x + 0.14, y: 3.64, w: cw - 0.24, h: 2.1 });
    }
    d.text(s, paras([["注：年份为功能冻结时间（约）；Rel-21时间表由2026年6月TSG#112全会确定。", { fontSize: 11.5, color: C.text1 }],
      ["Years are approximate functional freezes; the Rel-21 timeline was agreed at TSG#112 in June 2026.", { fontSize: 10, color: p.muted }]]), { x: MX, y: 6.05, w: CW, h: 0.6 });
    s.addNotes("3GPP版本：Rel-15首个5G标准（NSA 2017.12、SA 2018.06）；Rel-16（2020）URLLC/IIoT/V2X；Rel-17（2022）NTN、RedCap、71 GHz；Rel-18（2024）为5G-Advanced首个版本；Rel-19（2025）；Rel-20含5G-A演进与6G研究（RAN#108，2025年6月批准6G研究项目）；Rel-21为首个6G标准版本：Stage-1冻结2027.03、Stage-2 2028.06、Stage-3 2028.12、ASN.1 2029.03（TSG#112，2026年6月）。");
  }

  // ---- 5G-Advanced
  {
    const s = d.titled("5G-Advanced：迈向6G的关键桥梁", "5G-Advanced: The Bridge from 5G to 6G");
    const caps = [
      ["TbBolt", "万兆体验", "10-Gbps experience", "下行万兆、上行千兆", "10 Gbit/s DL, 1 Gbit/s UL"],
      ["TbRadar", "通感一体", "ISAC", "基站兼具雷达感知能力", "Base stations that also sense"],
      ["TbBatteryOff", "无源物联", "Ambient IoT", "免电池标签，海量连接", "Battery-free tags at massive scale"],
      ["TbBrain", "内生智能", "Native AI", "AI/ML赋能空口与网络", "AI/ML in air interface and network"],
      ["TbSatellite", "天地一体", "NTN", "手机直连卫星，消除盲区", "Direct-to-device satellite links"],
      ["TbLeaf", "绿色低碳", "Green networks", "网络节能，降低每比特能耗", "Lower energy per bit"],
    ];
    const gx = MX;
    const gw = 7.55;
    const cw = (gw - 2 * 0.22) / 3;
    const chh = 2.35;
    for (let i = 0; i < caps.length; i++) {
      const [ic, cn, en, dcn, den] = caps[i];
      const x = gx + (i % 3) * (cw + 0.22);
      const y = 1.72 + Math.floor(i / 3) * (chh + 0.22);
      d.card(s, x, y, cw, chh, { name: cn });
      await d.iconDot(s, x + 0.22, y + 0.22, 0.62, ic, i % 2 ? p.accent2 : p.accent1, "FFFFFF", cn);
      d.text(s, paras([[cn, { fontSize: 15, bold: true, color: C.text2 }], [en, { fontSize: 10.5, color: C.accent1, paraSpaceAfter: 8 }], [dcn, { fontSize: 12, color: C.text1 }], [den, { fontSize: 10, color: p.muted }]]),
        { x: x + 0.22, y: y + 0.98, w: cw - 0.4, h: 1.3 });
    }
    const rx = 8.5;
    const rw = W - MX - rx;
    d.card(s, rx, 1.72, rw, 4.92, { fill: p.lt2, shadow: false, name: "5G-A数据" });
    const stats = [
      ["2024", "我国5G-A商用元年", "First year of commercial 5G-A in China"],
      ["330+", "城市实现5G-A商用（GSMA, 2026）", "Cities with commercial 5G-A service"],
      ["600 m", "合肥5G-A通感一体网络覆盖600米以下低空", "Hefei: ISAC coverage of airspace below 600 m"],
    ];
    stats.forEach(([v, cn, en], i) => {
      const y = 1.9 + i * 1.55;
      d.text(s, runs(v, { fontSize: 34, bold: true, color: C.accent1 }), { x: rx + 0.3, y, w: rw - 0.5, h: 0.62, valign: "middle" });
      d.text(s, paras([[cn, { fontSize: 12, bold: true, color: C.text1 }], [en, { fontSize: 10, color: p.muted }]]), { x: rx + 0.3, y: y + 0.64, w: rw - 0.5, h: 0.8 });
    });
    d.source(s, "来源 Source：3GPP Rel-18/19；GSMA《2026中国移动经济发展》；GTI Awards 2026（合肥5G-A通感一体低空网络）");
    s.addNotes("5G-Advanced（5.5G）自Rel-18起，是5G向6G的过渡。六个方向：万兆体验、通感一体、无源物联、内生智能、天地一体、绿色低碳。2024年为我国5G-A商用元年；据GSMA 2026报告，5G-A已在我国330多个城市商用；合肥5G-A通感一体专网覆盖主城区600米以下低空，服务低空经济（呼应第2章思政点）。");
  }

  // ---- IMT-2030 scenarios
  {
    const s = d.titled("6G愿景：IMT-2030六大场景与四大设计原则", "6G Vision: Six Usage Scenarios and Four Overarching Aspects of IMT-2030");
    const hw = 1.66;
    const hh = hw * 0.866;
    const g = 0.07;
    const cx = 3.75;
    const cy = 4.15;
    const R = hh + g;
    const hexes = [
      [-90, "沉浸式通信", "Immersive Communication", true],
      [-30, "超高可靠低时延", "HRLLC", true],
      [30, "超大规模连接", "Massive Communication", true],
      [90, "泛在连接", "Ubiquitous Connectivity", false],
      [150, "通信与AI融合", "AI and Communication", false],
      [210, "通信感知一体化", "ISAC", false],
    ];
    const hex = (x, y, fill, lineColor) => s.addShape(S.HEXAGON, { x: x - hw / 2, y: y - hh / 2, w: hw, h: hh, fill: { color: fill }, line: lineColor ? { color: lineColor, width: 1.5 } : { type: "none" } });
    hex(cx, cy, p.dk2);
    d.text(s, paras([["IMT-2030", { fontSize: 13, bold: true, color: "FFFFFF", align: "center" }], ["6G", { fontSize: 24, bold: true, color: p.accent5, align: "center" }]]), { x: cx - 0.7, y: cy - 0.5, w: 1.4, h: 1.0, valign: "middle", align: "center" });
    for (const [ang, cn, en, ext] of hexes) {
      const a = (ang * Math.PI) / 180;
      const x = cx + R * Math.cos(a);
      const y = cy + R * Math.sin(a);
      hex(x, y, ext ? p.accent1 : "FFFFFF", ext ? undefined : p.accent2);
      d.text(s, paras([[cn, { fontSize: 12, bold: true, color: ext ? "FFFFFF" : C.text2, align: "center" }], [en, { fontSize: 9, color: ext ? "E6E1FF" : p.muted, align: "center" }]]),
        { x: x - 0.7, y: y - 0.45, w: 1.4, h: 0.9, valign: "middle", align: "center" });
    }
    // legend
    s.addShape(S.HEXAGON, { x: 1.2, y: 6.42, w: 0.3, h: 0.26, fill: { color: p.accent1 }, line: { type: "none" } });
    d.text(s, runs("由5G场景扩展 Extended from 5G", { fontSize: 10.5, color: p.muted }), { x: 1.57, y: 6.38, w: 2.45, h: 0.34, valign: "middle" });
    s.addShape(S.HEXAGON, { x: 4.15, y: 6.42, w: 0.3, h: 0.26, fill: { color: "FFFFFF" }, line: { color: p.accent2, width: 1.25 } });
    d.text(s, runs("6G全新场景 New in 6G", { fontSize: 10.5, color: p.muted }), { x: 4.52, y: 6.38, w: 2.2, h: 0.34, valign: "middle" });

    const rx = 7.05;
    const rw = W - MX - rx;
    d.text(s, paras([["四大设计原则", { fontSize: 17, bold: true, color: C.text2 }], ["Overarching aspects (apply to all scenarios)", { fontSize: 11, color: C.accent1 }]]), { x: rx, y: 1.68, w: rw, h: 0.68 });
    const asp = [
      ["TbLeaf", "可持续性", "Sustainability", "提升能效，构建绿色网络", "Energy-efficient, green networks"],
      ["TbWorld", "连接未连接", "Connecting the unconnected", "弥合数字鸿沟，覆盖偏远地区", "Bridging the digital divide"],
      ["TbBrain", "泛在智能", "Ubiquitous intelligence", "AI融入网络与业务各层面", "AI across networks and services"],
      ["TbShieldCheck", "安全、隐私与韧性", "Security, privacy & resilience", "可信、可靠的信息基础设施", "Trustworthy, resilient infrastructure"],
    ];
    for (let i = 0; i < asp.length; i++) {
      const [ic, cn, en, dcn, den] = asp[i];
      const y = 2.5 + i * 0.98;
      await d.iconDot(s, rx, y + 0.08, 0.6, ic, i % 2 ? p.accent2 : p.accent1, "FFFFFF", cn);
      d.text(s, [...runs(cn, { fontSize: 13.5, bold: true, color: C.text1 }), ...runs(`  ${en}`, { fontSize: 10.5, color: C.accent1, breakLine: true }), ...runs(`${dcn} · ${den}`, { fontSize: 10.5, color: p.muted })],
        { x: rx + 0.78, y: y + 0.02, w: rw - 0.8, h: 0.8, valign: "middle", paraSpaceAfter: 2 });
    }
    d.text(s, paras([["eMBB → 沉浸式通信；URLLC → HRLLC；mMTC → 超大规模连接", { fontSize: 11.5, bold: true, color: C.text2 }], ["How the three 5G scenarios extend into 6G", { fontSize: 10, color: p.muted }]]),
      { x: rx, y: 6.42, w: rw, h: 0.55 });
    s.addNotes("ITU-R M.2160（2023年11月批准）给出6G六大场景：由5G扩展的沉浸式通信、HRLLC、超大规模连接，以及全新的泛在连接、AI与通信、通信感知一体化（ISAC）；四大设计原则：可持续性、连接未连接、泛在智能、安全/隐私/韧性。");
  }

  // ---- 5G vs 6G table
  {
    const s = d.titled("关键能力指标：IMT-2020（5G）vs IMT-2030（6G）", "Key Capabilities: IMT-2020 (5G) vs IMT-2030 (6G)");
    const head = (t) => ({ text: runs(t, { bold: true, color: "FFFFFF", fontSize: 12 }), options: { fill: { color: p.dk2 }, valign: "middle" } });
    const rowsData = [
      ["峰值速率", "Peak data rate", "20 Gbit/s", "50 / 100 / 200 Gbit/s"],
      ["用户体验速率", "User experienced data rate", "100 Mbit/s", "300 / 500 Mbit/s"],
      ["频谱效率", "Spectrum efficiency", "3×（相对IMT-A）", "1.5× / 3×（相对IMT-2020）"],
      ["区域流量容量", "Area traffic capacity", "10 Mbit/s/m²", "30 / 50 Mbit/s/m²"],
      ["连接密度", "Connection density", "10^{6} /km²", "10^{6} – 10^{8} /km²"],
      ["移动性", "Mobility", "500 km/h", "500 – 1000 km/h"],
      ["时延（用户面）", "Latency (user plane)", "1 ms", "0.1 – 1 ms"],
      ["可靠性", "Reliability", "1 − 10^{-5}", "1 − 10^{-5} ~ 1 − 10^{-7}"],
      ["定位精度", "Positioning", "—", "1 – 10 cm"],
    ];
    const rows = [[head("能力指标 Capability"), head("IMT-2020（5G）"), head("IMT-2030（6G）研究目标 Targets")]];
    rowsData.forEach(([cn, en, v5, v6], i) => {
      const fill = { color: i % 2 ? "FFFFFF" : p.lt2 };
      rows.push([
        { text: [...runs(cn, { bold: true, fontSize: 12, color: p.dk1 }), ...runs(`  ${en}`, { fontSize: 9.5, color: p.muted })], options: { fill, valign: "middle" } },
        { text: runs(v5, { fontSize: 12, color: p.dk1 }), options: { fill, valign: "middle" } },
        { text: runs(v6, { fontSize: 12, bold: true, color: p.accent1 }), options: { fill, valign: "middle" } },
      ]);
    });
    s.addTable(rows, { x: MX, y: 1.68, w: 8.55, colW: [3.75, 1.95, 2.85], rowH: 0.49, border: { type: "solid", pt: 0.5, color: "DADCE8" }, margin: [0.04, 0.12, 0.04, 0.12], objectName: "5G与6G指标对比表" });

    const rx = 9.5;
    const rw = W - MX - rx;
    d.card(s, rx, 1.68, rw, 4.9, { fill: p.lt2, shadow: false, name: "15项能力" });
    d.text(s, [...runs("15", { fontSize: 50, bold: true, color: C.accent1 }), ...runs(" 项能力", { fontSize: 16, bold: true, color: C.text2 })], { x: rx + 0.25, y: 1.78, w: rw - 0.4, h: 0.9, valign: "middle" });
    d.text(s, runs("15 capabilities = 9 enhanced + 6 new", { fontSize: 11, color: p.muted }), { x: rx + 0.25, y: 2.66, w: rw - 0.4, h: 0.3 });
    d.pill(s, rx + 0.25, 3.1, (rw - 0.65) / 2, 0.38, "9 项增强", p.accent1, "FFFFFF", 11);
    d.pill(s, rx + 0.4 + (rw - 0.65) / 2, 3.1, (rw - 0.65) / 2, 0.38, "6 项新增", p.accent3, "FFFFFF", 11);
    d.text(s, paras([
      ["新增能力 New capabilities", { fontSize: 12, bold: true, color: C.text2, paraSpaceAfter: 4 }],
      ["覆盖 Coverage", { fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: 5 }],
      ["定位 Positioning", { fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: 5 }],
      ["感知相关能力 Sensing", { fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: 5 }],
      ["AI相关能力 AI-related", { fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: 5 }],
      ["可持续性 Sustainability", { fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: 5 }],
      ["互操作性 Interoperability", { fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: 5 }],
    ]), { x: rx + 0.25, y: 3.65, w: rw - 0.4, h: 2.85 });
    d.source(s, "来源 Source：ITU-R M.2083-0、M.2160-0。6G数值为研究目标，不要求在同一场景中同时达到 / Research targets, not required simultaneously");
    s.addNotes("IMT-2030共15项能力：9项由IMT-2020增强（峰值速率、用户体验速率、频谱效率、区域流量、连接密度、移动性、时延、可靠性、安全与韧性），6项新增（覆盖、定位、感知、AI相关、可持续性、互操作性）。数值为“研究目标”，ITU-R强调不同场景不必同时满足。");
  }

  // ---- 6G timeline (gantt)
  {
    const s = d.titled("6G标准化时间表：2030年前后实现商用", "6G Standardization Timeline: Toward Commercial Launch around 2030");
    const x0 = 2.55;
    const x1 = W - MX - 0.1;
    const yr0 = 2023;
    const yr1 = 2031;
    const X = (t) => x0 + ((t - yr0) / (yr1 - yr0)) * (x1 - x0);
    for (let y = yr0; y < yr1; y++) {
      d.text(s, runs(String(y), { fontSize: 12, bold: true, color: y === 2030 ? C.accent3 : p.muted }), { x: X(y), y: 1.66, w: X(y + 1) - X(y), h: 0.32, align: "center", valign: "middle" });
    }
    const lanes = [
      ["ITU-R", "IMT-2030", 2.12, p.accent1],
      ["WRC", "频谱 Spectrum", 3.62, p.accent2],
      ["3GPP", "技术规范 Specs", 4.85, p.dk2],
    ];
    const laneH = [1.38, 1.1, 1.38];
    lanes.forEach(([t1, t2, y, fill], i) => {
      d.card(s, MX, y, W - 2 * MX, laneH[i], { fill: i % 2 ? "FFFFFF" : p.lt2, shadow: false, r: 0.08, name: `泳道 ${t1}` });
      d.text(s, paras([[t1, { fontSize: 15, bold: true, color: fill }], [t2, { fontSize: 10.5, color: p.muted }]]), { x: MX + 0.2, y, w: 1.7, h: laneH[i], valign: "middle" });
    });
    for (let y = yr0 + 1; y < yr1; y++) d.line(s, X(y), 2.02, X(y), 6.25, "D5D8E6", 0.75, "dash");
    const bar = (a, b, y, label, fill, fg = "FFFFFF") => {
      s.addText(runs(label), { x: X(a), y, w: X(b) - X(a), h: 0.46, shape: S.ROUNDED_RECTANGLE, rectRadius: 0.08, fill: { color: fill }, line: { type: "none" }, color: fg, fontSize: 10.5, bold: true, align: "center", valign: "middle", margin: [0, 4, 0, 4], isTextBox: true });
    };
    const milestone = (t, y, label, fill, w = 2.6, shape = S.DIAMOND, side = "right", h = 0.42) => {
      s.addShape(shape, { x: X(t) - 0.15, y: y + 0.04, w: 0.3, h: 0.3, fill: { color: fill }, line: { color: "FFFFFF", width: 1 } });
      const content = typeof label === "string" ? runs(label, { fontSize: 10.5, color: p.dk1 }) : label;
      const x = side === "right" ? X(t) + 0.2 : X(t) - 0.2 - w;
      d.text(s, content, { x, y: y + 0.19 - h / 2, w, h, valign: "middle", align: side === "right" ? "left" : "right" });
    };
    // ITU-R
    milestone(2023.88, 2.22, "M.2160 愿景框架（2023.11）", p.accent1, 2.5);
    bar(2024.0, 2027.0, 2.86, "技术性能需求与评估方法 Requirements", mix(p.accent1, "FFFFFF", 0.25));
    bar(2027.1, 2029.1, 2.86, "候选技术提交 Proposals", p.accent1);
    bar(2029.15, 2030.6, 2.86, "评估·规范 Specs", p.dk2);
    // WRC
    milestone(2023.9, 3.97, "WRC-23：设立议题1.7", p.accent2, 2.3);
    milestone(2027.85, 3.97, paras([["WRC-27：6G频谱决策", { fontSize: 10.5, bold: true, color: p.dk1 }], ["4.4–4.8 / 7.125–8.4 / 14.8–15.35 GHz", { fontSize: 10, color: p.muted }]]), p.accent2, 3.4, S.DIAMOND, "right", 0.62);
    // 3GPP
    bar(2025.45, 2027.2, 5.0, "Rel-20 6G研究 Study", mix(p.dk2, "FFFFFF", 0.3));
    bar(2027.2, 2029.25, 5.0, "Rel-21 首个6G标准 Specs", p.dk2);
    milestone(2028.95, 5.62, "Stage-3冻结 2028.12 · ASN.1冻结 2029.03", p.accent3, 3.6, S.DIAMOND, "left");
    milestone(2030.05, 5.0, "商用≈2030", p.accent3, 1.05, S.STAR_5_POINT);
    d.source(s, "来源 Source：ITU-R WP 5D IMT-2030时间表（提交窗口：WP 5D#54，2027.02 – WP 5D#59，2029.02）；3GPP TSG#112（2026.06）Rel-21时间表；WRC-23决议", 6.4);
    s.addNotes("ITU-R：2023年11月批准M.2160框架；2024–2026年制定技术性能需求与评估方法；候选技术提交窗口从WP 5D第54次会议（2027年2月）到第59次会议（2029年2月）；之后评估并形成IMT-2030规范（约2030年）。WRC-27议题1.7研究4.4–4.8 GHz、7.125–8.4 GHz、14.8–15.35 GHz。3GPP：Rel-20开展6G研究（2025年6月启动），Rel-21制定首个6G标准，Stage-3于2028年12月冻结、ASN.1于2029年3月冻结，2030年前后商用。");
  }

  // ================================================================ 1.2
  d.section("1.2 移动通信前沿技术简介 Frontier Technologies");
  d.sectionDivider(ch.sections[1], "技术全景 · 空天地一体化 · 新型收发机 · 太赫兹通信 · 课程思政：中国移动通信的逆袭之路\nLandscape · SAGIN · Novel transceivers · THz · China's journey in mobile communications");

  // ---- landscape
  {
    const s = d.titled("6G关键使能技术全景", "Landscape of 6G Enabling Technologies");
    const techs = [
      ["TbSatellite", "空天地一体化网络", "Space-air-ground integrated network", "卫星、高空平台、无人机与地面网络融合", "Global coverage by satellites, HAPS, UAVs and cells", "第2章 Ch.2"],
      ["TbAperture", "极化赋形", "Polarforming", "动态调控天线极化状态，挖掘极化维度", "Shapes antenna polarization on demand", "第3章 Ch.3"],
      ["TbAtom", "里德堡原子接收机", "Rydberg atomic receiver", "以原子为“天线”，量子精密测量射频场", "Atoms as quantum RF field sensors", "第3章 Ch.3"],
      ["TbWaveSine", "太赫兹通信", "Terahertz communications", "0.1–10 THz超大带宽，支撑百Gbit/s速率", "Huge bandwidth for 100+ Gbit/s links", "第4章 Ch.4"],
      ["TbRadar", "通信感知一体化", "Integrated sensing & communication", "同一套硬件与波形同时通信和感知", "One waveform for both data and sensing", "拓展 Extra"],
      ["TbBrain", "AI原生空口", "AI-native air interface", "AI/ML用于信道反馈、波束管理与定位", "AI/ML for CSI, beams and positioning", "拓展 Extra"],
      ["TbGridDots", "智能超表面", "Reconfigurable intelligent surface", "可编程电磁表面，重塑无线传播环境", "Programmable surfaces reshape propagation", "拓展 Extra"],
      ["TbAntennaBars5", "超大规模MIMO", "Extremely large MIMO", "天线数再提升，近场通信与无蜂窝架构", "Near-field and cell-free architectures", "拓展 Extra"],
    ];
    const cw = (CW - 3 * 0.22) / 4;
    const chh = 2.42;
    for (let i = 0; i < techs.length; i++) {
      const [ic, cn, en, dcn, den, tag] = techs[i];
      const x = MX + (i % 4) * (cw + 0.22);
      const y = 1.7 + Math.floor(i / 4) * (chh + 0.2);
      const core = i < 4;
      d.card(s, x, y, cw, chh, { name: cn });
      await d.iconDot(s, x + 0.2, y + 0.2, 0.6, ic, core ? p.accent1 : p.accent2, "FFFFFF", cn);
      d.pill(s, x + cw - 1.12, y + 0.3, 0.92, 0.3, tag, core ? p.accent1 : p.lt2, core ? "FFFFFF" : p.accent1, 9.5);
      d.text(s, paras([[cn, { fontSize: 14.5, bold: true, color: C.text2 }], [en, { fontSize: 9.5, color: C.accent1, paraSpaceAfter: 6 }], [dcn, { fontSize: 11, color: C.text1 }], [den, { fontSize: 9.5, color: p.muted }]]),
        { x: x + 0.2, y: y + 0.92, w: cw - 0.36, h: 1.45 });
    }
    s.addNotes("八项关键使能技术：前四项（空天地一体化、极化赋形、里德堡原子接收机、太赫兹）对应本课程第2–4章；ISAC、AI原生空口、RIS、超大规模MIMO作为拓展阅读。");
  }

  // ---- SAGIN
  {
    const s = d.titled("空天地一体化网络：从地面覆盖走向全域覆盖", "Space-Air-Ground Integrated Networks: From Terrestrial to Global Coverage");
    const layers = [
      ["TbSatellite", "天基 Space-based", "GEO / MEO / LEO卫星星座，覆盖海洋、荒漠与航空", "Satellite constellations for oceans, deserts and aviation", p.dk2, "FFFFFF", p.accent5],
      ["TbDrone", "空基 Air-based", "高空平台HAPS、无人机UAV，灵活部署、应急通信", "HAPS and UAVs for flexible, on-demand coverage", p.accent1, "FFFFFF", "E6E1FF"],
      ["TbBuildingBroadcastTower", "地基 Ground-based", "蜂窝基站与信关站，提供大容量接入与回传", "Cellular sites and gateways for capacity and backhaul", p.lt2, p.dk2, p.muted],
    ];
    const lx = MX;
    const lw = 7.1;
    for (let i = 0; i < layers.length; i++) {
      const [ic, t, dcn, den, fill, fg, fg2] = layers[i];
      const y = 1.72 + i * 1.6;
      d.card(s, lx, y, lw, 1.42, { fill, shadow: i === 2 ? false : undefined, name: t });
      await d.iconDot(s, lx + 0.3, y + 0.33, 0.76, ic, i === 2 ? p.accent1 : "FFFFFF", i === 2 ? "FFFFFF" : fill, t);
      d.text(s, paras([[t, { fontSize: 16, bold: true, color: fg }], [dcn, { fontSize: 12, color: fg, paraSpaceAfter: 1 }], [den, { fontSize: 10, color: fg2 }]]),
        { x: lx + 1.3, y: y + 0.14, w: lw - 1.5, h: 1.16, valign: "middle" });
    }
    d.text(s, runs("星间链路 · 星地链路 · 空地链路协同组网   Inter-satellite, satellite-ground and air-ground links work as one network", { fontSize: 11, italic: true, color: p.muted }), { x: lx, y: 6.52, w: lw, h: 0.32, valign: "middle" });

    const rx = 8.1;
    const rw = W - MX - rx;
    const stats = [
      ["≈1万颗", "Starlink在轨工作卫星（2026.10）", "~10,000 operational Starlink satellites"],
      ["≈480颗", "国网与千帆星座在轨卫星合计（2026.10）", "~480 Guowang + Qianfan satellites in orbit"],
      ["Rel-17", "3GPP首次将非地面网络（NTN）纳入5G标准", "NTN first standardized in 3GPP Rel-17"],
    ];
    stats.forEach(([v, cn, en], i) => {
      const y = 1.72 + i * 1.6;
      d.card(s, rx, y, rw, 1.42, { name: `数据 ${v}` });
      d.text(s, runs(v, { fontSize: 26, bold: true, color: C.accent1 }), { x: rx + 0.25, y: y + 0.12, w: rw - 0.45, h: 0.55, valign: "middle" });
      d.text(s, paras([[cn, { fontSize: 11.5, bold: true, color: C.text1 }], [en, { fontSize: 9.5, color: p.muted }]]), { x: rx + 0.25, y: y + 0.7, w: rw - 0.45, h: 0.66 });
    });
    d.text(s, runs("数据来源：Orbital Radar、KeepTrack公开跟踪数据（2026年10月）；3GPP TR 38.811/38.821", { fontSize: 9.5, color: p.muted }), { x: rx, y: 6.52, w: rw, h: 0.32, valign: "middle" });
    s.addNotes("空天地一体化：天基（GEO/MEO/LEO）、空基（HAPS/UAV）、地基（蜂窝网络）三层协同。公开跟踪数据显示，截至2026年10月Starlink在轨工作卫星约1万颗，我国国网与千帆星座在轨合计约480颗（不同统计口径略有差异）。3GPP在Rel-17首次引入NTN（TR 38.811、TR 38.821）。详见第2章。");
  }

  // ---- novel transceivers
  {
    const s = d.titled("新型收发机：极化赋形与里德堡原子接收机", "Novel Transceivers: Polarforming and Rydberg Atomic Receivers");
    const cw = (CW - 0.3) / 2;
    const y = 1.7;
    const h = 5.0;
    // left: polarforming
    const lx = MX;
    d.card(s, lx, y, cw, h, { name: "极化赋形" });
    await d.iconDot(s, lx + 0.25, y + 0.22, 0.62, "TbAperture", p.accent1, "FFFFFF", "极化赋形");
    d.text(s, paras([["极化赋形", { fontSize: 17, bold: true, color: C.text2 }], ["Polarforming", { fontSize: 11, color: C.accent1 }]]), { x: lx + 1.02, y: y + 0.2, w: cw - 1.2, h: 0.68, valign: "middle" });
    // polarization states drawn with shapes
    const states = [["线极化", "Linear", 0.06, 45], ["椭圆", "Elliptical", 0.45, 25], ["圆极化", "Circular", 1.0, 0], ["椭圆", "Elliptical", 0.45, -25], ["线极化", "Linear", 0.06, -45]];
    const sx0 = lx + 0.55;
    const sstep = (cw - 1.1) / 4;
    for (let i = 0; i < states.length; i++) {
      const [cn, en, ratio, rot] = states[i];
      const cx = sx0 + i * sstep;
      const cy = y + 1.55;
      const a = 0.62;
      const b = Math.max(a * ratio, 0.035);
      s.addShape(S.OVAL, { x: cx - a / 2, y: cy - b / 2, w: a, h: b, rotate: rot, fill: { color: p.lt2 }, line: { color: p.accent1, width: 2 } });
      d.text(s, paras([[cn, { fontSize: 10, bold: true, color: C.text1, align: "center" }], [en, { fontSize: 9, color: p.muted, align: "center" }]]), { x: cx - 0.55, y: y + 2.0, w: 1.1, h: 0.45, align: "center" });
    }
    const bo = (sp) => ({ fontSize: 12, color: C.text1, bullet: BUL(), paraSpaceAfter: sp });
    const eo = { fontSize: 10, color: p.muted };
    d.text(s, paras([
      bl("原理：将天线极化“塑形”为所需状态，实时实现极化匹配或失配", "Shape the antenna polarization to match or mismatch in real time", bo(8), eo),
      bl("优势：缓解去极化损耗、增强信号功率、抑制干扰", "Mitigates depolarization, boosts signal power, suppresses interference", bo(8), eo),
      bl("实现：极化可重构天线、双极化阵列", "Polarization-reconfigurable antennas and dual-polarized arrays", bo(0), eo),
    ]), { x: lx + 0.3, y: y + 2.58, w: cw - 0.55, h: 1.95 });
    d.text(s, runs("参考 Ref.: Polarforming for wireless communications, arXiv:2409.07771, 2024", { fontSize: 9.5, color: p.muted }), { x: lx + 0.3, y: y + 4.58, w: cw - 0.55, h: 0.26, valign: "middle" });

    // right: Rydberg receiver
    const rx = MX + cw + 0.3;
    d.card(s, rx, y, cw, h, { name: "里德堡原子接收机" });
    await d.iconDot(s, rx + 0.25, y + 0.22, 0.62, "TbAtom", p.accent2, "FFFFFF", "里德堡原子接收机");
    d.text(s, paras([["里德堡原子接收机", { fontSize: 17, bold: true, color: C.text2 }], ["Rydberg atomic receiver", { fontSize: 11, color: C.accent1 }]]), { x: rx + 1.02, y: y + 0.2, w: cw - 1.2, h: 0.68, valign: "middle" });
    // EIT ladder
    const lvX = rx + 0.4;
    const lvW = 0.9;
    const levels = [[y + 2.55, "g  基态 Ground"], [y + 2.0, "e  激发态 Excited"], [y + 1.42, "r  里德堡态 Rydberg"], [y + 1.1, "r′ 相邻里德堡态"]];
    levels.forEach(([ly, lab]) => {
      d.line(s, lvX, ly, lvX + lvW, ly, p.dk2, 2);
      d.text(s, runs(lab, { fontSize: 9.5, color: p.muted }), { x: lvX + lvW + 0.08, y: ly - 0.13, w: 1.3, h: 0.26, valign: "middle" });
    });
    d.arrow(s, lvX + 0.2, levels[0][0] - 0.03, lvX + 0.2, levels[1][0] + 0.04, "E0465E", 2.25);
    d.arrow(s, lvX + 0.45, levels[1][0] - 0.03, lvX + 0.45, levels[2][0] + 0.04, "3D6FE0", 2.25);
    d.arrow(s, lvX + 0.7, levels[2][0] - 0.02, lvX + 0.7, levels[3][0] + 0.03, p.accent2, 2.25);
    d.text(s, paras([
      ["探测光 Probe（Rb：780 nm）", { fontSize: 9.5, color: "C43A50" }],
      ["耦合光 Coupling（≈480 nm）", { fontSize: 9.5, color: "2F5BC4" }],
      ["射频场 RF field", { fontSize: 9.5, color: C.accent2 }],
    ]), { x: lvX, y: y + 2.66, w: 2.3, h: 0.62 });
    d.text(s, paras([
      bl("原理：射频电场使EIT谱线发生AT分裂，以光学方式读出", "RF fields split the EIT line (Autler–Townes), read out optically", bo(8), eo),
      bl("优势：宽频可调（MHz–THz）、SI可溯源、尺寸不受波长限制", "Broadband tunable, SI-traceable, size independent of wavelength", bo(0), eo),
    ]), { x: rx + 2.85, y: y + 1.05, w: cw - 3.05, h: 2.2 });
    d.card(s, rx + 0.3, y + 3.35, cw - 0.6, 1.4, { fill: p.lt2, shadow: false, name: "灵敏度" });
    d.text(s, [...runs("55 nV·cm", { fontSize: 22, bold: true, color: C.accent1 }), ...runs("−1", { fontSize: 22, bold: true, color: C.accent1, superscript: true }), ...runs("·Hz", { fontSize: 22, bold: true, color: C.accent1 }), ...runs("−1/2", { fontSize: 22, bold: true, color: C.accent1, superscript: true })],
      { x: rx + 0.5, y: y + 3.43, w: cw - 1.0, h: 0.6, valign: "middle" });
    d.text(s, paras([["原子超外差接收灵敏度（Jing et al., Nature Physics, 2020）", { fontSize: 11, color: C.text1 }], ["Sensitivity of the atomic superheterodyne receiver", { fontSize: 9.5, color: p.muted }]]),
      { x: rx + 0.5, y: y + 4.03, w: cw - 1.0, h: 0.62 });
    s.addNotes("极化赋形（Polarforming）：通过可重构天线把极化塑造成所需状态，实现极化匹配/失配，缓解去极化、抑制干扰（参考 arXiv:2409.07771）。里德堡原子接收机：铷原子经780 nm探测光与约480 nm耦合光激发到里德堡态，形成EIT；射频场引起AT分裂，由探测光透射谱读出电场；Jing等（Nature Physics 2020）实现55 nV·cm^-1·Hz^-1/2灵敏度。详见第3章。");
  }

  // ---- THz
  {
    const s = d.titled("太赫兹通信：打开0.1–10 THz频谱宝库", "Terahertz Communications: Unlocking the 0.1–10 THz Spectrum");
    const bands = [
      ["微波", "Microwave", "< 30 GHz", 2.55, mix(p.lt2, p.accent2, 0.25), p.dk2],
      ["毫米波", "Millimeter wave", "30 – 300 GHz", 2.85, mix(p.lt2, p.accent2, 0.55), p.dk2],
      ["太赫兹", "Terahertz", "0.1 – 10 THz", 3.75, p.accent1, "FFFFFF"],
      ["红外与可见光", "Infrared & optical", "> 10 THz", 2.55, mix(p.lt2, p.accent3, 0.35), p.dk2],
    ];
    const gap = (CW - bands.reduce((a, b) => a + b[3], 0)) / 3;
    let bx = MX;
    for (const [cn, en, range, w, fill, fg] of bands) {
      d.card(s, bx, 1.7, w, 1.12, { fill, shadow: fill === p.accent1 ? undefined : false, name: cn });
      d.text(s, paras([[`${cn}  ${range}`, { fontSize: 14, bold: true, color: fg, align: "center" }], [en, { fontSize: 10.5, color: fg, align: "center" }]]), { x: bx + 0.1, y: 1.78, w: w - 0.2, h: 0.96, align: "center", valign: "middle" });
      bx += w + gap;
    }
    d.arrow(s, MX + 0.2, 3.05, W - MX - 0.2, 3.05, mix(p.lt2, p.accent1, 0.6), 2);
    d.text(s, runs("频率升高 → 带宽更大、波长更短、天线更小   Higher frequency → wider bandwidth, shorter wavelength, smaller antennas", { fontSize: 11, color: p.muted, align: "center" }),
      { x: MX, y: 3.12, w: CW, h: 0.32, align: "center", valign: "middle" });
    const cw = (CW - 0.3) / 2;
    const cols = [
      ["TbTrendingUp", "优势 Advantages", p.accent1, [
        ["超大带宽", "数十GHz连续带宽，支撑100 Gbit/s以上速率", "Tens of GHz of bandwidth for 100+ Gbit/s"],
        ["窄波束", "高增益、强方向性，抗干扰、更安全", "High-gain pencil beams: low interference, secure"],
        ["通感成像", "厘米至毫米级分辨率的感知与成像", "Centimeter- to millimeter-level sensing and imaging"],
      ]],
      ["TbAlertTriangle", "挑战 Challenges", p.accent3, [
        ["传播损耗", "自由空间损耗随f²增长：300 GHz、10 m约102 dB，另有分子吸收", "FSPL grows as f²: ≈102 dB at 300 GHz over 10 m, plus absorption"],
        ["器件瓶颈", "发射功率低、噪声系数高、成本高", "Low output power, high noise figure, high cost"],
        ["波束对准", "窄波束易被遮挡，需快速波束跟踪", "Pencil beams are blockage-prone and need fast tracking"],
      ]],
    ];
    for (let i = 0; i < 2; i++) {
      const [ic, title, hex, items] = cols[i];
      const x = MX + i * (cw + 0.3);
      d.card(s, x, 3.6, cw, 3.05, { name: title });
      await d.iconDot(s, x + 0.25, 3.76, 0.55, ic, hex, "FFFFFF", title);
      d.text(s, runs(title, { fontSize: 15, bold: true, color: i ? C.accent3 : C.accent1 }), { x: x + 0.95, y: 3.74, w: cw - 1.2, h: 0.5, valign: "middle" });
      items.forEach(([k, cn, en], j) => {
        const yy = 4.38 + j * 0.74;
        d.text(s, runs(k, { fontSize: 12, bold: true, color: C.text2 }), { x: x + 0.3, y: yy, w: 1.05, h: 0.62 });
        d.text(s, paras([[cn, { fontSize: 11.5, color: C.text1 }], [en, { fontSize: 9.5, color: p.muted }]]), { x: x + 1.35, y: yy, w: cw - 1.6, h: 0.66 });
      });
    }
    d.text(s, runs("实验进展：2026年日本研究团队在560 GHz实现112 Gbit/s无线传输   Lab progress: 112 Gbit/s at 560 GHz (2026)", { fontSize: 10, color: p.muted }), { x: MX, y: 6.72, w: CW, h: 0.26, valign: "middle" });
    s.addNotes("太赫兹频段0.1–10 THz，介于毫米波与红外之间（“太赫兹空隙”）。优势：数十GHz带宽、窄波束、高分辨率感知；挑战：自由空间损耗 FSPL=20lg(4πdf/c)，300 GHz、10 m约102 dB，并有水汽等分子吸收，器件功率与噪声、波束对准与遮挡。2026年日本团队报道560 GHz、112 Gbit/s（16QAM）实验。详见第4章。");
  }

  // ---- ideology: China's journey
  {
    const s = d.titled("课程思政：中国移动通信的逆袭之路", "China's Mobile Communications: From Follower to Leader");
    const steps = [
      ["1G", "空白", "Blank", "1987", "引进TACS模拟系统，核心技术与设备依赖进口", "Imported analog TACS systems"],
      ["2G", "跟随", "Follow", "1993", "嘉兴开通首个GSM数字移动电话网", "First GSM network opened in Jiaxing"],
      ["3G", "突破", "Breakthrough", "2000", "TD-SCDMA成为ITU三大3G国际标准之一", "TD-SCDMA: one of three ITU 3G standards"],
      ["4G", "同步", "In step", "2012", "TD-LTE-Advanced成为4G国际标准之一", "TD-LTE-Advanced: an IMT-Advanced standard"],
      ["5G", "引领", "Lead", "2019", "发放5G商用牌照，建成全球最大5G网络", "Licensed in June 2019; world's largest 5G network"],
      ["6G", "前瞻", "Look ahead", "2019–", "成立IMT-2030(6G)推进组，完成第一阶段6G技术试验", "6G Promotion Group; phase-1 6G trials completed"],
    ];
    const cw = 1.9;
    const gap = (CW - 6 * cw) / 5;
    const base = 6.55;
    for (let i = 0; i < steps.length; i++) {
      const [g, cn, en, yr, fcn, fen] = steps[i];
      const x = MX + i * (cw + gap);
      const top = 5.42 - i * 0.5;
      const fill = i === 5 ? p.accent4 : mix(mix(p.lt2, p.accent1, 0.3), p.accent1, i / 4);
      const fg = i < 2 ? p.dk2 : "FFFFFF";
      s.addShape(S.RECTANGLE, { x, y: top, w: cw, h: base - top, fill: { color: fill }, line: { type: "none" }, objectName: `台阶 ${g}` });
      d.text(s, paras([[`${g} ${cn}`, { fontSize: 16, bold: true, color: fg, align: "center" }], [en, { fontSize: 10, color: fg, align: "center" }]]), { x, y: top + 0.1, w: cw, h: 0.7, align: "center" });
      d.text(s, paras([[yr, { fontSize: 12, bold: true, color: i === 5 ? "B7700F" : C.accent1 }], [fcn, { fontSize: 10.5, color: C.text1 }], [fen, { fontSize: 9, color: p.muted }]]),
        { x: x + 0.02, y: top - 1.18, w: cw - 0.04, h: 1.1, valign: "bottom" });
    }
    s.addNotes("“1G空白、2G跟随、3G突破、4G同步、5G引领”：1987年广东开通TACS模拟网；1993年浙江嘉兴开通首个GSM网；2000年5月TD-SCDMA被ITU批准为3G国际标准之一；2012年1月TD-LTE-Advanced成为IMT-Advanced（4G）国际标准之一，2013年发放4G牌照；2019年6月发放5G商用牌照；2019年6月成立IMT-2030(6G)推进组。引导学生体会自主创新与标准话语权的重要性。");
  }

  // ---- ideology: numbers
  {
    const s = d.titled("数说中国5G：从“跟跑”到“领跑”", "China's 5G in Numbers: From Follower to Front-Runner");
    const stats = [
      ["525.4", "万座", "5G基站", "5G base stations", "2026年9月末 · End of Sep 2026"],
      ["13.11", "亿户", "5G移动电话用户", "5G mobile subscribers", "2026年8月末，占比70.9%"],
      ["42", "%", "5G标准必要专利声明量占比", "Global share of declared 5G SEPs", "2025年 · 2025"],
      ["330+", "城市", "实现5G-A商用", "Cities with 5G-A service", "GSMA, 2026"],
    ];
    const cw = (CW - 3 * 0.25) / 4;
    for (let i = 0; i < stats.length; i++) {
      const [v, u, cn, en, note] = stats[i];
      const x = MX + i * (cw + 0.25);
      d.card(s, x, 1.72, cw, 2.3, { name: `数据 ${cn}` });
      d.text(s, [...runs(v, { fontSize: 40, bold: true, color: C.accent1 }), ...runs(` ${u}`, { fontSize: 16, bold: true, color: C.accent1 })], { x: x + 0.25, y: 1.9, w: cw - 0.4, h: 0.85, valign: "middle" });
      d.text(s, paras([[cn, { fontSize: 13, bold: true, color: C.text1 }], [en, { fontSize: 10.5, color: p.muted, paraSpaceAfter: 8 }], [note, { fontSize: 10, color: p.muted }]]), { x: x + 0.25, y: 2.85, w: cw - 0.4, h: 1.1 });
    }
    d.card(s, MX, 4.35, CW, 1.75, { fill: p.lt2, shadow: false, name: "启示" });
    await d.iconDot(s, MX + 0.3, 4.86, 0.72, "TbFlag", p.accent3, "FFFFFF", "启示");
    d.text(s, paras([["启示：关键核心技术是要不来、买不来、讨不来的。", { fontSize: 18, bold: true, color: C.text2 }], ["Insight: core technologies cannot be obtained by asking, buying or begging; they must be developed on our own.", { fontSize: 11.5, italic: true, color: p.muted }]]),
      { x: MX + 1.25, y: 4.62, w: CW - 1.5, h: 1.2, valign: "middle" });
    d.source(s, "来源 Source：工业和信息化部（2026年1—8月通信业经济运行情况；2025年通信业统计公报）；国新办新闻发布会（2026-10-20）；GSMA《2026中国移动经济发展》", 6.35);
    s.addNotes("截至2026年9月末，我国5G基站总数达525.4万座（国新办发布会，2026年10月20日）；截至8月末，5G移动电话用户13.11亿户，占移动电话用户70.9%；我国5G标准必要专利声明量全球占比42%（工信部，2026年1月发布）；5G-A已在330多个城市商用（GSMA）。讨论：从“跟跑”到“领跑”靠的是持续自主创新。");
  }

  // ================================================================ wrap-up
  d.section("总结 Wrap-up");
  {
    const s = d.titled("本章小结", "Chapter Summary");
    const pts = [
      ["演进规律", "Evolution pattern", "约十年一代：空口、频谱与业务协同演进；峰值速率指标3G→6G提升约十万倍", "A generation per decade; air interface, spectrum and services co-evolve"],
      ["5G与5G-A", "5G and 5G-Advanced", "三大场景、八大能力；Rel-18起的5G-A是通往6G的桥梁", "Three scenarios, eight capabilities; 5G-A (from Rel-18) bridges to 6G"],
      ["6G愿景与标准", "6G vision and standards", "六大场景、15项能力；Rel-21制定首个6G标准，2030年前后商用", "Six scenarios, 15 capabilities; first 6G specs in Rel-21, launch around 2030"],
      ["前沿技术", "Frontier technologies", "空天地一体化、新型收发机、太赫兹通信将在第2–4章深入学习", "SAGIN, novel transceivers and THz are covered in Chapters 2–4"],
    ];
    const cw = (CW - 0.3) / 2;
    const chh = 2.35;
    for (let i = 0; i < pts.length; i++) {
      const [cn, en, dcn, den] = pts[i];
      const x = MX + (i % 2) * (cw + 0.3);
      const y = 1.72 + Math.floor(i / 2) * (chh + 0.25);
      d.card(s, x, y, cw, chh, { name: `小结 ${cn}` });
      d.text(s, runs(String(i + 1).padStart(2, "0"), { fontSize: 36, bold: true, color: i % 2 ? C.accent2 : C.accent1 }), { x: x + 0.3, y: y + 0.25, w: 1.1, h: 0.8, valign: "middle" });
      d.text(s, paras([[cn, { fontSize: 17, bold: true, color: C.text2 }], [en, { fontSize: 11, color: C.accent1 }]]), { x: x + 1.45, y: y + 0.28, w: cw - 1.7, h: 0.75, valign: "middle" });
      d.text(s, paras([[dcn, { fontSize: 13, color: C.text1, paraSpaceAfter: 3 }], [den, { fontSize: 10.5, color: p.muted }]]), { x: x + 0.3, y: y + 1.18, w: cw - 0.6, h: 1.05 });
    }
    s.addNotes("小结四点：演进规律、5G与5G-A、6G愿景与标准、前沿技术与后续章节的衔接。");
  }

  {
    const s = d.titled("课后网络自学与思考题", "After-Class Online Self-Study and Questions");
    const lw = 6.15;
    d.card(s, MX, 1.72, lw, 4.95, { name: "自学资源" });
    await d.iconDot(s, MX + 0.25, 1.92, 0.6, "TbWorldWww", p.accent1, "FFFFFF", "自学资源");
    d.text(s, paras([["网络自学资源", { fontSize: 16, bold: true, color: C.text2 }], ["Online resources", { fontSize: 10.5, color: C.accent1 }]]), { x: MX + 1.0, y: 1.9, w: lw - 1.2, h: 0.65, valign: "middle" });
    const res = [
      ["ITU-R IMT-2030项目主页", "itu.int/en/ITU-R/study-groups/rsg5/rwp5d/imt-2030"],
      ["3GPP版本与时间表 Releases", "3gpp.org/specifications-technologies/releases"],
      ["3GPP Rel-21（6G）时间表", "3gpp.org/news-events/3gpp-news/rel21-timeline"],
      ["IMT-2030(6G)推进组白皮书", "《6G总体愿景与潜在关键技术》（2021）"],
      ["课程教材 Textbook", "《5G-Advanced NTN空天地一体化技术》，人民邮电出版社，2025"],
    ];
    d.text(s, paras(res.map(([t, u], k) => bl(t, u, { fontSize: 12.5, bold: true, color: C.text1, bullet: BUL(), paraSpaceAfter: k < res.length - 1 ? 11 : 0 }, { fontSize: 10.5, color: p.muted }))),
      { x: MX + 0.3, y: 2.75, w: lw - 0.55, h: 3.8 });
    const rx = MX + lw + 0.3;
    const rw = W - MX - rx;
    d.card(s, rx, 1.72, rw, 4.95, { fill: p.lt2, shadow: false, name: "思考题" });
    await d.iconDot(s, rx + 0.25, 1.92, 0.6, "TbQuestionMark", p.accent3, "FFFFFF", "思考题");
    d.text(s, paras([["思考题", { fontSize: 16, bold: true, color: C.text2 }], ["Questions for discussion", { fontSize: 10.5, color: C.accent1 }]]), { x: rx + 1.0, y: 1.9, w: rw - 1.2, h: 0.65, valign: "middle" });
    const qs = [
      ["6G新增的三个场景分别需要哪些新能力支撑？", "Which new capabilities do the three new 6G scenarios require?"],
      ["为什么说5G-Advanced是5G走向6G的“桥梁”？请举例。", "Why is 5G-Advanced called the bridge to 6G? Give examples."],
      ["结合我国移动通信发展历程，谈谈标准话语权对产业的意义。", "Using China's journey, discuss why standards leadership matters."],
    ];
    qs.forEach(([cn, en], i) => {
      const y = 2.75 + i * 1.28;
      d.text(s, runs(String(i + 1), { fontSize: 20, bold: true, color: C.accent3 }), { x: rx + 0.3, y, w: 0.45, h: 0.5, valign: "middle" });
      d.text(s, paras([[cn, { fontSize: 12.5, bold: true, color: C.text1 }], [en, { fontSize: 10.5, color: p.muted }]]), { x: rx + 0.8, y, w: rw - 1.05, h: 1.1 });
    });
    s.addNotes("课外环节（大纲）：网络自学。建议学生浏览ITU-R IMT-2030主页与3GPP版本页面，阅读IMT-2030(6G)推进组白皮书，完成三道思考题，下次课交流。");
  }

  {
    const s = d.titled("参考文献", "References");
    const refs = [
      "ITU-R M.2083-0. IMT Vision – Framework and overall objectives of the future development of IMT for 2020 and beyond, 2015.",
      "ITU-R M.2160-0. Framework and overall objectives of the future development of IMT for 2030 and beyond, 2023.",
      "3GPP. Release 21 timeline agreed at TSGs#112, Singapore, June 2026.",
      "ITU-R WP 5D. Timeline for submission, evaluation process and consensus building for IMT-2030 RITs/SRITs, 2025.",
      "X. You et al. Towards 6G wireless communication networks: Vision, enabling technologies, and new paradigm shifts. Sci. China Inf. Sci., 64(1): 110301, 2021.",
      "W. Saad, M. Bennis, M. Chen. A vision of 6G wireless systems: Applications, trends, technologies, and open research problems. IEEE Network, 34(3): 134–142, 2020.",
      "I. F. Akyildiz, A. Kak, S. Nie. 6G and beyond: The future of wireless communications systems. IEEE Access, 8: 133995–134030, 2020.",
      "M. Jing et al. Atomic superheterodyne receiver based on microwave-dressed Rydberg spectroscopy. Nature Physics, 16: 911–915, 2020.",
      "Polarforming for wireless communications: Modeling and performance analysis. arXiv:2409.07771, 2024.",
      "IMT-2030(6G)推进组. 6G总体愿景与潜在关键技术白皮书, 2021.",
      "工业和信息化部. 2026年1—8月通信业经济运行情况; 国务院新闻办公室新闻发布会, 2026-10-20.",
      "张建国等. 5G-Advanced NTN空天地一体化技术. 人民邮电出版社, 2025; 唐禹. 里德堡原子接收机的基础理论与实验. 科学出版社, 2025.",
    ];
    const half = Math.ceil(refs.length / 2);
    const cw = (CW - 0.4) / 2;
    [refs.slice(0, half), refs.slice(half)].forEach((col, c) => {
      d.text(s, paras(col.map((r, i) => [`[${c * half + i + 1}]  ${r}`, { fontSize: 12, color: C.text1, paraSpaceAfter: 11 }])), { x: MX + c * (cw + 0.4), y: 1.72, w: cw, h: 5.1 });
    });
    s.addNotes("参考文献含ITU-R建议书、3GPP时间表、代表性综述论文、里德堡与极化赋形论文、工信部统计数据及课程教材。");
  }

  d.closing(paras([["下一章预告：第2章 空天地一体化通信系统", { fontSize: 15, bold: true, color: "FFFFFF" }], ["Next: Chapter 2  Space-Air-Ground Integrated Communication Systems", { fontSize: 12.5, color: p.soft }]]));
}

// ----------------------------------------------------------------------------- chapters 2-5 templates
function buildTemplate(d) {
  const { ch, p } = d;
  d.section("封面与目录 Opening");
  d.cover();
  d.contents();
  for (const sec of ch.sections) {
    d.section(`${sec.no} ${sec.cn}`);
    d.blankSection(sec);
  }
  d.section("结束 Closing");
  const next = CHAPTERS.find((c) => c.n === ch.n + 1);
  d.closing(next
    ? paras([[`下一章预告：第${next.n}章 ${next.cn}`, { fontSize: 15, bold: true, color: "FFFFFF" }], [`Next: Chapter ${next.n}  ${next.en}`, { fontSize: 12.5, color: p.soft }]])
    : paras([["课程总结与答疑", { fontSize: 15, bold: true, color: "FFFFFF" }], ["Course wrap-up and Q&A", { fontSize: 12.5, color: p.soft }]]));
}

async function main() {
  const [bgDir, outDir] = process.argv.slice(2);
  if (!bgDir || !outDir) {
    console.error("usage: node build_decks.js BG_DIR OUT_DIR");
    process.exit(2);
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const ch of CHAPTERS) {
    const d = new Deck(ch, bgDir);
    if (ch.n === 1) await buildChapter1(d);
    else buildTemplate(d);
    const f = await d.write(outDir);
    console.log("wrote", f);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
