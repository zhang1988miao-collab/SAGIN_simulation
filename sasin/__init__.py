"""Simulation of QoS-aware space-air-sea integrated networks (SASIN).

Reproduces the system model, algorithms and numerical results of
Y. He et al., "6G Space-Air-Sea Integrated Networks: QoS-Aware Design and
Optimization", IEEE Trans. Wireless Commun., vol. 25, 2026.
"""
from .config import SystemParams, db2lin, dbm2w, lin2db, w2dbm
from .channel import Scenario, capacity_waterfilling, satellite_distance
from . import downlink, uplink

__all__ = ["SystemParams", "Scenario", "uplink", "downlink", "capacity_waterfilling",
           "satellite_distance", "db2lin", "lin2db", "dbm2w", "w2dbm"]
