"""Plot route weather at the estimated arrival time of each trail point."""

import argparse
import json
from datetime import date, datetime, time, timedelta, timezone
from itertools import accumulate
from pathlib import Path
from zoneinfo import ZoneInfo

from weather_extract.trail_profile import elevation_figure
from weather_extract.weather_data import ForecastError, fetch_route_forecasts


ROUTES_PATH = Path(__file__).resolve().parents[1] / "route_data" / "routes.json"
DEFAULT_ROUTE = "lynn-peak"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    routes = json.loads(ROUTES_PATH.read_text(encoding="utf-8"))
    parser.add_argument("--route", metavar="ROUTE_ID", default=DEFAULT_ROUTE,
                        help="Route ID from route_data/routes.json (default: %(default)s)")
    parser.add_argument("--date", metavar="YYYY-MM-DD", type=date.fromisoformat,
                        help="Departure date in the route's local time (default: today)")
    departure = parser.add_mutually_exclusive_group(required=True)
    departure.add_argument("--start", metavar="HH:MM", help="Planned departure time in the route's local time")
    departure.add_argument("--hour", type=int, choices=range(24), metavar="0–23",
                           help="Planned departure on the hour in the route's local time")
    args = parser.parse_args()
    if args.route not in routes:
        parser.error(f"Unknown route {args.route!r}. See route_data/routes.json for route IDs.")
    try:
        start_time = datetime.strptime(args.start, "%H:%M").time() if args.start else time(args.hour)
    except ValueError:
        parser.error("--start must be a local time such as 09:30")

    route = routes[args.route]
    zone = ZoneInfo(route["timezone"])
    start = datetime.combine(args.date or datetime.now(zone).date(), start_time, tzinfo=zone)
    start_utc = start.astimezone(timezone.utc)
    if start_utc.astimezone(zone).time() != start_time:
        parser.error("This local departure time does not exist on the selected date")

    profile_path = ROUTES_PATH.parent / route["profile"]
    try:
        trail = json.loads(profile_path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        parser.error(f"Could not read the profile for {args.route}: {exc}")
    points = trail["points"]
    profile = [(point["distance_m"] / 1000, point["elevation_m"]) for point in points]
    coordinates = [(point["latitude"], point["longitude"]) for point in points]
    arrivals = [
        start_utc + timedelta(minutes=minutes)
        for minutes in accumulate((segment["time_min"] for segment in trail["segments"]), initial=0)
    ]
    if len(arrivals) != len(points):
        parser.error("The trail profile must have one travel time between each pair of points")

    try:
        local_day_start = datetime.combine(start.date(), time.min, tzinfo=zone)
        local_day_end = datetime.combine(start.date(), time.max, tzinfo=zone)
        forecasts = fetch_route_forecasts(
            coordinates,
            local_day_start.astimezone(timezone.utc).date(),
            max(local_day_end.astimezone(timezone.utc).date(), arrivals[-1].date()),
        )
    except ForecastError as exc:
        print(exc)
        forecasts = ()

    levels = []
    details = []
    point_forecasts = forecasts or (None,) * len(arrivals)
    for arrival, forecast in zip(arrivals, point_forecasts, strict=True):
        utc_hour = arrival.replace(minute=0, second=0, microsecond=0, tzinfo=None)
        hours = forecast.hours if forecast else ()
        weather = next((hour for hour in hours if hour.local_time == utc_hour), None)
        level = weather.freezing_level_m if weather else None
        snow = weather.snowfall_cm if weather else None
        levels.append(level)
        level_text = f"{level:g} m" if level is not None else "unavailable"
        snow_text = f"{snow:g} cm" if snow is not None else "unavailable"
        details.append(
            f"Estimated arrival: {arrival.astimezone(zone):%Y-%m-%d %H:%M %Z}<br>"
            f"Forecast hour: {utc_hour.replace(tzinfo=timezone.utc).astimezone(zone):%H:%M %Z}<br>"
            f"Freezing level: {level_text}<br>Snowfall in preceding hour: {snow_text}"
        )

    print(f"Planned departure: {start:%Y-%m-%d %H:%M %Z}")
    print(f"Estimated arrival at route end: {arrivals[-1].astimezone(zone):%Y-%m-%d %H:%M %Z}")
    if forecasts:
        local_sunsets = [
            sunset.replace(tzinfo=timezone.utc).astimezone(zone)
            for sunset in forecasts[0].sunsets.values() if sunset is not None
        ]
        sunset = next((value for value in local_sunsets if value.date() == start.date()), None)
        if sunset:
            print(f"Local sunset on departure day: {sunset:%H:%M %Z}")

    figure = elevation_figure(profile, levels, point_details=details)
    note = "Estimates use terrain-only walking times. Forecast snowfall and freezing levels do not establish trail snow cover."
    figure.update_layout(
        title=f"{trail['trail']}<br><sup>{note}</sup>",
        meta={"attribution": trail["attribution"], "geometry_source": trail["geometry_source_url"]},
    )
    figure.write_html("elevation_profile.html")
    print("Open elevation_profile.html to view the chart.")


if __name__ == "__main__":
    main()
