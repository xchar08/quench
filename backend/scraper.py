# backend/scraper.py
import requests
from arcgis.gis import GIS
from arcgis.features import FeatureLayer

def fetch_fire_hydrants_california():
    query = """
    [out:json][timeout:25];
    area["name"="California"]["boundary"="administrative"]->.california;
    node["emergency"="fire_hydrant"](area.california);
    out body;
    """
    response = requests.post("https://overpass-api.de/api/interpreter", data={'data': query})
    response.raise_for_status()
    data = response.json()
    hydrants = []
    for element in data.get('elements', []):
        if element['type'] == 'node':
            lat = element.get('lat')
            lon = element.get('lon')
            hydrants.append({'latitude': lat, 'longitude': lon})
    return hydrants

def fetch_fire_outbreak_data():
    esri_url = "https://services.arcgis.com/EXAMPLE/arcgis/rest/services/FireOutbreaks/FeatureServer/0/query"
    params = {
        "where": "1=1",
        "outFields": "*",
        "returnGeometry": "true",
        "f": "json"
    }
    response = requests.get(esri_url, params=params)
    response.raise_for_status()
    data = response.json()
    outbreaks = []
    for feature in data.get('features', []):
        geometry = feature.get('geometry')
        attributes = feature.get('attributes')
        outbreaks.append({"geometry": geometry, "attributes": attributes})
    return outbreaks

def fetch_wildfire_data():
    gis = GIS()
    wildfire_url = "https://services.arcgis.com/EXAMPLE/arcgis/rest/services/Wildfires/FeatureServer/0"
    layer = FeatureLayer(wildfire_url)
    features = layer.query(where="1=1", out_fields="*", return_geometry=True)
    wildfires = []
    for feature in features.features:
        wildfires.append({
            "attributes": feature.attributes,
            "geometry": feature.geometry
        })
    return wildfires

if __name__ == "__main__":
    hydrant_data = fetch_fire_hydrants_california()
    print(f"Fetched {len(hydrant_data)} fire hydrants in California.")
    outbreak_data = fetch_fire_outbreak_data()
    print(f"Fetched {len(outbreak_data)} fire outbreak records.")
    wildfire_data = fetch_wildfire_data()
    print(f"Fetched {len(wildfire_data)} wildfire records.")
