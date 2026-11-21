# Trail data sources

The two non-sample trail routes use GPS-surveyed trail geometry from the District of North Vancouver's **Trails for Public Use** data. Elevation profiles are sampled from Mapzen Terrain Tiles and smoothed by the profile-generation pipeline. Trail points run one way from the route start to the destination; `distance_km` records the round-trip distance.

- `lynn-peak.json`: DNV `Lynn Peak Trail` geometry, served from Lynn Headwaters toward the upper trail endpoint. The available mapped segment is 3.33 km one way, shorter than the commonly listed 9 km round-trip outing; the file reports the length of this mapped segment, not the longer approach/continuation.
- `quarry-rock.json`: connected DNV `Baden Powell` trail segments from Deep Cove toward the Quarry Rock lookout. The public trail data ends near the lookout, and the profile uses the nearest mapped trail point as its endpoint.
- `st-marks-summit.json`: remains a synthetic sample route pending an appropriate Cypress Provincial Park source.

Attribution: “Contains information licensed under the Open Government Licence - North Vancouver.” Source: <https://geoweb.dnv.org/data/index.php>. Elevation source: <https://registry.opendata.aws/terrain-tiles/>.
