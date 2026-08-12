import json
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class UserModel(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, default="Engineering")
    role = Column(String, default="employee")  # 'admin' | 'employee'
    password_hash = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class RoomModel(Base):
    __tablename__ = "rooms"

    room_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    building = Column(String, nullable=True)
    floor = Column(Integer, default=1)
    capacity = Column(Integer, default=10)
    amenities = Column(Text, default="[]")  # JSON encoded list
    status = Column(String, default="active")  # 'active' | 'inactive'
    room_type = Column(String, default="Conference")
    cabin_type = Column(String, nullable=True)
    vc_enabled = Column(Boolean, default=True)
    power_points = Column(Boolean, default=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class BookingModel(Base):
    __tablename__ = "bookings"

    booking_id = Column(String, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.room_id"), nullable=False)
    user_id = Column(String, ForeignKey("users.user_id"), nullable=False)
    title = Column(String, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    status = Column(String, default="confirmed")  # 'confirmed' | 'cancelled'
    attendees = Column(Text, default="[]")  # JSON encoded list of attendees
    notes = Column(Text, default="")
    cost_centre = Column(String, nullable=True)
    meeting_type = Column(String, default="Internal Meeting")
    meeting_description = Column(Text, nullable=True)
    send_qr = Column(Boolean, default=True)
    actual_check_in = Column(String, nullable=True)
    actual_check_out = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class VisitorModel(Base):
    __tablename__ = "visitors"

    visitor_id = Column(String, primary_key=True, index=True)
    visitor_name = Column(String, nullable=False)
    company = Column(String, default="")
    email = Column(String, nullable=False)
    phone = Column(String, default="")
    host_id = Column(String, nullable=False)
    host_name = Column(String, default="")
    location = Column(String, default="Pune")
    purpose = Column(String, default="Business Meeting")
    visit_date = Column(String, nullable=False)
    expected_time = Column(String, default="10:00")
    status = Column(String, default="expected")  # 'expected' | 'checked_in' | 'checked_out' | 'cancelled'
    badge_code = Column(String, default="")
    nda_signed = Column(Boolean, default=False)
    check_in_time = Column(String, nullable=True)
    check_out_time = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())

class NotificationModel(Base):
    __tablename__ = "notifications"

    notification_id = Column(String, primary_key=True, index=True)
    recipient_id = Column(String, nullable=False)
    sender_id = Column(String, nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    metadata_json = Column(Text, default="{}")
    related_booking_id = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    read_at = Column(String, nullable=True)

class AdminContactModel(Base):
    __tablename__ = "admin_contacts"

    admin_id = Column(String, primary_key=True, index=True)
    location = Column(String, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, default="Facility Admin")
    active = Column(Boolean, default=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())
