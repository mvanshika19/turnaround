"""Conditions and verdict model (owner: data scientist 2).

This package is a placeholder until the conditions model lands. It will expose:

``get_conditions(trail: Trail, day: date) -> Conditions``
    Fetch the Open-Meteo forecast for the trail and day (temperature, freezing
    level, precipitation) and compute sunset and last light with ``astral``.
    Responses are cached on disk in ``data/cache/``.

``assess(trail: Trail, etas: list[PointETA], conditions: Conditions, gear: Gear) -> Verdict``
    Turn the pace predictions and the conditions into a ``Verdict`` with
    plain-language reasons.

``app/planning/`` will gain a ``ModelPlanner`` that composes ``app.pace`` and this
package. It is selected with ``TURNAROUND_PLANNER=model``; until it exists the
mock planner is the only choice.
"""
