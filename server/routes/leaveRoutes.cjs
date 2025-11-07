// backend/routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db.cjs');
const { createClient } = require('@supabase/supabase-js');

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/* ---------------- Files / Uploads ---------------- */
const UPLOAD_DIR = path.join(__dirname, '..', 'leave_files');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

router.use('/leave-files', express.static(UPLOAD_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safe = (file.originalname || 'proof.pdf').replace(/[^\w.-]+/g, '_');
      cb(null, `${stamp}__${safe}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /pdf$/i.test(file.mimetype) || /\.pdf$/i.test(file.originalname || '');
    cb(ok ? null : new Error('PDF files only'));
  },
});

/* ---------------- Helpers ---------------- */
function toISODate(d) {
  const x = new Date(d);
  if (Number.isNaN(+x)) return null;
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
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

/* ---------------- CREATE: POST /api/leaves ---------------- */
async function insertRow(req, res) {
  try {
    const { staff_user_id, staff_name, date, reason, status } = req.body || {};
    
    // Validate required fields
    if (!staff_name || !date || !reason) {
      console.error('Missing required fields:', { staff_name, date, reason });
      return res.status(400).json({ error: 'staff_name, date, and reason are required.' });
    }

    const iso = toISODate(date);
    if (!iso) {
      console.error('Invalid date format:', date);
      return res.status(400).json({ error: 'Invalid date format.' });
    }

    // accept both req.file (single) and req.files (any) safely
    const fileObj = req.file || (Array.isArray(req.files) && req.files[0]) || null;

    // 1) upload proof to Supabase Storage → file_url
    let file_url = null;
    if (fileObj) {
      const bucket = process.env.LEAVE_PROOF_BUCKET || 'leave-proofs'; // create/public
      const key = `${(staff_user_id || 'anon')}/${iso}/${fileObj.filename}`;
      const filePath = path.join(UPLOAD_DIR, fileObj.filename);
      const buffer = fs.readFileSync(filePath);
      const { error: upErr } = await supa
        .storage
        .from(bucket)
        .upload(key, buffer, { contentType: 'application/pdf', upsert: true });

      if (upErr) {
        // fallback: keep local file if upload fails
        file_url = `/api/leaves/leave-files/${fileObj.filename}`;
      } else {
        const { data: pub } = supa.storage.from(bucket).getPublicUrl(key);
        file_url = pub?.publicUrl || null;
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    const payload = {
      staff_user_id: staff_user_id ? Number(staff_user_id) : null, // optional legacy field
      staff_name,
      date: iso,
      reason,
      file_url,                                 // proof in Supabase storage
      leave_form_url: (req.body?.leave_form_url || null),  // GDrive Sheet/XLSX URL
      status: normStatus(status || 'pending-admin'),
      created_at: new Date().toISOString(),
      archived: false
    };

    const { data, error } = await db.from('leave_requests').insert([payload]).select().single();
    if (error) {
      console.error('Database insert error:', error);
      if (fileObj) {
        try { fs.unlinkSync(path.join(UPLOAD_DIR, fileObj.filename)); } catch {}
      }
      return res.status(500).json({ error: error.message || 'Insert failed', details: error });
    }

    console.log('Leave request created successfully:', data.id);
    return res.status(201).json({ ok: true, record: data });
  } catch (err) {
    console.error('Unexpected error in insertRow:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}

// Accepts both raw JSON and multipart form-data (any field name)
router.post('/api/leaves', (req, res) => {
  const ct = (req.headers['content-type'] || '').toLowerCase();
  if (ct.startsWith('multipart/form-data')) {
    // accept multiple possible field names: proof/attachment/file/files[]
    upload.any()(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message || 'Upload error' });
      return insertRow(req, res);
    });
  } else {
    return insertRow(req, res);
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
    if (status === 'denied' && !remarks) {
      return res.status(400).json({ error: 'Remarks are required when denying a request.' });
    }

    const patch = {
      status,
      admin_remarks: remarks || null,
      finalized_at: (status === 'approved' || status === 'denied') ? new Date().toISOString() : null
    };

    const { data, error } = await db.from('leave_requests')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message || 'Update failed' });

    const title = (status === 'approved') ? 'Leave Approved' :
                  (status === 'denied') ? 'Leave Denied' : 'Leave Updated';
    const message = (status === 'denied' && remarks)
      ? `Your leave request was denied. Reason: ${remarks}`
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

/* ---------------- Drafts (unchanged except path) ---------------- */
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
  const { staff_user_id, staff_name, fields, saved_at } = req.body || {};
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
