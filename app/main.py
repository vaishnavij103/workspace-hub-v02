import os
import io
import csv
import time
from datetime import datetime
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, status, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, Base, get_db
from app.models import (
    RoomModel, UserModel, AdminContactModel, BookingModel, VisitorModel,
    ParkingSlotModel, ParkingReservationModel, VoucherModel, InvoiceModel,
    TicketModel, NotificationModel
)
from app.schemas import (
    UserLoginRequest, UserRegisterRequest, UserResetPasswordRequest, UserResponse,
    RoomCreate, RoomUpdate, BookingCreate, BookingUpdate, VisitorCreate,
    ParkingReservationCreate, VoucherCreate, VoucherAction, TicketCreate,
    TicketCommentCreate, TicketStatusUpdate
)
from app.seed import seed_database

# Create tables in DB
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Apexon Workplace Operations API", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    db = next(get_db())
    seed_database(db)

def user_safe_dict(user: UserModel):
    return {
        "user_id": user.user_id,
        "name": user.name,
        "email": user.email,
        "department": user.department,
        "role": user.role,
        "created_at": user.created_at
    }

# Health Check
@app.get("/api/health")
def health():
    print("Hello I'm from main")
    return {"status": "ok", "backend": "FastAPI + SQLite (SQLAlchemy)"}

# Central Hub Stats
@app.get("/api/stats")
def get_stats(location: Optional[str] = None, db: Session = Depends(get_db)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    loc_filter = location.lower() if location and location.lower() != 'all locations' else None

    # Rooms
    rooms_query = db.query(RoomModel)
    if loc_filter:
        rooms_query = rooms_query.filter(RoomModel.location.ilike(loc_filter))
    filtered_rooms = rooms_query.all()
    room_ids = [r.room_id for r in filtered_rooms]

    # Bookings
    bookings_query = db.query(BookingModel)
    if loc_filter:
        bookings_query = bookings_query.filter(BookingModel.room_id.in_(room_ids)) if room_ids else bookings_query.filter(False)
    filtered_bookings = bookings_query.all()
    confirmed_bookings = [b for b in filtered_bookings if b.status == 'confirmed']
    cancelled_bookings = [b for b in filtered_bookings if b.status == 'cancelled']
    today_bookings = [b for b in confirmed_bookings if b.start_time.startswith(today)]

    # Visitors
    visitors_query = db.query(VisitorModel)
    if loc_filter:
        visitors_query = visitors_query.filter(VisitorModel.location.ilike(loc_filter))
    filtered_visitors = visitors_query.all()
    today_visitors = [v for v in filtered_visitors if v.visit_date == today]
    checked_in_visitors = [v for v in filtered_visitors if v.status == 'checked_in']

    # Parking
    parking_query = db.query(ParkingSlotModel)
    if loc_filter:
        parking_query = parking_query.filter(ParkingSlotModel.location.ilike(loc_filter))
    filtered_slots = parking_query.all()
    available_parking = len([s for s in filtered_slots if s.status == 'available'])

    res_query = db.query(ParkingReservationModel)
    if loc_filter:
        res_query = res_query.filter(ParkingReservationModel.location.ilike(loc_filter))
    filtered_res = res_query.all()
    reserved_parking = len([r for r in filtered_res if r.status in ['confirmed', 'checked_in']])

    # Vouchers
    vouchers_query = db.query(VoucherModel)
    if loc_filter:
        vouchers_query = vouchers_query.filter(VoucherModel.location.ilike(loc_filter))
    filtered_vouchers = vouchers_query.all()
    pending_vouchers = [v for v in filtered_vouchers if v.status == 'pending']
    approved_amount = sum([v.amount for v in filtered_vouchers if v.status in ['approved', 'redeemed']])

    # Invoices & Tickets
    invoices_query = db.query(InvoiceModel)
    if loc_filter:
        invoices_query = invoices_query.filter(InvoiceModel.location.ilike(loc_filter))
    filtered_invoices = invoices_query.all()
    total_expenses = sum([i.total_amount for i in filtered_invoices])

    tickets_query = db.query(TicketModel)
    if loc_filter:
        tickets_query = tickets_query.filter(TicketModel.location.ilike(loc_filter))
    filtered_tickets = tickets_query.all()
    open_tickets = len([t for t in filtered_tickets if t.status in ['open', 'in_progress']])

    total_users_count = db.query(UserModel).count()
    cancel_rate = round((len(cancelled_bookings) / len(filtered_bookings)) * 100, 1) if filtered_bookings else 0.0

    return {
        "location": location if location else "All Locations",
        "total_rooms": len(filtered_rooms),
        "active_rooms": len([r for r in filtered_rooms if r.status == 'active']),
        "total_bookings": len(filtered_bookings),
        "confirmed_bookings": len(confirmed_bookings),
        "today_bookings": len(today_bookings),
        "today_visitors": len(today_visitors),
        "checked_in_visitors": len(checked_in_visitors),
        "total_parking_slots": len(filtered_slots),
        "available_parking_slots": available_parking,
        "today_parking_reservations": reserved_parking,
        "pending_vouchers_count": len(pending_vouchers),
        "approved_vouchers_amount": approved_amount,
        "total_expenses_amount": total_expenses,
        "total_invoices_count": len(filtered_invoices),
        "open_tickets_count": open_tickets,
        "total_users": total_users_count,
        "cancel_rate": cancel_rate
    }

# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/login")
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email.ilike(req.email.strip())).first()
    if not user or user.password_hash != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user_safe_dict(user)

@app.post("/api/auth/register", status_code=201)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(UserModel).filter(UserModel.email.ilike(req.email.strip())).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    
    new_user = UserModel(
        user_id=f"usr_{int(time.time() * 1000)}",
        name=req.name,
        email=req.email.strip(),
        department=req.department or "Engineering",
        role=req.role or "employee",
        password_hash=req.password,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return user_safe_dict(new_user)

@app.post("/api/auth/reset")
def reset_password(req: UserResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.email.ilike(req.email.strip())).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for that email")
    user.password_hash = req.password
    db.commit()
    return user_safe_dict(user)

# ── USERS ─────────────────────────────────────────────────────────────────────

@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return [user_safe_dict(u) for u in users]

@app.post("/api/users", status_code=201)
def create_user(req: UserRegisterRequest, db: Session = Depends(get_db)):
    return register(req, db)

@app.get("/api/users/{user_id}")
def get_user_by_id(user_id: str, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user_safe_dict(user)

@app.get("/api/users/{user_id}/bookings")
def get_user_bookings(user_id: str, db: Session = Depends(get_db)):
    return db.query(BookingModel).filter(BookingModel.user_id == user_id).all()

# ── ROOMS ─────────────────────────────────────────────────────────────────────

@app.get("/api/rooms")
def get_rooms(
    location: Optional[str] = None,
    capacity: Optional[int] = None,
    floor: Optional[int] = None,
    amenities: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RoomModel)
    if location:
        query = query.filter(RoomModel.location.ilike(location))
    if capacity:
        query = query.filter(RoomModel.capacity >= capacity)
    if floor:
        query = query.filter(RoomModel.floor == floor)
    
    rooms = query.all()
    if amenities:
        req_amenities = [a.strip().lower() for a in amenities.split(',') if a.strip()]
        filtered = []
        for r in rooms:
            r_amenities = [str(a).lower() for a in (r.amenities or [])]
            if all(any(req_a in room_a for room_a in r_amenities) for req_a in req_amenities):
                filtered.append(r)
        return filtered
    return rooms

@app.post("/api/rooms", status_code=201)
def create_room(req: RoomCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow().isoformat()
    new_room = RoomModel(
        room_id=f"room_{int(time.time() * 1000)}",
        name=req.name,
        location=req.location,
        building=req.building or req.location,
        floor=req.floor or 1,
        capacity=req.capacity or 4,
        amenities=req.amenities or [],
        status=req.status or "active",
        room_type=req.room_type,
        cabin_type=req.cabin_type,
        vc_enabled=req.vc_enabled or False,
        power_points=req.power_points if req.power_points is not None else True,
        created_at=now,
        updated_at=now
    )
    db.add(new_room)
    db.commit()
    db.refresh(new_room)
    return new_room

@app.get("/api/rooms/{room_id}")
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(RoomModel).filter(RoomModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room

@app.put("/api/rooms/{room_id}")
def update_room(room_id: str, req: RoomUpdate, db: Session = Depends(get_db)):
    room = db.query(RoomModel).filter(RoomModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    for key, val in req.dict(exclude_unset=True).items():
        setattr(room, key, val)
    room.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(room)
    return room

@app.delete("/api/rooms/{room_id}", status_code=204)
def deactivate_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(RoomModel).filter(RoomModel.room_id == room_id).first()
    if room:
        room.status = "inactive"
        db.commit()
    return None

@app.get("/api/rooms/{room_id}/availability")
def get_room_availability(room_id: str, date: Optional[str] = None, db: Session = Depends(get_db)):
    target_date = date or datetime.utcnow().strftime("%Y-%m-%d")
    room = db.query(RoomModel).filter(RoomModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    day_bookings = db.query(BookingModel).filter(
        BookingModel.room_id == room_id,
        BookingModel.status == 'confirmed',
        BookingModel.start_time.startswith(target_date)
    ).all()

    booked_slots = [
        {"start_time": b.start_time, "end_time": b.end_time, "booking_id": b.booking_id, "title": b.title}
        for b in day_bookings
    ]

    slots = []
    for h in range(8, 20):
        for m in (0, 30):
            start_str = f"{target_date}T{h:02d}:{m:02d}:00"
            next_m = m + 30
            next_h = h + 1 if next_m >= 60 else h
            final_m = next_m % 60
            end_str = f"{target_date}T{next_h:02d}:{final_m:02d}:00"

            is_booked = any(start_str < b.end_time and end_str > b.start_time for b in day_bookings)
            booking_title = next((b.title for b in day_bookings if start_str < b.end_time and end_str > b.start_time), "")

            slots.append({
                "start_time": start_str,
                "end_time": end_str,
                "is_available": not is_booked,
                "booking_title": booking_title
            })

    return {"room_id": room_id, "date": target_date, "booked_slots": booked_slots, "slots": slots}

@app.post("/api/rooms/import")
def import_rooms(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        contents = file.file.read().decode('utf-8')
        reader = csv.DictReader(io.StringIO(contents))
        count = 0
        now = datetime.utcnow().isoformat()
        for idx, r in enumerate(reader):
            sno = r.get('S.NO.') or f"{int(time.time())}_{idx}"
            name = r.get('Room Name') or f"Room {sno}"
            loc = r.get('Location / Building') or 'Coimbatore'
            floor = int(r.get('Floor', '1')) if r.get('Floor', '').isdigit() else 1
            cap = int(r.get('Seating Capacity', '2')) if r.get('Seating Capacity', '').isdigit() else 2
            raw_amenities = r.get('Amenities Available (Projector, Whiteboard, TV,', '')
            amenities = [a.strip() for a in raw_amenities.split(',') if a.strip()] if raw_amenities and raw_amenities.lower() != 'no' else []
            vc = (r.get('VC Enabled', '') or '').lower() == 'yes'
            pp = (r.get('Power Points', '') or '').lower() == 'yes'

            new_room = RoomModel(
                room_id=f"room_{sno}_{int(time.time())}",
                name=name,
                location=loc,
                building=loc,
                floor=floor,
                capacity=cap,
                amenities=amenities,
                status='active',
                room_type=r.get('Room Type'),
                cabin_type=r.get('Cabin Type'),
                vc_enabled=vc,
                power_points=pp,
                created_at=now,
                updated_at=now
            )
            db.add(new_room)
            count += 1
        db.commit()
        return {"imported": count, "total": db.query(RoomModel).count()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process CSV: {str(e)}")

# ── ADMIN CONTACTS ────────────────────────────────────────────────────────────

@app.get("/api/admin-contacts")
def get_admin_contacts(location: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(AdminContactModel)
    if location:
        query = query.filter(AdminContactModel.location.ilike(location))
    return query.all()

@app.post("/api/admin-contacts", status_code=201)
def create_admin_contact(data: dict, db: Session = Depends(get_db)):
    now = datetime.utcnow().isoformat()
    new_contact = AdminContactModel(
        admin_id=f"adm_{int(time.time() * 1000)}",
        location=data.get("location", "Coimbatore"),
        name=data.get("name", "Admin"),
        email=data.get("email", "admin@apexon.com"),
        phone=data.get("phone", ""),
        role=data.get("role", "Admin Team"),
        active=True,
        created_at=now,
        updated_at=now
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact

@app.put("/api/admin-contacts/{id}")
def update_admin_contact(id: str, data: dict, db: Session = Depends(get_db)):
    c = db.query(AdminContactModel).filter(AdminContactModel.admin_id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Admin contact not found")
    for k, v in data.items():
        if hasattr(c, k):
            setattr(c, k, v)
    c.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return c

@app.delete("/api/admin-contacts/{id}", status_code=204)
def delete_admin_contact(id: str, db: Session = Depends(get_db)):
    c = db.query(AdminContactModel).filter(AdminContactModel.admin_id == id).first()
    if c:
        db.delete(c)
        db.commit()
    return None

# ── BOOKINGS ──────────────────────────────────────────────────────────────────

@app.get("/api/bookings")
def get_bookings(
    user_id: Optional[str] = None,
    room_id: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(BookingModel)
    if user_id:
        query = query.filter(BookingModel.user_id == user_id)
    if room_id:
        query = query.filter(BookingModel.room_id == room_id)
    if status:
        query = query.filter(BookingModel.status == status)
    if date:
        query = query.filter(BookingModel.start_time.startswith(date))
    return query.all()

@app.post("/api/bookings", status_code=201)
def create_booking(req: BookingCreate, db: Session = Depends(get_db)):
    conflicts = db.query(BookingModel).filter(
        BookingModel.room_id == req.room_id,
        BookingModel.status == 'confirmed',
        BookingModel.start_time < req.end_time,
        BookingModel.end_time > req.start_time
    ).first()

    if conflicts:
        raise HTTPException(status_code=409, detail="Time slot conflict: The selected room is already booked for this time.")

    now = datetime.utcnow().isoformat()
    new_booking = BookingModel(
        booking_id=f"bkg_{int(time.time() * 1000)}",
        room_id=req.room_id,
        user_id=req.user_id,
        title=req.title,
        start_time=req.start_time,
        end_time=req.end_time,
        status="confirmed",
        attendees=req.attendees or [],
        notes=req.notes or "",
        cost_centre=req.cost_centre,
        meeting_type=req.meeting_type,
        meeting_description=req.meeting_description,
        send_qr=req.send_qr if req.send_qr is not None else True,
        created_at=now,
        updated_at=now
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    return new_booking

@app.get("/api/bookings/{booking_id}")
def get_booking(booking_id: str, db: Session = Depends(get_db)):
    b = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return b

@app.get("/api/bookings/{booking_id}/ics")
def get_booking_ics(booking_id: str, db: Session = Depends(get_db)):
    b = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    room = db.query(RoomModel).filter(RoomModel.room_id == b.room_id).first()
    location = room.location if room else "Apexon Office"

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Apexon RoomBook//EN
BEGIN:VEVENT
UID:{b.booking_id}@apexon.com
SUMMARY:{b.title}
LOCATION:{location}
DESCRIPTION:{b.notes or ''}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""

    return Response(content=ics_content, media_type="text/calendar")

@app.put("/api/bookings/{booking_id}")
def update_booking(booking_id: str, req: BookingUpdate, db: Session = Depends(get_db)):
    b = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    for key, val in req.dict(exclude_unset=True).items():
        setattr(b, key, val)
    b.updated_at = datetime.utcnow().isoformat()
    db.commit()
    db.refresh(b)
    return b

@app.delete("/api/bookings/{booking_id}", status_code=204)
def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    b = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if b:
        b.status = "cancelled"
        b.updated_at = datetime.utcnow().isoformat()
        db.commit()
    return None

@app.post("/api/bookings/{booking_id}/checkin")
def checkin_booking(booking_id: str, db: Session = Depends(get_db)):
    b = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    b.actual_check_in = datetime.utcnow().isoformat()
    db.commit()
    return b

@app.post("/api/bookings/{booking_id}/checkout")
def checkout_booking(booking_id: str, db: Session = Depends(get_db)):
    b = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    b.actual_check_out = datetime.utcnow().isoformat()
    db.commit()
    return b

# ── VISITORS (VisiFlow) ───────────────────────────────────────────────────────

@app.get("/api/visitors")
def get_visitors(location: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(VisitorModel)
    if location:
        query = query.filter(VisitorModel.location.ilike(location))
    if status:
        query = query.filter(VisitorModel.status == status)
    return query.all()

@app.post("/api/visitors", status_code=201)
def create_visitor(req: VisitorCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow().isoformat()
    code_suffix = int(time.time()) % 10000
    new_vis = VisitorModel(
        visitor_id=f"vis_{int(time.time() * 1000)}",
        visitor_name=req.visitor_name,
        company=req.company,
        email=req.email,
        phone=req.phone,
        host_id=req.host_id,
        host_name=req.host_name,
        location=req.location,
        purpose=req.purpose,
        visit_date=req.visit_date,
        expected_time=req.expected_time,
        status="expected",
        badge_code=f"VIS-{code_suffix}",
        nda_signed=True,
        notes=req.notes or "",
        created_at=now,
        updated_at=now
    )
    db.add(new_vis)
    db.commit()
    db.refresh(new_vis)
    return new_vis

@app.get("/api/visitors/{visitor_id}")
def get_visitor(visitor_id: str, db: Session = Depends(get_db)):
    v = db.query(VisitorModel).filter(VisitorModel.visitor_id == visitor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return v

@app.put("/api/visitors/{visitor_id}")
def update_visitor(visitor_id: str, data: dict, db: Session = Depends(get_db)):
    v = db.query(VisitorModel).filter(VisitorModel.visitor_id == visitor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found")
    for k, val in data.items():
        if hasattr(v, k):
            setattr(v, k, val)
    v.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return v

@app.post("/api/visitors/{visitor_id}/checkin")
def checkin_visitor(visitor_id: str, db: Session = Depends(get_db)):
    v = db.query(VisitorModel).filter(VisitorModel.visitor_id == visitor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found")
    v.status = "checked_in"
    v.check_in_time = datetime.utcnow().isoformat()
    v.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return v

@app.post("/api/visitors/{visitor_id}/checkout")
def checkout_visitor(visitor_id: str, db: Session = Depends(get_db)):
    v = db.query(VisitorModel).filter(VisitorModel.visitor_id == visitor_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found")
    v.status = "checked_out"
    v.check_out_time = datetime.utcnow().isoformat()
    v.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return v

@app.delete("/api/visitors/{visitor_id}", status_code=204)
def delete_visitor(visitor_id: str, db: Session = Depends(get_db)):
    v = db.query(VisitorModel).filter(VisitorModel.visitor_id == visitor_id).first()
    if v:
        db.delete(v)
        db.commit()
    return None

# ── PARKING (ParkSwift) ───────────────────────────────────────────────────────

@app.get("/api/parking/slots")
def get_parking_slots(location: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ParkingSlotModel)
    if location:
        query = query.filter(ParkingSlotModel.location.ilike(location))
    return query.all()

@app.post("/api/parking/slots", status_code=201)
def create_parking_slot(data: dict, db: Session = Depends(get_db)):
    new_slot = ParkingSlotModel(
        slot_id=f"ps_{int(time.time() * 1000)}",
        slot_number=data.get("slot_number", "P-99"),
        location=data.get("location", "Coimbatore"),
        zone=data.get("zone", "Basement 1"),
        type=data.get("type", "Standard"),
        status="available"
    )
    db.add(new_slot)
    db.commit()
    db.refresh(new_slot)
    return new_slot

@app.get("/api/parking/reservations")
def get_parking_reservations(location: Optional[str] = None, user_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ParkingReservationModel)
    if location:
        query = query.filter(ParkingReservationModel.location.ilike(location))
    if user_id:
        query = query.filter(ParkingReservationModel.user_id == user_id)
    return query.all()

@app.post("/api/parking/reservations", status_code=201)
def create_parking_reservation(req: ParkingReservationCreate, db: Session = Depends(get_db)):
    slot = db.query(ParkingSlotModel).filter(ParkingSlotModel.slot_id == req.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Parking slot not found")
    
    now = datetime.utcnow().isoformat()
    pass_code = f"PRK-{int(time.time()) % 10000}"
    new_res = ParkingReservationModel(
        reservation_id=f"prk_{int(time.time() * 1000)}",
        slot_id=req.slot_id,
        slot_number=slot.slot_number,
        user_id=req.user_id,
        user_name=req.user_name,
        vehicle_number=req.vehicle_number,
        vehicle_type=req.vehicle_type or "Car",
        location=req.location,
        date=req.date,
        start_time=req.start_time,
        end_time=req.end_time,
        status="confirmed",
        pass_code=pass_code,
        created_at=now
    )
    slot.status = "reserved"
    db.add(new_res)
    db.commit()
    db.refresh(new_res)
    return new_res

@app.post("/api/parking/reservations/{reservation_id}/checkin")
def checkin_parking(reservation_id: str, db: Session = Depends(get_db)):
    res = db.query(ParkingReservationModel).filter(ParkingReservationModel.reservation_id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    res.status = "checked_in"
    res.check_in_time = datetime.utcnow().isoformat()
    db.commit()
    return res

@app.post("/api/parking/reservations/{reservation_id}/checkout")
def checkout_parking(reservation_id: str, db: Session = Depends(get_db)):
    res = db.query(ParkingReservationModel).filter(ParkingReservationModel.reservation_id == reservation_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Reservation not found")
    res.status = "completed"
    res.check_out_time = datetime.utcnow().isoformat()
    slot = db.query(ParkingSlotModel).filter(ParkingSlotModel.slot_id == res.slot_id).first()
    if slot:
        slot.status = "available"
    db.commit()
    return res

@app.delete("/api/parking/reservations/{reservation_id}", status_code=204)
def cancel_parking_reservation(reservation_id: str, db: Session = Depends(get_db)):
    res = db.query(ParkingReservationModel).filter(ParkingReservationModel.reservation_id == reservation_id).first()
    if res:
        res.status = "cancelled"
        slot = db.query(ParkingSlotModel).filter(ParkingSlotModel.slot_id == res.slot_id).first()
        if slot:
            slot.status = "available"
        db.commit()
    return None

# ── VOUCHERS (VoucherLogix) ───────────────────────────────────────────────────

@app.get("/api/vouchers")
def get_vouchers(location: Optional[str] = None, user_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(VoucherModel)
    if location:
        query = query.filter(VoucherModel.location.ilike(location))
    if user_id:
        query = query.filter(VoucherModel.user_id == user_id)
    return query.all()

@app.post("/api/vouchers", status_code=201)
def create_voucher(req: VoucherCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow().isoformat()
    today_iso = datetime.utcnow().strftime("%Y-%m-%d")
    code_suffix = int(time.time()) % 10000
    cat_prefix = req.category.split()[0].upper()[:4]
    
    new_v = VoucherModel(
        voucher_id=f"vch_{int(time.time() * 1000)}",
        voucher_code=f"VCH-{cat_prefix}-{code_suffix}",
        user_id=req.user_id,
        user_name=req.user_name,
        user_email=req.user_email,
        department=req.department,
        category=req.category,
        amount=req.amount,
        currency="INR",
        location=req.location,
        description=req.description,
        status="pending",
        expires_at=f"{today_iso}T23:59:59",
        created_at=now,
        updated_at=now
    )
    db.add(new_v)
    db.commit()
    db.refresh(new_v)
    return new_v

@app.put("/api/vouchers/{voucher_id}/approve")
@app.post("/api/vouchers/{voucher_id}/approve")
def approve_voucher(voucher_id: str, req: Optional[VoucherAction] = None, db: Session = Depends(get_db)):
    v = db.query(VoucherModel).filter(VoucherModel.voucher_id == voucher_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voucher not found")
    v.status = "approved"
    v.approved_by = req.approved_by if req and req.approved_by else "Admin"
    v.approval_notes = req.approval_notes if req and req.approval_notes else "Pre-approved"
    v.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return v

@app.put("/api/vouchers/{voucher_id}/reject")
@app.post("/api/vouchers/{voucher_id}/reject")
def reject_voucher(voucher_id: str, req: Optional[VoucherAction] = None, db: Session = Depends(get_db)):
    v = db.query(VoucherModel).filter(VoucherModel.voucher_id == voucher_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voucher not found")
    v.status = "rejected"
    v.approved_by = req.approved_by if req and req.approved_by else "Admin"
    v.approval_notes = req.approval_notes if req and req.approval_notes else "Declined as per policy"
    v.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return v

@app.post("/api/vouchers/{voucher_id}/redeem")
def redeem_voucher(voucher_id: str, db: Session = Depends(get_db)):
    v = db.query(VoucherModel).filter(VoucherModel.voucher_id == voucher_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voucher not found")
    v.status = "redeemed"
    v.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return v

@app.delete("/api/vouchers/{voucher_id}", status_code=204)
def delete_voucher(voucher_id: str, db: Session = Depends(get_db)):
    v = db.query(VoucherModel).filter(VoucherModel.voucher_id == voucher_id).first()
    if v:
        db.delete(v)
        db.commit()
    return None

# ── INVOICES ──────────────────────────────────────────────────────────────────

@app.get("/api/invoices")
def get_invoices(location: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(InvoiceModel)
    if location:
        query = query.filter(InvoiceModel.location.ilike(location))
    return query.all()

@app.post("/api/invoices/upload")
def upload_invoice(
    file: UploadFile = File(...),
    location: str = "Coimbatore",
    uploaded_by: str = "Admin",
    db: Session = Depends(get_db)
):
    now = datetime.utcnow().isoformat()
    today_iso = datetime.utcnow().strftime("%Y-%m-%d")
    code_suffix = int(time.time()) % 10000

    new_inv = InvoiceModel(
        invoice_id=f"inv_{int(time.time() * 1000)}",
        invoice_number=f"INV-2025-{code_suffix}",
        vendor_name="Apexon Office Procurement",
        invoice_date=today_iso,
        due_date=today_iso,
        product_category="Hardware & IT Equipment",
        location=location,
        subtotal=45000.0,
        tax_amount=8100.0,
        total_amount=53100.0,
        currency="INR",
        status="processed",
        file_name=file.filename,
        extracted_items=[
            {"description": "IT Equipment & Accessories", "quantity": 1, "unit_price": 45000, "total": 45000, "category": "Hardware & IT Equipment"}
        ],
        created_at=now,
        uploaded_by=uploaded_by,
        notes=f"Uploaded invoice file: {file.filename}"
    )
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    return new_inv

@app.post("/api/invoices", status_code=201)
def create_invoice(data: dict, db: Session = Depends(get_db)):
    now = datetime.utcnow().isoformat()
    today_iso = datetime.utcnow().strftime("%Y-%m-%d")
    code_suffix = int(time.time()) % 10000

    new_inv = InvoiceModel(
        invoice_id=f"inv_{int(time.time() * 1000)}",
        invoice_number=data.get("invoice_number", f"INV-2025-{code_suffix}"),
        vendor_name=data.get("vendor_name", "Vendor"),
        invoice_date=data.get("invoice_date", today_iso),
        due_date=data.get("due_date", today_iso),
        product_category=data.get("product_category", "Hardware & IT Equipment"),
        location=data.get("location", "Coimbatore"),
        subtotal=float(data.get("subtotal", 0.0)),
        tax_amount=float(data.get("tax_amount", 0.0)),
        total_amount=float(data.get("total_amount", 0.0)),
        currency="INR",
        status="processed",
        extracted_items=data.get("extracted_items", []),
        created_at=now,
        uploaded_by=data.get("uploaded_by", "Admin"),
        notes=data.get("notes", "")
    )
    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)
    return new_inv

@app.delete("/api/invoices/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: str, db: Session = Depends(get_db)):
    inv = db.query(InvoiceModel).filter(InvoiceModel.invoice_id == invoice_id).first()
    if inv:
        db.delete(inv)
        db.commit()
    return None

# ── HELPDESK TICKETS ──────────────────────────────────────────────────────────

@app.get("/api/tickets")
def get_tickets(location: Optional[str] = None, user_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(TicketModel)
    if location:
        query = query.filter(TicketModel.location.ilike(location))
    if user_id:
        query = query.filter(TicketModel.user_id == user_id)
    return query.all()

@app.post("/api/tickets", status_code=201)
def create_ticket(req: TicketCreate, db: Session = Depends(get_db)):
    now = datetime.utcnow().isoformat()
    tkt_num = f"HD-{int(time.time()) % 10000}"
    new_tkt = TicketModel(
        ticket_id=f"tkt_{int(time.time() * 1000)}",
        ticket_number=tkt_num,
        user_id=req.user_id,
        user_name=req.user_name,
        user_email=req.user_email,
        category=req.category,
        subject=req.subject,
        description=req.description,
        location=req.location,
        priority=req.priority or "medium",
        status="open",
        assigned_to=f"Location Admin ({req.location})",
        comments=[],
        created_at=now,
        updated_at=now
    )
    db.add(new_tkt)
    db.commit()
    db.refresh(new_tkt)
    return new_tkt

@app.get("/api/tickets/{ticket_id}")
def get_ticket(ticket_id: str, db: Session = Depends(get_db)):
    t = db.query(TicketModel).filter(TicketModel.ticket_id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

@app.post("/api/tickets/{ticket_id}/comments")
def add_ticket_comment(ticket_id: str, req: TicketCommentCreate, db: Session = Depends(get_db)):
    tkt = db.query(TicketModel).filter(TicketModel.ticket_id == ticket_id).first()
    if not tkt:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    comments = list(tkt.comments or [])
    comments.append({
        "comment_id": f"cm_{int(time.time() * 1000)}",
        "author_id": req.author_id,
        "author_name": req.author_name,
        "author_role": req.author_role,
        "text": req.text,
        "created_at": datetime.utcnow().isoformat()
    })
    tkt.comments = comments
    tkt.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return tkt

@app.put("/api/tickets/{ticket_id}")
def update_ticket_status(ticket_id: str, req: TicketStatusUpdate, db: Session = Depends(get_db)):
    tkt = db.query(TicketModel).filter(TicketModel.ticket_id == ticket_id).first()
    if not tkt:
        raise HTTPException(status_code=404, detail="Ticket not found")
    tkt.status = req.status
    if req.assigned_to:
        tkt.assigned_to = req.assigned_to
    tkt.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return tkt

# ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

@app.get("/api/notifications")
def get_notifications(recipient_id: Optional[str] = "usr_admin", db: Session = Depends(get_db)):
    return db.query(NotificationModel).filter(NotificationModel.recipient_id == recipient_id).all()

@app.put("/api/notifications/{notification_id}/read")
@app.post("/api/notifications/{notification_id}/read")
def mark_read(notification_id: str, db: Session = Depends(get_db)):
    n = db.query(NotificationModel).filter(NotificationModel.notification_id == notification_id).first()
    if n:
        n.read_at = datetime.utcnow().isoformat()
        db.commit()
    return {"status": "ok"}

@app.put("/api/notifications/{notification_id}/unread")
@app.post("/api/notifications/{notification_id}/unread")
def mark_unread(notification_id: str, db: Session = Depends(get_db)):
    n = db.query(NotificationModel).filter(NotificationModel.notification_id == notification_id).first()
    if n:
        n.read_at = None
        db.commit()
    return {"status": "ok"}

@app.put("/api/notifications/read-all")
@app.post("/api/notifications/read-all")
def mark_all_read(recipient_id: Optional[str] = "usr_admin", db: Session = Depends(get_db)):
    notifs = db.query(NotificationModel).filter(NotificationModel.recipient_id == recipient_id).all()
    now = datetime.utcnow().isoformat()
    for n in notifs:
        n.read_at = now
    db.commit()
    return {"status": "ok"}

@app.put("/api/notifications/unread-all")
@app.post("/api/notifications/unread-all")
def mark_all_unread(recipient_id: Optional[str] = "usr_admin", db: Session = Depends(get_db)):
    notifs = db.query(NotificationModel).filter(NotificationModel.recipient_id == recipient_id).all()
    for n in notifs:
        n.read_at = None
    db.commit()
    return {"status": "ok"}
