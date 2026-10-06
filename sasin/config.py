"""System parameters of the space-air-sea integrated network (SASIN).

Defaults follow Section V of He et al., "6G Space-Air-Sea Integrated Networks:
QoS-Aware Design and Optimization", IEEE TWC 2026. Parameters that the paper
does not state (satellite link budget, carrier frequency, uplink user power,
spread of the individual target rates, ...) are marked "assumption".
"""
from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np

SPEED_OF_LIGHT = 299_792_458.0
EARTH_RADIUS = 6_371e3


def db2lin(x):
    return 10.0 ** (np.asarray(x, dtype=float) / 10.0)


def lin2db(x):
    return 10.0 * np.log10(np.asarray(x, dtype=float))


def dbm2w(x):
    return 10.0 ** ((np.asarray(x, dtype=float) - 30.0) / 10.0)


def w2dbm(x):
    return 10.0 * np.log10(np.asarray(x, dtype=float)) + 30.0


@dataclass(frozen=True)
class SystemParams:
    # ---- topology ---------------------------------------------------------
    M: int = 10                    # number of maritime users
    N_R: int = 4                   # UAV relay antennas
    N_S: int = 8                   # satellite antennas
    H: float = 2000.0              # UAV altitude [m]
    x_min: float = -50e3           # UAV hovering region / user area [m]
    x_max: float = 50e3
    y_min: float = -50e3
    y_max: float = 50e3

    # ---- air-to-sea channel, Eq. (5)-(6) -----------------------------------
    # a_dB = A_r + 10 n_r log10(d / d0_r) + X_r + varsigma F_r
    #      = 116.7 + 19 log10(d / 2600) + 9  (Section V, [40])
    A_r_dB: float = 116.7
    n_r: float = 1.9
    d0_r: float = 2600.0
    F_r_dB: float = 9.0            # varsigma F_r, flight-direction adjustment
    sigma_Xr_dB: float = 0.0       # shadowing std of X_r (assumption: off)
    K_rm_dB: float = 10.0          # Rician factor of the UAV-user links

    # ---- space-to-air channel, Eq. (1)-(3) ---------------------------------
    sat_link_ideal: bool = True    # "satellite-to-relay channel sufficiently strong"
    f_c: float = 2e9               # carrier frequency [Hz] (assumption, S band)
    h_sat: float = 600e3           # LEO altitude [m]
    contact_angle: float = 0.0     # Earth-centred angle UAV<->satellite [rad]
    v_sat: float = 7.6e3           # relative velocity [m/s] (Doppler)
    t: float = 0.0                 # time instant used in the Doppler phase [s]
    n_s: float = 2.0               # satellite path-loss exponent (free space)
    d0_s: float = 1.0              # reference distance [m]; A_s = FSPL(d0_s)
    sigma_Xs_dB: float = 0.0       # shadowing std of X_s (assumption: off)
    K_rs_dB: float = 10.0          # Rician factor of the satellite-UAV link
    G_ul_dB: float = 20.0          # total antenna gain UAV->satellite (assumption)
    G_dl_dB: float = 20.0          # total antenna gain satellite->UAV (assumption)

    # ---- powers and noise --------------------------------------------------
    noise_dBm: float = -110.0      # sigma_v^2 = sigma_r^2 = sigma_s^2
    P1_dBm: float | None = None    # user tx power; None -> calibrate S_mean_dB
    S_mean_dB: float = 10.0        # "mean value of S_uk is 10 dB"
    P2_dBm: float = 30.0           # UAV tx power towards satellite (assumption)
    P3_dBm: float = 30.0           # satellite tx power (assumption)
    P4_dBm: float = 40.0           # UAV tx power towards users

    # ---- QoS ---------------------------------------------------------------
    R_bar: float = 1.0             # average target rate [bps/Hz]
    R_spread: float = 0.5          # R_m ~ U[R_bar(1-s), R_bar(1+s)] (assumption)

    def with_(self, **kw) -> "SystemParams":
        return replace(self, **kw)

    @property
    def noise_w(self) -> float:
        return float(dbm2w(self.noise_dBm))

    @property
    def area_center(self) -> np.ndarray:
        return np.array([(self.x_min + self.x_max) / 2, (self.y_min + self.y_max) / 2])
