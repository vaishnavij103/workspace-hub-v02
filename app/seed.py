import os
import csv
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import (
    RoomModel, UserModel, AdminContactModel, BookingModel, VisitorModel,
    ParkingSlotModel, ParkingReservationModel, VoucherModel, InvoiceModel,
    TicketModel, NotificationModel
)

def parse_csv(csv_path: str):
    if not os.path.exists(csv_path):
        return []
    rows = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    return rows

def seed_database(db: Session):
    now = datetime.utcnow().isoformat()
    today_iso = datetime.utcnow().strftime("%Y-%m-%d")

    # 1. Seed Users
    if db.query(UserModel).count() == 0:
        default_users = [
            UserModel(
                user_id='usr_admin',
                name='Admin',
                email='admin@apexon.com',
                department='Operations',
                role='admin',
                password_hash='admin123',
                created_at=now
            ),
            UserModel(
                user_id='usr_alex',
                name='Alex Johnson',
                email='alex@apexon.com',
                department='Engineering',
                role='employee',
                password_hash='user123',
                created_at=now
            ),
            UserModel(
                user_id='usr_priya',
                name='Priya Sharma',
                email='priya.sharma@apexon.com',
                department='Human Resources',
                role='employee',
                password_hash='user123',
                created_at=now
            ),
            UserModel(
                user_id='usr_rahul',
                name='Rahul Mehta',
                email='rahul.mehta@apexon.com',
                department='Product Management',
                role='employee',
                password_hash='user123',
                created_at=now
            )
        ]
        db.add_all(default_users)
        db.commit()

    # 2. Seed Admin Contacts
    if db.query(AdminContactModel).count() == 0:
        contacts_data = [
            {"location": "Ahmedabad", "name": "Kalpana Parmar", "email": "kalpana.parmar@apexon.com", "phone": "7698004492", "role": "Admin Team"},
            {"location": "Ahmedabad", "name": "Ayush Mathuria", "email": "ayush.mathuria@apexon.com", "phone": "9624010002", "role": "Admin Team"},
            {"location": "Chennai", "name": "Yuvaraj S", "email": "yuvaraj.s@apexon.com", "phone": "9884000341", "role": "Admin Team"},
            {"location": "Hyderabad", "name": "Yuvaraj S", "email": "yuvaraj.s@apexon.com", "phone": "9884000341", "role": "Admin Team"},
            {"location": "Coimbatore", "name": "Manoharan M", "email": "manoharan.m@apexon.com", "phone": "9626873215", "role": "Admin Team"},
            {"location": "Bangalore(Domlur)", "name": "Manjula Munikeshava", "email": "manjula.munikeshava@apexon.com", "phone": "6361476691", "role": "Admin Team"},
            {"location": "Bangalore(Signet)", "name": "Bhavya S", "email": "bhavya.s@apexon.com", "phone": "9972915522", "role": "Admin Team"},
            {"location": "Pune", "name": "Nitin Nikumbh", "email": "nitin.nikumbh@apexon.com", "phone": "7720008395", "role": "Admin Team"},
            {"location": "Mumbai", "name": "Nitin Nikumbh", "email": "nitin.nikumbh@apexon.com", "phone": "7720008395", "role": "Admin Team"}
        ]
        for idx, c in enumerate(contacts_data):
            db.add(AdminContactModel(
                admin_id=f"adm_{idx + 1}",
                location=c["location"],
                name=c["name"],
                email=c["email"],
                phone=c["phone"],
                role=c["role"],
                active=True,
                created_at=now,
                updated_at=now
            ))
        db.commit()

    # 3. Seed Rooms from CSV
    if db.query(RoomModel).count() == 0:
        csv_path = os.path.join(os.getcwd(), 'location_wise_rooms_cleaned.csv')
        csv_rows = parse_csv(csv_path)
        if csv_rows:
            for idx, r in enumerate(csv_rows):
                sno = r.get('S.NO.') or str(idx + 1)
                name = r.get('Room Name') or f"Room {sno}"
                loc = r.get('Location / Building') or 'Coimbatore'
                try:
                    floor = int(r.get('Floor', '1'))
                except ValueError:
                    floor = 1
                try:
                    cap = int(r.get('Seating Capacity', '2'))
                except ValueError:
                    cap = 2
                raw_amenities = r.get('Amenities Available (Projector, Whiteboard, TV,', '')
                amenities = []
                if raw_amenities and raw_amenities.lower() != 'no':
                    amenities = [a.strip() for a in raw_amenities.split(',') if a.strip()]
                vc_enabled = (r.get('VC Enabled', '') or '').lower() == 'yes'
                power_points = (r.get('Power Points', '') or '').lower() == 'yes'

                db.add(RoomModel(
                    room_id=f"room_{sno}",
                    name=name,
                    location=loc,
                    building=loc,
                    floor=floor,
                    capacity=cap,
                    amenities=amenities,
                    status='active',
                    room_type=r.get('Room Type'),
                    cabin_type=r.get('Cabin Type'),
                    vc_enabled=vc_enabled,
                    power_points=power_points,
                    created_at=now,
                    updated_at=now
                ))
            db.commit()
        else:
            # Fallback room
            db.add(RoomModel(
                room_id='room_1',
                name='Kilimanjaro',
                location='Coimbatore',
                building='Coimbatore',
                floor=2,
                capacity=6,
                amenities=['Whiteboard'],
                status='active',
                room_type='Meeting room',
                vc_enabled=False,
                power_points=True,
                created_at=now,
                updated_at=now
            ))
            db.commit()

    # 4. Seed Bookings
    if db.query(BookingModel).count() == 0:
        first_room = db.query(RoomModel).first()
        if first_room:
            db.add(BookingModel(
                booking_id='bkg_1',
                room_id=first_room.room_id,
                user_id='usr_admin',
                title='Quarterly Workplace & Facilities Sync',
                start_time=f"{today_iso}T10:00:00",
                end_time=f"{today_iso}T11:00:00",
                status='confirmed',
                attendees=['admin@apexon.com', 'alex@apexon.com'],
                notes='Review workplace operations, VisiFlow, ParkSwift, and VoucherLogix rollout.',
                created_at=now,
                updated_at=now,
                meeting_type='Internal Meeting',
                meeting_description='Operations Alignment'
            ))
            db.commit()

    # 5. Seed Visitors (VisiFlow)
    if db.query(VisitorModel).count() == 0:
        db.add_all([
            VisitorModel(
                visitor_id='vis_1',
                visitor_name='David Miller',
                company='Microsoft Cloud Services',
                email='david.miller@microsoft.com',
                phone='+1 (555) 234-5678',
                host_id='usr_admin',
                host_name='Admin',
                location='Pune',
                purpose='Technical Architecture & Partnership Review',
                visit_date=today_iso,
                expected_time='10:30 AM',
                status='checked_in',
                badge_code='VIS-9021',
                nda_signed=True,
                check_in_time=f"{today_iso}T10:25:00",
                created_at=now,
                updated_at=now
            ),
            VisitorModel(
                visitor_id='vis_2',
                visitor_name='Ananya Roy',
                company='Deloitte India',
                email='ananya.roy@deloitte.com',
                phone='+91 98765 43210',
                host_id='usr_alex',
                host_name='Alex Johnson',
                location='Coimbatore',
                purpose='Vendor Audit & Security Assessment',
                visit_date=today_iso,
                expected_time='02:00 PM',
                status='expected',
                badge_code='VIS-9022',
                nda_signed=True,
                created_at=now,
                updated_at=now
            )
        ])
        db.commit()

    # 6. Seed Parking Slots (ParkSwift)
    if db.query(ParkingSlotModel).count() == 0:
        locations_list = ['Pune', 'Coimbatore', 'Bangalore(Domlur)', 'Chennai', 'Mumbai', 'Hyderabad', 'Ahmedabad', 'Bangalore(Signet)']
        slot_idx = 1
        for loc in locations_list:
            db.add_all([
                ParkingSlotModel(slot_id=f"ps_{slot_idx}", slot_number="P-101 (EV Charging)", location=loc, zone="Basement 1 - EV Bay", type="EV", status="available"),
                ParkingSlotModel(slot_id=f"ps_{slot_idx+1}", slot_number="P-102 (Executive)", location=loc, zone="Ground Floor - VIP", type="Executive", status="reserved"),
                ParkingSlotModel(slot_id=f"ps_{slot_idx+2}", slot_number="P-103 (Standard)", location=loc, zone="Basement 1 - Zone A", type="Standard", status="available"),
                ParkingSlotModel(slot_id=f"ps_{slot_idx+3}", slot_number="P-104 (Compact)", location=loc, zone="Basement 1 - Zone B", type="Compact", status="available"),
                ParkingSlotModel(slot_id=f"ps_{slot_idx+4}", slot_number="P-105 (EV Charging)", location=loc, zone="Basement 1 - EV Bay", type="EV", status="available"),
                ParkingSlotModel(slot_id=f"ps_{slot_idx+5}", slot_number="P-106 (Handicapped)", location=loc, zone="Ground Floor", type="Handicapped", status="available")
            ])
            slot_idx += 6
        db.commit()

    # 7. Seed Parking Reservations
    if db.query(ParkingReservationModel).count() == 0:
        first_slot = db.query(ParkingSlotModel).first()
        if first_slot:
            db.add(ParkingReservationModel(
                reservation_id='prk_1',
                slot_id=first_slot.slot_id,
                slot_number=first_slot.slot_number,
                user_id='usr_alex',
                user_name='Alex Johnson',
                vehicle_number='TN 38 CA 8821',
                vehicle_type='EV Car',
                location='Coimbatore',
                date=today_iso,
                start_time='09:00',
                end_time='18:00',
                status='checked_in',
                pass_code='PRK-8371',
                check_in_time=f"{today_iso}T08:55:00",
                created_at=now
            ))
            db.commit()

    # 8. Seed Vouchers (VoucherLogix)
    if db.query(VoucherModel).count() == 0:
        db.add_all([
            VoucherModel(
                voucher_id='vch_1',
                voucher_code='VCH-MEAL-8821',
                user_id='usr_alex',
                user_name='Alex Johnson',
                user_email='alex@apexon.com',
                department='Engineering',
                category='Meal Allowance',
                amount=350.0,
                currency='INR',
                location='Coimbatore',
                description='Late evening project deployment dinner allowance',
                status='approved',
                approved_by='Admin',
                approval_notes='Approved as per late shift policy',
                expires_at=f"{today_iso}T23:59:59",
                created_at=now,
                updated_at=now
            ),
            VoucherModel(
                voucher_id='vch_2',
                voucher_code='VCH-CAB-4029',
                user_id='usr_priya',
                user_name='Priya Sharma',
                user_email='priya.sharma@apexon.com',
                department='Human Resources',
                category='Late Shift Cab',
                amount=600.0,
                currency='INR',
                location='Pune',
                description='Night shift safe drop cab voucher from office to Baner',
                status='pending',
                expires_at=f"{today_iso}T23:59:59",
                created_at=now,
                updated_at=now
            )
        ])
        db.commit()

    # 9. Seed Invoices
    if db.query(InvoiceModel).count() == 0:
        db.add_all([
            InvoiceModel(
                invoice_id='inv_101',
                invoice_number='INV-2025-8801',
                vendor_name='Dell Technologies India',
                invoice_date=today_iso,
                due_date=today_iso,
                product_category='Hardware & IT Equipment',
                location='Pune',
                subtotal=180000.0,
                tax_amount=32400.0,
                total_amount=212400.0,
                currency='INR',
                status='paid',
                file_name='dell_monitors_pune_inv8801.pdf',
                extracted_items=[
                    {"description": "Dell UltraSharp 27\" 4K Monitors (4 units)", "quantity": 4, "unit_price": 35000, "total": 140000, "category": "Hardware & IT Equipment"},
                    {"description": "Dell USB-C Dual Monitor Docking Stations", "quantity": 4, "unit_price": 10000, "total": 40000, "category": "Hardware & IT Equipment"}
                ],
                created_at=now,
                uploaded_by='Admin',
                notes='Procurement for new Pune floor expansion'
            ),
            InvoiceModel(
                invoice_id='inv_102',
                invoice_number='INV-2025-9920',
                vendor_name='Godrej Interio Workplace Solutions',
                invoice_date=today_iso,
                due_date=today_iso,
                product_category='Office Furniture',
                location='Coimbatore',
                subtotal=95000.0,
                tax_amount=17100.0,
                total_amount=112100.0,
                currency='INR',
                status='processed',
                file_name='godrej_ergonomic_chairs_cbe.pdf',
                extracted_items=[
                    {"description": "Ergonomic Executive Mesh Task Chairs", "quantity": 10, "unit_price": 9500, "total": 95000, "category": "Office Furniture"}
                ],
                created_at=now,
                uploaded_by='Kalpana Parmar',
                notes='Replacement chairs for Kilimanjaro conference room'
            )
        ])
        db.commit()

    # 10. Seed Helpdesk Tickets
    if db.query(TicketModel).count() == 0:
        db.add(TicketModel(
            ticket_id='tkt_1',
            ticket_number='HD-1001',
            user_id='usr_alex',
            user_name='Alex Johnson',
            user_email='alex@apexon.com',
            category='Room Booking Issue',
            subject='VC System Audio Echo in Kilimanjaro Room',
            description='During our client sync today, the Cisco Webex mic in Kilimanjaro room had severe background noise and feedback echo. Requesting AV check.',
            location='Coimbatore',
            priority='high',
            status='in_progress',
            assigned_to='Kalpana Parmar (Location Admin)',
            comments=[
                {
                    "comment_id": "cm_1",
                    "author_id": "usr_admin",
                    "author_name": "Admin",
                    "author_role": "admin",
                    "text": "IT Facilities technician assigned to recalibrate acoustic sensors in Kilimanjaro room at 2:00 PM today.",
                    "created_at": now
                }
            ],
            created_at=now,
            updated_at=now
        ))
        db.commit()

    # 11. Seed Notifications
    if db.query(NotificationModel).count() == 0:
        db.add_all([
            NotificationModel(
                notification_id='notif_1',
                recipient_id='usr_admin',
                sender_id='system',
                type='visitor_checkin',
                title='Visitor Arrived (VisiFlow)',
                message='David Miller from Microsoft Cloud Services has checked in at Pune reception.',
                metadata_json={"visitor_id": "vis_1"},
                created_at=now
            ),
            NotificationModel(
                notification_id='notif_2',
                recipient_id='usr_admin',
                sender_id='system',
                type='voucher_requested',
                title='New Voucher Request (VoucherLogix)',
                message='Priya Sharma requested a ₹600 Late Shift Cab voucher.',
                metadata_json={"voucher_id": "vch_2"},
                created_at=now
            )
        ])
        db.commit()
