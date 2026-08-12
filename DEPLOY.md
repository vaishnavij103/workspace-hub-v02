# 🏢 Apexon RoomBook — Deployment Guide

## Deploy to Render.com (Recommended)

### Step 1: Push to GitHub

```bash
# If you haven't created a GitHub repo yet:
# 1. Go to github.com → New Repository
# 2. Name it: apexon-roombook (or any name)
# 3. Keep it Private, don't add README
# 4. Copy the repo URL

# Then push:
git remote set-url origin https://github.com/YOUR_USERNAME/apexon-roombook.git
git push -u origin dev
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) and sign up with GitHub
2. Click **New +** → **Web Service**
3. Connect your GitHub repo (`apexon-roombook`)
4. Render auto-detects the **Dockerfile** — no config needed
5. Set these options:
   - **Name**: `apexon-roombook`
   - **Region**: Pick closest to your office
   - **Instance Type**: Free (or Starter for better performance)
   - **Branch**: `dev`
6. Under **Advanced** → **Add Disk**:
   - **Mount Path**: `/data`
   - **Size**: 1 GB (enough for SQLite)
7. Click **Deploy Web Service**

### Step 3: Done!

- Render gives you a URL like `https://apexon-roombook.onrender.com`
- Share this URL with all employees
- First deploy auto-seeds 12 rooms + admin account
- **Admin login**: `admin@apexon.com` / `admin123`

---

## Local Development

```bash
# Start API + React dev server
python serve.py
# Visit http://localhost:8000
```

## Docker (Local or Self-Hosted)

```bash
docker compose up -d --build
# Visit http://localhost
```

---

## Data Persistence

- SQLite database stored at `/data/bookings.db` in the container
- Render persistent disk keeps data across deploys
- `docker-compose.yml` uses a named volume for local Docker

## Default Admin

- Email: `admin@apexon.com`
- Password: `admin123`
- Change this after first login!

---

## 🌱 Seeding Data on Every Deploy

The app automatically seeds three types of data on startup:
1. **Rooms** from `location_wise_rooms_cleaned.csv`
2. **Admin User** (`admin@apexon.com / admin123`)
3. **Admin Contacts** for each location (Bangalore, Mumbai, Delhi, Pune)

### Default Behavior

- If data already exists, it's **not re-seeded** (safe for production)
- If database is empty, all data is automatically seeded
- Seed scripts run during container startup (before services start)

### Force Fresh Seed on Every Deploy

If you want to **reset all data to defaults on every new commit**, set this environment variable in Render:

1. Go to your Render service dashboard
2. Click **Environment** (or **Settings** → **Environment Variables**)
3. Add a new variable:
   - **Key**: `FORCE_SEED`
   - **Value**: `true`
4. Click **Save**
5. Trigger a new deploy (or commit to your branch)

> **⚠️ WARNING**: With `FORCE_SEED=true`, all user data (bookings, changes) will be wiped on every deploy. Use only for testing/dev environments.

### Customize Seed Data

**Admin Contacts** (`seed_admin_contacts.py`):
- Edit the `ADMIN_CONTACTS` list to add/remove contacts
- Required fields: `location`, `name`, `email`, `phone`, `role`
- Optional: `active` (default: `true`)

**Rooms** (`seed_rooms.py`):
- Edit `location_wise_rooms_cleaned.csv` to add/remove rooms
- Or modify the seeding logic in `seed_rooms.py`

**Admin User** (`seed_admin.py`):
- Edit the `ADMIN` dict to change default credentials
- Recommended: keep secure, change after first login

### Seed Logs

During deployment, you'll see logs like:
```
🌱 Seeding data...
  Starting API server for seeding...
  ✅ API server ready
  📍 Seeding rooms...
  ✅ 12 rooms already exist
  👤 Seeding admin user...
  ✅ Admin user already exists
  👨‍💼 Seeding admin contacts...
  ✅ Created: Bangalore Admin (Bangalore)
  ✅ Created: Mumbai Admin (Mumbai)
  ✅ Already exists: Delhi Admin (Delhi)
  ⚠️  Admin contacts seed error: [optional error details]
```

### Testing Seed Scripts Locally

```bash
# In dev mode, seeds are NOT automatically run
# To test seeding:

# 1. Start the API server
python run_api.py

# 2. In another terminal, run seed scripts
python seed_rooms.py
python seed_admin.py
python seed_admin_contacts.py
```

