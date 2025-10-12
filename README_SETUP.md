# SaudiCord Setup Guide
## Made With Love By SirAbody

## 🚀 Quick Start (Windows)

### Option 1: Using Batch File
```batch
# Just double-click on start-local.bat
```

### Option 2: Manual Setup

#### 1. Backend Server Setup (Port 5000)
```bash
cd server
npm install
npm start
```

#### 2. Frontend Client Setup (Port 3000)
```bash
cd client  
npm install
npm start
```

## 🔧 Configuration

### Server Configuration (server/.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=saudicord
DB_USER=postgres
DB_PASSWORD=postgres

# Server
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Auth
JWT_SECRET=your-secret-key-here

# WebRTC
STUN_SERVER=stun:stun.l.google.com:19302

# Reset DB on startup
RESET_DB=false
```

### Client Configuration (client/.env.local)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SERVER_URL=http://localhost:5000
```

## 📝 Default Users

After first run with database:
- **Admin Account**
  - Username: admin
  - Password: admin509

- **Regular User**
  - Username: Liongtas
  - Password: Lion509

## 🌐 Access URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

## ⚠️ Troubleshooting

### HTTP ERROR 502
- Make sure both server and client are running
- Check that ports 3000 and 5000 are not in use
- Verify the proxy setting in client/package.json points to port 5000

### Database Connection Issues
- Server can run without database (degraded mode)
- Health check will still work
- To use full features, install PostgreSQL and create database

### Port Already in Use
```powershell
# Find process using port
netstat -ano | findstr :5000
netstat -ano | findstr :3000

# Kill Node processes (PowerShell)
Get-Process node | Stop-Process -Force
```

## 💝 Made With Love By SirAbody
