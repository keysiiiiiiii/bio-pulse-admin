// server/routes/dtrRoutes.cjs
console.log('🔵 [DTR] Loading dtrRoutes.cjs...');

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { createClient } = require('@supabase/supabase-js');
const ExcelJS = require('exceljs');
const axios = require('axios');
const PDFDocument = require('pdfkit'); // ✅ ADD: For PDF generation

console.log('🔵 [DTR] Express Router created');

// ====== ENV / CONFIG ======
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_FALLBACK = process.env.DTR_BUCKET || 'dtr';
const BUCKET_PRIMARY = process.env.DTR_BUCKET_NEW || BUCKET_FALLBACK;

const DTR_FILES_HAS_BUCKET = String(process.env.DTR_FILES_HAS_BUCKET || 'false') === 'true';

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
      .select('id, staff_id, name, department, employee_type, role, photo_url')
      .eq('id', staff_user_id).single();
    if (!error && data) return data;
  }
  if (staff_id) {
    const { data, error } = await db
      .from('staff_users')
      .select('id, staff_id, name, department, employee_type, role, photo_url')
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

async function findExistingInStorage(staff_id, year, month) {
  const tryBuckets = [BUCKET_PRIMARY, BUCKET_FALLBACK].filter(Boolean);
  const { folder, filename, fullpath } = canonicalFileInfo(staff_id, year, month);

  for (const B of tryBuckets) {
    try {
      const probe = await storage.from(B).createSignedUrl(fullpath, 10);
      if (probe?.data?.signedUrl) return { bucket: B, path: fullpath, filename };
    } catch { }

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

// ====== EXCEL GENERATOR (WITH DTR_FORM.xlsx TEMPLATE) ======
async function buildExcelDTR({ staff, month, year }) {
  const templatePath = path.join(__dirname, '..', 'DTR_FORM.xlsx');

  if (!fs.existsSync(templatePath)) {
    throw new Error('DTR_FORM.xlsx template not found at: ' + templatePath);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet(1);

  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${pad2(month)}-01`;

  const { data: attendance } = await db
    .from('attendance_logs')
    .select('att_date, time_in, time_out, minute_late')
    .eq('staff_user_id', staff.id)
    .gte('att_date', startDate)
    .lte('att_date', `${year}-${pad2(month)}-${lastDay}`)
    .order('att_date', { ascending: true });

  const byDay = {};
  for (const log of attendance || []) {
    const dt = new Date(log.att_date + 'T00:00:00Z');
    const day = dt.getUTCDate();
    if (!byDay[day]) byDay[day] = log;
  }

  const formatTime = (isoTimestamp) => {
    if (!isoTimestamp) return '';
    const dt = new Date(isoTimestamp);
    const h = dt.getUTCHours();
    const m = dt.getUTCMinutes();
    const hour12 = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${pad2(m)} ${ampm}`;
  };

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  worksheet.getCell('B6').value = staff.name || '';
  worksheet.getCell('C7').value = monthName;
  worksheet.getCell('H3').value = staff.employee_type || '';
  worksheet.getCell('H4').value = staff.department || '';

  // Add UDM logo to cells A1:B5
  try {
    const logoPath = path.join(__dirname, '..', 'udm-logo.webp');
    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);

      const imageId = workbook.addImage({
        buffer: logoBuffer,
        extension: 'jpeg',
      });

      worksheet.addImage(imageId, {
        tl: { col: 0, row: 0 },
        br: { col: 1, row: 4 },
        editAs: 'oneCell'
      });
    }
  } catch (err) {
    console.error('Failed to load UDM logo:', err.message);
  }

  for (let day = 1; day <= lastDay; day++) {
    const rowIndex = 8 + day;
    const log = byDay[day];

    worksheet.getCell(`A${rowIndex}`).value = day;

    if (log) {
      const amArrival = formatTime(log.time_in);
      const pmDeparture = formatTime(log.time_out);

      worksheet.getCell(`B${rowIndex}`).value = amArrival;
      worksheet.getCell(`E${rowIndex}`).value = pmDeparture;

      const minuteLate = Number(log.minute_late) || 0;
      const tardinessHours = Math.floor(minuteLate / 60);
      const tardinessMinutes = minuteLate % 60;

      worksheet.getCell(`F${rowIndex}`).value = tardinessHours;
      worksheet.getCell(`G${rowIndex}`).value = tardinessMinutes;

      const requiredHours = 9;
      let workedHours = 0;

      if (log.time_in && log.time_out) {
        const inDate = new Date(log.time_in);
        const outDate = new Date(log.time_out);
        workedHours = (outDate - inDate) / (1000 * 60 * 60);
      }

      if (workedHours > 0 && workedHours < requiredHours) {
        const undertimeDecimal = requiredHours - workedHours;
        const undertimeMinutesTotal = undertimeDecimal * 60;
        const undertimeHours = Math.floor(undertimeMinutesTotal / 60);
        const undertimeMinutes = Math.round(undertimeMinutesTotal % 60);

        worksheet.getCell(`H${rowIndex}`).value = undertimeHours;
        worksheet.getCell(`I${rowIndex}`).value = undertimeMinutes;
      } else {
        worksheet.getCell(`H${rowIndex}`).value = 0;
        worksheet.getCell(`I${rowIndex}`).value = 0;
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ====== PDF GENERATOR (MATCHING EXCEL TEMPLATE) ======
async function buildPDFFromTemplate({ staff, month, year }) {
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${pad2(month)}-01`;

  const { data: attendance } = await db
    .from('attendance_logs')
    .select('att_date, time_in, time_out, minute_late')
    .eq('staff_user_id', staff.id)
    .gte('att_date', startDate)
    .lte('att_date', `${year}-${pad2(month)}-${lastDay}`)
    .order('att_date', { ascending: true });

  const byDay = {};
  for (const log of attendance || []) {
    const dt = new Date(log.att_date + 'T00:00:00Z');
    const day = dt.getUTCDate();
    if (!byDay[day]) byDay[day] = log;
  }

  const formatTime = (isoTimestamp) => {
    if (!isoTimestamp) return '';
    const dt = new Date(isoTimestamp);
    const h = dt.getUTCHours();
    const m = dt.getUTCMinutes();
    const hour12 = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${pad2(m)} ${ampm}`;
  };

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margin: 50,
      info: {
        Title: `DTR - ${staff.name} - ${monthName} ${year}`,
        Author: 'Universidad de Manila'
      }
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // === HEADER SECTION ===
    doc.fontSize(14).font('Helvetica-Bold').text('CITY OF MANILA', 0, 40, { align: 'center' });
    doc.fontSize(16).text('UNIVERSIDAD DE MANILA', 0, 58, { align: 'center' });
    doc.fontSize(12).text('DAILY TIME RECORD', 0, 78, { align: 'center' });

    // Right side header - CIVIL SERVICE FORM NO. 48
    doc.fontSize(9).font('Helvetica').text('CIVIL SERVICE FORM', 450, 40, { align: 'right' });
    doc.text('NO. 48', 450, 52, { align: 'right' });

    // === EMPLOYEE INFO SECTION ===
    const infoStartY = 110;

    // Left side - Name
    doc.fontSize(11).font('Helvetica-Bold').text('Name:', 50, infoStartY);
    doc.font('Helvetica').text(staff.name || '', 50, infoStartY + 15);

    // Right side - Employment (aligned with Name)
    doc.font('Helvetica-Bold').text('Employment:', 380, infoStartY);
    doc.font('Helvetica').text(staff.employee_type || '', 380, infoStartY + 15);

    // Left side - For the month of
    doc.font('Helvetica-Bold').text('For the month of:', 50, infoStartY + 35);
    doc.font('Helvetica').text(monthName, 50, infoStartY + 50);

    // Right side - College/Department (aligned with month)
    doc.font('Helvetica-Bold').text('College:', 380, infoStartY + 35);
    doc.font('Helvetica').text(staff.department || '', 380, infoStartY + 50);

    // === TABLE SECTION ===
    const tableTop = 180;
    const rowHeight = 16;
    const colWidths = [40, 70, 70, 70, 70, 50, 60, 50, 60];
    const startX = 36;

    // Calculate column positions
    const cols = colWidths.map((w, i) => ({
      x: startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0),
      w: w
    }));

    // Table Headers
    doc.font('Helvetica-Bold').fontSize(9);

    const headers = [
      'Day',
      'A.M.\nArrival',
      'A.M.\nDeparture',
      'P.M.\nArrival',
      'P.M.\nDeparture',
      'Tardiness\nHours',
      'Tardiness\nMinutes',
      'Undertime\nHours',
      'Undertime\nMinutes'
    ];

    headers.forEach((header, i) => {
      doc.text(header, cols[i].x + 2, tableTop + 2, {
        width: cols[i].w - 4,
        align: 'center',
        lineGap: -2
      });
    });

    // Draw header border
    doc.rect(startX, tableTop, colWidths.reduce((a, b) => a + b), 24).stroke();

    // Draw vertical lines for header
    let xPos = startX;
    colWidths.forEach(w => {
      doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 24).stroke();
      xPos += w;
    });
    doc.moveTo(xPos, tableTop).lineTo(xPos, tableTop + 24).stroke();

    // === DATA ROWS ===
    doc.font('Helvetica').fontSize(9);

    const dataStartY = tableTop + 24;
    const maxRowsPerPage = 31; // Days 1-31 fit in one page

    for (let day = 1; day <= lastDay; day++) {
      const log = byDay[day];
      const rowY = dataStartY + (day - 1) * rowHeight;

      // Check if we need a new page
      if (rowY > 700) {
        doc.addPage();
        // Redraw headers on new page
        // (simplified - in production you'd want to repeat full header)
      }

      // Draw row border
      doc.rect(startX, rowY, colWidths.reduce((a, b) => a + b), rowHeight).stroke();

      // Draw vertical lines
      let x = startX;
      colWidths.forEach(w => {
        doc.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();
        x += w;
      });
      doc.moveTo(x, rowY).lineTo(x, rowY + rowHeight).stroke();

      // Fill data
      const rowData = [day.toString(), '', '', '', '', '', '', '', ''];

      if (log) {
        rowData[1] = formatTime(log.time_in);
        rowData[4] = formatTime(log.time_out);

        const minuteLate = Number(log.minute_late) || 0;
        rowData[5] = Math.floor(minuteLate / 60).toString();
        rowData[6] = (minuteLate % 60).toString();

        // Calculate undertime
        const requiredHours = 9;
        let workedHours = 0;

        if (log.time_in && log.time_out) {
          const inDate = new Date(log.time_in);
          const outDate = new Date(log.time_out);
          workedHours = (outDate - inDate) / (1000 * 60 * 60);
        }

        if (workedHours > 0 && workedHours < requiredHours) {
          const undertimeMinutes = (requiredHours - workedHours) * 60;
          rowData[7] = Math.floor(undertimeMinutes / 60).toString();
          rowData[8] = Math.round(undertimeMinutes % 60).toString();
        } else {
          rowData[7] = '0';
          rowData[8] = '0';
        }
      }

      // Write row data
      rowData.forEach((data, i) => {
        if (data) {
          doc.text(data, cols[i].x + 2, rowY + 4, {
            width: cols[i].w - 4,
            align: i === 0 ? 'center' : 'center'
          });
        }
      });
    }

    // === FOOTER SECTION ===
    const footerY = dataStartY + lastDay * rowHeight + 20;

    // Check if footer fits on current page, if not add new page
    if (footerY > 650) {
      doc.addPage();
      const newFooterY = 100;

      // Certification text
      doc.fontSize(8).font('Helvetica');
      doc.text(
        'I certify on my honor that the above is a true and correct report of the hours of work performed,',
        50,
        newFooterY,
        { width: 500 }
      );
      doc.text(
        'record of which was made daily at the time of arrival and departure from office.',
        50,
        newFooterY + 12,
        { width: 500 }
      );

      // Employee signature line
      const sigY = newFooterY + 60;
      doc.moveTo(200, sigY).lineTo(400, sigY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(staff.name || '', 200, sigY + 5, {
        width: 200,
        align: 'center'
      });

      // Verified section
      doc.fontSize(9).font('Helvetica').text(
        'Verified as to prescribed office hours',
        200,
        sigY + 50,
        { width: 200, align: 'center' }
      );

      // Dean signature line
      const deanY = sigY + 90;
      doc.moveTo(200, deanY).lineTo(400, deanY).stroke();
      doc.text(`Dean, ${staff.department || ''}`, 200, deanY + 5, {
        width: 200,
        align: 'center'
      });
    } else {
      // Footer fits on same page
      doc.fontSize(8).font('Helvetica');
      doc.text(
        'I certify on my honor that the above is a true and correct report of the hours of work performed,',
        50,
        footerY,
        { width: 500 }
      );
      doc.text(
        'record of which was made daily at the time of arrival and departure from office.',
        50,
        footerY + 12,
        { width: 500 }
      );

      // Employee signature line
      const sigY = footerY + 60;
      doc.moveTo(200, sigY).lineTo(400, sigY).stroke();
      doc.fontSize(10).font('Helvetica-Bold').text(staff.name || '', 200, sigY + 5, {
        width: 200,
        align: 'center'
      });

      // Verified section
      doc.fontSize(9).font('Helvetica').text(
        'Verified as to prescribed office hours',
        200,
        sigY + 50,
        { width: 200, align: 'center' }
      );

      // Dean signature line
      const deanY = sigY + 90;
      doc.moveTo(200, deanY).lineTo(400, deanY).stroke();
      doc.text(`Dean, ${staff.department || ''}`, 200, deanY + 5, {
        width: 200,
        align: 'center'
      });
    }

    doc.end();
  });
}

// ✅ NEW: Generate PDF from Excel data
async function buildPDFfromExcel({ staff, month, year }) {
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${pad2(month)}-01`;

  const { data: attendance } = await db
    .from('attendance_logs')
    .select('att_date, time_in, time_out, minute_late')
    .eq('staff_user_id', staff.id)
    .gte('att_date', startDate)
    .lte('att_date', `${year}-${pad2(month)}-${lastDay}`)
    .order('att_date', { ascending: true });

  const byDay = {};
  for (const log of attendance || []) {
    const dt = new Date(log.att_date + 'T00:00:00Z');
    const day = dt.getUTCDate();
    if (!byDay[day]) byDay[day] = log;
  }

  const formatTime = (isoTimestamp) => {
    if (!isoTimestamp) return '';
    const dt = new Date(isoTimestamp);
    const h = dt.getUTCHours();
    const m = dt.getUTCMinutes();
    const hour12 = h % 12 || 12;
    const ampm = h < 12 ? 'AM' : 'PM';
    return `${hour12}:${pad2(m)} ${ampm}`;
  };

  const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(16).font('Helvetica-Bold').text('CIUDAD DE MANILA', { align: 'center' });
    doc.fontSize(14).text('UNIVERSIDAD DE MANILA', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text('DAILY TIME RECORD', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`CIVIL SERVICE FORM NO. 48`, { align: 'right' });
    doc.moveDown();

    // Employee Info
    doc.fontSize(11).font('Helvetica-Bold').text(`Name: ${staff.name || 'N/A'}`);
    doc.fontSize(10).font('Helvetica').text(`For the month of: ${monthName} ${year}`);
    doc.text(`Employment: ${staff.employee_type || 'N/A'}`);
    doc.text(`Department/College: ${staff.department || 'N/A'}`);
    doc.moveDown();

    // Table Header
    const tableTop = doc.y;
    const colWidths = [30, 80, 80, 80, 80, 60, 60, 60, 60];
    const headers = ['Day', 'A.M.\nArrival', 'A.M.\nDeparture', 'P.M.\nArrival', 'P.M.\nDeparture',
      'Tardiness\nHours', 'Tardiness\nMinutes', 'Undertime\nHours', 'Undertime\nMinutes'];

    doc.fontSize(8).font('Helvetica-Bold');
    let xPos = 40;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    doc.moveDown();
    let yPos = doc.y;

    // Table Rows
    doc.font('Helvetica').fontSize(8);
    for (let day = 1; day <= lastDay; day++) {
      const log = byDay[day];
      xPos = 40;

      const rowData = [
        day.toString(),
        log ? formatTime(log.time_in) : '',
        '', // AM Departure (not tracked)
        '', // PM Arrival (not tracked)
        log ? formatTime(log.time_out) : '',
        log ? Math.floor((log.minute_late || 0) / 60).toString() : '0',
        log ? ((log.minute_late || 0) % 60).toString() : '0',
        '0', // Undertime hours (calculated)
        '0'  // Undertime minutes (calculated)
      ];

      // Calculate undertime
      if (log && log.time_in && log.time_out) {
        const inDate = new Date(log.time_in);
        const outDate = new Date(log.time_out);
        const workedHours = (outDate - inDate) / (1000 * 60 * 60);
        const requiredHours = 9;

        if (workedHours > 0 && workedHours < requiredHours) {
          const undertimeMinutesTotal = (requiredHours - workedHours) * 60;
          rowData[7] = Math.floor(undertimeMinutesTotal / 60).toString();
          rowData[8] = Math.round(undertimeMinutesTotal % 60).toString();
        }
      }

      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, yPos, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });

      yPos += 15;
      if (yPos > 750) {
        doc.addPage();
        yPos = 50;
      }
    }

    doc.end();
  });
}

// ✅ FIXED: Main DTR builder function
async function buildDTR({ staff, month, year }) {
  console.log(`📄 [DTR] Generating PDF for ${staff.name} - ${month}/${year}`);
  return await buildPDFfromExcel({ staff, month, year });
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
    const pdf = await buildDTR({ staff, month: Number(month), year: Number(year) });

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
        const pdf = await buildDTR({ staff, month: Number(month), year: Number(year) });

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

    let base = db.from('staff_users').select('id, staff_id, name, department, employee_type, role, photo_url');
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
            const pdf = await buildDTR({ staff: u, month: Number(month), year: Number(year) });
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

        const { data: row } = await db
          .from('dtr_files')
          .select(DTR_FILES_HAS_BUCKET ? 'path, filename, bucket' : 'path, filename')
          .eq('staff_user_id', user.id).eq('month', Number(month)).eq('year', Number(year)).maybeSingle();

        let fileRef = row ? { ...row } : null;

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
            console.log('⚠️ Failed to sign existing file, will regenerate');
          }
        }

        if (!signed) {
          const found = await findExistingInStorage(user.staff_id, year, month);
          if (found) {
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

        if (!signed) {
          await ensureBucketExists(BUCKET_PRIMARY);
          const pdf = await buildDTR({ staff: user, month: Number(month), year: Number(year) });
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
        console.error(`[ensure-sign] Error for ${it.staff_id}:`, e.message);
        out.push({ staff_id: it.staff_id || it.staff_user_id, error: e.message || 'No file' });
      }
    }

    res.json({ ok: true, items: out });
  } catch (err) {
    console.error('[ensure-sign]', err);
    res.status(500).json({ error: 'ensure-sign failed' });
  }
});

// GET /api/dtr/records?staff_id=...&year=2025&month=11
router.get('/records', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');

    const { staff_id, year, month } = req.query;

    if (!staff_id || !year || !month) {
      return res.status(400).json({ error: 'staff_id, year, and month are required' });
    }

    const staff = await getStaffRow({ staff_id });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const y = Number(year);
    const m = Number(month);
    const lastDay = new Date(y, m, 0).getDate();
    const startDate = `${y}-${pad2(m)}-01`;
    const endDate = `${y}-${pad2(m)}-${lastDay}`;

    const { data: logs, error } = await db
      .from('attendance_logs')
      .select('att_date, time_in, time_out, minute_late, attendance_status')
      .eq('staff_user_id', staff.id)
      .gte('att_date', startDate)
      .lte('att_date', endDate)
      .order('att_date', { ascending: true });

    if (error) throw new Error('Failed to fetch attendance logs: ' + error.message);

    const formatDateMonthDay = (dateStr) => {
      if (!dateStr) return null;
      const dt = new Date(dateStr + 'T00:00:00Z');
      return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
    };

    const formatTime = (isoString) => {
      if (!isoString) return null;
      const dt = new Date(isoString);
      const h = dt.getUTCHours();
      const m = dt.getUTCMinutes();
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? 'AM' : 'PM';
      return `${hour12}:${pad2(m)} ${ampm}`;
    };

    const records = (logs || []).map((log) => {
      const timeIn = formatTime(log.time_in);
      const timeOut = formatTime(log.time_out);

      let workHours = 0;
      if (log.time_in && log.time_out) {
        const inDate = new Date(log.time_in);
        const outDate = new Date(log.time_out);
        workHours = (outDate - inDate) / (1000 * 60 * 60);
      }

      return {
        date: formatDateMonthDay(log.att_date),
        time_in: timeIn || "-",
        time_out: timeOut || "-",
        tardiness: log.minute_late
          ? `${log.minute_late} minute${log.minute_late === 1 ? "" : "s"}`
          : "-",
        undertime: workHours > 0 ? `${workHours.toFixed(2)} hours` : "-",
        status: log.attendance_status || "present",
      };
    });

    res.json({ records });
  } catch (err) {
    console.error('[DTR Records] Error:', err);
    res.status(500).json({ error: 'Failed to fetch records', details: err.message });
  }
});

// GET /api/dtr/download-pdf?staff_id=...&year=2025&month=11
router.get('/download-pdf', async (req, res) => {
  try {
    const { staff_id, year, month } = req.query;

    if (!staff_id || !year || !month) {
      return res.status(400).json({ error: 'staff_id, year, and month are required' });
    }

    const staff = await getStaffRow({ staff_id });
    if (!staff) {
      return res.status(404).json({ error: 'Staff not found' });
    }

    const pdf = await buildPDFFromTemplate({
      staff,
      month: Number(month),
      year: Number(year)
    });

    const monthName = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long' });
    const filename = `DTR-${staff.staff_id}-${monthName}-${year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    console.error('[DTR PDF Download] Error:', err);
    res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
  }
});

// GET /api/dtr/test
router.get('/test', (_req, res) => {
  console.log('✅ [DTR /test] Route is working!');
  res.json({
    ok: true,
    path: '/api/dtr/test',
    message: 'DTR test OK - PDF generation enabled'
  });
});

console.log('✅ [DTR] All routes loaded successfully');

module.exports = router;