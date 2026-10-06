"""Monte-Carlo experiments reproducing Figs. 2-14 of the paper.

Usage:
    python -m sasin.experiments --figs all --trials 200 --workers 4
    python -m sasin.experiments --figs 2 7 --quick
Each figure writes results/figN.png plus the raw numbers (results/figN.csv or .npz).
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import time
from concurrent.futures import ProcessPoolExecutor
from functools import partial

import numpy as np

from . import downlink as dl
from . import plotting as pl
from . import uplink as ul
from .channel import Scenario
from .config import SystemParams, w2dbm

OUT = "results"
UL_SCHEMES = ["Exhaustive search", "GRASP user scheduling", "Greedy user scheduling",
              "Time division", "Opportunistic user scheduling"]
FIG13_USERS_KM = np.array([(-21, 36), (2, -43), (-5, 1), (40, -15), (-30, 49)], float)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------
def _pmap(fn, items, workers):
    items = list(items)
    if workers <= 1 or len(items) == 1:
        return [fn(i) for i in items]
    with ProcessPoolExecutor(workers) as ex:
        return list(ex.map(fn, items, chunksize=max(1, len(items) // (8 * workers))))


def _mc(fn, trials, workers, seed0):
    """Average fn(seed) over Monte-Carlo trials (common random numbers across x)."""
    res = np.array(_pmap(fn, range(seed0, seed0 + trials), workers))
    return res.mean(axis=0)


def _write_csv(path, x_name, x, series):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow([x_name] + list(series))
        for i, xv in enumerate(x):
            w.writerow([f"{xv:.6g}"] + [f"{series[k][i]:.6g}" for k in series])


def _line_out(name, x, x_name, series, **plot_kw):
    _write_csv(os.path.join(OUT, f"{name}.csv"), x_name, x, series)
    fig, _ = pl.line_figure(x, series, **plot_kw)
    pl.save(fig, os.path.join(OUT, f"{name}.png"))


def _ul_eval(sc, schemes, L=None, seed=0):
    p = sc.p
    L = p.area_center if L is None else L
    S, R, C = sc.S_uplink(L), sc.rates, sc.uplink_sat_capacity()
    fns = {
        "Exhaustive search": lambda: ul.exhaustive_schedule(S, R, C)[1],
        "GRASP user scheduling": lambda: ul.grasp_schedule(S, R, C, omega=0.25, n_iter=10,
                                                           rng=seed)[1],
        "Greedy user scheduling": lambda: ul.greedy_schedule(S, R, C)[1],
        "Time division": lambda: ul.tdma_efficiency(S, R, C),
        "Opportunistic user scheduling": lambda: ul.opportunistic_efficiency(S, R, C),
    }
    return [fns[s]() for s in schemes]


def _dl_eval(sc, schemes, L=None):
    L = sc.p.area_center if L is None else L
    C = sc.downlink_sat_capacity()
    fns = {"Exhaustive search": lambda: dl.exhaustive_downlink(sc, L, C).eta,
           "Greedy user scheduling": lambda: dl.greedy_downlink(sc, L, C).eta}
    return [fns[s]() for s in schemes]


# ---------------------------------------------------------------------------
# Uplink: Figs. 2, 3, 5, 6
# ---------------------------------------------------------------------------
def _fig2_trial(seed, R_grid, p):
    return [_ul_eval(Scenario(p.with_(R_bar=Rb), rng=seed), UL_SCHEMES, seed=seed)
            for Rb in R_grid]


def fig2(trials, workers, **_):
    """Uplink efficiency vs average target rate, different scheduling methods."""
    p = SystemParams(M=10, K_rm_dB=10.0)
    R_grid = np.arange(0.5, 3.0001, 0.25)
    m = _mc(partial(_fig2_trial, R_grid=R_grid, p=p), trials, workers, 1000)
    series = {s: m[:, i] for i, s in enumerate(UL_SCHEMES)}
    _line_out("fig2", R_grid, "R_bar", series, xlabel="Average target rate (bps/Hz)",
              ylabel="Service efficiency", styles=pl.SCHEME_STYLE,
              title="Fig. 2 - uplink, M = 10, K = 10 dB")


def _fig3_trial(seed, M_grid, cases):
    out = []
    for K, Rb in cases:
        row = []
        for M in M_grid:
            sc = Scenario(SystemParams(M=M, K_rm_dB=K, R_bar=Rb), rng=seed)
            row.append(_ul_eval(sc, ["GRASP user scheduling"], seed=seed)[0])
        out.append(row)
    return out


def fig3(trials, workers, **_):
    """Uplink efficiency vs number of users for different Rician factors / rates."""
    M_grid = np.arange(1, 11)
    cases = [(11.1, 1.0), (35.6, 1.0), (11.1, 2.0), (35.6, 2.0)]
    m = _mc(partial(_fig3_trial, M_grid=M_grid, cases=cases), trials, workers, 2000)
    series, styles = {}, {}
    for i, (K, Rb) in enumerate(cases):
        lab = f"K = {K} dB, R = {Rb:g} bps/Hz"
        series[lab] = m[i]
        styles[lab] = dict(color=pl.SERIES[i % 2], marker="os"[i % 2],
                           ls="-" if Rb == 1 else ":")
    _line_out("fig3", M_grid, "M", series, xlabel="Total number of users",
              ylabel="Service efficiency", styles=styles,
              title="Fig. 3 - uplink (GRASP)")


def _fig5_trial(seed, angles, rates, p):
    out = []
    for Rb in rates:
        out.append([_ul_eval(Scenario(p.with_(R_bar=Rb, contact_angle=a), rng=seed),
                             UL_SCHEMES[:2], seed=seed) for a in angles])
    return out          # (rates, angles, 2)


def fig5(trials, workers, **_):
    """Uplink efficiency vs contact angle between LEO satellite and UAV."""
    p = SystemParams(M=8, K_rm_dB=10.0, sat_link_ideal=False, h_sat=600e3)
    angles = np.linspace(0, np.pi / 8, 9)
    rates = [1.0, 2.0]
    m = _mc(partial(_fig5_trial, angles=angles, rates=rates, p=p), trials, workers, 3000)
    series, styles = {}, {}
    for i, Rb in enumerate(rates):
        for j, s in enumerate(UL_SCHEMES[:2]):
            lab = f"{s.split()[0]}, R = {Rb:g} bps/Hz"
            series[lab] = m[i, :, j]
            styles[lab] = dict(pl.SCHEME_STYLE[s], color=pl.SERIES[2 * i + j])
    _line_out("fig5", angles, "contact_angle_rad", series, xlabel="Contact angle (rad)",
              ylabel="Service efficiency", styles=styles,
              xticks=[0, np.pi / 16, np.pi / 8], xticklabels=["0", "π/16", "π/8"],
              title="Fig. 5 - uplink, M = 8, LEO at 600 km")


def _fig6_trial(seed, alts, schemes, p):
    return [_ul_eval(Scenario(p.with_(h_sat=h), rng=seed), schemes, seed=seed) for h in alts]


def fig6(trials, workers, **_):
    """Uplink efficiency vs LEO altitude."""
    p = SystemParams(M=5, K_rm_dB=10.0, sat_link_ideal=False, R_bar=1.0, v_sat=7.6e3)
    alts = np.arange(500e3, 2000e3 + 1, 100e3)
    schemes = [UL_SCHEMES[i] for i in (0, 1, 2, 4)]
    m = _mc(partial(_fig6_trial, alts=alts, schemes=schemes, p=p), trials, workers, 4000)
    series = {s: m[:, i] for i, s in enumerate(schemes)}
    _line_out("fig6", alts / 1e3, "altitude_km", series, xlabel="Altitude of LEO satellite (km)",
              ylabel="Service efficiency", styles=pl.SCHEME_STYLE,
              title="Fig. 6 - uplink, M = 5, R = 1 bps/Hz")


# ---------------------------------------------------------------------------
# Downlink: Figs. 7, 8, 11, 12
# ---------------------------------------------------------------------------
DL_SCHEMES = ["Exhaustive search", "Greedy user scheduling"]


def _fig7_trial(seed, R_grid, Ms):
    return [[_dl_eval(Scenario(SystemParams(M=M, K_rm_dB=10.0, R_bar=Rb, P4_dBm=40.0),
                               rng=seed), DL_SCHEMES) for Rb in R_grid] for M in Ms]


def fig7(trials, workers, **_):
    """Downlink efficiency vs average target rate."""
    R_grid = np.arange(0.5, 3.0001, 0.125)
    Ms = [10, 5]
    m = _mc(partial(_fig7_trial, R_grid=R_grid, Ms=Ms), trials, workers, 5000)
    series, styles = {}, {}
    for i, M in enumerate(Ms):
        for j, s in enumerate(DL_SCHEMES):
            lab = f"M = {M}, {s}"
            series[lab] = m[i, :, j]
            styles[lab] = dict(pl.SCHEME_STYLE[s], color=pl.SERIES[2 * i + j])
    _line_out("fig7", R_grid, "R_bar", series, xlabel="Average target rate (bps/Hz)",
              ylabel="Service efficiency", styles=styles,
              title="Fig. 7 - downlink, K = 10 dB, P4 = 40 dBm")


def _fig8_trial(seed, P_grid, cases):
    return [[_dl_eval(Scenario(SystemParams(M=M, K_rm_dB=K, R_bar=1.0, P4_dBm=P4), rng=seed),
                      ["Greedy user scheduling"])[0] for P4 in P_grid] for M, K in cases]


def fig8(trials, workers, **_):
    """Downlink efficiency vs maximum UAV transmit power."""
    P_grid = np.arange(30, 45.01, 1.5)
    cases = [(10, 11.1), (10, 35.6), (8, 11.1), (8, 35.6)]
    m = _mc(partial(_fig8_trial, P_grid=P_grid, cases=cases), trials, workers, 6000)
    series, styles = {}, {}
    for i, (M, K) in enumerate(cases):
        lab = f"M = {M}, K = {K} dB"
        series[lab] = m[i]
        styles[lab] = dict(color=pl.SERIES[i], marker="os"[i // 2], ls=":" if K < 20 else "-")
    _line_out("fig8", P_grid, "P4_dBm", series, xlabel="Maximum transmit power of relay (dBm)",
              ylabel="Service efficiency", styles=styles,
              title="Fig. 8 - downlink (greedy), R = 1 bps/Hz")


def _fig11_trial(seed, angles, rates, p):
    return [[_dl_eval(Scenario(p.with_(R_bar=Rb, contact_angle=a), rng=seed), DL_SCHEMES)
             for a in angles] for Rb in rates]


def fig11(trials, workers, **_):
    """Downlink efficiency vs contact angle."""
    p = SystemParams(M=8, K_rm_dB=10.0, sat_link_ideal=False, h_sat=600e3)
    angles = np.linspace(0, np.pi / 8, 9)
    rates = [1.0, 2.0]
    m = _mc(partial(_fig11_trial, angles=angles, rates=rates, p=p), trials, workers, 7000)
    series, styles = {}, {}
    for i, Rb in enumerate(rates):
        for j, s in enumerate(DL_SCHEMES):
            lab = f"{s.split()[0]}, R = {Rb:g} bps/Hz"
            series[lab] = m[i, :, j]
            styles[lab] = dict(pl.SCHEME_STYLE[s], color=pl.SERIES[2 * i + j])
    _line_out("fig11", angles, "contact_angle_rad", series, xlabel="Contact angle (rad)",
              ylabel="Service efficiency", styles=styles,
              xticks=[0, np.pi / 16, np.pi / 8], xticklabels=["0", "π/16", "π/8"],
              title="Fig. 11 - downlink, M = 8, LEO at 600 km")


def _fig12_trial(seed, alts, rates, p):
    return [[_dl_eval(Scenario(p.with_(R_bar=Rb, h_sat=h), rng=seed), DL_SCHEMES)
             for h in alts] for Rb in rates]


def fig12(trials, workers, **_):
    """Downlink efficiency vs LEO altitude."""
    p = SystemParams(M=5, K_rm_dB=10.0, sat_link_ideal=False, v_sat=7.6e3)
    alts = np.arange(500e3, 2000e3 + 1, 100e3)
    rates = [3.0, 2.0]
    m = _mc(partial(_fig12_trial, alts=alts, rates=rates, p=p), trials, workers, 8000)
    series, styles = {}, {}
    for i, Rb in enumerate(rates):
        for j, s in enumerate(DL_SCHEMES):
            lab = f"{s.split()[0]}, R = {Rb:g} bps/Hz"
            series[lab] = m[i, :, j]
            styles[lab] = dict(pl.SCHEME_STYLE[s], color=pl.SERIES[2 * i + j])
    _line_out("fig12", alts / 1e3, "altitude_km", series,
              xlabel="Altitude of LEO satellite (km)", ylabel="Service efficiency",
              styles=styles, title="Fig. 12 - downlink, M = 5")


# ---------------------------------------------------------------------------
# Heatmaps: Figs. 4, 9, 10
# ---------------------------------------------------------------------------
def _ul_heat_row(y, xs, sc):
    return [ul.exhaustive_schedule(sc.S_uplink(np.array([x, y])), sc.rates,
                                   sc.uplink_sat_capacity())[1] for x in xs]


def _dl_heat_row(y, xs, sc):
    out = []
    for x in xs:
        r = dl.exhaustive_downlink(sc, np.array([x, y]))
        out.append((r.eta, r.bf.total_power if r.users else 0.0))
    return out


HEAT_CASES = [(5, 2000.0), (5, 3000.0), (8, 2000.0)]


def _heat_scenarios(seed):
    """Same users for the two M = 5 panels; P1 fixed by the H = 2000 m scenario."""
    out = []
    for M, H in HEAT_CASES:
        ref = Scenario(SystemParams(M=M, H=2000.0), rng=seed)
        out.append(Scenario(SystemParams(M=M, H=H, P1_dBm=float(w2dbm(ref.P1))), rng=seed))
    return out


def fig4(workers, grid=41, seed=11, n_init=10, **_):
    """Uplink heatmap (exhaustive search over UAV positions) vs Algorithm 2."""
    p0 = SystemParams()
    xs = np.linspace(p0.x_min, p0.x_max, grid)
    fig, axes = pl.plt.subplots(1, 3, figsize=(14.5, 4.4), layout="constrained")
    data = {}
    for k, (sc, (M, H)) in enumerate(zip(_heat_scenarios(seed), HEAT_CASES)):
        Z = np.array(_pmap(partial(_ul_heat_row, xs=xs, sc=sc), xs, workers))
        ao = ul.ao_uplink(sc, n_init=n_init, n_screen=1000, rng=seed)
        iy, ix = np.unravel_index(np.argmax(Z), Z.shape)
        data[f"M{M}_H{int(H)}"] = dict(grid_best=float(Z.max()),
                                      grid_best_pos_km=[xs[ix] / 1e3, xs[iy] / 1e3],
                                      ao_eta=ao.eta, ao_pos_km=(ao.L / 1e3).tolist())
        np.savez(os.path.join(OUT, f"fig4_M{M}_H{int(H)}.npz"), xs=xs, Z=Z,
                 users=sc.user_pos, ao_L=ao.L, ao_eta=ao.eta)
        pl.heatmap_panel(axes[k], xs / 1e3, xs / 1e3, Z, sc.user_pos / 1e3, ao.L / 1e3,
                         f"Algorithm 2: η = {ao.eta:.4f} at ({ao.L[0] / 1e3:.1f}, "
                         f"{ao.L[1] / 1e3:.1f}) km", "Service efficiency",
                         title=f"({'abc'[k]}) M = {M}, H = {H:g} m, map max = {Z.max():.4f}")
    fig.suptitle("Fig. 4 - uplink: exhaustive search map vs Algorithm 2 (star)",
                 x=0.01, ha="left", color=pl.INK)
    pl.save(fig, os.path.join(OUT, "fig4.png"))
    with open(os.path.join(OUT, "fig4.json"), "w") as f:
        json.dump(data, f, indent=2)


def fig9_10(workers, grid=41, seed=11, **_):
    """Downlink heatmaps (power: Fig. 9, efficiency: Fig. 10) vs Algorithm 4."""
    p0 = SystemParams()
    xs = np.linspace(p0.x_min, p0.x_max, grid)
    fig9, ax9 = pl.plt.subplots(1, 3, figsize=(14.5, 4.4), layout="constrained")
    fig10, ax10 = pl.plt.subplots(1, 3, figsize=(14.5, 4.4), layout="constrained")
    data = {}
    for k, (sc, (M, H)) in enumerate(zip(_heat_scenarios(seed), HEAT_CASES)):
        rows = np.array(_pmap(partial(_dl_heat_row, xs=xs, sc=sc), xs, workers))
        Z_eta, Z_pow = rows[..., 0], rows[..., 1]
        ao = dl.ao_downlink(sc, L0=sc.p.area_center)
        data[f"M{M}_H{int(H)}"] = dict(grid_best_eta=float(Z_eta.max()),
                                      grid_min_power_at_best_eta=float(
                                          Z_pow[Z_eta == Z_eta.max()].min()),
                                      ao_eta=ao.eta, ao_power_W=ao.total_power,
                                      ao_pos_km=(ao.L / 1e3).tolist())
        np.savez(os.path.join(OUT, f"fig9_10_M{M}_H{int(H)}.npz"), xs=xs, eta=Z_eta,
                 power=Z_pow, users=sc.user_pos, ao_L=ao.L, ao_eta=ao.eta,
                 ao_power=ao.total_power)
        title = f"({'abc'[k]}) M = {M}, H = {H:g} m"
        where = f"at ({ao.L[0] / 1e3:.1f}, {ao.L[1] / 1e3:.1f}) km"
        pl.heatmap_panel(ax9[k], xs / 1e3, xs / 1e3, Z_pow, sc.user_pos / 1e3, ao.L / 1e3,
                         f"Algorithm 4: {ao.total_power:.4f} W {where}",
                         "Total transmit power (W)", title=title)
        pl.heatmap_panel(ax10[k], xs / 1e3, xs / 1e3, Z_eta, sc.user_pos / 1e3, ao.L / 1e3,
                         f"Algorithm 4: η = {ao.eta:.4f} {where}",
                         "Service efficiency", title=title)
    fig9.suptitle("Fig. 9 - downlink: minimum UAV power for the best efficiency vs "
                  "Algorithm 4 (star)", x=0.01, ha="left", color=pl.INK)
    fig10.suptitle("Fig. 10 - downlink: service efficiency map vs Algorithm 4 (star)",
                   x=0.01, ha="left", color=pl.INK)
    for f_, n in ((fig9, "fig9"), (fig10, "fig10")):
        pl.save(f_, os.path.join(OUT, f"{n}.png"))
    with open(os.path.join(OUT, "fig9_10.json"), "w") as f:
        json.dump(data, f, indent=2)


# ---------------------------------------------------------------------------
# Convergence and trajectories: Figs. 13, 14
# ---------------------------------------------------------------------------
def fig13_14(seed=7, n_init=10, n_iter=15, **_):
    users = FIG13_USERS_KM * 1e3
    L0_ul, L0_dl = np.array([-50e3, -50e3]), np.array([50e3, -50e3])
    ref = Scenario(SystemParams(M=5, H=2000.0, K_rm_dB=31.3), rng=seed, user_pos=users)
    P1 = float(w2dbm(ref.P1))
    series, styles, traj = {}, {}, {}
    for i, H in enumerate([2000.0, 1750.0, 1500.0]):
        sc = Scenario(SystemParams(M=5, H=H, K_rm_dB=31.3, P1_dBm=P1), rng=seed,
                      user_pos=users)
        ao = ul.ao_uplink(sc, L0=L0_ul, n_init=n_init, max_iter=n_iter, n_screen=1000,
                            rng=seed)
        lab = f"U: H = {H:g} m"
        series[lab] = pl.pad(ao.eta_history, n_iter + 1)
        styles[lab] = dict(color=pl.SERIES[i], marker="os^"[i], ls="-")
        if H == 2000.0:
            traj["U"] = (np.array(ao.L_history), ao.eta,
                         [r[0][-1] for r in ao.runs], ao.runs[0])
    sc = Scenario(SystemParams(M=5, H=2000.0, K_rm_dB=31.3), rng=seed, user_pos=users)
    aod = dl.ao_downlink(sc, L0=L0_dl, max_iter=n_iter)
    series["D: H = 2000 m"] = pl.pad(aod.eta_history, n_iter + 1)
    styles["D: H = 2000 m"] = dict(color=pl.SERIES[4], marker="v", ls=":")
    traj["D"] = np.array(aod.L_history)
    it = np.arange(n_iter + 1)
    _line_out("fig13", it, "iteration", series, xlabel="Iteration number",
              ylabel="Service efficiency", styles=styles,
              title="Fig. 13 - convergence of Algorithms 2 (U) and 4 (D)")

    # Fig. 14: UAV placement vs iteration
    fig, ax = pl.plt.subplots(figsize=(5.8, 5.2))
    ax.scatter(users[:, 0] / 1e3, users[:, 1] / 1e3, marker="s", s=60, color=pl.MUTED,
               edgecolor=pl.INK, label="Users", zorder=3)
    U_path, U_eta, _, run0 = traj["U"]
    first = np.array(run0[1]) / 1e3
    ax.plot(first[:, 0], first[:, 1], color=pl.SERIES[0], ls=":", marker=".", lw=1.2,
            label="U: run from L(0) = (-50, -50)")
    up = U_path / 1e3
    ax.plot(up[:, 0], up[:, 1], color=pl.SERIES[0], marker="v", ms=5, label="U: L(i), best start")
    dp = traj["D"] / 1e3
    ax.plot(dp[:, 0], dp[:, 1], color=pl.SERIES[4], marker="o", ms=5,
            markerfacecolor=pl.SURFACE, label="D: L(i)")
    for path, c, lab in ((up, pl.SERIES[0], "U: L*"), (dp, pl.SERIES[4], "D: L*")):
        ax.scatter([path[-1, 0]], [path[-1, 1]], marker="*", s=240, facecolor="none",
                   edgecolor=c, linewidth=1.5, label=lab, zorder=4)
        ax.annotate(f"({path[-1, 0]:.1f}, {path[-1, 1]:.1f})", xy=path[-1], xytext=(7, -4),
                    textcoords="offset points", fontsize=8, color=pl.INK)
    ax.set_xlim(-52, 52)
    ax.set_ylim(-52, 52)
    ax.set_aspect("equal")
    ax.set_xlabel("X axis (km)")
    ax.set_ylabel("Y axis (km)")
    ax.legend(loc="upper right", fontsize=7.5)
    ax.set_title("Fig. 14 - UAV placement vs iteration (H = 2000 m)", loc="left")
    fig.tight_layout()
    pl.save(fig, os.path.join(OUT, "fig14.png"))
    np.savez(os.path.join(OUT, "fig14.npz"), users=users, U_path=U_path, D_path=traj["D"],
             U_first_run=np.array(run0[1]))


FIGS = {"2": fig2, "3": fig3, "4": fig4, "5": fig5, "6": fig6, "7": fig7, "8": fig8,
        "9": fig9_10, "10": fig9_10, "11": fig11, "12": fig12, "13": fig13_14,
        "14": fig13_14}


def main(argv=None):
    global OUT
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--figs", nargs="+", default=["all"], help="figure numbers or 'all'")
    ap.add_argument("--trials", type=int, default=200, help="Monte-Carlo drops per point")
    ap.add_argument("--grid", type=int, default=41, help="heatmap resolution per axis")
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 1)
    ap.add_argument("--quick", action="store_true", help="tiny run for smoke testing")
    ap.add_argument("--out", default=OUT)
    a = ap.parse_args(argv)
    OUT = a.out
    os.makedirs(OUT, exist_ok=True)
    if a.quick:
        a.trials, a.grid = 4, 9
    names = list(FIGS) if "all" in a.figs else a.figs
    done = set()
    for n in names:
        fn = FIGS[n]
        if fn in done:
            continue
        done.add(fn)
        t0 = time.time()
        fn(trials=a.trials, workers=a.workers, grid=a.grid)
        print(f"{fn.__name__:>8s} done in {time.time() - t0:7.1f} s", flush=True)


if __name__ == "__main__":
    main()
