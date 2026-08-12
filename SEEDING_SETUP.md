# Seeding Setup Summary

## What's New

I've created a comprehensive seeding solution for your Render deployment that automatically seeds:
1. **Rooms** (12 rooms from CSV)
2. **Admin User** (admin@apexon.com / admin123)
3. **Admin Contacts** (for Bangalore, Mumbai, Delhi, Pune locations)

Every time the container starts, these will be checked and seeded if missing.

## Files Changed

### 1. New File: `seed_admin_contacts.py`
- Seeds default admin contacts for 4 locations
- Gracefully handles duplicates (won't fail if contact already exists)
- Customizable: edit the `ADMIN_CONTACTS` list to add/remove locations

### 2. Updated: `Dockerfile`
- Added `seed_admin_contacts.py` to Docker image

### 3. Updated: `docker-entrypoint.sh`
- Refactored seeding logic to handle all 3 data types
- Added support for `FORCE_SEED` environment variable
- Better error handling and logging
- Checks each data type independently (won't fail if one seed fails)

### 4. Updated: `DEPLOY.md`
- Added comprehensive "Seeding Data on Every Deploy" section
- Instructions for setting `FORCE_SEED=true` on Render
- Customization guide
- Seed script testing instructions

## How It Works

### Default Behavior (Recommended for Production)
```
On every deploy:
✅ Rooms - seeded only if database is empty
✅ Admin - seeded only if admin@apexon.com doesn't exist
✅ Admin Contacts - seeded, duplicates are gracefully skipped
```

### With FORCE_SEED=true (Dev/Test Only)
```
On every deploy:
⚠️  All data is reset to defaults
⚠️  All user bookings/changes will be wiped
```

## Setup on Render

### Option 1: Default (Safe for Production)
No changes needed! Just deploy. Data will be seeded on first startup.

### Option 2: Fresh Seed on Every Deploy
1. Go to Render service dashboard
2. Settings → Environment Variables
3. Add: `FORCE_SEED=true`
4. Save & redeploy

## Customizing Seed Data

### Change Admin Credentials
Edit `seed_admin.py`:
```python
ADMIN = {
    "email": "your-admin@apexon.com",
    "password": "new-strong-password",
    ...
}
```

### Add/Remove Locations
Edit `seed_admin_contacts.py`:
```python
ADMIN_CONTACTS = [
    {
        "location": "New City",
        "name": "New City Admin",
        "email": "admin.newcity@apexon.com",
        "phone": "+91-XX-XXXX-XXXX",
        ...
    },
    ...
]
```

### Add/Remove Rooms
Edit `location_wise_rooms_cleaned.csv` or modify `seed_rooms.py`

## Testing Locally

```bash
# Start API
python run_api.py

# In another terminal, test individual seeds
python seed_rooms.py      # Seeds rooms from CSV
python seed_admin.py      # Creates admin user
python seed_admin_contacts.py  # Creates admin contacts
```

## Deployment Flow

When you deploy a new commit on Render:

1. Container starts
2. Database is initialized (tables created if needed)
3. **Seeding Phase** (the new logic):
   - API server starts temporarily
   - Rooms are checked/seeded
   - Admin user is checked/seeded
   - Admin contacts are created (duplicates skipped)
   - API server stops
4. Services start (nginx + uvicorn supervisor)
5. App is live

## Logs to Expect

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
  ⚠️  Already exists: Mumbai Admin (Mumbai)
```

## Benefits

✅ **Automatic initialization** - no manual seeding needed  
✅ **Safe by default** - existing data is preserved  
✅ **Optional fresh seed** - set `FORCE_SEED=true` when needed  
✅ **Robust** - handles errors gracefully  
✅ **Idempotent** - can run multiple times safely  
✅ **Customizable** - edit seed files to match your needs
