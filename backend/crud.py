import json
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .database import engine, Base, DB_TYPE
from .models import RoomModel, UserModel, BookingModel, VisitorModel, NotificationModel, AdminContactModel

def init_db(db: Session):
    Base.metadata.create_all(bind=engine)

    # Seed Rooms if empty
    if db.query(RoomModel).count() == 0:
        rooms_data = [
            {
                "room_id": "rm_pune_1",
                "name": "Sahyadri Boardroom",
                "location": "Pune",
                "building": "Building A",
                "floor": 3,
                "capacity": 16,
                "amenities": json.dumps(["Video Conferencing", "Whiteboard", "4K TV", "Catering Support"]),
                "status": "active",
                "room_type": "Conference",
                "vc_enabled": True,
                "power_points": True,
            },
            {
                "room_id": "rm_pune_2",
                "name": "Shivneri Executive Suite",
                "location": "Pune",
                "building": "Building A",
                "floor": 4,
                "capacity": 24,
                "amenities": json.dumps(["Polycom Studio", "Dual Display", "Smart Podium", "Tea/Coffee Bar"]),
                "status": "active",
                "room_type": "Boardroom",
                "vc_enabled": True,
                "power_points": True,
            },
            {
                "room_id": "rm_hyd_1",
                "name": "Charminar Hub",
                "location": "Hyderabad - HITEC City",
                "building": "Tower B",
                "floor": 2,
                "capacity": 12,
                "amenities": json.dumps(["Polycom Studio", "Interactive Board", "Soundproof"]),
                "status": "active",
                "room_type": "Conference",
                "vc_enabled": True,
                "power_points": True,
            },
            {
                "room_id": "rm_blr_1",
                "name": "Silicon Valley Suite",
                "location": "Bengaluru - Whitefield",
                "building": "Block 2",
                "floor": 5,
                "capacity": 20,
                "amenities": json.dumps(["Telepresence", "4K TV", "Coffee Dispenser", "Wireless Projection"]),
                "status": "active",
                "room_type": "Executive",
                "vc_enabled": True,
                "power_points": True,
            }
        ]
        for r in rooms_data:
            db.add(RoomModel(**r))

    # Seed Users if empty
    if db.query(UserModel).count() == 0:
        users_data = [
            {"user_id": "usr_emp1", "name": "Rahul Sharma", "email": "rahul.sharma@apexon.com", "department": "Engineering", "role": "employee"},
            {"user_id": "usr_admin", "name": "Apexon Admin", "email": "admin@apexon.com", "department": "Facility Mgmt", "role": "admin"},
            {"user_id": "usr_emp2", "name": "Ananya Patel", "email": "ananya.patel@apexon.com", "department": "HR & Culture", "role": "employee"},
        ]
        for u in users_data:
            db.add(UserModel(**u))

    # Seed Admin Contacts
    if db.query(AdminContactModel).count() == 0:
        admins_data = [
            {"admin_id": "adm_pne_1", "location": "Pune", "name": "Vikram Deshmukh", "email": "pune.facility@apexon.com", "phone": "+91 98230 11223", "role": "Facility Manager", "active": True},
            {"admin_id": "adm_hyd_1", "location": "Hyderabad - HITEC City", "name": "Srinivas Rao", "email": "hyd.facility@apexon.com", "phone": "+91 98490 33445", "role": "Facility Manager", "active": True},
            {"admin_id": "adm_blr_1", "location": "Bengaluru - Whitefield", "name": "Kavitha Reddy", "email": "blr.facility@apexon.com", "phone": "+91 98800 55667", "role": "Facility Manager", "active": True},
        ]
        for a in admins_data:
            db.add(AdminContactModel(**a))

    db.commit()
