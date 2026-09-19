import json

file_path = r"gis\kochi\Kochi_Wards.geojson"

target_features = [7, 20, 31, 36, 50, 77]

with open(file_path, "r", encoding="utf-8") as file:
    for number, line in enumerate(file, start=1):

        line = line.strip()

        if not line:
            continue

        try:
            feature = json.loads(line)

            if number in target_features:
                print("\n==============================")
                print("Feature:", number)
                print("Properties:")
                print(feature.get("properties"))
                print("Geometry type:")
                print(
                    feature.get("geometry", {}).get("type")
                )

        except Exception as error:
            print(
                f"Error reading feature {number}: {error}"
            )