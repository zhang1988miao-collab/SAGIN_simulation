// Render every figure from figures.js: writes ../figures/svg/<name>.svg (editable source)
// and build/fig/<name>.png|jpg via headless Chromium (Playwright).
//   node render_figures.js            -> all figures
//   node render_figures.js sagin bg_title   -> only the named ones
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const FIGURES = require("./figures.js");

const SVG_DIR = path.join(__dirname, "..", "figures", "svg");
const OUT_DIR = path.join(__dirname, "build", "fig");

async function main() {
  fs.mkdirSync(SVG_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const browser = await chromium.launch();
  for (const fig of FIGURES) {
    if (only.length && !only.includes(fig.name)) continue;
    const svg = fig.svg();
    fs.writeFileSync(path.join(SVG_DIR, `${fig.name}.svg`), svg);
    const page = await browser.newPage({ viewport: { width: fig.w, height: fig.h }, deviceScaleFactor: fig.scale || 3 });
    await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const ext = fig.jpg ? "jpg" : "png";
    const file = path.join(OUT_DIR, `${fig.name}.${ext}`);
    await page.screenshot({
      path: file, clip: { x: 0, y: 0, width: fig.w, height: fig.h },
      ...(fig.jpg ? { type: "jpeg", quality: 90 } : { omitBackground: true }),
    });
    await page.close();
    console.log(`${fig.name.padEnd(18)} ${fig.w}x${fig.h} -> ${path.relative(__dirname, file)}`);
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
