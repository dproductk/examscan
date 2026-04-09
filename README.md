# ExamFlow

**ExamFlow** is a locally-deployed college examination management system that digitizes physical answer sheet grading. It runs entirely on a college LAN with zero cloud dependency.

## User Roles

| Role | Portal | Description |
|---|---|---|
| **Scanning Staff** | `/login/scanning` | Scans physical answer sheets into digital PDFs |
| **Teacher** | `/login/teacher` | Evaluates/grades answer sheets via a split-panel interface |
| **Exam Department** | `/login/exam-dept` | Manages the entire workflow: assignments, schemes, reports |

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 4.2, Django REST Framework 3.14 |
| Auth | JWT via djangorestframework-simplejwt |
| Database | PostgreSQL 15 |
| Image Processing | Pillow, OpenCV, pyzbar |
| PDF | img2pdf, ReportLab |
| Reports | openpyxl (Excel), ReportLab (PDF) |
| Frontend | React 18 (Vite), React Router v6, Axios |
| PDF Viewer | react-pdf |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15
- mkcert (for HTTPS on LAN)

---

## 1. HTTPS Setup (do this first)

```bash
# Install mkcert: https://github.com/FiloSottile/mkcert
mkcert -install
mkcert 192.168.1.100 localhost 127.0.0.1
# Creates: 192.168.1.100+2.pem and 192.168.1.100+2-key.pem
# Move these files to examflow/backend/
```

## 2. Database Setup

```bash
# Install PostgreSQL and start the service
createdb examflow
```

## 3. Backend Setup

```bash
cd backend
python -m venv venv

# Mac/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DB credentials and cert paths

python manage.py migrate
python manage.py createsuperuser
# Creates first exam_dept account
```

## 4. Run Backend

```bash
python manage.py runserver_plus 0.0.0.0:8000 \
  --cert-file 192.168.1.100+2.pem \
  --key-file 192.168.1.100+2-key.pem
```

## 5. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=https://192.168.1.100:8000
```

## 6. Run Frontend

```bash
npm run dev -- --host
```

## 7. Access the App

| URL | From |
|---|---|
| `https://localhost:5173` | This machine |
| `https://192.168.1.100:5173` | LAN devices |
| `https://192.168.1.100:8000/api/` | Backend API |
| `https://192.168.1.100:8000/admin/` | Django Admin |

## Login Routes

- **Scanning Staff:** `/login/scanning`
- **Teacher:** `/login/teacher`
- **Exam Department:** `/login/exam-dept`

---

## Project Structure

```
examflow/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── examflow_project/      # Django settings, URLs, WSGI/ASGI
│   ├── apps/
│   │   ├── users/             # Auth, roles, permissions
│   │   ├── scanning/          # Bundles, answer sheets, images
│   │   ├── evaluation/        # Grading, marking schemes
│   │   ├── amendments/        # Rescan requests
│   │   ├── audit/             # Immutable audit log
│   │   └── reports/           # Excel & PDF exports
│   └── utils/                 # Barcode, PDF compiler, audit helper
├── frontend/
│   ├── src/
│   │   ├── api/               # Axios instance + API modules
│   │   ├── context/           # AuthContext
│   │   ├── routes/            # ProtectedRoute
│   │   ├── pages/             # Scanning, Teacher, ExamDept pages
│   │   └── components/        # Reusable UI components
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## Operations Guide (For College IT Staff)

> **Important:** This system runs on a single server. Regular backups are critical. Read this section fully before exam season begins.

### 1. Nightly Backup

All scanned PDFs and uploaded images are stored in `backend/media/`. This folder **must** be backed up nightly.

**Windows — Scheduled Task (Recommended):**

Create a file called `backup_examflow.bat` on the server desktop:

```bat
@echo off
set BACKUP_DRIVE=E:\ExamFlow_Backups
set SOURCE=C:\path\to\ExamFlow\backend\media
set TIMESTAMP=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%

echo Backing up ExamFlow media to %BACKUP_DRIVE%\%TIMESTAMP%...
xcopy "%SOURCE%" "%BACKUP_DRIVE%\%TIMESTAMP%\media\" /E /I /H /Y

echo Backing up database...
pg_dump -U postgres examflow > "%BACKUP_DRIVE%\%TIMESTAMP%\examflow_db.sql"

echo Backup complete: %BACKUP_DRIVE%\%TIMESTAMP%
pause
```

Then schedule this script to run every night at 11 PM using Windows Task Scheduler:
1. Open Task Scheduler → Create Basic Task
2. Name: "ExamFlow Nightly Backup"
3. Trigger: Daily at 11:00 PM
4. Action: Start a program → browse to `backup_examflow.bat`
5. Click Finish

**Linux:**

```bash
#!/bin/bash
BACKUP_DIR="/mnt/backup/examflow/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"
cp -r /path/to/ExamFlow/backend/media "$BACKUP_DIR/"
pg_dump -U postgres examflow > "$BACKUP_DIR/examflow_db.sql"
echo "Backup complete: $BACKUP_DIR"
```

Add to crontab: `crontab -e` → `0 23 * * * /path/to/backup_examflow.sh`

### 2. Restore from Backup

If the server crashes or data is lost:

1. **Install everything fresh** using the setup steps above (Sections 1–6).
2. **Restore the database:**
   ```bash
   psql -U postgres examflow < /path/to/backup/examflow_db.sql
   ```
3. **Restore the media files:**
   ```bash
   # Copy the backed-up media/ folder back to backend/media/
   xcopy "E:\ExamFlow_Backups\2026-04-09\media" "C:\path\to\ExamFlow\backend\media\" /E /I /H /Y
   ```
4. **Start the server** as normal (Sections 4 and 6).
5. **Verify** by logging in as Exam Dept and checking that bundles and answer sheets appear correctly.

### 3. Disk Space Monitoring

**How much space does ExamFlow use?**

| Item | Approximate Size |
|---|---|
| 1 scanned page (image) | ~2–5 MB |
| 1 student answer sheet (20 pages, compiled PDF) | ~10–30 MB |
| 1 exam session (500 students × 1 subject) | ~5–15 GB |
| Full exam season (500 students × 8 subjects) | ~40–120 GB |

**Check disk space regularly:**

```bash
# Windows (PowerShell):
Get-PSDrive C | Select-Object Used, Free

# Linux:
df -h /path/to/ExamFlow/backend/media
```

**Warning thresholds:**
- ⚠️ **Below 20 GB free:** Alert IT staff. Start clearing old backups or temp images.
- 🔴 **Below 5 GB free:** CRITICAL. Stop scanning immediately and free space before resuming.

### 4. Emergency: Disk Full During Scanning

If the server runs out of space during an active scanning session:

1. **Stop scanning immediately.** Tell all scanner operators to pause.
2. **Check what's using space:**
   ```bash
   # Windows:
   Get-ChildItem -Path "C:\path\to\ExamFlow\backend\media" -Recurse | 
     Measure-Object -Property Length -Sum
   
   # Linux:
   du -sh /path/to/ExamFlow/backend/media/*
   ```
3. **Free space quickly — safe to delete:**
   - `backend/media/scanned_images/` — These are **temporary** page images that have already been compiled into PDFs. Safe to delete after confirming PDFs exist.
   - Old backup folders on the backup drive.
4. **Do NOT delete:**
   - `backend/media/answer_sheets/` — These are the **finalized PDFs** used for grading. Deleting these will lose student papers.
5. **Resume scanning** once at least 10 GB free space is confirmed.

### 5. Password Reset for Teachers

If a teacher forgets their password:

1. Log into Django Admin: `https://<server-ip>:8000/admin/`
2. Go to Users → find the teacher
3. Click on their name → scroll to "Password" section
4. Click "this form" link to set a new password
5. Check the "Must change password" box
6. Save
7. Give the teacher their new credentials in person

---

