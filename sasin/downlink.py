"""Downlink transmission (Section IV): satellite -> UAV (DF) -> users (MISO BC).

Implements
* minimum-power UAV beamforming for given SINR targets, Lemma 3 (Eqs. (56)-(60));
* Algorithm 3: low-complexity greedy user scheduling (problem P2.2);
* exhaustive search over user subsets (benchmark);
* UAV placement P2.4 using Lemma 4 (Eq. (64));
* Algorithm 4: alternating optimization of scheduling and placement.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from itertools import combinations

import numpy as np
from scipy.optimize import minimize

from .channel import Scenario

_REL_TOL = 1e-9


@dataclass
class BFResult:
    feasible: bool
    P: np.ndarray | None = None          # per-user transmit powers [W]
    W: np.ndarray | None = None          # unit-norm directions w~ (N_R x K)
    Mmat: np.ndarray | None = None       # matrix M of Eq. (58)

    @property
    def total_power(self):
        return float(np.sum(self.P)) if self.feasible else np.inf


def min_power_beamforming(Hn, gamma, P_max=np.inf, max_iter=2000, tol=1e-9):
    """Lemma 3: min sum_j ||w_j||^2 s.t. SINR_j >= gamma_j.

    Hn are the user channels h_{r,j} (rows) divided by sigma_v, so powers come
    out in watts.  mu is obtained from the fixed-point equations (60), which
    starting from mu = 0 increase monotonically to the solution when it exists
    (standard interference function). By strong duality the optimum power equals
    sum(mu), so the iteration stops as soon as sum(mu) exceeds P_max.
    """
    Hn = np.atleast_2d(Hn)
    K, N = Hn.shape
    gamma = np.asarray(gamma, dtype=float)
    if K == 0:
        return BFResult(True, np.zeros(0), np.zeros((N, 0)), np.zeros((0, 0)))
    # necessary condition from uplink-downlink duality: sum gamma/(1+gamma) < N
    if np.sum(gamma / (1 + gamma)) >= N * (1 - 1e-12):
        return BFResult(False)
    Hc = Hn.conj()
    mu = np.zeros(K)
    converged = False
    for _ in range(max_iter):
        A = np.eye(N) + (Hc.T * mu) @ Hn                 # I + sum mu_a h_a^H h_a
        Ainv = np.linalg.inv(A)
        q = np.einsum("km,mn,kn->k", Hn, Ainv, Hc).real  # h_j A^-1 h_j^H
        mu_new = 1.0 / ((1.0 + 1.0 / gamma) * q)
        if mu_new.sum() > P_max * (1 + 1e-6):
            return BFResult(False)
        if np.max(np.abs(mu_new - mu) / mu_new) < tol:
            mu = mu_new
            converged = True
            break
        mu = mu_new
    if not converged:
        return BFResult(False)
    A = np.eye(N) + (Hc.T * mu) @ Hn
    W = np.linalg.solve(A, Hc.T)                         # Eq. (57) numerators
    W /= np.linalg.norm(W, axis=0, keepdims=True)
    G = np.abs(Hn @ W) ** 2                              # G[a, b] = |h_a w_b|^2
    Mmat = -G.copy()
    Mmat[np.diag_indices(K)] = np.diag(G) / gamma        # Eq. (58)
    try:
        P = np.linalg.solve(Mmat, np.ones(K))            # Eq. (59) (noise-normalized)
    except np.linalg.LinAlgError:
        return BFResult(False)
    if not np.all(np.isfinite(P)) or np.any(P <= 0):
        return BFResult(False)
    return BFResult(True, P, W, Mmat)


def downlink_sinr(Hn, W, P):
    """Eq. (42) for unit-norm beams W and powers P (noise-normalized channels)."""
    G = np.abs(Hn @ W) ** 2 * P[None, :]
    sig = np.diag(G)
    return sig / (G.sum(axis=1) - sig + 1.0)


def service_efficiency_downlink(gamma_achieved, R, M):
    """Eq. (43)."""
    r = np.log2(1.0 + np.asarray(gamma_achieved))
    R = np.asarray(R)
    ok = r >= R * (1 - 1e-6)
    return float(np.sum(R[ok] / r[ok]) / M)


def _problem(sc: Scenario, L):
    Hn = sc.h(L) / np.sqrt(sc.noise)
    gam = 2.0 ** sc.rates - 1.0
    return Hn, gam


def _check(Hn, gam, R, users, P4, C):
    if R[users].sum() > C * (1 + _REL_TOL):
        return BFResult(False)
    bf = min_power_beamforming(Hn[users], gam[users], P_max=P4)
    if bf.feasible and bf.total_power <= P4 * (1 + 1e-9):
        return bf
    return BFResult(False)


@dataclass
class DLSchedule:
    users: list
    eta: float
    bf: BFResult


def greedy_downlink(sc: Scenario, L, C=None):
    """Algorithm 3 (users visited in ascending order of their target rates)."""
    C = sc.downlink_sat_capacity() if C is None else C
    Hn, gam = _problem(sc, L)
    R = sc.rates
    cand = [int(u) for u in np.argsort(R, kind="stable")]
    sel, bf_sel = [], BFResult(True, np.zeros(0))
    while cand:
        added = False
        for v in cand:
            bf = _check(Hn, gam, R, sel + [v], sc.P4, C)
            if bf.feasible:
                sel, bf_sel = sel + [v], bf
                cand.remove(v)
                added = True
                break
        if not added:
            break
    return DLSchedule(sel, len(sel) / sc.p.M, bf_sel)


def exhaustive_downlink(sc: Scenario, L, C=None):
    """Benchmark: largest feasible subset, ties broken by minimum total power."""
    C = sc.downlink_sat_capacity() if C is None else C
    Hn, gam = _problem(sc, L)
    R = sc.rates
    N = Hn.shape[1]
    ratio = gam / (1 + gam)
    for k in range(sc.p.M, 0, -1):
        best = None
        for users in combinations(range(sc.p.M), k):
            users = list(users)
            if ratio[users].sum() >= N or R[users].sum() > C * (1 + _REL_TOL):
                continue
            bf = _check(Hn, gam, R, users, sc.P4, C)
            if bf.feasible and (best is None or bf.total_power < best.bf.total_power):
                best = DLSchedule(users, k / sc.p.M, bf)
        if best is not None:
            return best
    return DLSchedule([], 0.0, BFResult(True, np.zeros(0)))


SCHEDULERS = {"greedy": greedy_downlink, "exhaustive": exhaustive_downlink}


# ---------------------------------------------------------------------------
# UAV placement, P2.4 (Lemma 4)
# ---------------------------------------------------------------------------
def placement_downlink(sc: Scenario, users, L_hat):
    """Solve P2.4: min_L sum_j P_j(L) s.t. sum_j P_j(L) <= P4 and (50)-(51).

    By Lemma 4, with the beam directions w~ and M^ fixed at L_hat,
    P(L) = (Gamma M^)^-1 sigma^2 1 with rho_j = a_j(L_hat) / a_j(L), i.e.
    sum_j P_j(L) = sum_j b_j (d_j(L) / d_j(L_hat))^{n_r},  b = 1^T M^^-1 >= 0,
    which is convex in L.
    """
    p = sc.p
    users = list(users)
    L_hat = np.asarray(L_hat, dtype=float)
    if not users:
        return L_hat.copy()
    Hn, gam = _problem(sc, L_hat)
    bf = min_power_beamforming(Hn[users], gam[users])
    if not bf.feasible:
        return L_hat.copy()
    b = np.ones(len(users)) @ np.linalg.inv(bf.Mmat)
    b = np.maximum(b, 0.0)
    pos = sc.user_pos[users]
    n, H, km = p.n_r, p.H, 1e3
    d_hat = np.sqrt(np.sum((L_hat - pos) ** 2, axis=1) + H ** 2)

    def f(z):
        diff = z * km - pos
        d = np.sqrt(np.sum(diff ** 2, axis=1) + H ** 2)
        r = (d / d_hat) ** n
        val = b @ r
        grad = ((b * n * r / d ** 2)[:, None] * diff).sum(axis=0) * km
        return val, grad

    bounds = [(p.x_min / km, p.x_max / km), (p.y_min / km, p.y_max / km)]
    res = minimize(f, L_hat / km, jac=True, method="L-BFGS-B", bounds=bounds)
    L_new = np.asarray(res.x) * km
    return L_new if f(res.x)[0] <= f(L_hat / km)[0] else L_hat.copy()


@dataclass
class DLAOResult:
    L: np.ndarray
    users: list
    eta: float
    total_power: float
    eta_history: list = field(default_factory=list)
    L_history: list = field(default_factory=list)
    power_history: list = field(default_factory=list)


def ao_downlink(sc: Scenario, L0=None, max_iter=15, psi=1e-4, tol_L=1.0,
                scheduler="greedy"):
    """Algorithm 4: alternate scheduling (P2.2) and UAV placement (P2.4)."""
    p = sc.p
    C = sc.downlink_sat_capacity()
    sched = SCHEDULERS[scheduler]
    L = p.area_center.copy() if L0 is None else np.asarray(L0, dtype=float)
    cur = sched(sc, L, C)
    hist_eta, hist_L, hist_P = [cur.eta], [L.copy()], [cur.bf.total_power]
    for _ in range(max_iter):
        L_new = placement_downlink(sc, cur.users, L)
        new = sched(sc, L_new, C)
        if len(new.users) < len(cur.users):          # keep the previous set if better
            Hn, gam = _problem(sc, L_new)
            bf = _check(Hn, gam, sc.rates, cur.users, sc.P4, C)
            if bf.feasible:
                new = DLSchedule(cur.users, cur.eta, bf)
        dL, deta = np.linalg.norm(L_new - L), abs(new.eta - cur.eta)
        L, cur = L_new, new
        hist_eta.append(cur.eta)
        hist_L.append(L.copy())
        hist_P.append(cur.bf.total_power)
        if deta < psi and dL < tol_L:
            break
    return DLAOResult(L, cur.users, cur.eta, cur.bf.total_power, hist_eta, hist_L, hist_P)
