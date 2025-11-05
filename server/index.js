// backend/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  const raw = String(process.env.GOOGLE_APPLICATION_CREDENTIALS).trim();
  const credPath = path.isAbsolute(raw) ? raw : path.resolve(__dirname, raw);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;
  console.log('[drive] GOOGLE_APPLICATION_CREDENTIALS =', credPath);
}

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---- helper: require the first existing module from a list of paths
function requireFirst(candidates) {
  for (const p of candidates) {
    try {
      const mod = require(p);
      console.log(`[mount] loaded ${p}`);
      return mod;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        console.warn(`[mount] ${p} error:`, e.message);
      }
    }
  }
  console.warn('[mount] none found for', candidates.join(' | '));
  return null;
}

// health
app.get('/api/ping', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// health
app.get('/api/ping', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ================= ROUTES =================
const staffRoutes = requireFirst(['./routes/staffRoutes.cjs', './routes/staffRoutes.js', './routes/staffRoutes', './staffRoutes']);
if (staffRoutes) app.use('/api', staffRoutes);

const attendanceRoutes = requireFirst(['./routes/attendanceRoutes.cjs', './routes/attendanceRoutes.js', './routes/attendanceRoutes', './attendanceRoutes']);
if (attendanceRoutes) app.use('/api/attendance', attendanceRoutes);

const analyticsRoutes = requireFirst(['./routes/analyticsRoutes.cjs', './routes/analyticsRoutes.js', './routes/analyticsRoutes', './analyticsRoutes']);
if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);

const notificationRoutes = requireFirst(['./routes/notificationRoutes.cjs', './routes/notificationRoutes.js', './routes/notificationRoutes', './notificationRoutes']);
if (notificationRoutes) app.use('/api', notificationRoutes);

const driveSyncRoutes = requireFirst(['./routes/driveSyncRoutes.cjs', './routes/driveSyncRoutes.js', './routes/driveSyncRoutes', './driveSyncRoutes']);
if (driveSyncRoutes) app.use('/api/leaves', driveSyncRoutes);

const leaveRoutes = requireFirst(['./routes/leaveRoutes.cjs', './routes/leaveRoutes.js', './routes/leaveRoutes', './leaveRoutes']);
if (leaveRoutes) app.use('/', leaveRoutes);

const gsheetsRoutes = requireFirst(['./routes/gsheetsRoutes.cjs', './routes/gsheetsRoutes.js', './routes/gsheetsRoutes', './gsheetsRoutes']);
if (gsheetsRoutes) app.use('/', gsheetsRoutes);

const dtrRoutes = require('./routes/dtrRoutes');
app.use('/api/dtr', dtrRoutes);

// ===================== STATIC =====================
const staticDir = path.join(__dirname, '../public');
app.use(express.static(staticDir));

// serve uploaded avatars/files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/leave-files', express.static(path.join(__dirname, 'leave_files')));

// SPA entry (optional)
app.get('/', (req, res) => {
  res.sendFile(path.join(staticDir, 'login', 'login.html'));
});

// Route inspector
app.get('/__routes', (_req, res) => {
  const list = [];
  const parse = (stack, prefix = '') => {
    stack.forEach((l) => {
      if (l.route && l.route.path) {
        const methods = Object.keys(l.route.methods).map(m => m.toUpperCase());
        list.push({ methods, path: prefix + l.route.path });
      } else if (l.name === 'router' && l.handle && l.handle.stack) {
        const src = (l.regexp && l.regexp.source) || '';
        const base = src
          .replace('^\\/', '/')
          .replace('\\/?(?=\\/|$)', '')
          .replace('^', '')
          .replace('$', '')
          .replace('\\/', '/');
        parse(l.handle.stack, prefix + (base === '(?:\\/)?' ? '' : base));
      }
    });
  };
  parse(app._router.stack);
  res.json({ ok: true, routes: list });
});

// ================ Drive sync helpers (unchanged) ================
const { syncDriveToSupabase } = require('./services/driveSync');
app.post('/api/leaves/trigger-sync', async (req, res) => {
  try {
    const out = await syncDriveToSupabase({ dry: false });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// ===================== AUTO SYNC (poller) =====================
try {
  const fs = require('fs');
  const autoPath = require('path').join(__dirname, 'autoSync.js');
  console.log('[auto-sync] probe file:', autoPath, 'exists =', fs.existsSync(autoPath));

  const { startAutoSync, stopAutoSync, statusAutoSync } = require('./auto_sync.js');

  app.get('/__autosync/status', (_req, res) => res.json({ ok: true, ...statusAutoSync() }));
  app.post('/__autosync/start', (_req, res) => { startAutoSync(); res.json({ ok: true, started: true, ...statusAutoSync() }); });
  app.post('/__autosync/stop', (_req, res) => { stopAutoSync(); res.json({ ok: true, stopped: true, ...statusAutoSync() }); });

  const flag = String(process.env.AUTO_SYNC ?? '1').trim().toLowerCase();
  const enabled = ['1', 'true', 'yes', 'on'].includes(flag);
  console.log(`[auto-sync] AUTO_SYNC=${flag}  SYNC_INTERVAL_SEC=${process.env.SYNC_INTERVAL_SEC || 60}`);

  if (enabled) startAutoSync({ intervalSec: Number(process.env.SYNC_INTERVAL_SEC || 60) });
  else console.log('[auto-sync] disabled');
} catch (e) {
  console.warn('[auto-sync] not started:', e.message || e);
}

// ================= ZKTECO =================
// start ZKTeco puller (CommonJS)
try {
  const zk = require('./services/zktecoPuller.supabase');
  if (zk && typeof zk.start === 'function') {
    zk.start();
    console.log('[mount] zktecoPuller started');
  } else {
    console.log('[mount] zktecoPuller exported nothing');
  }
} catch (e) {
  console.log('[mount] zktecoPuller error:', e.message);
}

// ================= START =================
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const ip = Object.values(os.networkInterfaces()).flat()
    .find(i => i && i.family === 'IPv4' && !i.internal)?.address || 'localhost';
  console.log(`🚀 Server on:
  → http://localhost:${PORT}
  → http://${ip}:${PORT}`);
});
module.exports = server;
