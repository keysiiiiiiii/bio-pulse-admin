# Bio-Pulse Admin - Setup Guide

## 🚀 Quick Start

### 1. Start the Backend Server

```bash
node server/index.js
```

The backend will start on **http://localhost:3001**

You should see:
```
🚀 Server on:
  → http://localhost:3001
  → http://[your-network-ip]:3001
```

### 2. Start the Frontend (Lovable Development)

The frontend is already configured to connect to `http://localhost:3001` via the `.env.local` file.

Just run your Lovable project normally - it will automatically connect to your backend!

## ✅ Verify Connection

Once both are running:

1. Open the **Admin Dashboard** (`/admin`)
2. Check the browser console (F12) for any errors
3. You should see:
   - Total Staff count
   - Present Today count  
   - Absent count
   - Charts loading with real data

## 📡 Backend Routes Available

### Attendance
- `GET /api/attendance/stats?date=YYYY-MM-DD` - Daily stats
- `GET /api/attendance/logs?date=YYYY-MM-DD` - Attendance logs
- `POST /api/attendance/manual` - Manual check-in
- `GET /api/attendance/today` - Today's logs
- `GET /api/attendance/range?start=...&end=...` - Date range

### Analytics
- `GET /api/analytics/daily?date=YYYY-MM-DD` - Daily KPIs
- `GET /api/analytics/top-absentees?start=...&end=...` - Top absentees
- `GET /api/analytics/attendance-trend?start=...&end=...` - Attendance trends
- `GET /api/analytics/leave-summary?start=...&end=...` - Leave summary

### Staff
- `GET /api/staff` - All staff
- `GET /api/staff/:id` - Staff by ID
- `POST /api/staff/login` - Login
- `PUT /api/staff/:id` - Update staff
- etc.

### Leave Requests
- `GET /api/leaves` - All leaves
- `POST /api/leaves` - Create leave
- `PUT /api/leaves/:id/status` - Update status

### DTR
- `GET /api/dtr/records?staff_id=...&year=...&month=...` - Get records
- `GET /api/dtr/download?staff_id=...&year=...&month=...` - Download PDF

## 🔧 Configuration

### Backend (.env in server/)
```env
SUPABASE_URL=https://dryeznlpvtuogoeuelyu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here
PORT=3001
```

### Frontend (.env.local)
```env
VITE_API_URL=http://localhost:3001
```

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify `.env` file exists in `server/` directory
- Check Supabase credentials are correct

### Frontend shows "Request failed"
- Verify backend is running on port 3001
- Check browser console for CORS errors
- Verify `.env.local` exists with correct URL

### No data showing
- Check if Supabase database has data
- Verify database tables exist: `staff_users`, `attendance_logs`, `leave_requests`
- Check browser Network tab (F12) for API response errors
