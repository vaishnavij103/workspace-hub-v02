import os
import sys
import re
import csv
import json
import time
import random
import io
import datetime
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any
from utils import extract_invoice_fields , safe_float
from fastapi import FastAPI, Request, Response, HTTPException, Depends, File, UploadFile, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

from PIL import Image
import pytesseract
import pdfplumber
import pypdf


app = FastAPI(title="Apexon Workspace Hub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── IN-MEMORY DATA STORES ─────────────────────────────────────────────────────

rooms = []
workstations = []
users = []
admin_contacts = []
bookings = []
workstation_bookings = []
notifications = []
visitors = []
parking_slots = []
parking_reservations = []
invoices = []
tickets = []

def user_safe(u):
    if not u:
        return {}
    safe = dict(u)
    safe.pop('password_hash', None)
    return safe

async def get_json_body(request: Request) -> dict:
    try:
        data = await request.json()
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}

# ── CSV ROOM SEEDING LOGIC ───────────────────────────────────────────────────

def parse_csv_lines(csv_text):
    lines = []
    raw_lines = csv_text.splitlines()
    for raw in raw_lines:
        if not raw.strip():
            continue
        row = []
        inside_quote = False
        entry = ''
        i = 0
        while i < len(raw):
            char = raw[i]
            if char == '"':
                if inside_quote and i + 1 < len(raw) and raw[i + 1] == '"':
                    entry += '"'
                    i += 1
                else:
                    inside_quote = not inside_quote
            elif (char == ',' or char == ';') and not inside_quote:
                row.append(entry.strip())
                entry = ''
            else:
                entry += char
            i += 1
        row.append(entry.strip())
        lines.append(row)
    return lines

def load_seed_rooms_from_csv():
    csv_path = Path(os.getcwd()) / 'location_wise_rooms_cleaned.csv'
    if not csv_path.exists():
        print("Seed CSV location_wise_rooms_cleaned.csv not found.")
        return []

    try:
        content = csv_path.read_text(encoding='utf-8')
        rows = parse_csv_lines(content)
        if len(rows) <= 1:
            return []

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()
        seeded_rooms = []

        for i in range(1, len(rows)):
            row = rows[i]
            if not row:
                continue

            s_no = row[0].strip() if len(row) > 0 else str(i)
            room_name = row[1].strip() if len(row) > 1 else ''
            if not room_name:
                continue

            location = row[2].strip() if len(row) > 2 and row[2].strip() else 'Pune'
            building = location
            
            try:
                floor = int(row[3].strip()) if len(row) > 3 and row[3].strip() else 1
            except ValueError:
                floor = 1

            room_type = row[4].strip() if len(row) > 4 and row[4].strip() else 'Meeting Room'
            cabin_type = row[5].strip() if len(row) > 5 and row[5].strip() else None

            cap_raw = row[6].strip() if len(row) > 6 else ''
            digits = re.sub(r'\D', '', cap_raw)
            capacity = int(digits) if digits else 4

            amen_raw = row[7].strip() if len(row) > 7 else ''
            amenities = []
            if amen_raw and amen_raw.lower() not in ['no', 'nil', 'none', '-']:
                amenities = [a.strip() for a in re.split(r'[,;|]', amen_raw) if a.strip() and a.strip().lower() not in ['no', 'nil']]

            vc_raw = (row[8] if len(row) > 8 else '').lower().strip()
            vc_enabled = any(k in vc_raw for k in ['yes', 'true', '1', 'vc enabled', 'enabled', 'yealink']) and 'not enabled' not in vc_raw

            power_raw = (row[9] if len(row) > 9 else '').lower().strip()
            power_points = any(k in power_raw for k in ['yes', 'true', '1', 'enabled', 'power']) or power_raw not in ['no', 'nil', 'false']

            seeded_rooms.append({
                'room_id': f'room_seed_{s_no or i}',
                'name': room_name,
                'location': location,
                'building': building,
                'floor': floor,
                'capacity': capacity,
                'amenities': amenities,
                'status': 'active',
                'room_type': room_type,
                'cabin_type': cabin_type,
                'vc_enabled': vc_enabled,
                'power_points': power_points,
                'created_at': now,
                'updated_at': now
            })

        print(f"Successfully seeded {len(seeded_rooms)} rooms from location_wise_rooms_cleaned.csv in FastAPI backend!")
        return seeded_rooms
    except Exception as e:
        print("Error seeding rooms from CSV:", e)
        return []

def init_seed_data():
    global rooms, users, admin_contacts, parking_slots, parking_reservations, workstations, workstation_bookings, visitors, invoices, tickets, notifications
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    today_str = datetime.date.today().isoformat()

    rooms = load_seed_rooms_from_csv()

    users = [
        {
            'user_id': 'usr_superadmin',
            'name': 'Super Admin',
            'email': 'superadmin@apexon.com',
            'department': 'Global Operations',
            'role': 'super_admin',
            'password_hash': 'admin123',
            'created_at': now
        },
        {
            'user_id': 'usr_puneadmin',
            'name': 'Pune Location Admin',
            'email': 'pune.admin@apexon.com',
            'department': 'Facility Mgmt',
            'role': 'admin_location',
            'password_hash': 'admin123',
            'created_at': now
        },
        {
            'user_id': 'usr_employee',
            'name': 'Rahul Sharma',
            'email': 'employee@apexon.com',
            'department': 'Engineering',
            'role': 'employee',
            'password_hash': 'user123',
            'created_at': now
        }
    ]

    default_admin_contacts = [
        {'location': 'Ahmedabad', 'name': 'Kalpana Parmar', 'email': 'kalpana.parmar@apexon.com', 'phone': '7698004492', 'role': 'Admin Team'},
        {'location': 'Chennai', 'name': 'Yuvaraj S', 'email': 'yuvaraj.s@apexon.com', 'phone': '9884000341', 'role': 'Admin Team'},
        {'location': 'Hyderabad', 'name': 'Yuvaraj S', 'email': 'yuvaraj.s@apexon.com', 'phone': '9884000341', 'role': 'Admin Team'},
        {'location': 'Coimbatore', 'name': 'Manoharan M', 'email': 'manoharan.m@apexon.com', 'phone': '9626873215', 'role': 'Admin Team'},
        {'location': 'Bangalore', 'name': 'Manjula Munikeshava', 'email': 'manjula.munikeshava@apexon.com', 'phone': '6361476691', 'role': 'Admin Team'},
        {'location': 'Pune', 'name': 'Nitin Nikumbh', 'email': 'nitin.nikumbh@apexon.com', 'phone': '7720008395', 'role': 'Admin Team'},
        {'location': 'Mumbai', 'name': 'Nitin Nikumbh', 'email': 'nitin.nikumbh@apexon.com', 'phone': '7720008395', 'role': 'Admin Team'}
    ]

    admin_contacts = [{
        'admin_id': f'adm_{i + 1}',
        **c,
        'active': True,
        'created_at': now,
        'updated_at': now
    } for i, c in enumerate(default_admin_contacts)]

    # Seed Parking Slots across all locations
    locations = ['Pune', 'Ahmedabad', 'Chennai', 'Hyderabad', 'Coimbatore', 'Bangalore', 'Mumbai']
    parking_slots = []
    parking_reservations = []

    for loc in locations:
        slots_configs = [
            {'num': 'P-101', 'zone': 'Ground Floor - Zone A', 'type': 'Standard', 'status': 'available'},
            {'num': 'P-102', 'zone': 'Ground Floor - Zone A', 'type': 'Standard', 'status': 'available'},
            {'num': 'P-103', 'zone': 'Ground Floor - EV Charging', 'type': 'EV', 'status': 'available'},
            {'num': 'P-104', 'zone': 'Ground Floor - EV Charging', 'type': 'EV', 'status': 'available'},
            {'num': 'P-105', 'zone': 'Ground Floor - Executive VIP', 'type': 'Executive', 'status': 'reserved'},
            {'num': 'P-106', 'zone': 'Ground Floor - Visitor Bay', 'type': 'Visitor', 'status': 'available'},
            {'num': 'P-107', 'zone': 'Ground Floor - Accessible', 'type': 'Accessible', 'status': 'available'},
            {'num': 'P-201', 'zone': 'Basement B1 - Zone B', 'type': 'Standard', 'status': 'available'},
            {'num': 'P-202', 'zone': 'Basement B1 - Zone B', 'type': 'Standard', 'status': 'available'},
            {'num': 'P-203', 'zone': 'Basement B1 - EV Bay', 'type': 'EV', 'status': 'available'},
            {'num': 'P-204', 'zone': 'Basement B1 - Zone B', 'type': 'Standard', 'status': 'available'},
            {'num': 'P-205', 'zone': 'Basement B1 - Zone B', 'type': 'Standard', 'status': 'available'},
        ]
        for idx, cfg in enumerate(slots_configs):
            s_id = f'ps_{loc.lower()}_{idx+1}'
            parking_slots.append({
                'slot_id': s_id,
                'slot_number': cfg['num'],
                'location': loc,
                'zone': cfg['zone'],
                'type': cfg['type'],
                'status': cfg['status']
            })

        # Seed 1 reservation per location
        parking_reservations.append({
            'reservation_id': f'pkres_{loc.lower()}_1',
            'slot_id': f'ps_{loc.lower()}_5',
            'slot_number': 'P-105',
            'user_id': 'usr_superadmin',
            'user_name': 'Super Admin',
            'vehicle_number': f'MH-12-AP-{random.randint(1000, 9999)}',
            'vehicle_type': 'EV Car',
            'location': loc,
            'date': today_str,
            'start_time': '09:00',
            'end_time': '18:00',
            'status': 'confirmed',
            'pass_code': f'PARK-{random.randint(1000, 9999)}',
            'created_at': now
        })

    # Seed Workstations
    workstations = []
    workstation_bookings = []

    for loc in locations:
        ws_configs = [
            {'label': 'WS-101', 'floor': 1, 'bay': 'Bay A', 'type': 'Hot Desk'},
            {'label': 'WS-102', 'floor': 1, 'bay': 'Bay A', 'type': 'Hot Desk'},
            {'label': 'WS-103', 'floor': 1, 'bay': 'Bay A', 'type': 'Dedicated Desk'},
            {'label': 'WS-104', 'floor': 1, 'bay': 'Bay B', 'type': 'Hot Desk'},
            {'label': 'WS-105', 'floor': 1, 'bay': 'Bay B', 'type': 'Tech Hub Desk'},
            {'label': 'WS-201', 'floor': 2, 'bay': 'Bay A', 'type': 'Hot Desk'},
            {'label': 'WS-202', 'floor': 2, 'bay': 'Bay A', 'type': 'Hot Desk'},
            {'label': 'WS-203', 'floor': 2, 'bay': 'Bay B', 'type': 'Dedicated Desk'},
        ]
        for idx, cfg in enumerate(ws_configs):
            ws_id = f'ws_{loc.lower()}_{idx+1}'
            workstations.append({
                'workstation_id': ws_id,
                'label': cfg['label'],
                'location': loc,
                'building': loc,
                'floor': cfg['floor'],
                'bay': cfg['bay'],
                'type': cfg['type'],
                'amenities': ['Power Outlet', 'Dual Monitors', 'Ethernet'],
                'status': 'active',
                'created_at': now,
                'updated_at': now
            })

    # Seed Visitors
    visitors = [
        {
            'visitor_id': 'vis_1',
            'visitor_name': 'Ananya Sharma',
            'company': 'TechPartner Corp',
            'email': 'ananya@techpartner.com',
            'phone': '9876543210',
            'host_id': 'usr_puneadmin',
            'host_name': 'Pune Location Admin',
            'location': 'Pune',
            'purpose': 'Vendor Technical Discussion',
            'visit_date': today_str,
            'expected_time': '11:00',
            'status': 'checked_in',
            'badge_code': 'VIS-8812',
            'nda_signed': True,
            'check_in_time': now,
            'created_at': now,
            'updated_at': now
        },
        {
            'visitor_id': 'vis_2',
            'visitor_name': 'Rohan Mehta',
            'company': 'Global Cloud Solutions',
            'email': 'rohan.m@gcloud.com',
            'phone': '9123456789',
            'host_id': 'usr_superadmin',
            'host_name': 'Super Admin',
            'location': 'Pune',
            'purpose': 'Client Demo Meeting',
            'visit_date': today_str,
            'expected_time': '14:30',
            'status': 'expected',
            'badge_code': 'VIS-4491',
            'nda_signed': True,
            'created_at': now,
            'updated_at': now
        }
    ]

    # Seed Invoices
    invoices = [
        {
            'invoice_id': 'inv_101',
            'document_type': 'Tax Invoice',
            'vendor_name': 'Acro Facility Management Services',
            'vendor_address': '102 Tech Park Road, Hinjewadi, Pune',
            'invoice_number': 'INV-2026-081',
            'invoice_date': today_str,
            'items': [
                {
                    'description': 'Monthly Office Deep Cleaning & HVAC Sanitation',
                    'type_of_service': 'Facility Services',
                    'start_date': today_str,
                    'end_date': today_str,
                    'quantity': 1,
                    'unit_price': 12000.0,
                    'amount': 12000.0
                }
            ],
            'subtotal': 12000.0,
            'tax': 2160.0,
            'total_amount': 14160.0,
            'currency': 'INR',
            'location': 'Pune',
            'status': 'processed',
            'file_name': 'acro_facility_invoice.pdf',
            'uploaded_by': 'Super Admin',
            'created_at': now,
            'notes': 'Quarterly sanitation contract'
        }
    ]

    # Seed Helpdesk Tickets
    tickets = [
        {
            'ticket_id': 'tkt_101',
            'ticket_number': 'HD-1092',
            'user_id': 'usr_employee',
            'user_name': 'Rahul Sharma',
            'user_email': 'employee@apexon.com',
            'category': 'Facilities & Maintenance',
            'subject': 'AC Temperature Calibration in Room 302',
            'description': 'The room cooling is set too low and thermostat control is unresponsive.',
            'location': 'Pune',
            'priority': 'medium',
            'status': 'in_progress',
            'assigned_to': 'Nitin Nikumbh',
            'comments': [
                {
                    'comment_id': 'cmt_1',
                    'user_name': 'Nitin Nikumbh',
                    'message': 'Facility team assigned to inspect sensor on floor 3.',
                    'created_at': now
                }
            ],
            'created_at': now,
            'updated_at': now
        }
    ]

    # Seed Notifications
    notifications = [
        {
            'notification_id': 'notif_1',
            'recipient_id': 'usr_superadmin',
            'sender_id': 'system',
            'type': 'welcome',
            'title': 'Apexon Workspace Hub Active',
            'message': 'System initialized with live room database and smart facility management.',
            'created_at': now,
            'read_at': None
        }
    ]

init_seed_data()

# ── HELPER: GET CURRENT USER FROM REQUEST ────────────────────────────────────

def get_current_user(request: Request):
    auth_header = request.headers.get('Authorization', '')
    user_id_header = request.headers.get('X-User-Id', '')

    current_user = None
    if user_id_header:
        current_user = next((u for u in users if u['user_id'] == user_id_header), None)
    elif auth_header:
        token = auth_header.replace('Bearer ', '').strip()
        current_user = next((u for u in users if u['user_id'] == token or u['email'] == token), None)

    if not current_user and len(users) > 0:
        current_user = users[0]

    return current_user or {}

# ── HEALTH & STATS ───────────────────────────────────────────────────────────

@app.get('/api/health')
def get_health():
    current_time = datetime.datetime.now(datetime.timezone.utc).isoformat()
    print("Health check at", current_time)
    return {
        'status': 'ok',
        'time': current_time,
        'backend': 'Python FastAPI',
        'counts': {
            'rooms': len(rooms),
            'workstations': len(workstations),
            'bookings': len(bookings),
            'workstation_bookings': len(workstation_bookings),
            'visitors': len(visitors),
            'invoices': len(invoices),
            'tickets': len(tickets)
        }
    }

@app.get('/api/stats')
def get_stats(location: Optional[str] = Query(None)):
    def filter_loc(items):
        if location:
            return [i for i in items if i.get('location') == location or i.get('building') == location]
        return items

    loc_rooms = filter_loc(rooms)
    loc_workstations = filter_loc(workstations)
    loc_bookings = filter_loc(bookings)
    loc_ws_bookings = filter_loc(workstation_bookings)
    loc_visitors = filter_loc(visitors)
    loc_invoices = filter_loc(invoices)
    loc_tickets = filter_loc(tickets)

    return {
        'rooms_count': len(loc_rooms),
        'active_rooms': len([r for r in loc_rooms if r.get('status') == 'active']),
        'workstations_count': len(loc_workstations),
        'active_workstations': len([w for w in loc_workstations if w.get('status') == 'active']),
        'total_room_bookings': len(loc_bookings),
        'confirmed_room_bookings': len([b for b in loc_bookings if b.get('status') == 'confirmed']),
        'total_workstation_bookings': len(loc_ws_bookings),
        'confirmed_workstation_bookings': len([b for b in loc_ws_bookings if b.get('status') in ['confirmed', 'checked_in']]),
        'total_visitors': len(loc_visitors),
        'checked_in_visitors': len([v for v in loc_visitors if v.get('status') == 'checked_in']),
        'total_invoices': len(loc_invoices),
        'total_expenses_amount': sum(inv.get('total_amount', 0) for inv in loc_invoices),
        'open_tickets': len([t for t in loc_tickets if t.get('status') in ['open', 'in_progress']])
    }

# ── AUTH & USER ROUTES ───────────────────────────────────────────────────────

@app.post('/api/auth/login')
async def auth_login(request: Request):
    data = await get_json_body(request)
    email = data.get('email', '')
    role = data.get('role', '')

    found = next((u for u in users if u['email'].lower() == email.lower()), None)
    if not found:
        found = {
            'user_id': f'usr_{int(time.time()*1000)}',
            'name': email.split('@')[0].title() if '@' in email else 'User',
            'email': email or 'user@apexon.com',
            'department': 'Operations',
            'role': role or ('super_admin' if 'superadmin' in email else 'admin_location' if 'admin' in email else 'employee'),
            'password_hash': 'pass123',
            'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat()
        }
        users.append(found)

    return {'user': user_safe(found), 'token': found['user_id']}

@app.post('/api/auth/register', status_code=201)
async def auth_register(request: Request):
    data = await get_json_body(request)
    email = (data.get('email') or '').strip().lower()
    name = data.get('name') or (email.split('@')[0].title() if '@' in email else 'User')

    existing = next((usr for usr in users if usr['email'].lower() == email), None)
    if existing:
        return {'user': user_safe(existing), 'token': existing['user_id']}

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_u = {
        'user_id': f'usr_{int(time.time()*1000)}',
        'name': name,
        'email': email,
        'department': data.get('department', 'Engineering'),
        'role': data.get('role', 'employee'),
        'password_hash': data.get('password', 'user123'),
        'created_at': now
    }
    users.append(new_u)
    return {'user': user_safe(new_u), 'token': new_u['user_id']}

@app.post('/api/auth/reset')
async def auth_reset(request: Request):
    data = await get_json_body(request)
    email = (data.get('email') or '').strip().lower()
    u = next((usr for usr in users if usr['email'].lower() == email), None)
    if u:
        u['password_hash'] = data.get('password', 'user123')
    return {'message': 'Password updated successfully'}

@app.get('/api/users')
def get_users():
    return [user_safe(u) for u in users]

@app.get('/api/users/{u_id}/bookings')
def get_user_bookings(u_id: str):
    user_bkgs = [b for b in bookings if b.get('user_id') == u_id]
    user_ws_bkgs = [w for w in workstation_bookings if w.get('user_id') == u_id]
    user_pk_bkgs = [p for p in parking_reservations if p.get('user_id') == u_id]
    return {
        'room_bookings': user_bkgs,
        'workstation_bookings': user_ws_bkgs,
        'parking_reservations': user_pk_bkgs
    }

@app.post('/api/users', status_code=201)
async def create_user(request: Request):
    data = await request.json()
    new_u = {
        'user_id': f'usr_{int(time.time()*1000)}',
        'name': data.get('name', 'New User'),
        'email': data.get('email', 'user@apexon.com'),
        'department': data.get('department', 'Engineering'),
        'role': data.get('role', 'employee'),
        'password_hash': 'pass123',
        'created_at': datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    users.append(new_u)
    return user_safe(new_u)

@app.get('/api/admin-contacts')
def get_admin_contacts(location: Optional[str] = Query(None)):
    filtered = [c for c in admin_contacts if c['location'] == location] if location else admin_contacts
    return filtered

# ── ROOMS & ROOM BOOKINGS ────────────────────────────────────────────────────

@app.get('/api/rooms')
def get_rooms(
    location: Optional[str] = Query(None),
    capacity: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    result = list(rooms)
    if location:
        result = [r for r in result if r.get('location') == location]
    if capacity:
        try:
            cap_val = int(capacity)
            result = [r for r in result if r.get('capacity', 0) >= cap_val]
        except ValueError:
            pass
    if status:
        result = [r for r in result if r.get('status') == status]

    return result

@app.post('/api/rooms', status_code=201)
async def create_room(request: Request):
    data = await get_json_body(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_room = {
        'room_id': f'room_{int(time.time()*1000)}',
        'name': data.get('name', 'New Room'),
        'location': data.get('location', 'Pune'),
        'building': data.get('building') or data.get('location') or 'Tower A',
        'floor': int(data.get('floor', 1)),
        'capacity': int(data.get('capacity', 6)),
        'amenities': data.get('amenities', []) if isinstance(data.get('amenities'), list) else [],
        'status': data.get('status', 'active'),
        'room_type': data.get('room_type', 'Meeting Room'),
        'vc_enabled': bool(data.get('vc_enabled')),
        'power_points': bool(data.get('power_points')),
        'created_at': now,
        'updated_at': now
    }
    rooms.insert(0, new_room)
    return new_room

@app.put('/api/rooms/{room_id}')
async def update_room(room_id: str, request: Request):
    room = next((r for r in rooms if r['room_id'] == room_id), None)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    data = await get_json_body(request)
    room.update(data)
    room['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return room

@app.get('/api/rooms/{room_id}/availability')
def get_room_availability(room_id: str, date: Optional[str] = Query(None)):
    target_date = date or datetime.date.today().isoformat()
    booked_times = []
    for b in bookings:
        if b.get('room_id') == room_id and b.get('date') == target_date and b.get('status') != 'cancelled':
            booked_times.append({
                'booking_id': b.get('booking_id'),
                'title': b.get('title'),
                'start_time': b.get('start_time'),
                'end_time': b.get('end_time'),
                'user_name': b.get('user_name')
            })
    return {
        'room_id': room_id,
        'date': target_date,
        'booked_slots': booked_times,
        'available': True
    }

@app.delete('/api/rooms/{room_id}', status_code=204)
def delete_room(room_id: str):
    global rooms
    rooms = [r for r in rooms if r['room_id'] != room_id]
    return Response(status_code=204)

@app.post('/api/rooms/import')
async def import_rooms_csv(file: UploadFile = File(...)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="Empty CSV file")

    try:
        content_bytes = await file.read()
        content = content_bytes.decode('utf-8', errors='ignore')
        rows = parse_csv_lines(content)
        if len(rows) == 0:
            raise HTTPException(status_code=400, detail="CSV file is empty")

        first_row = [c.lower().strip() for c in rows[0]]
        has_header = any('room' in c or 'location' in c or 'floor' in c or 'type' in c for c in first_row)

        start_index = 0
        name_idx, loc_idx, floor_idx, type_idx, cabin_idx, cap_idx, amen_idx, vc_idx, power_idx = 0, 1, 2, 3, 4, 5, 6, 7, 8

        if has_header:
            start_index = 1
            for idx, col in enumerate(first_row):
                if 'room name' in col or col == 'name' or 'room' in col:
                    name_idx = idx
                elif 'location' in col or 'building' in col or 'city' in col:
                    loc_idx = idx
                elif 'floor' in col:
                    floor_idx = idx
                elif 'room type' in col or ('type' in col and 'cabin' not in col):
                    type_idx = idx
                elif 'cabin' in col:
                    cabin_idx = idx
                elif 'capacity' in col or 'seating' in col or 'seats' in col:
                    cap_idx = idx
                elif 'amenities' in col or 'feature' in col:
                    amen_idx = idx
                elif 'vc' in col or 'video' in col or 'conferencing' in col:
                    vc_idx = idx
                elif 'power' in col or 'plug' in col or 'outlet' in col:
                    power_idx = idx

        created = 0
        skipped = 0
        failed = 0
        created_rooms = []
        failed_rooms = []

        now = datetime.datetime.now(datetime.timezone.utc).isoformat()

        for i in range(start_index, len(rows)):
            row = rows[i]
            if not row or all(not cell.strip() for cell in row):
                continue

            room_name = row[name_idx].strip() if len(row) > name_idx else ''
            if not room_name:
                failed += 1
                failed_rooms.append({'name': f'Row {i + 1}', 'reason': 'Room name is required'})
                continue

            location = row[loc_idx].strip() if len(row) > loc_idx and row[loc_idx].strip() else 'Pune'
            building = location
            
            try:
                floor_num = int(row[floor_idx].strip()) if len(row) > floor_idx and row[floor_idx].strip() else 1
            except ValueError:
                floor_num = 1

            room_type = row[type_idx].strip() if len(row) > type_idx and row[type_idx].strip() else 'Meeting Room'
            cabin_type = row[cabin_idx].strip() if len(row) > cabin_idx and row[cabin_idx].strip() else None

            cap_raw = row[cap_idx].strip() if len(row) > cap_idx else ''
            digits = re.sub(r'\D', '', cap_raw)
            capacity_num = int(digits) if digits else 6

            amen_raw = row[amen_idx].strip() if len(row) > amen_idx else ''
            amenities = [a.strip() for a in re.split(r'[,;|]', amen_raw) if a.strip()] if amen_raw else []

            vc_val = (row[vc_idx] if len(row) > vc_idx else '').lower().strip()
            vc_enabled = vc_val in ['true', 'yes', '1', 'y', 'vc', 'enabled']

            power_val = (row[power_idx] if len(row) > power_idx else '').lower().strip()
            power_points = power_val in ['true', 'yes', '1', 'y', 'enabled']

            # Check existing duplicate
            existing = next((r for r in rooms if r['name'].lower() == room_name.lower() and r['location'].lower() == location.lower()), None)
            if existing:
                skipped += 1
                continue

            new_r = {
                'room_id': f'room_{int(time.time()*1000)}_{random.randint(100,999)}',
                'name': room_name,
                'location': location,
                'building': building,
                'floor': floor_num,
                'capacity': capacity_num,
                'amenities': amenities,
                'status': 'active',
                'room_type': room_type,
                'cabin_type': cabin_type,
                'vc_enabled': vc_enabled,
                'power_points': power_points,
                'created_at': now,
                'updated_at': now
            }
            rooms.insert(0, new_r)
            created += 1
            created_rooms.append(new_r)

        return {
            'created': created,
            'skipped': skipped,
            'failed': failed,
            'created_rooms': created_rooms,
            'failed_rooms': failed_rooms
        }
    except Exception as e:
        print("Error importing rooms in Python:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/bookings')
def get_bookings(
    room_id: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    date: Optional[str] = Query(None)
):
    result = list(bookings)
    if room_id:
        result = [b for b in result if b.get('room_id') == room_id]
    if user_id:
        result = [b for b in result if b.get('user_id') == user_id]
    if location:
        r_ids = [r['room_id'] for r in rooms if r.get('location') == location]
        result = [b for b in result if b.get('room_id') in r_ids]
    if date:
        result = [b for b in result if b.get('start_time', '').startswith(date)]

    return result

@app.post('/api/bookings', status_code=201)
async def create_booking(request: Request):
    data = await get_json_body(request)
    user = get_current_user(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_bkg = {
        'booking_id': f'bkg_{int(time.time()*1000)}',
        'room_id': data.get('room_id'),
        'user_id': user.get('user_id', 'usr_superadmin'),
        'title': data.get('title', 'Meeting'),
        'start_time': data.get('start_time'),
        'end_time': data.get('end_time'),
        'status': 'confirmed',
        'attendees': data.get('attendees') if isinstance(data.get('attendees'), list) else [user.get('email', 'employee@apexon.com')],
        'notes': data.get('notes', ''),
        'created_at': now,
        'updated_at': now,
        'meeting_type': data.get('meeting_type', 'Internal'),
        'meeting_description': data.get('meeting_description', '')
    }
    bookings.insert(0, new_bkg)
    return new_bkg

@app.delete('/api/bookings/{booking_id}')
def cancel_booking(booking_id: str):
    bkg = next((b for b in bookings if b['booking_id'] == booking_id), None)
    if not bkg:
        raise HTTPException(status_code=404, detail="Booking not found")
    bkg['status'] = 'cancelled'
    bkg['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return bkg

# ── WORKSTATIONS & WORKSTATION BOOKINGS ──────────────────────────────────────

@app.get('/api/workstations')
def get_workstations(
    location: Optional[str] = Query(None),
    floor: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date: Optional[str] = Query(None)
):
    result = list(workstations)
    if location:
        result = [w for w in result if w.get('location') == location]
    if floor:
        try:
            fl_num = int(floor)
            result = [w for w in result if w.get('floor') == fl_num]
        except ValueError:
            pass
    if type:
        result = [w for w in result if w.get('type') == type]
    if status:
        result = [w for w in result if w.get('status') == status]

    if date:
        booked_ids = [b['workstation_id'] for b in workstation_bookings if b.get('date') == date and b.get('status') in ['confirmed', 'checked_in']]
        result = [{**w, 'is_booked': w['workstation_id'] in booked_ids} for w in result]

    return result

@app.post('/api/workstations', status_code=201)
async def create_workstation(request: Request):
    data = await get_json_body(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_ws = {
        'workstation_id': f'ws_{int(time.time()*1000)}',
        'label': data.get('label') or f'WS-{random.randint(100, 999)}',
        'location': data.get('location', 'Pune'),
        'building': data.get('building') or data.get('location') or 'Tower A',
        'floor': int(data.get('floor', 1)),
        'bay': data.get('bay', 'General'),
        'type': data.get('type', 'Hot Desk'),
        'amenities': data.get('amenities', ['Power Outlet', 'Dual Monitors']) if isinstance(data.get('amenities'), list) else ['Power Outlet'],
        'status': data.get('status', 'active'),
        'created_at': now,
        'updated_at': now
    }
    workstations.insert(0, new_ws)
    return new_ws

@app.put('/api/workstations/{ws_id}')
async def update_workstation(ws_id: str, request: Request):
    ws = next((w for w in workstations if w['workstation_id'] == ws_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workstation not found")
    data = await get_json_body(request)
    ws.update(data)
    ws['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return ws

@app.delete('/api/workstations/{ws_id}', status_code=204)
def delete_workstation(ws_id: str):
    global workstations
    workstations = [w for w in workstations if w['workstation_id'] != ws_id]
    return Response(status_code=204)

@app.get('/api/workstation-bookings')
def get_workstation_bookings(
    user_id: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    date: Optional[str] = Query(None)
):
    result = list(workstation_bookings)
    if user_id:
        result = [b for b in result if b.get('user_id') == user_id]
    if location:
        result = [b for b in result if b.get('location') == location]
    if date:
        result = [b for b in result if b.get('date') == date]

    return result

@app.post('/api/workstation-bookings', status_code=201)
async def create_workstation_booking(request: Request):
    data = await get_json_body(request)
    user = get_current_user(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    ws = next((w for w in workstations if w['workstation_id'] == data.get('workstation_id')), None)
    label = ws['label'] if ws else data.get('label', 'Workstation')
    location = ws['location'] if ws else data.get('location', 'Pune')

    # Check duplicate booking
    existing = next((b for b in workstation_bookings if b['workstation_id'] == data.get('workstation_id') and b['date'] == data.get('date') and b['status'] in ['confirmed', 'checked_in']), None)
    if existing:
        raise HTTPException(status_code=400, detail=f'Workstation {label} is already booked on {data.get("date")}.')

    new_bkg = {
        'booking_id': f'wsbkg_{int(time.time()*1000)}',
        'workstation_id': data.get('workstation_id'),
        'label': label,
        'user_id': user.get('user_id', 'usr_superadmin'),
        'user_name': user.get('name', 'User'),
        'user_email': user.get('email', 'user@apexon.com'),
        'location': location,
        'date': data.get('date') or datetime.date.today().isoformat(),
        'slot_type': data.get('slot_type', 'Full Day'),
        'start_time': data.get('start_time', '09:00'),
        'end_time': data.get('end_time', '18:00'),
        'status': 'confirmed',
        'created_at': now
    }
    workstation_bookings.insert(0, new_bkg)

    notifications.append({
        'notification_id': f'notif_{int(time.time()*1000)}',
        'recipient_id': user.get('user_id', 'usr_superadmin'),
        'sender_id': 'system',
        'type': 'workstation_booked',
        'title': 'Workstation Confirmed',
        'message': f'Your booking for workstation {label} on {new_bkg["date"]} is confirmed.',
        'metadata': {'booking_id': new_bkg['booking_id']},
        'created_at': now,
        'read_at': None
    })

    return new_bkg

@app.put('/api/workstation-bookings/{b_id}/cancel')
def cancel_ws_booking(b_id: str):
    b = next((x for x in workstation_bookings if x['booking_id'] == b_id), None)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    b['status'] = 'cancelled'
    return b

@app.put('/api/workstation-bookings/{b_id}/checkin')
def checkin_ws_booking(b_id: str):
    b = next((x for x in workstation_bookings if x['booking_id'] == b_id), None)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    b['status'] = 'checked_in'
    b['actual_check_in'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return b

@app.put('/api/workstation-bookings/{b_id}/checkout')
def checkout_ws_booking(b_id: str):
    b = next((x for x in workstation_bookings if x['booking_id'] == b_id), None)
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    b['status'] = 'completed'
    b['actual_check_out'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return b

# ── INVOICE CUSTOM OCR (LIBRARIES ONLY - NO GEMINI) ───────────────────────────

def extract_text_from_file_bytes(file_bytes, filename, mimetype):
    extracted_text = ""
    ext = filename.lower().split('.')[-1] if '.' in filename else ''

    # 1. Try PDF extraction with pdfplumber / pypdf
    if ext == 'pdf' or 'pdf' in mimetype:
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                pages_text = [page.extract_text() or "" for page in pdf.pages]
                extracted_text = "\n".join(pages_text)
        except Exception as e:
            print("pdfplumber error:", e)

        if not extracted_text.strip():
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                pages_text = [p.extract_text() or "" for p in reader.pages]
                extracted_text = "\n".join(pages_text)
            except Exception as e:
                print("pypdf error:", e)

    # 2. Try Image PyTesseract OCR if image or scanned PDF
    if not extracted_text.strip():
        try:
            image = Image.open(io.BytesIO(file_bytes))
            if image.mode in ("RGBA", "P"):
                image = image.convert("RGB")
            extracted_text = pytesseract.image_to_string(image)
        except Exception as e:
            print("pytesseract OCR error:", e)

    return extracted_text

def parse_custom_invoice_ocr(text, filename):
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    full_text = " ".join(lines)

    # Document Type
    doc_type = "Tax Invoice"
    if re.search(r'receipt', full_text, re.I):
        doc_type = "Receipt"
    elif re.search(r'utility\s*bill', full_text, re.I):
        doc_type = "Utility Bill"
    elif re.search(r'credit\s*note', full_text, re.I):
        doc_type = "Credit Note"
    elif re.search(r'purchase\s*order', full_text, re.I):
        doc_type = "Purchase Order"

    # Vendor Name
    vendor_name = "Extracted Vendor Solutions"
    v_match = re.search(r'(?:Vendor|Supplier|Company|Billed By|From)\s*[:#]?\s*([A-Za-z0-9\s.,&\'"-]{3,40})', full_text, re.I)
    if v_match and v_match.group(1).strip():
        vendor_name = v_match.group(1).strip()
    elif len(lines) > 0:
        for line in lines[:5]:
            if not re.search(r'invoice|tax|receipt|bill|date|number|to:', line, re.I) and len(line) > 3:
                vendor_name = line
                break

    # Vendor Address
    vendor_address = ""
    addr_match = re.search(r'(?:Address|Location)\s*[:#]?\s*([A-Za-z0-9\s.,#-]{10,60})', full_text, re.I)
    if addr_match:
        vendor_address = addr_match.group(1).strip()

    # Invoice Number
    invoice_number = f"INV-{random.randint(100000, 999999)}"
    inv_match = re.search(r'(?:Invoice\s*(?:#|No|Num|Number)?|INV[-:#\s]*|Bill\s*(?:#|No)?)\s*[:#]?\s*([A-Za-z0-9/-]{3,25})', full_text, re.I)
    if inv_match:
        invoice_number = inv_match.group(1).strip()

    # Invoice Date
    today_str = datetime.date.today().isoformat()
    invoice_date = today_str
    date_match = re.search(r'(?:Invoice\s*Date|Date|Dated)\s*[:#]?\s*([A-Za-z0-9\s,/-]{6,20})', full_text, re.I)
    if date_match:
        raw_d = date_match.group(1).strip()
        iso_m = re.search(r'\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b', raw_d)
        if iso_m:
            invoice_date = iso_m.group(1).replace('/', '-').replace('.', '-')
        else:
            slash_m = re.search(r'\b(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})\b', raw_d)
            if slash_m:
                d, m, y = slash_m.groups()
                if len(y) == 2:
                    y = "20" + y
                invoice_date = f"{y}-{int(m):02d}-{int(d):02d}"

    # Currency
    currency = "USD"
    if '₹' in text or 'INR' in text.upper():
        currency = "INR"
    elif '€' in text or 'EUR' in text.upper():
        currency = "EUR"
    elif '£' in text or 'GBP' in text.upper():
        currency = "GBP"

    # Amounts
    total_amount = 590.0
    subtotal = 500.0
    tax = 90.0

    tot_match = re.search(r'(?:Grand\s*Total|Total\s*Amount|Amount\s*Due|Total|Net\s*Payable)\s*[:$₹€£]?\s*([\d,]+\.?\d*)', full_text, re.I)
    if tot_match:
        try:
            v = float(tot_match.group(1).replace(',', ''))
            if v > 0:
                total_amount = v
        except ValueError:
            pass

    sub_match = re.search(r'(?:Sub\s*Total|Subtotal|Net\s*Amount)\s*[:$₹€£]?\s*([\d,]+\.?\d*)', full_text, re.I)
    if sub_match:
        try:
            v = float(sub_match.group(1).replace(',', ''))
            if v > 0:
                subtotal = v
        except ValueError:
            pass
    else:
        subtotal = round(total_amount / 1.18, 2)

    tax_match = re.search(r'(?:Tax|GST|VAT|CGST|SGST|IGST)\s*[:$₹€£]?\s*([\d,]+\.?\d*)', full_text, re.I)
    if tax_match:
        try:
            v = float(tax_match.group(1).replace(',', ''))
            if v >= 0:
                tax = v
        except ValueError:
            pass
    else:
        tax = round(total_amount - subtotal, 2)

    # Line Items
    items = []
    for line in lines:
        m = re.search(r'([A-Za-z0-9\s\-_()]{4,35})\s+(\d+)\s+[:$₹€£]?([\d,]+\.?\d*)\s+[:$₹€£]?([\d,]+\.?\d*)', line)
        if m:
            desc, qty_s, price_s, amt_s = m.groups()
            try:
                items.append({
                    "description": desc.strip(),
                    "type_of_service": "Facility & IT Services",
                    "start_date": invoice_date,
                    "end_date": invoice_date,
                    "quantity": int(qty_s),
                    "unit_price": float(price_s.replace(',', '')),
                    "amount": float(amt_s.replace(',', ''))
                })
            except ValueError:
                pass

    if not items:
        items = [{
            "description": "Workspace Maintenance & Equipment Service",
            "type_of_service": "IT Infrastructure Support",
            "start_date": invoice_date,
            "end_date": invoice_date,
            "quantity": 1,
            "unit_price": subtotal,
            "amount": subtotal
        }]

    return {
        "document_type": doc_type,
        "vendor_name": vendor_name,
        "vendor_address": vendor_address,
        "invoice_number": invoice_number,
        "invoice_date": invoice_date,
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "total_amount": total_amount,
        "currency": currency
    }

@app.post('/api/invoices/process-ocr')
async def process_invoice_ocr(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No document uploaded")

    print("Processing OCR...")

    filename = file.filename or 'document.png'
    mimetype = file.content_type or 'image/png'

    file_bytes = await file.read()
    raw_text = extract_text_from_file_bytes(file_bytes, filename, mimetype)
    parsed_data = parse_custom_invoice_ocr(raw_text, filename)

    data = extract_invoice_fields(file_bytes)

    return {
        'success': True,
        'file_name': filename,
        'ocr_engine': 'FastAPI PyTesseract + pdfplumber + PyPDF Custom Parser',
        'data': data
    }

@app.get('/api/invoices')
def get_invoices(
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    result = list(invoices)
    if location:
        result = [i for i in result if i.get('location') == location]
    if status:
        result = [i for i in result if i.get('status') == status]

    return result

@app.post('/api/invoices', status_code=201)
async def create_invoice(request: Request):
    data = await get_json_body(request)
    user = get_current_user(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_inv = {
        'invoice_id': f'inv_{int(time.time()*1000)}',
        'document_type': data.get('document_type', 'Invoice'),
        'vendor_name': data.get('vendor_name', 'Vendor'),
        'vendor_address': data.get('vendor_address', ''),
        'invoice_number': data.get('invoice_number') or f'INV-{str(int(time.time()))[-6:]}',
        'invoice_date': data.get('invoice_date') or datetime.date.today().isoformat(),
        'items': data.get('items') if isinstance(data.get('items'), list) else [],
        'subtotal': safe_float(data.get('subtotal')),
        'tax': safe_float(data.get('tax')),
        'total_amount': safe_float(data.get('total_amount')),

        'currency': data.get('currency', 'USD'),
        'location': data.get('location', 'Pune'),
        'status': data.get('status', 'processed'),
        'file_name': data.get('file_name', 'document.png'),
        'uploaded_by': user.get('name', 'Admin'),
        'created_at': now,
        'notes': data.get('notes', '')
    }
    invoices.insert(0, new_inv)
    return new_inv

@app.delete('/api/invoices/{inv_id}', status_code=204)
def delete_invoice(inv_id: str):
    global invoices
    invoices = [i for i in invoices if i['invoice_id'] != inv_id]
    return Response(status_code=204)

# ── VISIFLOW VISITORS ────────────────────────────────────────────────────────

@app.get('/api/visitors')
def get_visitors(
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    result = list(visitors)
    if location:
        result = [v for v in result if v.get('location') == location]
    if status:
        result = [v for v in result if v.get('status') == status]

    return result

@app.post('/api/visitors', status_code=201)
async def create_visitor(request: Request):
    data = await get_json_body(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_v = {
        'visitor_id': f'vis_{int(time.time()*1000)}',
        'visitor_name': data.get('visitor_name', 'External Guest'),
        'company': data.get('company', 'External Guest'),
        'email': data.get('email', 'guest@example.com'),
        'phone': data.get('phone', ''),
        'host_id': data.get('host_id', 'usr_superadmin'),
        'host_name': data.get('host_name', 'Host Admin'),
        'location': data.get('location', 'Pune'),
        'purpose': data.get('purpose', 'Business Meeting'),
        'visit_date': data.get('visit_date') or datetime.date.today().isoformat(),
        'expected_time': data.get('expected_time', '10:00'),
        'status': 'expected',
        'badge_code': f'VIS-{random.randint(1000, 9999)}',
        'nda_signed': bool(data.get('nda_signed')),
        'created_at': now,
        'updated_at': now
    }
    visitors.insert(0, new_v)
    return new_v

@app.post('/api/visitors/{v_id}/checkin')
def checkin_visitor(v_id: str):
    v = next((x for x in visitors if x['visitor_id'] == v_id), None)
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found")
    v['status'] = 'checked_in'
    v['check_in_time'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    v['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return v

@app.post('/api/visitors/{v_id}/checkout')
def checkout_visitor(v_id: str):
    v = next((x for x in visitors if x['visitor_id'] == v_id), None)
    if not v:
        raise HTTPException(status_code=404, detail="Visitor not found")
    v['status'] = 'checked_out'
    v['check_out_time'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    v['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return v

@app.delete('/api/visitors/{v_id}', status_code=204)
def delete_visitor(v_id: str):
    global visitors
    visitors = [v for v in visitors if v['visitor_id'] != v_id]
    return Response(status_code=204)

# ── PARKSWIFT PARKING ────────────────────────────────────────────────────────

@app.get('/api/parking/slots')
def get_parking_slots(location: Optional[str] = Query(None)):
    result = list(parking_slots)
    if location:
        result = [s for s in result if s.get('location') == location]
    return result

@app.post('/api/parking/slots', status_code=201)
async def create_parking_slot(request: Request):
    data = await get_json_body(request)
    new_slot = {
        'slot_id': f'ps_{int(time.time()*1000)}',
        'slot_number': data.get('slot_number') or f'P-{len(parking_slots) + 1}',
        'location': data.get('location', 'Pune'),
        'zone': data.get('zone', 'Ground Floor'),
        'type': data.get('type', 'Standard'),
        'status': 'available'
    }
    parking_slots.insert(0, new_slot)
    return new_slot

@app.get('/api/parking/reservations')
def get_parking_reservations(
    user_id: Optional[str] = Query(None),
    location: Optional[str] = Query(None)
):
    result = list(parking_reservations)
    if user_id:
        result = [r for r in result if r.get('user_id') == user_id]
    if location:
        result = [r for r in result if r.get('location') == location]
    return result

@app.post('/api/parking/reservations', status_code=201)
async def create_parking_reservation(request: Request):
    data = await get_json_body(request)
    user = get_current_user(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    slot_id = data.get('slot_id', 'ps_1')
    slot = next((s for s in parking_slots if s['slot_id'] == slot_id), None)
    slot_number = slot['slot_number'] if slot else data.get('slot_number', 'P-01')
    location = slot['location'] if slot else data.get('location', 'Pune')

    new_res = {
        'reservation_id': f'pkres_{int(time.time()*1000)}',
        'slot_id': slot_id,
        'slot_number': slot_number,
        'user_id': user.get('user_id', 'usr_superadmin'),
        'user_name': user.get('name', 'User'),
        'vehicle_number': data.get('vehicle_number', 'MH-12-AB-1234'),
        'vehicle_type': data.get('vehicle_type', 'Car'),
        'location': location,
        'date': data.get('date') or datetime.date.today().isoformat(),
        'start_time': data.get('start_time', '09:00'),
        'end_time': data.get('end_time', '18:00'),
        'status': 'confirmed',
        'pass_code': f'PARK-{random.randint(1000, 9999)}',
        'created_at': now
    }
    if slot:
        slot['status'] = 'reserved'
    parking_reservations.insert(0, new_res)
    return new_res

@app.post('/api/parking/reservations/{res_id}/checkin')
def checkin_parking_reservation(res_id: str):
    res = next((r for r in parking_reservations if r['reservation_id'] == res_id), None)
    if not res:
        raise HTTPException(status_code=404, detail="Parking reservation not found")
    res['status'] = 'checked_in'
    res['check_in_time'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return res

@app.post('/api/parking/reservations/{res_id}/checkout')
def checkout_parking_reservation(res_id: str):
    res = next((r for r in parking_reservations if r['reservation_id'] == res_id), None)
    if not res:
        raise HTTPException(status_code=404, detail="Parking reservation not found")
    res['status'] = 'checked_out'
    res['check_out_time'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    slot = next((s for s in parking_slots if s['slot_id'] == res.get('slot_id')), None)
    if slot:
        slot['status'] = 'available'
    return res

@app.delete('/api/parking/reservations/{res_id}', status_code=204)
def cancel_parking_reservation(res_id: str):
    global parking_reservations
    res = next((r for r in parking_reservations if r['reservation_id'] == res_id), None)
    if res:
        slot = next((s for s in parking_slots if s['slot_id'] == res.get('slot_id')), None)
        if slot:
            slot['status'] = 'available'
    parking_reservations = [r for r in parking_reservations if r['reservation_id'] != res_id]
    return Response(status_code=204)

# ── HELPDESK TICKETS ─────────────────────────────────────────────────────────

@app.get('/api/tickets')
def get_tickets(
    user_id: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    status: Optional[str] = Query(None)
):
    result = list(tickets)
    if user_id:
        result = [t for t in result if t.get('user_id') == user_id]
    if location:
        result = [t for t in result if t.get('location') == location]
    if status:
        result = [t for t in result if t.get('status') == status]

    return result

@app.post('/api/tickets', status_code=201)
async def create_ticket(request: Request):
    data = await get_json_body(request)
    user = get_current_user(request)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_t = {
        'ticket_id': f'tkt_{int(time.time()*1000)}',
        'ticket_number': f'HD-{random.randint(1000, 9999)}',
        'user_id': user.get('user_id', 'usr_superadmin'),
        'user_name': user.get('name', 'User'),
        'user_email': user.get('email', 'user@apexon.com'),
        'category': data.get('category', 'Facilities & Maintenance'),
        'subject': data.get('subject', 'Support Ticket Request'),
        'description': data.get('description', ''),
        'location': data.get('location', 'Pune'),
        'priority': data.get('priority', 'medium'),
        'status': 'open',
        'assigned_to': 'Unassigned',
        'comments': [],
        'created_at': now,
        'updated_at': now
    }
    tickets.insert(0, new_t)
    return new_t

@app.get('/api/tickets/{tkt_id}')
def get_ticket_by_id(tkt_id: str):
    t = next((x for x in tickets if x['ticket_id'] == tkt_id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return t

@app.put('/api/tickets/{tkt_id}')
async def update_ticket(tkt_id: str, request: Request):
    data = await get_json_body(request)
    t = next((x for x in tickets if x['ticket_id'] == tkt_id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if 'status' in data: t['status'] = data['status']
    if 'priority' in data: t['priority'] = data['priority']
    if 'assigned_to' in data: t['assigned_to'] = data['assigned_to']
    t['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return t

@app.post('/api/tickets/{tkt_id}/comments')
async def add_ticket_comment(tkt_id: str, request: Request):
    data = await get_json_body(request)
    user = get_current_user(request)
    t = next((x for x in tickets if x['ticket_id'] == tkt_id), None)
    if not t:
        raise HTTPException(status_code=404, detail="Ticket not found")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    comment = {
        'comment_id': f'cmt_{int(time.time()*1000)}',
        'user_name': user.get('name', 'User'),
        'message': data.get('message', ''),
        'created_at': now
    }
    t.setdefault('comments', []).append(comment)
    t['updated_at'] = now
    return t

# ── INVOICE ALIASES ──────────────────────────────────────────────────────────

@app.post('/api/invoices/upload')
async def upload_invoice_alias(file: UploadFile = File(...), request: Request = None):
    # Process OCR and store invoice
    form_data = await process_invoice_ocr(file)
    user = get_current_user(request) if request else {}
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    new_inv = {
        'invoice_id': f'inv_{int(time.time()*1000)}',
        **form_data,
        'status': 'processed',
        'file_name': file.filename,
        'uploaded_by': user.get('name', 'Admin'),
        'created_at': now
    }
    invoices.insert(0, new_inv)
    return new_inv

# ── NOTIFICATIONS ───────────────────────────────────────────────────────────

@app.get('/api/notifications')
def get_notifications(
    user_id: Optional[str] = Query(None),
    read: Optional[str] = Query(None)
):
    result = list(notifications)
    if user_id:
        user_notifs = [n for n in result if n.get('recipient_id') == user_id]
        if user_notifs:
            result = user_notifs
        else:
            # Fallback to general/superadmin notifications so user receives system updates
            result = [n for n in result if n.get('recipient_id') in [user_id, 'all', 'usr_superadmin', 'system']]
    
    if read is not None and str(read).strip() != '':
        is_read_filter = str(read).lower() in ['true', '1', 'read']
        if is_read_filter:
            result = [n for n in result if n.get('read_at') is not None]
        else:
            result = [n for n in result if n.get('read_at') is None]

    return result

@app.put('/api/notifications/{n_id}/read')
@app.post('/api/notifications/{n_id}/read')
def mark_notif_read(n_id: str):
    n = next((notif for notif in notifications if notif['notification_id'] == n_id), None)
    if n:
        n['read_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return n or {}

@app.put('/api/notifications/{n_id}/unread')
@app.post('/api/notifications/{n_id}/unread')
def mark_notif_unread(n_id: str):
    n = next((notif for notif in notifications if notif['notification_id'] == n_id), None)
    if n:
        n['read_at'] = None
    return n or {}

@app.put('/api/notifications/read-all')
@app.post('/api/notifications/read-all')
def mark_all_read(user_id: Optional[str] = Query(None)):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    for n in notifications:
        if not user_id or n.get('recipient_id') in [user_id, 'usr_superadmin', 'all']:
            n['read_at'] = now
    return {'message': 'All notifications marked as read'}

@app.put('/api/notifications/unread-all')
@app.post('/api/notifications/unread-all')
def mark_all_unread(user_id: Optional[str] = Query(None)):
    for n in notifications:
        if not user_id or n.get('recipient_id') in [user_id, 'usr_superadmin', 'all']:
            n['read_at'] = None
    return {'message': 'All notifications marked as unread'}

# ── AI CHATBOT ROUTE ─────────────────────────────────────────────────────────

@app.post('/api/chat')
async def chat_bot(request: Request):
    data = await get_json_body(request)
    message = (data.get('message') or '').strip()

    if not message:
        return {'reply': "Hello! I am your Apexon AI Workspace Concierge. How can I assist you with rooms, workstations, parking, visitors, or helpdesk tickets today?"}

    reply = "I'm your Apexon AI Workspace Assistant! I can help you with room bookings (/bookings), workstation hot-desk reservations (/workstations), smart parking (/parking), visitor passes (/visitors), OCR invoice processing (/invoices), or submitting helpdesk tickets (/helpdesk)."
    return {'reply': reply}

# ── STATIC FILE SERVING FOR PRODUCTION ──────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent
dist_dir = BASE_DIR / "dist"

if dist_dir.exists():
    assets_dir = dist_dir / "assets"

    if assets_dir.exists():
        app.mount(
            "/assets",
            StaticFiles(directory=str(assets_dir)),
            name="assets"
        )

@app.get("/")
async def serve_frontend():
    if os.environ.get("NODE_ENV") == "production" and dist_dir.exists():
        return FileResponse(dist_dir / "index.html")

    return JSONResponse(
        {"error": "In development mode, please access Vite server on port 3000"},
        status_code=404
    )

@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    if os.environ.get("NODE_ENV") == "production" and dist_dir.exists():
        file_path = dist_dir / full_path

        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

        # React Router SPA fallback
        return FileResponse(dist_dir / "index.html")

    return JSONResponse(
        {"error": "In development mode, please access Vite server on port 3000"},
        status_code=404
    )

# ── SERVER LAUNCHER ─────────────────────────────────────────────────────────

def run_server():
    is_prod = os.environ.get('NODE_ENV') == 'production'

    if not is_prod:
        # In development: Start FastAPI backend on port 5000 in background thread,
        # and start Vite dev server on port 3000 (which proxies /api to FastAPI 5000)
        print("Launching FastAPI Python backend on http://0.0.0.0:5000 ...")

        def start_uvicorn():
            while True:
                try:
                    uvicorn.run(app, host='0.0.0.0', port=5000, log_level='warning')
                except Exception as ex:
                    print("Uvicorn background server error, restarting:", ex)
                    time.sleep(1)

        import threading
        uvicorn_thread = threading.Thread(target=start_uvicorn)
        uvicorn_thread.daemon = True
        uvicorn_thread.start()

        # Start Vite on port 3000
        print("Launching Vite dev server on http://0.0.0.0:3000 ...")
        vite_cmd = [
            "cmd.exe",
            "/c",
            ".\\node_modules\\.bin\\vite.cmd",
            "--host",
            "0.0.0.0",
            "--port",
            "3000",
        ]

        subprocess.run(vite_cmd, check=True)
    else:
        port = int(os.environ.get("PORT", 3000))

        print(f"Launching FastAPI Python production server on http://0.0.0.0:{port} ...")

        uvicorn.run(
            app,
            host="0.0.0.0",
            port=port
        )

if __name__ == '__main__':
    run_server()
