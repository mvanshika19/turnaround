"""Build route profiles from the public DNV trail archive and Mapzen elevation."""

import argparse
import gzip
import json
import math
import re
from array import array
from collections import Counter, defaultdict
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from sys import byteorder
from unicodedata import normalize
from xml.etree import ElementTree
from zipfile import ZipFile

import requests


DATA = Path(__file__).resolve().parents[1] / "route_data"
SOURCE_URL = "https://geoweb.dnv.org/data/index.php"
ELEVATION_URL = "https://registry.opendata.aws/terrain-tiles/"
NS = {"k": "http://www.opengis.net/kml/2.2"}
SPACING_M = 50


def read_lines(archive_path):
    groups = defaultdict(dict)
    with ZipFile(archive_path) as archive, ZipFile(BytesIO(archive.read("TrnTrailPublic.kmz"))) as kmz:
        document = ElementTree.fromstring(kmz.read("doc.kml"))
    for placemark in document.findall(".//k:Placemark", NS):
        description = placemark.findtext("k:description", "", NS)
        fields = dict(re.findall(r"<th>([^<]+)</th>\s*<td>([^<]*)</td>", description))
        name = fields.get("Trail_Name", "").strip()
        lines = placemark.findall(".//k:LineString/k:coordinates", NS)
        for index, line in enumerate(lines, start=1):
            asset = fields["Asset_Id"].strip()
            key = f"{asset}-{index}" if len(lines) > 1 else asset
            coords = [tuple(map(float, point.split(",")[:2])) for point in line.text.split()]
            groups[(name.upper(), "" if name else key)][key] = coords
    return groups


def chains(lines):
    """Join lines at shared endpoints, stopping at junctions and dead ends."""
    endpoints = defaultdict(list)
    for key, coords in lines.items():
        endpoints[coords[0]].append(key)
        endpoints[coords[-1]].append(key)
    unused = set(lines)

    def follow(start, key):
        assets, coords = [], [start]
        while key in unused:
            unused.remove(key)
            assets.append(key)
            part = lines[key]
            coords.extend(part[1:] if part[0] == coords[-1] else reversed(part[:-1]))
            outgoing = endpoints[coords[-1]]
            if len(outgoing) != 2:
                break
            key = next((candidate for candidate in outgoing if candidate in unused), None)
        return assets, coords

    for endpoint, keys in sorted(endpoints.items()):
        if len(keys) != 2:
            for key in sorted(keys):
                if key in unused:
                    yield follow(endpoint, key)
    while unused:
        key = min(unused)
        yield follow(lines[key][0], key)


def distance(left, right):
    lon1, lat1 = map(math.radians, left)
    lon2, lat2 = map(math.radians, right)
    value = math.sin((lat2 - lat1) / 2) ** 2
    value += math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371008.8 * 2 * math.asin(math.sqrt(value))


def sample(coords):
    samples = [(0.0, coords[0])]
    cumulative = 0.0
    target = SPACING_M
    for left, right in zip(coords, coords[1:]):
        length = distance(left, right)
        while target < cumulative + length:
            fraction = (target - cumulative) / length
            point = tuple(a + (b - a) * fraction for a, b in zip(left, right))
            samples.append((float(target), point))
            target += SPACING_M
        cumulative += length
    # Avoid a final interval that would disappear after rounding to decimetres.
    if len(samples) > 1 and round(cumulative, 1) <= samples[-1][0]:
        samples.pop()
    if round(cumulative, 1) <= 0:
        raise ValueError("The line has no measurable length")
    return [*samples, (cumulative, coords[-1])]


@lru_cache(maxsize=16)
def terrain_tile(lat, lon):
    name = f"{'N' if lat >= 0 else 'S'}{abs(lat):02d}{'E' if lon >= 0 else 'W'}{abs(lon):03d}"
    response = requests.get(
        f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/{name[:3]}/{name}.hgt.gz",
        timeout=60,
    )
    response.raise_for_status()
    heights = array("h")
    heights.frombytes(gzip.decompress(response.content))
    if byteorder == "little":
        heights.byteswap()
    size = math.isqrt(len(heights))
    if size not in (1201, 3601) or size * size != len(heights):
        raise ValueError(f"Unexpected dimensions for terrain tile {name}")
    return size, heights


def elevation(point):
    lon, lat = point
    south, west = math.floor(lat), math.floor(lon)
    size, heights = terrain_tile(south, west)
    x = (lon - west) * (size - 1)
    y = (south + 1 - lat) * (size - 1)
    col, row = min(int(x), size - 2), min(int(y), size - 2)
    dx, dy = x - col, y - row
    corners = [heights[(row + j) * size + col + i] for j in range(2) for i in range(2)]
    if -32768 in corners:
        raise ValueError(f"No elevation data near {point}")
    nw, ne, sw, se = corners
    return (nw * (1 - dx) + ne * dx) * (1 - dy) + (sw * (1 - dx) + se * dx) * dy


def build_profile(name, assets, coords):
    samples = sample(coords)
    heights = [elevation(point) for _, point in samples]
    smooth = []
    for i in range(len(heights)):
        window = heights[max(0, i - 2):i + 3]
        smooth.append(sum(window) / len(window))
    points = [
        dict(distance_m=round(d, 1), longitude=round(lon, 7), latitude=round(lat, 7),
             elevation_m=round(height, 1), smoothed_elevation_m=round(smoothed, 1))
        for (d, (lon, lat)), height, smoothed in zip(samples, heights, smooth)
    ]
    segments = []
    times = []
    for i, ((start, _), (end, _)) in enumerate(zip(samples, samples[1:])):
        change = smooth[i + 1] - smooth[i]
        slope = change / (end - start)
        speed = 6 * math.exp(-3.5 * abs(slope + 0.05))
        minutes = (end - start) * 0.06 / speed
        times.append(minutes)
        segments.append(dict(start_m=round(start, 1), end_m=round(end, 1),
                             distance_m=round(end - start, 1), elevation_change_m=round(change, 1),
                             slope=round(slope, 4), tobler_speed_kmh=round(speed, 2),
                             time_min=round(minutes, 2)))
    return dict(
        trail=name, geometry_source="District of North Vancouver, Trails for Public Use",
        geometry_source_url=SOURCE_URL, geometry_asset_ids=assets,
        elevation_source="Mapzen Terrain Tiles (Skadi)", elevation_source_url=ELEVATION_URL,
        attribution="Contains information licensed under the Open Government Licence - North Vancouver.",
        notes=["Direction follows the generated line order. Walking time is a terrain-only estimate."],
        sample_spacing_m=SPACING_M, distance_m=points[-1]["distance_m"],
        tobler_moving_time_min=round(sum(times), 1), coordinates_order="[longitude, latitude]",
        points=points, segments=segments,
    )


def profile_filenames(names, reserved=()):
    stems = {}
    for key, name in names.items():
        ascii_name = normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
        stems[key] = re.sub(r"[^a-z0-9]+", "_", ascii_name.lower()).strip("_") or "trail"
    counts = Counter(stems.values())
    filenames = {}
    used = set(reserved)
    for key, stem in sorted(stems.items()):
        filename = f"{stem}_profile.json"
        if counts[stem] > 1 or filename in used:
            identifier = key.removeprefix("dnv-").replace("-", "_")
            filename = f"{stem}_{identifier}_profile.json"
        if filename in used:
            raise ValueError(f"Duplicate profile filename: {filename}")
        used.add(filename)
        filenames[key] = filename
    return filenames


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="DNV Trails for Public Use ZIP archive")
    args = parser.parse_args()
    catalogue = DATA / "routes.json"
    routes = json.loads(catalogue.read_text(encoding="utf-8"))
    routes = {key: route for key, route in routes.items() if not key.startswith("dnv-")}
    output = DATA / "processed" / "dnv"
    generated = {}
    covered = set()
    for (name, _), lines in sorted(read_lines(args.archive).items()):
        for assets, coords in chains(lines):
            key = f"dnv-{min(assets).lower()}"
            if key in generated or covered.intersection(assets):
                raise ValueError(f"Duplicate source asset in {key}")
            generated[key] = build_profile(name or f"Unnamed trail {assets[0]}", assets, coords)
            covered.update(assets)
    output.mkdir(parents=True, exist_ok=True)
    filenames = profile_filenames(
        {key: profile["trail"] for key, profile in generated.items()},
        reserved={Path(route["profile"]).name for route in routes.values()},
    )
    for key, profile in generated.items():
        path = output / filenames[key]
        path.write_text(json.dumps(profile, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        routes[key] = dict(name=profile["trail"], profile=path.relative_to(DATA).as_posix(),
                           timezone="America/Vancouver")
    catalogue.write_text(json.dumps(routes, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {len(generated)} profiles covering {len(covered)} source lines.")


if __name__ == "__main__":
    main()
