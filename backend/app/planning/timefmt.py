"""Small time helpers shared by planners."""

import math
from datetime import time, timedelta


def format_clock(value: time) -> str:
    """Format a wall-clock time for humans, e.g. ``"1:00 pm"`` or ``"11:45 am"``."""
    hour = value.hour % 12 or 12
    suffix = "am" if value.hour < 12 else "pm"
    return f"{hour}:{value.minute:02d} {suffix}"


def ceil_minutes(delta: timedelta) -> int:
    """Return ``delta`` in minutes rounded up, never less than 1 (for messages that state a non-zero gap)."""
    return max(1, math.ceil(delta.total_seconds() / 60))


def whole_minutes(delta: timedelta) -> int:
    """Return ``delta`` in minutes, rounded to the nearest whole minute."""
    return round(delta.total_seconds() / 60)
