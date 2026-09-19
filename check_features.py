import json
from pathlib import Path

script_dir = Path(__file__).resolve().parent
file_path = script_dir / "gis" / "kochi" / "Kochi_Wards.geojson"

target_features = [7, 20, 31, 36, 50, 77]

try:
    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    features = data.get("features", [])
    print(f"Total features loaded: {len(features)}")

    for number, feature in enumerate(features, start=1):
        if number in target_features:
            print("\n==============================")
            print("Feature:", number)
            print("Properties:", feature.get("properties"))
            print("Geometry type:", feature.get("geometry", {}).get("type"))
except Exception as error:
    print(f"Error reading GeoJSON: {error}")