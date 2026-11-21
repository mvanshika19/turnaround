"""Pace model (owner: data scientist 1).

This package is a placeholder until the pace model lands. It will expose:

``fit_profile(gpx_bytes: bytes) -> PaceProfile``
    Fit a personal pace profile from an uploaded GPX recording of a past hike.

``predict_pace(trail: Trail, start: datetime, profile: PaceProfile,
multipliers: list[float] | None = None) -> list[PointETA]``
    Predict the time of arrival at every trail point, both up and down. The
    baseline is Tobler's hiking function, adjusted by the personal profile.
    ``multipliers`` optionally scales speed per segment (for example snow or
    darkness) so the verdict logic can re-run the walk under harsher conditions.
    Each ``PointETA`` carries a likely (P50) and a slow-day (P90) time.

``PaceProfile`` and ``PointETA`` are defined in this package; the HTTP contract in
``app.contracts`` stays the single source of truth for what crosses the API.
"""
