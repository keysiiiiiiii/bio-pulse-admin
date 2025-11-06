// routes/dtrRoutes.js — FULL DROP-IN

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { createClient } = require('@supabase/supabase-js');
const PDFDocument = require('pdfkit');

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

// ====== PDF GENERATORS ======

// ====== UPDATED buildHtmlDTR WITH REAL ATTENDANCE DATA ======
async function buildHtmlDTR({ staff, month, year, logs = [] }) {
  const puppeteer = require('puppeteer');
  const tplPath = path.join(__dirname, '..', 'templates', 'dtr.html');
  const htmlTpl = fs.readFileSync(tplPath, 'utf8');

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
  const lastDay = new Date(year, month, 0).getDate();
  const month_range = `${monthName} 1–${lastDay}, ${year}`;

  // ===== FETCH REAL ATTENDANCE DATA =====
  const startDate = `${year}-${pad2(month)}-01`;
  const endDate = `${year}-${pad2(month)}-${lastDay}`;

  const { data: attendance } = await db
    .from('attendance_logs')
    .select('*')
    .eq('staff_user_id', staff.id)
    .gte('timestamp', startDate)
    .lte('timestamp', `${year}-${pad2(month)}-${lastDay} 23:59:59`)
    .order('timestamp', { ascending: true });

  // Group by day
  const byDay = {};
  for (const log of attendance || []) {
    const dt = new Date(log.timestamp);
    const day = dt.getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push({
      time: dt.toTimeString().slice(0, 5), // HH:MM
      hour: dt.getHours(),
      minute: dt.getMinutes()
    });
  }

  // Helper: convert 24h to 12h format
  const to12 = (timeStr) => {
    if (!timeStr) return '';
    const [H, M] = timeStr.split(':').map(Number);
    const h = H % 12 || 12;
    const ampm = H < 12 ? 'AM' : 'PM';
    return `${h}:${pad2(M)} ${ampm}`;
  };

  // Calculate time difference in minutes
  const timeDiff = (t1, t2) => {
    if (!t1 || !t2) return 0;
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    const min1 = h1 * 60 + m1;
    const min2 = h2 * 60 + m2;
    return Math.abs(min2 - min1);
  };

  const WORK_MIN = 8 * 60; // 8 hours = 480 minutes

  // Build rows with actual data
  const wk = d => new Date(year, month - 1, d).toLocaleDateString('en-US', { weekday: 'short' })[0];
  const rows = [];

  for (let d = 1; d <= lastDay; d++) {
    const dayLogs = byDay[d] || [];

    let am_in = '', am_out = '', pm_in = '', pm_out = '';
    let tard_h = '', tard_m = '', und_h = '', und_m = '';

    if (dayLogs.length > 0) {
      // Assume: First log = AM in, then alternate in/out
      // Simple logic: logs[0]=AM in, logs[1]=AM out, logs[2]=PM in, logs[3]=PM out
      if (dayLogs[0]) am_in = to12(dayLogs[0].time);
      if (dayLogs[1]) am_out = to12(dayLogs[1].time);
      if (dayLogs[2]) pm_in = to12(dayLogs[2].time);
      if (dayLogs[3]) pm_out = to12(dayLogs[3].time);

      // Calculate worked minutes
      const amMinutes = (dayLogs[0] && dayLogs[1])
        ? timeDiff(dayLogs[0].time, dayLogs[1].time) : 0;
      const pmMinutes = (dayLogs[2] && dayLogs[3])
        ? timeDiff(dayLogs[2].time, dayLogs[3].time) : 0;
      const totalWorked = amMinutes + pmMinutes;

      // Tardiness (if first log is after 8:00 AM)
      let tardiness = 0;
      if (dayLogs[0] && dayLogs[0].hour >= 8) {
        const expectedStart = 8 * 60; // 8:00 AM
        const actualStart = dayLogs[0].hour * 60 + dayLogs[0].minute;
        if (actualStart > expectedStart) {
          tardiness = actualStart - expectedStart;
        }
      }

      // Undertime
      const undertime = totalWorked > 0 ? Math.max(0, WORK_MIN - totalWorked) : 0;

      if (tardiness > 0) {
        tard_h = Math.floor(tardiness / 60);
        tard_m = tardiness % 60;
      }
      if (undertime > 0) {
        und_h = Math.floor(undertime / 60);
        und_m = undertime % 60;
      }
    }

    rows.push({
      day: d,
      wk: wk(d),
      am_in,
      am_out,
      pm_in,
      pm_out,
      tard_h: tard_h || '',
      tard_m: tard_m ? pad2(tard_m) : '',
      und_h: und_h || '',
      und_m: und_m ? pad2(und_m) : ''
    });
  }

  // Rest of template rendering (same as before)
  const logoPath = path.join(__dirname, '..', 'assets', 'udmlogo.jpg');
  const logo = fs.existsSync(logoPath) ? `file://${logoPath.replace(/\\/g, '/')}` : null;

  const esc = s => String(s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  let html = htmlTpl
    .replace(/{{name}}/g, esc(staff.name || ''))
    .replace(/{{month_range}}/g, esc(month_range))
    .replace(/{{employment}}/g, esc(staff.employee_type || ''))
    .replace(/{{college}}/g, esc(staff.department || '—'))
    .replace(/{{#if logo}}([\s\S]*?){{\/if}}/g, logo ? `$1` : '');

  const rowHtml = rows.map(r => `
    <tr>
      <td class="day">${r.day}</td>
      <td class="wk">${r.wk}</td>
      <td>${r.am_in}</td><td>${r.am_out}</td>
      <td>${r.pm_in}</td><td>${r.pm_out}</td>
      <td>${r.tard_h}</td><td>${r.tard_m}</td>
      <td>${r.und_h}</td><td>${r.und_m}</td>
    </tr>`).join('');
  html = html.replace(/{{#each rows}}[\s\S]*{{\/each}}/, rowHtml);
  if (logo) html = html.replace(/{{logo}}/g, logo);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none'],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({
    format: 'Letter',
    printBackground: true,
    margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' }
  });
  await browser.close();
  return Buffer.from(pdf);
}

// ====== ALSO UPDATE buildClassicDTR (PDFKit version) ======
// COMPLETE buildClassicDTR - Replace in dtrRoutes.js starting at line ~265

async function buildClassicDTR({ staff, month, year, logs = [] }) {
  // Fetch attendance data
  const startDate = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(year, month, 0).getDate();

  const { data: attendance } = await db
    .from('attendance_logs')
    .select('*')
    .eq('staff_user_id', staff.id)
    .gte('timestamp', startDate)
    .lte('timestamp', `${year}-${pad2(month)}-${lastDay} 23:59:59`)
    .order('timestamp', { ascending: true });

  // Group by day
  const byDay = {};
  for (const log of attendance || []) {
    const dt = new Date(log.timestamp);
    const day = dt.getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push({
      time: dt.toTimeString().slice(0, 5),
      hour: dt.getHours(),
      minute: dt.getMinutes()
    });
  }

  return await new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 36 });
      const bufs = [];
      doc.on('data', d => bufs.push(d));
      doc.on('end', () => resolve(Buffer.concat(bufs)));

      const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

      // Header
      const logoPath = path.join(__dirname, '..', 'assets', 'udmlogo.jpg');
      try {
        doc.image(logoPath, 36, 28, { width: 54 });
      } catch (_) { }

      doc.font('Helvetica-Bold').fontSize(12).text('CITY OF MANILA', 0, 36, { align: 'center' });
      doc.fontSize(14).text('UNIVERSIDAD DE MANILA', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(12).text('DAILY TIME RECORD', { align: 'center' });
      doc.font('Helvetica').fontSize(9).text('CIVIL SERVICE FORM NO. 48', 0, 42, { align: 'right' });

      doc.moveDown(0.8);
      doc.fontSize(10);
      doc.text(`Name: ${staff.name}`);
      doc.text(`For the month of: ${monthName} 1–${lastDay}, ${year}`);

      const etxt = (staff.employee_type || '').toLowerCase();
      const emp = etxt.includes('full') ? 'Full-time' : (etxt.includes('part') ? 'Part-time' : (staff.employee_type || ''));
      if (emp) doc.text(`Employment: ${emp}`);
      if (staff.department) doc.text(`College: ${staff.department}`);

      doc.moveDown(0.6);

      // Table setup
      const startX = 24;
      const tableW = 560;
      const rowH = 16;

      const cols = [
        { w: 30 }, { w: 18 },
        { w: 68 }, { w: 68 },
        { w: 68 }, { w: 68 },
        { w: 44 }, { w: 44 },
        { w: 44 }, { w: 44 },
      ];
      let x = startX;
      cols.forEach(c => { c.x = x; x += c.w; });

      // TABLE HEADERS
      const headY = doc.y;
      doc.font('Helvetica-Bold').fontSize(10);

      // Group headers
      doc.text(' ', cols[0].x, headY, { width: cols[0].w });
      doc.text(' ', cols[1].x, headY, { width: cols[1].w });
      doc.text('A.M.', cols[2].x, headY, { width: cols[2].w + cols[3].w, align: 'center' });
      doc.text('P.M.', cols[4].x, headY, { width: cols[4].w + cols[5].w, align: 'center' });
      doc.text('Tardiness', cols[6].x, headY, { width: cols[6].w + cols[7].w, align: 'center' });
      doc.text('Undertime', cols[8].x, headY, { width: cols[8].w + cols[9].w, align: 'center' });

      // Sub headers
      const subY = headY + 12;
      doc.font('Helvetica').fontSize(9);
      doc.text('Day', cols[0].x + 4, subY);
      doc.text(' ', cols[1].x + 2, subY);
      doc.text('Arrival', cols[2].x + 2, subY);
      doc.text('Departure', cols[3].x + 2, subY);
      doc.text('Arrival', cols[4].x + 2, subY);
      doc.text('Departure', cols[5].x + 2, subY);
      doc.text('Hours', cols[6].x + 2, subY);
      doc.text('Minutes', cols[7].x + 2, subY);
      doc.text('Hours', cols[8].x + 2, subY);
      doc.text('Minutes', cols[9].x + 2, subY);

      // Draw grid
      const gridTop = headY - 2;
      const gridBottom = gridTop + rowH * (lastDay + 2);

      // Horizontal lines
      doc.moveTo(startX, gridTop).lineTo(startX + tableW, gridTop).stroke();
      for (let i = 1; i <= lastDay + 2; i++) {
        const y = gridTop + i * rowH;
        doc.moveTo(startX, y).lineTo(startX + tableW, y).stroke();
      }

      // Vertical lines
      cols.forEach(c => {
        doc.moveTo(c.x, gridTop).lineTo(c.x, gridBottom).stroke();
      });
      doc.moveTo(startX + tableW, gridTop).lineTo(startX + tableW, gridBottom).stroke();

      // DATA ROWS WITH REAL ATTENDANCE
      const to12 = s => {
        if (!s) return '';
        const [H, M] = String(s).split(':').map(Number);
        let h = H % 12 || 12;
        const am = H < 12;
        return `${h}:${pad2(M)} ${am ? 'AM' : 'PM'}`;
      };

      const timeDiff = (t1, t2) => {
        if (!t1 || !t2) return 0;
        const [h1, m1] = t1.split(':').map(Number);
        const [h2, m2] = t2.split(':').map(Number);
        return Math.abs((h2 * 60 + m2) - (h1 * 60 + m1));
      };

      const WORK_MIN = 8 * 60;
      const dataStartY = subY + rowH;

      for (let d = 1; d <= lastDay; d++) {
        const y = dataStartY + (d - 1) * rowH;
        const dayLogs = byDay[d] || [];

        // Day number and weekday initial
        doc.text(String(d), cols[0].x + 4, y);
        doc.text(
          new Date(year, month - 1, d).toLocaleDateString('en-US', { weekday: 'short' })[0],
          cols[1].x + 6,
          y
        );

        let am_in = '', am_out = '', pm_in = '', pm_out = '';
        let tardy = 0, und = 0;

        if (dayLogs.length > 0) {
          if (dayLogs[0]) am_in = dayLogs[0].time;
          if (dayLogs[1]) am_out = dayLogs[1].time;
          if (dayLogs[2]) pm_in = dayLogs[2].time;
          if (dayLogs[3]) pm_out = dayLogs[3].time;

          const amMinutes = (dayLogs[0] && dayLogs[1]) ? timeDiff(am_in, am_out) : 0;
          const pmMinutes = (dayLogs[2] && dayLogs[3]) ? timeDiff(pm_in, pm_out) : 0;
          const totalWorked = amMinutes + pmMinutes;

          // Calculate tardiness (if first log is after 8:00 AM)
          if (dayLogs[0] && dayLogs[0].hour >= 8) {
            const actualStart = dayLogs[0].hour * 60 + dayLogs[0].minute;
            tardy = Math.max(0, actualStart - (8 * 60));
          }

          // Calculate undertime
          und = totalWorked > 0 ? Math.max(0, WORK_MIN - totalWorked) : 0;
        }

        // Print attendance times
        doc.text(to12(am_in), cols[2].x + 2, y);
        doc.text(to12(am_out), cols[3].x + 2, y);
        doc.text(to12(pm_in), cols[4].x + 2, y);
        doc.text(to12(pm_out), cols[5].x + 2, y);

        // Print tardiness and undertime
        if (tardy || und) {
          const tH = Math.floor(tardy / 60);
          const tMin = tardy % 60;
          const uH = Math.floor(und / 60);
          const uMin = und % 60;

          doc.text(String(tH || ''), cols[6].x + 2, y);
          doc.text(tardy ? pad2(tMin) : '', cols[7].x + 2, y);
          doc.text(String(uH || ''), cols[8].x + 2, y);
          doc.text(und ? pad2(uMin) : '', cols[9].x + 2, y);
        }
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(9).text(
        'I certify on my honor that the above is a true and correct report of the hours of work performed, ' +
        'record of which was made daily at the time of arrival and departure from office.'
      );

      const center = 306;
      doc.moveDown(1.6);
      doc.moveTo(center - 120, doc.y).lineTo(center + 120, doc.y).stroke();
      doc.moveDown(0.2).font('Helvetica-Bold').text(staff.name, { align: 'center' });
      doc.font('Helvetica').text('Verified as to prescribed office hours', { align: 'center' });
      doc.moveDown(1.2);
      doc.moveTo(center - 120, doc.y).lineTo(center + 120, doc.y).stroke();
      doc.moveDown(0.2).text(`Dean, ${staff.department || '—'}`, { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
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

module.exports = router;
