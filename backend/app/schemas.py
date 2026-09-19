from pydantic import BaseModel


class ReportResponse(BaseModel):

    ticket_id: str
    latitude: float
    longitude: float
    description: str
    category: str
    status: str

    class Config:
        from_attributes = True