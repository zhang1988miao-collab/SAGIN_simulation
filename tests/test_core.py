import itertools

import numpy as np
import pytest

from sasin import Scenario, SystemParams, capacity_waterfilling
from sasin import downlink as dl
from sasin import uplink as ul


def brute_force_uplink(S, R, C=np.inf):
    M = len(S)
    best = 0.0
    for k in range(1, M + 1):
        for order in itertools.permutations(range(M), k):
            if ul.is_feasible(S, R, list(order), C):
                best = max(best, ul.service_efficiency(S, R, list(order), M, C))
    return best


@pytest.mark.parametrize("seed", range(8))
def test_exhaustive_dp_matches_brute_force(seed):
    rng = np.random.default_rng(seed)
    M = 6
    S = 10 ** rng.uniform(-0.5, 2.5, M)
    R = rng.uniform(0.3, 2.0, M)
    C = np.inf if seed % 2 == 0 else 4.0
    order, eta = ul.exhaustive_schedule(S, R, C)
    assert ul.is_feasible(S, R, order, C)
    assert eta == pytest.approx(ul.service_efficiency(S, R, order, M, C))
    assert eta == pytest.approx(brute_force_uplink(S, R, C))


@pytest.mark.parametrize("seed", range(5))
def test_grasp_feasible_and_below_optimum(seed):
    rng = np.random.default_rng(seed)
    S = 10 ** rng.uniform(-0.5, 2.5, 8)
    R = rng.uniform(0.5, 1.5, 8)
    order, eta = ul.grasp_schedule(S, R, rng=seed)
    assert ul.is_feasible(S, R, order)
    _, eta_opt = ul.exhaustive_schedule(S, R)
    assert eta <= eta_opt + 1e-12
    assert eta >= ul.greedy_schedule(S, R)[1] - 0.25


def test_waterfilling_matches_logdet_with_equal_power_at_high_snr_bound():
    rng = np.random.default_rng(0)
    H = (rng.standard_normal((4, 8)) + 1j * rng.standard_normal((4, 8))) / np.sqrt(2)
    P, noise = 10.0, 1.0
    c_wf = capacity_waterfilling(H, P, noise)
    W = np.sqrt(P / 8) * np.eye(8)
    c_eq = np.log2(np.linalg.det(np.eye(4) + H @ W @ W.conj().T @ H.conj().T / noise)).real
    assert c_wf >= c_eq - 1e-9


@pytest.mark.parametrize("seed", range(5))
def test_min_power_beamforming_meets_targets(seed):
    rng = np.random.default_rng(seed)
    K, N = 3, 4
    Hn = (rng.standard_normal((K, N)) + 1j * rng.standard_normal((K, N))) * 3
    gam = rng.uniform(0.5, 3.0, K)
    bf = dl.min_power_beamforming(Hn, gam)
    assert bf.feasible
    sinr = dl.downlink_sinr(Hn, bf.W, bf.P)
    np.testing.assert_allclose(sinr, gam, rtol=1e-6)


def test_scenario_and_ao_run():
    p = SystemParams(M=5)
    sc = Scenario(p, rng=1)
    res = ul.ao_uplink(sc, L0=np.array([-50e3, -50e3]), max_iter=3, rng=1)
    assert 0 <= res.eta <= 1
    S = sc.S_uplink(res.L)
    assert ul.is_feasible(S, sc.rates, res.users)
    res_d = dl.ao_downlink(sc, L0=np.array([50e3, -50e3]), max_iter=3)
    assert 0 <= res_d.eta <= 1
    assert res_d.total_power <= sc.P4 * (1 + 1e-6)
