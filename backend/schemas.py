from pydantic import BaseModel, EmailStr, validator, Field
from typing import List, Optional, Any, Dict

class AttendeeSchema(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    phone: Optional[str] = ""
    qr_pass_code: Optional[str] = None

    @validator('email')
    def validate_email_format(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Attendee email is required.")
        v = v.strip()
        import re
        regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(regex, v):
            raise ValueError(f"Invalid email address format: '{v}'. Example: user@apexon.com")
        return v

class BookingCreateSchema(BaseModel):
    title: str = "Meeting"
    room_id: str
    user_id: str
    start_time: str
    end_time: str
    cost_centre: Optional[str] = ""
    meeting_type: Optional[str] = "Internal Meeting"
    meeting_description: Optional[str] = ""
    send_qr: Optional[bool] = True
    attendees: Optional[List[AttendeeSchema]] = []
    recurrence: Optional[str] = "none"
    recurrence_count: Optional[int] = 1

class RoomCreateSchema(BaseModel):
    name: str
    location: str
    building: Optional[str] = ""
    floor: Optional[int] = 1
    capacity: Optional[int] = 10
    amenities: Optional[List[str]] = []
    room_type: Optional[str] = "Conference"
    cabin_type: Optional[str] = None
    vc_enabled: Optional[bool] = True
    power_points: Optional[bool] = True

class VisitorCreateSchema(BaseModel):
    visitor_name: str
    company: Optional[str] = ""
    email: str
    phone: Optional[str] = ""
    host_id: str
    host_name: Optional[str] = ""
    location: Optional[str] = "Pune"
    purpose: Optional[str] = "Business Meeting"
    visit_date: str
    expected_time: Optional[str] = "10:00"

    @validator('email')
    def validate_visitor_email(cls, v):
        if not v or not isinstance(v, str):
            raise ValueError("Visitor email is required.")
        import re
        regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(regex, v.strip()):
            raise ValueError(f"Invalid visitor email format: '{v}'")
        return v.strip()
