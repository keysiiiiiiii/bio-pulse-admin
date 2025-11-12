// backend/services/driveSync.js
const fs = require('fs');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

/* ---------- ENV CHECKS ---------- */
function assertEnv() {
  const problems = [];
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DRIVE_LEAVE_ADMIN_FOLDER_ID: process.env.DRIVE_LEAVE_ADMIN_FOLDER_ID,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    DEFAULT_STAFF_USER_ID: process.env.DEFAULT_STAFF_USER_ID || null,
  };

  if (!env.SUPABASE_URL) problems.push('SUPABASE_URL missing');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) problems.push('SUPABASE_SERVICE_ROLE_KEY missing');
  if (!env.DRIVE_LEAVE_ADMIN_FOLDER_ID) problems.push('DRIVE_LEAVE_ADMIN_FOLDER_ID missing');

  if (!env.GOOGLE_APPLICATION_CREDENTIALS) {
    problems.push('GOOGLE_APPLICATION_CREDENTIALS missing');
  } else if (!fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS)) {
    problems.push(`GOOGLE_APPLICATION_CREDENTIALS not found: ${env.GOOGLE_APPLICATION_CREDENTIALS}`);
  }

  return { env, problems, ok: problems.length === 0 };
}

function supabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

/* ---------- GOOGLE DRIVE ---------- */
function driveClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

async function driveAbout() {
  const drive = driveClient();
  const { data } = await drive.about.get({
    fields: 'user(emailAddress,displayName)',
    supportsAllDrives: true,
  });
  return data;
}

async function listFolderFiles(folderId) {
  const drive = driveClient();
  const files = [];
  let pageToken;

  do {
    const { data } = await drive.files.list({
      q: `'${folderId}' in parents AND trashed=false`,
      fields: 'nextPageToken, files(id,name,mimeType,webViewLink,webContentLink,modifiedTime,createdTime)',
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'allDrives',
    });
    files.push(...(data.files || []));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return files;
}

/* ---------- NAME PARSER ---------- */
// e.g. "Leave-Paule-Shane_Angel-2025-10-16.xlsx" -> staff_name = "Paule Shane Angel"
function parseFromName(name) {
  const noExt = (name || '').replace(/\.[^.]+$/, '');
  const m = noExt.match(/(\d{4}-\d{2}-\d{2})$/);
  const date = m ? m[1] : null;
  let staff = noExt.replace(/^Leave-+/i, '').replace(/-\d{4}-\d{2}-\d{2}$/, '');
  staff = staff.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return { staff_name: staff || null, date };
}

/* ---------- STAFF LOOKUP (AUTO-DETECT COLUMNS) ---------- */
async function getStaffUsersColumns(sb) {
  // Pull a sample row with * to infer column names
  const { data, error } = await sb.from('staff_users').select('*').limit(1);
  if (error) throw error;
  const cols = data && data.length ? Object.keys(data[0]) : [];
  return new Set(cols);
}

function buildIlikeOr(columns, value, wrapper = (v) => v) {
  // Build a PostgREST .or() string across present columns
  const parts = columns.map(c => `${c}.ilike.${wrapper(value)}`);
  return parts.join(',');
}

async function resolveStaffUserId(sb, staffName) {
  if (!staffName) return null;
  const present = await getStaffUsersColumns(sb);

  // choose which columns we can query
  const nameColumns = ['name', 'full_name', 'display_name', 'username', 'employee_name'].filter(c => present.has(c));
  const firstLast = present.has('first_name') && present.has('last_name');

  // if table has no readable name columns and no first/last, bail
  if (!nameColumns.length && !firstLast) return null;

  const normalized = staffName.trim();
  const collapsed = normalized.replace(/\s+/g, '');

  // Helper to try a query and ignore 42703 (unknown column) safely
  async function tryQuery(orExpr) {
    const q = sb.from('staff_users').select('id').or(orExpr).limit(1);
    const { data, error } = await q;
    if (error) {
      if (String(error.code) === '42703') return null; // unknown column → skip
      throw error;
    }
    return data && data.length ? data[0].id : null;
  }

  // 1) exact-ish (no wildcards)
  if (nameColumns.length) {
    const id = await tryQuery(buildIlikeOr(nameColumns, normalized));
    if (id) return id;
  }
  if (firstLast) {
    const like = `${normalized}`;
    const { data, error } = await sb
      .from('staff_users')
      .select('id,first_name,last_name')
      .ilike('first_name', `%${like.split(' ')[0]}%`)
      .limit(10);
    if (error && String(error.code) !== '42703') throw error;
    if (data && data.length) {
      const guess = data.find(r => (`${r.first_name} ${r.last_name}`).toLowerCase().includes(normalized.toLowerCase()));
      if (guess) return guess.id;
    }
  }

  // 2) contains
  if (nameColumns.length) {
    const id = await tryQuery(buildIlikeOr(nameColumns, `%${normalized}%`));
    if (id) return id;
  }

  // 3) collapsed match (PauleShaneAngel)
  if (nameColumns.length) {
    const id = await tryQuery(buildIlikeOr(nameColumns, `%${collapsed}%`));
    if (id) return id;
  }

  return null;
}

/* ---------- DB HELPERS (no .single()) ---------- */
async function selectOneByDriveId(sb, driveId) {
  const { data, error } = await sb
    .from('leave_requests')
    .select('id, drive_id')
    .eq('drive_id', driveId)
    .limit(1);
  if (error) throw error;
  return data && data.length ? data[0] : null;
}

/* ---------- UPSERT (MATCH YOUR TABLE) ---------- */
async function upsertToSupabase(files, dry) {
  const sb = supabase();
  let inserted = 0, updated = 0;

  for (const f of files) {
    const { staff_name, date } = parseFromName(f.name);
    const now = new Date().toISOString();

    // Resolve staff_user_id with auto-detected columns
    let staff_user_id = await resolveStaffUserId(sb, staff_name);

    if (!staff_user_id) {
      if (process.env.DEFAULT_STAFF_USER_ID) {
        staff_user_id = Number(process.env.DEFAULT_STAFF_USER_ID);
      } else {
        const e = new Error(`No staff_user_id match for "${staff_name}". Add this user to staff_users or set DEFAULT_STAFF_USER_ID in .env.`);
        e.details = { staff_name };
        throw e;
      }
    }

    // Use file creation date as fallback if date parsing fails
    const fallbackDate = f.createdTime ? f.createdTime.split('T')[0] : now.split('T')[0];
    const finalDate = date || fallbackDate;

    const payload = {
      drive_id: f.id,
      staff_user_id,
      staff_name,
      date: finalDate,
      file_url: f.webViewLink || null,

      status: 'Pending',    // fits your enum from screenshot
      archived: false,
      created_at: now,
      updated_at: now,
      fields: {
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        createdTime: f.createdTime,
        originalName: f.name,
      }
    };

    const existing = await selectOneByDriveId(sb, f.id);

    if (!existing) {
      if (!dry) {
        const { error: insErr } = await sb.from('leave_requests').insert(payload);
        if (insErr) throw insErr;
      }
      inserted++;
    } else {
      if (!dry) {
        const { error: updErr } = await sb.from('leave_requests')
          .update({
            staff_user_id,
            staff_name: payload.staff_name,
            date: payload.date,
            file_url: payload.file_url,
            
            status: payload.status,
            archived: payload.archived,
            updated_at: now,
            fields: payload.fields
          })
          .eq('drive_id', f.id);
        if (updErr) throw updErr;
      }
      updated++;
    }
  }

  return { inserted, updated };
}

/* ---------- PUBLIC API ---------- */
async function syncDriveToSupabase({ dry = false } = {}) {
  const checks = assertEnv();
  if (!checks.ok) {
    const err = new Error('Environment problems: ' + checks.problems.join('; '));
    err.details = checks;
    throw err;
  }

  console.log('[supa] URL in use:', process.env.SUPABASE_URL);

  const about = await driveAbout();
  const files = await listFolderFiles(process.env.DRIVE_LEAVE_ADMIN_FOLDER_ID);
  const xfiles = files.filter(f =>
    /spreadsheet|excel/i.test(f.mimeType) || /\.xlsx$/i.test(f.name)
  );

  const counts = await upsertToSupabase(xfiles, dry);

  const sb = supabase();
  const { data: last5 } = await sb
    .from('leave_requests')
    .select('id, drive_id, staff_user_id, staff_name, date, file_url, status')

    .order('id', { ascending: false })
    .limit(5);

  return {
    ok: true,
    dry,
    about_user: about.user,
    total_found: files.length,
    total_xlsx: xfiles.length,
    ...counts,
    sample_written: last5 || [],
  };
}

async function diag() {
  const checks = assertEnv();
  const out = { env: checks.env, problems: checks.problems, env_ok: checks.ok };
  if (!checks.ok) return out;

  try { out.drive_about = await driveAbout(); }
  catch (e) { out.drive_error = { message: e.message || String(e) }; }

  try {
    const files = await listFolderFiles(process.env.DRIVE_LEAVE_ADMIN_FOLDER_ID);
    out.total_files = files.length;
    out.sample_files = files.slice(0, 5);
  } catch (e) {
    out.list_error = { message: e.message || String(e) };
  }

  return out;
}

module.exports = { syncDriveToSupabase, diag };
