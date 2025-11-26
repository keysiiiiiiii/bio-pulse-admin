// backend/routes/leaveRoutes.cjs - COMPLETE UPDATED VERSION
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db.cjs');
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// tmp upload folder
const TMP_UPLOAD_DIR = path.join(__dirname, '../../tmp');
if (!fs.existsSync(TMP_UPLOAD_DIR)) fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: TMP_UPLOAD_DIR });

/* ============ AUTHENTICATION MIDDLEWARE ============ */
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

// Optional auth - for user submissions
function optionalAuth(req, res, next) {
  const token = getBearer(req);
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
    }
  }
  next();
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

/* ============ HELPERS ============ */
function sanitizeFilename(name) {
  return String(name).replace(/[^\w.-]+/g, '_');
}

async function uploadToBucket(bucket, localFilePath, destPath, contentType) {
  const fileBuffer = fs.readFileSync(localFilePath);
  const { data, error } = await supa.storage.from(bucket).upload(destPath, fileBuffer, {
    contentType,
    upsert: false
  });
  if (error) throw error;
  const { data: urlData } = supa.storage.from(bucket).getPublicUrl(destPath);
  return { publicUrl: urlData.publicUrl, path: destPath };
}

function normStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v.startsWith('pending')) return 'pending-admin';
  if (v === 'approved') return 'approved';
  if (v === 'denied' || v === 'rejected' || v === 'disapproved') return 'disapproved';
  if (v === 'cancelled' || v === 'canceled') return 'cancelled';
  return 'pending-admin';
}

async function safeNotify({ staff_user_id = null, title = '', message = '', link = '' }) {
  try {
    await db.from('notifications').insert([{
      staff_user_id, title, message, link, created_at: new Date().toISOString(), read: false
    }]);
  } catch { /* ignore if table not present */ }
}

/* ============ ACTIVITY LOGGING HELPER ============ */
async function logLeaveActivity({ leave_id, action, actor_staff_id, actor_role, staff_id, staff_user_id, details }) {
  try {
    await db.from('account_activity').insert({
      action,
      actor_staff_id,
      actor_role,
      staff_id,
      staff_user_id,
      details: {
        leave_id,
        ...details
      },
      created_at: new Date().toISOString()
    });
    console.log('✅ Activity logged:', action);
  } catch (err) {
    console.error('⚠️ Failed to log activity:', err);
  }
}

/* ============ CREATE WITHOUT FILE ============ */
router.post('/api/leaves', optionalAuth, async (req, res) => {
  try {
    console.log('📝 POST /api/leaves');
    console.log('   Body:', req.body);
    console.log('   User:', req.user);

    let {
      staff_user_id: staffUserIdRaw = null,
      staff_id: staffIdRaw = null,
      staff_name = null,
      first_name = null,
      middle_name = null,
      last_name = null,
      date = null,
      reason = null,
      leave_type = null,
      start_date = null,
      end_date = null,
      num_days = null,
      status = 'Pending',
      details = null
    } = req.body || {};

    // Resolve staff_user_id
    let staff_user_id = (staffUserIdRaw && !isNaN(Number(staffUserIdRaw))) ? Number(staffUserIdRaw) : null;

    if (!staff_user_id && staffIdRaw) {
      const { data: found } = await db.from('staff_users').select('id, name, first_name, middle_name, last_name').eq('staff_id', staffIdRaw).single();
      if (found) {
        staff_user_id = found.id;
        if (!staff_name) staff_name = found.name;
        if (!first_name) first_name = found.first_name;
        if (!middle_name) middle_name = found.middle_name;
        if (!last_name) last_name = found.last_name;
        console.log(`✅ Mapped staff_id '${staffIdRaw}' → staff_user_id=${staff_user_id}`);
      }
    }

    if (!staff_user_id && staff_name) {
      const { data: found } = await db.from('staff_users').select('id, first_name, middle_name, last_name').ilike('name', staff_name).single();
      if (found) {
        staff_user_id = found.id;
        if (!first_name) first_name = found.first_name;
        if (!middle_name) middle_name = found.middle_name;
        if (!last_name) last_name = found.last_name;
        console.log(`✅ Mapped name '${staff_name}' → staff_user_id=${staff_user_id}`);
      }
    }

    if (!staff_user_id && req.user && req.user.sid) {
      const { data: found } = await db.from('staff_users').select('id, name, first_name, middle_name, last_name').eq('staff_id', req.user.sid).single();
      if (found) {
        staff_user_id = found.id;
        if (!staff_name) staff_name = found.name;
        if (!first_name) first_name = found.first_name;
        if (!middle_name) middle_name = found.middle_name;
        if (!last_name) last_name = found.last_name;
        console.log(`✅ Using authenticated user: staff_user_id=${staff_user_id}`);
      }
    }

    console.log('Resolved staff_user_id →', staff_user_id);
    console.log('Resolved names → First:', first_name, 'Middle:', middle_name, 'Last:', last_name);

    if (!date || !staff_name) {
      return res.status(400).json({ ok: false, error: 'Missing required fields: date or staff_name' });
    }

    const payload = {
      staff_user_id: staff_user_id ? Number(staff_user_id) : null,
      staff_id: staffIdRaw || null,
      staff_name,
      first_name: first_name || null,
      middle_name: middle_name || null,
      last_name: last_name || null,
      date,
      reason,
      file_url: null,
      leave_form_url: null,

      // ✅ Add these columns directly (not in fields)
      leave_type: leave_type || null,
      start_date: start_date || null,
      end_date: end_date || null,
      duration: num_days ? Number(num_days) : null,

      fields: { leave_type, start_date, end_date, num_days },
      details: details || {},
      status: normStatus(status),
      created_at: new Date().toISOString(),
      archived: false
    };

    console.log('📤 Inserting:', payload);

    const { data, error } = await db.from('leave_requests').insert([payload]).select().single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    // ✅ Log activity for user's own notification
    if (staff_user_id) {
      let actorStaffId = staffIdRaw;
      if (!actorStaffId && req.user?.sid) actorStaffId = req.user.sid;

      await logLeaveActivity({
        leave_id: data.id,
        action: 'leave_request_created',
        actor_staff_id: actorStaffId || '',
        actor_role: req.user?.role || 'staff',
        staff_id: actorStaffId || '',
        staff_user_id: staff_user_id,
        details: {
          leave_type,
          start_date,
          end_date,
          num_days,
          reason
        }
      });
    }

    console.log('✅ Created:', data.id);
    return res.status(201).json({ ok: true, record: data });
  } catch (err) {
    console.error('❌ Error:', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ============ CREATE WITH FILE ============ */
router.post('/api/leaves/with-file', optionalAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  console.log('📎 POST /api/leaves/with-file');
  console.log('   File:', file ? file.originalname : 'none');
  console.log('   Body:', req.body);
  console.log('   User:', req.user);

  try {
    if (!req.body.staff_name || !req.body.date) {
      return res.status(400).json({ ok: false, error: 'Missing staff_name or date' });
    }

    let {
      staff_user_id: staffUserIdRaw = null,
      staff_id: staffIdRaw = null,
      staff_name,
      first_name = null,
      middle_name = null,
      last_name = null,
      date,
      reason = null,
      leave_type = null,
      start_date = null,
      end_date = null,
      num_days = null,
      details = null
    } = req.body;

    // Resolve staff_user_id (same logic)
    let staff_user_id = (staffUserIdRaw && !isNaN(Number(staffUserIdRaw))) ? Number(staffUserIdRaw) : null;

    if (!staff_user_id && staffIdRaw) {
      const { data: found } = await db.from('staff_users').select('id, name, first_name, middle_name, last_name').eq('staff_id', staffIdRaw).single();
      if (found) {
        staff_user_id = found.id;
        if (!staff_name) staff_name = found.name;
        if (!first_name) first_name = found.first_name;
        if (!middle_name) middle_name = found.middle_name;
        if (!last_name) last_name = found.last_name;
      }
    }

    if (!staff_user_id && staff_name) {
      const { data: found } = await db.from('staff_users').select('id, first_name, middle_name, last_name').ilike('name', staff_name).single();
      if (found) {
        staff_user_id = found.id;
        if (!first_name) first_name = found.first_name;
        if (!middle_name) middle_name = found.middle_name;
        if (!last_name) last_name = found.last_name;
      }
    }

    if (!staff_user_id && req.user) {
      const { data: found } = await db.from('staff_users').select('id, name, first_name, middle_name, last_name').eq('staff_id', req.user.sid).single();
      if (found) {
        staff_user_id = found.id;
        if (!staff_name) staff_name = found.name;
        if (!first_name) first_name = found.first_name;
        if (!middle_name) middle_name = found.middle_name;
        if (!last_name) last_name = found.last_name;
      }
    }

    console.log('Resolved staff_user_id →', staff_user_id);

    // Upload attachment
    let file_url = null;
    if (file) {
      try {
        const destPath = `attachments/${Date.now()}_${sanitizeFilename(file.originalname)}`;
        const uploadRes = await uploadToBucket('leave_attachments', file.path, destPath, file.mimetype);
        file_url = uploadRes.publicUrl;
        console.log('✅ Attachment uploaded:', file_url);
        fs.unlinkSync(file.path);
      } catch (e) {
        console.error('⚠️ Attachment upload failed:', e.message);
      }
    }

    // Generate leave form
    const templatePath = process.env.LEAVE_FORM_TEMPLATE_PATH || path.join(__dirname, '../LEAVE_FORM.xlsx');
    let leave_form_url = null;

    if (fs.existsSync(templatePath)) {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];

        // Get department
        let department = req.body.department || null;
        if (!department && staff_user_id) {
          const { data: staffData } = await db.from('staff_users').select('department').eq('id', staff_user_id).single();
          if (staffData) department = staffData.department;
        }

        // Use parsed names from database
        const firstName = first_name || '';
        const lastName = last_name || '';
        const middleInitial = middle_name || '';

        // Fill basic cells
        if (department) ws.getCell('C10').value = department;
        ws.getCell('G10').value = lastName;
        ws.getCell('I10').value = firstName;
        ws.getCell('N10').value = middleInitial;
        ws.getCell('F12').value = date;

        // Mark leave type checkbox (Column C)
        const leaveTypeMap = {
          vacation: 18, forced: 19, sick: 20, maternity: 21, paternity: 22,
          privilege: 23, soloparent: 24, study: 25, vawc: 26, rehab: 27,
          special: 28, emergency: 29, adoption: 30
        };
        const markRow = leaveTypeMap[leave_type?.toLowerCase()];
        if (markRow) {
          const cell = ws.getCell(`C${markRow}`);
          cell.value = '✔';
          if (cell.border) cell.border = cell.border; // Preserve borders
        }

        // ✅ Fill details of leave (vacation/privilege - abroad/philippines)
        let parsedDetails = {};
        try {
          parsedDetails = typeof details === 'string' ? JSON.parse(details) : details || {};
        } catch (e) {
          console.warn('Failed to parse details:', e);
        }

        if ((leave_type === 'vacation' || leave_type === 'privilege') && parsedDetails.vacation_location) {
          if (parsedDetails.vacation_location === 'philippines') {
            ws.getCell('J19').value = '✔'; // Check "Within the Philippines"
            if (parsedDetails.vacation_specify) {
              ws.getCell('N19').value = parsedDetails.vacation_specify; // Input province/city
            }
          } else if (parsedDetails.vacation_location === 'abroad') {
            ws.getCell('J20').value = '✔'; // Check "Abroad"
            if (parsedDetails.vacation_specify) {
              ws.getCell('N20').value = parsedDetails.vacation_specify; // Input country
            }
          }
        }

        // ✅ Fill sick leave details (in hospital / out patient)
        if (leave_type === 'sick' && parsedDetails.sick_leave_type) {
          if (parsedDetails.sick_leave_type === 'hospital') {
            ws.getCell('J22').value = '✔'; // Check "In Hospital"
            if (parsedDetails.sick_leave_specify) {
              ws.getCell('N22').value = parsedDetails.sick_leave_specify; // Input illness
            }
          } else if (parsedDetails.sick_leave_type === 'outpatient') {
            ws.getCell('J23').value = '✔'; // Check "Out Patient"
            if (parsedDetails.sick_leave_specify) {
              ws.getCell('N23').value = parsedDetails.sick_leave_specify; // Input illness
            }
          }
        }

        // ✅ Fill special leave benefits for women
        if (leave_type === 'special' && parsedDetails.women_leave_illness) {
          ws.getCell('M25').value = parsedDetails.women_leave_illness; // Input illness
        }

        // ✅ Fill study leave details
        if (leave_type === 'study' && parsedDetails.study_leave_type) {
          if (parsedDetails.study_leave_type === 'masters') {
            ws.getCell('J27').value = '✔'; // Check "Completion of Master's Degree"
          } else if (parsedDetails.study_leave_type === 'bar_board') {
            ws.getCell('J28').value = '✔'; // Check "BAR/Board Examination Review"
          } else if (parsedDetails.study_leave_type === 'other' && parsedDetails.study_leave_specify) {
            ws.getCell('M29').value = parsedDetails.study_leave_specify; // Input other purpose
          }
        }

        // Fill number of days and date range
        if (num_days) ws.getCell('E34').value = Number(num_days);
        if (start_date) ws.getCell('E36').value = `${start_date} - ${end_date}`;

        const tempPath = path.join(TMP_UPLOAD_DIR, `leave_form_${Date.now()}.xlsx`);
        await workbook.xlsx.writeFile(tempPath);

        const destFormPath = `forms/leave_form_${sanitizeFilename(staff_name)}_${Date.now()}.xlsx`;
        const uploadFormRes = await uploadToBucket('leave_forms', tempPath, destFormPath,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        leave_form_url = uploadFormRes.publicUrl;
        console.log('✅ Leave form uploaded:', leave_form_url);
        fs.unlinkSync(tempPath);
      } catch (e) {
        console.error('⚠️ Form generation failed:', e.message);
      }
    }

    const payload = {
      staff_user_id: staff_user_id ? Number(staff_user_id) : null,
      staff_id: staffIdRaw || null,
      staff_name,
      first_name: first_name || null,
      middle_name: middle_name || null,
      last_name: last_name || null,
      date,
      reason,
      file_url,
      leave_form_url,

      // ✅ Add these columns directly (not in fields)
      leave_type: leave_type || null,
      start_date: start_date || null,
      end_date: end_date || null,
      duration: num_days ? Number(num_days) : null,

      fields: { leave_type, start_date, end_date, num_days },
      details: details || {},
      status: 'pending-admin',
      created_at: new Date().toISOString(),
      archived: false
    };

    console.log('📤 Inserting:', payload);

    const { data, error } = await db.from('leave_requests').insert([payload]).select().single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    // ✅ Log activity
    if (staff_user_id) {
      let actorStaffId = staffIdRaw;
      if (!actorStaffId && req.user?.sid) actorStaffId = req.user.sid;

      await logLeaveActivity({
        leave_id: data.id,
        action: 'leave_request_created',
        actor_staff_id: actorStaffId || '',
        actor_role: req.user?.role || 'staff',
        staff_id: actorStaffId || '',
        staff_user_id: staff_user_id,
        details: {
          leave_type,
          start_date,
          end_date,
          num_days,
          reason
        }
      });
    }

    console.log('✅ Created with file:', data.id);
    return res.status(201).json({ ok: true, record: data });
  } catch (err) {
    console.error('❌ Error:', err);
    if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ============ LIST ============ */
router.get('/api/leaves', verifyToken, async (req, res) => {
  try {
    console.log('📋 GET /api/leaves');
    console.log('   Query:', req.query);
    console.log('   User:', req.user);

    const status = String(req.query.status || 'all').toLowerCase();
    const staffUserId = req.query.staff_user_id;
    const q = req.query.q;
    const archived = req.query.archived === '1';

    let query = db.from('leave_requests').select('*');

    if (staffUserId) query = query.eq('staff_user_id', Number(staffUserId));
    if (!archived) query = query.or('archived.is.null,archived.eq.false');

    if (status && status !== 'all') {
      if (status === 'pending') {
        query = query.or('status.eq.Pending,status.eq.pending,status.eq.pending-admin');
      } else {
        query = query.eq('status', status);
      }
    }

    if (q) query = query.or(`reason.ilike.%${q}%,staff_name.ilike.%${q}%`);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);

    if (error) {
      console.error('❌ Error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} records (filter: '${status}')`);

    return res.json({ ok: true, data: data || [] });
  } catch (e) {
    console.error('❌ Error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/* ============ HISTORY ============ */
router.get('/api/leaves/history', verifyToken, async (req, res) => {
  try {
    console.log('📚 GET /api/leaves/history');

    const { start, end, staff_user_id } = req.query;
    let q = db.from('leave_requests').select('*');

    if (staff_user_id) q = q.eq('staff_user_id', Number(staff_user_id));
    if (start) q = q.gte('date', start);
    if (end) q = q.lte('date', end);

    const { data, error } = await q.order('date', { ascending: false }).limit(500);

    if (error) return res.status(500).json({ error: error.message });

    console.log(`✅ Found ${data?.length || 0} history records`);
    res.json({ ok: true, rows: data || [] });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/* ============ STATUS UPDATE ============ */
router.patch('/api/leaves/:id/status', verifyToken, requireRole('Admin', 'Vice President', 'ICTO'), async (req, res) => {
  try {
    console.log('📝 PATCH /api/leaves/:id/status');
    console.log('   ID:', req.params.id);
    console.log('   Body:', req.body);

    const id = Number(req.params.id);
    const status = normStatus(req.body?.status);
    const remarks = req.body?.remarks?.trim();

    if (!id) return res.status(400).json({ error: 'Invalid id' });
    if (status === 'disapproved' && !remarks) {
      return res.status(400).json({ error: 'Remarks required for denial' });
    }

    const patch = {
      status,
      admin_remarks: remarks || null,
      finalized_at: (status === 'approved' || status === 'disapproved') ? new Date().toISOString() : null
    };

    const { data, error } = await db.from('leave_requests').update(patch).eq('id', id).select().single();

    if (error) {
      console.error('❌ Error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Updated:', data);

    // Get staff details for activity log
    const actorStaffId = req.user?.sid || '';
    const actorRole = req.user?.role || '';

    // Fetch staff_id from staff_users table
    let targetStaffId = null;
    if (data.staff_user_id) {
      const { data: staffData } = await db
        .from('staff_users')
        .select('staff_id')
        .eq('id', data.staff_user_id)
        .single();
      if (staffData) targetStaffId = staffData.staff_id;
    }

    // ✅ Log activity to account_activity table
    await logLeaveActivity({
      leave_id: id,
      action: 'leave_status_update',
      actor_staff_id: actorStaffId,
      actor_role: actorRole,
      staff_id: targetStaffId,
      staff_user_id: data.staff_user_id,
      details: {
        leave_type: data.fields?.leave_type || 'N/A',
        status: status,
        remarks: remarks || null,
        start_date: data.fields?.start_date || null,
        end_date: data.fields?.end_date || null
      }
    });

    // ✅ Deduct leave credits if approved (for ANY leave type)
    if (status === 'approved' && data.staff_user_id && data.duration) {
      const { data: account } = await db
        .from('user_accounts')
        .select('leave_credits, used_credits')
        .eq('staff_user_id', data.staff_user_id)
        .single();

      if (account) {
        const currentCredits = Number(account.leave_credits || 0);
        const currentUsed = Number(account.used_credits || 0);
        const deducted = Number(data.duration);
        const newBalance = Math.max(0, currentCredits - deducted);

        // Update deduction
        const { error: updateErr } = await db
          .from('user_accounts')
          .update({
            leave_credits: newBalance,
            used_credits: currentUsed + deducted
          })
          .eq('staff_user_id', data.staff_user_id);

        if (updateErr) {
          console.error('❌ Failed to deduct credits:', updateErr);
        } else {
          console.log(`✅ Credits deducted: ${deducted} days (${data.leave_type || 'N/A'})`);
          console.log(`   Previous balance: ${currentCredits}, New balance: ${newBalance}`);
        }
      }
    }


    // Send notification
    const title = status === 'approved' ? 'Leave Approved' : status === 'disapproved' ? 'Leave Denied' : 'Leave Updated';
    const message = status === 'disapproved' && remarks ? `Denied: ${remarks}` : `Status: ${status}`;

    await safeNotify({ staff_user_id: data.staff_user_id, title, message, link: '' });

    res.json({ ok: true, record: data });
  } catch (e) {
    console.error('❌ Error:', e);
    res.status(500).json({ error: e.message });
  }
});

/* ============ DRAFTS ============ */
const DRAFTS_PATH = path.join(__dirname, '..', 'leave_drafts.json');
const readDrafts = () => { try { return JSON.parse(fs.readFileSync(DRAFTS_PATH, 'utf8')) || []; } catch { return []; } };
const writeDrafts = (arr) => fs.writeFileSync(DRAFTS_PATH, JSON.stringify(arr, null, 2));

router.get('/api/leaves/drafts', optionalAuth, (req, res) => {
  const all = readDrafts().filter(d => Date.now() - new Date(d.saved_at || 0).getTime() < 30 * 24 * 60 * 60 * 1000);
  const filtered = req.query.staff_user_id
    ? all.filter(d => String(d.staff_user_id) === req.query.staff_user_id)
    : req.query.staff_id
      ? all.filter(d => d.staff_id === req.query.staff_id)
      : all;
  res.json({ ok: true, data: filtered });
});

router.post('/api/leaves/drafts', optionalAuth, (req, res) => {
  try {
    const payload = {
      id: String(Date.now()),
      staff_user_id: req.body.staff_user_id ? Number(req.body.staff_user_id) : null,
      staff_id: req.body.staff_id || '',
      staff_name: req.body.staff_name || '',
      fields: typeof req.body.fields === 'string' ? JSON.parse(req.body.fields) : req.body.fields || {},
      saved_at: req.body.saved_at || new Date().toISOString()
    };
    const all = readDrafts();
    all.push(payload);
    writeDrafts(all);
    res.status(201).json({ ok: true, record: payload });
  } catch (e) {
    res.status(400).json({ ok: false, error: 'Invalid data' });
  }
});

router.delete('/api/leaves/drafts/:id', optionalAuth, (req, res) => {
  const left = readDrafts().filter(d => String(d.id) !== req.params.id);
  writeDrafts(left);
  res.json({ ok: true, deleted: req.params.id });
});

module.exports = router;