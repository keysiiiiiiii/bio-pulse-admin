// backend/routes/attendanceRoutes.js
// Supabase-based attendance routes aligned to your schema.
// IMPORTANT: Every read/write uses the numeric FK: staff_user_id.

const express = require('express');
const router = express.Router();
const db = require('../db.cjs'); // Supabase client

// ---------- config / helpers ----------
const OFFICE_START = process.env.OFFICE_START || '07:35'; // HH:MM (24h)

const pad = (n) => String(n).padStart(2, '0');
const toISO = (ts) => new Date(ts).toISOString();
const parseIntSafe = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function todayPH() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function normalizeYMD(input) {
  if (!input || input.toLowerCase() === 'today') return todayPH();
  const parts = input.split('-');
  if (parts.length !== 3) throw new Error('Invalid date format (yyyy-mm-dd expected)');
  const [y, m, d] = parts.map((x) => parseInt(x, 10));
  if (y < 1900 || y > 3000 || m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error('Invalid date values');
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Return rows formatted for the Admin modal table
function shapeRow(r) {
  const su = r.staff_users || {};
  const type = r.method || 'biometric';
  
  // Status is now directly from database (calculated by trigger)
  let status = r.status || 'Unknown';
  
  // Extract early minutes from interval if exists
  let early_minutes = 0;
  if (r.early_time_in) {
    // early_time_in is an interval, extract minutes
    const match = String(r.early_time_in).match(/(\d+):(\d+):(\d+)/);
    if (match) {
      early_minutes = parseInt(match[1]) * 60 + parseInt(match[2]);
    }
  }

  return {
    staff_id: su.staff_id,
    name: su.name,
    department: su.department,
    role: su.employee_type,
    time_in: r.time_in,
    time_out: r.time_out,
    type,
    status,
    minute_late: r.minute_late || 0,
    early_minutes: early_minutes,
    on_leave: r.on_leave,
    leave_type: r.leave_type,
  };
}

// Resolve staff_users.id from a string staff_id
async function getStaffUserIdByStaffId(staff_id) {
  const { data, error } = await db
    .from('staff_users')
    .select('id')
    .eq('staff_id', staff_id)
    .limit(1);
  if (error) throw error;
  const row = data && data[0];
  return row ? row.id : null;
}

// Unified query resolver
async function getSuidFromQuery(req) {
  const qSuid = parseIntSafe(req.query.staff_user_id);
  if (qSuid) return qSuid;

  const sid = req.query.staff_id && String(req.query.staff_id).trim();
  if (!sid) return null;

  return await getStaffUserIdByStaffId(sid);
}

// Upsert a biometric IN/OUT for a specific staff_user_id + date
async function upsertBiometric({ staff_user_id, tsISO, out = false }) {
  const att_date = todayPH();

  // Schedule validation
  const now = new Date(tsISO);
  const dayOfWeek = now.getDay();

  const { data: schedule, error: schedErr } = await db
    .from('work_schedules')
    .select('*')
    .eq('staff_user_id', staff_user_id)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .limit(1);

  if (schedErr) throw schedErr;

  if (!schedule || schedule.length === 0) {
    throw new Error('NO_SCHEDULE_TODAY: You are not scheduled to work today. Contact admin.');
  }

  // Check if a row exists for today
  const { data: found, error: selErr } = await db
    .from('attendance_logs')
    .select('id, time_in, time_out')
    .eq('staff_user_id', staff_user_id)
    .eq('att_date', att_date)
    .limit(1);
  if (selErr) throw selErr;

  if (!found || !found.length) {
    // Create new - trigger will calculate minute_late, early_time_in, status
    if (out) {
      const { error: insErr } = await db.from('attendance_logs').insert({
        staff_user_id,
        time_out: tsISO,
        att_date,
        method: 'biometric',
      });
      if (insErr) throw insErr;
      return 'out(created)';
    } else {
      const { error: insErr } = await db.from('attendance_logs').insert({
        staff_user_id,
        time_in: tsISO,
        att_date,
        method: 'biometric',
      });
      if (insErr) throw insErr;
      return 'in(created)';
    }
  }

  // Update existing - trigger will recalculate everything
  const row = found[0];
  if (out) {
    if (!row.time_out || new Date(tsISO) > new Date(row.time_out)) {
      const { error: updErr } = await db
        .from('attendance_logs')
        .update({ time_out: tsISO })
        .eq('id', row.id);
      if (updErr) throw updErr;
      return 'out(updated)';
    }
    return 'out(skip)';
  } else {
    // IN: keep earliest time_in
    const newIn = !row.time_in || new Date(tsISO) < new Date(row.time_in) ? tsISO : row.time_in;
    const { error: updErr } = await db
      .from('attendance_logs')
      .update({ time_in: newIn, method: 'biometric' })
      .eq('id', row.id);
    if (updErr) throw updErr;
    return 'in(updated)';
  }
}

// ------------------------------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------------------------------

// (1) MOBILE CHECK-IN (disabled)
router.post('/mobile', async (_req, res) => {
  return res.status(410).json({
    error: 'Mobile attendance disabled',
    message: 'Mobile/IoT attendance has been deprecated in this system.',
  });
});

// (2) BIOMETRIC IN
router.post('/biometric', async (req, res) => {
  try {
    const employeeId = req.body?.employeeId || req.body?.staff_id;
    const timestamp = req.body?.timestamp || Date.now();
    if (!employeeId) return res.status(400).json({ error: 'Missing employeeId/staff_id' });

    const staff_user_id = await getStaffUserIdByStaffId(employeeId);
    if (!staff_user_id) return res.status(404).json({ error: 'User not found' });

    const tsISO = toISO(timestamp);
    const result = await upsertBiometric({ staff_user_id, tsISO, out: false });

    try {
      await db.from('account_activity').insert([{
        action: 'attendance_time_in',
        details: {
          time_in: tsISO,
          method: 'biometric',
          result: result
        },
        actor_staff_id: employeeId,
        actor_role: 'Staff',
        staff_id: employeeId,
        created_at: new Date().toISOString()
      }]);
    } catch (actErr) {
      console.error('⚠️ Failed to log attendance activity:', actErr);
    }

    return res.json({ ok: true, result });
  } catch (e) {
    console.error('[biometric IN] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (3) BIOMETRIC OUT
router.post('/biometric/out', async (req, res) => {
  try {
    const employeeId = req.body?.employeeId || req.body?.staff_id;
    const timestamp = req.body?.timestamp || Date.now();
    if (!employeeId) return res.status(400).json({ error: 'Missing employeeId/staff_id' });

    const staff_user_id = await getStaffUserIdByStaffId(employeeId);
    if (!staff_user_id) return res.status(404).json({ error: 'User not found' });

    const tsISO = toISO(timestamp);
    const result = await upsertBiometric({ staff_user_id, tsISO, out: true });

    try {
      await db.from('account_activity').insert([{
        action: 'attendance_time_out',
        details: {
          time_out: tsISO,
          method: 'biometric',
          result: result
        },
        actor_staff_id: employeeId,
        actor_role: 'Staff',
        staff_id: employeeId,
        created_at: new Date().toISOString()
      }]);
    } catch (actErr) {
      console.error('⚠️ Failed to log attendance activity:', actErr);
    }

    return res.json({ ok: true, result });
  } catch (e) {
    console.error('[biometric OUT] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (4) TODAY
router.get('/today', async (req, res) => {
  try {
    const date = todayPH();
    const suid = await getSuidFromQuery(req);

    let q = db
      .from('attendance_logs')
      .select(`
        id,
        time_in,
        time_out,
        att_date,
        method,
        attendance_status,
        status,
        minute_late,
        early_time_in,
        on_leave,
        leave_type,
        staff_users!inner(
          id,
          staff_id,
          name,
          employee_type,
          department
        )
      `)
      .eq('att_date', date)
      .order('time_in', { ascending: true });

    if (suid) q = q.eq('staff_user_id', suid);

    const { data, error } = await q;
    if (error) throw error;

    const shaped = (data || []).map(shapeRow);
    return res.json(shaped);
  } catch (e) {
    console.error('[today] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (5) BY DATE
router.get('/date/:selectedDate', async (req, res) => {
  try {
    const date = normalizeYMD(req.params.selectedDate);
    const suid = await getSuidFromQuery(req);

    let q = db
      .from('attendance_logs')
      .select(`
        id,
        time_in,
        time_out,
        att_date,
        method,
        attendance_status,
        status,
        minute_late,
        early_time_in,
        on_leave,
        leave_type,
        staff_users!inner(
          id,
          staff_id,
          name,
          employee_type,
          department
        )
      `)
      .eq('att_date', date)
      .order('time_in', { ascending: true });

    if (suid) q = q.eq('staff_user_id', suid);

    const { data, error } = await q;
    if (error) throw error;

    const shaped = (data || []).map(shapeRow);
    return res.json(shaped);
  } catch (e) {
    if (String(e.message || '').includes('Invalid date')) {
      return res.status(400).json({ error: e.message });
    }
    console.error('[by date] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (6) STATS – Daily attendance statistics
router.get('/stats', async (req, res) => {
  try {
    const date = normalizeYMD(req.query.date || todayPH());

    // Get total staff count
    const { count: totalCount } = await db
      .from('staff_users')
      .select('*', { count: 'exact', head: true });

    // Get attendance logs for the date
    const { data: logs, error } = await db
      .from('attendance_logs')
      .select('staff_user_id, time_in, status, on_leave')
      .eq('att_date', date);

    if (error) throw error;

    // Count by status using database-calculated status
    let presentCount = 0;
    let lateCount = 0;
    let onLeaveCount = 0;
    
    for (const log of (logs || [])) {
      const status = (log.status || '').toLowerCase();
      
      if (log.on_leave === 1 || log.on_leave === true || status === 'on leave') {
        onLeaveCount++;
      } else if (status === 'late') {
        lateCount++;
        presentCount++; // Late is a subset of present
      } else if (status === 'present') {
        presentCount++;
      }
    }
    
    // Absent = Total - Present (including late) - On Leave
    const absentCount = Math.max(0, (totalCount || 0) - presentCount - onLeaveCount);

    return res.json({
      total: totalCount || 0,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      on_leave: onLeaveCount
    });
  } catch (e) {
    console.error('[stats] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (7) LOGS - Get attendance logs for a specific date
router.get('/logs', async (req, res) => {
  try {
    const date = normalizeYMD(req.query.date || todayPH());

    const { data, error } = await db
      .from('attendance_logs')
      .select(`
        id,
        time_in,
        time_out,
        att_date,
        method,
        attendance_status,
        status,
        minute_late,
        early_time_in,
        on_leave,
        leave_type,
        staff_users!inner(
          id,
          staff_id,
          name,
          employee_type,
          department
        )
      `)
      .eq('att_date', date)
      .order('time_in', { ascending: true });

    if (error) throw error;

    const shaped = (data || []).map(shapeRow);
    return res.json(shaped);
  } catch (e) {
    console.error('[logs] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (8) INCOMPLETE
router.get('/incomplete', async (req, res) => {
  try {
    const date = todayPH();
    const suid = await getSuidFromQuery(req);

    let q = db
      .from('attendance_logs')
      .select(`
        id,
        time_in,
        time_out,
        att_date,
        method,
        attendance_status,
        status,
        minute_late,
        early_time_in,
        on_leave,
        leave_type,
        staff_users!inner(
          id,
          staff_id,
          name,
          employee_type,
          department
        )
      `)
      .eq('att_date', date)
      .order('staff_user_id', { ascending: true });

    if (suid) q = q.eq('staff_user_id', suid);

    const { data, error } = await q;
    if (error) throw error;

    const shaped = (data || []).map(shapeRow).filter(r => {
      const status = (r.status || '').toLowerCase();
      return status !== 'present' && status !== 'late';
    });
    return res.json(shaped);
  } catch (e) {
    console.error('[incomplete] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (9) RANGE
router.get('/range', async (req, res) => {
  try {
    const start = normalizeYMD(String(req.query.start || '').trim());
    const end   = normalizeYMD(String(req.query.end   || '').trim());
    const suid  = await getSuidFromQuery(req);
    if (!suid) return res.status(400).json({ error: 'staff_user_id or staff_id required' });

    const { data, error } = await db
      .from('attendance_logs')
      .select('id,time_in,time_out,att_date,method,attendance_status,status,minute_late,early_time_in')
      .eq('staff_user_id', suid)
      .gte('att_date', start)
      .lte('att_date', end)
      .order('att_date', { ascending: true })
      .order('time_in', { ascending: true });
    if (error) throw error;

    res.json(data || []);
  } catch (e) {
    console.error('[range] error:', e.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

// (10) BY MONTH
router.get('/by-month', async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);

    if (!y || !m) {
      return res.status(400).json({ error: 'year and month required' });
    }

    const suid = await getSuidFromQuery(req);
    if (!suid) {
      return res.status(400).json({ error: 'staff_user_id or staff_id required' });
    }

    const start = `${y}-${pad(m)}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${pad(m)}-${pad(lastDay)}`;

    const { data, error } = await db
      .from('attendance_logs')
      .select(`
        id, time_in, time_out, att_date, minute_late, method, attendance_status, status, early_time_in
      `)
      .eq('staff_user_id', suid)
      .gte('att_date', start)
      .lte('att_date', end)
      .order('att_date', { ascending: true });

    if (error) throw error;

    return res.json(data || []);

  } catch (e) {
    console.error('[by-month FIXED] error:', e.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;