# turnaround
Turnaround tells a North Shore hiker the latest time to turn around so they are off the trail before dark and below the snow. 

## Route weather forecast

With Python 3.10 or later, install the dependencies and run the route forecast.

```sh
python -m pip install -r weather_extract/requirements.txt
python -m weather_extract.route_forecast --route lynn-peak --start 09:30
```

`--date YYYY-MM-DD` and `--start HH:MM` specify the departure in the route's
local time. Omit the date to use today. Use `--hour 12` for a noon departure.
The command gets the profile path and time zone from `route_data/routes.json` using
the route ID. Use `--route lynn-peak` (the default), `--route grouse-grind`, or
any DNV route ID listed in that file.
The command adds the
estimated segment walking times and matches each point to its location's
forecast for the hour of arrival.
Open `elevation_profile.html` and hover over a point to see the estimated arrival,
freezing level, and forecast snowfall for the preceding hour. The walking estimate
uses terrain alone, and the forecast does not establish snow cover on the trail.

The route profiles contain information licensed under the Open Government Licence - North Vancouver.

All profiles live in `route_data/processed/dnv/` and use lowercase, underscore-separated
names such as `lynn_peak_profile.json`. Profiles with matching trail names use
the source asset ID to distinguish them. Connected
lines with the same name are joined at matching endpoints and split at junctions.
Disconnected lines get separate profiles; unnamed lines use their source asset IDs.
These generated routes follow the stored line direction. Each profile lists its
source assets and uses [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
for elevation. To rebuild them with the original DNV ZIP and the project dependencies:

```sh
python scripts/build_route_profiles.py path/to/dnv_trails_for_public_use.zip
```


For Streamlit, call `weather_extract.weather_data.fetch_forecast(latitude, longitude)` and
select a forecast hour from `forecast.hours`. Pass the trail's ordered
`(distance_km, elevation_m)` points and the hour's `freezing_level_m` to
`weather_extract.trail_profile.elevation_figure`, then pass the figure to `st.plotly_chart`.
Pass `None` when the freezing level is unavailable to show the profile
without classification. Local sunset is available in `forecast.sunsets` by date.
