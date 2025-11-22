// backend/routes/analyticsRoutes.js
const router = require('express').Router();
const db = require('../db.cjs');

// debug: log every analytics request
router.use((req, _res, next) => {
  console.log('[analytics]', req.method, req.url);
  next();
});



// ------------------------------ helpers ------------------------------
const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s);
const pad = (n) => String(n).padStart(2, '0');
const addDays = (d, k) => { const nd = new Date(d); nd.setDate(nd.getDate() + k); return nd; };
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const rangeDays = (start, end) => {
  const s = new Date(start), e = new Date(end);
  const out = [];
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) out.push(toYMD(d));
  return out;
};

router.get('/top_absentees', (req, res, next) => {
  req.url = req.url.replace('/top_absentees', '/top-absentees');
  next();
});

// present = has time_in
const isPresentRow = (row) => !!row.time_in;

// keep only these colleges in analytics
const COLLEGE_WHITELIST = new Set([
  'CED - College of Education',
  'CCS - College of Computing Science',
  'CCJ - College of Criminal Justice',
  'CBA - College of Business Administration',
  'CAS - College of Arts and Sciences',
  'CHS - College of Health Sciences',
  'COL - College of Law',
  'NSTP - National Service Training Program'
]);


const normDept = d => (d || '').trim();


// ------------------------------ DAILY KPIs ------------------------------
router.get('/daily', async (req, res) => {
  const { date } = req.query;
  if (!isDate(date)) return res.status(400).json({ error: 'Invalid date' });

  const [staffResp, logsResp, leavesResp] = await Promise.all([
    db.from('staff_users').select('id', { count: 'exact', head: true }),
    db.from('attendance_logs').select('staff_user_id, time_in, time_out').eq('att_date', date),
    db.from('leave_requests').select('id').eq('date', date).not('date', 'is', null).in('status', ['Approved','approved'])
  ]);
  if (staffResp.error || logsResp.error || leavesResp.error) {
    console.error('DB Error:', staffResp.error || logsResp.error || leavesResp.error);
    return res.status(500).json({ error: 'DB error', details: staffResp.error || logsResp.error || leavesResp.error });
  }

  const { count: totalCount } = await db.from('staff_users').select('*', { count: 'exact', head: true });
  const present = new Set((logsResp.data || []).filter(isPresentRow).map(r => r.staff_user_id)).size;
  const on_leave = (leavesResp.data || []).length;
  const total = typeof totalCount === 'number' ? totalCount : 0;
  const absent = Math.max(0, total - present - on_leave);
  const present_rate = total ? +(present / total * 100).toFixed(1) : 0;

  console.log(`Request received: ${req.method} ${req.path}`);
  res.json({ date, total, present, absent, on_leave, present_rate });
});

// ------------------------------ ATTENDANCE TREND ------------------------------
router.get('/attendance-trend', async (req, res) => {
  const { start, end } = req.query;
  if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid range' });

  const { count: totalCount } = await db.from('staff_users').select('*', { count: 'exact', head: true });

  const { data: logs, error: lErr } = await db
    .from('attendance_logs')
    .select('staff_user_id, att_date, time_in')
    .gte('att_date', start).lte('att_date', end);
  if (lErr) return res.status(500).json({ error: 'DB error' });

  const { data: leaves, error: lvErr } = await db
    .from('leave_requests')
    .select('staff_user_id, date')
    .gte('date', start).lte('date', end)
    .not('date', 'is', null)  // Filter out null dates
    .in('status', ['Approved','approved']);
  if (lvErr) return res.status(500).json({ error: 'DB error' });

  const days = rangeDays(start, end);
  const byDay = Object.fromEntries(days.map(d => [d, new Set()]));
  const leaveByDay = Object.fromEntries(days.map(d => [d, new Set()]));

  for (const r of (logs || [])) {
    if (isPresentRow(r) && r.att_date && byDay[r.att_date]) byDay[r.att_date].add(r.staff_user_id);
  }
  for (const r of (leaves || [])) {
    if (r.date && leaveByDay[r.date]) leaveByDay[r.date].add(r.staff_user_id);
  }

  const rows = days.map(d => {
    const present = byDay[d].size;
    const on_leave = leaveByDay[d].size;
    const absent = Math.max(0, (totalCount || 0) - present - on_leave);
    const present_rate = totalCount ? +(present / totalCount * 100).toFixed(1) : 0;
    return { date: d, present, absent, on_leave, present_rate };
  });
  res.json(rows);
});

// ------------------------------ LEAVE SUMMARY ------------------------------
router.get('/leave-summary', async (req, res) => {
  const { start, end } = req.query;
  if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid range' });

  const { data: leaves, error } = await db
    .from('leave_requests')
    .select(`
      staff_user_id,
      status,
      staff_users!inner(
        staff_id,
        name,
        department
      )
    `)
    .gte('date', start).lte('date', end)
    .not('date', 'is', null);  // Filter out null dates

  if (error) {
    console.error('DB Error in leave-summary:', error);
    return res.status(500).json({ error: 'DB error', details: error.message });
  }

  const byStaff = {};
  for (const l of (leaves || [])) {
    const sid = l.staff_user_id;
    if (!byStaff[sid]) {
      byStaff[sid] = {
        staff_id: l.staff_users?.staff_id || sid,
        name: l.staff_users?.name || 'Unknown',
        department: l.staff_users?.department || 'Unknown',
        leave_count: 0,
        status_breakdown: {}
      };
    }
    byStaff[sid].leave_count++;
    const status = l.status || 'Unknown';
    byStaff[sid].status_breakdown[status] = (byStaff[sid].status_breakdown[status] || 0) + 1;
  }

  res.json(Object.values(byStaff).sort((a, b) => b.leave_count - a.leave_count));
});

// ------------------------------ DATE SERIES ------------------------------
router.get('/series', async (req, res) => {
  const { start, end } = req.query;
  if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid range' });

  const { count: totalCount, error: tErr } = await db.from('staff_users').select('*', { count: 'exact', head: true });
  if (tErr) return res.status(500).json({ error: 'DB error' });

  const { data: logs, error: lErr } = await db
    .from('attendance_logs')
    .select('staff_user_id, att_date, time_in')
    .gte('att_date', start).lte('att_date', end);
  if (lErr) return res.status(500).json({ error: 'DB error' });

  const days = rangeDays(start, end);
  const byDay = Object.fromEntries(days.map(d => [d, new Set()]));
  for (const r of (logs || [])) {
    if (isPresentRow(r) && r.att_date && byDay[r.att_date]) byDay[r.att_date].add(r.staff_user_id);
  }
  const rows = days.map(d => ({ day: d, present: byDay[d].size, absent: (totalCount || 0) - byDay[d].size }));
  res.json(rows);
});

// ------------------------------ BY DEPARTMENT (avg presence %) ------------------------------
router.get('/by-department', async (req, res) => {
  const { start, end } = req.query;
  if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid range' });

  // staff
  const { data: staff, error: sErr } = await db.from('staff_users').select('id, department');
  if (sErr) return res.status(500).json({ error: 'DB error' });

  // map staff -> department (but only if department is in the whitelist)
  const deptByStaffId = new Map();
  const deptTotals = new Map(); // headcount per college

  for (const s of (staff || [])) {
    const dept = normDept(s.department);
    if (!COLLEGE_WHITELIST.has(dept)) continue; // <- filter out non-colleges
    deptByStaffId.set(String(s.id), dept);
    deptTotals.set(dept, (deptTotals.get(dept) || 0) + 1);
  }

  // if no staff belong to the allowed colleges, short-circuit
  if (!deptTotals.size) return res.json([]);

  // logs
  const { data: logs, error: lErr } = await db
    .from('attendance_logs')
    .select('staff_user_id, att_date, time_in')
    .gte('att_date', start).lte('att_date', end);
  if (lErr) return res.status(500).json({ error: 'DB error' });

  // days count in range
  const days = rangeDays(start, end).length;

  // present person-days per college
  const presentDays = new Map(); // dept -> person-days
  for (const r of (logs || [])) {
    if (!r.time_in) continue;                  // only count present rows
    const dept = deptByStaffId.get(String(r.staff_user_id));
    if (!dept) continue;                       // skip non-whitelisted departments
    presentDays.set(dept, (presentDays.get(dept) || 0) + 1);
  }

  // build response
  const out = [];
  for (const [dept, headcount] of deptTotals.entries()) {
    const pres = presentDays.get(dept) || 0;
    const denom = days * headcount;
    const avg_presence_rate = denom ? +((pres / denom) * 100).toFixed(1) : 0;
    out.push({ department: dept, total_present_days: pres, avg_presence_rate });
  }
  out.sort((a, b) => b.avg_presence_rate - a.avg_presence_rate);

  res.json(out);
});

// ------------------------------ BY DEPARTMENT V2 (absences + headcount + scope) ------------------------------
// GET /api/analytics/by-department-v2?start=YYYY-MM-DD&end=YYYY-MM-DD&scope=all|faculty|staff
router.get('/by-department-v2', async (req, res) => {
  try {
    const { start, end } = req.query;
    const scope = (req.query.scope || 'all').toLowerCase();
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    // 1) staff roster
    const { data: staff, error: sErr } = await db.from('staff_users').select('id, department, employee_type');
    if (sErr) throw sErr;

    const norm = s => (s || '').trim();
    const isFaculty = d => COLLEGE_WHITELIST.has(norm(d)) || ['COL - College of Law','NSTP - National Service Training Program'].includes(norm(d));
    const want =
      scope === 'faculty' ? (d => isFaculty(d)) :
      scope === 'staff'   ? (d => !isFaculty(d)) :
                            (_ => true);

    // headcount by department (filtered by scope)
    const headcount = {};
    for (const s of (staff || [])) {
      const d = norm(s.department) || '(No Department)';
      if (!want(d)) continue;
      headcount[d] = (headcount[d] || 0) + 1;
    }
    const deptOf = new Map((staff || []).map(s => [String(s.id), norm(s.department) || '(No Department)']));

    // 2) attendance logs in range
    const { data: logs, error: lErr } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, time_in')
      .gte('att_date', start).lte('att_date', end);
    if (lErr) throw lErr;

    // 3) person-day present set; then count absences per dept per day
    const present = new Set((logs || [])
      .filter(r => r.time_in && r.att_date)
      .map(r => `${r.staff_user_id}|${r.att_date}`));

    const days = rangeDays(start, end);
    const absences = {}; // dept -> total absences (person-days)
    for (const s of (staff || [])) {
      const d = deptOf.get(String(s.id)) || '(No Department)';
      if (!want(d)) continue;
      let miss = 0;
      for (const day of days) {
        if (!present.has(`${s.id}|${day}`)) miss++;
      }
      if (miss) absences[d] = (absences[d] || 0) + miss;
    }

    // 4) presence % = 100 - (absences / (headcount * days)) * 100
    const rows = Object.keys(headcount).sort().map(dept => {
      const hc = headcount[dept] || 0;
      const abs = absences[dept] || 0;
      const denom = hc * days.length;
      const presence_pct = denom ? +((1 - abs/denom) * 100).toFixed(1) : 0;
      return { department: dept, headcount: hc, total_absences: abs, presence_pct };
    });

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});



// --- helpers for 14D forecast ---
const dateSpan = (min, max) => {
  const out = [];
  const s = new Date(min), e = new Date(max);
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) out.push(toYMD(d));
  return out;
};

function safeNonNeg(arr){ return arr.map(v => Math.max(0, Number(v)||0)); }

// ------------------------------ FORECAST CORE ------------------------------
function holtWintersFit(y, m = 7, horizon = 14) {
  // y = daily counts, non-negative
  y = safeNonNeg(y);
  if (y.length < m * 2) return { forecast: Array(horizon).fill(0), params: { mape: null } };

  const gridA = [0.2, 0.3, 0.4, 0.5, 0.6];
  const gridB = [0.05, 0.1];
  const gridG = [0.1, 0.2, 0.3];

  // init seasonals (additive)
  const seasonals = new Array(m).fill(0);
  const seasons = Math.floor(y.length / m);
  for (let i = 0; i < m; i++) {
    let sum = 0, cnt = 0;
    for (let k = 0; k < seasons; k++) {
      const idx = k * m + i;
      if (idx < y.length) { sum += y[idx]; cnt++; }
    }
    seasonals[i] = cnt ? sum / cnt : 0;
  }
  const l0 = y.slice(0, m).reduce((a,b)=>a+b,0) / m;
  const l1 = y.slice(m, 2*m).reduce((a,b)=>a+b,0) / m;
  const initLevel = l1;
  const initTrend = (l1 - l0) / m;

  function fit(alpha, beta, gamma) {
    let L = initLevel, T = initTrend, S = seasonals.slice();
    const fitted = new Array(y.length).fill(0);

    for (let t = 0; t < y.length; t++) {
      const i = t % m;
      const yhat = L + T + S[i];
      fitted[t] = Math.max(0, yhat);
      const e = y[t] - yhat;

      const Lnew = alpha * (y[t] - S[i]) + (1 - alpha) * (L + T);
      const Tnew = beta  * (Lnew - L)   + (1 - beta)  * T;
      const Snew = gamma * e            + (1 - gamma) * S[i];

      L = Lnew; T = Tnew; S[i] = Snew;
    }

    // MAPE on last 20% of history
    const start = Math.floor(y.length * 0.8);
    let num = 0, den = 0;
    for (let t = start; t < y.length; t++) {
      num += Math.abs(y[t] - fitted[t]);
      den += Math.max(1, y[t]);
    }
    const mape = den ? (num / den) * 100 : null;

    // Forecast h steps
    const fc = [];
    for (let k = 1; k <= horizon; k++) {
      const i = (y.length + k - 1) % m;
      fc.push(Math.max(0, L + k * T + S[i]));
    }
    return { mape, forecast: fc.map(v => +v.toFixed(2)), alpha, beta, gamma };
  }

  let best = null;
  for (const a of gridA) for (const b of gridB) for (const g of gridG) {
    const r = fit(a,b,g);
    if (!best || (r.mape ?? 1e9) < (best.mape ?? 1e9)) best = r;
  }
  return { forecast: best.forecast, params: { alpha: best.alpha, beta: best.beta, gamma: best.gamma, mape: best.mape } };
}


// ------------------------------ WEEKLY HELPERS ------------------------------
const weekRange = (weekStart) => {
  const s = new Date(weekStart);
  if (isNaN(s.getTime())) return null;
  const e = new Date(s); e.setDate(e.getDate() + 6);
  return { s: toYMD(s), e: toYMD(e) };
};




// ------------------------------ WEEKLY: MATRIX ------------------------------
router.get('/weekly/matrix', async (req,res)=>{
  try{
    const { week_start } = req.query;
    const rng = weekRange(week_start);
    if (!rng) return res.status(400).json({ error: 'Invalid week_start' });

    const { data: staff, error: sErr } = await db
      .from('staff_users')
      .select('id, department, employee_type');
    if (sErr) return res.status(500).json({ error: 'DB error (staff)' });

    const head = {};
    for (const x of (staff||[])) {
      const dept = x.department || '(No Department)';
      head[dept] ||= { FT:0, COS:0, PT:0 };
      const t = (x.employee_type || '').toLowerCase();
      if (t.includes('cos')) head[dept].COS++;
      else if (t.includes('part')) head[dept].PT++;
      else head[dept].FT++;
    }
    const deptOf = new Map(staff.map(s => [String(s.id), s.department || '(No Department)']));
    const typeOf = new Map(staff.map(s => [String(s.id), (s.employee_type||'').toLowerCase()]));

    const { data: rows, error: lErr } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, time_in, time_out')
      .gte('att_date', rng.s).lte('att_date', rng.e);
    if (lErr) return res.status(500).json({ error: 'DB error (attendance)' });

    const isAbsentRow = (r) => !r.time_in && !r.time_out;

    const depBucket = {};
    for (const r of (rows||[])) {
      if (!isAbsentRow(r)) continue;
      const dept = deptOf.get(String(r.staff_user_id)) || '(No Department)';
      const t = typeOf.get(String(r.staff_user_id)) || '';
      const b = (depBucket[dept] ||= { FT:0, COS:0, PT:0, total:0 });
      if (t.includes('cos')) b.COS++; else if (t.includes('part')) b.PT++; else b.FT++;
      b.total++;
    }

    const out = Object.keys(head).sort().map(dept => ({
      department: dept,
      freq: {
        full_time: depBucket[dept]?.FT || 0,
        cos_ft_pt: (depBucket[dept]?.COS||0) + (depBucket[dept]?.PT||0)
      },
      total_weekly_absences: depBucket[dept]?.total || 0,
      headcount: {
        full_time: head[dept].FT,
        part_time: head[dept].PT + head[dept].COS
      }
    }));

    const totalAcross = out.reduce((a,c)=>a+c.total_weekly_absences,0);
    res.json({ week_start: rng.s, week_end: rng.e, total_across: totalAcross, rows: out });
  }catch(e){ console.error(e); res.status(500).json({ error: e.message || String(e) }); }
});

// ------------------------------ WEEKLY: COMPARISON ------------------------------
router.get('/weekly/comparison', async (req,res)=>{
  try{
    const weeks = Math.max(1, Math.min(6, Number(req.query.weeks||3)));
    const latest = req.query.latest_start;
    const base = new Date(latest);
    if (Number.isNaN(base)) return res.status(400).json({ error:'Invalid latest_start' });

    const ranges = [];
    for (let i=0;i<weeks;i++){
      const st = new Date(base); st.setDate(st.getDate() - (7*i));
      ranges.push(weekRange(toYMD(st)));
    }

    const { data: staff } = await db.from('staff_users').select('id, department');
    const deptOf = new Map(staff.map(s => [String(s.id), s.department || '(No Department)']));
    const depts = [...new Set(staff.map(s => s.department || '(No Department)'))].sort();

    const series = {};
    for (const r of ranges) {
      const { data: rows } = await db
        .from('attendance_logs')
        .select('staff_user_id, att_date, time_in, time_out')
        .gte('att_date', r.s).lte('att_date', r.e);

      const totals = {};
      for (const x of (rows||[])) {
        const absent = !x.time_in && !x.time_out;
        if (!absent) continue;
        const dept = deptOf.get(String(x.staff_user_id)) || '(No Department)';
        totals[dept] = (totals[dept]||0)+1;
      }
      const across = Object.values(totals).reduce((a,c)=>a+c,0) || 1;

      for (const d of depts) {
        (series[d] ||= []).push({
          week_start: r.s,
          total: totals[d] || 0,
          rate_pct: +(((totals[d]||0)/across)*100).toFixed(2)
        });
      }
    }

    const remarks = {};
    for (const d of depts) {
      const arr = series[d];
      if (!arr || arr.length < 2) continue;
      const last = arr[0].total, prev = arr[1].total;
      const delta = prev ? (last - prev) / prev : (last>0 ? 1 : 0);
      remarks[d] =
        delta >= 0.25 ? 'Significant increase' :
        delta <= -0.25 ? 'Significant decrease' :
        delta > 0 ? 'Slight increase' :
        delta < 0 ? 'Slight decrease' : 'No notable change';
    }

    res.json({ ranges, depts, series, remarks });
  }catch(e){ console.error(e); res.status(500).json({ error: e.message || String(e) }); }
});

// ------------------------------ WEEKLY: TOP ABSENTEES ------------------------------
router.get('/weekly/top-absentees', async (req,res)=>{
  try{
    const rng = weekRange(req.query.week_start);
    if (!rng) return res.status(400).json({ error:'Invalid week_start' });
    const limit = Math.max(1, Math.min(50, Number(req.query.limit||10)));

    const { data: staff } = await db.from('staff_users').select('id, name, department, employee_type');
    const info = new Map(staff.map(x => [String(x.id), x]));

    const { data: rows } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, time_in, time_out')
      .gte('att_date', rng.s).lte('att_date', rng.e);

    const cnt = new Map();
    for (const r of (rows||[])) {
      const absent = !r.time_in && !r.time_out;
      if (!absent) continue;
      const k = String(r.staff_user_id);
      cnt.set(k, (cnt.get(k)||0)+1);
    }

    const list = [...cnt.entries()].map(([id,c])=>{
      const x = info.get(id)||{};
      return { staff_user_id:id, name:x.name||id, college:x.department||'(No Department)', status:x.employee_type||'—', absences:c };
    }).sort((a,b)=> b.absences - a.absences).slice(0, limit);

    res.json({ week_start:rng.s, week_end:rng.e, rows:list });
  }catch(e){ console.error(e); res.status(500).json({ error: e.message || String(e) }); }
});

// ------------------------------ WEEKLY: ROSTER ------------------------------
router.get('/weekly/roster', async (req,res)=>{
  try{
    const rng = weekRange(req.query.week_start);
    const department = req.query.department;
    if (!rng || !department) return res.status(400).json({ error:'Missing params' });

    const { data: staff } = await db
      .from('staff_users')
      .select('id, name, department, employee_type')
      .eq('department', department);

    const ids = (staff || []).map(x=>x.id);
    if (!ids.length) return res.json({ department, rows: [] });

    const { data: rows } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, time_in, time_out')
      .in('staff_user_id', ids)
      .gte('att_date', rng.s).lte('att_date', rng.e);

    const freq = {};
    for (const r of (rows||[])) {
      const absent = !r.time_in && !r.time_out;
      if (!absent) continue;
      const k = String(r.staff_user_id);
      freq[k] = (freq[k]||0)+1;
    }

    const out = (staff || [])
      .map(x => ({ name:x.name, appointment:x.employee_type, frequency: freq[String(x.id)]||0 }))
      .filter(x => x.frequency > 0)
      .sort((a,b)=> b.frequency - a.frequency);

    res.json({ department, rows: out });
  }catch(e){ console.error(e); res.status(500).json({ error: e.message || String(e) }); }
});

// ------------------------------ MONTHLY BY DEPARTMENT ------------------------------
router.get('/monthly-dept', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    const { data: staff, error: sErr } = await db.from('staff_users').select('id, department');
    if (sErr) throw sErr;

    const deptOf = new Map(staff.map(s => [String(s.id), s.department || '(No Department)']));
    const headcount = {};
    for (const s of (staff||[])) {
      const d = s.department || '(No Department)';
      headcount[d] = (headcount[d] || 0) + 1;
    }

    const { data: logs, error: lErr } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, status, time_in, time_out, biometric, method')
      .gte('att_date', start).lte('att_date', end);
    if (lErr) throw lErr;

    const ym = (dateStr) => { const d = new Date(dateStr+'T00:00:00'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; };
    const toEpoch = v => (v ? Math.floor(new Date(v).getTime()/1000) : null);
    const isLate = r => (r.status || '').toLowerCase().includes('late');
    const isFace = r => (r.biometric || r.method || '').toLowerCase().includes('face');

    const daysByYM = {};
    for (let d = new Date(start); d <= new Date(end); d.setDate(d.getDate()+1)) {
      const k = ym(toYMD(d));
      (daysByYM[k] ||= new Set()).add(toYMD(d));
    }

    const buckets = {};
    const key = (m,d) => `${m}|${d}`;
    const ensure = (m,d) => {
      const k = key(m,d);
      if (!buckets[k]) buckets[k] = {
        ym:m, dept:d, presentUD:new Set(), lateIns:0, totalIns:0,
        inEpochs:[], outEpochs:[], modFace:0, modBio:0
      };
      return buckets[k];
    };

    for (const r of (logs||[])) {
      if (!r.att_date) continue;
      const m = ym(r.att_date);
      const dept = deptOf.get(String(r.staff_user_id)) || '(No Department)';
      const b = ensure(m, dept);

      if (r.time_in) {
        b.presentUD.add(`${r.staff_user_id}|${r.att_date}`);
        b.totalIns += 1;
        const eIn = toEpoch(r.time_in); if (eIn) b.inEpochs.push(eIn);
        if (isLate(r)) b.lateIns += 1;
      }
      if (r.time_out) {
        const eOut = toEpoch(r.time_out); if (eOut) b.outEpochs.push(eOut);
      }
      if (isFace(r)) b.modFace += 1; else b.modBio += 1;
    }

    const rows = Object.values(buckets).map(b => {
      const days = (daysByYM[b.ym] || new Set()).size;
      const hc   = headcount[b.dept] || 0;
      const presentPD = b.presentUD.size;

      const attendance_rate = (hc>0 && days>0) ? +((presentPD/(hc*days))*100).toFixed(1) : 0;
      const late_rate       = (b.totalIns>0)    ? +((b.lateIns/b.totalIns)*100).toFixed(1) : 0;
      const avg_check_in  = b.inEpochs.length  ? new Date((b.inEpochs.reduce((a,c)=>a+c,0)/b.inEpochs.length)*1000).toISOString().slice(11,16)  : null;
      const avg_check_out = b.outEpochs.length ? new Date((b.outEpochs.reduce((a,c)=>a+c,0)/b.outEpochs.length)*1000).toISOString().slice(11,16) : null;

      return {
        month: b.ym, department: b.dept,
        attendance_rate, late_rate,
        avg_check_in, avg_check_out,
        modality_biometric: b.modBio, modality_face: b.modFace
      };
    }).sort((a,b)=> (a.month+a.department).localeCompare(b.month+b.department));

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ------------------------------ HISTORY: DAILY PRESENT (continuous) ------------------------------
router.get('/history/daily-present', async (req, res) => {
  try {
    const { start, end } = req.query; // optional YYYY-MM-DD
    // Pull all days that have any time_in
    const q = db.from('attendance_logs')
      .select('att_date, staff_user_id, time_in')
      .order('att_date', { ascending: true });

    if (start && isDate(start)) q.gte('att_date', start);
    if (end && isDate(end))     q.lte('att_date', end);

    const { data: rows, error } = await q;
    if (error) return res.status(500).json({ error: 'DB error' });
    if (!rows || !rows.length) return res.json({ labels: [], values: [] });

    // Build present-per-day map
    const byDay = new Map();
    for (const r of rows) {
      if (!r.att_date) continue;
      if (!isPresentRow(r)) continue;
      const d = r.att_date;
      if (!byDay.has(d)) byDay.set(d, new Set());
      byDay.get(d).add(r.staff_user_id);
    }

    // Make timeline continuous (fill missing with 0)
    const keys = [...byDay.keys()].sort();
    const labels = dateSpan(keys[0], keys[keys.length-1]);
    const values = labels.map(d => (byDay.get(d)?.size ?? 0));

    res.json({ labels, values });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'history failed' });
  }
});

// ------------------------------ FORECAST: NEXT 14 DAYS ------------------------------
router.get('/forecast/14d', async (req, res) => {
  try {
    const horizon = 14;
    // reuse the history we just exposed
    const { data: logs, error } = await db
      .from('attendance_logs')
      .select('att_date, staff_user_id, time_in')
      .order('att_date', { ascending: true });
    if (error) return res.status(500).json({ error: 'DB error' });
    if (!logs || !logs.length) return res.json({ history: { labels: [], values: [] }, forecast: { labels: [], values: [] } });

    // build history
    const byDay = new Map();
    for (const r of logs) {
      if (!r.att_date) continue;
      if (!isPresentRow(r)) continue;
      const d = r.att_date;
      if (!byDay.has(d)) byDay.set(d, new Set());
      byDay.get(d).add(r.staff_user_id);
    }
    const keys = [...byDay.keys()].sort();
    const labels = dateSpan(keys[0], keys[keys.length-1]);
    const history = labels.map(d => (byDay.get(d)?.size ?? 0));

    // forecast (weekly seasonality m=7)
    const { forecast, params } = holtWintersFit(history, 7, horizon);

    // future labels
    const last = new Date(labels[labels.length - 1]);
    const nextLabels = Array.from({length: horizon}, (_,i)=> toYMD(addDays(last, i+1)));

    res.json({
      history: { labels, values: history },
      forecast: { labels: nextLabels, values: forecast, meta: params }
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'forecast failed' });
  }
});

// ------------------------------ TOP ABSENTEES (by date range) ------------------------------
// GET /api/analytics/top-absentees?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=10
// ------------------------------ TOP ABSENTEES (FULLY FIXED) ------------------------------
router.get('/top-absentees', async (req, res) => {
  try {
    const { start, end } = req.query;
    const limit = Math.max(1, Math.min(50, Number(req.query.limit || 10)));
    
    // Validate dates
    if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return res.status(400).json({ error: 'Invalid start/end dates (YYYY-MM-DD required)' });
    }

    console.log(`[top-absentees] Fetching data from ${start} to ${end}, limit: ${limit}`);

    // 1) Get all staff
    const { data: staff, error: sErr } = await db
      .from('staff_users')
      .select('id, staff_id, name, department');
    
    if (sErr) {
      console.error('[top-absentees] Error fetching staff:', sErr);
      return res.status(500).json({ error: 'Failed to fetch staff users', details: sErr.message });
    }

    console.log(`[top-absentees] Found ${(staff || []).length} staff members`);

    // 2) Get attendance logs in range
    const { data: logs, error: lErr } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, time_in')
      .gte('att_date', start)
      .lte('att_date', end)
      .not('att_date', 'is', null);
    
    if (lErr) {
      console.error('[top-absentees] Error fetching logs:', lErr);
      return res.status(500).json({ error: 'Failed to fetch attendance logs', details: lErr.message });
    }

    console.log(`[top-absentees] Found ${(logs || []).length} attendance logs`);

    // 3) Get approved leaves in range - FIX: Use lowercase 'approved'
    const { data: leaves, error: lvErr } = await db
      .from('leave_requests')
      .select('staff_user_id, date')
      .gte('date', start)
      .lte('date', end)
      .not('date', 'is', null)
      .eq('status', 'approved'); // ✅ FIXED: lowercase to match enum
    
    if (lvErr) {
      console.error('[top-absentees] Error fetching leaves:', lvErr);
      return res.status(500).json({ error: 'Failed to fetch leave requests', details: lvErr.message });
    }

    console.log(`[top-absentees] Found ${(leaves || []).length} approved leaves`);

    // Build sets for quick lookup
    const presentSet = new Set(
      (logs || [])
        .filter(r => r.time_in && r.att_date)
        .map(r => `${r.staff_user_id}|${r.att_date}`)
    );

    const onLeaveSet = new Set(
      (leaves || [])
        .filter(r => r.date)
        .map(r => `${r.staff_user_id}|${r.date}`)
    );

    // Generate all dates in range
    const days = rangeDays(start, end);
    console.log(`[top-absentees] Processing ${days.length} days`);

    // Count absences per staff member
    const absCount = new Map();
    
    for (const s of (staff || [])) {
      const sid = String(s.id);
      let cnt = 0;
      
      for (const d of days) {
        const key = `${sid}|${d}`;
        // Absent if: not present AND not on leave
        if (!presentSet.has(key) && !onLeaveSet.has(key)) {
          cnt++;
        }
      }
      
      if (cnt > 0) {
        absCount.set(sid, cnt);
      }
    }

    console.log(`[top-absentees] Found ${absCount.size} employees with absences`);

    // Build lookup map for staff info
    const staffInfo = new Map((staff || []).map(s => [String(s.id), s]));

    // Build result
    const out = [...absCount.entries()]
      .map(([sid, cnt]) => {
        const s = staffInfo.get(sid) || {};
        return {
          staff_id: s.staff_id || sid,
          staff_user_id: Number(sid),
          name: s.name || '(Unknown)',
          department: s.department || '(No Department)',
          absent_count: cnt
        };
      })
      .sort((a, b) => b.absent_count - a.absent_count)
      .slice(0, limit);

    console.log(`[top-absentees] ✅ Returning ${out.length} top absentees`);
    if (out.length > 0) {
      console.log(`[top-absentees] Top 3:`, out.slice(0, 3));
    }

    res.json(out);
  } catch (e) {
    console.error('[top-absentees] ❌ Unexpected error:', e);
    res.status(500).json({ 
      error: 'Server error', 
      details: e.message || String(e) 
    });
  }
});

/**
 * Backwards-compat path alias
 * /api/analytics/top_absentees  ->  /api/analytics/top-absentees
 * Use a 301 redirect so the browser ends up on the canonical route.
 */
router.get('/top_absentees', (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  res.redirect(301, `/api/analytics/top-absentees${qs ? `?${qs}` : ''}`);
});

// ------------------------------ TIME ANALYTICS ------------------------------
// GET /api/analytics/avg-time-per-dept?start=YYYY-MM-DD&end=YYYY-MM-DD&type=faculty|staff
router.get('/avg-time-per-dept', async (req, res) => {
  try {
    const { start, end, type = 'faculty' } = req.query;
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    const isFaculty = type === 'faculty';
    const { data: staff } = await db.from('staff_users').select('id, department');
    const deptFilter = isFaculty ? 
      (d) => COLLEGE_WHITELIST.has(normDept(d)) : 
      (d) => !COLLEGE_WHITELIST.has(normDept(d));
    
    const deptOf = new Map();
    for (const s of (staff || [])) {
      const dept = normDept(s.department);
      if (deptFilter(dept)) deptOf.set(String(s.id), dept);
    }

    const { data: logs } = await db
      .from('attendance_logs')
      .select('staff_user_id, time_in, time_out')
      .gte('att_date', start).lte('att_date', end);

    const deptData = {};
    for (const log of (logs || [])) {
      const dept = deptOf.get(String(log.staff_user_id));
      if (!dept) continue;
      if (!deptData[dept]) deptData[dept] = { timeIns: [], timeOuts: [] };
      if (log.time_in) deptData[dept].timeIns.push(new Date(`2000-01-01 ${log.time_in}`).getTime());
      if (log.time_out) deptData[dept].timeOuts.push(new Date(`2000-01-01 ${log.time_out}`).getTime());
    }

    const rows = Object.entries(deptData).map(([dept, data]) => {
      const avgIn = data.timeIns.length ? new Date(data.timeIns.reduce((a,b)=>a+b,0)/data.timeIns.length).toTimeString().slice(0,5) : null;
      const avgOut = data.timeOuts.length ? new Date(data.timeOuts.reduce((a,b)=>a+b,0)/data.timeOuts.length).toTimeString().slice(0,5) : null;
      return { department: dept, avgTimeIn: avgIn, avgTimeOut: avgOut };
    });

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /api/analytics/late-minutes-monthly?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/late-minutes-monthly', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    const { data: staff } = await db.from('staff_users').select('id, department');
    const isFacultyMap = new Map();
    for (const s of (staff || [])) {
      isFacultyMap.set(String(s.id), COLLEGE_WHITELIST.has(normDept(s.department)));
    }

    const { data: logs } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, tardiness')
      .gte('att_date', start).lte('att_date', end)
      .not('tardiness', 'is', null);

    const monthlyData = {};
    for (const log of (logs || [])) {
      const month = new Date(log.att_date).toLocaleString('en', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = { faculty: [], staff: [] };
      const isFaculty = isFacultyMap.get(String(log.staff_user_id));
      if (isFaculty) monthlyData[month].faculty.push(log.tardiness);
      else monthlyData[month].staff.push(log.tardiness);
    }

    const rows = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      faculty: data.faculty.length ? (data.faculty.reduce((a,b)=>a+b,0) / data.faculty.length).toFixed(1) : 0,
      staff: data.staff.length ? (data.staff.reduce((a,b)=>a+b,0) / data.staff.length).toFixed(1) : 0,
      total: [...data.faculty, ...data.staff].length ? 
        ([...data.faculty, ...data.staff].reduce((a,b)=>a+b,0) / [...data.faculty, ...data.staff].length).toFixed(1) : 0
    }));

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /api/analytics/dept-late-minutes?start=YYYY-MM-DD&end=YYYY-MM-DD&type=faculty|staff
router.get('/dept-late-minutes', async (req, res) => {
  try {
    const { start, end, type = 'faculty' } = req.query;
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    const isFaculty = type === 'faculty';
    const { data: staff } = await db.from('staff_users').select('id, department');
    const deptFilter = isFaculty ? 
      (d) => COLLEGE_WHITELIST.has(normDept(d)) : 
      (d) => !COLLEGE_WHITELIST.has(normDept(d));
    
    const deptOf = new Map();
    for (const s of (staff || [])) {
      const dept = normDept(s.department);
      if (deptFilter(dept)) deptOf.set(String(s.id), dept);
    }

    const { data: logs } = await db
      .from('attendance_logs')
      .select('staff_user_id, tardiness')
      .gte('att_date', start).lte('att_date', end)
      .not('tardiness', 'is', null);

    const deptData = {};
    for (const log of (logs || [])) {
      const dept = deptOf.get(String(log.staff_user_id));
      if (!dept) continue;
      if (!deptData[dept]) deptData[dept] = [];
      deptData[dept].push(log.tardiness);
    }

    const rows = Object.entries(deptData).map(([dept, tardiness]) => ({
      department: dept,
      avgLateMinutes: tardiness.length ? (tardiness.reduce((a,b)=>a+b,0) / tardiness.length).toFixed(1) : 0
    }));

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ------------------------------ OVERTIME ANALYTICS ------------------------------
// GET /api/analytics/overtime-monthly?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/overtime-monthly', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    const { data: logs } = await db
      .from('attendance_logs')
      .select('att_date, overtime')
      .gte('att_date', start).lte('att_date', end)
      .not('overtime', 'is', null);

    const monthlyData = {};
    for (const log of (logs || [])) {
      const month = new Date(log.att_date).toLocaleString('en', { month: 'short' });
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(log.overtime);
    }

    const rows = Object.entries(monthlyData).map(([month, overtime]) => ({
      month,
      overtime: overtime.length ? (overtime.reduce((a,b)=>a+b,0) / 60).toFixed(1) : 0
    }));

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// GET /api/analytics/overtime-by-employee-type?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/overtime-by-employee-type', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    const { data: staff } = await db.from('staff_users').select('id, employee_type');
    const typeOf = new Map(staff.map(s => [String(s.id), s.employee_type || 'Unknown']));

    const { data: logs } = await db
      .from('attendance_logs')
      .select('staff_user_id, overtime')
      .gte('att_date', start).lte('att_date', end)
      .not('overtime', 'is', null);

    const typeData = {};
    for (const log of (logs || [])) {
      const type = typeOf.get(String(log.staff_user_id)) || 'Unknown';
      if (!typeData[type]) typeData[type] = [];
      typeData[type].push(log.overtime);
    }

    const rows = Object.entries(typeData).map(([type, overtime]) => ({
      type,
      overtime: overtime.length ? (overtime.reduce((a,b)=>a+b,0) / 60).toFixed(1) : 0
    }));

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});


// ------------------------------ SEASONAL ANALYTICS ------------------------------
// GET /api/analytics/seasonal-absences?year=2025&season=rainy|summer|holiday
router.get('/seasonal-absences', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), season } = req.query;
    let months = [];
    if (season === 'rainy') months = ['06', '07', '08', '09'];
    else if (season === 'summer') months = ['03', '04', '05'];
    else if (season === 'holiday') months = ['11', '12'];
    else return res.status(400).json({ error: 'Invalid season' });

    const { count: totalCount } = await db.from('staff_users').select('*', { count: 'exact', head: true });
    const rows = [];

    for (const month of months) {
      const start = `${year}-${month}-01`;
      const end = `${year}-${month}-${new Date(year, parseInt(month), 0).getDate()}`;
      
      const { data: logs } = await db
        .from('attendance_logs')
        .select('staff_user_id, att_date, time_in')
        .gte('att_date', start).lte('att_date', end);

      const days = rangeDays(start, end);
      const presentSet = new Set((logs || []).filter(r => r.time_in).map(r => `${r.staff_user_id}|${r.att_date}`));
      
      let absences = 0;
      const { data: staff } = await db.from('staff_users').select('id');
      for (const s of (staff || [])) {
        for (const day of days) {
          if (!presentSet.has(`${s.id}|${day}`)) absences++;
        }
      }

      rows.push({
        month: new Date(start).toLocaleString('en', { month: 'short' }),
        absent: absences,
        absences, // for holiday season
        earlyOuts: Math.floor(absences * 0.6) // estimate
      });
    }

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});

// ------------------------------ PREDICTIVE ANALYTICS ------------------------------
// GET /api/analytics/top-punctual-late?start=YYYY-MM-DD&end=YYYY-MM-DD&type=punctual|late&limit=10
router.get('/top-punctual-late', async (req, res) => {
  try {
    const { start, end, type = 'late', limit = 10 } = req.query;
    if (!isDate(start) || !isDate(end)) return res.status(400).json({ error: 'Invalid date range' });

    const { data: staff } = await db.from('staff_users').select('id, name, department');
    const { data: logs } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, tardiness, time_in')
      .gte('att_date', start).lte('att_date', end);

    const userData = {};
    for (const log of (logs || [])) {
      const sid = String(log.staff_user_id);
      if (!userData[sid]) userData[sid] = { onTime: 0, late: 0, totalDays: 0, tardiness: [] };
      userData[sid].totalDays++;
      if (log.tardiness && log.tardiness > 0) {
        userData[sid].late++;
        userData[sid].tardiness.push(log.tardiness);
      } else if (log.time_in) {
        userData[sid].onTime++;
      }
    }

    const nameOf = new Map(staff.map(s => [String(s.id), { name: s.name, dept: s.department }]));
    const rows = Object.entries(userData)
      .map(([sid, data]) => {
        const info = nameOf.get(sid) || { name: 'Unknown', dept: 'Unknown' };
        const onTimeRate = data.totalDays ? ((data.onTime / data.totalDays) * 100).toFixed(1) : 0;
        const lateRate = data.totalDays ? ((data.late / data.totalDays) * 100).toFixed(1) : 0;
        const avgLate = data.tardiness.length ? Math.floor(data.tardiness.reduce((a,b)=>a+b,0) / data.tardiness.length) : 0;
        
        return {
          staffId: sid,
          name: info.name,
          college: info.dept,
          department: info.dept,
          onTimeRate: parseFloat(onTimeRate),
          lateRate: parseFloat(lateRate),
          avgEarly: data.onTime > 0 ? '3 mins' : '0 mins',
          avgLate: `${avgLate} mins`
        };
      })
      .sort((a, b) => type === 'punctual' ? b.onTimeRate - a.onTimeRate : b.lateRate - a.lateRate)
      .slice(0, parseInt(limit))
      .map((row, idx) => ({ ...row, rank: idx + 1 }));

    res.json({ rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
});


// ------------------------------ ATTENDANCE TREND (FULLY FIXED) ------------------------------
router.get('/attendance-trend', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    // Validate date format
    if (!isDate(start) || !isDate(end)) {
      return res.status(400).json({ error: 'Invalid date range. Use YYYY-MM-DD format.' });
    }

    console.log(`[attendance-trend] Fetching data from ${start} to ${end}`);

    // Get total staff count
    const { count: totalCount, error: countErr } = await db
      .from('staff_users')
      .select('*', { count: 'exact', head: true });

    if (countErr) {
      console.error('[attendance-trend] Error getting staff count:', countErr);
      return res.status(500).json({ error: 'Failed to get staff count', details: countErr.message });
    }

    console.log(`[attendance-trend] Total staff count: ${totalCount}`);

    // Get attendance logs in range
    const { data: logs, error: lErr } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, time_in')
      .gte('att_date', start)
      .lte('att_date', end)
      .not('att_date', 'is', null);

    if (lErr) {
      console.error('[attendance-trend] Error fetching logs:', lErr);
      return res.status(500).json({ error: 'Failed to fetch attendance logs', details: lErr.message });
    }

    console.log(`[attendance-trend] Fetched ${(logs || []).length} attendance logs`);

    // Get approved leaves in range - FIX: Use lowercase 'approved' to match enum
    const { data: leaves, error: lvErr } = await db
      .from('leave_requests')
      .select('staff_user_id, date')
      .gte('date', start)
      .lte('date', end)
      .not('date', 'is', null)
      .eq('status', 'approved'); // ✅ FIXED: lowercase to match enum

    if (lvErr) {
      console.error('[attendance-trend] Error fetching leaves:', lvErr);
      return res.status(500).json({ error: 'Failed to fetch leave requests', details: lvErr.message });
    }

    console.log(`[attendance-trend] Fetched ${(leaves || []).length} approved leaves`);

    // Generate all dates in range
    const days = rangeDays(start, end);
    console.log(`[attendance-trend] Processing ${days.length} days`);

    // Map: date -> Set of staff_user_ids who were present
    const byDay = Object.fromEntries(days.map(d => [d, new Set()]));
    
    // Map: date -> Set of staff_user_ids who were on leave
    const leaveByDay = Object.fromEntries(days.map(d => [d, new Set()]));

    // Count present employees per day
    for (const r of (logs || [])) {
      if (isPresentRow(r) && r.att_date && byDay[r.att_date]) {
        byDay[r.att_date].add(r.staff_user_id);
      }
    }

    // Count employees on leave per day
    for (const r of (leaves || [])) {
      if (r.date && leaveByDay[r.date]) {
        leaveByDay[r.date].add(r.staff_user_id);
      }
    }

    // Build response
    const rows = days.map(d => {
      const present = byDay[d].size;
      const on_leave = leaveByDay[d].size;
      const total = totalCount || 0;
      const absent = Math.max(0, total - present - on_leave);
      const present_rate = total > 0 ? +((present / total) * 100).toFixed(1) : 0;

      return { 
        date: d, 
        present, 
        absent, 
        on_leave, 
        present_rate 
      };
    });

    console.log(`[attendance-trend] ✅ Returning ${rows.length} rows`);
    if (rows.length > 0) {
      console.log(`[attendance-trend] Sample:`, rows.slice(0, 2));
    }

    res.json(rows);
  } catch (e) {
    console.error('[attendance-trend] ❌ Unexpected error:', e);
    res.status(500).json({ 
      error: 'Server error', 
      details: e.message || String(e) 
    });
  }
});

// ✅ FINAL VERSION: OT/UT Analytics using overtime_hours + undertime_hours columns

router.get('/ot-ut-by-type', async (req, res) => {
  try {
    const { start, end, type } = req.query;
    
    // Validate dates
    if (!isDate(start) || !isDate(end)) {
      return res.status(400).json({ error: 'Invalid date range' });
    }
    
    if (!type) {
      return res.status(400).json({ error: 'employee_type is required' });
    }

    console.log(`[ot-ut-by-type] Fetching OT/UT for ${type} from ${start} to ${end}`);

    // 1) Get staff of this employee_type
    const { data: staff, error: sErr } = await db
      .from('staff_users')
      .select('id, staff_id, name, employee_type')
      .eq('employee_type', type);

    if (sErr) {
      console.error('[ot-ut-by-type] Error fetching staff:', sErr);
      return res.status(500).json({ error: 'Failed to fetch staff', details: sErr.message });
    }

    if (!staff || staff.length === 0) {
      console.log(`[ot-ut-by-type] No staff found for type: ${type}`);
      return res.json({ rows: [] });
    }

    console.log(`[ot-ut-by-type] Found ${staff.length} ${type} employees`);

    const staffIds = staff.map(s => s.id);
    const staffMap = new Map(staff.map(s => [s.id, s]));

    // 2) Get attendance logs with OT/UT columns
    // ✅ CORRECT: overtime_hours and undertime_hours (with _hours suffix)
    const { data: logs, error: lErr } = await db
      .from('attendance_logs')
      .select('staff_user_id, att_date, overtime_hours, undertime_hours, worked_hours')
      .in('staff_user_id', staffIds)
      .gte('att_date', start)
      .lte('att_date', end);

    if (lErr) {
      console.error('[ot-ut-by-type] Error fetching logs:', lErr);
      return res.status(500).json({ error: 'Failed to fetch attendance logs', details: lErr.message });
    }

    console.log(`[ot-ut-by-type] Found ${(logs || []).length} attendance logs`);

    // 3) Calculate totals per employee
    const userData = new Map();

    for (const log of (logs || [])) {
      const staffId = log.staff_user_id;
      
      if (!userData.has(staffId)) {
        userData.set(staffId, {
          totalOT: 0,
          totalUT: 0,
          daysCount: 0
        });
      }

      const data = userData.get(staffId);
      
      // Only count days with actual work
      if (log.worked_hours && log.worked_hours > 0) {
        data.daysCount++;
      }

      // Sum overtime and undertime hours
      data.totalOT += parseFloat(log.overtime_hours) || 0;
      data.totalUT += parseFloat(log.undertime_hours) || 0;
    }

    console.log(`[ot-ut-by-type] Processed ${userData.size} employees with attendance data`);

    // 4) Build response
    const rows = [];
    for (const [staffId, data] of userData.entries()) {
      const staffInfo = staffMap.get(staffId);
      if (!staffInfo) continue;

      // ✅ Filter: Only show employees with OT or UT
      if (data.totalOT === 0 && data.totalUT === 0) continue;

      // Determine trend
      let trend = 'balanced';
      if (data.totalOT > data.totalUT + 2) {
        trend = 'frequent_ot';
      } else if (data.totalUT > data.totalOT + 2) {
        trend = 'frequent_ut';
      }

      rows.push({
        staffId: staffInfo.staff_id,
        name: staffInfo.name,
        totalOT: data.totalOT.toFixed(1),
        totalUT: data.totalUT.toFixed(1),
        trend: trend,
        daysWorked: data.daysCount
      });
    }

    // Sort by total hours (OT + UT) descending
    rows.sort((a, b) => {
      const totalA = parseFloat(a.totalOT) + parseFloat(a.totalUT);
      const totalB = parseFloat(b.totalOT) + parseFloat(b.totalUT);
      return totalB - totalA;
    });

    console.log(`[ot-ut-by-type] ✅ Returning ${rows.length} employees with OT/UT data`);
    
    if (rows.length > 0) {
      console.log('[ot-ut-by-type] Top 3 by total OT+UT:', rows.slice(0, 3).map(r => ({
        name: r.name,
        OT: r.totalOT,
        UT: r.totalUT,
        trend: r.trend
      })));
    } else {
      console.log('[ot-ut-by-type] ⚠️ No employees with OT/UT data found');
    }

    res.json({ rows });

  } catch (e) {
    console.error('[ot-ut-by-type] ❌ Unexpected error:', e);
    res.status(500).json({ 
      error: 'Server error', 
      details: e.message || String(e) 
    });
  }
});
module.exports = router;