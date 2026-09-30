# College Election Voting System

A fully functional, secure, locally hosted college class election voting website built with React, FastAPI, and PostgreSQL.

This application is designed to run **natively on Windows** without Docker. It binds to `0.0.0.0` to allow any smartphone or laptop on the same Wi-Fi/LAN to access the voting portal.

---

## 🏗 Architecture

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18 + Tailwind CSS + Vite    |
| Backend    | FastAPI + Python                  |
| Database   | PostgreSQL                        |
| ORM        | SQLAlchemy (async)                |
| Auth       | JWT + Argon2id password hashing   |

---

## 🚀 Windows Native Setup Guide

### 1. Install Prerequisites

You must install these tools on your Windows computer:
1. **Python**: Download and install from [python.org](https://www.python.org/downloads/). (Ensure you check "Add Python to PATH" during installation).
2. **Node.js**: Download and install the LTS version from [nodejs.org](https://nodejs.org/).
3. **PostgreSQL**: Download and install from [postgresql.org](https://www.postgresql.org/download/windows/).
   * **Important**: During installation, remember the password you set for the default `postgres` user. Keep the default port as `5432`.

### 2. Configure the Database

Open the **SQL Shell (psql)** application installed with PostgreSQL.
Press `Enter` for Server, Database, Port, and Username to accept defaults. Enter the password you chose during installation.

Run these exact SQL commands one by one to create the database and user:

```sql
CREATE DATABASE election_db;
CREATE USER election_admin WITH ENCRYPTED PASSWORD 'change_this_secure_password_123';
GRANT ALL PRIVILEGES ON DATABASE election_db TO election_admin;
ALTER DATABASE election_db OWNER TO election_admin;
\q
```
*(If you change the password, remember to update it in your `.env` file)*

### 3. Setup Environment Variables

Open PowerShell in the `d:\orby voter` folder:
```powershell
Copy-Item .env.example .env
```
Open `.env` in a text editor (like Notepad). 
Ensure `POSTGRES_PASSWORD` matches the password you set in the SQL commands above.
Ensure `POSTGRES_HOST=localhost`.

### 4. Install Dependencies & Start the Backend

Open a **new** PowerShell window in the `d:\orby voter\backend` folder:

```powershell
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt

# Create your first Admin account
python create_admin.py

# Start the backend API on 0.0.0.0 (allows LAN access)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
*(Leave this PowerShell window open to keep the backend running)*

### 5. Install Dependencies & Start the Frontend

Open a **second** PowerShell window in the `d:\orby voter\frontend` folder:

```powershell
# Install Node modules
npm install

# Start the frontend React server (listens on 0.0.0.0 by default in vite.config.js)
npm run dev
```
*(Leave this PowerShell window open to keep the frontend running)*

### 6. Find Your LAN IP

To allow other devices to vote, you need your computer's local IP address.
Open a **third** PowerShell window and run:

```powershell
ipconfig
```
Look for `IPv4 Address` under your active Wi-Fi or Ethernet adapter (e.g., `192.168.1.100`).

### 7. Configure Windows Firewall

By default, Windows blocks incoming connections to ports 3000 and 8000. You must open them so students can access the site over Wi-Fi.

Open PowerShell **as Administrator** and run these exact commands:

```powershell
New-NetFirewallRule -DisplayName "Election System Frontend (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "Election System Backend (Port 8000)" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow -Profile Private
```

*(Ensure your Wi-Fi network profile is set to "Private" in Windows Settings > Network & Internet)*

---

## 📱 Accessing the Application

**From the Host Computer:**
- Voter Portal: [http://localhost:3000](http://localhost:3000)
- Admin Portal: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

**From Other Devices on the Wi-Fi Network:**
Replace `192.168.1.100` with the IPv4 Address you found in step 6.
- Voter Portal: `http://192.168.1.100:3000`
- Admin Portal: `http://192.168.1.100:3000/admin/login`

*(Do NOT share the `/admin/login` link with students.)*

---

## 📋 Complete Workflow

1. **Admin Login**: Go to the Admin Portal and log in.
2. **Create Classes**: Create classes (e.g., CSE-A, CSE-B).
3. **Import Voters**: Upload an Excel `.xlsx` file containing student USNs. The system will auto-generate secure passwords.
4. **Save Credentials**: Copy, print, or export the generated passwords immediately.
5. **Create Election**: Set up the election, posts (e.g. President), and add candidates.
6. **Open Election**: Change the election status to OPEN.
7. **Voting**: Students access the Voter Portal on their phones, log in with their USN and provided password, and cast their secret ballot.
8. **Close Election**: When voting time is over, change status to CLOSED.
9. **View Results**: View results and class-wise turnout on the Results page.

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| Password Hashing | Argon2id (time=3, memory=65536, parallelism=4) |
| Authentication | JWT tokens with separate admin/voter types |
| One-Vote Enforcement | `UNIQUE(election_id, voter_id)` database constraint |
| Secret Ballot | Voter participation stored separately from ballot selections |
| Rate Limiting | per-IP throttling via slowapi |
| Audit Logging | All admin actions logged |
