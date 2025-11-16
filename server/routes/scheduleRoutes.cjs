// server/routes/scheduleRoutes.cjs
// Work Schedule Management Routes

const express = require('express');
const router = express.Router();
const db = require('../db.cjs');

// ========== GET: Fetch user's active schedule ==========
// GET /api/schedules/:staff_user_id
router.get('/:staff_user_id', async (req, res) => {
  try {
    const { staff_user_id } = req.params;

    const { data, error } = await db
      .from('work_schedules')
      .select('*, staff_users!inner(staff_id, name)')
      .eq('staff_user_id', staff_user_id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true });

    if (error) throw error;

    res.json({ 
      ok: true, 
      schedules: data || [],
      user: data && data[0] ? data[0].staff_users : null
    });
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Failed to fetch schedule' 
    });
  }
});

// ========== GET: Fetch users without schedules ==========
// GET /api/schedules/unscheduled/list
router.get('/unscheduled/list', async (req, res) => {
  try {
    // Get all staff users
    const { data: allUsers, error: userError } = await db
      .from('staff_users')
      .select('id, staff_id, name, employee_type, department, college');

    if (userError) throw userError;

    // Get all users who have active schedules
    const { data: scheduledUsers, error: schedError } = await db
      .from('work_schedules')
      .select('staff_user_id')
      .eq('is_active', true);

    if (schedError) throw schedError;

    // Filter out users who already have schedules
    const scheduledIds = new Set(scheduledUsers.map(s => s.staff_user_id));
    const unscheduledUsers = allUsers.filter(u => !scheduledIds.has(u.id));

    res.json({ 
      ok: true, 
      users: unscheduledUsers,
      count: unscheduledUsers.length
    });
  } catch (error) {
    console.error('❌ Error fetching unscheduled users:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Failed to fetch unscheduled users' 
    });
  }
});

// ========== POST: Create/Update schedule for a user ==========
// POST /api/schedules
router.post('/', async (req, res) => {
  try {
    const { staff_user_id, schedules, created_by_staff_id } = req.body;

    if (!staff_user_id || !schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: staff_user_id, schedules' 
      });
    }

    // Validate schedule entries
    for (const sched of schedules) {
      if (sched.day_of_week < 0 || sched.day_of_week > 6) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Invalid day_of_week (must be 0-6)' 
        });
      }
      if (!sched.time_in || !sched.time_out) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Missing time_in or time_out' 
        });
      }
    }

    // Step 1: Deactivate all existing schedules for this user
    const { error: deactivateError } = await db
      .from('work_schedules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('staff_user_id', staff_user_id);

    if (deactivateError) throw deactivateError;

    // Step 2: Insert new schedules
    const newSchedules = schedules.map(s => ({
      staff_user_id,
      day_of_week: s.day_of_week,
      time_in: s.time_in,
      time_out: s.time_out,
      is_active: true,
      created_by_staff_id: created_by_staff_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error: insertError } = await db
      .from('work_schedules')
      .insert(newSchedules)
      .select();

    if (insertError) throw insertError;

    // Step 3: Get user info for activity log
    const { data: userData } = await db
      .from('staff_users')
      .select('staff_id, name')
      .eq('id', staff_user_id)
      .single();

    // Step 4: Log activity to account_activity
    const action = schedules.length > 0 ? 'schedule_set' : 'schedule_updated';
    await db.from('account_activity').insert({
      action,
      actor_staff_id: created_by_staff_id,
      actor_role: 'admin',
      staff_id: userData?.staff_id || staff_user_id.toString(),
      details: {
        user_name: userData?.name,
        schedule_count: schedules.length,
        days: schedules.map(s => s.day_of_week).join(',')
      }
    });

    res.json({ 
      ok: true, 
      message: 'Schedule saved successfully',
      schedules: data 
    });
  } catch (error) {
    console.error('❌ Error saving schedule:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Failed to save schedule' 
    });
  }
});

// ========== DELETE: Remove all schedules for a user ==========
// DELETE /api/schedules/:staff_user_id
router.delete('/:staff_user_id', async (req, res) => {
  try {
    const { staff_user_id } = req.params;
    const { deleted_by_staff_id } = req.body;

    // Deactivate instead of hard delete
    const { error } = await db
      .from('work_schedules')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('staff_user_id', staff_user_id);

    if (error) throw error;

    // Log activity
    await db.from('account_activity').insert({
      action: 'schedule_deleted',
      actor_staff_id: deleted_by_staff_id,
      actor_role: 'admin',
      staff_id: staff_user_id.toString(),
      details: { message: 'Work schedule removed' }
    });

    res.json({ 
      ok: true, 
      message: 'Schedule removed successfully' 
    });
  } catch (error) {
    console.error('❌ Error deleting schedule:', error);
    res.status(500).json({ 
      ok: false, 
      error: error.message || 'Failed to delete schedule' 
    });
  }
});

module.exports = router;
