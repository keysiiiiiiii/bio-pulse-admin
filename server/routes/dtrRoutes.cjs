// server/routes/dtrRoutes.cjs — FULL DROP-IN
console.log('🔵 [DTR] Loading dtrRoutes.cjs...');

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const axios = require('axios');

console.log('🔵 [DTR] Express Router created');

// ====== ENV / CONFIG ======
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_FALLBACK = process.env.DTR_BUCKET || 'dtr';
const BUCKET_PRIMARY = process.env.DTR_BUCKET_NEW || BUCKET_FALLBACK;

const DTR_FILES_HAS_BUCKET = String(process.env.DTR_FILES_HAS_BUCKET || 'false') === 'true';
const DTR_RENDERER = String(process.env.DTR_RENDERER || 'pdfkit'); // 'pdfkit' | 'html'

// ====== Supabase admin client ======
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for DTR routes');
}
const supaAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const db = supaAdmin;
const storage = supaAdmin.storage;

// ====== Helpers ======
const pad2 = (n) => String(n).padStart(2, '0');

async function ensureBucketExists(bucket) {
  try {
    const { data } = await storage.getBucket(bucket);
    if (data) return;
  } catch (_) { /* continue */ }
  const { error } = await storage.createBucket(bucket, { public: false, fileSizeLimit: '50MB' });
  if (error && !/already exists/i.test(error.message || '')) {
    throw new Error('Failed to create bucket: ' + error.message);
  }
}

async function signOrPublic(bucket, path) {
  // Always try to sign — works for both public and private buckets.
  const { data, error } = await storage.from(bucket).createSignedUrl(path, 60 * 15);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'signing failed');
  return data.signedUrl;
}


function canonicalFileInfo(staff_id, year, month) {
  const y = Number(year), m = Number(month);
  const filename = `DTR-${staff_id}-${y}-${pad2(m)}.pdf`;
  const folder = `${staff_id}/${y}/${pad2(m)}`;
  const fullpath = `${folder}/${filename}`;
  return { filename, folder, fullpath };
}

async function getStaffRow({ staff_user_id, staff_id }) {
  if (staff_user_id) {
    const { data, error } = await db
      .from('staff_users')
      .select('id, staff_id, name, department, employee_type, role')
      .eq('id', staff_user_id).single();
    if (!error && data) return data;
  }
  if (staff_id) {
    const { data, error } = await db
      .from('staff_users')
      .select('id, staff_id, name, department, employee_type, role')
      .eq('staff_id', staff_id).single();
    if (!error && data) return data;
  }
  throw new Error('User not found');
}

async function upsertDtrRow({ staff_user_id, year, month, path, filename, bucket }) {
  const payload = {
    staff_user_id,
    year: Number(year),
    month: Number(month),
    path,
    filename
  };
  if (DTR_FILES_HAS_BUCKET) payload.bucket = bucket || BUCKET_PRIMARY;

  const { error } = await db
    .from('dtr_files')
    .upsert(payload, { onConflict: 'staff_user_id,month,year' });
  if (error) throw error;
}

// Search in PRIMARY then FALLBACK; try canonical first then loose prefixes
async function findExistingInStorage(staff_id, year, month) {
  const tryBuckets = [BUCKET_PRIMARY, BUCKET_FALLBACK].filter(Boolean);
  const { folder, filename, fullpath } = canonicalFileInfo(staff_id, year, month);

  for (const B of tryBuckets) {
    // canonical probe
    try {
      const probe = await storage.from(B).createSignedUrl(fullpath, 10);
      if (probe?.data?.signedUrl) return { bucket: B, path: fullpath, filename };
    } catch { }

    // loose search
    const candidates = [folder, `${staff_id}`, `${staff_id}/${year}`, `${staff_id}/${year}-${pad2(month)}`];
    for (const prefix of candidates) {
      try {
        const { data: listing } = await storage.from(B).list(prefix, { limit: 100 });
        if (!Array.isArray(listing) || listing.length === 0) continue;
        const pdf = listing.find(f => (f.name || '').toLowerCase().endsWith('.pdf'));
        if (pdf) return { bucket: B, path: `${prefix}/${pdf.name}`, filename: pdf.name };
      } catch { }
    }
  }
  return null;
}

// ====== EXCEL GENERATOR ======
async function buildExcelDTR({ staff, month, year }) {
  const templatePath = path.join(__dirname, '..', 'DTR_FORM.xlsx');

  if (!fs.existsSync(templatePath)) {
    throw new Error('DTR_FORM.xlsx template not found at: ' + templatePath);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1); // First sheet

  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${pad2(month)}-01`;

  // Fetch attendance data
  const { data: attendance } = await db
    .from('attendance_logs')
    .select('att_date, time_in, time_out, orig_time_in, orig_time_out, minute_late, worked_hours')
    .eq('staff_user_id', staff.id)
    .gte('att_date', startDate)
    .lte('att_date', `${year}-${pad2(month)}-${lastDay}`)
    .order('att_date', { ascending: true });

  // Group by day
  const byDay = {};
  for (const log of attendance || []) {
    const dt = new Date(log.att_date + 'T00:00:00Z');
    const day = dt.getUTCDate();
    if (!byDay[day]) byDay[day] = log;
  }

  // Helper to format time from HH:MM:SS or ISO timestamp
  const formatTime = (hhmmss, isoTimestamp) => {
    if (hhmmss) {
      const [h, m] = hhmmss.split(':').map(Number);
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return `${hour12}:${pad2(m)} ${ampm}`;
    }
    if (isoTimestamp) {
      const dt = new Date(isoTimestamp);
      const h = dt.getUTCHours();
      const m = dt.getUTCMinutes();
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return `${hour12}:${pad2(m)} ${ampm}`;
    }
    return '';
  };

  // Fill header information
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  // B6-D6: Name (already merged in template, just set value)
  worksheet.getCell('B6').value = staff.name || '';

  // C7-D7: Month (already merged in template, just set value)
  worksheet.getCell('C7').value = monthName;

  // H3-I3: Employee Type (already merged in template, just set value)
  worksheet.getCell('H3').value = staff.employee_type || '';

  // H4-I4: Department (already merged in template, just set value)
  worksheet.getCell('H4').value = staff.department || '';

  // A1-B5: Photo (if available)
  if (staff.photo_url) {
    try {
      const response = await axios.get(staff.photo_url, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      const imageBuffer = Buffer.from(response.data);

      // Detect image type from URL or content
      const ext = staff.photo_url.toLowerCase().includes('.png') ? 'png' : 'jpeg';

      const imageId = workbook.addImage({
        buffer: imageBuffer,
        extension: ext,
      });

      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 }, // A1
        br: { col: 1, row: 4 }, // B5 (col and row are 0-indexed)
        editAs: 'oneCell'
      });
    } catch (err) {
      console.error('Failed to load photo:', err.message);
    }
  }

  // Fill attendance data starting from row 9
  for (let day = 1; day <= lastDay; day++) {
    const rowIndex = 8 + day; // Row 9 is index 9 (9 = 8 + 1)
    const log = byDay[day];

    // Column A: Day
    worksheet.getCell(`A${rowIndex}`).value = day;

    if (log) {
      // Column B: A.M Arrival
      const amArrival = formatTime(log.orig_time_in, log.time_in);
      worksheet.getCell(`B${rowIndex}`).value = amArrival;

      // Column E: P.M Departure
      const pmDeparture = formatTime(log.orig_time_out, log.time_out);
      worksheet.getCell(`E${rowIndex}`).value = pmDeparture;

      // ===== TARDINESS (always fill 0 even if there's no tardiness) =====
      const minuteLate = Number(log.minute_late) || 0;

      const tardinessHours = Math.floor(minuteLate / 60);
      const tardinessMinutes = minuteLate % 60;

      worksheet.getCell(`F${rowIndex}`).value = tardinessHours;
      worksheet.getCell(`G${rowIndex}`).value = tardinessMinutes;


      // ===== UNDERTIME (based on 9 required hours) =====
      const requiredHours = 9;
      let workedHours = Number(log.worked_hours) || 0;  // already decimal format

      if (workedHours > 0 && workedHours < requiredHours) {
        const undertimeDecimal = requiredHours - workedHours;   // e.g. 9 - 8.78 = 0.22
        const undertimeMinutesTotal = undertimeDecimal * 60;     // convert to minutes

        const undertimeHours = Math.floor(undertimeMinutesTotal / 60);
        const undertimeMinutes = Math.round(undertimeMinutesTotal % 60); // round minutes

        worksheet.getCell(`H${rowIndex}`).value = undertimeHours;
        worksheet.getCell(`I${rowIndex}`).value = undertimeMinutes;
      } else {
        // Always write 0 for filled records
        worksheet.getCell(`H${rowIndex}`).value = 0;
        worksheet.getCell(`I${rowIndex}`).value = 0;
      }
    }
  }

  // Return the workbook as buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function buildDTR({ staff, month, year, logs = [] }) {
  if (DTR_RENDERER === 'html') {
    return buildHtmlDTR({ staff, month, year, logs });
  }
  return buildClassicDTR({ staff, month, year, logs });
}

// ====== ROUTES ======

// GET /api/dtr/list?month=10&year=2025&department=...
router.get('/list', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const department = (req.query.department && req.query.department !== 'All Departments')
      ? String(req.query.department) : null;

    let base = db
      .from('staff_users')
      .select('id, staff_id, name, role, department', { count: 'exact' })
      .order('name', { ascending: true });

    if (department) base = base.eq('department', department);

    const { data: staffRows, count, error: e1 } = await base;
    if (e1) return res.status(500).json({ error: 'list-staff failed', details: e1.message });
    if (!staffRows?.length) return res.json({ rows: [], count: 0, month, year });

    const { data: files, error: e2 } = await db
      .from('dtr_files')
      .select('staff_user_id, month, year, filename, path')
      .eq('month', month).eq('year', year);
    if (e2) return res.status(500).json({ error: 'list-dtr-files failed', details: e2.message });

    const byStaffId = new Map();
    for (const f of (files || [])) byStaffId.set(f.staff_user_id, f);

    const rows = staffRows.map(u => {
      const f = byStaffId.get(u.id);
      return {
        staff_user_id: u.id,
        staff_id: u.staff_id,
        name: u.name,
        role: u.role,
        department: u.department || '—',
        filename: f?.filename || null,
        path: f?.path || null,
        has_file: !!f,
        month, year
      };
    });

    return res.json({ rows, count: count || rows.length, month, year });
  } catch (err) {
    console.error('[dtr/list]', err);
    res.status(500).json({ error: 'list failed' });
  }
});

// POST /api/dtr/generate { staff_id|staff_user_id, month, year }
router.post('/generate', async (req, res) => {
  try {
    const { staff_id, staff_user_id, month, year } = req.body || {};
    if ((!staff_id && !staff_user_id) || !month || !year) {
      return res.status(400).json({ error: 'staff_id or staff_user_id, month, year are required' });
    }
    const staff = await getStaffRow({ staff_user_id, staff_id });
    const pdf = await buildDTR({ staff, month: Number(month), year: Number(year), logs: [] });

    const { fullpath, filename } = canonicalFileInfo(staff.staff_id, year, month);
    await ensureBucketExists(BUCKET_PRIMARY);
    const { error: upErr } = await storage.from(BUCKET_PRIMARY).upload(fullpath, pdf, {
      contentType: 'application/pdf',
      upsert: true
    });
    if (upErr) throw new Error('upload failed: ' + upErr.message);

    await upsertDtrRow({ staff_user_id: staff.id, year, month, path: fullpath, filename, bucket: BUCKET_PRIMARY });

    const url = await signOrPublic(BUCKET_PRIMARY, fullpath);
    res.json({ ok: true, filename, path: fullpath, url });
  } catch (e) {
    console.error('[dtr/generate]', e);
    res.status(500).json({ error: 'generate failed', details: e.message });
  }
});

// POST /api/dtr/generate-many { items:[{staff_id|staff_user_id}], month, year }
router.post('/generate-many', async (req, res) => {
  try {
    const { items = [], month, year } = req.body || {};
    if (!Array.isArray(items) || !month || !year) {
      return res.status(400).json({ error: 'items, month, year required' });
    }
    await ensureBucketExists(BUCKET_PRIMARY);
    const out = [];
    for (const it of items) {
      try {
        const staff = await getStaffRow({ staff_user_id: it.staff_user_id, staff_id: it.staff_id });
        const pdf = await buildDTR({ staff, month: Number(month), year: Number(year), logs: [] });

        const { fullpath, filename } = canonicalFileInfo(staff.staff_id, year, month);
        const { error: upErr } = await storage.from(BUCKET_PRIMARY).upload(fullpath, pdf, {
          contentType: 'application/pdf',
          upsert: true
        });
        if (upErr) throw new Error('upload failed: ' + upErr.message);

        await upsertDtrRow({ staff_user_id: staff.id, year, month, path: fullpath, filename, bucket: BUCKET_PRIMARY });
        out.push({ staff_id: staff.staff_id, ok: true, filename, path: fullpath });
      } catch (e) {
        out.push({ staff_id: it.staff_id || it.staff_user_id, error: e.message });
      }
    }
    res.json({ ok: true, items: out });
  } catch (e) {
    console.error('[dtr/generate-many]', e);
    res.status(500).json({ error: 'generate-many failed' });
  }
});

// POST /api/dtr/ensure-month { month, year, dept? }
router.post('/ensure-month', async (req, res) => {
  try {
    const { month, year, dept } = req.body || {};
    if (!month || !year) return res.status(400).json({ error: 'month, year required' });

    let base = db.from('staff_users').select('id, staff_id, name, department, employee_type');
    if (dept && dept !== 'All Departments') base = base.eq('department', String(dept));

    const { data: users, error } = await base;
    if (error) throw new Error(error.message);

    await ensureBucketExists(BUCKET_PRIMARY);

    const results = [];
    for (const u of users || []) {
      try {
        const { data: row, error: selErr } = await db.from('dtr_files')
          .select(DTR_FILES_HAS_BUCKET ? 'path, filename, bucket' : 'path, filename')
          .eq('staff_user_id', u.id).eq('month', Number(month)).eq('year', Number(year)).maybeSingle();
        if (selErr) throw selErr;

        if (!row) {
          let fileRef = await findExistingInStorage(u.staff_id, year, month);
          if (!fileRef) {
            const pdf = await buildDTR({ staff: u, month: Number(month), year: Number(year), logs: [] });
            const { fullpath, filename } = canonicalFileInfo(u.staff_id, year, month);
            const { error: upErr } = await storage.from(BUCKET_PRIMARY).upload(fullpath, pdf, {
              contentType: 'application/pdf',
              upsert: true
            });
            if (upErr) throw new Error('upload failed: ' + upErr.message);
            fileRef = { bucket: BUCKET_PRIMARY, path: fullpath, filename };
          }
          await upsertDtrRow({
            staff_user_id: u.id,
            year, month,
            path: fileRef.path,
            filename: fileRef.filename,
            bucket: fileRef.bucket || BUCKET_PRIMARY
          });
        }
        results.push({ staff_id: u.staff_id, ok: true });
      } catch (e) {
        results.push({ staff_id: u.staff_id, error: e.message });
      }
    }
    res.json({ ok: true, items: results });
  } catch (e) {
    console.error('[dtr/ensure-month]', e);
    res.status(500).json({ error: 'ensure-month failed', details: e.message });
  }
});

// POST /api/dtr/ensure-sign { month, year, items:[{staff_id|staff_user_id}] }
router.post('/ensure-sign', async (req, res) => {
  try {
    const { month, year, items } = req.body || {};
    if (!month || !year || !Array.isArray(items)) {
      return res.status(400).json({ error: 'month, year, items required' });
    }

    const out = [];
    for (const it of items) {
      try {
        const user = await getStaffRow({ staff_user_id: it.staff_user_id, staff_id: it.staff_id });

        // 1) read current index row (without assuming bucket col)
        const { data: row } = await db
          .from('dtr_files')
          .select(DTR_FILES_HAS_BUCKET ? 'path, filename, bucket' : 'path, filename')
          .eq('staff_user_id', user.id).eq('month', Number(month)).eq('year', Number(year)).maybeSingle();

        let fileRef = row ? { ...row } : null;

        // 2) if we have a row, try to sign; on failure we'll recover below
        const trySign = async (ref) => {
          const activeBucket = (DTR_FILES_HAS_BUCKET && ref?.bucket) ? ref.bucket : BUCKET_PRIMARY;
          const url = await signOrPublic(activeBucket, ref.path);
          return { url, ref: { ...ref, bucket: activeBucket } };
        };

        let signed = null;
        if (fileRef) {
          try {
            signed = await trySign(fileRef);
          } catch (e) {
            // fall through to recovery
          }
        }

        // 3) recovery: search both buckets if sign failed or no row
        if (!signed) {
          const found = await findExistingInStorage(user.staff_id, year, month);
          if (found) {
            // update DB → correct path/filename/(bucket)
            await upsertDtrRow({
              staff_user_id: user.id,
              year, month,
              path: found.path,
              filename: found.filename,
              bucket: found.bucket || BUCKET_PRIMARY
            });
            signed = await trySign(found);
          }
        }

        // 4) last resort: generate, upsert, sign
        if (!signed) {
          await ensureBucketExists(BUCKET_PRIMARY);
          const pdf = await buildDTR({ staff: user, month: Number(month), year: Number(year), logs: [] });
          const { fullpath, filename } = canonicalFileInfo(user.staff_id, year, month);
          const { error: upErr } = await storage.from(BUCKET_PRIMARY).upload(fullpath, pdf, {
            contentType: 'application/pdf',
            upsert: true
          });
          if (upErr) throw new Error('upload failed: ' + upErr.message);

          await upsertDtrRow({
            staff_user_id: user.id,
            year, month,
            path: fullpath,
            filename,
            bucket: BUCKET_PRIMARY
          });

          signed = await trySign({ path: fullpath, filename, bucket: BUCKET_PRIMARY });
        }

        out.push({ staff_id: user.staff_id, filename: signed.ref.filename, url: signed.url });
      } catch (e) {
        out.push({ staff_id: it.staff_id || it.staff_user_id, error: e.message || 'No file' });
      }
    }

    res.json({ ok: true, items: out });
  } catch (err) {
    console.error('[ensure-sign]', err);
    res.status(500).json({ error: 'ensure-sign failed' });
  }
});

// POST /api/dtr/force-generate { items:[{staff_id|staff_user_id}], month, year }
// Overwrite PDFs and DB rows, then return signed URLs.
router.post('/force-generate', async (req, res) => {
  try {
    const { items = [], month, year } = req.body || {};
    if (!Array.isArray(items) || !month || !year) {
      return res.status(400).json({ error: 'items, month, year required' });
    }

    await ensureBucketExists(BUCKET_PRIMARY);

    const out = [];
    for (const it of items) {
      try {
        const staff = await getStaffRow({ staff_user_id: it.staff_user_id, staff_id: it.staff_id });

        // build (HTML or PDFKit depending on env)
        const pdf = await buildDTR({ staff, month: Number(month), year: Number(year), logs: [] });

        // canonical path, overwrite (upsert) in PRIMARY
        const { fullpath, filename } = canonicalFileInfo(staff.staff_id, year, month);
        const { error: upErr } = await storage.from(BUCKET_PRIMARY).upload(fullpath, pdf, {
          contentType: 'application/pdf',
          upsert: true
        });
        if (upErr) throw new Error('upload failed: ' + upErr.message);

        // upsert index row (with/without bucket column)
        await upsertDtrRow({
          staff_user_id: staff.id,
          year, month,
          path: fullpath,
          filename,
          bucket: BUCKET_PRIMARY
        });

        // sign and return
        const url = await signOrPublic(BUCKET_PRIMARY, fullpath);
        out.push({ staff_id: staff.staff_id, filename, url, ok: true });
      } catch (e) {
        out.push({ staff_id: it.staff_id || it.staff_user_id, error: e.message });
      }
    }

    res.json({ ok: true, items: out });
  } catch (e) {
    console.error('[dtr/force-generate]', e);
    res.status(500).json({ error: 'force-generate failed', details: e.message });
  }
});

// quick diag
router.get('/_diag', async (_req, res) => {
  try {
    const { data, error } = await storage.from(BUCKET_PRIMARY).list('', { limit: 1 });
    res.json({
      ok: !error,
      error: error?.message || null,
      canList: Array.isArray(data),
      bucket_primary: BUCKET_PRIMARY,
      bucket_fallback: BUCKET_FALLBACK,
      dtr_files_has_bucket: DTR_FILES_HAS_BUCKET,
      renderer: DTR_RENDERER
    });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// add this in server/routes/dtrRoutes.cjs (e.g. after router.get('/_diag', ...))
router.get('/test', (_req, res) => {
  res.json({
    ok: true,
    path: '/api/dtr/test',
    message: 'DTR test OK'
  });
});

// GET /api/dtr/records?staff_id=...&year=2025&month=11
router.get('/records', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    const { staff_id, year, month } = req.query;

    if (!staff_id || !year || !month) {
      return res.status(400).json({ error: 'staff_id, year, and month are required' });
    }

    console.log(`[DTR Records] Fetching for staff_id=${staff_id}, year=${year}, month=${month}`);

    // Get staff_user by staff_id
    const staff = await getStaffRow({ staff_id });
    if (!staff) {
      console.error(`[DTR Records] Staff not found: ${staff_id}`);
      return res.status(404).json({ error: 'Staff not found' });
    }

    console.log(`[DTR Records] Found staff: ${staff.name} (ID: ${staff.id})`);

    // Calculate date range for the month
    const y = Number(year);
    const m = Number(month);
    const lastDay = new Date(y, m, 0).getDate();
    const startDate = `${y}-${pad2(m)}-01`;
    const endDate = `${y}-${pad2(m)}-${lastDay}`;

    console.log(`[DTR Records] Date range: ${startDate} to ${endDate}`);

    // Fetch attendance logs for the month
    // Note: include orig_time_in/orig_time_out and worked_hours so we can avoid timezone conversion
    const { data: logs, error } = await db
      .from('attendance_logs')
      .select('att_date, time_in, time_out, orig_time_in, orig_time_out, minute_late, worked_hours, status')
      .eq('staff_user_id', staff.id)
      .gte('att_date', startDate)
      .lte('att_date', endDate)
      .order('att_date', { ascending: true });

    if (error) {
      console.error(`[DTR Records] DB Error:`, error);
      throw new Error('Failed to fetch attendance logs: ' + error.message);
    }

    console.log(`[DTR Records] Found ${logs?.length || 0} attendance records`);

    // helpers to format date and times without applying a Manila/GMT+8 conversion
    const formatDateMonthDay = (dateStr) => {
      if (!dateStr) return null;
      // treat the date as UTC to avoid local timezone shifts
      const dt = new Date(dateStr + 'T00:00:00Z');
      return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
    };

    const formatFromHHMMSS = (hhmmss) => {
      if (!hhmmss) return null;
      // construct a UTC time and format it in UTC so no server-local TZ conversion happens
      const dt = new Date('1970-01-01T' + hhmmss + 'Z');
      return dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });
    };

    const formatUtcIso = (isoString) => {
      if (!isoString) return null;
      // format an ISO timestamp using UTC (so the displayed hour will be the original +00 time)
      const dt = new Date(isoString);
      return dt.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });
    };

    // Format the response
    const records = (logs || []).map((log) => {
      let timeIn = null;
      let timeOut = null;

      if (log.orig_time_in) {
        timeIn = formatFromHHMMSS(log.orig_time_in);
      } else if (log.time_in) {
        timeIn = formatUtcIso(log.time_in);
      }

      if (log.orig_time_out) {
        timeOut = formatFromHHMMSS(log.orig_time_out);
      } else if (log.time_out) {
        timeOut = formatUtcIso(log.time_out);
      }

      return {
        // "November 3"
        date: formatDateMonthDay(log.att_date),

        time_in: timeIn || "-",
        time_out: timeOut || "-",

        // "13 minutes"
        tardiness: log.minute_late
          ? `${log.minute_late} minute${log.minute_late === 1 ? "" : "s"}`
          : "-",

        // "8.78 hours"
        undertime:
          log.worked_hours !== null && log.worked_hours !== undefined
            ? `${log.worked_hours} hours`
            : "-",

        status: log.status || "present",
      };
    });

    console.log(`[DTR Records] Returning ${records.length} formatted records`);
    res.json({ records });
  } catch (err) {
    console.error('[DTR Records] Error:', err);
    res.status(500).json({ error: 'Failed to fetch records', details: err.message });
  }
});

// GET /api/dtr/download-excel?staff_id=...&year=2025&month=11
router.get('/download-excel', async (req, res) => {
  try {
    const { staff_id, year, month } = req.query;

    if (!staff_id || !year || !month) {
      return res.status(400).json({ error: 'staff_id, year, and month are required' });
    }

    const staff = await getStaffRow({ staff_id });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const excel = await buildExcelDTR({
      staff,
      month: Number(month),
      year: Number(year)
    });

    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
    const filename = `DTR-${staff.staff_id}-${monthName}-${year}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excel);
  } catch (err) {
    console.error('[DTR Excel Download] Error:', err);
    res.status(500).json({ error: 'Failed to generate Excel', details: err.message });
  }
});

module.exports = router;
