import json
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not configured in .env")

# Connect to PostgreSQL
connection = psycopg2.connect(DATABASE_URL)
cursor = connection.cursor()

# Create wards table
cursor.execute("""
    CREATE TABLE IF NOT EXISTS wards (
        id SERIAL PRIMARY KEY,
        ward_number INTEGER NOT NULL,
        ward_name VARCHAR(150) NOT NULL,
        local_body VARCHAR(150)
            DEFAULT 'Kochi Municipal Corporation',
        boundary GEOMETRY(GEOMETRY, 4326)
    );
""")

# Remove previously imported data
cursor.execute("DELETE FROM wards;")

# GeoJSON file
file_path = os.path.join(
    "gis",
    "kochi",
    "Kochi_Wards.geojson"
)

# Load entire GeoJSON
with open(file_path, "r", encoding="utf-8") as file:
    data = json.load(file)

# Check GeoJSON type
if data.get("type") != "FeatureCollection":
    raise ValueError("GeoJSON is not a FeatureCollection")

features = data.get("features", [])

print(f"Total features found: {len(features)}")

imported = 0
skipped = 0

for index, feature in enumerate(features, start=1):

    properties = feature.get("properties") or {}
    geometry = feature.get("geometry")

    # Check required data
    if (
        "Ward_No" not in properties
        or "Ward_Name" not in properties
        or geometry is None
    ):
        skipped += 1
        print(
            f"Skipping feature {index}: "
            f"Ward_No/Ward_Name/geometry missing"
        )
        continue

    ward_number = int(properties["Ward_No"])
    ward_name = properties["Ward_Name"]

    # Insert ward
    cursor.execute(
        """
        INSERT INTO wards (
            ward_number,
            ward_name,
            local_body,
            boundary
        )
        VALUES (
            %s,
            %s,
            %s,
            ST_SetSRID(
                ST_GeomFromGeoJSON(%s),
                4326
            )
        );
        """,
        (
            ward_number,
            ward_name,
            "Kochi Municipal Corporation",
            json.dumps(geometry)
        )
    )

    imported += 1

# Spatial index
cursor.execute("""
    CREATE INDEX IF NOT EXISTS idx_wards_boundary
    ON wards
    USING GIST (boundary);
""")

connection.commit()

cursor.close()
connection.close()

print("===================================")
print("Kochi Ward Import Completed")
print("===================================")
print(f"Wards imported: {imported}")
print(f"Wards skipped: {skipped}")
print("===================================")