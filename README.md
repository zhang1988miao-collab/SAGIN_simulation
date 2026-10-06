# SASIN simulation: QoS-aware space–air–sea integrated networks

Python simulation code for

> Y. He, J. Xu, L. Zhou, J. Wang, J. Du, C. Jiang, "6G Space–Air–Sea Integrated
> Networks: QoS-Aware Design and Optimization," *IEEE Trans. Wireless Commun.*,
> vol. 25, pp. 21717–21734, 2026, doi: 10.1109/TWC.2026.3718289.

The code models one LEO satellite (N_S = 8 antennas), one decode-and-forward UAV relay
(N_R = 4) and M single-antenna maritime users. It implements the paper's uplink and downlink
optimization algorithms and regenerates every numerical result (Figs. 2–14).

## Quick start

```bash
pip install -r requirements.txt
python -m pytest -q tests                                          # sanity checks
python -m sasin.experiments --figs all --trials 200 --workers 4    # all figures (about 5 min on 4 cores)
python -m sasin.experiments --figs 2 7 --trials 500                # selected figures
python -m sasin.experiments --figs all --quick                     # smoke test (about 30 s)
```

Every figure writes `results/figN.png` plus its raw numbers: `figN.csv` for curves,
`.npz`/`.json` for heatmaps and trajectories.

Using the library directly:

```python
import numpy as np
from sasin import Scenario, SystemParams, uplink as ul, downlink as dl

p = SystemParams(M=8, R_bar=1.0, K_rm_dB=10.0)
sc = Scenario(p, rng=0)                       # one random drop
L = np.array([0.0, 0.0])                      # UAV horizontal position [m]

order, eta = ul.grasp_schedule(sc.S_uplink(L), sc.rates, rng=0)  # Algorithm 1
res_ul = ul.ao_uplink(sc, n_init=10, n_screen=1000, rng=0)       # Algorithm 2
res_dl = dl.ao_downlink(sc, L0=L)                                # Algorithm 4
print(eta, res_ul.eta, res_ul.L, res_dl.eta, res_dl.total_power)
```

## Code map

| Paper | Code |
|---|---|
| Space-to-air channel, Eqs. (1)–(3) (path loss, Rician fading, Doppler) | `sasin/channel.py`: `Scenario.H_rs`, `satellite_pathloss_db`, `satellite_distance` |
| Air-to-sea channel, Eqs. (4)–(6) | `Scenario.h`, `Scenario.pathloss_db`, `rician_vector` |
| Optimal relay/satellite beamformer (SVD + water-filling), Lemma 1, (25), (53) | `capacity_waterfilling`, `Scenario.uplink_sat_capacity`, `Scenario.downlink_sat_capacity` |
| Uplink SINR with SIC (11), service efficiency (13) | `sasin/uplink.py`: `sinr_in_order`, `service_efficiency` |
| Algorithm 1, GRASP scheduling (P1.1) | `grasp_schedule` |
| Greedy, TDMA and opportunistic baselines (Fig. 2) | `greedy_schedule`, `tdma_efficiency`, `opportunistic_efficiency` |
| Exhaustive search (uplink) | `exhaustive_schedule`: exact, by dynamic programming over subsets and decoding orders |
| SCA placement P1.3: surrogate (27)–(28), bounds (29)–(30) (Lemma 2), constraint (39) | `sca_placement_uplink` |
| Algorithm 2, uplink AO | `ao_uplink` |
| Downlink SINRs (41)–(42), efficiency (43) | `sasin/downlink.py`: `downlink_sinr`, `service_efficiency_downlink` |
| Lemma 3, minimum-power beamforming (56)–(60) | `min_power_beamforming` |
| Algorithm 3, greedy scheduling (P2.2) | `greedy_downlink` |
| Exhaustive search (downlink) | `exhaustive_downlink` |
| Lemma 4 / P2.4, UAV placement | `placement_downlink` |
| Algorithm 4, downlink AO | `ao_downlink` |
| Figs. 2–14 | `sasin/experiments.py` |

## Parameters

Values from Section V of the paper are the defaults in `sasin/config.py`:

| Parameter | Value |
|---|---|
| Air-to-sea path loss | 116.7 + 19 log10(d/2600) + 9 dB |
| Rician factor K_{r,m} | 10 dB (Figs. 2, 4–7, 11, 12); 11.1 / 35.6 dB (Figs. 3, 8); 31.3 dB (Figs. 13–14) |
| UAV altitude H | 2000 m |
| N_R, N_S | 4, 8 |
| Noise σ_v² = σ_r² = σ_s² | −110 dBm |
| Mean S_uk | 10 dB |
| ω (RCL fraction), Ξ (GRASP iterations) | 0.25, 10 |
| UAV power P4 (downlink) | 40 dBm |
| LEO altitude, relative speed | 600 km, 7.6 km/s |
| UAV area | [−50, 50] km × [−50, 50] km |

The paper does not give some values. I chose these (all can be changed in `SystemParams`):

| Assumption | Value / rule |
|---|---|
| User power P1 | Calibrated per drop so that the mean of S_uk in dB is 10 dB with the UAV at the area centre. The UAV-placement experiments keep P1 fixed while the UAV moves. |
| Individual target rates | R_m ~ U[0.5 R̄, 1.5 R̄] ("average target rate" R̄) |
| Satellite link | f_c = 2 GHz, free-space path loss (n_s = 2), K_{r,s} = 10 dB, P2 = P3 = 30 dBm, total antenna gain 20 dB per direction. Chosen so the satellite hop becomes the bottleneck at roughly 1000–1500 km, as in Figs. 6 and 12. |
| Satellite link in Figs. 2, 3, 7, 8 | Ideal ("sufficiently strong"), i.e. (25)/(53) are inactive |
| Shadowing X_r, X_s | Off (σ = 0); can be switched on |
| LoS components | ULA steering vectors with unit-modulus entries (so E[\|g_i\|²] = 1 per antenna) |
| User positions | Uniform in the UAV area. Figs. 13–14 use the five positions given in the paper. |

## Implementation notes

* **Decoding order and GRASP.** Users are added in *reverse* decoding order (the first pick is
  decoded last at the relay). Adding a user therefore never changes the SINRs of the users
  already chosen, and Algorithm 1 reverses the list at the end. The local-search phase swaps a
  scheduled user with an unscheduled one and accepts the swap if η improves.
* **Exact uplink exhaustive search.** If u is decoded first within a set A, its SINR depends
  only on A, not on how the rest of A is ordered. So the optimum over all subsets *and* all
  decoding orders follows from the recursion f(A) = max_u f(A∖u) + R_u / log2(1+γ_u), which
  costs O(2^M·M). Unit tests check it against brute-force enumeration of permutations.
* **Satellite hop.** As in Lemma 1 and (53), the satellite hop enters as the sum-rate
  constraint Σ R ≤ log2 det(I + ·), using the SVD/water-filling beamformer.
* **Gradient (28).** The code uses the exact gradient of E = R / log2(1+γ). This gives a
  *minus* sign in front of the interference sum, whereas Eq. (28) as printed has a plus sign.
* **SCA step.** Each AO iteration solves one convex problem P1.3 with SLSQP (positions in km).
  It includes the concave lower bound (29), the convex upper bound (30) inside the trust region
  ‖L − L̂‖ ≤ δ = 5 km, and the region limits. A step is accepted only if the true constraints
  (15) still hold. α is set so that the unconstrained step length equals δ.
* **Restarts of Algorithm 2.** For a fixed user set, the surrogate objective drives each SINR
  down towards its target, which makes the SCA step a *local* refinement. A UAV started in a
  corner, e.g. (−50, −50) km in Fig. 14, stays there. The paper therefore runs several initial
  positions ("multiple random initial positions"). Here the Ξ = 10 starts are the best of 1000
  random candidates under one greedy scheduling pass (`n_screen`; set `n_screen=0` for purely
  random starts). On 12 test drops this reached or beat the best point of a 41 × 41 grid
  search in 11 cases. Fig. 14 shows both the run from (−50, −50) and the run from the best
  start.
* **Lemma 3.** The fixed-point iteration (60) starts from μ = 0 and increases monotonically.
  By strong duality the optimal total power equals Σμ, so it stops early once Σμ > P4. It also
  checks the necessary condition Σ γ/(1+γ) < N_R before iterating.
* **Algorithm 4.** If the greedy re-scheduling at the new position returns fewer users than the
  previous (still feasible) set, the previous set is kept, so η never decreases.
* **Baselines.** TDMA gives one interference-free user per slot, averaged over the M slots of a
  frame. Opportunistic scheduling serves only the user with the largest S_m. Both follow the
  paper's description, but the paper does not define them precisely.

## Results

All figures below were produced by
`python -m sasin.experiments --figs all --trials 200 --workers 4`, which took about 5 minutes
on 4 cores. They are in `results/`. "Paper" values are read off the published plots and
are approximate.

| Fig. | What it shows | Paper | This code |
|---|---|---|---|
| 2 | Uplink η vs R̄ (M = 10) | exhaustive ≈0.53 → 0.12; GRASP ≈ exhaustive > greedy ≫ TDMA, opportunistic | exhaustive 0.55 → 0.15; GRASP within 6 % at R̄ = 0.5 and within 1 % for R̄ ≥ 1.25; greedy 7–13 % lower; TDMA, opportunistic ≤ 0.05 |
| 3 | Uplink η vs M | R̄ = 1 rises then falls (peak ≈0.43); R̄ = 2 falls from ≈0.58; larger K is slightly worse | R̄ = 1 peaks at M = 3–4 (0.48); R̄ = 2 falls 0.60 → 0.22; larger K is slightly worse |
| 4 | Uplink map vs Algorithm 2 | Algorithm 2 lands on the best region | Algorithm 2 equals the map maximum in (a), (b) and beats the 41×41 grid in (c) (0.677 vs 0.664) |
| 5 | Uplink η vs contact angle | almost flat | flat up to ≈π/32, then falls (see note 1) |
| 6 | Uplink η vs LEO altitude | flat to ≈1300 km, then 0.265 → 0.215 | flat to ≈1300 km, then 0.46 → 0.42 |
| 7 | Downlink η vs R̄ | M = 5: 1.0 → 0.57; M = 10: 0.93 → 0.39; greedy ≈ exhaustive | M = 5: 0.97 → 0.30; M = 10: 0.74 → 0.21; greedy within 0–12 % |
| 8 | Downlink η vs P4 | rises 0.12 → 0.78; fewer users is better; larger K is better | rises 0.16 → 0.67; fewer users is better; K has almost no effect (note 2) |
| 9, 10 | Downlink power / η maps vs Algorithm 4 | Algorithm 4 hits the max-η region at its minimum power | max η in all panels; power equals the grid minimum in (a), (b) (6.70 vs 6.71 W); in (c) greedy picks a costlier 5-user set (9.63 vs 4.86 W) |
| 11 | Downlink η vs contact angle | flat | falls at large angles (note 1) |
| 12 | Downlink η vs LEO altitude | R̄ = 2: 0.435 → 0.345; R̄ = 3: 0.30 → 0.205 | R̄ = 2: 0.43 → 0.335; R̄ = 3: 0.29 → 0.21 |
| 13, 14 | AO convergence and UAV path | uplink ≈10 iterations, downlink ≈3 | uplink 1–2 iterations from the best screened start; downlink 2 iterations (note 3) |

Notes on the differences:

1. **Contact angle (Figs. 5, 11) vs altitude (Figs. 6, 12).** With free-space path loss, the
   UAV–satellite distance grows from 600 km to 2669 km as the contact angle goes from 0 to
   π/8, which is *longer* than the 2000 km at which the paper's altitude figures already
   degrade. One link budget therefore cannot make Figs. 5/11 flat and Figs. 6/12 decline. The
   satellite link budget is not given in the paper, so this code fits the altitude figures.
   Raise `G_ul_dB` / `G_dl_dB` to flatten the contact-angle curves; that moves the knee in
   Figs. 6/12 to higher altitudes.
2. **Rician factor.** Each user's LoS component is a steering vector at a random angle. A
   larger K makes the channels more deterministic but not more separable, so its effect is
   small. The paper's exact LoS model is not given.
3. **Convergence (Figs. 13–14).** Starting exactly at (−50, −50) km, the uplink SCA step stays
   in the corner (see "Restarts of Algorithm 2"). The Fig. 13 uplink curves therefore follow
   the best of the screened starts, which converges in one or two iterations. Fig. 14 also
   plots the stuck run from (−50, −50). The downlink path from (50, −50) km behaves as in
   the paper and settles in two iterations.
4. **Absolute values.** Absolute numbers depend on parameters the paper does not state
   (target-rate spread, P1 calibration, user layout), so expect qualitative rather than exact
   agreement.
