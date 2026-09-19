from datetime import datetime, timezone
from pathlib import Path
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..models import Report


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ==========================================
# STATUS UPDATE MODEL
# ==========================================

class StatusUpdate(BaseModel):
    status: str


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    report = db.query(Report).filter(Report.id == report_id).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    image_path = report.image_path
    db.delete(report)
    db.commit()

    if image_path:
        try:
            target_file = UPLOAD_DIR / os.path.basename(image_path)
            if target_file.is_file():
                target_file.unlink(missing_ok=True)
            elif os.path.isfile(image_path):
                os.remove(image_path)
        except OSError:
            pass

    return {
        "message": "Report deleted successfully",
        "id": report_id,
    }


# ==========================================
# DUPLICATE DETECTION
# ==========================================

@router.get("/nearby")
def find_nearby_reports(
    latitude: float,
    longitude: float,
    radius: float = 100,
    db: Session = Depends(get_db)
):
    """
    Find existing drainage reports within a given
    radius of the submitted location.

    Default radius = 100 meters.
    Resolved reports are excluded because they
    represent issues that have already been resolved.
    """

    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid latitude or longitude coordinates")

    # Prevent unreasonable radius values
    radius = max(10, min(radius, 1000))

    query = text("""
        SELECT
            id,
            ticket_id,
            latitude,
            longitude,
            description,
            category,
            status,
            ward_number,
            ward_name,
            local_body,
            created_at,

            ST_Distance(
                ST_SetSRID(
                    ST_MakePoint(longitude, latitude),
                    4326
                )::geography,
                ST_SetSRID(
                    ST_MakePoint(:longitude, :latitude),
                    4326
                )::geography
            ) AS distance_meters

        FROM reports

        WHERE latitude IS NOT NULL
          AND longitude IS NOT NULL

          AND status != 'RESOLVED'

          AND ST_DWithin(
                ST_SetSRID(
                    ST_MakePoint(longitude, latitude),
                    4326
                )::geography,

                ST_SetSRID(
                    ST_MakePoint(:longitude, :latitude),
                    4326
                )::geography,

                :radius
          )

        ORDER BY distance_meters ASC;
    """)

    rows = db.execute(
        query,
        {
            "latitude": latitude,
            "longitude": longitude,
            "radius": radius
        }
    ).fetchall()

    nearby_reports = []

    for row in rows:
        nearby_reports.append({
            "id": row.id,
            "ticket_id": row.ticket_id,
            "latitude": row.latitude,
            "longitude": row.longitude,
            "description": row.description,
            "category": row.category,
            "status": row.status,
            "ward_number": row.ward_number,
            "ward_name": row.ward_name,
            "local_body": row.local_body,
            "distance_meters": round(
                float(row.distance_meters), 2
            ),
            "created_at": (
                row.created_at.isoformat()
                if row.created_at
                else None
            )
        })

    return {
        "possible_duplicate": len(nearby_reports) > 0,
        "radius_meters": radius,
        "count": len(nearby_reports),
        "reports": nearby_reports
    }


# ==========================================
# STATUS UPDATE
# ==========================================

@router.patch("/{report_id}/status")
def update_report_status(
    report_id: int,
    status_data: StatusUpdate,
    db: Session = Depends(get_db)
):

    allowed_statuses = {
        "OPEN",
        "IN_PROGRESS",
        "RESOLVED",
        "CRITICAL"
    }

    new_status = status_data.status.upper()

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Allowed statuses: {', '.join(sorted(allowed_statuses))}"
        )

    report = db.query(Report).filter(
        Report.id == report_id
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    report.status = new_status

    db.commit()
    db.refresh(report)

    return {
        "message": "Report status updated successfully",
        "id": report.id,
        "ticket_id": report.ticket_id,
        "status": report.status
    }


# ==========================================
# REPORT STATISTICS
# ==========================================

@router.get("/stats")
def get_report_stats(db: Session = Depends(get_db)):

    query = text("""
        SELECT
            COUNT(*) AS total_reports,

            COUNT(*) FILTER (
                WHERE status = 'OPEN'
            ) AS open_reports,

            COUNT(*) FILTER (
                WHERE status = 'IN_PROGRESS'
            ) AS in_progress_reports,

            COUNT(*) FILTER (
                WHERE status = 'RESOLVED'
            ) AS resolved_reports,

            COUNT(*) FILTER (
                WHERE status = 'CRITICAL'
            ) AS critical_reports

        FROM reports;
    """)

    result = db.execute(query).fetchone()

    return {
        "total_reports": result.total_reports,
        "open_reports": result.open_reports,
        "in_progress_reports": result.in_progress_reports,
        "resolved_reports": result.resolved_reports,
        "critical_reports": result.critical_reports
    }


# ==========================================
# WARD STATISTICS
# ==========================================

@router.get("/ward-stats")
def get_ward_stats(db: Session = Depends(get_db)):

    query = text("""
        SELECT
            ward_number,
            ward_name,
            COUNT(*) AS total_reports,

            COUNT(*) FILTER (
                WHERE status = 'OPEN'
            ) AS open_reports,

            COUNT(*) FILTER (
                WHERE status = 'IN_PROGRESS'
            ) AS in_progress_reports,

            COUNT(*) FILTER (
                WHERE status = 'RESOLVED'
            ) AS resolved_reports

        FROM reports

        WHERE ward_number IS NOT NULL

        GROUP BY
            ward_number,
            ward_name

        ORDER BY total_reports DESC;
    """)

    result = db.execute(query).fetchall()

    return [
        {
            "ward_number": row.ward_number,
            "ward_name": row.ward_name,
            "total_reports": row.total_reports,
            "open_reports": row.open_reports,
            "in_progress_reports": row.in_progress_reports,
            "resolved_reports": row.resolved_reports
        }
        for row in result
    ]


# ==========================================
# CREATE REPORT
# ==========================================

@router.post("/")
async def create_report(
    latitude: float = Form(...),
    longitude: float = Form(...),
    description: str = Form(...),
    ward_number: int | None = Form(None),
    ward_name: str | None = Form(None),
    local_body: str | None = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
        raise HTTPException(status_code=400, detail="Invalid latitude or longitude coordinates")

    # Generate safe unique filename
    raw_name = os.path.basename(image.filename or "upload.jpg").replace(" ", "_")
    now_utc = datetime.now(timezone.utc)
    filename = f"{int(now_utc.timestamp() * 1000)}_{raw_name}"

    file_path = UPLOAD_DIR / filename

    # Save uploaded image
    contents = await image.read()
    with open(file_path, "wb") as buffer:
        buffer.write(contents)

    # Standardized web-safe relative path
    db_image_path = f"uploads/{filename}"

    # ==========================================
    # FIND WARD USING POSTGIS
    # ==========================================

    ward_num_val = ward_number
    ward_name_val = ward_name
    local_body_val = local_body

    if ward_num_val is not None or ward_name_val or local_body_val:
        if ward_num_val is None or not ward_name_val or not local_body_val:
            raise HTTPException(
                status_code=422,
                detail="ward_number, ward_name, and local_body must be provided together"
            )
    else:
        try:
            ward_query = text(
                """
                SELECT
                    ward_number,
                    ward_name,
                    local_body

                FROM wards

                WHERE ST_Covers(
                    boundary,
                    ST_SetSRID(
                        ST_MakePoint(
                            :longitude,
                            :latitude
                        ),
                        4326
                    )
                )

                LIMIT 1;
                """
            )

            ward_result = db.execute(
                ward_query,
                {
                    "longitude": longitude,
                    "latitude": latitude
                },
            ).fetchone()

            if ward_result:
                ward_num_val = ward_result.ward_number
                ward_name_val = ward_result.ward_name
                local_body_val = ward_result.local_body
        except Exception as exc:
            print(f"Warning: Ward detection failed: {exc}")
            ward_num_val = None
            ward_name_val = None
            local_body_val = None

    # ==========================================
    # GENERATE TICKET
    # ==========================================

    ticket_id = (
        f"DRN-"
        f"{now_utc.strftime('%Y%m%d%H%M%S%f')}"
    )

    # ==========================================
    # CREATE REPORT
    # ==========================================

    report = Report(
        ticket_id=ticket_id,
        image_path=db_image_path,
        latitude=latitude,
        longitude=longitude,
        description=description.strip(),
        category="Drain Blockage",
        status="OPEN",
        ward_number=ward_num_val,
        ward_name=ward_name_val,
        local_body=local_body_val,
    )

    db.add(report)
    db.commit()
    db.refresh(report)

    # ==========================================
    # RESPONSE
    # ==========================================

    return {
        "message": "Report created successfully",
        "ticket_id": report.ticket_id,
        "status": report.status,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "ward_number": report.ward_number,
        "ward_name": report.ward_name,
        "local_body": report.local_body,
        "image_path": report.image_path
    }


# ==========================================
# GET ALL REPORTS
# ==========================================

@router.get("/")
def get_reports(db: Session = Depends(get_db)):

    reports = (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .all()
    )

    return [
        {
            "id": report.id,
            "ticket_id": report.ticket_id,
            "image_path": report.image_path,
            "latitude": report.latitude,
            "longitude": report.longitude,
            "description": report.description,
            "category": report.category,
            "status": report.status,
            "ward_number": report.ward_number,
            "ward_name": report.ward_name,
            "local_body": report.local_body,
            "created_at": (
                report.created_at.isoformat()
                if report.created_at
                else None
            )
        }
        for report in reports
    ]