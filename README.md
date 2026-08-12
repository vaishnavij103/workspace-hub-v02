# 🏢 Apexon Workplace Operations Hub & Room Booking System

A full-stack enterprise workplace operations portal providing real-time room booking, hot-desk workstation reservations, visitor management, smart parking allocations, facility helpdesk ticketing, and financial expense/invoice management with custom OCR extraction across Apexon global offices.

---

## 🌟 Key Features & Functional Modules

- **🏢 Meeting Room Management & Booking**
  - Seeded automatically from `location_wise_rooms_cleaned.csv` across global locations.
  - Search and filter rooms across locations by capacity, equipment, and status.
  - Interactive slot grid for real-time availability checking and conflict-free booking.
  - Batch import rooms via CSV uploads and export booking schedules.

- **📑 Intelligent Invoice Processing & Custom OCR**
  - Custom library-driven OCR invoice parser (`pdfplumber`, `pypdf`, `pytesseract`) without external AI/Gemini dependencies.
  - Automatic extraction of vendor details, invoice numbers, service dates, line items, taxes, subtotal, and currency.
  - Review and edit extracted fields before persisting to the invoice repository.

- **👤 VisiFlow Visitor Access & Passes**
  - Pre-register guests, log host contacts, track visit duration, and record check-in/check-out status.
  - Generate digital visitor passes and download badge passes.

- **🚗 ParkSwift Smart Parking**
  - Reserved parking slot allocation for EV charging, executive, visitor, and accessible parking.
  - Real-time slot availability tracking and reservation logging.

- **🎧 Facility Helpdesk & Support Tickets**
  - Raise service requests for AV equipment, AC maintenance, cleaning, or furniture resets.
  - Priority tracking (Low, Medium, High, Urgent) and resolution status monitoring.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React Icons, Context API.
- **Backend**: Python **FastAPI** (`app.py`) with `uvicorn`, custom OCR libraries (`pytesseract`, `pdfplumber`, `pypdf`).
- **Dependencies**: Listed in `requirements.txt` for Python backend and `package.json` for frontend.

---

## 🚀 Quick Start & Setup Instructions

### Prerequisites

- Node.js (v18+) & npm
- Python (v3.9+)
- `tesseract-ocr` (for image-based OCR parsing)

### 1. Install System Dependencies (Ubuntu / Debian)

```bash
sudo apt-get update
sudo apt-get install -y python3-pip tesseract-ocr
```

### 2. Install Backend Python Dependencies (`requirements.txt`)

```bash
pip install -r requirements.txt
```

### 3. Install Frontend Node Dependencies (`package.json`)

```bash
npm install
```

### 4. Start Development Application

Run the dev server:

```bash
npm run dev
```

This starts:
- Python **FastAPI** REST API backend on `http://127.0.0.1:5000`
- **Vite** React frontend server on `http://localhost:3000` (proxying `/api` requests to `127.0.0.1:5000`)

---

## 📁 Project Structure

```
├── src/                            # React Frontend Application
│   ├── components/                 # Reusable UI Components & Modals
│   ├── pages/                      # Page Views (Rooms, Invoices, Visitors, etc.)
│   ├── AuthContext.jsx             # Authentication & User Session Context
│   ├── LocationContext.jsx          # Location Filter Context
│   └── api.js                      # API Client Methods
├── app.py                          # Python FastAPI Backend Server
├── location_wise_rooms_cleaned.csv # Room Data Seeding Source
├── requirements.txt                # Python Backend Dependencies
├── package.json                    # Node Frontend Dependencies & Scripts
└── README.md                       # Setup and Operations Documentation
```
