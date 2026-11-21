"""Compare a trail elevation profile against forecast freezing levels."""

from collections.abc import Sequence
from math import isfinite

import plotly.graph_objects as go


def sections_above_freezing(
    profile: Sequence[tuple[float, float]],
    freezing_level_m: float | Sequence[float | None] | None,
) -> list[list[tuple[float, float]]] | None:
    """Return highlighted polylines as (distance km, elevation m), or None if unknown.

    The first and last distances of each polyline give the section's extent.
    Interpolated endpoints show where the profile reaches the threshold.
    """
    if len(profile) < 2 or any(
        not isfinite(distance) or not isfinite(elevation) or distance < 0
        for distance, elevation in profile
    ):
        raise ValueError("Provide at least two finite trail points with nonnegative distances.")
    pairs = list(zip(profile, profile[1:]))
    if any(left[0] >= right[0] for left, right in pairs):
        raise ValueError("Trail distances must increase strictly.")
    if freezing_level_m is None:
        return None
    levels = (
        freezing_level_m if isinstance(freezing_level_m, Sequence)
        else [freezing_level_m] * len(profile)
    )
    if len(levels) != len(profile) or any(level is not None and not isfinite(level) for level in levels):
        raise ValueError("Provide a finite freezing level or one level per trail point, with None for missing values.")
    if all(level is None for level in levels):
        return None

    sections: list[list[tuple[float, float]]] = []
    for (left, right), left_level, right_level in zip(pairs, levels, levels[1:]):
        if left_level is None or right_level is None:
            continue
        left_difference = left[1] - left_level
        right_difference = right[1] - right_level
        left_above = left_difference > 0
        right_above = right_difference > 0
        if not (left_above or right_above):
            continue
        start, end = left, right
        if left_above != right_above:
            fraction = left_difference / (left_difference - right_difference)
            crossing = (
                left[0] + fraction * (right[0] - left[0]),
                left[1] + fraction * (right[1] - left[1]),
            )
            if left_above:
                end = crossing
            else:
                start = crossing
        if sections and left_above and sections[-1][-1] == left:
            sections[-1].append(end)
        else:
            sections.append([start, end])
    return sections


def elevation_figure(
    profile: Sequence[tuple[float, float]],
    freezing_level_m: float | Sequence[float | None] | None,
    *,
    point_details: Sequence[str] | None = None,
) -> go.Figure:
    """Build a Plotly figure suitable for st.plotly_chart."""
    sections = sections_above_freezing(profile, freezing_level_m)
    distances, elevations = zip(*profile)
    figure = go.Figure(go.Scatter(
        x=distances, y=elevations, mode="lines+markers" if point_details is not None else "lines",
        name="Trail elevation", text=point_details,
        hovertemplate="%{x:.2f} km · %{y:g} m<br>%{text}<extra></extra>" if point_details is not None else None,
        line={"color": "#16756f", "width": 3},
    ))
    if sections is not None:
        if isinstance(freezing_level_m, Sequence):
            level_distances, levels = distances, freezing_level_m
        else:
            level_distances = [distances[0], distances[-1]]
            levels = [freezing_level_m] * 2
        figure.add_scatter(
            x=level_distances, y=levels, mode="lines", name="Forecast freezing level",
            line={"color": "#446da9", "dash": "dash"},
        )
    for index, section in enumerate(sections or []):
        x, y = zip(*section)
        figure.add_scatter(
            x=x, y=y, mode="lines", name="Above forecast freezing level",
            legendgroup="above", showlegend=index == 0,
            hoverinfo="skip",
            line={"color": "#c25a15", "width": 5},
        )
    figure.update_layout(
        title="Trail elevation" if sections is not None else "Trail elevation · Forecast freezing level unavailable",
        xaxis_title="Distance along trail (km)",
        yaxis_title="Elevation (m above sea level)",
        template="plotly_white",
    )
    return figure
