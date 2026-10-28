// Render every entry of equations.js with MathJax (TeX input, SVG output),
// then rasterize to transparent PNG with sharp.
// Output: build/eq/<id>.svg, build/eq/<id>.png and build/equations.json (size in inches).
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { mathjax } = require("mathjax-full/js/mathjax.js");
const { TeX } = require("mathjax-full/js/input/tex.js");
const { SVG } = require("mathjax-full/js/output/svg.js");
const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js");
const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js");
const EQUATIONS = require("./equations.js");

const INK = "#1B2638";
const DPI = 600;
const OUT = path.join(__dirname, "build", "eq");

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const doc = mathjax.document("", {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: "none" }),
});

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {};
  for (const eq of EQUATIONS) {
    const node = doc.convert(eq.tex, { display: true, em: 16, ex: 8, containerWidth: 2000 });
    let svg = adaptor.innerHTML(node);
    if (svg.includes('data-mml-node="merror"')) throw new Error(`TeX error in ${eq.id}`);
    const root = /^<svg[^>]*>/.exec(svg)[0];
    const vb = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(root);
    // MathJax viewBox units are 1/1000 em
    const wPt = (parseFloat(vb[3]) / 1000) * eq.pt;
    const hPt = (parseFloat(vb[4]) / 1000) * eq.pt;
    const newRoot = root
      .replace(/ style="[^"]*"/, "")
      .replace(/width="[^"]*"/, `width="${wPt.toFixed(2)}"`)
      .replace(/height="[^"]*"/, `height="${hPt.toFixed(2)}"`);
    svg = svg.replace(root, newRoot).replace(/currentColor/g, INK);
    fs.writeFileSync(path.join(OUT, `${eq.id}.svg`), svg);
    const file = path.join(OUT, `${eq.id}.png`);
    await sharp(Buffer.from(svg), { density: DPI }).png().toFile(file);
    manifest[eq.id] = { file, w: +(wPt / 72).toFixed(4), h: +(hPt / 72).toFixed(4), tex: eq.tex };
    console.log(`${eq.id.padEnd(14)} ${(wPt / 72).toFixed(2)} x ${(hPt / 72).toFixed(2)} in`);
  }
  fs.writeFileSync(path.join(__dirname, "build", "equations.json"), JSON.stringify(manifest, null, 1));
}

main().catch((e) => { console.error(e); process.exit(1); });
