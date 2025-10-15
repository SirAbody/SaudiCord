# MongoDB Atlas Setup Guide

## 🚀 How to Get Your MongoDB Connection String

### Step 1: Create MongoDB Atlas Account
1. Go to https://cloud.mongodb.com
2. Sign up for a free account
3. Verify your email

### Step 2: Create a Cluster
1. Click "Create a New Cluster"
2. Choose **FREE** tier (M0 Sandbox)
3. Select your preferred region
4. Name your cluster (e.g., "Cluster0")
5. Click "Create Cluster" (takes 3-5 minutes)

### Step 3: Create Database User
1. Go to "Database Access" in the sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Set username: `saudicord_user`
5. Set a strong password (save it!)
6. Database User Privileges: "Read and write to any database"
7. Click "Add User"

### Step 4: Whitelist IP Address
1. Go to "Network Access" in the sidebar
2. Click "Add IP Address"
3. For development: Click "Add Current IP Address"
4. For production: Click "Allow Access from Anywhere" (0.0.0.0/0)
5. Click "Confirm"

### Step 5: Get Connection String
1. Go to "Clusters" in the sidebar
2. Click "Connect" button on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 4.0 or later
5. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>?retryWrites=true&w=majority
   ```

### Step 6: Replace Values
Replace the placeholders in the connection string:
- `<username>` → Your database username (e.g., `saudicord_user`)
- `<password>` → Your database password
- `<database>` → Your database name (e.g., `saudicord`)

Example final string:
```
mongodb+srv://saudicord_user:YourPassword123@cluster0.xxxxx.mongodb.net/saudicord?retryWrites=true&w=majority
```

## 🔧 Setting Up in Render.com

### Step 1: Go to Environment Variables
1. Open your service in Render Dashboard
2. Go to "Environment" tab
3. Click "Add Environment Variable"

### Step 2: Add MongoDB URI
- **Key**: `MONGODB_URI`
- **Value**: Your complete connection string from above
- Click "Save"

### Step 3: Redeploy
- Click "Manual Deploy" → "Deploy latest commit"
- Wait for deployment to complete

## ⚠️ Common Issues

### "Authentication failed"
- Check username and password are correct
- Make sure user exists in Database Access

### "Could not connect to any servers"
- Check IP whitelist in Network Access
- For Render, must use "Allow from anywhere" (0.0.0.0/0)

### "querySrv ENOTFOUND"
- Check cluster name is correct
- Make sure cluster is not paused (free tier pauses after 60 days of inactivity)

### "Operation timed out"
- Check network connectivity
- Ensure cluster is in an accessible region
- Verify firewall settings

## 🧪 Testing Connection Locally

1. Create `.env` file in `/server` directory:
   ```env
   MONGODB_URI=mongodb+srv://your_connection_string_here
   ```

2. Test connection:
   ```bash
   cd server
   node test-mongodb-simple.js
   ```

3. If successful, run the server:
   ```bash
   node server-mongodb.js
   ```

## 📝 Notes

- Free tier (M0) limits:
  - 512 MB storage
  - Shared RAM and vCPU
  - No automatic backups
  - Perfect for development and small projects

- Security tips:
  - Never commit connection strings to Git
  - Use environment variables
  - Rotate passwords regularly
  - Use IP whitelist in production when possible

---

Made With Love By SirAbody 💝
