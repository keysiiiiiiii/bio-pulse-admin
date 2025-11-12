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

// GET /api/notifications/recent - Get recent activity logs
// FIXED: Properly filter activities based on user's role
router.get(
  '/notifications/recent',
  verifyToken,
  async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
      const userRole = req.user?.role || '';
      const userStaffId = req.user?.sid || '';

      console.log('🔔 Fetching activities for:', { role: userRole, staff_id: userStaffId });

      let query = db
        .from('account_activity')
        .select('action, details, actor_staff_id, actor_role, staff_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      // FIXED: Filter activities based on user role
      if (userRole === 'ICTO' || userRole === 'Admin' || userRole === 'Vice President') {
        // For ICTO/Admin/VP: Show activities where THEY were the actor
        // This shows what actions THEY performed (create account, password reset, etc.)
        query = query.eq('actor_staff_id', userStaffId);
        console.log('📊 Filtering for ICTO/Admin activities by actor:', userStaffId);
      } else {
        // For regular users: Show activities related to THEIR account
        // This shows actions performed ON their account
        query = query.eq('staff_id', userStaffId);
        console.log('📊 Filtering for user activities on:', userStaffId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching activities:', error);
        return res.status(500).json({ message: 'Database error', details: error.message });
      }

      console.log(`✅ Found ${data?.length || 0} activities`);
      
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