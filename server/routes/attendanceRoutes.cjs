// backend/routes/attendanceRoutes.js
// Supabase-based attendance routes aligned to your schema.
// IMPORTANT: Every read/write uses the numeric FK: staff_user_id.
// If a caller only has string staff_id, we resolve it to staff_user_id first.

const express = require('express');
const router = express.Router();
const db = require('../db.cjs'); // Supabase client

// ---------- config / helpers ----------
const OFFICE_START = process.env.OFFICE_START || '08:00'; // HH:MM (24h)

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

function isLate(tsISO) {
  if (!tsISO) return false;
  const [HH, MM] = (OFFICE_START || '08:00').split(':').map((v) => parseInt(v, 10) || 0);
  const start = new Date();
  start.setHours(HH, MM, 0, 0);

  const t = new Date(tsISO);
  return t.getHours() > start.getHours() || (t.getHours() === start.getHours() && t.getMinutes() > start.getMinutes());
}

// Return rows formatted for the Admin modal table
function shapeRow(r) {
  const su = r.staff_users || {};
  const type = r.method || 'biometric';
  let status = r.attendance_status;

  if (!status) {
    if (r.time_in) status = isLate(r.time_in) ? 'Late' : 'Present';
    else status = 'Absent';
  }

  return {
    staff_id: su.staff_id,            // first column in UI
    name: su.name,
    department: su.department,
    role: su.employee_type,
    time_in: r.time_in,
    time_out: r.time_out,
    type,
    status,
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

// Unified query resolver: returns numeric staff_user_id if provided,
// otherwise resolves from ?staff_id=...
async function getSuidFromQuery(req) {
  // prefer staff_user_id
  const qSuid = parseIntSafe(req.query.staff_user_id);
  if (qSuid) return qSuid;

  // fallback: staff_id (string)
  const sid = req.query.staff_id && String(req.query.staff_id).trim();
  if (!sid) return null;

  return await getStaffUserIdByStaffId(sid);
}

// Upsert a biometric IN/OUT for a specific staff_user_id + date
async function upsertBiometric({ staff_user_id, tsISO, out = false }) {
  const att_date = todayPH();

  // check if a row exists for today
  const { data: found, error: selErr } = await db
    .from('attendance_logs')
    .select('id, time_in, time_out')
    .eq('staff_user_id', staff_user_id)
    .eq('att_date', att_date)
    .limit(1);
  if (selErr) throw selErr;

  if (!found || !found.length) {
    // create new
    if (out) {
      // OUT-only → create row with time_out
      const { error: insErr } = await db.from('attendance_logs').insert({
        staff_user_id,
        time_out: tsISO,
        att_date,
        method: 'biometric',
        attendance_status: 'Present',
      });
      if (insErr) throw insErr;
      return 'out(created)';
    } else {
      const { error: insErr } = await db.from('attendance_logs').insert({
        staff_user_id,
        time_in: tsISO,
        att_date,
        method: 'biometric',
        attendance_status: isLate(tsISO) ? 'Late' : 'Present',
      });
      if (insErr) throw insErr;
      return 'in(created)';
    }
  }

  // update existing
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
      .update({ time_in: newIn, method: 'biometric', attendance_status: isLate(newIn) ? 'Late' : 'Present' })
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

    // Log activity to account_activity table
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

    // Log activity to account_activity table
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

// (4) TODAY  — supports ?staff_user_id= or ?staff_id=
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

// (5) BY DATE — supports ?staff_user_id= or ?staff_id=
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

// (6) STATS — Daily attendance statistics
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
      .select('staff_user_id, time_in, time_out, attendance_status')
      .eq('att_date', date);

    if (error) throw error;

    const present = logs.filter(l => l.time_in).length;
    const late = logs.filter(l => l.attendance_status === 'Late').length;
    const absent = Math.max(0, (totalCount || 0) - present);

    return res.json({
      total: totalCount || 0,
      present,
      absent,
      late,
      on_leave: 0
    });
  } catch (e) {
    console.error('[stats] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (7) INCOMPLETE — unchanged (optionally filter by suid if sent)
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

    const shaped = (data || []).map(shapeRow).filter(r => r.status !== 'Present' && r.status !== 'Late');
    return res.json(shaped);
  } catch (e) {
    console.error('[incomplete] error:', e.message || e);
    return res.status(500).json({ error: 'Server error' });
  }
});

// (7) RANGE — optional helper used by DTR builders
// GET /api/attendance/range?start=YYYY-MM-DD&end=YYYY-MM-DD&staff_user_id=123
router.get('/range', async (req, res) => {
  try {
    const start = normalizeYMD(String(req.query.start || '').trim());
    const end   = normalizeYMD(String(req.query.end   || '').trim());
    const suid  = await getSuidFromQuery(req);
    if (!suid) return res.status(400).json({ error: 'staff_user_id or staff_id required' });

    const { data, error } = await db
      .from('attendance_logs')
      .select('id,time_in,time_out,att_date,method,attendance_status')
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

// (8) BY MONTH — convenience for a month; returns same rows as /range
// GET /api/attendance/by-month?year=2025&month=10&staff_user_id=123
router.get('/by-month', async (req, res) => {
  try {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    if (!y || !m) return res.status(400).json({ error: 'year and month required' });
    const start = `${y}-${pad(m)}-01`;
    const end   = `${y}-${pad(m)}-${pad(new Date(y, m, 0).getDate())}`;
    req.query.start = start; req.query.end = end;
    return router.handle({ ...req, url: '/range' }, res, () => {});
  } catch (e) {
    console.error('[by-month] error:', e.message || e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
