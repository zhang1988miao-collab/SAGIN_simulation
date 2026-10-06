"""Uplink transmission (Section III): users -> UAV (NOMA + SIC) -> satellite.

Implements
* SINR model with SIC at the relay, Eq. (11), and service efficiency, Eq. (13);
* Algorithm 1: GRASP user scheduling (plus the greedy baseline);
* exhaustive search (exact, via dynamic programming over user subsets);
* TDMA and opportunistic baselines of Fig. 2;
* SCA-based UAV placement, problem P1.3 with the bounds (29)-(30), (39);
* Algorithm 2: alternating optimization of scheduling and placement.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from scipy.optimize import minimize

from .channel import Scenario

_REL_TOL = 1e-9


# ---------------------------------------------------------------------------
# SINR and service efficiency
# ---------------------------------------------------------------------------
def _suffix_excl(x):
    """out[k] = sum_{l > k} x[l] along axis 0."""
    out = np.zeros_like(x)
    if len(x) > 1:
        out[:-1] = np.cumsum(x[::-1], axis=0)[::-1][1:]
    return out


def sinr_in_order(S, order):
    """Eq. (11): gamma_{u_k} = S_{u_k} / (sum_{l>k} S_{u_l} + 1), order = u_1 -> u_K."""
    s = S[np.asarray(order, dtype=int)]
    return s / (_suffix_excl(s) + 1.0)


def service_efficiency(S, R, order, M, C=np.inf):
    """Eq. (13), with the relay->satellite condition (25) applied to the scheduled set."""
    order = np.asarray(order, dtype=int)
    if order.size == 0 or R[order].sum() > C * (1 + _REL_TOL):
        return 0.0
    r = np.log2(1.0 + sinr_in_order(S, order))
    Ro = R[order]
    ok = r >= Ro * (1 - _REL_TOL)
    return float(np.sum(Ro[ok] / r[ok]) / M)


def is_feasible(S, R, order, C=np.inf):
    order = np.asarray(order, dtype=int)
    if order.size == 0:
        return True
    if R[order].sum() > C * (1 + _REL_TOL):
        return False
    r = np.log2(1.0 + sinr_in_order(S, order))
    return bool(np.all(r >= R[order] * (1 - _REL_TOL)))


# ---------------------------------------------------------------------------
# Algorithm 1 (GRASP) and greedy scheduling
# ---------------------------------------------------------------------------
def _construct(S, R, C, omega, rng):
    """Greedy randomized construction.

    Users are selected in *reverse* decoding order (the first pick is decoded
    last at the relay), so adding a user never changes the SINR of the users
    already selected; the candidate's SINR gamma~ sees all of them as
    interference.  Algorithm 1 reverses the list at the end.
    """
    M = len(S)
    cand = np.ones(M, dtype=bool)
    rev, I, sumR = [], 0.0, 0.0
    while cand.any():
        c = np.flatnonzero(cand)
        gam = S[c] / (I + 1.0)
        rate = np.log2(1.0 + gam)
        feas = (rate >= R[c] * (1 - _REL_TOL)) & (sumR + R[c] <= C * (1 + _REL_TOL))
        if not feas.any():
            break
        cf = c[feas]
        metric = R[cf] / (rate[feas] * S[cf])           # M_eta(u_k)
        ranked = cf[np.argsort(-metric, kind="stable")]
        n_rcl = max(1, int(np.ceil(omega * ranked.size))) if rng is not None else 1
        u = ranked[rng.integers(n_rcl)] if rng is not None else ranked[0]
        rev.append(int(u))
        I += S[u]
        sumR += R[u]
        cand[u] = False
    return rev[::-1]


def _local_search(S, R, order, C, M, max_passes=50):
    """Swap phase of Algorithm 1: exchange a scheduled and an unscheduled user."""
    order = list(order)
    eta = service_efficiency(S, R, order, M, C)
    for _ in range(max_passes):
        improved = False
        outside = [u for u in range(len(S)) if u not in order]
        for i in range(len(order)):
            for u_out in outside:
                trial = order.copy()
                trial[i] = u_out
                if not is_feasible(S, R, trial, C):
                    continue
                eta_swap = service_efficiency(S, R, trial, M, C)
                if eta_swap > eta + 1e-12:
                    outside[outside.index(u_out)] = order[i]
                    order, eta, improved = trial, eta_swap, True
        if not improved:
            break
    return order, eta


def grasp_schedule(S, R, C=np.inf, omega=0.25, n_iter=10, rng=None, M=None,
                   local_search=True):
    """Algorithm 1. Returns (decoding order u_1..u_K, service efficiency)."""
    rng = np.random.default_rng(rng)
    M = len(S) if M is None else M
    best_order, best_eta = [], 0.0
    for _ in range(n_iter):
        order = _construct(S, R, C, omega, rng)
        if local_search:
            order, eta = _local_search(S, R, order, C, M)
        else:
            eta = service_efficiency(S, R, order, M, C)
        if eta > best_eta:
            best_order, best_eta = order, eta
    return best_order, best_eta


def greedy_schedule(S, R, C=np.inf, M=None):
    """Greedy baseline: always add the feasible user with the largest M_eta."""
    M = len(S) if M is None else M
    order = _construct(S, R, C, omega=0.0, rng=None)
    return order, service_efficiency(S, R, order, M, C)


def exhaustive_schedule(S, R, C=np.inf, M=None):
    """Exact optimum of P1.1 over all user subsets *and* decoding orders.

    Dynamic programming over subsets: if u is decoded first among the users of
    a set A, its interference is sum_{A minus u} S, independent of how the remaining
    users are ordered, so f(A) = max_u f(A minus u) + R_u / log2(1 + gamma_u).
    Complexity O(2^M M) instead of enumerating all ordered subsets.
    """
    S = np.asarray(S, float)
    R = np.asarray(R, float)
    n = len(S)
    M = n if M is None else M
    N = 1 << n
    sumS = np.zeros(N)
    sumR = np.zeros(N)
    for mask in range(1, N):
        low = mask & -mask
        b = low.bit_length() - 1
        sumS[mask] = sumS[mask ^ low] + S[b]
        sumR[mask] = sumR[mask ^ low] + R[b]
    th = 2.0 ** R - 1.0
    Sl, Rl, thl = S.tolist(), R.tolist(), th.tolist()
    f = [-np.inf] * N
    arg = [-1] * N
    f[0] = 0.0
    for mask in range(1, N):
        if sumR[mask] > C * (1 + _REL_TOL):
            continue
        tot = sumS[mask]
        best, bu = -np.inf, -1
        m = mask
        while m:
            low = m & -m
            m ^= low
            u = low.bit_length() - 1
            fp = f[mask ^ low]
            if fp == -np.inf:
                continue
            gam = Sl[u] / (tot - Sl[u] + 1.0)
            if gam >= thl[u] * (1 - _REL_TOL):
                v = fp + Rl[u] / np.log2(1.0 + gam)
                if v > best:
                    best, bu = v, u
        f[mask], arg[mask] = best, bu
    best_mask = int(np.argmax(f))
    order, mask = [], best_mask
    while mask:
        u = arg[mask]
        order.append(u)
        mask ^= 1 << u
    return order, float(f[best_mask]) / M


def tdma_efficiency(S, R, C=np.inf, M=None):
    """TDMA baseline: equal time slots, one (interference-free) user per slot.

    The per-slot efficiency (13) is averaged over the M slots of a frame.
    """
    M = len(S) if M is None else M
    r = np.log2(1.0 + S)
    ok = (r >= R * (1 - _REL_TOL)) & (R <= C)
    return float(np.sum(np.where(ok, R / r, 0.0)) / (M * len(S)))


def opportunistic_efficiency(S, R, C=np.inf, M=None):
    """Opportunistic baseline: only the user with the best channel is served."""
    M = len(S) if M is None else M
    u = int(np.argmax(S))
    return service_efficiency(S, R, [u], M, C)


SCHEDULERS = {
    "exhaustive": lambda S, R, C, rng, **kw: exhaustive_schedule(S, R, C),
    "grasp": lambda S, R, C, rng, **kw: grasp_schedule(S, R, C, rng=rng, **kw),
    "greedy": lambda S, R, C, rng, **kw: greedy_schedule(S, R, C),
}


# ---------------------------------------------------------------------------
# SCA-based UAV placement (P1.3)
# ---------------------------------------------------------------------------
def sca_placement_uplink(sc: Scenario, order, L_hat, delta=5e3, alpha=None):
    """One SCA step: solve the convex problem P1.3 around the reference L_hat.

    * objective: (1/M) sum_k U_{u_k}(L | L_hat), Eq. (27), with the gradient of
      E_{u_k} = R_{u_k} / log2(1 + gamma_{u_k}) w.r.t. L_r (cf. Eq. (28));
    * constraint (39): S^lb_{u_k} >= (2^R - 1)(sum_{i>k} S^ub_{u_i} + 1) with the
      global lower bound (29) and the local upper bound of Lemma 2, Eq. (30),
      valid inside the trust region ||L - L_hat|| <= delta;
    * hovering region (19)-(20).
    Positions are optimized in km for numerical conditioning.
    """
    p = sc.p
    order = np.asarray(order, dtype=int)
    L_hat = np.asarray(L_hat, dtype=float)
    if order.size == 0:
        return L_hat.copy()
    n, H, km = p.n_r, p.H, 1e3
    users = sc.user_pos[order]
    R = sc.rates[order]
    th = 2.0 ** R - 1.0
    c = sc.S_coeff()[order]                   # S = c d^-n

    def dist(z):
        return np.sqrt(np.sum((z * km - users) ** 2, axis=1) + H ** 2)

    d_hat = dist(L_hat / km)
    S_hat = c * d_hat ** (-n)
    D = _suffix_excl(S_hat) + 1.0
    gam = S_hat / D
    rate = np.log2(1.0 + gam)
    if np.any(rate < R * (1 - _REL_TOL)):
        return L_hat.copy()

    Delta = L_hat[None, :] - users                                  # (K, 2) [m]
    later_wD = _suffix_excl((S_hat / d_hat ** 2)[:, None] * Delta)
    coef = n * R * S_hat / (np.log(2) * (1 + gam) * rate ** 2 * D ** 2)
    gradE = coef[:, None] * (D[:, None] * Delta / d_hat[:, None] ** 2 - later_wD)
    g = gradE.sum(axis=0) * km / p.M                                # per km
    delta_km = delta / km
    if alpha is None:
        alpha = max(np.linalg.norm(g), 1e-12) / (2 * delta_km)
    z_hat = L_hat / km

    gradS = -n * S_hat[:, None] * Delta / d_hat[:, None] ** 2       # per m
    d_low = np.maximum(d_hat - delta, H)
    curv = c * n * (n + 1) / d_low ** (n + 2)                       # Lemma 2 bound

    def S_lb(z):                                                    # Eq. (29)
        return S_hat - n * S_hat / d_hat * (dist(z) - d_hat)

    def S_ub(z):                                                    # Eq. (30)
        dz = (z - z_hat) * km
        return S_hat + gradS @ dz + 0.5 * curv * (dz @ dz)

    def con_rate(z):                                                # Eq. (39)
        return S_lb(z) - th * (_suffix_excl(S_ub(z)) + 1.0)

    def con_trust(z):
        dz = z - z_hat
        return delta_km ** 2 - dz @ dz

    def obj(z):
        dz = z - z_hat
        return -(g @ dz - alpha * (dz @ dz))

    def jac(z):
        return -(g - 2 * alpha * (z - z_hat))

    bounds = [(p.x_min / km, p.x_max / km), (p.y_min / km, p.y_max / km)]
    try:
        res = minimize(obj, z_hat, jac=jac, method="SLSQP", bounds=bounds,
                       constraints=[{"type": "ineq", "fun": con_rate},
                                    {"type": "ineq", "fun": con_trust}],
                       options={"maxiter": 100, "ftol": 1e-10})
        z_new = np.clip(res.x, [b[0] for b in bounds], [b[1] for b in bounds])
    except (ValueError, np.linalg.LinAlgError):
        return L_hat.copy()
    L_new = z_new * km
    # keep the step only if the true rate constraints (15) still hold
    if not is_feasible(sc.S_uplink(L_new), sc.rates, order):
        return L_hat.copy()
    return L_new


# ---------------------------------------------------------------------------
# Algorithm 2: alternating optimization
# ---------------------------------------------------------------------------
@dataclass
class AOResult:
    L: np.ndarray
    users: list
    eta: float
    eta_history: list = field(default_factory=list)
    L_history: list = field(default_factory=list)
    runs: list = field(default_factory=list)   # (eta_history, L_history) of every start


def _random_position(p, rng):
    return np.array([rng.uniform(p.x_min, p.x_max), rng.uniform(p.y_min, p.y_max)])


def initial_positions(sc: Scenario, n_init, L0=None, n_screen=0, rng=None):
    """Initial UAV positions for the restarts of Algorithm 2.

    The paper uses random initial positions. With n_screen > 0, n_screen random
    candidates are scored with one greedy scheduling pass and the n_init best
    are kept (a cheap way to start the local SCA search in good basins).
    L0, if given, is always the first start.
    """
    rng = np.random.default_rng(rng)
    p = sc.p
    starts = [np.asarray(L0, float)] if L0 is not None else []
    need = n_init - len(starts)
    if need <= 0:
        return starts[:n_init]
    if n_screen > need:
        C = sc.uplink_sat_capacity()
        cand = [_random_position(p, rng) for _ in range(n_screen)]
        score = [greedy_schedule(sc.S_uplink(L), sc.rates, C)[1] for L in cand]
        starts += [cand[i] for i in np.argsort(score)[::-1][:need]]
    else:
        starts += [_random_position(p, rng) for _ in range(need)]
    return starts


def ao_uplink(sc: Scenario, L0=None, n_init=1, max_iter=15, psi=1e-4, tol_L=1.0,
              delta=5e3, scheduler="grasp", omega=0.25, n_grasp=10, n_screen=0,
              rng=None):
    """Algorithm 2: alternate GRASP scheduling (P1.1) and SCA placement (P1.3).

    The outer loop runs n_init initial positions (see initial_positions) and the
    best solution is kept.  The returned histories belong to that solution;
    `runs` holds the histories of every start.
    """
    rng = np.random.default_rng(rng)
    p = sc.p
    C = sc.uplink_sat_capacity()
    R = sc.rates
    sched = SCHEDULERS[scheduler]
    kw = {"omega": omega, "n_iter": n_grasp} if scheduler == "grasp" else {}
    best, runs = None, []
    for L in initial_positions(sc, n_init, L0, n_screen, rng):
        order, eta = sched(sc.S_uplink(L), R, C, rng, **kw)
        hist_eta, hist_L = [eta], [L.copy()]
        for _ in range(max_iter):
            L_new = sca_placement_uplink(sc, order, L, delta=delta)
            S_new = sc.S_uplink(L_new)
            eta_keep = service_efficiency(S_new, R, order, p.M, C)
            order_new, eta_new = sched(S_new, R, C, rng, **kw)
            if eta_keep > eta_new:
                order_new, eta_new = list(order), eta_keep
            dL, deta = np.linalg.norm(L_new - L), abs(eta_new - eta)
            L, order, eta = L_new, order_new, eta_new
            hist_eta.append(eta)
            hist_L.append(L.copy())
            if deta < psi and dL < tol_L:
                break
        runs.append((hist_eta, hist_L))
        if best is None or eta > best.eta:
            best = AOResult(L, list(order), eta, hist_eta, hist_L)
    best.runs = runs
    return best
