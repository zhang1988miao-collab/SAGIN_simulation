"""Matplotlib helpers with one consistent, colour-blind-safe style."""
from __future__ import annotations

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402

# categorical slots, always assigned in this order
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4",
          "#008300", "#4a3aa7", "#e34948"]
INK, INK2, MUTED = "#0b0b0b", "#52514e", "#898781"
GRID, AXIS, SURFACE = "#e1e0d9", "#c3c2b7", "#fcfcfb"
# single-hue sequential ramp (light -> dark) for heatmaps
SEQ = LinearSegmentedColormap.from_list(
    "seq_blue", ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf",
                 "#184f95", "#0d366b"])
SEQ_R = SEQ.reversed()

# fixed colour / marker / dash per scheme so an entity keeps its look everywhere
SCHEME_STYLE = {
    "Exhaustive search": dict(color=SERIES[0], marker="o", ls="-"),
    "GRASP user scheduling": dict(color=SERIES[1], marker="^", ls="--"),
    "Greedy user scheduling": dict(color=SERIES[2], marker="s", ls="-."),
    "Time division": dict(color=SERIES[3], marker="D", ls=":"),
    "Opportunistic user scheduling": dict(color=SERIES[4], marker="v", ls=(0, (1, 1))),
}

plt.rcParams.update({
    "figure.dpi": 110, "savefig.dpi": 200, "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE, "savefig.facecolor": SURFACE,
    "font.family": "sans-serif", "font.size": 10,
    "axes.edgecolor": AXIS, "axes.labelcolor": INK2, "axes.titlecolor": INK,
    "axes.titlesize": 10.5, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6,
    "xtick.color": MUTED, "ytick.color": MUTED, "xtick.labelcolor": INK2,
    "ytick.labelcolor": INK2, "legend.frameon": True, "legend.framealpha": 0.92,
    "legend.edgecolor": GRID, "legend.fontsize": 8.5, "lines.linewidth": 1.6,
    "lines.markersize": 5.5, "axes.spines.top": False, "axes.spines.right": False,
})


def line_figure(x, series, xlabel, ylabel, title=None, styles=None, xticks=None,
                xticklabels=None, figsize=(5.6, 4.0), ylim=None, legend_loc="best"):
    """series: dict label -> y values. styles: dict label -> plot kwargs."""
    fig, ax = plt.subplots(figsize=figsize)
    for i, (label, y) in enumerate(series.items()):
        st = dict(color=SERIES[i % len(SERIES)], marker="o", ls="-")
        if styles and label in styles:
            st.update(styles[label])
        ax.plot(x, y, label=label, markerfacecolor=SURFACE, markeredgewidth=1.3, **st)
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    if title:
        ax.set_title(title, loc="left")
    if xticks is not None:
        ax.set_xticks(xticks)
        if xticklabels is not None:
            ax.set_xticklabels(xticklabels)
    if ylim is not None:
        ax.set_ylim(*ylim)
    if len(series) > 1:
        ax.legend(loc=legend_loc)
    fig.tight_layout()
    return fig, ax


def heatmap_panel(ax, xs_km, ys_km, Z, users_km, star_km, star_label, cbar_label,
                  cmap=SEQ, title=None):
    """Map of Z over UAV positions, users (squares) and the optimized UAV position (star).

    star_label (one line, e.g. "Algorithm 2: eta = 0.86 at (1.0, 2.0) km") is shown
    under the panel title so it never hides the map.
    """
    im = ax.pcolormesh(xs_km, ys_km, Z, cmap=cmap, shading="auto", rasterized=True)
    cb = ax.figure.colorbar(im, ax=ax, fraction=0.046, pad=0.03)
    cb.set_label(cbar_label, color=INK2)
    cb.outline.set_edgecolor(AXIS)
    ax.scatter(users_km[:, 0], users_km[:, 1], marker="s", s=36, facecolor="white",
               edgecolor=INK, linewidth=1.0, label="Users", zorder=3)
    ax.scatter([star_km[0]], [star_km[1]], marker="*", s=220, facecolor=SERIES[3],
               edgecolor=INK, linewidth=0.9, label="Optimized", zorder=4, clip_on=False)
    ax.set_xlabel("X axis (km)")
    ax.set_ylabel("Y axis (km)")
    ax.set_aspect("equal")
    ax.grid(False)
    ax.legend(loc="best", fontsize=7.5)
    ax.set_title("\n".join(t for t in (title, star_label) if t), loc="left")
    return im


def save(fig, path):
    fig.savefig(path, bbox_inches="tight")
    plt.close(fig)


def pad(seq, n):
    seq = list(seq)
    return np.array(seq + [seq[-1]] * (n - len(seq)))[:n]
