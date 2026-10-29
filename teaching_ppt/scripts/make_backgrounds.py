#!/usr/bin/env python3
"""Render the chapter background images used by the course slide templates.

Each chapter gets three 2560x1440 images, drawn procedurally from its topic:
  chN_cover.jpg  dark, detailed art for the cover and closing slides
  chN_dark.jpg   dark, quieter art for the contents and section-divider slides
  chN_light.jpg  near-white with a faint motif, for content slides

  Ch1 overview        cellular hexagons and radiating wavefronts (1G..6G)
  Ch2 SAGIN           Earth limb, satellite orbits, inter-satellite and feeder links
  Ch3 transceivers    Rydberg atom, circularly polarised wave, Poincare sphere
  Ch4 terahertz       chirped waves and the electromagnetic spectrum
  Ch5 outlook         dawn over a perspective grid, future network

Usage: python make_backgrounds.py OUT_DIR [ch1 ch2 ...]
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

W, H = 2560, 1440
SS = 2  # supersampling factor for line art
YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)


# ----------------------------------------------------------------------------- basics
def rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def lin_grad(stops, angle_deg):
    """Gradient through (pos, hex) stops; angle 0 = left->right, 90 = top->bottom."""
    a = math.radians(angle_deg)
    t = (XX / W) * math.cos(a) + (YY / H) * math.sin(a)
    t = (t - t.min()) / (t.max() - t.min())
    out = np.zeros((H, W, 3), np.float32)
    ps = [p for p, _ in stops]
    cs = [rgb(c) for _, c in stops]
    for ch in range(3):
        out[..., ch] = np.interp(t, ps, [c[ch] for c in cs])
    return out


def gauss2d(cx, cy, sx, sy=None):
    sy = sx if sy is None else sy
    return np.exp(-(((XX - cx) / sx) ** 2 + ((YY - cy) / sy) ** 2) / 2).astype(np.float32)


def fft_blur(a, s):
    h, w = a.shape
    p = int(3 * s) + 2
    ap = np.pad(a, p, mode="constant")
    F = np.fft.rfft2(ap)
    fy = np.fft.fftfreq(ap.shape[0]).astype(np.float32)[:, None]
    fx = np.fft.rfftfreq(ap.shape[1]).astype(np.float32)[None, :]
    K = np.exp(-2 * (np.pi * s) ** 2 * (fx ** 2 + fy ** 2))
    out = np.fft.irfft2(F * K, s=ap.shape)
    return out[p:p + h, p:p + w].astype(np.float32)


def blur(a, s):
    if s < 0.6:
        return a
    f = 1
    for cand in (16, 8, 4, 2):
        if s / cand >= 3:
            f = cand
            break
    if f == 1:
        return fft_blur(a, s)
    h, w = a.shape
    small = a.reshape(h // f, f, w // f, f).mean(axis=(1, 3))
    sb = fft_blur(small, s / f)
    return np.asarray(Image.fromarray(sb).resize((w, h), Image.BICUBIC), np.float32)


class Mask:
    """Supersampled grayscale drawing surface; .arr() returns an antialiased float mask."""

    def __init__(self):
        self.im = Image.new("L", (W * SS, H * SS), 0)
        self.d = ImageDraw.Draw(self.im)

    def _p(self, pts):
        return [(float(x) * SS, float(y) * SS) for x, y in pts]

    def line(self, pts, width=2.0, val=255):
        if len(pts) > 1:
            self.d.line(self._p(pts), fill=int(val), width=max(1, int(round(width * SS))), joint="curve")

    def dashed(self, pts, dash=16, gap=12, width=2.0, val=255):
        for seg in dash_segments(pts, dash, gap):
            self.line(seg, width, val)

    def circle(self, cx, cy, r, val=255, width=0.0):
        box = [(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS]
        if width:
            self.d.ellipse(box, outline=int(val), width=max(1, int(round(width * SS))))
        else:
            self.d.ellipse(box, fill=int(val))

    def poly(self, pts, val=255, width=0.0):
        if width:
            self.d.polygon(self._p(pts), outline=int(val), width=max(1, int(round(width * SS))))
        else:
            self.d.polygon(self._p(pts), fill=int(val))

    def arr(self):
        return np.asarray(self.im.resize((W, H), Image.BOX), np.float32) / 255.0


def resample(pts, step=3.0):
    pts = np.asarray(pts, np.float64)
    seg = np.diff(pts, axis=0)
    L = np.hypot(seg[:, 0], seg[:, 1])
    cum = np.concatenate([[0], np.cumsum(L)])
    if cum[-1] == 0:
        return pts
    s = np.arange(0, cum[-1], step)
    return np.stack([np.interp(s, cum, pts[:, 0]), np.interp(s, cum, pts[:, 1])], 1)


def dash_segments(pts, dash, gap):
    pts = resample(pts, 2.0)
    period = dash + gap
    out, cur = [], []
    for i, p in enumerate(pts):
        if (i * 2.0) % period < dash:
            cur.append(tuple(p))
        else:
            if len(cur) > 1:
                out.append(cur)
            cur = []
    if len(cur) > 1:
        out.append(cur)
    return out


def ellipse_pts(cx, cy, a, b, rot_deg=0.0, t0=0.0, t1=2 * math.pi, n=900):
    t = np.linspace(t0, t1, n)
    x, y = a * np.cos(t), b * np.sin(t)
    r = math.radians(rot_deg)
    return list(zip(cx + x * math.cos(r) - y * math.sin(r), cy + x * math.sin(r) + y * math.cos(r)))


def over(C, m, color, alpha=1.0):
    a = np.clip(m * alpha, 0, 1)[..., None]
    return C * (1 - a) + rgb(color)[None, None, :] * a


def add(C, m, color, gain=1.0):
    return C + m[..., None] * rgb(color)[None, None, :] * gain


def glow(C, m, color, gain=1.0, sigmas=((3, 0.9), (12, 0.55), (40, 0.3))):
    C = add(C, m, color, gain)
    for s, g in sigmas:
        C = add(C, blur(m, s), color, g * gain)
    return C


def vignette_left(C, x0=0.18, x1=0.62, floor=0.5):
    """Darken the left part (text area) of dark slides."""
    f = floor + (1 - floor) * smoothstep(x0 * W, x1 * W, XX)
    return C * f[..., None]


def finish(C, path, grain=0.0, seed=0, soft=True):
    rng = np.random.default_rng(seed)
    if soft:  # compress glows that run past white
        knee = 0.86
        C = np.where(C > knee, knee + (1 - knee) * np.tanh((C - knee) / (1 - knee)), C)
    C = np.clip(C, 0, 1)
    if grain:
        C = np.clip(C + (rng.random((H, W, 1), dtype=np.float32) - 0.5) * grain, 0, 1)
    img = (C * 255 + rng.random((H, W, 3), dtype=np.float32) - 0.5).clip(0, 255).astype(np.uint8)
    Image.fromarray(img).save(path, quality=90, subsampling=0, optimize=True)
    print("wrote", path, f"{os.path.getsize(path) / 1024:.0f} KB")


def starfield(C, n, seed, color="#FFFFFF", gain=1.0, weight=None):
    rng = np.random.default_rng(seed)
    m = Mask()
    xs, ys = rng.uniform(0, W, n), rng.uniform(0, H, n)
    br = rng.random(n) ** 3
    for x, y, b in zip(xs, ys, br):
        m.circle(x, y, 0.7 + 1.3 * b, val=50 + 205 * b)
    a = m.arr()
    if weight is not None:
        a = a * weight
    C = add(C, a, color, gain)
    return add(C, blur(a, 3), color, 0.6 * gain)


def hex_pts(cx, cy, R, rot=0.0):
    return [(cx + R * math.cos(math.radians(60 * k + rot)), cy + R * math.sin(math.radians(60 * k + rot)))
            for k in range(6)]


def hex_centers(R, x0, y0, x1, y1):
    dx, dy = 1.5 * R, math.sqrt(3) * R
    out, col, x = [], 0, x0
    while x < x1 + R:
        y = y0 + (dy / 2 if col % 2 else 0)
        while y < y1 + R:
            out.append((x, y))
            y += dy
        x += dx
        col += 1
    return out


def arrow(m, x0, y0, x1, y1, width=3, head=14, val=255):
    m.line([(x0, y0), (x1, y1)], width, val)
    ang = math.atan2(y1 - y0, x1 - x0)
    p1 = (x1 - head * math.cos(ang - 0.45), y1 - head * math.sin(ang - 0.45))
    p2 = (x1 - head * math.cos(ang + 0.45), y1 - head * math.sin(ang + 0.45))
    m.poly([(x1, y1), p1, p2], val)


def network(m, rng, n, x0, x1, y0, y1, k=2, width=1.6, val=255, dot=3.2):
    pts = np.stack([rng.uniform(x0, x1, n), rng.uniform(y0, y1, n)], 1)
    for i, p in enumerate(pts):
        d = np.hypot(*(pts - p).T)
        for j in np.argsort(d)[1:k + 1]:
            m.line([tuple(p), tuple(pts[j])], width, val * 0.55)
    for p in pts:
        m.circle(p[0], p[1], dot, val)
    return pts


# ----------------------------------------------------------------------------- Ch1 overview
def ch1(kind, out):
    rng = np.random.default_rng(11)
    if kind == "light":
        C = lin_grad([(0, "#FFFFFF"), (0.55, "#FFFFFF"), (1, "#EFEDFF")], 25)
        m = Mask()
        cx, cy = 2330, 1260
        for (x, y) in hex_centers(64, 1500, 820, W + 80, H + 80):
            d = math.hypot(x - cx, y - cy)
            if d < 980:
                m.poly(hex_pts(x, y, 60), val=255 * (1 - d / 980) ** 1.4, width=1.6)
        C = over(C, m.arr(), "#6A4CFF", 0.28)
        m = Mask()
        for i in range(5):
            r = 260 + i * 150
            m.line(ellipse_pts(cx, cy, r, r, 0, math.radians(185), math.radians(265)), 2.2, 255 * (1 - i * 0.15))
        C = over(C, m.arr(), "#18B6E0", 0.32)
        finish(C, out, soft=False)
        return

    dark = kind == "dark"
    C = lin_grad([(0, "#080720"), (0.55, "#141050"), (1, "#22197A")], 15)
    cx, cy = (2330, 760) if dark else (1990, 690)
    C = add(C, gauss2d(cx, cy, 700, 520), "#5B3BFF", 0.42 if dark else 0.55)
    C = add(C, gauss2d(cx + 300, cy + 520, 380), "#16C6FF", 0.10 if dark else 0.16)
    C = starfield(C, 500, 3, "#BFC6FF", 0.30)

    # cellular hexagons
    m_out, m_fill, m_hot = Mask(), Mask(), Mask()
    reach = 1150 if dark else 1280
    for (x, y) in hex_centers(66, 600, -60, W + 80, H + 80):
        d = math.hypot(x - cx, y - cy)
        f = max(0.0, 1 - d / reach) ** 1.25
        if f <= 0.02:
            continue
        m_out.poly(hex_pts(x, y, 62), val=255 * f, width=1.5)
        r = rng.random()
        if r < 0.10:
            m_fill.poly(hex_pts(x, y, 58), val=255 * f * rng.uniform(0.35, 1))
        elif r < 0.14:
            m_hot.poly(hex_pts(x, y, 60), val=255 * f, width=2.6)
    C = add(C, m_out.arr(), "#8A78FF", 0.30)
    C = add(C, m_fill.arr(), "#5A48F0", 0.22)
    C = glow(C, m_hot.arr(), "#3FD9FF", 0.45)

    # radiating wavefronts, one per generation
    m = Mask()
    for i in range(6):
        r = 150 + i * 135
        span = 300 - i * 18
        start = rng.uniform(0, 360)
        for k in range(3):
            a0 = math.radians(start + k * 120)
            m.line(ellipse_pts(cx, cy, r, r, 0, a0, a0 + math.radians(span / 3 * 1.05), 400),
                   2.0 + i * 0.55, 255 * (0.45 + 0.11 * i))
    C = glow(C, m.arr(), "#9FE6FF", 0.40 if dark else 0.55)

    # core node and links
    m = Mask()
    m.circle(cx, cy, 16)
    C = glow(C, m.arr(), "#FFFFFF", 1.2, ((6, 1.0), (30, 0.7), (110, 0.5)))
    m = Mask()
    pts = network(m, rng, 18, cx - 760, min(W - 40, cx + 560), cy - 520, cy + 560, k=2, width=1.4, val=200, dot=4)
    C = glow(C, m.arr(), "#7FD8FF", 0.35)

    # low-frequency to high-frequency waves along the bottom
    if not dark:
        m = Mask()
        xs = np.linspace(1500, W + 20, 1600)
        for i in range(6):
            t = (xs - 1500) / (W - 1480)
            ph = 2 * math.pi * (1.5 + 0.9 * i) * t * (1 + 1.6 * t)
            y = 1190 + i * 20 + (34 - 3 * i) * np.sin(ph + i) * np.sin(np.pi * np.clip(t, 0, 1)) ** 0.6
            m.line(list(zip(xs, y)), 1.8, 130 + 20 * i)
        C = glow(C, m.arr() * smoothstep(1500, 2000, XX), "#B49BFF", 0.32)

    C = vignette_left(C, 0.10 if dark else 0.16, 0.62, 0.55 if dark else 0.42)
    finish(C, out, 0.010, 1)


# ----------------------------------------------------------------------------- Ch2 SAGIN
def earth(C, cx, cy, R, sun=None, grid=True, atm_gain=1.0):
    d = np.sqrt((XX - cx) ** 2 + (YY - cy) ** 2) - R
    inside = np.clip(0.5 - d, 0, 1)
    t = np.exp(np.minimum(d, 0) / 260.0)
    surf = rgb("#020B1E")[None, None, :] * (1 - t[..., None]) + rgb("#0D3E7E")[None, None, :] * t[..., None]
    if sun is not None:
        surf = surf + rgb("#2A6FB8")[None, None, :] * gauss2d(sun[0], sun[1], 700, 300)[..., None] * 0.55
    C = C * (1 - inside[..., None]) + surf * inside[..., None]
    if grid:
        m = Mask()
        for k in range(1, 9):
            rr = R - 26 * k ** 1.55
            m.line(ellipse_pts(cx, cy, rr, rr, 0, math.radians(200), math.radians(340), 1400), 1.4, 255)
        for a in np.linspace(-62, 62, 33):
            ang = math.radians(270 + a)
            m.line([(cx + R * math.cos(ang), cy + R * math.sin(ang)),
                    (cx + (R - 900) * math.cos(ang), cy + (R - 900) * math.sin(ang))], 1.2, 255)
        g = m.arr() * inside * np.exp(np.minimum(d, 0) / 420.0)
        C = add(C, g, "#4FA6FF", 0.20)
    out = np.maximum(d, 0)
    atm = (np.exp(-out / 16.0) * 0.95 + np.exp(-out / 85.0) * 0.38 + np.exp(-out / 320.0) * 0.12) * (d > -2)
    rim = np.exp(-np.abs(d) / 5.0) * 0.9
    boost = 1.0
    if sun is not None:
        boost = 1 + 2.2 * gauss2d(sun[0], sun[1], 650, 260)
    C = add(C, atm * boost, "#3FA8FF", 0.85 * atm_gain)
    C = add(C, rim * boost, "#B8E6FF", 0.65 * atm_gain)
    return C


def sat_glyph(m, x, y, ang, s=1.0, val=255):
    ca, sa = math.cos(ang), math.sin(ang)

    def rot(px, py):
        return (x + px * ca - py * sa, y + px * sa + py * ca)

    m.poly([rot(-5 * s, -5 * s), rot(5 * s, -5 * s), rot(5 * s, 5 * s), rot(-5 * s, 5 * s)], val)
    for sign in (-1, 1):
        x0, x1 = sign * 9 * s, sign * 31 * s
        m.poly([rot(x0, -4.5 * s), rot(x1, -4.5 * s), rot(x1, 4.5 * s), rot(x0, 4.5 * s)], int(val * 0.85))
        m.line([rot(sign * 5 * s, 0), rot(x0, 0)], 1.4 * s, val)


def uav_glyph(m, x, y, s=1.0, val=255):
    for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        m.line([(x, y), (x + dx * 9 * s, y + dy * 6 * s)], 1.6 * s, val)
        m.circle(x + dx * 9 * s, y + dy * 6 * s, 4.2 * s, val, width=1.3 * s)
    m.circle(x, y, 3 * s, val)


def ch2(kind, out):
    rng = np.random.default_rng(21)
    if kind == "light":
        C = lin_grad([(0, "#FFFFFF"), (0.55, "#FFFFFF"), (1, "#EAF3FF")], 25)
        m = Mask()
        ecx, ecy, R = 2050, 3350, 2350
        m.line(ellipse_pts(ecx, ecy, R, R, 0, math.radians(235), math.radians(305), 1600), 3, 255)
        for k in range(1, 5):
            rr = R - 30 * k ** 1.5
            m.line(ellipse_pts(ecx, ecy, rr, rr, 0, math.radians(240), math.radians(300), 1600), 1.4, 120)
        C = over(C, m.arr(), "#1F6FD1", 0.30)
        m = Mask()
        o1 = ellipse_pts(1980, 2200, 1500, 1040, -9, math.radians(200), math.radians(330), 1600)
        o2 = ellipse_pts(2250, 2500, 1500, 1380, 7, math.radians(205), math.radians(320), 1600)
        m.dashed(o1, 18, 14, 2.0, 255)
        m.dashed(o2, 18, 14, 2.0, 200)
        for pts, i in ((o1, 960), (o2, 1180)):
            x, y = pts[i]
            x2, y2 = pts[i + 6]
            sat_glyph(m, x, y, math.atan2(y2 - y, x2 - x), 1.15, 255)
        C = over(C, m.arr(), "#1F6FD1", 0.40)
        finish(C, out, soft=False)
        return

    dark = kind == "dark"
    C = lin_grad([(0, "#01050F"), (0.6, "#04122B"), (1, "#0A2350")], 35)
    C = starfield(C, 1500 if not dark else 1100, 5, "#DDEBFF", 0.9)
    C = add(C, gauss2d(2000, 520, 900, 520), "#0E3A7A", 0.30)

    if dark:
        ecx, ecy, R = 2150, 3650, 2550
        sun = (2470, ecy - math.sqrt(R ** 2 - (2470 - ecx) ** 2))
    else:
        ecx, ecy, R = 1750, 3620, 2580
        sun = (2290, ecy - math.sqrt(R ** 2 - (2290 - ecx) ** 2))
    C = earth(C, ecx, ecy, R, sun=sun, atm_gain=0.9 if dark else 1.0)
    C = add(C, gauss2d(sun[0], sun[1], 14), "#FFFFFF", 1.4)
    C = add(C, gauss2d(sun[0], sun[1] - 6, 70, 46), "#FFE0A0", 0.85)
    C = add(C, gauss2d(sun[0], sun[1] - 10, 300, 180), "#FF9A45", 0.28)
    C = add(C, gauss2d(sun[0], sun[1], 620, 5), "#FFE6B8", 0.50)
    C = add(C, gauss2d(sun[0], sun[1], 360, 2.5), "#FFFFFF", 0.5)

    # orbits around the Earth (tilted ellipses) with satellites, links and beams
    def limb_y(x):
        return ecy - math.sqrt(max(R ** 2 - (x - ecx) ** 2, 0))

    if dark:
        orbits = [(R + 560, R + 380, -6, 1.0, (0.62, 0.90)), (R + 880, R + 620, 8, 0.75, (0.74,))]
    else:
        orbits = [(R + 520, R + 360, -7, 1.0, (0.77, 0.88, 0.98)), (R + 800, R + 540, 9, 0.8, (0.82, 0.95)),
                  (R + 1100, R + 780, -3, 0.6, (0.88,))]
    m_orb, m_sat, m_isl, m_beam = Mask(), Mask(), Mask(), Mask()
    sats = []
    for a, b, rot, v, fracs in orbits:
        pts = ellipse_pts(ecx, ecy, a, b, rot, math.radians(205), math.radians(335), 4000)
        vis = [p for p in pts if -40 < p[0] < W + 40 and -40 < p[1] < H + 40]
        m_orb.dashed(vis, 22, 14, 2.2, 255 * v)
        for f in fracs:
            i = min(int(f * (len(vis) - 1)), len(vis) - 9)
            x, y = vis[i]
            x2, y2 = vis[i + 8]
            if not (40 < x < W - 40 and 40 < y < H - 40):
                continue
            sat_glyph(m_sat, x, y, math.atan2(y2 - y, x2 - x), 1.35, 255)
            sats.append((x, y))
    for i, p in enumerate(sats):
        for q in sats[i + 1:]:
            if 200 < math.hypot(p[0] - q[0], p[1] - q[1]) < 720:
                m_isl.dashed([p, q], 8, 9, 1.6, 230)
    for (x, y) in sats[: (2 if dark else 3)]:
        gx = x - 120
        gy = limb_y(gx) + 6
        m_beam.poly([(x, y), (gx - 110, gy), (gx + 110, gy)], 255)
    C = add(C, blur(m_beam.arr(), 6), "#3BB8FF", 0.12)
    C = add(C, m_orb.arr(), "#8FD3FF", 0.42)
    C = glow(C, m_isl.arr(), "#7FE8FF", 0.35)
    C = glow(C, m_sat.arr(), "#EAF6FF", 0.9)

    if not dark:
        m, ml = Mask(), Mask()
        uavs = [(x, limb_y(x) - off) for x, off in ((1840, 150), (2000, 190), (2160, 160), (2480, 175))]
        for (x, y) in uavs:
            uav_glyph(m, x, y, 1.3, 255)
            ml.dashed([(x, y + 12), (x + 30, limb_y(x + 30) - 4)], 6, 7, 1.5, 220)
        for p, q in zip(uavs, uavs[1:]):
            ml.dashed([p, q], 6, 7, 1.4, 190)
        ml.dashed([uavs[2], sats[0]], 6, 7, 1.4, 170)
        C = glow(C, m.arr(), "#FFD27A", 0.55)
        C = add(C, ml.arr(), "#FFD27A", 0.35)

    C = vignette_left(C, 0.08 if dark else 0.14, 0.60, 0.55 if dark else 0.45)
    finish(C, out, 0.010, 2)


# ----------------------------------------------------------------------------- Ch3 transceivers
def helix(C, x0, x1, y0, A, turns, color, gain, view=1.5, vectors=True, width=3.0):
    """Circularly polarised field: the E-vector tip traces a helix around the x axis.
    Viewed obliquely (screen_x = x + view * z); the far half of each turn is thinner and dimmer."""
    n = 8000
    xs = np.linspace(x0, x1, n)
    th = 2 * math.pi * turns * (xs - x0) / (x1 - x0)
    ey, ez = A * np.cos(th), A * np.sin(th)
    sx, sy = xs + view * ez, y0 - ey
    near = ez < 0
    front, back, vec, axis = Mask(), Mask(), Mask(), Mask()
    pts = np.stack([sx, sy], 1)
    for mask, sel, w in ((front, near, width), (back, ~near, width * 0.66)):
        run = []
        for i in range(n):
            if sel[i]:
                run.append(tuple(pts[i]))
            elif run:
                mask.line(run, w, 255)
                run = []
        if run:
            mask.line(run, w, 255)
    if vectors:
        step = n // int(turns * 8)
        for i in range(step // 2, n, step):
            arrow(vec, xs[i], y0, sx[i], sy[i], 1.2, 8, 230 if near[i] else 120)
    axis.dashed([(x0 - 60, y0), (x1 + 80, y0)], 14, 10, 1.6, 200)
    fx = smoothstep(x0 - 160, x0 + 160, XX) * smoothstep(x1 + 160, x1 - 160, XX)
    C = add(C, axis.arr(), color, 0.25 * gain)
    C = add(C, vec.arr() * fx, color, 0.30 * gain)
    C = glow(C, back.arr() * fx, color, 0.55 * gain)
    C = glow(C, front.arr() * fx, color, 1.0 * gain)
    return C


def pol_states(m, ma, cx0, cx1, cy, R, k=9):
    """Row of polarisation ellipses: linear -> elliptical -> circular -> elliptical -> linear."""
    for i in range(k):
        u = i / (k - 1)
        x = cx0 + u * (cx1 - cx0)
        chi = math.pi / 4 * math.sin(math.pi * u)  # ellipticity angle 0 .. 45 deg .. 0
        psi = 90 * u - 45                           # orientation sweeps -45 .. 45 deg
        a, b = R * math.cos(chi), max(R * math.sin(chi), 0.5)
        m.line(ellipse_pts(x, cy, a, b, psi, 0, 2 * math.pi, 300), 2.6, 255)
        if b > 6:
            p0, p1 = ellipse_pts(x, cy, a, b, psi, 1.2, 1.35, 2)
            arrow(ma, p0[0], p0[1], p1[0], p1[1], 2.6, 16, 255)
        m.line([(x - R * 1.15, cy), (x + R * 1.15, cy)], 1.0, 70)
        m.line([(x, cy - R * 1.15), (x, cy + R * 1.15)], 1.0, 70)


def atom(C, cx, cy, s, gain=1.0, electron="#FFD36B"):
    m = Mask()
    for rot in (0, 60, 120):
        m.line(ellipse_pts(cx, cy, 300 * s, 92 * s, rot), 2.4, 255)
    C = glow(C, m.arr(), "#5FF2D6", 0.55 * gain)
    m = Mask()
    big = ellipse_pts(cx + 160 * s, cy - 40 * s, 720 * s, 270 * s, -18)
    m.dashed(big, 20, 14, 2.0, 255)
    C = glow(C, m.arr(), "#9AF7E6", 0.35 * gain)
    m = Mask()
    for rot, ang in ((0, 0.6), (60, 2.4), (120, 4.3)):
        x, y = ellipse_pts(cx, cy, 300 * s, 92 * s, rot, ang, ang + 0.001, 2)[0]
        m.circle(x, y, 7 * s)
    C = glow(C, m.arr(), "#C9FFF4", 0.9 * gain)
    ex, ey = big[300]
    m = Mask()
    m.circle(ex, ey, 11 * s)
    C = glow(C, m.arr(), electron, 1.1 * gain, ((5, 1.0), (24, 0.8), (80, 0.5)))
    m = Mask()
    m.circle(cx, cy, 26 * s)
    C = glow(C, m.arr(), "#E9FFFB", 1.0 * gain, ((8, 1.0), (34, 0.8), (120, 0.5)))
    return C


def poincare(C, cx, cy, Rs, color, gain):
    front, back = Mask(), Mask()
    front.line(ellipse_pts(cx, cy, Rs, Rs), 2.4, 255)
    for lat in (-50, -25, 0, 25, 50):
        r = Rs * math.cos(math.radians(lat))
        yc = cy - Rs * math.sin(math.radians(lat))
        front.line(ellipse_pts(cx, yc, r, r * 0.30, 0, 0, math.pi, 500), 1.6 if lat else 2.2, 255)
        back.dashed(ellipse_pts(cx, yc, r, r * 0.30, 0, math.pi, 2 * math.pi, 500), 8, 8, 1.2, 255)
    for lon in (0, 40, 80, 120, 160):
        a = Rs * abs(math.cos(math.radians(lon)))
        if a < 4:
            front.line([(cx, cy - Rs), (cx, cy + Rs)], 1.6, 255)
            continue
        half = (math.pi / 2, 3 * math.pi / 2) if lon < 90 else (-math.pi / 2, math.pi / 2)
        front.line(ellipse_pts(cx, cy, a, Rs, 0, half[0], half[1], 500), 1.6, 255)
    front.line([(cx - Rs * 1.25, cy), (cx + Rs * 1.25, cy)], 1.2, 180)
    front.line([(cx, cy - Rs * 1.25), (cx, cy + Rs * 1.25)], 1.2, 180)
    C = add(C, back.arr(), color, 0.18 * gain)
    C = glow(C, front.arr(), color, 0.38 * gain)
    m = Mask()
    path = []
    for t in np.linspace(0, 1, 300):
        lon = math.radians(-40 + 150 * t)
        lat = math.radians(10 + 45 * math.sin(math.pi * t))
        x = cx + Rs * math.cos(lat) * math.sin(lon)
        y = cy - Rs * math.sin(lat) + 0.30 * Rs * math.cos(lat) * math.cos(lon) * 0.35
        path.append((x, y))
    m.line(path, 3.0, 255)
    C = glow(C, m.arr(), "#FFD36B", 0.55 * gain)
    m = Mask()
    m.circle(*path[-1], 10)
    C = glow(C, m.arr(), "#FFE9A8", 1.0 * gain)
    return C


def eit_ladder(C, x0, y0, s, gain):
    """Ladder scheme |g> -> |e> (probe, red) -> |r> (coupling, blue) -> |r'> (RF, aqua)."""
    m_lv, m_r, m_b, m_rf = Mask(), Mask(), Mask(), Mask()
    levels = [y0, y0 - 220 * s, y0 - 420 * s, y0 - 500 * s]
    for i, y in enumerate(levels):
        m_lv.line([(x0, y), (x0 + 210 * s, y)], 3.0, 255)
    arrow(m_r, x0 + 60 * s, levels[0] - 6, x0 + 60 * s, levels[1] + 8, 4, 18)
    arrow(m_b, x0 + 105 * s, levels[1] - 6, x0 + 105 * s, levels[2] + 8, 4, 18)
    ys = np.linspace(levels[2] - 6, levels[3] + 10, 120)
    xs = x0 + 160 * s + 9 * s * np.sin(np.linspace(0, 6 * math.pi, 120))
    m_rf.line(list(zip(xs, ys)), 3.0, 255)
    C = add(C, m_lv.arr(), "#CFFAF1", 0.55 * gain)
    C = glow(C, m_r.arr(), "#FF4F6A", 0.75 * gain)
    C = glow(C, m_b.arr(), "#4F8CFF", 0.75 * gain)
    C = glow(C, m_rf.arr(), "#5FF2D6", 0.75 * gain)
    return C


def ch3(kind, out):
    rng = np.random.default_rng(31)
    if kind == "light":
        C = lin_grad([(0, "#FFFFFF"), (0.55, "#FFFFFF"), (1, "#E8FAF6")], 25)
        m, ma = Mask(), Mask()
        pol_states(m, ma, 1480, 2380, 1200, 52, k=7)
        C = over(C, m.arr(), "#0E9F8A", 0.36)
        C = over(C, ma.arr(), "#E0A21B", 0.45)
        finish(C, out, soft=False)
        return

    dark = kind == "dark"
    C = lin_grad([(0, "#011112"), (0.6, "#042526"), (1, "#083C3B")], 20)
    C = starfield(C, 350, 7, "#BFFFF2", 0.25)
    if dark:
        C = add(C, gauss2d(2060, 700, 620, 520), "#0F6E66", 0.38)
        C = poincare(C, 2060, 700, 430, "#5FF2D6", 1.0)
        C = eit_ladder(C, 1330, 1220, 0.75, 0.8)
    else:
        C = add(C, gauss2d(1950, 620, 760, 560), "#0F7A70", 0.48)
        C = add(C, gauss2d(2350, 1150, 420), "#4F8CFF", 0.10)
        C = atom(C, 1930, 600, 1.05)
        C = helix(C, 1380, 2560, 1075, 92, 4.6, "#5FF2D6", 0.85)
        m = Mask()
        m.line([(1380, 1075), (2600, 1075)], 2.0, 255)
        C = glow(C, m.arr() * smoothstep(1380, 1900, XX), "#FF4F6A", 0.35)
        m = Mask()
        for _ in range(14):
            x, y = rng.uniform(1100, 2500), rng.uniform(150, 1000)
            r = rng.uniform(18, 38)
            m.line(ellipse_pts(x, y, r, r * rng.uniform(0.3, 0.7), rng.uniform(0, 180)), 1.5, 255)
        C = add(C, m.arr(), "#7FF5DF", 0.20)
    C = vignette_left(C, 0.10 if dark else 0.14, 0.60, 0.55 if dark else 0.42)
    finish(C, out, 0.010, 3)


# ----------------------------------------------------------------------------- Ch4 terahertz
def chirp_strands(C, x0, x1, y0, A, f0, f1, n_str, colors, gain, width=2.2):
    xs = np.linspace(x0, x1, 5000)
    t = (xs - x0) / (x1 - x0)
    env = np.sin(np.pi * t) ** 0.5 * (1 - 0.45 * t)
    for i in range(n_str):
        ph = 2 * math.pi * (f0 * t + 0.5 * (f1 - f0) * t ** 2) + i * 0.9
        y = y0 + (i - n_str / 2) * 9 + A * (1 - 0.12 * i) * env * np.sin(ph)
        m = Mask()
        m.line(list(zip(xs, y)), width, 255)
        C = glow(C, m.arr(), colors[i % len(colors)], gain * (0.55 + 0.1 * (i % 3)))
    return C


def spectrum_lines(C, x0, x1, y0, hmax, gain, rng, hot=(0.62, 0.80)):
    stops = [(0, "#7A1FA2"), (0.35, "#E0307A"), (0.6, "#FF5E57"), (0.78, "#FF9F43"), (1, "#FFE08A")]
    ps = [p for p, _ in stops]
    cols = [rgb(c) for _, c in stops]
    n = 240
    bins = {}
    for i in range(n):
        u = i / (n - 1)
        x = x0 + u * (x1 - x0)
        inhot = hot[0] <= u <= hot[1]
        h = hmax * (0.25 + 0.75 * rng.random() ** 2) * (1.6 if inhot else 1.0)
        b = int(u * 11)
        bins.setdefault(b, []).append((x, h, 255 if inhot else 150))
    for b, items in bins.items():
        m = Mask()
        for (x, h, v) in items:
            m.line([(x, y0 - h / 2), (x, y0 + h / 2)], 2.2, v)
        u = (b + 0.5) / 12
        col = np.array([np.interp(u, ps, [c[k] for c in cols]) for k in range(3)], np.float32)
        hexcol = "#%02X%02X%02X" % tuple(int(v * 255) for v in col)
        C = glow(C, m.arr(), hexcol, gain, ((3, 0.7), (14, 0.4)))
    return C


def ch4(kind, out):
    rng = np.random.default_rng(41)
    if kind == "light":
        C = lin_grad([(0, "#FFFFFF"), (0.55, "#FFFFFF"), (1, "#FFEFF5")], 25)
        L = chirp_strands(np.zeros_like(C), 1150, 2620, 1250, 80, 2, 34, 4, ["#FFFFFF"], 0.6, 2.0)
        C = over(C, np.clip(L.mean(axis=2), 0, 1), "#D6336C", 0.35)
        m = Mask()
        for i in range(70):
            u = i / 69
            x = 1650 + u * 900
            h = 28 + 60 * rng.random() ** 2 * (1.5 if 0.55 < u < 0.8 else 1)
            m.line([(x, 1395 - h), (x, 1395)], 2.0, 140 + 115 * (0.55 < u < 0.8))
        C = over(C, m.arr(), "#F08C2E", 0.28)
        finish(C, out, soft=False)
        return

    dark = kind == "dark"
    C = lin_grad([(0, "#0B0412"), (0.6, "#1D0828"), (1, "#3A0E3E")], 20)
    C = add(C, gauss2d(2050, 620, 820, 520), "#8E1F6B", 0.42 if dark else 0.55)
    C = add(C, gauss2d(2350, 1050, 420), "#FF8A3D", 0.10)
    C = starfield(C, 420, 9, "#FFD6E8", 0.25)
    m = Mask()
    for _ in range(26):
        x, y, r = rng.uniform(1100, 2560), rng.uniform(80, 1360), rng.uniform(10, 46)
        m.circle(x, y, r, val=rng.uniform(40, 120))
    C = add(C, blur(m.arr(), 6), "#FF7AB0", 0.25)
    if dark:
        C = chirp_strands(C, 1250, 2650, 640, 140, 2, 38, 4, ["#FF4D8D", "#FF9F43", "#FFD166"], 0.38)
        C = spectrum_lines(C, 1350, 2560, 1235, 110, 0.32, rng)
    else:
        C = chirp_strands(C, 1450, 2650, 610, 200, 1.2, 30, 6, ["#FF4D8D", "#FF7A5C", "#FF9F43", "#FFD166"], 0.55)
        C = spectrum_lines(C, 1650, 2560, 1150, 150, 0.45, rng)
        m = Mask()
        ox, oy = 2620, 1000
        for k, ang in enumerate(np.linspace(200, 228, 4)):
            a = math.radians(ang)
            L = 1500
            w = math.radians(0.55)
            m.poly([(ox, oy), (ox + L * math.cos(a - w), oy + L * math.sin(a - w)),
                    (ox + L * math.cos(a + w), oy + L * math.sin(a + w))], 255)
        beams = m.arr() * np.exp(-np.hypot(XX - ox, YY - oy) / 900)
        C = add(C, blur(beams, 4), "#FFC4D9", 0.18)
    C = vignette_left(C, 0.10 if dark else 0.14, 0.60, 0.55 if dark else 0.42)
    finish(C, out, 0.010, 4)


# ----------------------------------------------------------------------------- Ch5 outlook
def ch5(kind, out):
    rng = np.random.default_rng(51)
    if kind == "light":
        C = lin_grad([(0, "#FFFFFF"), (0.55, "#FFFFFF"), (1, "#FFF1E6")], 25)
        hz, vx = 1140, 2250
        m = Mask()
        for xb in np.arange(-40000, 40000, 150):
            m.line([(vx, hz), (vx + (xb - vx) * 1.0, H + 400)], 1.6, 255)
        for i in range(1, 9):
            y = hz + (H - hz) * (i / 8) ** 2.1
            m.line([(0, y), (W, y)], 1.6, 255)
        fade = smoothstep(hz, hz + 160, YY) * smoothstep(1300, 2300, XX)
        C = over(C, m.arr() * fade, "#E07B39", 0.30)
        C = over(C, gauss2d(vx, hz, 420, 120), "#FFB36B", 0.28)
        finish(C, out, soft=False)
        return

    dark = kind == "dark"
    hz = 1060 if not dark else 1000
    vx = 2100 if not dark else 2150
    h = hz / H
    sky = lin_grad([(0, "#03051A"), (0.62 * h, "#140F44"), (0.92 * h, "#3A1F66"), (h - 0.004, "#8C3E73"),
                    (h + 0.012, "#120C30"), (1, "#05061A")], 90)
    C = sky
    C = add(C, gauss2d(vx, hz, 900, 260) * (YY < hz), "#FF7A59", 0.35 if dark else 0.45)
    C = starfield(C, 900, 13, "#E6E9FF", 0.6, weight=np.clip(1 - YY / hz, 0, 1) ** 1.5)

    # sun and rays
    m = Mask()
    for k in range(14):
        a = math.radians(190 + k * (160 / 13))
        w = math.radians(2.0)
        L = 1600
        m.poly([(vx, hz), (vx + L * math.cos(a - w), hz + L * math.sin(a - w)),
                (vx + L * math.cos(a + w), hz + L * math.sin(a + w))], 255)
    rays = blur(m.arr(), 18) * (YY < hz) * np.exp(-np.hypot(XX - vx, YY - hz) / 700)
    C = add(C, rays, "#FFC27A", 0.20 if dark else 0.28)
    disk = np.clip(0.5 - (np.hypot(XX - vx, YY - hz) - (95 if not dark else 70)), 0, 1) * (YY < hz)
    C = C * (1 - disk[..., None]) + disk[..., None] * (lin_grad([(0, "#FFF4D6"), (1, "#FFB35C")], 90))
    C = add(C, gauss2d(vx, hz, 200, 90), "#FFD27A", 0.6)
    C = add(C, gauss2d(vx, hz, 650, 5), "#FFE2B0", 0.45)

    # perspective grid on the ground
    m = Mask()
    for xb in np.arange(-40000, 40000, 170):
        m.line([(vx, hz), (xb, H + 600)], 2.0, 255)
    n = 11
    for i in range(1, n + 1):
        y = hz + (H - hz) * (i / n) ** 2.0
        m.line([(0, y), (W, y)], 2.0, 255)
    fade = smoothstep(hz + 4, hz + 220, YY) * (YY > hz)
    g = m.arr() * fade
    C = glow(C, g, "#FF9E5E", 0.40 if dark else 0.55, ((3, 0.6), (12, 0.35)))

    # future network in the sky
    m = Mask()
    network(m, rng, 22 if not dark else 16, 1250 if not dark else 1600, 2520, 110, hz - 260,
            k=2, width=1.4, val=220, dot=3.6)
    C = glow(C, m.arr(), "#A9C1FF", 0.35)

    C = vignette_left(C, 0.08 if dark else 0.12, 0.58, 0.55 if dark else 0.45)
    finish(C, out, 0.010, 5)


CHAPTERS = {"ch1": ch1, "ch2": ch2, "ch3": ch3, "ch4": ch4, "ch5": ch5}

if __name__ == "__main__":
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    which = sys.argv[2:] or list(CHAPTERS)
    for ch in which:
        for kind in ("cover", "dark", "light"):
            CHAPTERS[ch](kind, os.path.join(out_dir, f"{ch}_{kind}.jpg"))
