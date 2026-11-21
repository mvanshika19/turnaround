# Trail and elevation data

## Lynn Peak demo profile

`processed/lynn_peak_profile.json` is a Tobler-ready, one-way profile from the Lynn Headwaters approach toward Lynn Peak. It includes sampled longitude/latitude, raw and smoothed elevation, distance, slope, segment-level Tobler speed/time, and a terrain-only moving-time total.

The route geometry was selected from the District of North Vancouver's `Trails for Public Use` dataset. The source download is retained as `raw/dnv_trails_for_public_use.zip`; the archive includes the provider's terms. Elevations were sampled from OpenTopoData's `mapzen` dataset at 50 m intervals. The profile is approximate: its elevation source is a ~30 m grid and the trail line is not a live navigation route.

To rebuild the profile, install `certifi` and run from the repository root:

```sh
python3 -m pip install -r scripts/requirements-data.txt
python3 scripts/build_lynn_peak_profile.py
```

The build script queries OpenTopoData (maximum 100 points per request; one second between requests), so rebuilding requires network access. The existing JSON profile can be used offline.

Attribution: “Contains information licensed under the Open Government Licence - North Vancouver.” Source: [District of North Vancouver GEOweb](https://geoweb.dnv.org/data/index.php). Elevation source: [OpenTopoData API](https://www.opentopodata.org/api/).
