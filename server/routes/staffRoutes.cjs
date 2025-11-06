// routes/staffRoutes.js (Supabase version)
console.log('staffRoutes loaded');
const express = require('express');
const router = express.Router();

// ✅ db is your Supabase client from ../db (no variable rename)
const db = require('../db.cjs');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ensurePinForStaffId } = require('../services/pinConverter.cjs'); // Idagdag ang .cjs

// Additional upload configuration for in-memory files
// We use this for routes that need to process files immediately (e.g., sending to an LLM)
const memoryStorage = multer.memoryStorage();
const memUpload = multer({ storage: memoryStorage });

// Use the global fetch provided by Node.js (v18+). No import required.
const fetch = global.fetch;

/* =================
   Uploads (same)
   ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', '..', 'uploads', 'avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const staffId = req.params.staff_id || 'user';
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${staffId}-${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

// -- helpers for Activity History --
async function getStaffRowByStaffId(staff_id) {
  const { data, error } = await db
    .from('staff_users')
    .select('id, staff_id, name, role')
    .eq('staff_id', staff_id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function logActivity({ staff_id, action, details = {}, actor = {} }) {
  const row = await getStaffRowByStaffId(staff_id);
  if (!row) return; // silently ignore if not found

  const payload = {
    staff_user_id: row.id,
    staff_id,
    action,
    details,
    actor_staff_id: actor.sid || null,
    actor_role: actor.role || null
  };

  const { error } = await db.from('account_activity').insert(payload);
  if (error) console.error('logActivity error:', error);
}

// Build the next staff_id like "69-2025-0035" using the largest suffix
// for the CURRENT YEAR across ALL prefixes (global counter per year).
async function generateNextStaffId(prefix2) {
  const year = String(new Date().getFullYear());

  // Pull a reasonable slice of the year's IDs; we’ll compute the max suffix in code.
  // Pattern "%-YYYY-%" = any prefix length (2–6 per our rule) for the current year.
  const { data, error } = await db
    .from('staff_users')
    .select('staff_id')
    .like('staff_id', `%-${year}-%`)
    .order('staff_id', { ascending: false })
    .limit(2000);

  if (error) throw error;

  let maxSuffix = 0;
  for (const r of (data || [])) {
    const parts = String(r.staff_id || '').split('-'); // ["69","2025","0034"]
    if (parts[1] === year && /^\d{4}$/.test(parts[2] || '')) {
      const n = parseInt(parts[2], 10);
      if (n > maxSuffix) maxSuffix = n;
    }
  }

  const next = maxSuffix + 1;
  const suffix = String(next).padStart(4, '0');
  return `${prefix2}-${year}-${suffix}`;
}



/* =================
   JWT helpers (same)
   ================= */
function signUser(u) {
  return jwt.sign(
    { sid: u.staff_id, role: u.role || u.employee_type || 'Staff', name: u.name },
    JWT_SECRET, { expiresIn: JWT_EXPIRES_IN }
  );
}
function getBearer(req) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}
function verifyToken(req, res, next) {
  const token = getBearer(req);
  if (!token) return res.status(401).json({ message: 'Missing token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: 'Invalid/expired token' }); }
}
function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

/* =================
   Anti-brute force (same logic)
   ================= */
const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);
const WINDOW_MS = Number(process.env.LOGIN_WINDOW_MS || 15 * 60 * 1000);
const LOCK_MS = Number(process.env.LOGIN_LOCK_MS || 30 * 60 * 1000);
const attempts = new Map();
const now = () => Date.now();
function keyFor(req, staff_id) {
  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').toString();
  return `${(staff_id || '').trim().toLowerCase()}|${ip}`;
}
function getBucket(req, staff_id) {
  const k = keyFor(req, staff_id);
  let b = attempts.get(k);
  const t = now();
  if (!b) { b = { count: 0, first: t, lockUntil: 0 }; attempts.set(k, b); }
  if (t - b.first > WINDOW_MS) { b.count = 0; b.first = t; b.lockUntil = 0; }
  return { bucket: b, key: k };
}

/* =================
   AUTH
   ================= */

// POST /auth/login
router.post('/auth/login', async (req, res) => {
  const { staff_id, password } = req.body || {};
  if (!staff_id || !password) return res.status(400).json({ message: 'staff_id and password required' });

  const { bucket, key } = getBucket(req, staff_id);
  const t = now();
  if (bucket.lockUntil && t < bucket.lockUntil) {
    const retryIn = Math.ceil((bucket.lockUntil - t) / 1000);
    res.set('Retry-After', String(retryIn));
    return res.status(429).json({ message: `Too many attempts. Try again in ${retryIn}s.`, lock_until: bucket.lockUntil });
  }

  const { data: u, error } = await db
    .from('staff_users')
    .select('*')
    .eq('staff_id', staff_id)
    .maybeSingle();

  if (error) return res.status(500).json({ message: 'Database error' });

  const hashed = u?.password || '';
  let ok = false;
  try { ok = await bcrypt.compare(password, hashed); } catch { /* noop */ }

  if (!u || !ok) {
    bucket.count += 1;
    if (bucket.count >= MAX_ATTEMPTS) bucket.lockUntil = now() + LOCK_MS;
    const left = Math.max(0, MAX_ATTEMPTS - bucket.count);
    res.set('X-RateLimit-Remaining-Logins', String(left));
    const msg = left > 0 ? `Invalid credentials. ${left} attempt(s) left.` :
      `Too many attempts. Locked for ${Math.ceil(LOCK_MS / 60000)} minutes.`;
    return res.status(left > 0 ? 401 : 429).json({ message: msg, attempts_left: left, lock_until: bucket.lockUntil || null });
  }

  attempts.delete(key);
  const user = {
    staff_id: u.staff_id,
    name: u.name,
    email: u.email,
    role: u.role || u.employee_type || 'Staff',
    department: u.department || null,
    photo_url: u.photo_url || null
  };
  const token = signUser(user);
  res.json({ token, user });
});

// GET /auth/me
router.get('/auth/me', verifyToken, async (req, res) => {
  const { data: u, error } = await db
    .from('staff_users')
    .select('staff_id, name, role, email, employee_type, department, contact_number, photo_url')
    .eq('staff_id', req.user.sid)
    .maybeSingle();

  if (error) return res.status(500).json({ message: 'DB error' });
  if (!u) return res.status(404).json({ message: 'User not found' });

  res.json({
    sid: u.staff_id,
    staff_id: u.staff_id,
    name: u.name,
    role: u.role,
    email: u.email,
    employee_type: u.employee_type || null,
    department: u.department || null,
    contact_number: u.contact_number || null,
    phone: u.contact_number || null,
    photo_url: u.photo_url || null
  });
});

/* =========================
   ADMIN / VP / ICTO
   ========================= */

// GET /staff (alias for backward compatibility)
router.get('/staff', async (req, res) => {
  const { data, error } = await db
    .from('staff_users')
    .select('id, staff_id, name, email, department, employee_type, role, contact_number, photo_url, created_at')
    .order('staff_id', { ascending: true });

  if (error) return res.status(500).json({ error: 'Database error' });

  const shaped = (data || []).map(r => ({
    id: r.id,
    staff_id: r.staff_id,
    name: r.name,
    email: r.email,
    department: r.department,
    employee_type: r.employee_type,
    role: r.role,
    contact_no: r.contact_number,
    avatar_url: r.photo_url,
    created_at: r.created_at
  }));
  return res.json(shaped);
});

// GET /users
router.get('/users',
  verifyToken, requireRole('Admin', 'Vice President', 'ICTO'),
  async (req, res) => {
    const { data, error } = await db
      .from('staff_users')
      .select('staff_id, name, employee_type, department, role, email, contact_number, photo_url, created_at')
      .order('staff_id', { ascending: true });

    if (error) return res.status(500).json({ error: 'Database error' });

    const shaped = (data || []).map(r => ({ ...r, phone: r.contact_number ?? null }));
    return res.json(shaped);
  }
);

// POST /users (create)
router.post('/users',
  verifyToken, requireRole('Admin', 'Vice President', 'ICTO'),
  async (req, res) => {
    try {
      let {
        staff_id,               // optional full id: 00-YYYY-####
        staff_id_prefix,        // optional 2-digit prefix: 00
        name, email, password,
        role, employee_type, department, contact_number, status
      } = req.body || {};

      // Must have name/email/password and either role or employee_type.
      // For the ID, you can provide either a full staff_id OR a 2-digit staff_id_prefix.
      if (!name || !email || !password || !(role || employee_type) || !(staff_id || staff_id_prefix)) {
        return res.status(400).json({ message: 'staff_id or staff_id_prefix, name, email, password, and role/employee_type are required' });
      }

      const prefixRe = /^[A-Za-z0-9]{2,6}$/;
      let finalStaffId = staff_id;

      if (!finalStaffId && prefixRe.test(staff_id_prefix || '')) {
        finalStaffId = await generateNextStaffId(staff_id_prefix);
      }

      if (!finalStaffId) {
        return res.status(400).json({ message: 'Invalid staff_id / staff_id_prefix' });
      }


      // ---- Canonicalize role + department (same logic as before) ----
      const r0 = String(role || employee_type || '').trim();
      const r = r0.toLowerCase();
      let dbRole = r0;
      let empType = r0;
      let dept = (department || '').trim();

      const COLLEGE_MAP = {
        CCS: 'CCS - College of Computer Studies',
        CAS: 'CAS - College of Arts and Sciences',
        CHS: 'CHS - College of Health Sciences',
        CCJ: 'CCJ - College of Criminal Justice',
        CBA: 'CBA - College of Business Administration',
        CED: 'CED - College of Education',
        NTSP: 'NTSP - National Service Training Program'
      };
      const STAFF_WHITELIST = ['Canteen', 'Cleaning Services', 'Clinic', 'Library', 'Security'];
      const isCollege = (d) => !!d && (
        /college/i.test(d) ||
        Object.values(COLLEGE_MAP).includes(d) ||
        Object.prototype.hasOwnProperty.call(COLLEGE_MAP, d)
      );

      if (r.includes('hr') && r.includes('head')) {
        dbRole = 'Admin'; empType = 'HR Head Admin'; dept = 'HR Office';
      } else if (r.includes('hr') && r.includes('staff')) {
        dbRole = 'Staff'; empType = 'HR Staff'; dept = 'HR Office';
      } else if (r.includes('vice')) {
        dbRole = 'Vice President'; empType = 'Vice President'; dept = 'Organization';
      } else if (r.includes('icto')) {
        dbRole = 'ICTO'; empType = 'ICTO'; dept = 'ICTO';
      } else if (r.includes('faculty') || r.includes('prof')) {
        dbRole = 'Faculty'; empType = 'Faculty';
        if (!isCollege(dept)) {
          if (Object.prototype.hasOwnProperty.call(COLLEGE_MAP, dept)) dept = COLLEGE_MAP[dept];
          if (!isCollege(dept)) dept = '';
        }
      } else if (r === 'admin' || r.includes('administrator')) {
        dbRole = 'Admin'; empType = 'HR Head Admin'; dept = 'HR Office';
      } else if (r.includes('staff')) {
        dbRole = 'Staff'; empType = 'Staff';
        if (!STAFF_WHITELIST.find(x => x.toLowerCase() === dept.toLowerCase())) dept = '';
      }

      const hash = await bcrypt.hash(password, 10);

      const insertPayload = {
        staff_id: finalStaffId,
        name,
        email,
        password: hash,
        role: dbRole,
        employee_type: empType,
        department: dept || null,
        contact_number: contact_number || null,
        photo_url: null
      };

      // Insert with a simple “retry once” in case two admins create at the same time
      let { data: created, error: insErr, status: insCode } = await db
        .from('staff_users')
        .insert(insertPayload)
        .select()
        .single();

      if (insErr && insErr.code === '23505' && prefixRe.test(staff_id_prefix || '')) {
        // regenerate and retry once
        insertPayload.staff_id = await generateNextStaffId(staff_id_prefix);
        ({ data: created, error: insErr, status: insCode } = await db
          .from('staff_users')
          .insert(insertPayload)
          .select()
          .single());
      }

      if (insErr) {
        console.error('Create user failed:', insErr);
        return res.status(insCode || 500).json({ message: 'Failed to create account' });
      }

      // Log: account created
      try {
        await logActivity({
          staff_id: created.staff_id,
          action: 'create',
          details: { name, email, role: dbRole, dept },
          actor: req.user || {}
        });
      } catch (e) { /* non-fatal */ }

      // === NEW: Generate/confirm biometric PIN for this new account ===
      let device_pin = null;
      try {
        const sid = (created && created.staff_id) ? created.staff_id : insertPayload.staff_id;
        device_pin = await ensurePinForStaffId(String(sid));
      } catch (e) {
        console.warn('PIN ensure failed:', e.message);
      }

      return res.status(201).json({ ...created, device_pin });

    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /users/:staff_id/device-pin  → ensure & return a PIN for biometric enrollment
router.post(
  '/users/:staff_id/device-pin',
  verifyToken, requireRole('Admin', 'Vice President', 'ICTO'),
  async (req, res) => {
    try {
      const staffId = String(req.params.staff_id || '').trim();
      if (!staffId) return res.status(400).json({ message: 'Missing staff_id' });

      const pin = await ensurePinForStaffId(staffId);
      return res.json({ staff_id: staffId, device_pin: pin });
    } catch (e) {
      console.error('device-pin error:', e);
      return res.status(400).json({ message: e.message || 'Failed to generate PIN' });
    }
  }
);


// GET /users/:staff_id
router.get('/users/:staff_id',
  verifyToken, requireRole('Admin', 'Vice President', 'ICTO'),
  async (req, res) => {
    const id = req.params.staff_id;
    const { data: r, error } = await db
      .from('staff_users')
      .select('staff_id, name, employee_type, department, role, email, photo_url, contact_number')
      .eq('staff_id', id)
      .maybeSingle();

    if (error) return res.status(500).json({ message: 'Database error' });
    if (!r) return res.status(404).json({ message: 'User not found' });

    return res.json({
      staff_id: r.staff_id, name: r.name,
      role: r.role || r.employee_type, employee_type: r.employee_type,
      department: r.department, email: r.email,
      contact_number: r.contact_number ?? null,
      phone: r.contact_number ?? null,
      photo_url: r.photo_url,
    });
  }
);

// GET /users/:staff_id/activity?limit=100
router.get('/users/:staff_id/activity',
  verifyToken, requireRole('Admin', 'Vice President', 'ICTO'),
  async (req, res) => {
    const staffId = String(req.params.staff_id);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '100', 10), 1), 500);

    const row = await getStaffRowByStaffId(staffId);
    if (!row) return res.status(404).json({ message: 'User not found' });

    const { data, error } = await db
      .from('account_activity')
      .select('action, details, actor_staff_id, actor_role, created_at')
      .eq('staff_user_id', row.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return res.status(500).json({ message: 'Database error' });

    return res.json(data || []);
  }
);


// PATCH /users/:staff_id  (self or elevated)
router.patch(
  '/users/:staff_id',
  verifyToken,
  upload.single('avatar'),
  async (req, res) => {
    try {
      const targetId = String(req.params.staff_id);
      const me = req.user || {};
      const isSelf = String(me.sid) === targetId;
      const isElevated = ['Admin', 'ICTO'].includes(me.role);
      if (!isSelf && !isElevated) return res.status(403).json({ message: 'Forbidden' });

      const update = {};

      if (req.body?.email !== undefined) update.email = String(req.body.email || '').trim();
      if (req.body?.contact_number !== undefined) update.contact_number = String(req.body.contact_number || '').trim();
      if (req.body?.password) update.password = await bcrypt.hash(String(req.body.password), 10);
      if (req.file) update.photo_url = `/uploads/avatars/${req.file.filename}`;

      if (!Object.keys(update).length) return res.status(400).json({ message: 'Nothing to update' });

      const { error, data } = await db
        .from('staff_users')
        .update(update)
        .eq('staff_id', targetId)
        .select('staff_id');

      if (error) return res.status(500).json({ message: 'Database error' });

      // If password was part of the update, log it.
      // Distinguish reset vs general change (simple heuristic).
      try {
        if (req.body?.password) {
          const isResetToDefault = String(req.body.password) === 'default123' && ['Admin', 'ICTO'].includes(req.user?.role);
          await logActivity({
            staff_id: targetId,
            action: isResetToDefault ? 'password_reset' : 'password_change',
            details: { reason: isResetToDefault ? 'reset_to_default' : 'manual_change' },
            actor: req.user || {}
          });
        }
      } catch (e) { /* non-fatal */ }

      return res.json({ message: 'Updated', changed: (data || []).length });

    } catch (e) {
      console.error(e);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/* =========================
   MOBILE (aligned to your schema)
   =========================
   NOTE: your DB has table "staff_device_map" with columns:
         - staff_id (PK, FK -> staff_users.staff_id)
         - device_pin (string)
   We will treat "deviceId" coming from the app as the "device_pin".
*/

// POST /mobile/register
router.post('/mobile/register', async (req, res) => {
  const { name, employeeId, deviceId } = req.body || {};
  if (!name || !employeeId || !deviceId) {
    return res.status(400).json({ message: 'name, employeeId, deviceId required' });
  }

  // upsert mapping to staff_device_map (device_pin)
  const { error } = await db
    .from('staff_device_map')
    .upsert({ staff_id: employeeId, device_pin: deviceId }, { onConflict: 'staff_id' });

  if (error) {
    // If FK fails, staff_id doesn't exist
    if (error.code === '23503') return res.status(400).json({ message: 'Unknown staff_id' });
    return res.status(500).json({ message: 'Failed to register device' });
  }
  return res.status(201).json({ message: 'Device registered' });
});

/* =================
   LLM Integration
   ================= */
// POST /llm/parse-form
// This endpoint accepts an image and uses Groq's multimodal model to extract
// structured information required for the “Create Account” form. It requires
// authentication and is restricted to roles that can create accounts. It
// expects a single file field named `image`. The response will be a JSON
// object with keys: name, email, faculty_number, department, phone, status.
router.post(
  '/llm/parse-form',
  verifyToken,
  requireRole('Admin', 'Vice President', 'ICTO'),
  memUpload.single('image'),
  async (req, res) => {
    try {
      // Validate input
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: 'image file required' });
      }
      // Convert the image buffer to a base64 data URI
      const mime = file.mimetype || 'image/png';
      const base64 = file.buffer.toString('base64');
      const dataUri = `data:${mime};base64,${base64}`;

      // Prepare the messages for the Groq API. We instruct the model to
      // extract the required fields. If any field is missing in the image,
      // the model should provide an empty string for that field. The
      // response_format is set to json_object so that the model returns
      // a strict JSON object instead of free-form text.
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'The following image contains text describing a university staff or faculty member. ' +
                'Extract the following fields and output them as a JSON object with these exact keys: ' +
                'name, email, faculty_number, department, phone, status, role. ' +   // <— added role
                'If a field is not present, set its value to an empty string. Do not include any additional keys.',
            },
            { type: 'image_url', image_url: { url: dataUri } }
          ],
        }
      ];

      // Call the Groq chat completion endpoint. We use a multimodal model that
      // supports both images and JSON responses. The API key is read from
      // environment variables. Adjust the max_completion_tokens if needed.
      const groqReqBody = {
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: messages,
        max_completion_tokens: 512,
        response_format: { type: 'json_object' },
      };
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify(groqReqBody),
      });

      if (!groqRes.ok) {
        const text = await groqRes.text().catch(() => '');
        return res.status(500).json({ message: 'LLM request failed', status: groqRes.status, body: text });
      }
      const groqJson = await groqRes.json();
      // The Groq API returns choices array with messages. Extract the content.
      const content = groqJson?.choices?.[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: 'Invalid LLM response', response: groqJson });
      }
      let parsed;
      try { parsed = JSON.parse(content); }
      catch { return res.status(500).json({ message: 'Failed to parse JSON from LLM', raw: content }); }
      const out = {
        name: parsed.name ?? '',
        email: parsed.email ?? '',
        faculty_number: parsed.faculty_number ?? '',
        department: parsed.department ?? '',
        phone: parsed.phone ?? '',
        status: parsed.status ?? '',
        role: parsed.role ?? ''
      };
      return res.json(out);
    } catch (e) {
      console.error('LLM parse error:', e);
      return res.status(500).json({ message: 'Unexpected server error', error: e.message || e.toString() });
    }
  },
);
// POST /attendance
router.post('/attendance', async (req, res) => {
  const { employeeId, deviceId, beaconId, timestamp } = req.body || {};
  if (!employeeId || !deviceId || !beaconId || !timestamp) {
    return res.status(400).json({ message: 'employeeId, deviceId, beaconId, timestamp required' });
  }

  // validate device assignment
  const { data: mapRow, error: mapErr } = await db
    .from('staff_device_map')
    .select('staff_id, device_pin')
    .eq('staff_id', employeeId)
    .eq('device_pin', deviceId)
    .maybeSingle();

  if (mapErr) return res.status(500).json({ message: 'Database error (validate)' });
  if (!mapRow) return res.status(403).json({ message: 'Device does not belong to employee' });

  // insert attendance log; your table has both deviceId & beacon_id columns
  const payload = {
    staff_id: employeeId,
    deviceId,                 // keep camelCase column since it exists in your schema
    beacon_id: beaconId,      // snake
    beaconId,                 // camel (exists)
    timestamp: new Date(timestamp).toISOString(),
    attendance_status: 'incomplete_mobile',
    status: 'mobile',
    notification_sent: false
  };

  const { error: insErr } = await db.from('attendance_logs').insert(payload);
  if (insErr) return res.status(500).json({ message: 'Failed to save attendance' });

  res.status(201).json({ message: 'Attendance logged' });
});

/* =========================
   LEAVE CREDITS (fixed for Supabase schema)
   ========================= */

// helper: get staff_users.id from a staff_id string
async function getStaffUserRow(staff_id) {
  const { data, error } = await db
    .from('staff_users')
    .select('id, staff_id, name, role, employee_type')
    .eq('staff_id', staff_id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

// helper: get an Admin/HR password hash to verify the HR Head password
async function findHrHeadHash() {
  const specificId = process.env.HR_HEAD_STAFF_ID;   // e.g. 23-2025-0001
  if (specificId) {
    // try staff_users first
    let { data: su, error } = await db
      .from('staff_users').select('password').eq('staff_id', specificId).maybeSingle();
    if (!error && su?.password) return su.password;

    // fall back to user_accounts (if passwords are there)
    let r2 = await db.from('user_accounts').select('password').eq('staff_id', specificId).maybeSingle();
    if (!r2.error && r2.data?.password) return r2.data.password;

    throw new Error('HR_HEAD_STAFF_ID not found');
  }

  // no explicit HR head: pick first Admin
  let r = await db.from('staff_users')
    .select('password, role, employee_type').or('role.eq.Admin,employee_type.eq.Admin')
    .limit(1).maybeSingle();
  if (!r.error && r.data?.password) return r.data.password;

  // fall back user_accounts Admin
  let r3 = await db.from('user_accounts').select('password, role').eq('role', 'Admin')
    .limit(1).maybeSingle();
  if (!r3.error && r3.data?.password) return r3.data.password;

  throw new Error('No HR Head/Admin account with password found');
}

// helper: compute accrued credits since accrual_start_date at a fixed monthly rate
function computeAccruedCredits(accrual_start_date, per_month_rate, used_credits) {
  if (!accrual_start_date || !per_month_rate) return 0;
  const start = new Date(accrual_start_date + 'T00:00:00');
  const now = new Date();

  // months between start and now (approx by year/month diff; daily proration isn’t needed per spec)
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());

  // if we've reached (or passed) the start-day in the current month, count this month too
  if (now.getDate() >= start.getDate()) months += 1;
  if (months < 0) months = 0;

  const accrued = months * Number(per_month_rate || 0);
  const used = Number(used_credits || 0);
  return Math.max(0, accrued - used);
}

/** GET /api/leave/:staff_id
 *  Returns computed balance + raw fields.
 *  Fallback: if table user_accounts is missing, try reading from staff_users instead.
 */
router.get('/leave/:staff_id',
  verifyToken,
  requireRole('Admin', 'Vice President', 'ICTO'),
  async (req, res) => {
    try {
      const staffId = String(req.params.staff_id);
      const su = await getStaffUserRow(staffId);
      if (!su) return res.status(404).json({ message: 'User not found' });

      let eligible = false;
      let leave_credits = 0;
      let accrual_start_date = null;
      let per_month_rate = 2.5;
      let used_credits = 0;

      // --- primary: user_accounts
      try {
        const r = await db
          .from('user_accounts')
          .select('leave_eligible, leave_credits, accrual_start_date, per_month_rate, used_credits')
          .eq('staff_user_id', su.id)
          .maybeSingle();
        if (r.data) {
          eligible = !!r.data.leave_eligible;
          leave_credits = Number(r.data.leave_credits || 0);
          accrual_start_date = r.data.accrual_start_date || null;
          per_month_rate = Number(r.data.per_month_rate ?? 2.5);
          used_credits = Number(r.data.used_credits || 0);
        }
      } catch { /* ignore */ }

      // --- fallback: staff_users columns (if they exist)
      if (!eligible && !accrual_start_date) {
        try {
          const r2 = await db
            .from('staff_users')
            .select('leave_eligible, leave_credits, accrual_start_date, per_month_rate, used_credits')
            .eq('id', su.id)
            .maybeSingle();
          if (r2.data) {
            eligible = !!r2.data.leave_eligible || eligible;
            leave_credits = Number(r2.data.leave_credits || leave_credits);
            accrual_start_date = r2.data.accrual_start_date || accrual_start_date;
            per_month_rate = Number(r2.data.per_month_rate ?? per_month_rate);
            used_credits = Number(r2.data.used_credits || used_credits);
          }
        } catch { /* ignore */ }
      }

      // --- FINAL fallback: infer from account_activity (works even with RLS on user_accounts)
      if (!eligible) {
        try {
          const { data: acts } = await db
            .from('account_activity')
            .select('action, details, created_at')
            .eq('staff_user_id', su.id)
            .order('created_at', { ascending: false })
            .limit(5);
          const act = (acts || []).find(a => a.action === 'leave_activate');
          if (act) {
            eligible = true;
            const d = act.details || {};
            per_month_rate = Number(d.per_month_rate ?? per_month_rate);
            accrual_start_date =
              d.accrual_start_date ||
              (act.created_at ? String(act.created_at).slice(0, 10) : accrual_start_date);
          }
        } catch { /* ignore */ }
      }

      // compute running balance
      const computeAccrued = (startDate, rate, used) => {

        if (!startDate) return Number(leave_credits || 0);
        const sd = new Date(startDate + 'T00:00:00Z');
        if (isNaN(sd)) return Number(leave_credits || 0);
        const now = new Date();
        let months = (now.getUTCFullYear() - sd.getUTCFullYear()) * 12 +
          (now.getUTCMonth() - sd.getUTCMonth());
        if (now.getUTCDate() >= sd.getUTCDate()) months += 1;
        months = Math.max(0, months);
        const accrued = months * Number(rate || 0);
        return Math.max(0, accrued - Number(used || 0));
      };

      const computed = computeAccrued(accrual_start_date, per_month_rate, used_credits);


      return res.json({
        leave_eligible: eligible ? 1 : 0,
        computed_credits: computed,
        leave_credits,
        accrual_start_date,
        per_month_rate,
        used_credits
      });
    } catch (e) {
      console.error('GET /leave/:staff_id failed:', e);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);


// POST /api/leave/activate


router.post('/leave/activate',
  verifyToken,
  requireRole('Admin', 'Vice President', 'ICTO'),
  async (req, res) => {
    try {
      const { staff_id, hr_password } = req.body || {};
      if (!staff_id || !hr_password) {
        return res.status(400).json({ error: 'Missing staff_id or hr_password' });
      }

      // Verify HR Head password
      const hash = await findHrHeadHash();
      let ok = false;
      try {
        ok = /^\$2[aby]\$/.test(hash) ? await bcrypt.compare(hr_password, hash) : (hr_password === hash);
      } catch { ok = false; }
      if (!ok) return res.status(401).json({ error: 'Invalid HR Head password' });

      const su = await getStaffUserRow(staff_id);
      if (!su) return res.status(404).json({ error: 'User not found' });

      const today = new Date().toISOString().slice(0, 10);

      // Try upsert into user_accounts first
      let okUA = false;
      try {
        const { error } = await db.from('user_accounts').upsert({
          staff_user_id: su.id,
          staff_id,
          leave_eligible: true,
          // keep a historical "stored" bucket; computed one comes from rate/dates
          leave_credits: 0,
          per_month_rate: 2.5,
          accrual_start_date: today,
          used_credits: 0
        }, { onConflict: 'staff_user_id' });

        if (!error) okUA = true;
        else console.error('activate upsert failed:', error);
      } catch (e) {
        console.error('activate upsert threw:', e);
      }

      if (!okUA) {
        try { await db.from('staff_users').update({ leave_eligible: true }).eq('id', su.id); } catch { }


        try {
          await db.from('staff_users').update({
            leave_credits: 0,
            per_month_rate: 2.5,
            accrual_start_date: today,
            used_credits: 0
          }).eq('id', su.id);
        } catch { }
      }

      // Optional: mark user type
      try {
        await db.from('staff_users').update({ employee_type: 'Regular / Full-Time' }).eq('id', su.id);
      } catch { }

      // Activity log (best-effort)
      try {
        await logActivity({
          staff_id,
          action: 'leave_activate',
          details: { per_month_rate: 2.5, accrual_start_date: today },
          actor: req.user || {}
        });
      } catch { }

      return res.json({ message: 'activated' });
    } catch (e) {
      console.error('POST /leave/activate failed:', e);
      return res.status(500).json({ error: 'Server error' });
    }
  }
);


module.exports = router;