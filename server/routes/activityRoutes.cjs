// routes/activityRoutes.cjs
const express = require('express');
const router = express.Router();
const db = require('../db.cjs');

// Middleware
const { verifyToken, requireRole } = require('../middleware/auth.cjs');

// GET /api/activity/recent - Get recent activity logs for ICTO
router.get(
  '/recent',
  verifyToken,
  requireRole('ICTO', 'Admin', 'Vice President'),
  async (req, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);

      const { data, error } = await db
        .from('account_activity')
        .select('action, details, actor_staff_id, actor_role, staff_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching activities:', error);
        return res.status(500).json({ message: 'Database error' });
      }

      return res.json(data || []);
    } catch (e) {
      console.error('Activity fetch error:', e);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
