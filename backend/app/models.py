from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime

from .database import Base


class Report(Base):

    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    ticket_id = Column(String, unique=True, index=True)

    image_path = Column(String)

    latitude = Column(Float)
    longitude = Column(Float)

    description = Column(Text)

    category = Column(String, default="Drain Blockage")

    status = Column(String, default="OPEN")

    # Ward information detected using PostGIS
    ward_number = Column(Integer, nullable=True)

    ward_name = Column(String(150), nullable=True)

    local_body = Column(
        String(150),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )