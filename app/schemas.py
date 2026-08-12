from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# User Schemas
class UserLoginRequest(BaseModel):
    email: str
    password: str

class UserRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    department: Optional[str] = "Engineering"
    role: Optional[str] = "employee"

class UserResetPasswordRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    department: str
    role: str
    created_at: str

    class Config:
        from_attributes = True

# Room Schemas
class RoomCreate(BaseModel):
    name: str
    location: str
    building: Optional[str] = None
    floor: Optional[int] = 1
    capacity: Optional[int] = 4
    amenities: Optional[List[str]] = []
    status: Optional[str] = "active"
    room_type: Optional[str] = None
    cabin_type: Optional[str] = None
    vc_enabled: Optional[bool] = False
    power_points: Optional[bool] = True

class RoomUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[int] = None
    capacity: Optional[int] = None
    amenities: Optional[List[str]] = None
    status: Optional[str] = None
    room_type: Optional[str] = None
    cabin_type: Optional[str] = None
    vc_enabled: Optional[bool] = None
    power_points: Optional[bool] = None

# Booking Schemas
class BookingCreate(BaseModel):
    room_id: str
    user_id: str
    title: str
    start_time: str
    end_time: str
    attendees: Optional[List[Any]] = []
    notes: Optional[str] = ""
    cost_centre: Optional[str] = None
    meeting_type: Optional[str] = None
    meeting_description: Optional[str] = None
    send_qr: Optional[bool] = True
    recurrence: Optional[str] = "none"
    recurrence_count: Optional[int] = 1

class BookingUpdate(BaseModel):
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    attendees: Optional[List[Any]] = None
    notes: Optional[str] = None
    status: Optional[str] = None

# Visitor Schemas
class VisitorCreate(BaseModel):
    visitor_name: str
    company: str
    email: str
    phone: str
    host_id: str
    host_name: str
    location: str
    purpose: str
    visit_date: str
    expected_time: str
    notes: Optional[str] = ""

# Parking Reservation Schemas
class ParkingReservationCreate(BaseModel):
    slot_id: str
    user_id: str
    user_name: str
    vehicle_number: str
    vehicle_type: Optional[str] = "Car"
    location: str
    date: str
    start_time: str
    end_time: str

# Voucher Schemas
class VoucherCreate(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    department: str
    category: str
    amount: float
    location: str
    description: str

class VoucherAction(BaseModel):
    approved_by: Optional[str] = "Admin"
    approval_notes: Optional[str] = None

# Ticket Schemas
class TicketCreate(BaseModel):
    user_id: str
    user_name: str
    user_email: str
    category: str
    subject: str
    description: str
    location: str
    priority: Optional[str] = "medium"

class TicketCommentCreate(BaseModel):
    author_id: str
    author_name: str
    author_role: str
    text: str

class TicketStatusUpdate(BaseModel):
    status: str
    assigned_to: Optional[str] = None
