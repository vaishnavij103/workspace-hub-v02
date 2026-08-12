import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const upload = multer({ storage: multer.memoryStorage() });

// ── GEMINI AI CLIENT ─────────────────────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// ── DATA MODELS ─────────────────────────────────────────────────────────────

interface Room {
  room_id: string;
  name: string;
  location: string;
  building?: string;
  floor: number;
  capacity: number;
  amenities: string[];
  status: string; // 'active' | 'inactive'
  room_type?: string;
  cabin_type?: string;
  vc_enabled: boolean;
  power_points: boolean;
  created_at: string;
  updated_at: string;
}

interface Workstation {
  workstation_id: string;
  label: string; // e.g. "IT07 WS 74"
  location: string;
  building?: string;
  floor: number;
  bay?: string; // e.g. "IT07"
  type: 'Hot Desk' | 'Dedicated Desk' | 'Executive Desk' | 'Standing Desk';
  amenities: string[]; // e.g. ['Dual Monitors', 'Ergonomic Chair', 'Power Outlet', 'Standing Desk', 'LAN Port']
  status: 'active' | 'maintenance' | 'inactive';
  created_at: string;
  updated_at: string;
}

interface User {
  user_id: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'admin_location' | 'super_admin';
  password_hash: string;
  created_at: string;
}

interface AdminContact {
  admin_id: string;
  location: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Booking {
  booking_id: string;
  room_id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string; // 'confirmed' | 'cancelled'
  attendees: string[];
  notes: string;
  created_at: string;
  updated_at: string;
  cost_centre?: string;
  meeting_type?: string;
  meeting_description?: string;
  send_qr?: boolean;
  actual_check_in?: string | null;
  actual_check_out?: string | null;
}

interface WorkstationBooking {
  booking_id: string;
  workstation_id: string;
  label: string;
  user_id: string;
  user_name: string;
  user_email: string;
  location: string;
  date: string; // YYYY-MM-DD
  slot_type: 'Full Day' | 'Morning Slot (9 AM - 1 PM)' | 'Afternoon Slot (2 PM - 6 PM)' | 'Custom';
  start_time: string; // "09:00"
  end_time: string;   // "18:00"
  status: 'confirmed' | 'checked_in' | 'cancelled' | 'completed';
  actual_check_in?: string | null;
  actual_check_out?: string | null;
  created_at: string;
}

interface Notification {
  notification_id: string;
  recipient_id: string;
  sender_id?: string | null;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  related_booking_id?: string | null;
  created_at: string;
  read_at?: string | null;
}

// VisiFlow Visitor Management
interface Visitor {
  visitor_id: string;
  visitor_name: string;
  company: string;
  email: string;
  phone: string;
  host_id: string;
  host_name: string;
  location: string;
  purpose: string;
  visit_date: string;
  expected_time: string;
  status: 'expected' | 'checked_in' | 'checked_out' | 'cancelled';
  badge_code: string;
  nda_signed: boolean;
  check_in_time?: string | null;
  check_out_time?: string | null;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ParkSwift Parking Management
interface ParkingSlot {
  slot_id: string;
  slot_number: string;
  location: string;
  zone: string;
  type: 'EV' | 'Compact' | 'Executive' | 'Handicapped' | 'Standard';
  status: 'available' | 'reserved' | 'occupied' | 'maintenance';
}

interface ParkingReservation {
  reservation_id: string;
  slot_id: string;
  slot_number: string;
  user_id: string;
  user_name: string;
  vehicle_number: string;
  vehicle_type: 'Car' | 'Bike' | 'EV Car' | 'EV Bike';
  location: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
  pass_code: string;
  check_in_time?: string | null;
  check_out_time?: string | null;
  created_at: string;
}

// Invoice & Expense Tracking Model
interface InvoiceLineItem {
  description: string;
  type_of_service: string;
  start_date: string;
  end_date: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface Invoice {
  invoice_id: string;
  document_type: string;
  vendor_name: string;
  vendor_address: string;
  invoice_number: string;
  invoice_date: string;
  items: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total_amount: number;
  currency: string;
  location: string;
  status: 'processed' | 'pending_approval' | 'paid' | 'rejected';
  file_name?: string;
  uploaded_by?: string;
  created_at: string;
  notes?: string;
}

// Helpdesk Ticket Model
interface TicketComment {
  comment_id: string;
  author_id: string;
  author_name: string;
  author_role: string;
  text: string;
  created_at: string;
}

interface Ticket {
  ticket_id: string;
  ticket_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  category: 'Facilities & Maintenance' | 'IT Support & Equipment' | 'Room Booking Issue' | 'Workstation Issue' | 'Parking & Access' | 'General Enquiry';
  subject: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assigned_to: string;
  comments: TicketComment[];
  created_at: string;
  updated_at: string;
}

// ── IN-MEMORY DATA STORES (INITIALLY EMPTY AS REQUESTED) ──────────────────────

let rooms: Room[] = [];
let workstations: Workstation[] = [];
let users: User[] = [];
let adminContacts: AdminContact[] = [];
let bookings: Booking[] = [];
let workstationBookings: WorkstationBooking[] = [];
let notifications: Notification[] = [];
let visitors: Visitor[] = [];
let parkingSlots: ParkingSlot[] = [];
let parkingReservations: ParkingReservation[] = [];
let invoices: Invoice[] = [];
let tickets: Ticket[] = [];

// Helper: Remove password_hash
const userSafe = (user: User) => {
  const { password_hash, ...safe } = user;
  return safe;
};

// CSV Parser Helper
function parseCSV(csvText: string): string[][] {
  const lines: string[][] = [];
  const rawLines = csvText.split(/\r?\n/);
  for (const rawLine of rawLines) {
    if (!rawLine.trim()) continue;
    const row: string[] = [];
    let insideQuote = false;
    let entry = '';
    for (let i = 0; i < rawLine.length; i++) {
      const char = rawLine[i];
      if (char === '"') {
        if (insideQuote && rawLine[i + 1] === '"') {
          entry += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if ((char === ',' || char === ';') && !insideQuote) {
        row.push(entry.trim());
        entry = '';
      } else {
        entry += char;
      }
    }
    row.push(entry.trim());
    lines.push(row);
  }
  return lines;
}

// Function to parse location_wise_rooms_cleaned.csv and seed initial rooms
function loadSeedRoomsFromCSV(): Room[] {
  const csvPath = path.join(process.cwd(), 'location_wise_rooms_cleaned.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('Seed CSV location_wise_rooms_cleaned.csv not found.');
    return [];
  }

  try {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(content);
    if (rows.length <= 1) return [];

    const now = new Date().toISOString();
    const seededRooms: Room[] = [];

    // Header row is index 0: S.NO.,Room Name,Location / Building,Floor,Room Type,Cabin Type,Seating Capacity,Amenities Available,VC Enabled,Power Points
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const sNo = row[0]?.trim();
      const roomName = row[1]?.trim();
      if (!roomName) continue;

      const location = row[2]?.trim() || 'Pune';
      const building = location;
      const floor = parseInt(row[3]?.trim() || '1', 10) || 1;
      const roomType = row[4]?.trim() || (row[5]?.trim() ? 'Cabin' : 'Meeting Room');
      const cabinType = row[5]?.trim() || undefined;

      // Extract capacity numeric value
      const capRaw = row[6]?.trim() || '';
      let capacity = 4;
      const parsedCap = parseInt(capRaw.replace(/\D/g, ''), 10);
      if (!isNaN(parsedCap) && parsedCap > 0) {
        capacity = parsedCap;
      }

      // Amenities
      const amenRaw = row[7]?.trim() || '';
      let amenities: string[] = [];
      if (amenRaw && !['no', 'nil', 'none', '-'].includes(amenRaw.toLowerCase())) {
        amenities = amenRaw.split(/[,;|]/).map(a => a.trim()).filter(a => a && !['no', 'nil'].includes(a.toLowerCase()));
      }

      // VC Enabled
      const vcRaw = (row[8] || '').toLowerCase().trim();
      const vc_enabled = ['yes', 'true', '1', 'vc enabled', 'enabled', 'yealink'].some(k => vcRaw.includes(k)) && !vcRaw.includes('not enabled');

      // Power Points
      const powerRaw = (row[9] || '').toLowerCase().trim();
      const power_points = ['yes', 'true', '1', 'enabled', 'power'].some(k => powerRaw.includes(k)) || !['no', 'nil', 'false'].includes(powerRaw);

      seededRooms.push({
        room_id: `room_seed_${sNo || i}`,
        name: roomName,
        location,
        building,
        floor,
        capacity,
        amenities,
        status: 'active',
        room_type: roomType,
        cabin_type: cabinType,
        vc_enabled,
        power_points,
        created_at: now,
        updated_at: now
      });
    }

    console.log(`Successfully seeded ${seededRooms.length} rooms from location_wise_rooms_cleaned.csv`);
    return seededRooms;
  } catch (err) {
    console.error('Error seeding rooms from CSV:', err);
    return [];
  }
}

// Seed Initialization - Default user roles, admin contacts, & initial rooms from location_wise_rooms_cleaned.csv
function initSeedData() {
  const now = new Date().toISOString();

  // Load initial rooms from location_wise_rooms_cleaned.csv
  rooms = loadSeedRoomsFromCSV();

  // Users (Strictly 3 roles: employee, admin_location, super_admin)
  users = [
    {
      user_id: 'usr_superadmin',
      name: 'Super Admin',
      email: 'superadmin@apexon.com',
      department: 'Global Operations',
      role: 'super_admin',
      password_hash: 'admin123',
      created_at: now
    },
    {
      user_id: 'usr_puneadmin',
      name: 'Pune Location Admin',
      email: 'pune.admin@apexon.com',
      department: 'Facility Mgmt',
      role: 'admin_location',
      password_hash: 'admin123',
      created_at: now
    },
    {
      user_id: 'usr_employee',
      name: 'Rahul Sharma',
      email: 'employee@apexon.com',
      department: 'Engineering',
      role: 'employee',
      password_hash: 'user123',
      created_at: now
    }
  ];

  // Admin Contacts
  const defaultAdminContacts = [
    { location: 'Ahmedabad', name: 'Kalpana Parmar', email: 'kalpana.parmar@apexon.com', phone: '7698004492', role: 'Admin Team' },
    { location: 'Chennai', name: 'Yuvaraj S', email: 'yuvaraj.s@apexon.com', phone: '9884000341', role: 'Admin Team' },
    { location: 'Hyderabad', name: 'Yuvaraj S', email: 'yuvaraj.s@apexon.com', phone: '9884000341', role: 'Admin Team' },
    { location: 'Coimbatore', name: 'Manoharan M', email: 'manoharan.m@apexon.com', phone: '9626873215', role: 'Admin Team' },
    { location: 'Bangalore', name: 'Manjula Munikeshava', email: 'manjula.munikeshava@apexon.com', phone: '6361476691', role: 'Admin Team' },
    { location: 'Pune', name: 'Nitin Nikumbh', email: 'nitin.nikumbh@apexon.com', phone: '7720008395', role: 'Admin Team' },
    { location: 'Mumbai', name: 'Nitin Nikumbh', email: 'nitin.nikumbh@apexon.com', phone: '7720008395', role: 'Admin Team' }
  ];

  adminContacts = defaultAdminContacts.map((c, i) => ({
    admin_id: `adm_${i + 1}`,
    ...c,
    active: true,
    created_at: now,
    updated_at: now
  }));

  // Note: Collections (rooms, workstations, bookings, visitors, invoices, parking) start 100% EMPTY as requested!
}

initSeedData();

// ── SERVER CREATION ──────────────────────────────────────────────────────────

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  // Middleware: Request User Context
  app.use((req: Request, _res: Response, next) => {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'] as string;

    if (userIdHeader) {
      const found = users.find(u => u.user_id === userIdHeader);
      if (found) (req as any).user = found;
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      const found = users.find(u => u.user_id === token || u.email === token);
      if (found) (req as any).user = found;
    }

    if (!(req as any).user) {
      (req as any).user = users[0]; // fallback
    }
    next();
  });

  // ── HEALTH & STATS ─────────────────────────────────────────────────────────

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      counts: {
        rooms: rooms.length,
        workstations: workstations.length,
        bookings: bookings.length,
        workstation_bookings: workstationBookings.length,
        visitors: visitors.length,
        invoices: invoices.length,
        tickets: tickets.length
      }
    });
  });

  app.get('/api/stats', (req: Request, res: Response) => {
    const location = req.query.location as string;

    const filterLoc = (items: any[]) =>
      location ? items.filter(i => i.location === location || i.building === location) : items;

    const locRooms = filterLoc(rooms);
    const locWorkstations = filterLoc(workstations);
    const locBookings = filterLoc(bookings);
    const locWsBookings = filterLoc(workstationBookings);
    const locVisitors = filterLoc(visitors);
    const locInvoices = filterLoc(invoices);
    const locTickets = filterLoc(tickets);

    res.json({
      rooms_count: locRooms.length,
      active_rooms: locRooms.filter(r => r.status === 'active').length,
      workstations_count: locWorkstations.length,
      active_workstations: locWorkstations.filter(w => w.status === 'active').length,
      total_room_bookings: locBookings.length,
      confirmed_room_bookings: locBookings.filter(b => b.status === 'confirmed').length,
      total_workstation_bookings: locWsBookings.length,
      confirmed_workstation_bookings: locWsBookings.filter(b => b.status === 'confirmed' || b.status === 'checked_in').length,
      total_visitors: locVisitors.length,
      checked_in_visitors: locVisitors.filter(v => v.status === 'checked_in').length,
      total_invoices: locInvoices.length,
      total_expenses_amount: locInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0),
      open_tickets: locTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
    });
  });

  // ── AUTH & USER ROUTES ─────────────────────────────────────────────────────

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, role } = req.body;
    let found = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!found) {
      found = {
        user_id: `usr_${Date.now()}`,
        name: email ? email.split('@')[0] : 'User',
        email: email || 'user@apexon.com',
        department: 'Operations',
        role: role || (email?.includes('superadmin') ? 'super_admin' : email?.includes('admin') ? 'admin_location' : 'employee'),
        password_hash: 'pass123',
        created_at: new Date().toISOString()
      };
      users.push(found);
    }
    res.json({ user: userSafe(found), token: found.user_id });
  });

  app.get('/api/users', (_req: Request, res: Response) => {
    res.json(users.map(userSafe));
  });

  app.post('/api/users', (req: Request, res: Response) => {
    const data = req.body;
    const newUser: User = {
      user_id: `usr_${Date.now()}`,
      name: data.name || 'New User',
      email: data.email || 'user@apexon.com',
      department: data.department || 'Engineering',
      role: data.role || 'employee',
      password_hash: 'pass123',
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    res.status(201).json(userSafe(newUser));
  });

  app.get('/api/admin-contacts', (req: Request, res: Response) => {
    const location = req.query.location as string;
    const filtered = location ? adminContacts.filter(c => c.location === location) : adminContacts;
    res.json(filtered);
  });

  // ── ROOMS & ROOM BOOKINGS ──────────────────────────────────────────────────

  app.get('/api/rooms', (req: Request, res: Response) => {
    const { location, capacity, status } = req.query;
    let result = [...rooms];
    if (location) result = result.filter(r => r.location === location);
    if (capacity) result = result.filter(r => r.capacity >= parseInt(capacity as string, 10));
    if (status) result = result.filter(r => r.status === status);
    res.json(result);
  });

  app.post('/api/rooms', (req: Request, res: Response) => {
    const data = req.body;
    const now = new Date().toISOString();
    const newRoom: Room = {
      room_id: `room_${Date.now()}`,
      name: data.name || 'New Room',
      location: data.location || 'Pune',
      building: data.building || data.location || 'Tower A',
      floor: Number(data.floor) || 1,
      capacity: Number(data.capacity) || 6,
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      status: data.status || 'active',
      room_type: data.room_type || 'Meeting Room',
      vc_enabled: Boolean(data.vc_enabled),
      power_points: Boolean(data.power_points),
      created_at: now,
      updated_at: now
    };
    rooms.unshift(newRoom);
    res.status(201).json(newRoom);
  });

  app.put('/api/rooms/:id', (req: Request, res: Response) => {
    const room = rooms.find(r => r.room_id === req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    Object.assign(room, req.body, { updated_at: new Date().toISOString() });
    res.json(room);
  });

  app.delete('/api/rooms/:id', (req: Request, res: Response) => {
    rooms = rooms.filter(r => r.room_id !== req.params.id);
    res.status(204).send();
  });

  // ── ROOM IMPORT FROM CSV ───────────────────────────────────────────────────

  app.post('/api/rooms/import', upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file || !req.file.buffer) {
        res.status(400).json({ detail: 'No CSV file provided' });
        return;
      }

      const content = req.file.buffer.toString('utf-8');
      const rows = parseCSV(content);

      if (rows.length === 0) {
        res.status(400).json({ detail: 'CSV file is empty' });
        return;
      }

      const firstRow = rows[0].map(c => c.toLowerCase().trim());
      const hasHeader = firstRow.some(c =>
        c.includes('room') || c.includes('location') || c.includes('floor') || c.includes('capacity') || c.includes('type')
      );

      let startIndex = 0;
      let nameIdx = 0, locIdx = 1, floorIdx = 2, typeIdx = 3, cabinIdx = 4, capIdx = 5, amenIdx = 6, vcIdx = 7, powerIdx = 8;

      if (hasHeader) {
        startIndex = 1;
        firstRow.forEach((col, idx) => {
          if (col.includes('room name') || col === 'name' || col.includes('room')) nameIdx = idx;
          else if (col.includes('location') || col.includes('building') || col.includes('city')) locIdx = idx;
          else if (col.includes('floor')) floorIdx = idx;
          else if (col.includes('room type') || (col.includes('type') && !col.includes('cabin'))) typeIdx = idx;
          else if (col.includes('cabin')) cabinIdx = idx;
          else if (col.includes('capacity') || col.includes('seating') || col.includes('seats')) capIdx = idx;
          else if (col.includes('amenities') || col.includes('feature')) amenIdx = idx;
          else if (col.includes('vc') || col.includes('video') || col.includes('conferencing')) vcIdx = idx;
          else if (col.includes('power') || col.includes('plug') || col.includes('outlet')) powerIdx = idx;
        });
      }

      let created = 0;
      let skipped = 0;
      let failed = 0;
      const created_rooms: Room[] = [];
      const failed_rooms: { name: string; reason: string }[] = [];

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0 || row.every(cell => !cell.trim())) continue;

        const roomName = row[nameIdx]?.trim();
        if (!roomName) {
          failed++;
          failed_rooms.push({ name: `Row ${i + 1}`, reason: 'Room name is required' });
          continue;
        }

        const location = row[locIdx]?.trim() || 'Pune';
        const building = row[locIdx]?.trim() || location;
        const floorNum = parseInt(row[floorIdx] || '1', 10) || 1;
        const roomType = row[typeIdx]?.trim() || 'Meeting Room';
        const cabinType = row[cabinIdx]?.trim() || undefined;
        const capacityNum = parseInt(row[capIdx] || '6', 10) || 6;

        const amenRaw = row[amenIdx]?.trim() || '';
        const amenities = amenRaw
          ? amenRaw.split(/[,;|]/).map(a => a.trim()).filter(Boolean)
          : [];

        const vcVal = (row[vcIdx] || '').toLowerCase().trim();
        const vc_enabled = ['true', 'yes', '1', 'y', 'vc', 'enabled'].includes(vcVal);

        const powerVal = (row[powerIdx] || '').toLowerCase().trim();
        const power_points = ['true', 'yes', '1', 'y', 'enabled'].includes(powerVal);

        // Check duplicate by name and location
        const existing = rooms.find(
          r => r.name.toLowerCase() === roomName.toLowerCase() && r.location.toLowerCase() === location.toLowerCase()
        );

        if (existing) {
          skipped++;
          continue;
        }

        const now = new Date().toISOString();
        const newRoom: Room = {
          room_id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: roomName,
          location,
          building,
          floor: floorNum,
          capacity: capacityNum,
          amenities,
          status: 'active',
          room_type: roomType,
          cabin_type: cabinType,
          vc_enabled,
          power_points,
          created_at: now,
          updated_at: now
        };

        rooms.unshift(newRoom);
        created++;
        created_rooms.push(newRoom);
      }

      res.json({
        created,
        skipped,
        failed,
        created_rooms,
        failed_rooms
      });
    } catch (err: any) {
      console.error('Error importing rooms:', err);
      res.status(500).json({ detail: err?.message || 'Failed to parse and import CSV' });
    }
  });

  app.get('/api/bookings', (req: Request, res: Response) => {
    const { room_id, user_id, location, date } = req.query;
    let result = [...bookings];
    if (room_id) result = result.filter(b => b.room_id === room_id);
    if (user_id) result = result.filter(b => b.user_id === user_id);
    if (location) {
      const roomIds = rooms.filter(r => r.location === location).map(r => r.room_id);
      result = result.filter(b => roomIds.includes(b.room_id));
    }
    if (date) result = result.filter(b => b.start_time.startsWith(date as string));
    res.json(result);
  });

  app.post('/api/bookings', (req: Request, res: Response) => {
    const data = req.body;
    const user = (req as any).user;
    const now = new Date().toISOString();

    const newBooking: Booking = {
      booking_id: `bkg_${Date.now()}`,
      room_id: data.room_id,
      user_id: user.user_id,
      title: data.title || 'Meeting',
      start_time: data.start_time,
      end_time: data.end_time,
      status: 'confirmed',
      attendees: Array.isArray(data.attendees) ? data.attendees : [user.email],
      notes: data.notes || '',
      created_at: now,
      updated_at: now,
      meeting_type: data.meeting_type || 'Internal',
      meeting_description: data.meeting_description || ''
    };

    bookings.unshift(newBooking);
    res.status(201).json(newBooking);
  });

  app.delete('/api/bookings/:id', (req: Request, res: Response) => {
    const booking = bookings.find(b => b.booking_id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    booking.status = 'cancelled';
    booking.updated_at = new Date().toISOString();
    res.json(booking);
  });

  // ── WORKSTATIONS & WORKSTATION BOOKINGS ───────────────────────────────────

  app.get('/api/workstations', (req: Request, res: Response) => {
    const { location, floor, type, status, date } = req.query;
    let result = [...workstations];
    if (location) result = result.filter(w => w.location === location);
    if (floor) result = result.filter(w => w.floor === Number(floor));
    if (type) result = result.filter(w => w.type === type);
    if (status) result = result.filter(w => w.status === status);

    // Attach active booking status for a given date if requested
    if (date) {
      const bookedWsIds = workstationBookings
        .filter(b => b.date === date && (b.status === 'confirmed' || b.status === 'checked_in'))
        .map(b => b.workstation_id);

      result = result.map(w => ({
        ...w,
        is_booked: bookedWsIds.includes(w.workstation_id)
      }));
    }

    res.json(result);
  });

  app.post('/api/workstations', (req: Request, res: Response) => {
    const data = req.body;
    const now = new Date().toISOString();

    const newWs: Workstation = {
      workstation_id: `ws_${Date.now()}`,
      label: data.label || `WS-${Math.floor(100 + Math.random() * 900)}`,
      location: data.location || 'Pune',
      building: data.building || data.location || 'Tower A',
      floor: Number(data.floor) || 1,
      bay: data.bay || 'General',
      type: data.type || 'Hot Desk',
      amenities: Array.isArray(data.amenities) ? data.amenities : ['Power Outlet', 'Dual Monitors'],
      status: data.status || 'active',
      created_at: now,
      updated_at: now
    };

    workstations.unshift(newWs);
    res.status(201).json(newWs);
  });

  app.put('/api/workstations/:id', (req: Request, res: Response) => {
    const ws = workstations.find(w => w.workstation_id === req.params.id);
    if (!ws) return res.status(404).json({ error: 'Workstation not found' });
    Object.assign(ws, req.body, { updated_at: new Date().toISOString() });
    res.json(ws);
  });

  app.delete('/api/workstations/:id', (req: Request, res: Response) => {
    workstations = workstations.filter(w => w.workstation_id !== req.params.id);
    res.status(204).send();
  });

  app.get('/api/workstation-bookings', (req: Request, res: Response) => {
    const { user_id, location, date } = req.query;
    let result = [...workstationBookings];
    if (user_id) result = result.filter(b => b.user_id === user_id);
    if (location) result = result.filter(b => b.location === location);
    if (date) result = result.filter(b => b.date === date);
    res.json(result);
  });

  app.post('/api/workstation-bookings', (req: Request, res: Response) => {
    const data = req.body;
    const user = (req as any).user;
    const now = new Date().toISOString();

    const ws = workstations.find(w => w.workstation_id === data.workstation_id);
    const label = ws ? ws.label : (data.label || 'Workstation');
    const location = ws ? ws.location : (data.location || 'Pune');

    // Check if workstation is already booked on this date
    const existing = workstationBookings.find(
      b => b.workstation_id === data.workstation_id && b.date === data.date && (b.status === 'confirmed' || b.status === 'checked_in')
    );
    if (existing) {
      return res.status(400).json({ error: `Workstation ${label} is already booked on ${data.date}.` });
    }

    const newBooking: WorkstationBooking = {
      booking_id: `wsbkg_${Date.now()}`,
      workstation_id: data.workstation_id,
      label,
      user_id: user.user_id,
      user_name: user.name,
      user_email: user.email,
      location,
      date: data.date || new Date().toISOString().slice(0, 10),
      slot_type: data.slot_type || 'Full Day',
      start_time: data.start_time || '09:00',
      end_time: data.end_time || '18:00',
      status: 'confirmed',
      created_at: now
    };

    workstationBookings.unshift(newBooking);

    // Notify user
    notifications.push({
      notification_id: `notif_${Date.now()}`,
      recipient_id: user.user_id,
      sender_id: 'system',
      type: 'workstation_booked',
      title: 'Workstation Confirmed',
      message: `Your booking for workstation ${label} on ${newBooking.date} is confirmed.`,
      metadata: { booking_id: newBooking.booking_id },
      created_at: now,
      read_at: null
    });

    res.status(201).json(newBooking);
  });

  app.put('/api/workstation-bookings/:id/cancel', (req: Request, res: Response) => {
    const b = workstationBookings.find(b => b.booking_id === req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    b.status = 'cancelled';
    res.json(b);
  });

  app.put('/api/workstation-bookings/:id/checkin', (req: Request, res: Response) => {
    const b = workstationBookings.find(b => b.booking_id === req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    b.status = 'checked_in';
    b.actual_check_in = new Date().toISOString();
    res.json(b);
  });

  app.put('/api/workstation-bookings/:id/checkout', (req: Request, res: Response) => {
    const b = workstationBookings.find(b => b.booking_id === req.params.id);
    if (!b) return res.status(404).json({ error: 'Booking not found' });
    b.status = 'completed';
    b.actual_check_out = new Date().toISOString();
    res.json(b);
  });

  // ── INVOICES & OCR PROCESSING ─────────────────────────────────────────────

  app.get('/api/invoices', (req: Request, res: Response) => {
    const { location, status } = req.query;
    let result = [...invoices];
    if (location) result = result.filter(i => i.location === location);
    if (status) result = result.filter(i => i.status === status);
    res.json(result);
  });

  // Multimodal Document OCR Extraction Endpoint using Gemini AI


  app.post('/api/invoices', (req: Request, res: Response) => {
    const data = req.body;
    const user = (req as any).user;
    const now = new Date().toISOString();

    const newInvoice: Invoice = {
      invoice_id: `inv_${Date.now()}`,
      document_type: data.document_type || 'Invoice',
      vendor_name: data.vendor_name || 'Vendor',
      vendor_address: data.vendor_address || '',
      invoice_number: data.invoice_number || `INV-${Date.now().toString().slice(-6)}`,
      invoice_date: data.invoice_date || now.slice(0, 10),
      items: Array.isArray(data.items) ? data.items : [],
      subtotal: Number(data.subtotal) || 0,
      tax: Number(data.tax) || 0,
      total_amount: Number(data.total_amount) || 0,
      currency: data.currency || 'USD',
      location: data.location || 'Pune',
      status: data.status || 'processed',
      file_name: data.file_name || 'document.png',
      uploaded_by: user.name || 'Admin',
      created_at: now,
      notes: data.notes || ''
    };

    invoices.unshift(newInvoice);
    res.status(201).json(newInvoice);
  });

  app.delete('/api/invoices/:id', (req: Request, res: Response) => {
    invoices = invoices.filter(i => i.invoice_id !== req.params.id);
    res.status(204).send();
  });

  // ── VISIFLOW VISITORS ──────────────────────────────────────────────────────

  app.get('/api/visitors', (req: Request, res: Response) => {
    const { location, status } = req.query;
    let result = [...visitors];
    if (location) result = result.filter(v => v.location === location);
    if (status) result = result.filter(v => v.status === status);
    res.json(result);
  });

  app.post('/api/visitors', (req: Request, res: Response) => {
    const data = req.body;
    const now = new Date().toISOString();

    const newVisitor: Visitor = {
      visitor_id: `vis_${Date.now()}`,
      visitor_name: data.visitor_name,
      company: data.company || 'External Guest',
      email: data.email || 'guest@example.com',
      phone: data.phone || '',
      host_id: data.host_id || 'usr_superadmin',
      host_name: data.host_name || 'Host Admin',
      location: data.location || 'Pune',
      purpose: data.purpose || 'Business Meeting',
      visit_date: data.visit_date || now.slice(0, 10),
      expected_time: data.expected_time || '10:00',
      status: 'expected',
      badge_code: `VIS-${Math.floor(1000 + Math.random() * 9000)}`,
      nda_signed: Boolean(data.nda_signed),
      created_at: now,
      updated_at: now
    };

    visitors.unshift(newVisitor);
    res.status(201).json(newVisitor);
  });

  app.post('/api/visitors/:id/checkin', (req: Request, res: Response) => {
    const v = visitors.find(v => v.visitor_id === req.params.id);
    if (!v) return res.status(404).json({ error: 'Visitor not found' });
    v.status = 'checked_in';
    v.check_in_time = new Date().toISOString();
    v.updated_at = new Date().toISOString();
    res.json(v);
  });

  app.post('/api/visitors/:id/checkout', (req: Request, res: Response) => {
    const v = visitors.find(v => v.visitor_id === req.params.id);
    if (!v) return res.status(404).json({ error: 'Visitor not found' });
    v.status = 'checked_out';
    v.check_out_time = new Date().toISOString();
    v.updated_at = new Date().toISOString();
    res.json(v);
  });

  app.delete('/api/visitors/:id', (req: Request, res: Response) => {
    visitors = visitors.filter(v => v.visitor_id !== req.params.id);
    res.status(204).send();
  });

  // ── PARKSWIFT PARKING ──────────────────────────────────────────────────────

  app.get('/api/parking/slots', (req: Request, res: Response) => {
    const { location } = req.query;
    let result = [...parkingSlots];
    if (location) result = result.filter(s => s.location === location);
    res.json(result);
  });

  app.post('/api/parking/slots', (req: Request, res: Response) => {
    const data = req.body;
    const newSlot: ParkingSlot = {
      slot_id: `ps_${Date.now()}`,
      slot_number: data.slot_number || `P-${parkingSlots.length + 1}`,
      location: data.location || 'Pune',
      zone: data.zone || 'Ground Floor',
      type: data.type || 'Standard',
      status: 'available'
    };
    parkingSlots.unshift(newSlot);
    res.status(201).json(newSlot);
  });

  app.get('/api/parking/reservations', (req: Request, res: Response) => {
    const { user_id, location } = req.query;
    let result = [...parkingReservations];
    if (user_id) result = result.filter(r => r.user_id === user_id);
    if (location) result = result.filter(r => r.location === location);
    res.json(result);
  });

  app.post('/api/parking/reservations', (req: Request, res: Response) => {
    const data = req.body;
    const user = (req as any).user;
    const now = new Date().toISOString();

    const newRes: ParkingReservation = {
      reservation_id: `pkres_${Date.now()}`,
      slot_id: data.slot_id || 'ps_1',
      slot_number: data.slot_number || 'P-01',
      user_id: user.user_id,
      user_name: user.name,
      vehicle_number: data.vehicle_number || 'MH-12-AB-1234',
      vehicle_type: data.vehicle_type || 'Car',
      location: data.location || 'Pune',
      date: data.date || now.slice(0, 10),
      start_time: data.start_time || '09:00',
      end_time: data.end_time || '18:00',
      status: 'confirmed',
      pass_code: `PARK-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: now
    };

    parkingReservations.unshift(newRes);
    res.status(201).json(newRes);
  });

  // ── HELPDESK TICKETS ───────────────────────────────────────────────────────

  app.get('/api/tickets', (req: Request, res: Response) => {
    const { user_id, location, status } = req.query;
    let result = [...tickets];
    if (user_id) result = result.filter(t => t.user_id === user_id);
    if (location) result = result.filter(t => t.location === location);
    if (status) result = result.filter(t => t.status === status);
    res.json(result);
  });

  app.post('/api/tickets', (req: Request, res: Response) => {
    const data = req.body;
    const user = (req as any).user;
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      ticket_id: `tkt_${Date.now()}`,
      ticket_number: `HD-${Math.floor(1000 + Math.random() * 9000)}`,
      user_id: user.user_id,
      user_name: user.name,
      user_email: user.email,
      category: data.category || 'Facilities & Maintenance',
      subject: data.subject || 'Support Ticket Request',
      description: data.description || '',
      location: data.location || 'Pune',
      priority: data.priority || 'medium',
      status: 'open',
      assigned_to: 'Unassigned',
      comments: [],
      created_at: now,
      updated_at: now
    };

    tickets.unshift(newTicket);
    res.status(201).json(newTicket);
  });

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────

  app.get('/api/notifications', (req: Request, res: Response) => {
    const { user_id } = req.query;
    let result = [...notifications];
    if (user_id) result = result.filter(n => n.recipient_id === user_id);
    res.json(result);
  });

  app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
    const n = notifications.find(notif => notif.notification_id === req.params.id);
    if (n) n.read_at = new Date().toISOString();
    res.json(n || {});
  });

  // ── AI CHATBOT ROUTE ───────────────────────────────────────────────────────

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const { message, history } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message text is required' });
        return;
      }

      const SYSTEM_PROMPT = `
You are the Apexon AI Workspace Assistant, an intelligent virtual concierge for the Apexon Workplace Operations Hub.
You assist employees and workplace administrators with answering questions, guiding them through application features, and providing information about workplace operations across Apexon locations (Pune, Coimbatore, Bangalore - Domlur, Chennai, Hyderabad, Mumbai, Ahmedabad, Bangalore - Signet).

Here is detailed information about the functionalities available in the Apexon Workplace Hub:

1. Apexon RoomBook (Meeting Space Management):
   - Navigate via "RoomBook" (/bookings).
   - Reserve meeting rooms, video-conferencing rooms, and executive cabins.
   - Filter spaces by location, floor level, seating capacity, VC equipment, and power outlets.
   - Features: Calendar slot selection, cost center allocation, meeting type selection, automated QR code generation for entry, and 1-click Outlook (.ics) calendar sync.
   - Check-in / Check-out capability to mark meeting room occupancy.

2. Workstation Desk Booking:
   - Navigate via "Workstations" (/workstations).
   - Reserve hot desks, dedicated desks, executive bays, and standing desks (e.g. "IT07 WS 74").
   - Filter by floor, bay code, and workstation amenities (Dual Monitors, Ergonomic Chair, Power Outlet, LAN Port).
   - Interactive visual floor map showing real-time desk availability status (Available vs. Booked).

3. ParkSwift (Smart Parking & EV Charging):
   - Navigate via "ParkSwift" (/parking).
   - Book parking spaces for Cars, Two-Wheelers, and EV Charging Bays across locations.
   - Generates digital parking passes with barrier QR codes for automated gate scanning.
   - Real-time slot availability map and status tracking.

4. VisiFlow Access (Visitor Management):
   - Navigate via "VisiFlow Access" (/visitors - Admin only).
   - Pre-register guests and visitors, issue digital visitor passes with QR codes.
   - Host notifications, instant guest check-in/check-out, and digital NDA compliance logging.

5. Invoice & Expense Management (Multimodal OCR Document Processing):
   - Navigate via "Invoice & Expenses" (/invoices - Admin only).
   - Upload vendor invoices in PNG, JPG, or PDF formats.
   - Uses AI Multimodal OCR to automatically extract document type, vendor name, invoice number, invoice date, currency, vendor address, line items (description, type of service, service dates, quantity, unit price, amount), subtotal, tax, and total.
   - Interactive review & edit table for extracted items before saving to the repository.
   - Spend analytics and location-wise expense distribution charts.

6. Helpdesk & Facility Support:
   - Navigate via "Helpdesk & Support" (/helpdesk).
   - Submit facility support tickets across categories: Facilities & Maintenance, IT & Hardware, Parking, Security, Catering.
   - Set priority levels (Low, Medium, High, Urgent), track ticket status (open, in_progress, resolved), and comment on tickets.

7. VoucherLogix (Corporate Cafeteria Vouchers):
   - Access corporate meal credits and cafeteria refreshment vouchers with QR code redemption.

8. Space Admin & Directory:
   - Manage office locations, add/edit rooms and workstations, update facilities admin contact hotlines, manage user roles (Employee, Location Admin, Super Admin).

Instructions for your responses:
- Keep your tone friendly, professional, concise, and helpful.
- Format responses clearly using markdown bolding, bullet points, and short paragraphs.
- Provide step-by-step guidance when explaining how to perform actions in the app.
- When relevant, mention the exact tab or page route (e.g. "Go to RoomBook at /bookings" or "Check ParkSwift at /parking").
`;

      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history)) {
        history.forEach((h: { sender: string; text: string }) => {
          if (h.text && typeof h.text === 'string') {
            contents.push({
              role: h.sender === 'user' ? 'user' : 'model',
              parts: [{ text: h.text }]
            });
          }
        });
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "I'm here to help with any questions about Apexon Workplace Operations Hub.";
      res.json({ reply: replyText });
    } catch (err: any) {
      console.error('Chat error:', err);
      // Fallback answer if API key error or network error
      res.json({
        reply: "I'm here to assist you with Apexon Workplace Operations! You can use RoomBook (/bookings) for meeting spaces, Workstations (/workstations) for desk booking, ParkSwift (/parking) for parking slots, and Helpdesk (/helpdesk) for support tickets."
      });
    }
  });

  // ── VITE / STATIC SERVING ──────────────────────────────────────────────────

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Apexon Workplace Hub running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
