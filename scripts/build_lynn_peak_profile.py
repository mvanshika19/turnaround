#!/usr/bin/env python3
"""Build a Tobler-ready Lynn Peak profile from DNV public trail geometry + OpenTopoData."""
import json, math, re, ssl, time, urllib.parse, urllib.request, zipfile, xml.etree.ElementTree as ET
import certifi
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data/raw/dnv_trails_for_public_use.zip'
OUTPUT = ROOT / 'data/processed/lynn_peak_profile.json'
NS = {'k': 'http://www.opengis.net/kml/2.2'}
ASSET_ORDER = ['TRLPUB00393', 'TRLPUB00334', 'TRLPUB01909']

with zipfile.ZipFile(SOURCE) as archive:
    kmz = archive.read('TrnTrailPublic.kmz')
with zipfile.ZipFile(__import__('io').BytesIO(kmz)) as archive:
    root = ET.fromstring(archive.read('doc.kml'))

features = {}
for pm in root.findall('.//k:Placemark', NS):
    desc = pm.findtext('k:description', default='', namespaces=NS) or ''
    attrs = dict(re.findall(r'<th>([^<]+)</th>\s*<td>([^<]*)</td>', desc))
    if attrs.get('Asset_Id') in ASSET_ORDER:
        coords = pm.find('.//k:coordinates', NS)
        points = [tuple(map(float, s.split(',')[:2])) for s in (coords.text or '').split()]
        features[attrs['Asset_Id']] = points
missing = set(ASSET_ORDER) - set(features)
if missing:
    raise RuntimeError(f'Missing DNV trail features: {sorted(missing)}')

# These GPS-surveyed trail segments connect from the Lynn Headwaters approach to the summit.
# Reverse each source segment so the route runs south (trailhead) to north (summit).
route = []
for asset in ASSET_ORDER:
    part = list(reversed(features[asset]))
    if route and math.hypot((part[0][0]-route[-1][0])*72000, (part[0][1]-route[-1][1])*111000) > 25:
        raise RuntimeError(f'DNV line segments do not connect before {asset}')
    if route and math.hypot((part[0][0]-route[-1][0])*72000, (part[0][1]-route[-1][1])*111000) < 1:
        part = part[1:]
    route.extend(part)

def haversine(a,b):
    lon1,lat1=map(math.radians,a); lon2,lat2=map(math.radians,b)
    dlat=lat2-lat1; dlon=lon2-lon1
    h=math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return 6371008.8*2*math.asin(math.sqrt(h))

# Resample geometry at about 50 m: enough for an MVP, while respecting the DEM resolution.
spacing=50.0
cumulative=[0.0]
for a,b in zip(route,route[1:]): cumulative.append(cumulative[-1]+haversine(a,b))
length=cumulative[-1]
samples=[0.0]
d=spacing
while d<length:
    samples.append(d); d+=spacing
samples.append(length)
coords=[]; j=0
for distance in samples:
    while j<len(cumulative)-2 and cumulative[j+1]<distance: j+=1
    seg=cumulative[j+1]-cumulative[j]
    f=0 if seg==0 else (distance-cumulative[j])/seg
    coords.append([route[j][0]+f*(route[j+1][0]-route[j][0]), route[j][1]+f*(route[j+1][1]-route[j][1])])

# Public OpenTopoData API: maximum 100 locations per call, at least 1 s between calls.
elevations=[]
for start in range(0,len(coords),100):
    batch=coords[start:start+100]
    body=urllib.parse.urlencode({'locations':'|'.join(f'{lat:.6f},{lon:.6f}' for lon,lat in batch),'interpolation':'bilinear'}).encode()
    req=urllib.request.Request('https://api.opentopodata.org/v1/mapzen', data=body, headers={'Content-Type':'application/x-www-form-urlencoded','User-Agent':'Turnaround-hackathon/1.0'})
    with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context(cafile=certifi.where())) as response:
        data=json.load(response)
    if data.get('status')!='OK' or len(data.get('results',[]))!=len(batch):
        raise RuntimeError(f'Elevation query failed: {data}')
    elevations.extend(item['elevation'] for item in data['results'])
    if start+100<len(coords): time.sleep(1.1)
if any(z is None for z in elevations): raise RuntimeError('Elevation service returned missing values')

# Smooth short-scale DEM noise with a centered 5-sample moving average before taking derivatives.
smooth=[]
for i in range(len(elevations)):
    window=elevations[max(0,i-2):min(len(elevations),i+3)]
    smooth.append(sum(window)/len(window))
segments=[]; total_hours=0.0; gain=0.0; loss=0.0
for i in range(len(coords)-1):
    ds=samples[i+1]-samples[i]
    dh=smooth[i+1]-smooth[i]
    slope=dh/ds
    speed=6*math.exp(-3.5*abs(slope+0.05)) # Tobler, km/h
    hours=ds/(1000*speed)
    total_hours+=hours
    if dh>0: gain+=dh
    else: loss-=dh
    segments.append({'start_m':round(samples[i],1),'end_m':round(samples[i+1],1),'distance_m':round(ds,1),'elevation_change_m':round(dh,1),'slope':round(slope,4),'tobler_speed_kmh':round(speed,2),'time_min':round(hours*60,2)})

out={
 'trail':'Lynn Peak Trail (Lynn Headwaters approach to summit; one way)',
 'geometry_source':'District of North Vancouver, Trails for Public Use (GPS-surveyed dataset)',
 'geometry_source_url':'https://geoweb.dnv.org/data/index.php',
 'elevation_source':'OpenTopoData mapzen dataset (~30 m terrain grid)',
 'elevation_source_url':'https://www.opentopodata.org/api/',
 'attribution':'Contains information licensed under the Open Government License - North Vancouver.',
 'license_url':'https://geoweb.dnv.org/data/index.php',
 'model':'Tobler hiking function: v_kmh = 6 * exp(-3.5 * abs(slope + 0.05)); slope is smoothed elevation change / horizontal distance.',
 'notes':['Elevation is approximate and smoothed with a centered 5-sample moving average.','This is a terrain-only baseline; it excludes breaks, snow, mud, technical terrain, pack weight, and personal pace.','Use the route in reverse for the descent; the direction-dependent slope changes the estimate.'],
 'sample_spacing_m':spacing,
 'distance_m':round(length,1),
 'start_elevation_m':round(elevations[0],1),
 'end_elevation_m':round(elevations[-1],1),
 'smoothed_ascent_m':round(gain,1),
 'smoothed_descent_m':round(loss,1),
 'tobler_moving_time_min':round(total_hours*60,1),
 'coordinates_order':'[longitude, latitude]',
 'points':[{'distance_m':round(d,1),'longitude':round(c[0],7),'latitude':round(c[1],7),'elevation_m':round(z,1),'smoothed_elevation_m':round(s,1)} for d,c,z,s in zip(samples,coords,elevations,smooth)],
 'segments':segments
}
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
OUTPUT.write_text(json.dumps(out,indent=2)+'\n')
print(json.dumps({k:out[k] for k in ['distance_m','start_elevation_m','end_elevation_m','smoothed_ascent_m','smoothed_descent_m','tobler_moving_time_min']}))
print(f'wrote {OUTPUT} ({len(coords)} points, {len(segments)} segments)')
