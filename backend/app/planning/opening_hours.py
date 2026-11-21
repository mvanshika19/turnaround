"""Checks whether a planned hike fits verified park access hours."""

from datetime import datetime, time

from app.contracts import OpeningCheck, OpeningHours, OpeningStatus, Trail


def _clock(value: time) -> str:
    """Format a wall-clock time in the app's compact 12-hour style."""
    return value.strftime("%I:%M %p").lstrip("0")


def check_opening_window(trail: Trail, start: datetime, finish: datetime) -> OpeningCheck:
    """Check the complete start-to-finish window against a trail's known daily access hours."""
    hours: OpeningHours | None = trail.opening_hours
    if hours is None:
        return OpeningCheck(
            status=OpeningStatus.UNVERIFIED,
            message="Park access hours are not verified for this trail. Check the land manager's current guidance.",
        )

    opens_at = datetime.combine(start.date(), hours.opens_at, tzinfo=start.tzinfo)
    closes_at = datetime.combine(start.date(), hours.closes_at, tzinfo=start.tzinfo)
    if start >= opens_at and finish <= closes_at:
        window = f"{_clock(hours.opens_at)}-{_clock(hours.closes_at)}"
        message = f"Your slow-day finish fits the conservative access window ({window})."
        status = OpeningStatus.FITS
    elif start < opens_at:
        message = f"The park opens at {_clock(hours.opens_at)}; your proposed start is too early."
        status = OpeningStatus.OUTSIDE_HOURS
    else:
        message = f"Your slow-day finish is after the park closes at {_clock(hours.closes_at)}."
        status = OpeningStatus.OUTSIDE_HOURS

    return OpeningCheck(
        status=status,
        opens_at=hours.opens_at,
        closes_at=hours.closes_at,
        source_url=hours.source_url,
        message=f"{message} {hours.note}",
    )
