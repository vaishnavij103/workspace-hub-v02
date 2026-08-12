import json
import logging
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, DB_TYPE, get_db
from .models import RoomModel, UserModel, BookingModel, VisitorModel, NotificationModel, AdminContactModel
from .schemas import BookingCreateSchema, RoomCreateSchema, VisitorCreateSchema, AttendeeSchema
from .crud import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("backend.main")

app = FastAPI(
    title="Apexon RoomBook Python FastAPI Backend",
    description="Python FastAPI REST API with PostgreSQL and SQLite Fallback Support",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    logger.info(f"Starting FastAPI server... Database Engine Dialect: {DB_TYPE}")
    db = next(get_db())
    init_db(db)

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    room_count = db.query(RoomModel).count()
    return {
        "status": "ok",
        "backend": "python-fastapi",
        "database_engine": DB_TYPE,
        "rooms_registered": room_count,
        "timestamp": datetime.utcnow().isoformat()
    }

# ── ROOMS ENDPOINTS ──────────────────────────────────────────────────────────

@app.get("/api/rooms")
def get_rooms(location: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(RoomModel)
    if location and location != "All Locations":
        query = query.filter(RoomModel.location == location)
    rooms = query.all()
    
    result = []
    for r in rooms:
        try:
            amenities_list = json.loads(r.amenities) if r.amenities else []
        except:
            amenities_list = []
        
        result.append({
            "room_id": r.room_id,
            "name": r.name,
            "location": r.location,
            "building": r.building,
            "floor": r.floor,
            "capacity": r.capacity,
            "amenities": amenities_list,
            "status": r.status,
            "room_type": r.room_type,
            "cabin_type": r.cabin_type,
            "vc_enabled": r.vc_enabled,
            "power_points": r.power_points,
            "created_at": r.created_at,
            "updated_at": r.updated_at
        })
    return result

@app.post("/api/rooms", status_code=201)
def create_room(room_in: RoomCreateSchema, db: Session = Depends(get_db)):
    new_id = f"rm_{int(datetime.utcnow().timestamp()*1000)}"
    room = RoomModel(
        room_id=new_id,
        name=room_in.name,
        location=room_in.location,
        building=room_in.building or "",
        floor=room_in.floor or 1,
        capacity=room_in.capacity or 10,
        amenities=json.dumps(room_in.amenities or []),
        status="active",
        room_type=room_in.room_type or "Conference",
        cabin_type=room_in.cabin_type,
        vc_enabled=room_in.vc_enabled if room_in.vc_enabled is not None else True,
        power_points=room_in.power_points if room_in.power_points is not None else True,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat()
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@app.get("/api/rooms/{room_id}/availability")
def get_room_availability(room_id: str, date: str, db: Session = Depends(get_db)):
    room = db.query(RoomModel).filter(RoomModel.room_id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Get active bookings for date
    bookings = db.query(BookingModel).filter(
        BookingModel.room_id == room_id,
        BookingModel.status == "confirmed"
    ).all()

    # Generate slots from 08:00 to 20:00 (15 min intervals)
    slots = []
    current = datetime.strptime(f"{date} 08:00", "%Y-%m-%d %H:%M")
    end_day = datetime.strptime(f"{date} 20:00", "%Y-%m-%d %H:%M")

    while current < end_day:
        slot_start = current.strftime("%Y-%m-%d %H:%M")
        next_min = current + timedelta(minutes=15)
        slot_end = next_min.strftime("%Y-%m-%d %H:%M")

        is_avail = True
        for b in bookings:
            b_start = b.start_time[:16]
            b_end = b.end_time[:16]
            if not (slot_end <= b_start or slot_start >= b_end):
                is_avail = False
                break

        slots.append({
            "start_time": slot_start,
            "end_time": slot_end,
            "is_available": is_avail
        })
        current = next_min

    return {"room_id": room_id, "date": date, "slots": slots}

# ── BOOKINGS ENDPOINTS ───────────────────────────────────────────────────────

@app.get("/api/bookings")
def get_bookings(user_id: Optional[str] = None, room_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(BookingModel)
    if user_id:
        query = query.filter(BookingModel.user_id == user_id)
    if room_id:
        query = query.filter(BookingModel.room_id == room_id)
    
    bookings = query.order_by(BookingModel.start_time.desc()).all()
    result = []
    for b in bookings:
        try:
            att_list = json.loads(b.attendees) if b.attendees else []
        except:
            att_list = []

        result.append({
            "booking_id": b.booking_id,
            "room_id": b.room_id,
            "user_id": b.user_id,
            "title": b.title,
            "start_time": b.start_time,
            "end_time": b.end_time,
            "status": b.status,
            "attendees": att_list,
            "notes": b.notes,
            "cost_centre": b.cost_centre,
            "meeting_type": b.meeting_type,
            "meeting_description": b.meeting_description,
            "send_qr": b.send_qr,
            "actual_check_in": b.actual_check_in,
            "actual_check_out": b.actual_check_out,
            "created_at": b.created_at,
            "updated_at": b.updated_at
        })
    return result

@app.post("/api/bookings", status_code=201)
def create_booking(booking_in: BookingCreateSchema, db: Session = Depends(get_db)):
    # Verify room existence
    room = db.query(RoomModel).filter(RoomModel.room_id == booking_in.room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # Conflict check
    existing = db.query(BookingModel).filter(
        BookingModel.room_id == booking_in.room_id,
        BookingModel.status == "confirmed"
    ).all()

    for e in existing:
        e_st = e.start_time[:16]
        e_et = e.end_time[:16]
        req_st = booking_in.start_time[:16]
        req_et = booking_in.end_time[:16]

        if not (req_et <= e_st or req_st >= e_et):
            raise HTTPException(
                status_code=409,
                detail=f"Time slot conflict for {room.name}. Already booked by another session."
            )

    # Convert attendee Pydantic schemas to serialized list
    processed_attendees = []
    if booking_in.attendees:
        for idx, att in enumerate(booking_in.attendees):
            pass_code = att.qr_pass_code or f"QR-MEET-{room.room_id[-4:]}-{int(datetime.utcnow().timestamp())}-{idx+1}"
            processed_attendees.append({
                "id": att.id or f"att_{idx+1}",
                "name": att.name,
                "email": att.email,
                "phone": att.phone or "",
                "qr_pass_code": pass_code,
                "status": "qr_sent",
                "email_sent": True,
                "sms_sent": bool(att.phone)
            })

    new_booking_id = f"bkg_{int(datetime.utcnow().timestamp()*1000)}"
    new_booking = BookingModel(
        booking_id=new_booking_id,
        room_id=booking_in.room_id,
        user_id=booking_in.user_id,
        title=booking_in.title or "Meeting",
        start_time=booking_in.start_time,
        end_time=booking_in.end_time,
        status="confirmed",
        attendees=json.dumps(processed_attendees),
        notes=booking_in.meeting_description or "",
        cost_centre=booking_in.cost_centre or "",
        meeting_type=booking_in.meeting_type or "Internal Meeting",
        meeting_description=booking_in.meeting_description or "",
        send_qr=booking_in.send_qr if booking_in.send_qr is not None else True,
        created_at=datetime.utcnow().isoformat(),
        updated_at=datetime.utcnow().isoformat()
    )

    db.add(new_booking)

    # Trigger notification
    notif = NotificationModel(
        notification_id=f"notif_{int(datetime.utcnow().timestamp()*1000)}_usr",
        recipient_id=booking_in.user_id,
        sender_id="system",
        type="booking_created",
        title="Booking Confirmed & QR Passes Sent",
        message=f"Your booking '{new_booking.title}' for {room.name} on {new_booking.start_time[:10]} is confirmed.",
        metadata_json=json.dumps({"booking_id": new_booking_id}),
        related_booking_id=new_booking_id,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(notif)

    db.commit()
    db.refresh(new_booking)

    res = {
        "booking_id": new_booking.booking_id,
        "room_id": new_booking.room_id,
        "user_id": new_booking.user_id,
        "title": new_booking.title,
        "start_time": new_booking.start_time,
        "end_time": new_booking.end_time,
        "status": new_booking.status,
        "attendees": processed_attendees,
        "notes": new_booking.notes,
        "cost_centre": new_booking.cost_centre,
        "meeting_type": new_booking.meeting_type,
        "meeting_description": new_booking.meeting_description,
        "send_qr": new_booking.send_qr,
        "created_at": new_booking.created_at,
        "updated_at": new_booking.updated_at
    }
    return res

@app.delete("/api/bookings/{booking_id}")
def cancel_booking(booking_id: str, db: Session = Depends(get_db)):
    booking = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = "cancelled"
    booking.updated_at = datetime.utcnow().isoformat()
    db.commit()
    return {"message": "Booking cancelled successfully", "booking_id": booking_id}

@app.get("/api/bookings/{booking_id}/ics")
def download_ics(booking_id: str, db: Session = Depends(get_db)):
    booking = db.query(BookingModel).filter(BookingModel.booking_id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    room = db.query(RoomModel).filter(RoomModel.room_id == booking.room_id).first()
    room_name = room.name if room else "Meeting Room"

    st_clean = booking.start_time.replace("-", "").replace(":", "").replace(" ", "T") + "00Z"
    et_clean = booking.end_time.replace("-", "").replace(":", "").replace(" ", "T") + "00Z"

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Apexon RoomBook Python FastAPI//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:{booking.booking_id}@apexon.com
DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}
DTSTART:{st_clean}
DTEND:{et_clean}
SUMMARY:{booking.title}
LOCATION:{room_name}
DESCRIPTION:Apexon Meeting Room Booking: {booking.title}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR"""

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": f"attachment; filename={booking.booking_id}.ics"}
    )

# ── VISITORS ENDPOINTS ───────────────────────────────────────────────────────

@app.get("/api/visitors")
def get_visitors(db: Session = Depends(get_db)):
    visitors = db.query(VisitorModel).order_by(VisitorModel.created_at.desc()).all()
    return visitors

@app.post("/api/visitors", status_code=201)
def create_visitor(visitor_in: VisitorCreateSchema, db: Session = Depends(get_db)):
    badge = f"V-{int(datetime.utcnow().timestamp()*1000) % 10000:04d}"
    visitor = VisitorModel(
        visitor_id=f"vis_{int(datetime.utcnow().timestamp()*1000)}",
        visitor_name=visitor_in.visitor_name,
        company=visitor_in.company or "",
        email=visitor_in.email,
        phone=visitor_in.phone or "",
        host_id=visitor_in.host_id,
        host_name=visitor_in.host_name or "",
        location=visitor_in.location or "Pune",
        purpose=visitor_in.purpose or "Business Meeting",
        visit_date=visitor_in.visit_date,
        expected_time=visitor_in.expected_time or "10:00",
        status="expected",
        badge_code=badge,
        nda_signed=False,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(visitor)
    db.commit()
    db.refresh(visitor)
    return visitor

# ── USERS & ADMIN CONTACTS ────────────────────────────────────────────────────

@app.get("/api/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(UserModel).all()
    return users

@app.get("/api/admin-contacts")
def get_admin_contacts(location: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(AdminContactModel)
    if location and location != "All Locations":
        query = query.filter(AdminContactModel.location == location)
    return query.all()

@app.get("/api/notifications")
def get_notifications(recipient_id: str, db: Session = Depends(get_db)):
    notifs = db.query(NotificationModel).filter(
        NotificationModel.recipient_id == recipient_id
    ).order_by(NotificationModel.created_at.desc()).all()

    res = []
    for n in notifs:
        try:
            meta = json.loads(n.metadata_json) if n.metadata_json else {}
        except:
            meta = {}
        res.append({
            "notification_id": n.notification_id,
            "recipient_id": n.recipient_id,
            "sender_id": n.sender_id,
            "type": n.type,
            "title": n.title,
            "message": n.message,
            "metadata": meta,
            "related_booking_id": n.related_booking_id,
            "created_at": n.created_at,
            "read_at": n.read_at
        })
    return res
