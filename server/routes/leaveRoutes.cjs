// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db.cjs'); // your DB helper
const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// tmp upload folder for multer
const TMP_UPLOAD_DIR = path.join(__dirname, '../../tmp');
if (!fs.existsSync(TMP_UPLOAD_DIR)) fs.mkdirSync(TMP_UPLOAD_DIR, { recursive: true });

const upload = multer({ dest: TMP_UPLOAD_DIR });

// helper: sanitize filename
function sanitizeFilename(name) {
  return String(name).replace(/[^\w.-]+/g, '_');
}

// helper: upload stream/file to supabase storage and return public URL (and path)
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

/* ---------------- Helpers ---------------- */
function normStatus(s) {
  const v = String(s || '').toLowerCase();
  if (v.startsWith('pending')) return 'pending-admin';
  if (v === 'approved') return 'approved';
  if (v === 'disapproved') return 'disapproved';  // ✅ Keep as 'disapproved'
  if (v === 'denied') return 'disapproved';       // ✅ Map 'denied' to 'disapproved'
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

// route: create without file (JSON body)
router.post('/api/leaves', async (req, res) => {
  try {
    console.log('📝 POST /api/leaves - Request body:', req.body);

    // ---------------- Normalize & map staff identifier -> numeric staff_user_id ----------------
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

    // 1) If numeric ID was provided (string like "204"), use it
    let staff_user_id = (staffUserIdRaw && !isNaN(Number(staffUserIdRaw))) ? Number(staffUserIdRaw) : null;

    // 2) If not numeric, but staff_id string provided (like "28-2025-0002"), look up numeric id
    if (!staff_user_id && staffIdRaw) {
      try {
        const key = String(staffIdRaw).trim();
        const { data: found, error: findErr } = await db.from('staff_users').select('id').eq('staff_id', key).limit(1).single();
        if (!findErr && found && found.id) {
          staff_user_id = found.id;
          console.log(`✅ Mapped staff_id '${key}' → staff_user_id=${staff_user_id}`);
        } else {
          console.warn(`⚠️ staff_id '${key}' not found in staff_users`);
        }
      } catch (e) {
        console.warn('⚠️ staff_id lookup failed:', e && e.message ? e.message : e);
      }
    }

    // 3) If still not found, try lookup by staff_name (case-insensitive)
    if (!staff_user_id && staff_name) {
      try {
        const key = String(staff_name).trim();
        // exact match first
        let { data: exact, error: exactErr } = await db.from('staff_users').select('id').eq('name', key).limit(1).single();
        if (!exactErr && exact && exact.id) {
          staff_user_id = exact.id;
          console.log(`✅ Mapped name '${key}' → staff_user_id=${staff_user_id} (exact match)`);
        } else {
          // ilike fallback
          const { data: ilikeFound, error: ilikeErr } = await db.from('staff_users').select('id').ilike('name', key).limit(1).single();
          if (!ilikeErr && ilikeFound && ilikeFound.id) {
            staff_user_id = ilikeFound.id;
            console.log(`✅ Mapped name '${key}' → staff_user_id=${staff_user_id} (ilike match)`);
          } else {
            console.warn(`⚠️ staff_name '${key}' not mapped to staff_users.id`);
          }
        }
      } catch (e) {
        console.warn('⚠️ staff_name lookup failed:', e && e.message ? e.message : e);
      }
    }

    // staff_user_id is now numeric id or null
    console.log('Resolved staff_user_id →', staff_user_id);

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

// route: create with attachment and auto-filled leave form
router.post('/api/leaves/with-file', upload.single('file'), async (req, res) => {
  const file = req.file;
  console.log('📎 POST /api/leaves/with-file');
  console.log('📄 File:', file ? file.originalname : 'none');
  console.log('📝 Body:', req.body);

  try {
    if (!req.body || !req.body.staff_name || !req.body.date) {
      console.error('❌ Missing staff_name or date');
      return res.status(400).json({ ok: false, error: 'Missing staff_name or date in body' });
    }

    // ---------------- Normalize & map staff identifier -> numeric staff_user_id ----------------
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

    // 1) numeric id present?
    let staff_user_id = (staffUserIdRaw && !isNaN(Number(staffUserIdRaw))) ? Number(staffUserIdRaw) : null;

    // 2) lookup by staff_id (string like "28-2025-0002")
    if (!staff_user_id && staffIdRaw) {
      try {
        const key = String(staffIdRaw).trim();
        const { data: found, error: findErr } = await db.from('staff_users').select('id').eq('staff_id', key).limit(1).single();
        if (!findErr && found && found.id) {
          staff_user_id = found.id;
          console.log(`✅ Mapped staff_id '${key}' → staff_user_id=${staff_user_id}`);
        } else {
          console.warn(`⚠️ staff_id '${key}' not found in staff_users`);
        }
      } catch (e) {
        console.warn('⚠️ staff_id lookup failed:', e && e.message ? e.message : e);
      }
    }

    // 3) lookup by name (fallback)
    if (!staff_user_id && staff_name) {
      try {
        const key = String(staff_name).trim();
        let { data: exact, error: exactErr } = await db.from('staff_users').select('id').eq('name', key).limit(1).single();
        if (!exactErr && exact && exact.id) {
          staff_user_id = exact.id;
          console.log(`✅ Mapped name '${key}' → staff_user_id=${staff_user_id} (exact match)`);
        } else {
          const { data: ilikeFound, error: ilikeErr } = await db.from('staff_users').select('id').ilike('name', key).limit(1).single();
          if (!ilikeErr && ilikeFound && ilikeFound.id) {
            staff_user_id = ilikeFound.id;
            console.log(`✅ Mapped name '${key}' → staff_user_id=${staff_user_id} (ilike match)`);
          } else {
            console.warn(`⚠️ staff_name '${key}' not mapped to staff_users.id`);
          }
        }
      } catch (e) {
        console.warn('⚠️ staff_name lookup failed:', e && e.message ? e.message : e);
      }
    }

    console.log('Resolved staff_user_id →', staff_user_id);

    // 1) Upload attachment to leave_attachments bucket (if present)
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
        // delete tmp upload file after upload
        try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
      } catch (uploadErr) {
        console.error('⚠️ Attachment upload failed:', uploadErr.message);
        // Continue without file_url
      }
    }

    // 2) Generate filled LEAVE_FORM.xlsx from template and upload to leave_forms bucket
    const templatePath = process.env.LEAVE_FORM_TEMPLATE_PATH || path.join(__dirname, '../LEAVE_FORM.xlsx');
    const tempOutputPath = path.join(TMP_UPLOAD_DIR, `leave_form_${Date.now()}.xlsx`);
    let leave_form_url = null;

    if (fs.existsSync(templatePath)) {
      console.log('📋 Generating leave form from template...');
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const ws = workbook.worksheets[0]; // use the first sheet

        // ---- FETCH STAFF INFO FROM DB (to get department if not in body) ----
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

        // ---- PARSE NAME INTO PARTS ----
        const name = (staff_name || '').trim();
        const parts = name.split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.length > 1 ? parts[parts.length - 1] : '';
        const middleInitial = parts.length > 2 ? parts.slice(1, -1).map(p => p[0].toUpperCase()).join('') : '';

        // ---- FILL CELLS EXACTLY AS SPECIFIED ----
        // Office/Department -> C10:F10 (merged)
        if (department) ws.getCell('C10').value = department;

        // Surname -> G10:H10
        ws.getCell('G10').value = lastName;

        // First name -> I10:M10
        ws.getCell('I10').value = firstName;

        // Middle Initial -> N10:O10
        ws.getCell('N10').value = middleInitial;

        // Date of filing -> F12
        ws.getCell('F12').value = date || new Date().toISOString().slice(0, 10);

        // ---- Mark the selected leave type with a check mark (✔) ----
        const leaveType = (leave_type || '').toLowerCase();

        // explicit mapping between <select> values and Excel row numbers
        const leaveTypeMap = {
          vacation: 18,          // Vacation Leave
          forced: 19,            // Mandatory/Forced Leave
          sick: 20,              // Sick Leave
          maternity: 21,         // Maternity Leave
          paternity: 22,         // Paternity Leave
          privilege: 23,         // Special Privilege Leave
          soloparent: 24,        // Solo Parent Leave
          study: 25,             // Study Leave
          vawc: 26,              // 10-Day VAWC Leave
          rehab: 27,             // Rehabilitation Privilege
          special: 28,           // Special Leave Benefits for Women
          emergency: 29,         // Special Emergency (Calamity) Leave
          adoption: 30           // Adoption Leave
        };

        // mark the correct cell in Column B (beside column C text)
        const markRow = leaveTypeMap[leaveType];
        if (markRow) {
          ws.getCell(`C${markRow}`).value = '✔';
          console.log(`✅ Marked leave type "${leaveType}" at row ${markRow}`);
        } else {
          console.warn(`⚠️ Unknown leave type "${leaveType}", no mark added`);
        }

        // Number of leave days (C33 for example — adjust if different)
        if (num_days) ws.getCell('E34').value = Number(num_days);

        // Start date (E36), End date (G36)
        if (start_date) ws.getCell('E36').value = start_date + ' - ' + end_date;

        // ---- SAVE TEMP FILE ----
        await workbook.xlsx.writeFile(tempOutputPath);

        // ---- UPLOAD TO SUPABASE 'leave_forms' ----
        const destFormPath = `forms/leave_form_${sanitizeFilename(staff_name)}_${Date.now()}.xlsx`;
        const uploadFormRes = await uploadToBucket(
          'leave_forms',
          tempOutputPath,
          destFormPath,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        leave_form_url = uploadFormRes.publicUrl;
        console.log('✅ Leave form generated & uploaded:', leave_form_url);

        // cleanup temp output
        try { fs.unlinkSync(tempOutputPath); } catch (e) { /* ignore */ }
      } catch (formErr) {
        console.error('⚠️ Form generation failed:', formErr.message);
        // Continue without leave_form_url
      }
    } else {
      console.warn('⚠️ Template not found at', templatePath);
    }

    // 3) Insert new record into DB using Supabase client
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
      status: 'Pending',
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
    // attempt cleanup temp upload file
    if (file && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
    }
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

/* ---------------- LIST: GET /api/leaves ---------------- */
router.get('/api/leaves', async (req, res) => {
  try {
    const status = String(req.query.status || 'all').toLowerCase();
    const staffUserId = String(req.query.staff_user_id || '').trim();
    const q = String(req.query.q || '').trim();
    const archived = req.query.archived === '1' || req.query.archived === 'true';

    let query = db.from('leave_requests').select('*');

    if (staffUserId) query = query.eq('staff_user_id', Number(staffUserId));
    if (!archived) query = query.or('archived.is.null,archived.eq.false');

    if (status && status !== 'all') {
      if (status === 'pending') query = query.ilike('status', 'pending%');
      else query = query.eq('status', status);
    }
    if (q) query = query.or(`reason.ilike.%${q}%,staff_name.ilike.%${q}%`);

    const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
    if (error) return res.status(500).json({ ok: false, error: error.message });

    return res.json({ ok: true, data: data || [] });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Unexpected error' });
  }
});

/* ---------------- HISTORY: GET /api/leaves/history ---------------- */
router.get('/api/leaves/history', async (req, res) => {
  const { start, end, staff_user_id } = req.query;
  let q = db.from('leave_requests').select('*');

  if (staff_user_id) q = q.eq('staff_user_id', Number(staff_user_id));
  if (start) q = q.gte('date', start);
  if (end) q = q.lte('date', end);

  const { data, error } = await q.order('date', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ ok: true, rows: data || [] });
});

/* ---------------- STATUS UPDATE ENDPOINTS ---------------- */
router.patch('/api/leaves/:id/status', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rawStatus = req.body?.status;
    const remarks = (req.body?.remarks || '').trim();

    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const status = normStatus(rawStatus);
    
    // ✅ Update validation to check for 'disapproved' instead of 'denied'
    if (status === 'disapproved' && !remarks) {
      return res.status(400).json({ error: 'Remarks are required when disapproving a request.' });
    }

    const patch = {
      status,
      admin_remarks: remarks || null,
      // ✅ Also finalize when disapproved
      finalized_at: (status === 'approved' || status === 'disapproved') ? new Date().toISOString() : null
    };

    const { data, error } = await db.from('leave_requests')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message || 'Update failed' });

    const title = (status === 'approved') ? 'Leave Approved' :
      (status === 'disapproved') ? 'Leave Disapproved' : 'Leave Updated';
    const message = (status === 'disapproved' && remarks)
      ? `Your leave request was disapproved. Reason: ${remarks}`
      : `Your leave request status is now: ${status}`;

    await safeNotify({ staff_user_id: data.staff_user_id || null, title, message, link: '' });
    res.json({ ok: true, record: data });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unexpected error' });
  }
});

// Shortcuts
router.post('/api/leaves/:id/approve', async (req, res) => {
  req.body = { status: 'approved', remarks: (req.body?.remarks || '').trim() };
  return router.handle(req, res);
});
router.post('/api/leaves/:id/deny', async (req, res) => {
  req.body = { status: 'denied', remarks: (req.body?.remarks || '').trim() };
  return router.handle(req, res);
});
router.post('/api/leaves/status', async (req, res) => {
  const id = Number(req.body?.id);
  if (!id) return res.status(400).json({ error: 'id is required' });
  req.params = { id: String(id) };
  return router.handle(req, res);
});
router.post('/api/leaves/:id/status', async (req, res) => {
  try {
    req.params = { id: String(req.params.id) };
    return router.handle(req, res);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Unexpected error' });
  }
});

/* ---------------- Drafts ---------------- */
const DRAFTS_PATH = path.join(__dirname, '..', 'leave_drafts.json');
function readDrafts() { try { return JSON.parse(fs.readFileSync(DRAFTS_PATH, 'utf8')) || []; } catch { return []; } }
function writeDrafts(arr) { fs.writeFileSync(DRAFTS_PATH, JSON.stringify(arr, null, 2)); }

router.get('/api/leaves/drafts', (req, res) => {
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

router.post('/api/leaves/drafts', (req, res) => {
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

router.delete('/api/leaves/drafts/:id', (req, res) => {
  const id = String(req.params.id || '').trim();
  const left = readDrafts().filter(d => String(d.id) !== id);
  writeDrafts(left);
  return res.json({ ok: true, deleted: id });
});

module.exports = router;