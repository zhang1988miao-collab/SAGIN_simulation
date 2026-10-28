# Seminar slide template: Optimization Techniques for SAGINs

`SAGIN_Optimization_Seminar.pptx` is a 23-slide, 16:9 English seminar deck: a title slide,
an outline, four parts, a conclusion, references and a closing slide.

| Slides | Content |
|---|---|
| 1–2 | Title, outline |
| 3–8 | **Part I: Introduction.** Divider, then one slide each on SAGIN, polarforming, atomic (Rydberg) receivers, RSMA and MADRL. Each slide has its own figure |
| 9–12 | **Part II: Polarforming design in SAGIN.** Divider, system model, proposed design, simulation results |
| 13–16 | **Part III: Atomic-to-Space: quantum receiver for SAGINs.** Divider, system model, proposed design, simulation results |
| 17–20 | **Part IV: Multi-agent DRL for SAGIN.** Divider, system model, proposed design, simulation results |
| 21–23 | Conclusion and future directions, references, thank-you slide |

## Editing the template

- **Placeholders.** Replace the presenter name, affiliation, date and e-mail on slides 1 and 23.
- **Layouts.** Slide titles and lead sentences are layout placeholders. A new slide made from a
  layout already has the section kicker, the I–IV progress dots, the footer and the slide number.
  Use `CONTENT_II` for Part II, `CONTENT_III` for Part III, and so on.
- **Charts are native PowerPoint charts.** Right-click a chart and choose *Edit Data* to paste your
  own results. **The plotted numbers are illustrative.** They come from small toy models in
  `src/sim_data.py`, not from a paper, and every results slide is tagged "ILLUSTRATIVE DATA".
  The callout numbers under each chart (+60 %, 8×, …) are computed from the same toy data, so
  update them by hand after you replace the data.
- **Equations** are LaTeX-rendered images (MathJax). Each picture's alt text holds its LaTeX
  source, so you can re-typeset it with IguanaTex or PowerPoint's equation editor. All sources
  are also in `src/equations.js`.
- **Figures** are PNG renders of the SVG files in `figures/svg/`. Edit them in Inkscape, or insert
  the SVG into PowerPoint and use *Convert to Shape*.
- **Theme.** The theme name is *SAGIN Seminar*. Headings use Cambria and body text uses Calibri.
  Accent 1–4 are the section colors: blue for Part I, teal for Part II, violet for Part III and
  orange for Part IV.
- **Speaker notes** on every slide give talking points and template hints.

The technical content of Parts II–IV (models, problems P1–P3, algorithms) is a representative
starting point. Replace it with your own work.

## Rebuilding the deck

```bash
cd seminar/src
npm install                 # pptxgenjs, mathjax-full, sharp, react-icons
python3 sim_data.py         # illustrative chart data  -> build/chart_data.json (needs numpy)
node render_equations.js    # LaTeX                    -> build/eq/*.png
node render_figures.js      # figures                  -> ../figures/svg/*.svg, build/fig/*
node build_deck.js          # deck                     -> ../SAGIN_Optimization_Seminar.pptx
```

`render_figures.js` rasterizes the SVGs with headless Chromium through Playwright. If you don't
have Playwright yet, run `npm install playwright && npx playwright install chromium`.
