import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..database import get_db


router = APIRouter(
    prefix="/api/map",
    tags=["Map"]
)


@router.get("/wards")
def get_wards(
    db: Session = Depends(get_db)
):

    query = text("""
        SELECT
            ward_number,
            ward_name,
            local_body,
            ST_AsGeoJSON(boundary) AS geometry
        FROM wards
        ORDER BY ward_number;
    """)

    features = []

    try:
        rows = db.execute(query).fetchall()

        for row in rows:
            geometry = row.geometry
            if isinstance(geometry, str):
                try:
                    geometry = json.loads(geometry)
                except Exception:
                    pass

            features.append({
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "ward_number": row.ward_number,
                    "ward_name": row.ward_name,
                    "local_body": row.local_body
                }
            })
    except Exception as exc:
        print(f"Warning: Failed to fetch wards from DB: {exc}")

    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/reports")
def get_reports(
    db: Session = Depends(get_db)
):

    query = text("""
        SELECT
            id,
            ticket_id,
            image_path,
            latitude,
            longitude,
            description,
            category,
            status,
            ward_number,
            ward_name,
            local_body,
            created_at
        FROM reports
        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL
        ORDER BY created_at DESC;
    """)

    reports = []

    try:
        rows = db.execute(query).fetchall()

        for row in rows:
            reports.append({
                "id": row.id,
                "ticket_id": row.ticket_id,
                "image_path": row.image_path,
                "latitude": row.latitude,
                "longitude": row.longitude,
                "description": row.description,
                "category": row.category,
                "status": row.status,
                "ward_number": row.ward_number,
                "ward_name": row.ward_name,
                "local_body": row.local_body,
                "created_at": (
                    row.created_at.isoformat()
                    if row.created_at
                    else None
                )
            })
    except Exception as exc:
        print(f"Warning: Failed to fetch map reports from DB: {exc}")

    return {
        "reports": reports,
        "count": len(reports)
    }