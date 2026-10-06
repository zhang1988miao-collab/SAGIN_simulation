"""Channel model of Section II-A and one random network realization.

* Space-to-air link (Eq. (1)-(3)): large-scale path loss a_{r,s} and Rician
  small-scale fading with a Doppler-rotated LoS part.
* Air-to-sea links (Eq. (4)-(6)): maritime path loss a_{r,m}(L_r) that depends
  on the UAV position, and Rician small-scale fading g_{r,m} that is kept fixed
  when the UAV moves (quasi-static assumption used for placement optimization).
"""
from __future__ import annotations

import numpy as np

from .config import (EARTH_RADIUS, SPEED_OF_LIGHT, SystemParams, db2lin,
                     dbm2w)


def crandn(rng, *shape):
    """CN(0, 1) samples."""
    return (rng.standard_normal(shape) + 1j * rng.standard_normal(shape)) / np.sqrt(2.0)


def ula_steering(n, phi):
    """Half-wavelength ULA response with unit-modulus entries."""
    return np.exp(1j * np.pi * np.arange(n) * np.sin(phi))


def rician_vector(rng, n, K_lin):
    """g = sqrt(K/(K+1)) g_LoS + sqrt(1/(K+1)) g_NLoS, Eq. (6).

    The LoS part is a steering vector with unit-modulus entries so that
    E[|g_i|^2] = 1 for every antenna element.
    """
    los = ula_steering(n, rng.uniform(-np.pi / 2, np.pi / 2))
    return np.sqrt(K_lin / (K_lin + 1)) * los + np.sqrt(1 / (K_lin + 1)) * crandn(rng, n)


def satellite_distance(p: SystemParams) -> float:
    """UAV-satellite distance for a given contact angle (law of cosines)."""
    r_u = EARTH_RADIUS + p.H
    r_s = EARTH_RADIUS + p.h_sat
    return float(np.sqrt(r_u ** 2 + r_s ** 2 - 2 * r_u * r_s * np.cos(p.contact_angle)))


def satellite_pathloss_db(p: SystemParams, d: float, x_s_db: float = 0.0) -> float:
    """Eq. (2): a_{r,s}|dB = A_s + 10 n_s log10(d / d0) + X_s, A_s = FSPL(d0)."""
    A_s = 20 * np.log10(4 * np.pi * p.d0_s * p.f_c / SPEED_OF_LIGHT)
    return float(A_s + 10 * p.n_s * np.log10(d / p.d0_s) + x_s_db)


def satellite_small_scale(rng, p: SystemParams):
    """Return (G_LoS, G_NLoS) of Eq. (3) for the satellite->UAV direction (N_R x N_S)."""
    a_r = ula_steering(p.N_R, rng.uniform(-np.pi / 2, np.pi / 2))
    a_s = ula_steering(p.N_S, rng.uniform(-np.pi / 2, np.pi / 2))
    return np.outer(a_r, a_s.conj()), crandn(rng, p.N_R, p.N_S)


def capacity_waterfilling(Hm, P, noise):
    """max_{Tr(WW^H) <= P} log2 det(I + H W W^H H^H / noise) via SVD + water-filling.

    This is the optimal relay/satellite beamformer W* used in Lemma 1 and (53).
    """
    lam = np.linalg.svd(Hm, compute_uv=False) ** 2 / noise
    lam = np.sort(lam[lam > 1e-30])[::-1]
    if lam.size == 0 or P <= 0:
        return 0.0
    inv = 1.0 / lam
    for k in range(lam.size, 0, -1):
        mu = (P + inv[:k].sum()) / k
        if mu > inv[k - 1]:
            return float(np.sum(np.log2(mu * lam[:k])))
    return 0.0


class Scenario:
    """One realization: user positions, fading, target rates, satellite link."""

    def __init__(self, p: SystemParams, rng=None, user_pos=None, rates=None,
                 P1_ref_pos=None):
        self.p = p
        self.rng = rng = np.random.default_rng(rng)
        M = p.M
        if user_pos is None:
            user_pos = np.column_stack([rng.uniform(p.x_min, p.x_max, M),
                                        rng.uniform(p.y_min, p.y_max, M)])
        self.user_pos = np.asarray(user_pos, dtype=float).reshape(M, 2)

        # air-to-sea small-scale fading g_{r,m} (fixed w.r.t. UAV movement) and shadowing
        K = db2lin(p.K_rm_dB)
        self.g = np.array([rician_vector(rng, p.N_R, K) for _ in range(M)])
        self.g_norm2 = np.sum(np.abs(self.g) ** 2, axis=1)
        self.shadow_db = rng.normal(0.0, p.sigma_Xr_dB, M) if p.sigma_Xr_dB > 0 else np.zeros(M)

        if rates is None:
            rates = p.R_bar * rng.uniform(1 - p.R_spread, 1 + p.R_spread, M)
        self.rates = np.broadcast_to(np.asarray(rates, dtype=float), (M,)).copy()

        # space-to-air link
        self.G_los, self.G_nlos = satellite_small_scale(rng, p)
        self.x_s_db = rng.normal(0.0, p.sigma_Xs_dB) if p.sigma_Xs_dB > 0 else 0.0

        self.noise = p.noise_w
        self.P4 = float(dbm2w(p.P4_dBm))
        # uplink user power: calibrated so that the mean of S_uk (in dB) at the
        # reference UAV position equals S_mean_dB (Section V), unless fixed.
        if p.P1_dBm is None:
            ref = p.area_center if P1_ref_pos is None else np.asarray(P1_ref_pos, float)
            S_unit = self.g_norm2 / (self.noise * self.pathloss_lin(ref))
            self.P1 = float(10 ** ((p.S_mean_dB - np.mean(10 * np.log10(S_unit))) / 10))
        else:
            self.P1 = float(dbm2w(p.P1_dBm))

    # ---------------------------------------------------------------- air-to-sea
    def distances(self, L):
        """3-D UAV-user distances d_{r,m} for horizontal UAV position L (m)."""
        diff = np.asarray(L, float)[None, :] - self.user_pos
        return np.sqrt(np.sum(diff ** 2, axis=1) + self.p.H ** 2)

    def pathloss_db(self, L):
        p = self.p
        d = self.distances(L)
        return p.A_r_dB + 10 * p.n_r * np.log10(d / p.d0_r) + self.shadow_db + p.F_r_dB

    def pathloss_lin(self, L):
        return 10 ** (self.pathloss_db(L) / 10)

    def h(self, L):
        """h_{r,m} = g_{r,m} / sqrt(a_{r,m}), rows = users, Eq. (4)."""
        return self.g / np.sqrt(self.pathloss_lin(L))[:, None]

    def S_uplink(self, L):
        """S_m = P1 ||h_{r,m}||^2 / sigma_r^2."""
        return self.P1 * self.g_norm2 / (self.noise * self.pathloss_lin(L))

    def S_coeff(self, L_any=None):
        """c_m with S_m(L) = c_m d_m(L)^(-n_r) (used by the SCA placement)."""
        p = self.p
        L_any = p.area_center if L_any is None else L_any
        return self.S_uplink(L_any) * self.distances(L_any) ** p.n_r

    # ---------------------------------------------------------------- space-to-air
    def H_rs(self):
        """Satellite->UAV channel H_{r,s} (N_R x N_S) without antenna gains."""
        p = self.p
        K = db2lin(p.K_rs_dB)
        f_D = p.v_sat / SPEED_OF_LIGHT * p.f_c
        G = (np.sqrt(K / (K + 1)) * self.G_los * np.exp(1j * 2 * np.pi * f_D * p.t)
             + np.sqrt(1 / (K + 1)) * self.G_nlos)
        a = db2lin(satellite_pathloss_db(p, satellite_distance(p), self.x_s_db))
        return G / np.sqrt(a)

    def uplink_sat_capacity(self):
        """RHS of (25): log2 det(I_NS + U U^H / sigma_s^2) with optimal W_r (power P2)."""
        p = self.p
        if p.sat_link_ideal:
            return np.inf
        H_sr = self.H_rs().T * np.sqrt(db2lin(p.G_ul_dB))   # reciprocity, N_S x N_R
        return capacity_waterfilling(H_sr, float(dbm2w(p.P2_dBm)), self.noise)

    def downlink_sat_capacity(self):
        """RHS of (53)/(55): log2 det(I_NR + Q Q^H / sigma_r^2) with optimal W_s (power P3)."""
        p = self.p
        if p.sat_link_ideal:
            return np.inf
        H = self.H_rs() * np.sqrt(db2lin(p.G_dl_dB))
        return capacity_waterfilling(H, float(dbm2w(p.P3_dBm)), self.noise)
