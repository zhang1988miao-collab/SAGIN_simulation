// LaTeX sources of every equation image in the deck.
// render_equations.js turns each entry into build/eq/<id>.png (MathJax, TeX fonts)
// and records its size in build/equations.json. `pt` is the nominal font size.
// The LaTeX source is also stored as the picture's alt text in the .pptx, so an
// equation can be re-typed with PowerPoint's equation editor or IguanaTex.

const HL = {
  II: "0B7F72",   // teal  (Part II)
  III: "5F37BE",  // violet (Part III)
  IV: "B85F12",   // orange (Part IV)
};
const hl = (part, tex) => `\\textcolor{#${HL[part]}}{${tex}}`;

module.exports = [
  // ---------------- Part I: Introduction ----------------
  { id: "int_pf", pt: 18,
    tex: String.raw`\mathbf{p}(\alpha,\delta)=\begin{bmatrix}\cos\alpha\\ \sin\alpha\, e^{j\delta}\end{bmatrix}` },
  { id: "int_at", pt: 18,
    tex: String.raw`|E_{\mathrm{RF}}|=\frac{2\pi\hbar}{\wp}\,\Delta f_{\mathrm{AT}}` },
  { id: "int_rsma", pt: 18,
    tex: String.raw`\mathbf{x}=\mathbf{w}_c\,s_c+\sum_{k=1}^{K}\mathbf{w}_k\,s_k` },
  { id: "int_marl", pt: 18,
    tex: String.raw`\max_{\{\pi_j\}}\ \mathbb{E}\Big[\sum_{t=0}^{\infty}\gamma^{t}\,r(s_t,\mathbf{a}_t)\Big],\quad a_{j,t}\sim\pi_j(\cdot\,|\,o_{j,t})` },

  // ---------------- Part II: Polarforming ----------------
  { id: "pf_jones", pt: 17,
    tex: String.raw`\mathbf{p}(\alpha,\delta)=\begin{bmatrix}\cos\alpha\\ \sin\alpha\, e^{j\delta}\end{bmatrix},\quad \alpha\in\big[0,\tfrac{\pi}{2}\big],\ \delta\in[-\pi,\pi)` },
  { id: "pf_channel", pt: 17,
    tex: String.raw`\mathbf{H}_{k,n}=\sqrt{\beta_k}\,\underbrace{\Big(\sqrt{\tfrac{\kappa}{1+\kappa}}\,\mathbf{I}_2+\sqrt{\tfrac{1}{1+\kappa}}\,\widetilde{\mathbf{G}}_{k}\Big)}_{\text{depolarization (XPD } \chi\text{)}}\,\underbrace{\mathbf{R}(\Omega_k)}_{\text{Faraday}}\,[\mathbf{a}(\theta_k)]_n` },
  { id: "pf_effective", pt: 17,
    tex: String.raw`\mathbf{h}_k^{H}=\big[\,\mathbf{p}_k^{H}\mathbf{H}_{k,1}\mathbf{p}_1,\ \dots,\ \mathbf{p}_k^{H}\mathbf{H}_{k,N}\mathbf{p}_N\big]` },
  { id: "pf_signal", pt: 17,
    tex: String.raw`y_k=\mathbf{h}_k^{H}\Big(\mathbf{w}_c\,s_c+\sum_{i=1}^{K}\mathbf{w}_i\,s_i\Big)+n_k` },
  { id: "pf_rates", pt: 17,
    tex: String.raw`\begin{aligned}
R_{c,k}&=\log_2\!\Big(1+\frac{|\mathbf{h}_k^{H}\mathbf{w}_c|^2}{\sum_{i=1}^{K}|\mathbf{h}_k^{H}\mathbf{w}_i|^2+\sigma^2}\Big)\\
R_{k}&=\log_2\!\Big(1+\frac{|\mathbf{h}_k^{H}\mathbf{w}_k|^2}{\sum_{i\neq k}|\mathbf{h}_k^{H}\mathbf{w}_i|^2+\sigma^2}\Big)
\end{aligned}` },
  { id: "pf_problem", pt: 18,
    tex: String.raw`\begin{aligned}
(\mathrm{P1})\ \ \max_{${hl("II", String.raw`\mathbf{W},\,\mathbf{c},\,\{\mathbf{p}_n\},\,\{\mathbf{p}_k\}`)}}\quad & \min_{k\in\mathcal{K}}\ \big(C_k+R_k\big)\\
\text{s.t.}\quad & \textstyle\sum_{k}C_k\le \min_{k} R_{c,k},\quad C_k\ge 0,\ \forall k,\\
& \|\mathbf{w}_c\|^2+\textstyle\sum_{k}\|\mathbf{w}_k\|^2\le P_{\max},\\
& \mathbf{p}_n,\ \mathbf{p}_k\in\mathcal{P}\triangleq\{\mathbf{p}(\alpha,\delta)\},\ \forall n,k.
\end{aligned}` },

  // ---------------- Part III: Atomic receiver ----------------
  { id: "aq_rabi", pt: 17,
    tex: String.raw`\Omega_{\mathrm{RF},m}=\frac{\wp}{\hbar}\,\big|\,E_{\mathrm{LO},m}+\underbrace{\mathbf{g}_m^{T}\mathbf{w}\,s}_{E_{s,m}}\big|` },
  { id: "aq_bpr", pt: 17,
    tex: String.raw`y_m=\big|\,b_m+\mathbf{g}_m^{T}\mathbf{w}\,s+\eta_m\big|+\nu_m` },
  { id: "aq_linear", pt: 17,
    tex: String.raw`|E_{\mathrm{LO},m}|\gg|E_{s,m}|\ \Rightarrow\ y_m\approx \kappa_m\,e^{-j\varphi_m}\,\mathbf{g}_m^{T}\mathbf{w}\,s+n_m` },
  { id: "aq_snr", pt: 17,
    tex: String.raw`\gamma=\sum_{m=1}^{M}\frac{\kappa_m^2(E_{\mathrm{LO},m})\,|\mathbf{g}_m^{T}\mathbf{w}|^2}{\sigma^2_{\mathrm{PSN}}+\sigma^2_{\mathrm{QPN}}+\sigma^2_{\mathrm{BBR}}+\sigma^2_{\mathrm{ext}}}` },
  { id: "aq_problem", pt: 18,
    tex: String.raw`\begin{aligned}
(\mathrm{P2})\ \ \max_{${hl("III", String.raw`\mathbf{w},\,\{E_{\mathrm{LO},m}\},\,f_{\mathrm{LO}}`)}}\quad & \log_2\big(1+\gamma\big)\\
\text{s.t.}\quad & \|\mathbf{w}\|^2\le P_{\max},\\
& |\mathbf{g}_m^{T}\mathbf{w}|\le\rho\,E_{\mathrm{LO},m}\le\rho\,E_{\max},\ \forall m,\\
& \big|f_{c}+f_{D}(t)-f_{\mathrm{LO}}\big|\le B_{\mathrm{IF}}.
\end{aligned}` },

  // ---------------- Part IV: Multi-agent DRL ----------------
  { id: "ma_channel", pt: 17,
    tex: String.raw`\mathbf{h}_{j,k}(t)=\sqrt{\beta_0\,d_{j,k}^{-\alpha}(t)}\,\Big(\sqrt{\tfrac{K_{\mathrm{R}}}{K_{\mathrm{R}}+1}}\,\mathbf{a}(\theta_{j,k})+\sqrt{\tfrac{1}{K_{\mathrm{R}}+1}}\,\tilde{\mathbf{h}}_{j,k}\Big)` },
  { id: "ma_dist", pt: 17,
    tex: String.raw`d_{j,k}(t)=\sqrt{\|\mathbf{q}_j(t)-\mathbf{u}_k\|^2+H^2}` },
  { id: "ma_rate", pt: 17,
    tex: String.raw`R_k(t)=C_k(t)+\log_2\!\Big(1+\frac{|\mathbf{h}_{j,k}^{H}(t)\,\mathbf{w}_{k}(t)|^2}{I_k^{\mathrm{intra}}(t)+I_k^{\mathrm{inter}}(t)+\sigma^2}\Big)` },
  { id: "ma_problem", pt: 17,
    tex: String.raw`\begin{aligned}
(\mathrm{P3})\ \ \max_{${hl("IV", String.raw`\mathbf{Q},\,\mathbf{W},\,\mathbf{c}`)}}\quad & \frac{1}{T}\sum_{t=1}^{T}\sum_{k=1}^{K}R_k(t)\\
\text{s.t.}\quad & \|\mathbf{q}_j(t+1)-\mathbf{q}_j(t)\|\le V_{\max}\Delta t,\quad \|\mathbf{q}_i(t)-\mathbf{q}_j(t)\|\ge d_{\min},\\
& \textstyle\sum_{k\in\mathcal{K}_j}R_k(t)\le C^{\mathrm{sat}}_{j}(t),\quad \mathrm{tr}\big(\mathbf{W}_j\mathbf{W}_j^{H}\big)\le P_{\max},\\
& R_k(t)\ge R_{\min},\quad \forall j,k,t.
\end{aligned}` },
  { id: "ma_reward", pt: 17,
    tex: String.raw`r(t)=\sum_{k=1}^{K}R_k(t)-\lambda_1\sum_{k=1}^{K}\big[R_{\min}-R_k(t)\big]^{+}-\lambda_2\,\Phi_{\mathrm{col}}(t)` },
  { id: "ma_ppo", pt: 17,
    tex: String.raw`\begin{aligned}
\mathcal{L}(\theta_j)&=\mathbb{E}_t\Big[\min\big(\rho_t\hat{A}_t,\ \mathrm{clip}(\rho_t,1-\epsilon,1+\epsilon)\,\hat{A}_t\big)\Big]\\
\rho_t&=\frac{\pi_{\theta_j}(a_{j,t}\,|\,o_{j,t})}{\pi_{\theta_j^{\mathrm{old}}}(a_{j,t}\,|\,o_{j,t})},\qquad \mathcal{L}(\phi)=\mathbb{E}_t\big[(V_{\phi}(s_t)-\hat{R}_t)^2\big]
\end{aligned}` },
];
