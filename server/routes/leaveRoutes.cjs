// backend/routes/leaveRoutes.cjs - MERGED & FIXED
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

// tmp upload folder for multer
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

// Optional auth - allows both authenticated and unauthenticated requests
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
  if (v === 'denied') return 'denied';
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

/* ============ CREATE WITHOUT FILE ============ */
// FIXED: Allow both admin and regular users to create leave requests
router.post('/api/leaves', optionalAuth, async (req, res) => {
  try {
    console.log('📝 POST /api/leaves - Request body:', req.body);
    console.log('📝 User:', req.user);

    let {
      staff_user_id: staffUserIdRaw = null,
      staff_id: staffIdRaw = null,
      staff_name = null,
      date = null,
      reason = null,
      leave_type = null,
      start_date = null,
      end_date = null,
      num_days = null,
      status = 'Pending'
    } = req.body || {};

    // 1) Numeric ID provided
    let staff_user_id = (staffUserIdRaw && !isNaN(Number(staffUserIdRaw))) ? Number(staffUserIdRaw) : null;

    // 2) Lookup by staff_id string
    if (!staff_user_id && staffIdRaw) {
      try {
        const key = String(staffIdRaw).trim();
        const { data: found, error: findErr } = await db.from('staff_users').select('id, name').eq('staff_id', key).limit(1).single();
        if (!findErr && found && found.id) {
          staff_user_id = found.id;
          if (!staff_name) staff_name = found.name; // Use DB name if not provided
          console.log(`✅ Mapped staff_id '${key}' → staff_user_id=${staff_user_id}`);
        }
      } catch (e) {
        console.warn('⚠️ staff_id lookup failed:', e.message);
      }
    }

    // 3) Lookup by name
    if (!staff_user_id && staff_name) {
      try {
        const key = String(staff_name).trim();
        const { data: found, error } = await db.from('staff_users').select('id').ilike('name', key).limit(1).single();
        if (!error && found && found.id) {
          staff_user_id = found.id;
          console.log(`✅ Mapped name '${key}' → staff_user_id=${staff_user_id}`);
        }
      } catch (e) {
        console.warn('⚠️ staff_name lookup failed:', e.message);
      }
    }

    // 4) If authenticated user but no staff_user_id resolved, use logged-in user's info
    if (!staff_user_id && req.user && req.user.sid) {
      try {
        const { data: found, error } = await db.from('staff_users').select('id, name').eq('staff_id', req.user.sid).single();
        if (!error && found) {
          staff_user_id = found.id;
          if (!staff_name) staff_name = found.name;
          console.log(`✅ Using authenticated user: staff_user_id=${staff_user_id}, name=${staff_name}`);
        }
      } catch (e) {
        console.warn('⚠️ Failed to get authenticated user info:', e.message);
      }
    }

    console.log('Resolved staff_user_id →', staff_user_id);
    console.log('Resolved staff_name →', staff_name);

    if (!date || !staff_name) {
      console.error('❌ Missing required fields');
      return res.status(400).json({ ok: false, error: 'Missing required fields: date or staff_name' });
    }

    const fieldsObj = {
      leave_type,
      start_date,
      end_date,
      num_days
    };

    const payload = {
      staff_user_id: staff_user_id ? Number(staff_user_id) : null,
      staff_name,
      date,
      reason,
      file_url: null,
      leave_form_url: null,
      fields: fieldsObj,
      status: normStatus(status),
      created_at: new Date().toISOString(),
      archived: false
    };

    console.log('📤 Inserting into database:', payload);

    const { data, error } = await db.from('leave_requests').insert([payload]).select().single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    console.log('✅ Leave request created:', data.id);
    return res.status(201).json({ ok: true, record: data });
  } catch (err) {
    console.error('❌ POST /api/leaves error', err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ============ CREATE WITH FILE ============ */
// FIXED: Allow both admin and regular users
router.post('/api/leaves/with-file', optionalAuth, upload.single('file'), async (req, res) => {
  const file = req.file;
  console.log('📎 POST /api/leaves/with-file');
  console.log('📄 File:', file ? file.originalname : 'none');
  console.log('📝 Body:', req.body);
  console.log('📝 User:', req.user);

  try {
    if (!req.body || !req.body.staff_name || !req.body.date) {
      console.error('❌ Missing staff_name or date');
      return res.status(400).json({ ok: false, error: 'Missing staff_name or date in body' });
    }

    let {
      staff_user_id: staffUserIdRaw = null,
      staff_id: staffIdRaw = null,
      staff_name,
      date,
      reason = null,
      leave_type = null,
      start_date = null,
      end_date = null,
      num_days = null
    } = req.body || {};

    // Map staff identifier (same logic as above)
    let staff_user_id = (staffUserIdRaw && !isNaN(Number(staffUserIdRaw))) ? Number(staffUserIdRaw) : null;

    if (!staff_user_id && staffIdRaw) {
      try {
        const key = String(staffIdRaw).trim();
        const { data: found, error: findErr } = await db.from('staff_users').select('id, name').eq('staff_id', key).limit(1).single();
        if (!findErr && found && found.id) {
          staff_user_id = found.id;
          if (!staff_name) staff_name = found.name;
          console.log(`✅ Mapped staff_id '${key}' → staff_user_id=${staff_user_id}`);
        }
      } catch (e) {
        console.warn('⚠️ staff_id lookup failed:', e.message);
      }
    }

    if (!staff_user_id && staff_name) {
      try {
        const key = String(staff_name).trim();
        const { data: found, error } = await db.from('staff_users').select('id').ilike('name', key).limit(1).single();
        if (!error && found && found.id) {
          staff_user_id = found.id;
          console.log(`✅ Mapped name '${key}' → staff_user_id=${staff_user_id}`);
        }
      } catch (e) {
        console.warn('⚠️ staff_name lookup failed:', e.message);
      }
    }

    // Use authenticated user if available
    if (!staff_user_id && req.user && req.user.sid) {
      try {
        const { data: found, error } = await db.from('staff_users').select('id, name').eq('staff_id', req.user.sid).single();
        if (!error && found) {
          staff_user_id = found.id;
          if (!staff_name) staff_name = found.name;
          console.log(`✅ Using authenticated user: staff_user_id=${staff_user_id}`);
        }
      } catch (e) {
        console.warn('⚠️ Failed to get authenticated user info:', e.message);
      }
    }

    console.log('Resolved staff_user_id →', staff_user_id);

    // Upload attachment
    let file_url = null;
    if (file) {
      console.log('⬆️ Uploading attachment to Supabase...');
      try {
        const orig = sanitizeFilename(file.originalname || 'attachment');
        const destPath = `attachments/${Date.now()}_${orig}`;
        const contentType = file.mimetype || 'application/octet-stream';
        const uploadRes = await uploadToBucket('leave_attachments', file.path, destPath, contentType);
        file_url = uploadRes.publicUrl;
        console.log('✅ Attachment uploaded:', file_url);
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
      } catch (uploadErr) {
        console.error('⚠️ Attachment upload failed:', uploadErr.message);
      }
    }

    // Generate leave form
    const templatePath = process.env.LEAVE_FORM_TEMPLATE_PATH || path.join(__dirname, '../LEAVE_FORM.xlsx');
    const tempOutputPath = path.join(TMP_UPLOAD_DIR, `leave_form_${Date.now()}.xlsx`);
    let leave_form_url = null;

    if (fs.existsSync(templatePath)) {
      console.log('📋 Generating leave form from template...');
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0];

        // Fetch department
        let department = req.body.department || null;
        if (!department && staff_user_id) {
          try {
            const { data: staffData, error: staffErr } = await db.from('staff_users')
              .select('department')
              .eq('id', staff_user_id)
              .single();
            if (!staffErr && staffData) department = staffData.department;
          } catch (e) { console.warn('⚠️ Could not fetch department:', e.message); }
        }

        // Parse name
        const name = (staff_name || '').trim();
        const parts = name.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        const middleInitial = parts.length > 2 ? parts.slice(1, -1).map(p => p[0].toUpperCase()).join('') : '';

        // Fill cells
        if (department) ws.getCell('C10').value = department;
        ws.getCell('G10').value = lastName;
        ws.getCell('I10').value = firstName;
        ws.getCell('N10').value = middleInitial;
        ws.getCell('F12').value = date || new Date().toISOString().slice(0, 10);

        // Mark leave type
        const leaveType = (leave_type || '').toLowerCase();
        const leaveTypeMap = {
          vacation: 18, forced: 19, sick: 20, maternity: 21, paternity: 22,
          privilege: 23, soloparent: 24, study: 25, vawc: 26, rehab: 27,
          special: 28, emergency: 29, adoption: 30
        };
        const markRow = leaveTypeMap[leaveType];
        if (markRow) {
          ws.getCell(`C${markRow}`).value = '✔';
          console.log(`✅ Marked leave type "${leaveType}" at row ${markRow}`);
        }

        if (num_days) ws.getCell('E34').value = Number(num_days);
        if (start_date) ws.getCell('E36').value = start_date + ' - ' + end_date;

        await workbook.xlsx.writeFile(tempOutputPath);

        const destFormPath = `forms/leave_form_${sanitizeFilename(staff_name)}_${Date.now()}.xlsx`;
        const uploadFormRes = await uploadToBucket(
          'leave_forms',
          tempOutputPath,
          destFormPath,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        leave_form_url = uploadFormRes.publicUrl;
        console.log('✅ Leave form generated & uploaded:', leave_form_url);
        try { fs.unlinkSync(tempOutputPath); } catch (e) { /* ignore */ }
      } catch (formErr) {
        console.error('⚠️ Form generation failed:', formErr.message);
      }
    }

    // Insert into database
    const fieldsObj = {
      leave_type,
      start_date,
      end_date,
      num_days
    };

    const payload = {
      staff_user_id: staff_user_id ? Number(staff_user_id) : null,
      staff_name,
      date,
      reason,
      file_url,
      leave_form_url,
      fields: fieldsObj,
      status: 'pending-admin',
      created_at: new Date().toISOString(),
      archived: false
    };

    console.log('📤 Inserting into database:', payload);

    const { data, error } = await db.from('leave_requests').insert([payload]).select().single();

    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    console.log('✅ Leave request created with file:', data.id);
    return res.status(201).json({ ok: true, record: data });
  } catch (err) {
    console.error('❌ POST /api/leaves/with-file error', err);
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
    }
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ============ LIST: GET /api/leaves ============ */
// FIXED: Better status filtering to catch ALL pending requests
router.get('/api/leaves', verifyToken, async (req, res) => {
  try {
    console.log('📋 GET /api/leaves - Query params:', req.query);
    
    const status = String(req.query.status || 'all').toLowerCase();
    const staffUserId = String(req.query.staff_user_id || '').trim();
    const q = String(req.query.q || '').trim();
    const archived = req.query.archived === '1' || req.query.archived === 'true';

    let query = db.from('leave_requests').select('*');

    // Filter by staff user
    if (staffUserId) query = query.eq('staff_user_id', Number(staffUserId));
    
    // Filter archived
    if (!archived) query = query.or('archived.is.null,archived.eq.false');

    // FIXED: Better status filtering
    if (status && status !== 'all') {
      if (status === 'pending') {
        // Get ALL pending variants: 'pending', 'Pending', 'pending-admin', etc.
        query = query.or('status.ilike.pending%,status.ilike.Pending%');
      } else {
        query = query.eq('status', status);
      }
    }
    
    // Search filter
    if (q) query = query.or(`reason.ilike.%${q}%,staff_name.ilike.%${q}%`);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
    
    if (error) {
      console.error('❌ Database error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} leave requests (status filter: '${status}')`);
    
    // Log sample records for debugging
    if (data && data.length > 0) {
      console.log('📊 Sample records:', data.slice(0, 3).map(r => ({
        id: r.id,
        name: r.staff_name,
        status: r.status,
        date: r.date
      })));
    }
    
    return res.json({ ok: true, data: data || [] });
  } catch (e) {
    console.error('❌ GET /api/leaves error:', e);
    return res.status(500).json({ ok: false, error: e.message || 'Unexpected error' });
  }
});

/* ============ HISTORY ============ */
router.get('/api/leaves/history', verifyToken, async (req, res) => {
  try {
    console.log('📚 GET /api/leaves/history - Query params:', req.query);
    
    const { start, end, staff_user_id } = req.query;
    let q = db.from('leave_requests').select('*');

    if (staff_user_id) q = q.eq('staff_user_id', Number(staff_user_id));
    if (start) q = q.gte('date', start);
    if (end) q = q.lte('date', end);

    const { data, error } = await q.order('date', { ascending: false }).limit(500);
    
    if (error) {
      console.error('❌ History error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Found ${data?.length || 0} history records`);
    
    res.json({ ok: true, rows: data || [] });
  } catch (e) {
    console.error('❌ History fetch error:', e);
    return res.status(500).json({ error: e.message });
  }
});

/* ============ STATUS UPDATE ============ */
router.patch('/api/leaves/:id/status', verifyToken, requireRole('Admin', 'Vice President', 'ICTO'), async (req, res) => {
  try {
    console.log('🔄 PATCH /api/leaves/:id/status');
    console.log('   ID:', req.params.id);
    console.log('   Body:', req.body);
    
    const id = Number(req.params.id);
    const rawStatus = req.body?.status;
    const remarks = (req.body?.remarks || '').trim();

    if (!id) return res.status(400).json({ error: 'Invalid id' });
    
    const status = normStatus(rawStatus);
    
    if (status === 'denied' && !remarks) {
      return res.status(400).json({ error: 'Remarks are required when denying a request.' });
    }

    const patch = {
      status,
      admin_remarks: remarks || null,
      finalized_at: (status === 'approved' || status === 'denied') ? new Date().toISOString() : null
    };

    console.log('📤 Updating with:', patch);

    const { data, error } = await db.from('leave_requests')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update error:', error);
      return res.status(500).json({ error: error.message || 'Update failed' });
    }

    console.log('✅ Updated successfully:', data);

    const title = (status === 'approved') ? 'Leave Approved' :
      (status === 'denied') ? 'Leave Denied' : 'Leave Updated';
    const message = (status === 'denied' && remarks)
      ? `Your leave request was denied. Reason: ${remarks}`
      : `Your leave request status is now: ${status}`;

    await safeNotify({ staff_user_id: data.staff_user_id || null, title, message, link: '' });
    
    res.json({ ok: true, record: data });
  } catch (e) {
    console.error('❌ Status update error:', e);
    res.status(500).json({ error: e.message || 'Unexpected error' });
  }
});

/* ============ DRAFTS ============ */
const DRAFTS_PATH = path.join(__dirname, '..', 'leave_drafts.json');
function readDrafts() { 
  try { 
    return JSON.parse(fs.readFileSync(DRAFTS_PATH, 'utf8')) || []; 
  } catch { 
    return []; 
  } 
}
function writeDrafts(arr) { 
  fs.writeFileSync(DRAFTS_PATH, JSON.stringify(arr, null, 2)); 
}

router.get('/api/leaves/drafts', optionalAuth, (req, res) => {
  const staffUserId = String(req.query.staff_user_id || '').trim();
  const staffId = String(req.query.staff_id || '').trim();
  const all = readDrafts();

  const now = Date.now();
  const keep = all.filter(d => now - new Date(d.saved_at || d.savedAt || 0).getTime() < 30 * 24 * 60 * 60 * 1000);
  if (keep.length !== all.length) writeDrafts(keep);

  const rows = staffUserId
    ? keep.filter(d => String(d.staff_user_id) === staffUserId)
    : staffId
      ? keep.filter(d => (d.staff_id || '') === staffId)
      : keep;

  const data = rows.map(d => ({
    id: d.id,
    staff_user_id: d.staff_user_id || null,
    staff_id: d.staff_id || '',
    staff_name: d.staff_name || '',
    fields: d.fields || {},
    proof_name: d.proof_name || '',
    saved_at: d.saved_at || d.savedAt || new Date().toISOString()
  }));
  return res.json({ ok: true, data });
});

router.post('/api/leaves/drafts', optionalAuth, (req, res) => {
  const { staff_user_id, staff_name, fields, saved_at, staff_id } = req.body || {};
  try {
    const payload = {
      id: String(Date.now()),
      staff_user_id: staff_user_id ? Number(staff_user_id) : null,
      staff_id: staff_id || '',
      staff_name: staff_name || '',
      fields: (typeof fields === 'string') ? JSON.parse(fields) : (fields || {}),
      saved_at: saved_at || new Date().toISOString()
    };
    const all = readDrafts();
    all.push(payload);
    writeDrafts(all);
    return res.status(201).json({ ok: true, record: payload });
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'Invalid fields JSON' });
  }
});

router.delete('/api/leaves/drafts/:id', optionalAuth, (req, res) => {
  const id = String(req.params.id || '').trim();
  const left = readDrafts().filter(d => String(d.id) !== id);
  writeDrafts(left);
  return res.json({ ok: true, deleted: id });
});

module.exports = router;