// routes/activityRoutes.cjs
const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

// Middleware - Extract from staffRoutes.cjs pattern
function getBearer(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function verifyToken(req, res, next) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try { 
    req.user = jwt.verify(token, JWT_SECRET); 
    next(); 
  } catch { 
    return res.status(401).json({ message: 'Invalid/expired token' }); 
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

// GET /api/notifications/recent - Get recent activity logs with intelligent filtering
router.get(
  '/notifications/recent',
  verifyToken,
  async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
      const userRole = req.user?.role || '';
      const userStaffId = req.user?.sid || '';

      console.log('🔔 Fetching notifications for:', { role: userRole, staff_id: userStaffId });

      let query = db
        .from('account_activity')
        .select('id, action, details, actor_staff_id, actor_role, staff_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Smart filtering based on user role and activity type
      if (userRole === 'ICTO' || userRole === 'Admin' || userRole === 'Vice President') {
        // Admins see:
        // 1. Activities where THEY were the actor (their actions)
        // 2. System-wide activities they should be aware of
        query = query.or(`actor_staff_id.eq.${userStaffId},action.eq.leave_status_update`);
        console.log('📊 Admin view: showing actions performed by user and leave updates');
      } else {
        // Regular users (Staff/Faculty) see:
        // 1. Activities related to THEIR account (staff_id matches)
        // This includes: leave status updates, attendance logs, profile updates affecting them
        query = query.eq('staff_id', userStaffId);
        console.log('📊 User view: showing activities for staff_id:', userStaffId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching activities:', error);
        return res.status(500).json({ message: 'Database error', details: error.message });
      }

      console.log(`✅ Found ${data?.length || 0} notifications`);
      
      return res.json(data || []);
    } catch (e) {
      console.error('❌ Activity fetch error:', e);
      return res.status(500).json({ message: 'Server error', details: e.message });
    }
  }
);

// GET /api/activity/history - Alternative endpoint for full history (Admin only)
router.get(
  '/activity/history',
  verifyToken,
  requireRole('Admin', 'ICTO', 'Vice President'),
  async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10), 1), 500);
      const staffId = req.query.staff_id || null;

      console.log('📋 Fetching activity history:', { limit, staff_id: staffId });

      let query = db
        .from('account_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // If staff_id provided, filter by that specific user
      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching history:', error);
        return res.status(500).json({ message: 'Database error' });
      }

      console.log(`✅ Found ${data?.length || 0} history records`);
      
      return res.json(data || []);
    } catch (e) {
      console.error('❌ History fetch error:', e);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;