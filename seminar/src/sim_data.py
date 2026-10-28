"""Illustrative data for the "Simulation Results" slides of the seminar template.

The numbers are NOT results from a paper. They come from small toy models that
only reproduce typical trends, so the charts in the template look realistic.
Replace them with your own simulation results (right-click a chart in
PowerPoint -> Edit Data).

Run:  python3 sim_data.py   ->  writes build/chart_data.json
"""

import json
import pathlib

import numpy as np

OUT = pathlib.Path(__file__).with_name("build") / "chart_data.json"


# ---------------------------------------------------------------------------
# Part II: polarforming-aided RSMA downlink from a LEO satellite (toy model)
# ---------------------------------------------------------------------------
N_ANT, K_USR = 16, 4
KAPPA = 10 ** (10 / 10)       # Rician factor 10 dB (LoS-dominant space-ground link)
XPD = 10 ** (12 / 10)         # cross-polar discrimination 12 dB
CSIT_ERR = 0.03               # normalized CSIT error variance (outdated CSI)
BETA = 10 ** (-5 / 10)        # per-antenna SNR at P = 0 dBW
BEAM_DEG = 10.0               # users clustered within +/- BEAM_DEG inside one beam
V_POL = np.array([1.0, 0.0], complex)
C_POL = np.array([1.0, 1j]) / np.sqrt(2)


def rot(om):
    c, s = np.cos(om), np.sin(om)
    return np.array([[c, -s], [s, c]])


def jones(alpha, delta):
    return np.array([np.cos(alpha), np.sin(alpha) * np.exp(1j * delta)])


# transmit polarization candidates searched by the (toy) polarforming optimizer
TX_CANDIDATES = [jones(a, d) for a in np.linspace(0, np.pi / 2, 5) for d in (0, np.pi / 2, -np.pi / 2)]


def draw_geometry(rng):
    """Steering vectors (K x N) and depolarizing scattering matrices (K x 2 x 2)."""
    theta0 = rng.uniform(-np.pi / 4, np.pi / 4)
    theta = theta0 + np.deg2rad(rng.uniform(-BEAM_DEG, BEAM_DEG, K_USR))
    steer = np.exp(1j * np.pi * np.outer(np.sin(theta), np.arange(N_ANT)))
    G = (rng.standard_normal((K_USR, 2, 2)) + 1j * rng.standard_normal((K_USR, 2, 2))) / np.sqrt(2)
    G[:, 0, 1] /= np.sqrt(XPD)
    G[:, 1, 0] /= np.sqrt(XPD)
    return steer, G


def draw_polarized_channels(omegas, geometry):
    """Polarization matrices P_k (K x 2 x 2) and steering vectors a_k (K x N).

    Satellite channels have negligible angular spread at the satellite, so user k sees
    H_{k,n} = sqrt(beta) * P_k * a_{k,n}, with P_k = (sqrt(kappa/(kappa+1)) I
    + sqrt(1/(kappa+1)) G_k) R(Omega_k): ground depolarization after Faraday rotation.
    """
    steer, G = geometry
    R = np.stack([rot(om) for om in omegas])
    Pk = (np.sqrt(KAPPA / (KAPPA + 1)) * np.eye(2) + np.sqrt(1 / (KAPPA + 1)) * G) @ R
    return np.sqrt(BETA) * Pk, steer


def effective_channels(H, p_tx, p_rx):
    """Rows h_k^H = (p_k^H P_k p_tx) a_k^T  ->  K x N matrix."""
    Pk, steer = H
    gain = np.einsum("ki,kij,j->k", np.conj(p_rx), Pk, p_tx)
    return gain[:, None] * steer


def rx_polarforming(H, p_tx):
    """Closed-form receive polarforming (polarization-domain MRC): p_k = P_k p / ||P_k p||."""
    v = np.einsum("kij,j->ki", H[0], p_tx)
    return v / np.linalg.norm(v, axis=1, keepdims=True)


def maxmin_rate(G_true, G_est, P, rsma=True):
    """Max-min rate of RSMA (or SDMA if rsma=False) with RZF private streams."""
    K = G_true.shape[0]
    W = G_est.conj().T @ np.linalg.inv(G_est @ G_est.conj().T + (K / P) * np.eye(K))
    W /= np.linalg.norm(W, axis=0, keepdims=True)
    # common precoder: principal direction of the normalized channel subspace
    Gn = G_est / np.linalg.norm(G_est, axis=1, keepdims=True)
    wc = np.linalg.eigh(Gn.conj().T @ Gn)[1][:, -1]
    best = 0.0
    for t in (np.linspace(0, 0.9, 10) if rsma else [0.0]):
        gain_p = np.abs(G_true @ W) ** 2 * (1 - t) * P / K       # K x K
        sig = np.diag(gain_p)
        r_priv = np.log2(1 + sig / (gain_p.sum(axis=1) - sig + 1))
        if t == 0:
            best = max(best, r_priv.min())
            continue
        gc = np.abs(G_true @ wc) ** 2 * t * P
        budget = np.min(np.log2(1 + gc / (gain_p.sum(axis=1) + 1)))
        r = np.sort(r_priv)                                      # water-fill the common rate
        level = r[0]
        for i in range(1, K + 1):
            need = ((r[i] if i < K else np.inf) - level) * i
            if need >= budget:
                level += budget / i
                break
            budget -= need
            level = r[i]
        best = max(best, level)
    return best


def imperfect(G, z):
    """Outdated CSIT: G_hat = G + E, E ~ CN(0, CSIT_ERR * mean |g|^2)."""
    err = np.sqrt(CSIT_ERR * np.mean(np.abs(G) ** 2, axis=1, keepdims=True) / 2)
    return G + err * (z[0] + 1j * z[1])


def best_polarforming(H, z, P, rsma=True):
    """Toy stand-in for the AO polarforming design.

    Searches transmit polarization candidates; for each one the receivers either use
    the closed-form (dominant-eigenvector) polarforming or keep their initial linear
    polarization. Like an AO started from fixed polarization, it never does worse.
    """
    best = 0.0
    linear_rx = np.tile(V_POL, (K_USR, 1))
    for p_tx in TX_CANDIDATES:
        for p_rx in (rx_polarforming(H, p_tx), linear_rx):
            G = effective_channels(H, p_tx, p_rx)
            best = max(best, maxmin_rate(G, imperfect(G, z), P, rsma))
    return best


def part2(n_drops=200):
    rng = np.random.default_rng(7)
    p_db = np.arange(0, 31, 5)
    curves = {k: np.zeros(len(p_db)) for k in ("pf_rsma", "fp_rsma", "pf_sdma", "fp_sdma")}
    for _ in range(n_drops):
        H = draw_polarized_channels(rng.uniform(0, np.pi / 2, K_USR), draw_geometry(rng))
        z = rng.standard_normal((2, K_USR, N_ANT))
        G_fp = effective_channels(H, V_POL, np.tile(V_POL, (K_USR, 1)))
        for i, pdb in enumerate(p_db):
            P = 10 ** (pdb / 10)
            curves["pf_rsma"][i] += best_polarforming(H, z, P)
            curves["pf_sdma"][i] += best_polarforming(H, z, P, rsma=False)
            curves["fp_rsma"][i] += maxmin_rate(G_fp, imperfect(G_fp, z), P)
            curves["fp_sdma"][i] += maxmin_rate(G_fp, imperfect(G_fp, z), P, rsma=False)
    vs_power = {k: np.round(v / n_drops, 2).tolist() for k, v in curves.items()}

    # Faraday-rotation sweep at P = 20 dBW (common random numbers over the sweep)
    om_deg = np.arange(0, 91, 10)
    curves = {k: np.zeros(len(om_deg)) for k in ("pf", "cp", "lp")}
    P = 10 ** (20 / 10)
    for _ in range(n_drops):
        jitter = rng.standard_normal(K_USR) * np.deg2rad(3)
        geometry = draw_geometry(rng)
        z = rng.standard_normal((2, K_USR, N_ANT))
        for i, om in enumerate(om_deg):
            H = draw_polarized_channels(np.deg2rad(om) + jitter, geometry)
            curves["pf"][i] += best_polarforming(H, z, P)
            for key, p_tx in (("cp", C_POL), ("lp", V_POL)):     # linearly polarized users
                G = effective_channels(H, p_tx, np.tile(V_POL, (K_USR, 1)))
                curves[key][i] += maxmin_rate(G, imperfect(G, z), P)
    vs_faraday = {k: np.round(v / n_drops, 2).tolist() for k, v in curves.items()}
    return {"power_dbw": p_db.tolist(), "vs_power": vs_power,
            "faraday_deg": om_deg.tolist(), "vs_faraday": vs_faraday}


# ---------------------------------------------------------------------------
# Part III: Rydberg atomic receiver (RAQR) for a LEO downlink (toy link budget)
# ---------------------------------------------------------------------------
def part3():
    d_km = np.arange(500, 3001, 250)
    fspl = 20 * np.log10(d_km / 500)                     # extra loss w.r.t. 500 km
    snr_conv = 8.0 - fspl                                # conventional RF front end [dB]
    snr_fixed = snr_conv + 5.0                           # RAQR, fixed LO
    snr_opt = snr_conv + 10.0                            # RAQR, optimized LO + precoding
    rate = lambda s: np.round(np.log2(1 + 10 ** (s / 10)), 2).tolist()
    vs_range = {"raqr_opt": rate(snr_opt), "raqr_fixed": rate(snr_fixed), "conv": rate(snr_conv)}

    x = np.array([0.1, 0.2, 0.5, 1.0, 2.0, 5.0, 10.0])  # E_LO / E_ref
    shape = 10 * np.log10(4 * x ** 2 / (1 + x ** 2) ** 2) - 10 * np.log10(1 + (x / 6) ** 2)
    vs_lo = {f"M{m}": np.round(8 + 10 * np.log10(m) + shape, 1).tolist() for m in (1, 4, 16)}
    return {"range_km": d_km.tolist(), "vs_range": vs_range,
            "lo_norm": x.tolist(), "vs_lo": vs_lo}


# ---------------------------------------------------------------------------
# Part IV: multi-agent DRL (synthetic learning curves and scaling trends)
# ---------------------------------------------------------------------------
def part4():
    rng = np.random.default_rng(11)
    ep = np.arange(0, 3001, 100)

    def curve(r0, r_inf, tau, noise, delay=0):
        e = np.clip(ep - delay, 0, None)
        base = r0 + (r_inf - r0) * (1 - np.exp(-e / tau))
        noisy = base + noise * rng.standard_normal(len(ep))
        smooth = np.convolve(np.pad(noisy, 1, mode="edge"), np.ones(3) / 3, mode="valid")
        return np.round(smooth, 1).tolist()

    training = {
        "mappo": curve(-20, 96, 520, 2.0),
        "maddpg": curve(-20, 82, 820, 3.5, delay=100),
        "ippo": curve(-20, 64, 650, 3.0),
        "random": curve(-18, -14, 400, 1.5),
    }
    users = np.array([6, 12, 18, 24, 30, 36])
    sat = lambda a, b: np.round(a * (1 - np.exp(-users / b)), 1).tolist()
    vs_users = {
        "rsma": sat(36.0, 13.0),
        "sdma": sat(25.5, 8.5),
        "noma": sat(27.0, 11.5),
        "static": sat(23.0, 12.0),
    }
    return {"episodes": ep.tolist(), "training": training,
            "users": users.tolist(), "vs_users": vs_users}


if __name__ == "__main__":
    OUT.parent.mkdir(exist_ok=True)
    data = {"part2": part2(), "part3": part3(), "part4": part4()}
    OUT.write_text(json.dumps(data, indent=1))
    print(json.dumps(data, indent=1))
