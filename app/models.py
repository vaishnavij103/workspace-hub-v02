from sqlalchemy import Column, String, Integer, Boolean, Float, Text, JSON, DateTime
from datetime import datetime
from app.database import Base

class RoomModel(Base):
    __tablename__ = "rooms"

    room_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, index=True, nullable=False)
    building = Column(String, nullable=True)
    floor = Column(Integer, default=1)
    capacity = Column(Integer, default=4)
    amenities = Column(JSON, default=list) # List of strings
    status = Column(String, default="active") # 'active' | 'inactive'
    room_type = Column(String, nullable=True)
    cabin_type = Column(String, nullable=True)
    vc_enabled = Column(Boolean, default=False)
    power_points = Column(Boolean, default=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class UserModel(Base):
    __tablename__ = "users"

    user_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, default="Engineering")
    role = Column(String, default="employee") # 'admin' | 'employee'
    password_hash = Column(String, nullable=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class AdminContactModel(Base):
    __tablename__ = "admin_contacts"

    admin_id = Column(String, primary_key=True, index=True)
    location = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    role = Column(String, default="Admin Team")
    active = Column(Boolean, default=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class BookingModel(Base):
    __tablename__ = "bookings"

    booking_id = Column(String, primary_key=True, index=True)
    room_id = Column(String, index=True, nullable=False)
    user_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    start_time = Column(String, index=True, nullable=False)
    end_time = Column(String, nullable=False)
    status = Column(String, default="confirmed") # 'confirmed' | 'cancelled'
    attendees = Column(JSON, default=list)
    notes = Column(Text, default="")
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    cost_centre = Column(String, nullable=True)
    meeting_type = Column(String, nullable=True)
    meeting_description = Column(Text, nullable=True)
    send_qr = Column(Boolean, default=True)
    actual_check_in = Column(String, nullable=True)
    actual_check_out = Column(String, nullable=True)


class VisitorModel(Base):
    __tablename__ = "visitors"

    visitor_id = Column(String, primary_key=True, index=True)
    visitor_name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    host_id = Column(String, nullable=False)
    host_name = Column(String, nullable=False)
    location = Column(String, index=True, nullable=False)
    purpose = Column(String, nullable=False)
    visit_date = Column(String, index=True, nullable=False)
    expected_time = Column(String, nullable=False)
    status = Column(String, default="expected") # 'expected' | 'checked_in' | 'checked_out' | 'cancelled'
    badge_code = Column(String, nullable=False)
    nda_signed = Column(Boolean, default=True)
    check_in_time = Column(String, nullable=True)
    check_out_time = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class ParkingSlotModel(Base):
    __tablename__ = "parking_slots"

    slot_id = Column(String, primary_key=True, index=True)
    slot_number = Column(String, nullable=False)
    location = Column(String, index=True, nullable=False)
    zone = Column(String, nullable=False)
    type = Column(String, default="Standard")
    status = Column(String, default="available")


class ParkingReservationModel(Base):
    __tablename__ = "parking_reservations"

    reservation_id = Column(String, primary_key=True, index=True)
    slot_id = Column(String, nullable=False)
    slot_number = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    vehicle_number = Column(String, nullable=False)
    vehicle_type = Column(String, default="Car")
    location = Column(String, index=True, nullable=False)
    date = Column(String, index=True, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=False)
    status = Column(String, default="confirmed")
    pass_code = Column(String, nullable=False)
    check_in_time = Column(String, nullable=True)
    check_out_time = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class VoucherModel(Base):
    __tablename__ = "vouchers"

    voucher_id = Column(String, primary_key=True, index=True)
    voucher_code = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    user_email = Column(String, nullable=False)
    department = Column(String, nullable=False)
    category = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="INR")
    location = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(String, default="pending")
    approved_by = Column(String, nullable=True)
    approval_notes = Column(Text, nullable=True)
    expires_at = Column(String, nullable=False)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class InvoiceModel(Base):
    __tablename__ = "invoices"

    invoice_id = Column(String, primary_key=True, index=True)
    invoice_number = Column(String, nullable=False)
    vendor_name = Column(String, nullable=False)
    invoice_date = Column(String, nullable=False)
    due_date = Column(String, nullable=False)
    product_category = Column(String, nullable=False)
    location = Column(String, index=True, nullable=False)
    subtotal = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    total_amount = Column(Float, default=0.0)
    currency = Column(String, default="INR")
    status = Column(String, default="processed")
    file_name = Column(String, nullable=True)
    extracted_items = Column(JSON, default=list)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    uploaded_by = Column(String, nullable=False)
    notes = Column(Text, nullable=True)


class TicketModel(Base):
    __tablename__ = "tickets"

    ticket_id = Column(String, primary_key=True, index=True)
    ticket_number = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=False)
    user_email = Column(String, nullable=False)
    category = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, index=True, nullable=False)
    priority = Column(String, default="medium")
    status = Column(String, default="open")
    assigned_to = Column(String, nullable=False)
    comments = Column(JSON, default=list)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String, default=lambda: datetime.utcnow().isoformat())


class NotificationModel(Base):
    __tablename__ = "notifications"

    notification_id = Column(String, primary_key=True, index=True)
    recipient_id = Column(String, index=True, nullable=False)
    sender_id = Column(String, nullable=True)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    related_booking_id = Column(String, nullable=True)
    created_at = Column(String, default=lambda: datetime.utcnow().isoformat())
    read_at = Column(String, nullable=True)
